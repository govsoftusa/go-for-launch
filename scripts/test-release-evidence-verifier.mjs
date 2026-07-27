import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyReleaseEvidence } from "./verify-release-evidence.mjs";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-release-evidence-"));
const artifactPath = join(root, "artifact.json");
const reportPath = join(root, "report.json");
const candidate = "fixture-candidate";

await writeFile(
  artifactPath,
  `${JSON.stringify({ status: "passed", candidate, findings: [], checks: 12 })}\n`,
);

const config = {
  candidate,
  report: reportPath,
  artifacts: [
    {
      name: "fixture directory",
      path: root,
      format: "directory",
    },
    {
      name: "fixture report",
      path: artifactPath,
      assertions: [
        { pointer: "/status", equals: "passed" },
        { pointer: "/candidate", equalsConfig: "candidate" },
        { pointer: "/findings", lengthEquals: 0 },
        { pointer: "/checks", minimum: 1 },
      ],
    },
  ],
};

const passing = await verifyReleaseEvidence(config);
  if (passing.status !== "passed" || passing.counts.artifacts !== 2) {
    throw new Error("Valid release evidence fixture did not pass.");
  }
const saved = JSON.parse(await readFile(reportPath, "utf8"));
if (
  !saved.artifacts.every((artifact) => artifact.sha256 && artifact.bytes > 0) ||
  saved.artifacts[0].files === 0
) {
  throw new Error("Release evidence did not preserve the artifact hash.");
}

await writeFile(
  artifactPath,
  `${JSON.stringify({ status: "failed", candidate: "other", findings: ["failure"] })}\n`,
);
const failing = await verifyReleaseEvidence({ ...config, report: undefined });
if (failing.status !== "failed" || failing.counts.findings < 3) {
  throw new Error("Invalid release evidence fixture did not fail closed.");
}

await rm(root, { recursive: true, force: true });
console.log("Release evidence verifier tests passed.");
