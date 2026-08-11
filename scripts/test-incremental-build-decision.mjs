import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyIncrementalBuildDecision } from "./verify-incremental-build-decision.mjs";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-incremental-build-"));
const reportPath = join(root, "report.json");

const base = {
  schemaVersion: 1,
  candidate: "fixture-candidate",
  reviewedAt: new Date().toISOString(),
  maximumDecisionAgeMinutes: 60,
  reviewer: "Fixture Reviewer",
  report: reportPath,
  selectedMode: "standard",
  rationale: "The fixture does not have a reusable incremental cache.",
  astro: {
    version: "7.2.0",
    output: "static",
    incrementalBuildEnabled: false,
    buildConcurrency: 1,
  },
  inventory: {
    totalPrerenderedPages: 20,
    getStaticPathsPages: 18,
    pagesWithCacheKey: 0,
    expectedRestoredPages: 0,
  },
  change: {
    filesReviewed: ["src/pages", "src/content"],
    classes: ["content-data"],
    middlewareAffectsPrerenderedHtml: false,
    cacheImplementationChanged: false,
    unknownRenderingInputs: false,
    forceBuildReasons: [],
  },
  cache: {
    directory: "node_modules/.astro",
    available: false,
    persistentBetweenBuilds: false,
    isolatedToProject: true,
    source: "",
    lineage: "",
  },
  contract: {
    cacheKeysReviewed: false,
    crossPageDependenciesReviewed: false,
    volatileInputsReviewed: false,
    serverIslands: false,
    stableAstroKey: false,
    parity: {
      status: "not-run",
      verifiedAt: "",
      evidence: "",
      contractFingerprint: "",
      fullBuildHash: "",
      incrementalBuildHash: "",
    },
  },
  benefit: {
    baselineFullBuildSeconds: 10,
    expectedBuildSeconds: 10,
    minimumSavingsSeconds: 5,
    minimumSavingsPercent: 10,
  },
  override: null,
};

const standard = await verifyIncrementalBuildDecision(base);
if (standard.status !== "passed" || standard.recommendation.mode !== "standard") {
  throw new Error("A safe standard-build decision did not pass.");
}
const saved = JSON.parse(await readFile(reportPath, "utf8"));
if (saved.selectedMode !== "standard") {
  throw new Error("The standard-build report was not written.");
}
if (
  saved.assessment.inventory.totalPrerenderedPages !== 20 ||
  saved.assessment.astro.version !== "7.2.0"
) {
  throw new Error("The report did not preserve the reviewed build inputs.");
}

const incrementalConfig = {
  ...base,
  report: undefined,
  selectedMode: "incremental",
  rationale: "The reviewed content-only change should restore most pages.",
  astro: { ...base.astro, incrementalBuildEnabled: true },
  inventory: {
    totalPrerenderedPages: 661,
    getStaticPathsPages: 650,
    pagesWithCacheKey: 650,
    expectedRestoredPages: 637,
  },
  cache: {
    directory: ".astro-cache",
    available: true,
    persistentBetweenBuilds: true,
    isolatedToProject: true,
    source: "project-cache-key-2026-08-10",
    lineage: "main at fixture-source-revision",
  },
  contract: {
    cacheKeysReviewed: true,
    crossPageDependenciesReviewed: true,
    volatileInputsReviewed: true,
    serverIslands: false,
    stableAstroKey: false,
    parity: {
      status: "passed",
      verifiedAt: new Date().toISOString(),
      evidence: "artifacts/incremental-parity.json",
      contractFingerprint: "renderer-and-cache-key-contract-abc123",
      fullBuildHash: "abc123",
      incrementalBuildHash: "abc123",
    },
  },
  benefit: {
    baselineFullBuildSeconds: 16.5,
    expectedBuildSeconds: 10,
    minimumSavingsSeconds: 5,
    minimumSavingsPercent: 10,
  },
};

const incremental = await verifyIncrementalBuildDecision(incrementalConfig);
if (incremental.status !== "passed" || incremental.recommendation.mode !== "incremental") {
  throw new Error("A complete incremental-build decision did not pass.");
}

const missingDependencyReview = await verifyIncrementalBuildDecision({
  ...incrementalConfig,
  contract: { ...incrementalConfig.contract, crossPageDependenciesReviewed: false },
});
if (
  missingDependencyReview.status !== "failed" ||
  missingDependencyReview.recommendation.mode !== "standard"
) {
  throw new Error("Missing cross-page review did not reject incremental rendering.");
}

const middlewareConfig = {
  ...incrementalConfig,
  change: { ...incrementalConfig.change, middlewareAffectsPrerenderedHtml: true },
};
const unsafeIncremental = await verifyIncrementalBuildDecision(middlewareConfig);
if (unsafeIncremental.status !== "failed" || unsafeIncremental.recommendation.mode !== "forced") {
  throw new Error("Middleware HTML changes did not require a forced build.");
}

const forced = await verifyIncrementalBuildDecision({
  ...middlewareConfig,
  selectedMode: "forced",
  rationale: "Middleware changes require every prerendered page to render again.",
});
if (forced.status !== "passed") {
  throw new Error("The recommended forced build did not pass.");
}

const override = await verifyIncrementalBuildDecision({
  ...incrementalConfig,
  selectedMode: "standard",
  rationale: "The owner paused experimental build reuse for this candidate.",
  override: {
    approvedBy: "Fixture Owner",
    reason: "Temporary conservative rollout hold",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  },
});
if (override.status !== "passed" || override.counts.warnings !== 1) {
  throw new Error("A current named override was not recorded as a warning.");
}

const unsafeOverride = await verifyIncrementalBuildDecision({
  ...middlewareConfig,
  override: {
    approvedBy: "Fixture Owner",
    reason: "An override must not weaken a forced-build recommendation",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  },
});
if (unsafeOverride.status !== "failed") {
  throw new Error("An override weakened a forced-build recommendation.");
}

await rm(root, { recursive: true, force: true });
console.log("Incremental build decision verifier tests passed.");
