#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODES = new Set(["standard", "incremental", "forced"]);

function addFinding(findings, severity, field, message) {
  findings.push({ severity, field, message });
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function versionParts(value) {
  const match = String(value ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function versionAtLeast(value, minimum) {
  const actual = versionParts(value);
  const required = versionParts(minimum);
  if (!actual || !required) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > required[index]) return true;
    if (actual[index] < required[index]) return false;
  }
  return true;
}

function validOverride(override) {
  if (!override) return false;
  const expiration = Date.parse(override.expiresAt ?? "");
  return Boolean(
    String(override.approvedBy ?? "").trim() &&
      String(override.reason ?? "").trim() &&
      Number.isFinite(expiration) &&
      expiration > Date.now(),
  );
}

function validateConfig(config, findings) {
  if (config.schemaVersion !== 1) {
    addFinding(findings, "error", "schemaVersion", "schemaVersion must equal 1.");
  }
  if (!String(config.candidate ?? "").trim()) {
    addFinding(findings, "error", "candidate", "A candidate or build identifier is required.");
  }
  if (!String(config.reviewer ?? "").trim()) {
    addFinding(findings, "error", "reviewer", "A named reviewer is required.");
  }
  if (!Number.isFinite(Date.parse(config.reviewedAt ?? ""))) {
    addFinding(findings, "error", "reviewedAt", "reviewedAt must be an ISO 8601 timestamp.");
  } else if (
    !finiteNumber(config.maximumDecisionAgeMinutes) ||
    config.maximumDecisionAgeMinutes <= 0
  ) {
    addFinding(
      findings,
      "error",
      "maximumDecisionAgeMinutes",
      "maximumDecisionAgeMinutes must be greater than zero.",
    );
  } else {
    const ageMinutes = (Date.now() - Date.parse(config.reviewedAt)) / 60_000;
    if (ageMinutes < -5 || ageMinutes > config.maximumDecisionAgeMinutes) {
      addFinding(
        findings,
        "error",
        "reviewedAt",
        "The build decision is stale or dated in the future.",
      );
    }
  }
  if (!MODES.has(config.selectedMode)) {
    addFinding(
      findings,
      "error",
      "selectedMode",
      "selectedMode must be standard, incremental, or forced.",
    );
  }
  if (!String(config.rationale ?? "").trim()) {
    addFinding(findings, "error", "rationale", "The build decision requires a rationale.");
  }
  if (!String(config.astro?.version ?? "").trim()) {
    addFinding(findings, "error", "astro.version", "Record the exact resolved Astro version.");
  }
  if (!new Set(["static", "server"]).has(config.astro?.output)) {
    addFinding(findings, "error", "astro.output", "Astro output must be static or server.");
  }
  if (!Number.isInteger(config.astro?.buildConcurrency) || config.astro.buildConcurrency < 1) {
    addFinding(
      findings,
      "error",
      "astro.buildConcurrency",
      "buildConcurrency must be a positive integer.",
    );
  }
  if (!Array.isArray(config.change?.filesReviewed) || config.change.filesReviewed.length === 0) {
    addFinding(
      findings,
      "error",
      "change.filesReviewed",
      "Record at least one reviewed source, content, configuration, or dependency path.",
    );
  }
  if (!Array.isArray(config.change?.classes) || config.change.classes.length === 0) {
    addFinding(
      findings,
      "error",
      "change.classes",
      "Classify the inputs changed since the reusable cache was created.",
    );
  }

  const inventory = config.inventory ?? {};
  for (const field of [
    "totalPrerenderedPages",
    "getStaticPathsPages",
    "pagesWithCacheKey",
    "expectedRestoredPages",
  ]) {
    if (!nonNegativeInteger(inventory[field])) {
      addFinding(findings, "error", `inventory.${field}`, `${field} must be a nonnegative integer.`);
    }
  }
  if (
    nonNegativeInteger(inventory.pagesWithCacheKey) &&
    nonNegativeInteger(inventory.getStaticPathsPages) &&
    inventory.pagesWithCacheKey > inventory.getStaticPathsPages
  ) {
    addFinding(
      findings,
      "error",
      "inventory.pagesWithCacheKey",
      "pagesWithCacheKey cannot exceed getStaticPathsPages.",
    );
  }
  if (
    nonNegativeInteger(inventory.expectedRestoredPages) &&
    nonNegativeInteger(inventory.pagesWithCacheKey) &&
    inventory.expectedRestoredPages > inventory.pagesWithCacheKey
  ) {
    addFinding(
      findings,
      "error",
      "inventory.expectedRestoredPages",
      "expectedRestoredPages cannot exceed pagesWithCacheKey.",
    );
  }

  const benefit = config.benefit ?? {};
  for (const field of [
    "baselineFullBuildSeconds",
    "expectedBuildSeconds",
    "minimumSavingsSeconds",
    "minimumSavingsPercent",
  ]) {
    if (!finiteNumber(benefit[field]) || benefit[field] < 0) {
      addFinding(findings, "error", `benefit.${field}`, `${field} must be a nonnegative number.`);
    }
  }
  if (!String(config.cache?.directory ?? "").trim()) {
    addFinding(findings, "error", "cache.directory", "Record the Astro cache directory.");
  }
}

function evaluateRecommendation(config) {
  const forcedReasons = [];
  if (config.change?.middlewareAffectsPrerenderedHtml) {
    forcedReasons.push("middleware can change prerendered HTML");
  }
  if (config.change?.cacheImplementationChanged) {
    forcedReasons.push("cache implementation changed");
  }
  if (config.change?.unknownRenderingInputs) {
    forcedReasons.push("rendering inputs remain unknown");
  }
  if (Array.isArray(config.change?.forceBuildReasons)) {
    forcedReasons.push(...config.change.forceBuildReasons.filter((reason) => String(reason).trim()));
  }
  if (config.contract?.parity?.status === "failed") {
    forcedReasons.push("the latest full-render parity check failed");
  }
  if (forcedReasons.length > 0) {
    return { mode: "forced", reasons: forcedReasons };
  }

  const incrementalBlockers = [];
  if (!versionAtLeast(config.astro?.version, "7.2.0")) {
    incrementalBlockers.push("the resolved Astro version is earlier than 7.2.0");
  }
  if (config.astro?.output !== "static") {
    incrementalBlockers.push("the application output is not static");
  }
  if (!config.astro?.incrementalBuildEnabled) {
    incrementalBlockers.push("the incrementalBuild feature is not enabled for this build");
  }
  if (config.astro?.buildConcurrency !== 1) {
    incrementalBlockers.push("build concurrency is not 1");
  }
  if ((config.inventory?.pagesWithCacheKey ?? 0) === 0) {
    incrementalBlockers.push("no getStaticPaths page has a cacheKey");
  }
  if ((config.inventory?.expectedRestoredPages ?? 0) === 0) {
    incrementalBlockers.push("no page is expected to be restored");
  }
  if (!config.cache?.available) incrementalBlockers.push("no previous incremental cache is available");
  if (!config.cache?.persistentBetweenBuilds) {
    incrementalBlockers.push("the cache is not preserved between builds");
  }
  if (!config.cache?.isolatedToProject) {
    incrementalBlockers.push("the cache is not isolated to this project and build lineage");
  }
  if (!String(config.cache?.source ?? "").trim()) {
    incrementalBlockers.push("the restored cache source is not recorded");
  }
  if (!String(config.cache?.lineage ?? "").trim()) {
    incrementalBlockers.push("the reviewed cache lineage is not recorded");
  }
  if (!config.contract?.cacheKeysReviewed) {
    incrementalBlockers.push("cache keys have not been reviewed against page data");
  }
  if (!config.contract?.crossPageDependenciesReviewed) {
    incrementalBlockers.push("cross-page rendering dependencies have not been reviewed");
  }
  if (!config.contract?.volatileInputsReviewed) {
    incrementalBlockers.push("time, environment, randomness, and other volatile inputs were not reviewed");
  }
  if (config.contract?.serverIslands && !config.contract?.stableAstroKey) {
    incrementalBlockers.push("server islands do not have a reviewed stable ASTRO_KEY");
  }

  const parity = config.contract?.parity ?? {};
  if (parity.status !== "passed") {
    incrementalBlockers.push("full-render parity has not passed");
  }
  if (!String(parity.evidence ?? "").trim()) {
    incrementalBlockers.push("full-render parity evidence is missing");
  }
  if (!Number.isFinite(Date.parse(parity.verifiedAt ?? ""))) {
    incrementalBlockers.push("full-render parity verification time is missing");
  }
  if (!String(parity.contractFingerprint ?? "").trim()) {
    incrementalBlockers.push("the parity contract fingerprint is missing");
  }
  if (
    !String(parity.fullBuildHash ?? "").trim() ||
    !String(parity.incrementalBuildHash ?? "").trim() ||
    parity.fullBuildHash !== parity.incrementalBuildHash
  ) {
    incrementalBlockers.push("full and incremental output hashes are missing or different");
  }

  const baseline = config.benefit?.baselineFullBuildSeconds ?? 0;
  const expected = config.benefit?.expectedBuildSeconds ?? 0;
  const savingsSeconds = baseline - expected;
  const savingsPercent = baseline > 0 ? (savingsSeconds / baseline) * 100 : 0;
  if (savingsSeconds < (config.benefit?.minimumSavingsSeconds ?? 0)) {
    incrementalBlockers.push("expected time savings are below the project minimum");
  }
  if (savingsPercent < (config.benefit?.minimumSavingsPercent ?? 0)) {
    incrementalBlockers.push("expected percentage savings are below the project minimum");
  }

  if (incrementalBlockers.length === 0) {
    return {
      mode: "incremental",
      reasons: [
        `${config.inventory.expectedRestoredPages} pages are expected to be restored`,
        `expected savings are ${savingsSeconds.toFixed(2)} seconds (${savingsPercent.toFixed(2)}%)`,
      ],
      savingsSeconds,
      savingsPercent,
    };
  }

  return {
    mode: "standard",
    reasons: incrementalBlockers,
    savingsSeconds,
    savingsPercent,
  };
}

export async function verifyIncrementalBuildDecision(inputConfig) {
  const config = structuredClone(inputConfig ?? {});
  const findings = [];
  validateConfig(config, findings);
  const recommendation = evaluateRecommendation(config);

  if (MODES.has(config.selectedMode) && config.selectedMode !== recommendation.mode) {
    const saferSelections = {
      incremental: new Set(["standard", "forced"]),
      standard: new Set(["forced"]),
      forced: new Set(),
    };
    const safer = saferSelections[recommendation.mode]?.has(config.selectedMode);
    if (safer && validOverride(config.override)) {
      addFinding(
        findings,
        "warning",
        "override",
        `Selected ${config.selectedMode} instead of recommended ${recommendation.mode} under a current named override.`,
      );
    } else {
      addFinding(
        findings,
        "error",
        "selectedMode",
        safer
          ? `Selected ${config.selectedMode}, but the reviewed inputs recommend ${recommendation.mode} and no current named override approves the safer mode.`
          : `Selected ${config.selectedMode}, but the reviewed inputs require the safer ${recommendation.mode} mode.`,
      );
    }
  }

  const errors = findings.filter((finding) => finding.severity === "error");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: errors.length === 0 ? "passed" : "failed",
    candidate: config.candidate ?? "",
    selectedMode: config.selectedMode ?? "",
    assessment: {
      reviewedAt: config.reviewedAt ?? "",
      maximumDecisionAgeMinutes: config.maximumDecisionAgeMinutes ?? null,
      reviewer: config.reviewer ?? "",
      rationale: config.rationale ?? "",
      astro: config.astro ?? {},
      inventory: config.inventory ?? {},
      change: config.change ?? {},
      cache: config.cache ?? {},
      contract: config.contract ?? {},
      benefit: config.benefit ?? {},
      override: config.override ?? null,
    },
    recommendation,
    counts: {
      findings: findings.length,
      errors: errors.length,
      warnings: warnings.length,
    },
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
  const configPath = resolve(String(cli.config ?? "incremental-build.config.mjs"));
  const module = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const report = await verifyIncrementalBuildDecision(module.default ?? module.config);
  console.log(
    `Incremental build decision ${report.status}: selected ${report.selectedMode}, recommended ${report.recommendation.mode}, ${report.counts.findings} findings.`,
  );
  for (const finding of report.findings) {
    console.error(`${finding.severity}: ${finding.field}: ${finding.message}`);
  }
  if (report.status !== "passed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
