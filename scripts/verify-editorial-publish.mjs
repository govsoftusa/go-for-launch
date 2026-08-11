import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PLACEHOLDER = /^(?:tbd|todo|unknown|n\/a|none|placeholder|replace-with)/i;
const DEPENDENCIES = ["home", "archives", "authors", "search", "feeds", "sitemaps"];
const RISKS = new Set(["low", "medium", "high"]);
const EDITORIAL_REQUEST_CEILING = 200;
const EDITORIAL_TRANSFER_CEILING = 250_000_000;

function options(argumentsList) {
  return Object.fromEntries(
    argumentsList.map((argument) => {
      const [key, ...parts] = argument.replace(/^--/, "").split("=");
      return [key, parts.join("=") || true];
    }),
  );
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "" && !PLACEHOLDER.test(value.trim());
}

function add(findings, area, message) {
  findings.push({ severity: "error", area, message });
}

function requireText(findings, area, value) {
  if (!hasText(value)) add(findings, area, "requires a non-placeholder value");
}

export function verifyEditorialPublish(record) {
  const findings = [];

  if (record?.schemaVersion !== 1) add(findings, "schemaVersion", "must equal 1");
  if (record?.classification !== "editorial-publish") {
    add(findings, "classification", "must equal editorial-publish");
  }
  requireText(findings, "currentApplicationIdentity", record?.currentApplicationIdentity);

  const mutation = record?.mutation ?? {};
  if (!["cms-ui", "cms-api"].includes(mutation.method)) {
    add(findings, "mutation.method", "must be cms-ui or cms-api");
  }
  if (mutation.directDatabase !== false) {
    add(findings, "mutation.directDatabase", "must be false for the normal editorial lane");
  }
  requireText(findings, "mutation.rollback", mutation.rollback);
  if (!Array.isArray(mutation.applicationChanges) || mutation.applicationChanges.length > 0) {
    add(findings, "mutation.applicationChanges", "must be an empty reviewed array");
  }
  if (mutation.applicationBuildRun !== false) {
    add(findings, "mutation.applicationBuildRun", "must be false");
  }

  const budget = record?.requestBudget ?? {};
  requireText(findings, "requestBudget.estimationMethod", budget.estimationMethod);
  for (const key of [
    "estimatedExternalRequests",
    "maximumExternalRequests",
    "estimatedTransferBytes",
    "maximumTransferBytes",
    "observedExternalRequests",
    "observedTransferBytes",
  ]) {
    if (!Number.isInteger(budget[key]) || budget[key] < (key.startsWith("maximum") ? 1 : 0)) {
      add(
        findings,
        `requestBudget.${key}`,
        key.startsWith("maximum")
          ? "must be a positive integer"
          : "must be a nonnegative integer",
      );
    }
  }
  if (budget.maximumExternalRequests > EDITORIAL_REQUEST_CEILING) {
    add(
      findings,
      "requestBudget.maximumExternalRequests",
      `must not exceed the normal editorial ceiling of ${EDITORIAL_REQUEST_CEILING}`,
    );
  }
  if (budget.maximumTransferBytes > EDITORIAL_TRANSFER_CEILING) {
    add(
      findings,
      "requestBudget.maximumTransferBytes",
      `must not exceed the normal editorial ceiling of ${EDITORIAL_TRANSFER_CEILING} bytes`,
    );
  }
  for (const [valueKey, maximumKey] of [
    ["estimatedExternalRequests", "maximumExternalRequests"],
    ["estimatedTransferBytes", "maximumTransferBytes"],
    ["observedExternalRequests", "maximumExternalRequests"],
    ["observedTransferBytes", "maximumTransferBytes"],
  ]) {
    if (
      Number.isInteger(budget[valueKey]) &&
      Number.isInteger(budget[maximumKey]) &&
      budget[valueKey] > budget[maximumKey]
    ) {
      add(
        findings,
        `requestBudget.${valueKey}`,
        `exceeds ${maximumKey}, stop and redesign the targeted verification`,
      );
    }
  }

  if (!Array.isArray(record?.entries) || record.entries.length === 0) {
    add(findings, "entries", "requires at least one content delta");
  } else {
    record.entries.forEach((entry, index) => {
      const area = `entries[${index}]`;
      for (const key of ["sourceId", "cmsId", "canonicalRoute", "operation", "sourceChecksum"]) {
        requireText(findings, `${area}.${key}`, entry?.[key]);
      }
      if (hasText(entry?.canonicalRoute) && !entry.canonicalRoute.startsWith("/")) {
        add(findings, `${area}.canonicalRoute`, "must be a root-relative canonical route");
      }
      if (!["create", "update", "delete", "publish", "unpublish"].includes(entry?.operation)) {
        add(findings, `${area}.operation`, "uses an unsupported operation");
      }
    });
  }

  const invalidation = record?.invalidation ?? {};
  if (!Array.isArray(invalidation.layers) || invalidation.layers.length === 0) {
    add(findings, "invalidation.layers", "requires at least one reviewed cache layer");
  }
  if (!Array.isArray(invalidation.routes) || invalidation.routes.length === 0) {
    add(findings, "invalidation.routes", "requires the affected route graph");
  }

  if (!Array.isArray(record?.routeChecks) || record.routeChecks.length === 0) {
    add(findings, "routeChecks", "requires at least one canonical route check");
  } else {
    record.routeChecks.forEach((check, index) => {
      const area = `routeChecks[${index}]`;
      requireText(findings, `${area}.route`, check?.route);
      if (check?.getStatus !== 200) add(findings, `${area}.getStatus`, "must equal 200");
      if (check?.headStatus !== 200) add(findings, `${area}.headStatus`, "must equal 200");
      if (check?.applicationIdentity !== record.currentApplicationIdentity) {
        add(findings, `${area}.applicationIdentity`, "must match currentApplicationIdentity");
      }
      for (const key of [
        "canonicalVerified",
        "indexPolicyVerified",
        "contentVerified",
        "mediaVerified",
        "duplicateHeroAbsent",
        "cacheVerified",
      ]) {
        if (check?.[key] !== true) add(findings, `${area}.${key}`, "must be true");
      }
      requireText(findings, `${area}.evidence`, check?.evidence);
    });
  }

  for (const name of DEPENDENCIES) {
    const dependency = record?.dependencies?.[name];
    if (!dependency || typeof dependency.applicable !== "boolean") {
      add(findings, `dependencies.${name}.applicable`, "must be true or false");
      continue;
    }
    if (dependency.applicable) {
      if (dependency.verified !== true) {
        add(findings, `dependencies.${name}.verified`, "must be true when applicable");
      }
      requireText(findings, `dependencies.${name}.evidence`, dependency.evidence);
    }
  }

  const security = record?.security ?? {};
  if (security.interactiveBoundaryChanged !== false) {
    add(
      findings,
      "security.interactiveBoundaryChanged",
      "must be false or the work belongs in the application release lane",
    );
  }
  if (security.antiSpamBoundaryVerified !== true) {
    add(findings, "security.antiSpamBoundaryVerified", "must be true");
  }
  requireText(findings, "security.evidence", security.evidence);

  const performance = record?.performance ?? {};
  if (!RISKS.has(performance.risk)) {
    add(findings, "performance.risk", "must be low, medium, or high");
  }
  if (["medium", "high"].includes(performance.risk) && performance.targetedBrowserCheck !== "passed") {
    add(findings, "performance.targetedBrowserCheck", "must equal passed for medium or high risk");
  }
  if (performance.risk === "high" && performance.targetedPageSpeed !== "passed") {
    add(findings, "performance.targetedPageSpeed", "must equal passed for high risk");
  }
  requireText(findings, "performance.evidence", performance.evidence);

  if (record?.result?.published !== true) add(findings, "result.published", "must be true");
  requireText(findings, "result.recordedAt", record?.result?.recordedAt);
  requireText(findings, "result.evidence", record?.result?.evidence);

  return {
    ok: findings.length === 0,
    classification: record?.classification ?? null,
    currentApplicationIdentity: record?.currentApplicationIdentity ?? null,
    entries: Array.isArray(record?.entries) ? record.entries.length : 0,
    requestBudget: {
      estimatedExternalRequests: budget.estimatedExternalRequests ?? null,
      maximumExternalRequests: budget.maximumExternalRequests ?? null,
      observedExternalRequests: budget.observedExternalRequests ?? null,
      estimatedTransferBytes: budget.estimatedTransferBytes ?? null,
      maximumTransferBytes: budget.maximumTransferBytes ?? null,
      observedTransferBytes: budget.observedTransferBytes ?? null,
    },
    findings,
  };
}

async function main() {
  const cli = options(process.argv.slice(2));
  if (!cli.config) throw new Error("Usage: verify-editorial-publish.mjs --config=path");

  const configPath = resolve(String(cli.config));
  const imported = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const report = verifyEditorialPublish(imported.default ?? imported);
  const outputPath = resolve(String(cli.output || "artifacts/editorial-publish-report.json"));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    for (const finding of report.findings) {
      console.error(`${finding.area}: ${finding.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Editorial publish record passed for ${report.entries} content delta(s).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
