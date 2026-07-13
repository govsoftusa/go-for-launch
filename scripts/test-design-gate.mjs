import assert from "node:assert/strict";
import { log } from "node:console";
import { evaluateDesignGate } from "./lib/design-gate.mjs";

const base = {
  mode: "off",
  framework: "none",
  scope: "changed-ui",
  customGuide: null,
  reviewerRequired: false
};

const review = {
  candidate: "candidate-123",
  status: "pass",
  reviewer: "Design owner",
  reviewedAt: "2026-07-13",
  evidence: ["evidence/design/home-mobile.png"],
  findings: []
};

assert.deepEqual(evaluateDesignGate(base, null), {
  gate: "design-system-conformance",
  mode: "off",
  framework: "none",
  scope: "changed-ui",
  status: "skipped",
  blocking: false,
  reason: "Disabled by project policy.",
  findings: []
});

const advisory = { ...base, mode: "advisory", framework: "material" };
assert.equal(evaluateDesignGate(advisory, null).status, "advisory-findings");
assert.equal(evaluateDesignGate(advisory, null).blocking, false);

const required = { ...base, mode: "required", framework: "custom", customGuide: "docs/design-system.md", reviewerRequired: true };
assert.equal(evaluateDesignGate(required, null).blocking, true);
assert.equal(evaluateDesignGate(required, review).status, "passed");

const failed = evaluateDesignGate(required, { ...review, status: "fail", findings: ["Navigation treatment does not match the approved system."] });
assert.equal(failed.status, "failed");
assert.equal(failed.blocking, true);

const advisoryFailure = evaluateDesignGate(advisory, { ...review, status: "fail", findings: ["Typography role differs from Material guidance."] });
assert.equal(advisoryFailure.status, "advisory-findings");
assert.equal(advisoryFailure.blocking, false);

const notApplicable = evaluateDesignGate(required, {
  status: "not-applicable",
  reason: "No user-interface files changed.",
  evidence: ["evidence/changed-files.txt"],
  findings: []
});
assert.equal(notApplicable.status, "not-applicable");
assert.equal(notApplicable.blocking, false);

const invalid = evaluateDesignGate({ ...base, mode: "required", framework: "none" }, review);
assert.equal(invalid.status, "failed");
assert.equal(invalid.blocking, true);

log("Design gate tests passed.");
