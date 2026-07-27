import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { verifyReleaseEvidence } from "./verify-release-evidence.mjs";

const execFileAsync = promisify(execFile);
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

const sourceRepo = join(root, "source-repo");
const publicDirectory = join(sourceRepo, "public");
await mkdir(publicDirectory, { recursive: true });
await execFileAsync("git", ["init"], { cwd: sourceRepo });
await execFileAsync("git", ["config", "user.name", "Release Evidence Test"], {
  cwd: sourceRepo,
});
await execFileAsync("git", ["config", "user.email", "release-evidence@example.invalid"], {
  cwd: sourceRepo,
});
await writeFile(join(sourceRepo, ".gitignore"), ".DS_Store\n");
await writeFile(join(publicDirectory, "asset.txt"), "approved asset\n");
await execFileAsync("git", ["add", "."], { cwd: sourceRepo });
await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRepo });
const { stdout: revisionOutput } = await execFileAsync("git", ["rev-parse", "HEAD"], {
  cwd: sourceRepo,
  encoding: "utf8",
});
await writeFile(join(publicDirectory, ".DS_Store"), "ignored local metadata\n");

const ignoredSource = await verifyReleaseEvidence({
  ...config,
  report: undefined,
  sources: [
    {
      name: "fixture runtime",
      repo: sourceRepo,
      revision: revisionOutput.trim(),
      paths: ["public"],
    },
  ],
});
if (
  ignoredSource.status !== "failed" ||
  !ignoredSource.findings.some((finding) => finding.message.includes("public/.DS_Store"))
) {
  throw new Error("Ignored runtime file did not fail the release evidence gate.");
}

await rm(root, { recursive: true, force: true });
console.log("Release evidence verifier tests passed.");
