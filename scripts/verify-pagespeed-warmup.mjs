#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DOCUMENT_HEADERS = Object.freeze({
  Accept: "text/html,application/xhtml+xml",
  "Sec-Fetch-Dest": "document",
  "User-Agent": "go-for-launch-pagespeed-warmup",
});

function addFinding(findings, target, attempt, message) {
  findings.push({
    severity: "error",
    target,
    attempt,
    message,
  });
}

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function cacheMatches(value, expectedValues) {
  const actual = normalized(value);
  return expectedValues.some((expected) => actual === normalized(expected));
}

async function inspectTarget(target, attempt, config) {
  const startedAt = Date.now();
  const response = await fetch(target.url, {
    redirect: "follow",
    headers: DOCUMENT_HEADERS,
    signal: AbortSignal.timeout(config.requestTimeoutMs ?? 30_000),
  });
  const body = await response.text();
  const releaseHeader = target.releaseHeader ?? "x-release-candidate";
  const cacheHeader = target.cache?.header;

  return {
    target: target.name,
    attempt,
    requestedUrl: target.url,
    finalUrl: response.url,
    status: response.status,
    durationMs: Date.now() - startedAt,
    contentType: response.headers.get("content-type") ?? "",
    release: response.headers.get(releaseHeader) ?? "",
    cacheHeader,
    cacheState: cacheHeader ? response.headers.get(cacheHeader) ?? "" : "",
    body,
  };
}

function evaluateAttempt(result, target, findings) {
  const expectedStatus = target.expectedStatus ?? 200;
  if (result.status !== expectedStatus) {
    addFinding(
      findings,
      target.name,
      result.attempt,
      `HTTP ${result.status}, expected ${expectedStatus}`,
    );
  }
  if (!normalized(result.contentType).includes("text/html")) {
    addFinding(
      findings,
      target.name,
      result.attempt,
      `content type ${result.contentType || "missing"}, expected HTML`,
    );
  }
  if (target.expectedHostname) {
    const actualHostname = new URL(result.finalUrl).hostname;
    if (actualHostname !== target.expectedHostname) {
      addFinding(
        findings,
        target.name,
        result.attempt,
        `final hostname ${actualHostname}, expected ${target.expectedHostname}`,
      );
    }
  }
  if (target.expectedRelease && result.release !== target.expectedRelease) {
    addFinding(
      findings,
      target.name,
      result.attempt,
      `release identity ${result.release || "missing"}, expected ${target.expectedRelease}`,
    );
  }
  for (const marker of target.requiredBodyMarkers ?? []) {
    if (!result.body.includes(marker)) {
      addFinding(
        findings,
        target.name,
        result.attempt,
        `required document marker is missing: ${marker}`,
      );
    }
  }
  for (const marker of target.forbiddenBodyMarkers ?? []) {
    if (result.body.includes(marker)) {
      addFinding(
        findings,
        target.name,
        result.attempt,
        `forbidden document marker is present: ${marker}`,
      );
    }
  }
}

function validateConfig(config) {
  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    throw new Error("PageSpeed warmup verification requires at least one target.");
  }
  if (!Number.isInteger(config.attempts) || config.attempts < 2) {
    throw new Error("PageSpeed warmup verification requires at least two attempts.");
  }
  for (const target of config.targets) {
    if (!target?.name || !target?.url) {
      throw new Error("Every PageSpeed warmup target requires a name and URL.");
    }
    if (!target.cache?.header) {
      throw new Error(`${target.name}: cache.header is required.`);
    }
    if (!Array.isArray(target.cache.hitValues) || target.cache.hitValues.length === 0) {
      throw new Error(`${target.name}: cache.hitValues requires at least one value.`);
    }
  }
}

export async function verifyPagespeedWarmup(inputConfig) {
  const config = {
    attempts: 2,
    requestTimeoutMs: 30_000,
    intervalMs: 0,
    ...inputConfig,
  };
  validateConfig(config);

  const findings = [];
  const results = [];
  for (const target of config.targets) {
    const targetResults = [];
    for (let attempt = 1; attempt <= config.attempts; attempt += 1) {
      try {
        const result = await inspectTarget(target, attempt, config);
        evaluateAttempt(result, target, findings);
        const savedResult = { ...result, body: undefined };
        results.push(savedResult);
        targetResults.push(savedResult);
      } catch (error) {
        addFinding(
          findings,
          target.name,
          attempt,
          error instanceof Error ? error.message : String(error),
        );
      }
      if (attempt < config.attempts && config.intervalMs > 0) {
        await new Promise((resolveWait) => setTimeout(resolveWait, config.intervalMs));
      }
    }

    const finalResult = targetResults.at(-1);
    if (
      !finalResult ||
      !cacheMatches(finalResult.cacheState, target.cache.hitValues)
    ) {
      addFinding(
        findings,
        target.name,
        config.attempts,
        `final ${target.cache.header} state ${finalResult?.cacheState || "missing"}, expected one of ${target.cache.hitValues.join(", ")}`,
      );
    }
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: findings.length === 0 ? "passed" : "failed",
    requestContract: {
      accept: DOCUMENT_HEADERS.Accept,
      secFetchDest: DOCUMENT_HEADERS["Sec-Fetch-Dest"],
      userAgent: DOCUMENT_HEADERS["User-Agent"],
    },
    attempts: config.attempts,
    counts: {
      targets: config.targets.length,
      requests: results.length,
      findings: findings.length,
    },
    results,
    findings,
  };

  if (config.report) {
    const reportPath = resolve(config.report);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

async function main() {
  const cli = Object.fromEntries(
    process.argv.slice(2).map((argument) => {
      const [key, ...parts] = argument.replace(/^--/, "").split("=");
      return [key, parts.join("=") || true];
    }),
  );
  const configPath = resolve(String(cli.config ?? "pagespeed-warmup.config.mjs"));
  const module = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const report = await verifyPagespeedWarmup(module.default ?? module.config);
  console.log(
    `PageSpeed warmup verification ${report.status}: ${report.counts.requests} requests, ${report.counts.findings} findings.`,
  );
  for (const finding of report.findings) {
    console.error(
      `${finding.target} attempt ${finding.attempt}: ${finding.message}`,
    );
  }
  if (report.status !== "passed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
