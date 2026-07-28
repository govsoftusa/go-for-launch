import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PHASES = [
  "orientation",
  "representative-proof",
  "implementation",
  "candidate-frozen",
  "production-ready",
  "closed",
];
const FINDING_CLASSES = new Set([
  "required outcome",
  "release blocker",
  "recommended follow-up",
  "unrelated",
]);
const REQUIRED_GATES = [
  "build",
  "mobilePageSpeed",
  "desktopPageSpeed",
  "chromium",
  "playwrightWebKit",
  "nativeIosSafari",
  "interfaceQuality",
  "accessibility",
  "security",
];
const SCORE_KEYS = ["performance", "accessibility", "bestPractices", "seo"];
const PLACEHOLDER = /^(?:tbd|todo|unknown|n\/a|none|placeholder|example|replace\b|no candidate\b)/i;

function cliOptions(argumentsList) {
  return Object.fromEntries(
    argumentsList.map((argument) => {
      const [key, ...parts] = argument.replace(/^--/, "").split("=");
      return [key, parts.join("=") || true];
    }),
  );
}

function hasValue(value) {
  return typeof value === "string" && value.trim() !== "" && !PLACEHOLDER.test(value.trim());
}

function finding(findings, area, message) {
  findings.push({ severity: "error", area, message });
}

function requireText(findings, area, value) {
  if (!hasValue(value)) finding(findings, area, "requires a non-placeholder value");
}

function verifyTaskEnvelope(record, findings) {
  const envelope = record.taskEnvelope ?? {};
  for (const key of [
    "requestedOutcome",
    "acceptanceOwner",
    "targetRepository",
    "targetBranch",
    "initialRevision",
    "toolkitRevision",
    "rollbackMethod",
  ]) {
    requireText(findings, `taskEnvelope.${key}`, envelope[key]);
  }
  if (!Array.isArray(envelope.scope) || envelope.scope.length === 0) {
    finding(findings, "taskEnvelope.scope", "requires at least one scoped route, system, or environment");
  }
  if (!Array.isArray(envelope.exclusions)) {
    finding(findings, "taskEnvelope.exclusions", "must be an array, including an empty reviewed array");
  }
  if (!Array.isArray(envelope.separateAuthorization)) {
    finding(
      findings,
      "taskEnvelope.separateAuthorization",
      "must be an array, including an empty reviewed array",
    );
  }
}

function verifyThresholds(record, findings) {
  const thresholds = record.thresholds ?? {};
  const values = [
    ["maximumUnsuccessfulAttempts", thresholds.maximumUnsuccessfulAttempts, 2],
    ["activeInvestigationMinutes", thresholds.activeInvestigationMinutes, 90],
    ["progressRecordMinutes", thresholds.progressRecordMinutes, 30],
  ];
  const raised = [];
  for (const [name, value, defaultMaximum] of values) {
    if (!Number.isInteger(value) || value < 1) {
      finding(findings, `thresholds.${name}`, "must be a positive integer");
    } else if (value > defaultMaximum) {
      raised.push(name);
    }
  }
  if (raised.length > 0) {
    const exception = thresholds.ownerApprovedException ?? {};
    for (const key of ["approvedBy", "approvedAt", "rationale", "supportedNextAction"]) {
      requireText(findings, `thresholds.ownerApprovedException.${key}`, exception[key]);
    }
  }
}

function verifyFindings(record, findings) {
  if (!Array.isArray(record.findings)) {
    finding(findings, "findings", "must be an array");
    return;
  }
  record.findings.forEach((entry, index) => {
    const area = `findings[${index}]`;
    requireText(findings, `${area}.summary`, entry?.summary);
    if (!FINDING_CLASSES.has(entry?.classification)) {
      finding(findings, `${area}.classification`, "uses an unsupported classification");
    }
    requireText(findings, `${area}.evidence`, entry?.evidence);
    requireText(findings, `${area}.decision`, entry?.decision);
  });
}

function verifyCheckpoints(record, findings) {
  if (!Array.isArray(record.checkpoints) || record.checkpoints.length === 0) {
    finding(findings, "checkpoints", "requires at least one evidence-bearing checkpoint");
    return;
  }
  record.checkpoints.forEach((checkpoint, index) => {
    const area = `checkpoints[${index}]`;
    for (const key of ["recordedAt", "phase", "candidate", "change", "evidence", "nextAction"]) {
      requireText(findings, `${area}.${key}`, checkpoint?.[key]);
    }
    if (!PHASES.includes(checkpoint?.phase)) {
      finding(findings, `${area}.phase`, "uses an unsupported phase");
    }
  });
}

function verifyBlockers(record, findings) {
  if (!Array.isArray(record.blockers)) {
    finding(findings, "blockers", "must be an array, including an empty reviewed array");
    return;
  }
  const limit = record.thresholds?.maximumUnsuccessfulAttempts ?? 2;
  const timeLimit = record.thresholds?.activeInvestigationMinutes ?? 90;
  record.blockers.forEach((blocker, index) => {
    const area = `blockers[${index}]`;
    requireText(findings, `${area}.summary`, blocker?.summary);
    if (!["active", "blocked", "resolved"].includes(blocker?.status)) {
      finding(findings, `${area}.status`, "must be active, blocked, or resolved");
    }
    if (!Number.isFinite(blocker?.activeMinutes) || blocker.activeMinutes < 0) {
      finding(findings, `${area}.activeMinutes`, "must be a nonnegative number");
    }
    if (!Array.isArray(blocker?.attempts)) {
      finding(findings, `${area}.attempts`, "must be an array");
      return;
    }
    blocker.attempts.forEach((attempt, attemptIndex) => {
      requireText(findings, `${area}.attempts[${attemptIndex}].action`, attempt?.action);
      requireText(findings, `${area}.attempts[${attemptIndex}].result`, attempt?.result);
      requireText(findings, `${area}.attempts[${attemptIndex}].evidence`, attempt?.evidence);
    });
    const unsuccessful = blocker.attempts.filter((attempt) => attempt?.successful === false).length;
    const thresholdReached = unsuccessful >= limit || blocker.activeMinutes >= timeLimit;
    if (thresholdReached && blocker.status === "active") {
      const continuation = blocker.ownerApprovedContinuation ?? {};
      for (const key of ["approvedBy", "approvedAt", "rationale", "supportedNextAction"]) {
        requireText(findings, `${area}.ownerApprovedContinuation.${key}`, continuation[key]);
      }
    }
    if (blocker.status === "resolved") {
      requireText(findings, `${area}.resolutionEvidence`, blocker.resolutionEvidence);
    }
  });
}

function verifyPageSpeedGate(gate, area, findings) {
  for (const key of SCORE_KEYS) {
    if (gate?.scores?.[key] !== 100) {
      finding(findings, `${area}.scores.${key}`, "must equal 100");
    }
  }
}

function verifyFailedPageSpeedTriage(gate, area, candidate, strategy, findings) {
  for (const key of SCORE_KEYS) {
    const score = gate?.scores?.[key];
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      finding(findings, `${area}.scores.${key}`, "must be an integer from 0 through 100");
    }
  }

  const triage = gate?.failureTriage ?? {};
  for (const key of [
    "candidate",
    "auditedUrl",
    "firstFailedAt",
    "rawReport",
    "dominantAudit",
    "diagnosisEvidence",
    "nextAction",
  ]) {
    requireText(findings, `${area}.failureTriage.${key}`, triage[key]);
  }
  if (triage.candidate && triage.candidate !== candidate.buildIdentity) {
    finding(findings, `${area}.failureTriage.candidate`, "must match the frozen build identity");
  }
  if (triage.strategy !== strategy) {
    finding(findings, `${area}.failureTriage.strategy`, `must equal ${strategy}`);
  }
  if (triage.validResultPreserved !== true) {
    finding(findings, `${area}.failureTriage.validResultPreserved`, "must be true");
  }
  if (triage.matrixStopped !== true) {
    finding(findings, `${area}.failureTriage.matrixStopped`, "must be true");
  }

  if (gate?.scores?.performance < 100) {
    for (const key of ["filmstripEvidence", "networkEvidence", "lcpEvidence"]) {
      requireText(findings, `${area}.failureTriage.${key}`, triage[key]);
    }
  }
}

function verifyCandidate(record, findings) {
  const phaseIndex = PHASES.indexOf(record.phase);
  if (phaseIndex < PHASES.indexOf("candidate-frozen")) return;
  const candidate = record.candidate ?? {};
  for (const key of ["frozenRevision", "buildIdentity", "frozenAt", "mandatorySuiteCommand"]) {
    requireText(findings, `candidate.${key}`, candidate[key]);
  }
  if (!candidate.gates || typeof candidate.gates !== "object") {
    finding(findings, "candidate.gates", "requires every mandatory gate declaration");
    return;
  }
  for (const gateName of REQUIRED_GATES) {
    const gate = candidate.gates[gateName];
    if (!gate || !["pending", "passed", "failed"].includes(gate.status)) {
      finding(findings, `candidate.gates.${gateName}.status`, "must be pending, passed, or failed");
      continue;
    }
    if (gateName === "mobilePageSpeed" && gate.status === "failed") {
      verifyFailedPageSpeedTriage(
        gate,
        `candidate.gates.${gateName}`,
        candidate,
        "mobile",
        findings,
      );
    }
    if (gateName === "desktopPageSpeed" && gate.status === "failed") {
      verifyFailedPageSpeedTriage(
        gate,
        `candidate.gates.${gateName}`,
        candidate,
        "desktop",
        findings,
      );
    }
    if (phaseIndex >= PHASES.indexOf("production-ready")) {
      if (gate.status !== "passed") {
        finding(findings, `candidate.gates.${gateName}.status`, "must be passed for production readiness");
      }
      requireText(findings, `candidate.gates.${gateName}.evidence`, gate.evidence);
      if (gateName === "mobilePageSpeed" || gateName === "desktopPageSpeed") {
        verifyPageSpeedGate(gate, `candidate.gates.${gateName}`, findings);
      }
    }
  }
}

export async function verifyExecutionControl(record) {
  const findings = [];
  if (!record || typeof record !== "object") {
    finding(findings, "record", "must export an object");
    return { version: 1, status: "failed", findings };
  }
  if (!PHASES.includes(record.phase)) {
    finding(findings, "phase", `must be one of ${PHASES.join(", ")}`);
  }
  verifyTaskEnvelope(record, findings);
  verifyThresholds(record, findings);
  verifyFindings(record, findings);
  verifyCheckpoints(record, findings);
  verifyBlockers(record, findings);
  verifyCandidate(record, findings);
  return {
    version: 1,
    status: findings.length === 0 ? "passed" : "failed",
    phase: record.phase,
    counts: {
      findings: findings.length,
      checkpoints: Array.isArray(record.checkpoints) ? record.checkpoints.length : 0,
      blockers: Array.isArray(record.blockers) ? record.blockers.length : 0,
    },
    findings,
  };
}

async function main() {
  const options = cliOptions(process.argv.slice(2));
  const configPath = resolve(String(options.config ?? "execution-control.config.mjs"));
  const record = (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)).default;
  const report = await verifyExecutionControl(record);
  const outputPath = resolve(String(options.output ?? record.output ?? "artifacts/execution-control-report.json"));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Execution-control verification ${report.status}: ${report.counts.findings} findings, ${report.counts.checkpoints} checkpoints, ${report.counts.blockers} blockers.`,
  );
  if (report.status !== "passed") {
    for (const item of report.findings) console.error(`${item.area}: ${item.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}
