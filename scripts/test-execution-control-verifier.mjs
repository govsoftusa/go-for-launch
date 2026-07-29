import { strict as assert } from "node:assert";
import { verifyExecutionControl } from "./verify-execution-control.mjs";

function record(overrides = {}) {
  return {
    phase: "production-ready",
    output: "artifacts/execution-control-report.json",
    taskEnvelope: {
      requestedOutcome: "Promote the reviewed publication candidate",
      acceptanceOwner: "Project owner",
      targetRepository: "/workspace/publication",
      targetBranch: "release",
      initialRevision: "0123456789abcdef",
      toolkitRevision: "fedcba9876543210",
      rollbackMethod: "Restore the prior immutable deployment",
      scope: ["Public routes", "Canonical host"],
      exclusions: ["Unrelated application work"],
      separateAuthorization: ["External communications"],
    },
    thresholds: {
      maximumUnsuccessfulAttempts: 2,
      activeInvestigationMinutes: 90,
      progressRecordMinutes: 30,
    },
    resourceBudget: {
      lane: "application-release",
      estimatedExternalRequests: 2_500,
      maximumExternalRequests: 10_000,
      estimatedTransferBytes: 250_000_000,
      maximumTransferBytes: 1_000_000_000,
      estimationMethod: "Sum the declared maximum requests and transfer bytes for each gate.",
      observedExternalRequests: 2_400,
      observedTransferBytes: 240_000_000,
    },
    findings: [
      {
        summary: "Social-card direction requires representative approval",
        classification: "release blocker",
        evidence: "Prototype review report",
        decision: "Approve the prototype before bulk generation",
      },
    ],
    checkpoints: [
      {
        recordedAt: "2026-01-01T12:00:00Z",
        phase: "production-ready",
        candidate: "candidate-007",
        change: "Completed the exact-candidate release suite",
        evidence: "artifacts/release-evidence.json",
        nextAction: "Promote the immutable candidate",
      },
    ],
    blockers: [],
    candidate: {
      frozenRevision: "0123456789abcdef",
      buildIdentity: "candidate-007",
      frozenAt: "2026-01-01T11:00:00Z",
      mandatorySuiteCommand: "npm run verify:release",
      gates: Object.fromEntries(
        [
          "build",
          "mobilePageSpeed",
          "desktopPageSpeed",
          "chromium",
          "playwrightWebKit",
          "nativeIosSafari",
          "interfaceQuality",
          "accessibility",
          "security",
        ].map((name) => [
          name,
          {
            status: "passed",
            evidence: `artifacts/${name}.json`,
            ...(name.includes("PageSpeed")
              ? {
                  scores: {
                    performance: 100,
                    accessibility: 100,
                    bestPractices: 100,
                    seo: 100,
                  },
                }
              : {}),
          },
        ]),
      ),
    },
    ...overrides,
  };
}

const valid = await verifyExecutionControl(record());
assert.equal(valid.status, "passed");

const projectedRequestOverrun = record();
projectedRequestOverrun.resourceBudget.estimatedExternalRequests = 10_001;
const projectedRequestOverrunResult = await verifyExecutionControl(projectedRequestOverrun);
assert.equal(projectedRequestOverrunResult.status, "failed");
assert(
  projectedRequestOverrunResult.findings.some(
    (item) => item.area === "resourceBudget.estimatedExternalRequests",
  ),
);

const observedTransferOverrun = record();
observedTransferOverrun.resourceBudget.observedTransferBytes = 1_000_000_001;
const observedTransferOverrunResult = await verifyExecutionControl(observedTransferOverrun);
assert.equal(observedTransferOverrunResult.status, "failed");
assert(
  observedTransferOverrunResult.findings.some(
    (item) => item.area === "resourceBudget.observedTransferBytes",
  ),
);

const unapprovedHighCostRun = record();
unapprovedHighCostRun.resourceBudget.maximumExternalRequests = 10_001;
const unapprovedHighCostRunResult = await verifyExecutionControl(unapprovedHighCostRun);
assert.equal(unapprovedHighCostRunResult.status, "failed");
assert(
  unapprovedHighCostRunResult.findings.some(
    (item) => item.area.startsWith("resourceBudget.ownerApprovedHighCostRun."),
  ),
);

const weakPageSpeed = record();
weakPageSpeed.candidate.gates.mobilePageSpeed.scores.performance = 99;
const weakPageSpeedResult = await verifyExecutionControl(weakPageSpeed);
assert.equal(weakPageSpeedResult.status, "failed");
assert(
  weakPageSpeedResult.findings.some(
    (item) => item.area === "candidate.gates.mobilePageSpeed.scores.performance",
  ),
);

const unbounded = record({
  phase: "implementation",
  thresholds: {
    maximumUnsuccessfulAttempts: 4,
    activeInvestigationMinutes: 180,
    progressRecordMinutes: 60,
  },
  candidate: undefined,
});
const unboundedResult = await verifyExecutionControl(unbounded);
assert.equal(unboundedResult.status, "failed");
assert(
  unboundedResult.findings.some((item) =>
    item.area.startsWith("thresholds.ownerApprovedException."),
  ),
);

const repeated = record({
  phase: "implementation",
  candidate: undefined,
  blockers: [
    {
      summary: "Remote provider returns the same failed result",
      status: "active",
      activeMinutes: 40,
      attempts: [
        {
          action: "Verify the exact candidate",
          result: "Provider rejected the request",
          evidence: "attempt-1.json",
          successful: false,
        },
        {
          action: "Retry with the documented request contract",
          result: "Provider rejected the request",
          evidence: "attempt-2.json",
          successful: false,
        },
      ],
    },
  ],
});
const repeatedResult = await verifyExecutionControl(repeated);
assert.equal(repeatedResult.status, "failed");
assert(
  repeatedResult.findings.some((item) =>
    item.area.includes("ownerApprovedContinuation.supportedNextAction"),
  ),
);

const frozenPending = record({ phase: "candidate-frozen" });
for (const gate of Object.values(frozenPending.candidate.gates)) {
  gate.status = "pending";
  delete gate.evidence;
}
const frozenPendingResult = await verifyExecutionControl(frozenPending);
assert.equal(frozenPendingResult.status, "passed");

const failedPageSpeedWithoutTriage = record({ phase: "candidate-frozen" });
failedPageSpeedWithoutTriage.candidate.gates.desktopPageSpeed = {
  status: "failed",
  evidence: "artifacts/pagespeed-desktop.json",
  scores: { performance: 98, accessibility: 100, bestPractices: 100, seo: 100 },
};
const failedPageSpeedWithoutTriageResult = await verifyExecutionControl(
  failedPageSpeedWithoutTriage,
);
assert.equal(failedPageSpeedWithoutTriageResult.status, "failed");
assert(
  failedPageSpeedWithoutTriageResult.findings.some(
    (item) => item.area === "candidate.gates.desktopPageSpeed.failureTriage.rawReport",
  ),
);

const failedPageSpeedWithTriage = record({ phase: "candidate-frozen" });
failedPageSpeedWithTriage.candidate.gates.desktopPageSpeed = {
  status: "failed",
  evidence: "artifacts/pagespeed-desktop.json",
  scores: { performance: 98, accessibility: 100, bestPractices: 100, seo: 100 },
  failureTriage: {
    candidate: "candidate-007",
    strategy: "desktop",
    auditedUrl: "https://candidate.example.com/category/reviews/",
    firstFailedAt: "2026-01-01T12:30:00Z",
    rawReport: "artifacts/pagespeed-desktop.json",
    dominantAudit: "Speed Index",
    diagnosisEvidence: "artifacts/pagespeed-desktop-diagnosis.json",
    filmstripEvidence: "artifacts/pagespeed-desktop-filmstrip/",
    networkEvidence: "artifacts/pagespeed-desktop-network.json",
    lcpEvidence: "artifacts/pagespeed-desktop-lcp.json",
    nextAction: "Use a release-local derivative for the first-viewport image",
    validResultPreserved: true,
    matrixStopped: true,
  },
};
const failedPageSpeedWithTriageResult = await verifyExecutionControl(
  failedPageSpeedWithTriage,
);
assert.equal(failedPageSpeedWithTriageResult.status, "passed");

console.log(
  "Execution-control verifier tests passed for perfect scores, bounded attempts, reviewed exceptions, candidate phases, and failed PageSpeed triage.",
);
