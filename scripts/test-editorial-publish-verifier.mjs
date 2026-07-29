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
