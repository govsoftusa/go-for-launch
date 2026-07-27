import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const cli = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...parts] = argument.replace(/^--/, "").split("=");
    return [key, parts.join("=") || true];
  }),
);

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

function robotsMetaContent(html) {
  const tag =
    html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i)?.[0] ?? "";
  return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.toLowerCase() ?? "";
}

function edgeColo(response) {
  const ray = response.headers.get("cf-ray") ?? "";
  return ray.includes("-") ? ray.split("-").at(-1) : "";
}

function withProbeParameter(input, name, value) {
  const url = new URL(input);
  url.searchParams.set(name, value);
  return url;
}

function addFinding(findings, target, variant, round, message) {
  findings.push({
    severity: "error",
    target,
    variant,
    round,
    message,
  });
}

async function inspectTarget(target, variant, round, config) {
  const requestUrl =
    variant === "unique"
      ? withProbeParameter(
          target.url,
          config.probeParameter ?? "gfl-route-probe",
          `${Date.now()}-${round}-${target.name}`,
        )
      : new URL(target.url);
  const startedAt = Date.now();
  const response = await fetch(requestUrl, {
    redirect: "manual",
    headers: {
      Accept: "text/html",
      "Cache-Control": variant === "unique" ? "no-cache" : "max-age=0",
      "User-Agent": "go-for-launch-route-convergence",
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs ?? 30_000),
  });
  const body = await response.text();

  return {
    target: target.name,
    variant,
    round,
    requestedUrl: requestUrl.href,
    status: response.status,
    durationMs: Date.now() - startedAt,
    release: response.headers.get(target.releaseHeader ?? "x-release-candidate") ?? "",
    robotsHeader: response.headers.get("x-robots-tag")?.toLowerCase() ?? "",
    robotsMeta: robotsMetaContent(body),
    browserCache: response.headers.get("cache-control")?.toLowerCase() ?? "",
    cdnCache:
      response.headers.get("cloudflare-cdn-cache-control")?.toLowerCase() ??
      response.headers.get("cdn-cache-control")?.toLowerCase() ??
      "",
    cfCacheStatus: response.headers.get("cf-cache-status") ?? "",
    colo: edgeColo(response),
    finalUrl: response.url,
    body,
  };
}

function evaluateResult(result, target, findings, options = {}) {
  const label = target.name;
  const expectedStatus = target.expectedStatus ?? 200;
  if (result.status !== expectedStatus) {
    addFinding(
      findings,
      label,
      result.variant,
      result.round,
      `HTTP ${result.status}, expected ${expectedStatus}`,
    );
  }
  if (target.expectedRelease && result.release !== target.expectedRelease) {
    addFinding(
      findings,
      label,
      result.variant,
      result.round,
      `release identity ${result.release || "missing"}, expected ${target.expectedRelease}`,
    );
  }
  for (const marker of target.requiredBodyMarkers ?? []) {
    if (!result.body.includes(marker)) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        `required application marker is missing: ${marker}`,
      );
    }
  }
  for (const marker of target.forbiddenBodyMarkers ?? []) {
    if (result.body.includes(marker)) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        `forbidden application marker is present: ${marker}`,
      );
    }
  }

  if (target.robotsMode === "protected") {
    if (!result.robotsHeader.includes("noindex")) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        "protected response is missing noindex in X-Robots-Tag",
      );
    }
    if (!options.headersOnly && !result.robotsMeta.includes("noindex")) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        "protected response is missing noindex in robots meta",
      );
    }
  }
  if (target.robotsMode === "public") {
    if (result.robotsHeader.includes("noindex")) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        "public response leaked noindex through X-Robots-Tag",
      );
    }
    if (
      !options.headersOnly &&
      (!result.robotsMeta.includes("index") || result.robotsMeta.includes("noindex"))
    ) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        `public robots meta is ${result.robotsMeta || "missing"}`,
      );
    }
  }

  if (target.edgeCacheMode === "no-store" && !result.cdnCache.includes("no-store")) {
    addFinding(
      findings,
      label,
      result.variant,
      result.round,
      `protected CDN cache policy is ${result.cdnCache || "missing"}`,
    );
  }
  if (target.edgeCacheMode === "public" && !result.cdnCache.includes("public")) {
    addFinding(
      findings,
      label,
      result.variant,
      result.round,
      `public CDN cache policy is ${result.cdnCache || "missing"}`,
    );
  }

  if (target.expectedHostname) {
    const actualHostname = new URL(result.finalUrl).hostname;
    if (actualHostname !== target.expectedHostname) {
      addFinding(
        findings,
        label,
        result.variant,
        result.round,
        `final hostname ${actualHostname}, expected ${target.expectedHostname}`,
      );
    }
  }
}

function normalizedHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value.join(", ") : String(value),
    ]),
  );
}

async function inspectGlobalPing(target, config) {
  if (!target.globalPing) return { measurementId: null, results: [] };
  const api = config.globalPingApi ?? "https://api.globalping.io/v1";
  const targetUrl = new URL(target.url);
  const remoteRequest = {
    method: "HEAD",
    path: targetUrl.pathname || "/",
    headers: {
      Accept: "text/html",
      "Cache-Control": "no-cache",
    },
  };
  if (targetUrl.search) remoteRequest.query = targetUrl.search.replace(/^\?/, "");
  const createResponse = await fetch(`${api}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "http",
      target: targetUrl.hostname,
      locations: target.globalPing.locations,
      measurementOptions: {
        protocol: targetUrl.protocol === "https:" ? "HTTPS" : "HTTP",
        request: remoteRequest,
      },
    }),
    signal: AbortSignal.timeout(config.requestTimeoutMs ?? 30_000),
  });
  if (!createResponse.ok) {
    throw new Error(`Globalping create request returned HTTP ${createResponse.status}`);
  }
  const created = await createResponse.json();
  if (!created.id) throw new Error("Globalping create response is missing an id.");

  let measurement;
  const attempts = target.globalPing.pollAttempts ?? 15;
  const pollIntervalMs = target.globalPing.pollIntervalMs ?? 2_000;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`${api}/measurements/${created.id}`, {
      signal: AbortSignal.timeout(config.requestTimeoutMs ?? 30_000),
    });
    if (!response.ok) {
      throw new Error(`Globalping result request returned HTTP ${response.status}`);
    }
    measurement = await response.json();
    if (measurement.status === "finished") break;
    if (attempt < attempts) await wait(pollIntervalMs);
  }
  if (measurement?.status !== "finished") {
    throw new Error(`Globalping measurement did not finish, status ${measurement?.status ?? "missing"}`);
  }

  return {
    measurementId: created.id,
    results: (measurement.results ?? []).map((entry, index) => {
      const headers = normalizedHeaders(entry.result?.headers);
      return {
        target: target.name,
        variant: "global",
        round: index + 1,
        requestedUrl: target.url,
        status: entry.result?.statusCode ?? 0,
        durationMs: entry.result?.timings?.total ?? 0,
        release: headers[target.releaseHeader ?? "x-release-candidate"] ?? "",
        robotsHeader: headers["x-robots-tag"]?.toLowerCase() ?? "",
        robotsMeta: "",
        browserCache: headers["cache-control"]?.toLowerCase() ?? "",
        cdnCache:
          headers["cloudflare-cdn-cache-control"]?.toLowerCase() ??
          headers["cdn-cache-control"]?.toLowerCase() ??
          "",
        cfCacheStatus: headers["cf-cache-status"] ?? "",
        colo: "",
        remoteLocation: [entry.probe?.city, entry.probe?.country]
          .filter(Boolean)
          .join(", "),
        finalUrl: target.url,
        body: "",
      };
    }),
  };
}

export async function verifyRouteConvergence(inputConfig) {
  const config = {
    rounds: 6,
    variants: ["unique", "clean"],
    intervalMs: 1_000,
    initialDelayMs: 0,
    ...inputConfig,
  };
  if (!Array.isArray(config.targets) || config.targets.length < 2) {
    throw new Error("Route convergence requires at least two targets.");
  }
  if (!Number.isInteger(config.rounds) || config.rounds < 2) {
    throw new Error("Route convergence requires at least two rounds.");
  }
  if (config.initialDelayMs > 0) await wait(config.initialDelayMs);

  const findings = [];
  const results = [];
  for (let round = 1; round <= config.rounds; round += 1) {
    for (const variant of config.variants) {
      for (const target of config.targets) {
        try {
          const result = await inspectTarget(target, variant, round, config);
          results.push({ ...result, body: undefined });
          evaluateResult(result, target, findings);
        } catch (error) {
          addFinding(
            findings,
            target.name,
            variant,
            round,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
    console.log(
      `Route convergence progress: ${round}/${config.rounds} rounds, ${findings.length} findings.`,
    );
    if (round < config.rounds && config.intervalMs > 0) await wait(config.intervalMs);
  }

  const globalPingMeasurements = [];
  for (const target of config.targets) {
    if (!target.globalPing) continue;
    try {
      const remote = await inspectGlobalPing(target, config);
      globalPingMeasurements.push({
        target: target.name,
        measurementId: remote.measurementId,
      });
      for (const result of remote.results) {
        results.push(result);
        evaluateResult(
          result,
          {
            ...target,
            expectedHostname: undefined,
            requiredBodyMarkers: [],
            forbiddenBodyMarkers: [],
          },
          findings,
          { headersOnly: true },
        );
      }
    } catch (error) {
      addFinding(
        findings,
        target.name,
        "global",
        0,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const colos = [...new Set(results.map((result) => result.colo).filter(Boolean))].sort();
  const remoteLocations = [
    ...new Set(results.map((result) => result.remoteLocation).filter(Boolean)),
  ].sort();
  const report = {
    generatedAt: new Date().toISOString(),
    status: findings.length === 0 ? "passed" : "failed",
    rounds: config.rounds,
    variants: config.variants,
    targets: config.targets.map((target) => target.name),
    counts: {
      checks: results.length,
      findings: findings.length,
      colos: colos.length,
      remoteLocations: remoteLocations.length,
    },
    colos,
    remoteLocations,
    globalPingMeasurements,
    findings,
    results,
  };

  if (config.report) {
    const reportPath = resolve(config.report);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

async function main() {
  if (!cli.config) throw new Error("Pass --config=/absolute/or/relative/config.mjs");
  const configPath = resolve(String(cli.config));
  const loaded = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const report = await verifyRouteConvergence(loaded.default);
  console.log(
    `Route convergence: ${report.counts.checks} checks across ${report.counts.colos} local edge locations and ${report.counts.remoteLocations} remote locations, ${report.counts.findings} findings.`,
  );
  if (report.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
