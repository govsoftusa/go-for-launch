export default {
  schemaVersion: 1,
  candidate: "replace-with-candidate-or-build-id",
  reviewedAt: "replace-with-current-ISO-8601-timestamp",
  maximumDecisionAgeMinutes: 60,
  reviewer: "replace-with-reviewer",
  report: "artifacts/incremental-build-decision.json",

  // Select standard, incremental, or forced after completing this record.
  selectedMode: "standard",
  rationale: "The example has no reviewed reusable cache, so use a standard build.",

  astro: {
    // Record the resolved version from the lockfile, not a package range.
    version: "7.2.0",
    output: "static",
    incrementalBuildEnabled: false,
    buildConcurrency: 1,
  },

  inventory: {
    totalPrerenderedPages: 1,
    getStaticPathsPages: 0,
    pagesWithCacheKey: 0,
    expectedRestoredPages: 0,
  },

  change: {
    filesReviewed: ["src/pages"],
    classes: ["initial-build"],
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
    baselineFullBuildSeconds: 0,
    expectedBuildSeconds: 0,
    minimumSavingsSeconds: 5,
    minimumSavingsPercent: 10,
  },

  // A mismatch requires a named, expiring override. Prefer the recommendation.
  override: null,
};
