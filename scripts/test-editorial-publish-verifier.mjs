import assert from "node:assert/strict";
import { verifyEditorialPublish } from "./verify-editorial-publish.mjs";

function validRecord() {
  const evidence = "artifacts/editorial-check.json";
  return {
    schemaVersion: 1,
    classification: "editorial-publish",
    currentApplicationIdentity: "candidate-verified-123",
    mutation: {
      method: "cms-api",
      directDatabase: false,
      rollback: "Restore the prior CMS revision.",
      applicationChanges: [],
      applicationBuildRun: false,
    },
    requestBudget: {
      estimatedExternalRequests: 20,
      maximumExternalRequests: 200,
      estimatedTransferBytes: 10_000_000,
      maximumTransferBytes: 250_000_000,
      observedExternalRequests: 18,
      observedTransferBytes: 8_000_000,
      estimationMethod: "Count each targeted request and its response bytes.",
    },
    entries: [
      {
        sourceId: "source-1",
        cmsId: "cms-1",
        canonicalRoute: "/article/",
        operation: "update",
        sourceChecksum: "sha256:abc",
      },
    ],
    invalidation: {
      layers: ["cms-query-cache", "cdn-html-cache"],
      routes: ["/article/", "/", "/feed/", "/sitemap.xml"],
    },
    routeChecks: [
      {
        route: "/article/",
        getStatus: 200,
        headStatus: 200,
        applicationIdentity: "candidate-verified-123",
        canonicalVerified: true,
        indexPolicyVerified: true,
        contentVerified: true,
        mediaVerified: true,
        duplicateHeroAbsent: true,
        cacheVerified: true,
        evidence,
      },
    ],
    dependencies: Object.fromEntries(
      DEPENDENCY_NAMES.map((name) => [name, { applicable: true, verified: true, evidence }]),
    ),
    security: {
      interactiveBoundaryChanged: false,
      antiSpamBoundaryVerified: true,
      evidence,
    },
    performance: {
      risk: "high",
      targetedBrowserCheck: "passed",
      targetedPageSpeed: "passed",
      evidence,
    },
    result: {
      published: true,
      recordedAt: "2026-01-01T00:00:00Z",
      evidence,
    },
  };
}

const DEPENDENCY_NAMES = ["home", "archives", "authors", "search", "feeds", "sitemaps"];

const passing = verifyEditorialPublish(validRecord());
assert.equal(passing.ok, true);

const applicationChange = validRecord();
applicationChange.mutation.applicationChanges.push("src/components/Hero.astro");
assert.equal(verifyEditorialPublish(applicationChange).ok, false);

const buildRun = validRecord();
buildRun.mutation.applicationBuildRun = true;
assert.equal(verifyEditorialPublish(buildRun).ok, false);

const excessiveEditorialBudget = validRecord();
excessiveEditorialBudget.requestBudget.maximumExternalRequests = 201;
assert.equal(verifyEditorialPublish(excessiveEditorialBudget).ok, false);

const observedEditorialOverrun = validRecord();
observedEditorialOverrun.requestBudget.observedExternalRequests = 201;
assert.equal(verifyEditorialPublish(observedEditorialOverrun).ok, false);

const missingDependency = validRecord();
missingDependency.dependencies.sitemaps.verified = false;
assert.equal(verifyEditorialPublish(missingDependency).ok, false);

const highRiskWithoutPerformanceEvidence = validRecord();
highRiskWithoutPerformanceEvidence.performance.targetedPageSpeed = "skipped";
assert.equal(verifyEditorialPublish(highRiskWithoutPerformanceEvidence).ok, false);

const changedSecurityBoundary = validRecord();
changedSecurityBoundary.security.interactiveBoundaryChanged = true;
assert.equal(verifyEditorialPublish(changedSecurityBoundary).ok, false);

console.log("Editorial publish verifier tests passed.");
