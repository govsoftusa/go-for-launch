import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const cli = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...parts] = argument.replace(/^--/, "").split("=");
    return [key, parts.join("=") || true];
  }),
);

function pointerValue(value, pointer) {
  if (pointer === "" || pointer === "/") return value;
  return pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], value);
}

function addFinding(findings, area, message) {
  findings.push({ severity: "error", area, message });
}

function evaluateAssertion(value, assertion, config) {
  const actual = pointerValue(value, assertion.pointer);
  if ("equals" in assertion && actual !== assertion.equals) {
    return `expected ${JSON.stringify(assertion.equals)}, received ${JSON.stringify(actual)}`;
  }
  if (assertion.equalsConfig) {
    const expected = config[assertion.equalsConfig];
    if (actual !== expected) {
      return `expected config ${assertion.equalsConfig} value ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`;
    }
  }
  if ("lengthEquals" in assertion) {
    const length = actual?.length;
    if (length !== assertion.lengthEquals) {
      return `expected length ${assertion.lengthEquals}, received ${JSON.stringify(length)}`;
    }
  }
  if ("lengthMinimum" in assertion) {
    const length = actual?.length;
    if (!(typeof length === "number" && length >= assertion.lengthMinimum)) {
      return `expected length at least ${assertion.lengthMinimum}, received ${JSON.stringify(length)}`;
    }
  }
  if ("minimum" in assertion && !(typeof actual === "number" && actual >= assertion.minimum)) {
    return `expected a number at least ${assertion.minimum}, received ${JSON.stringify(actual)}`;
  }
  if (assertion.truthy === true && !actual) {
    return `expected a truthy value, received ${JSON.stringify(actual)}`;
  }
  if (assertion.oneOf && !assertion.oneOf.includes(actual)) {
    return `expected one of ${JSON.stringify(assertion.oneOf)}, received ${JSON.stringify(actual)}`;
  }
  return "";
}

async function gitOutput(repo, argumentsList) {
  const { stdout } = await execFileAsync("git", argumentsList, {
    cwd: resolve(repo),
    encoding: "utf8",
  });
  return stdout.trim();
}

async function inspectSource(source, findings) {
  const repo = resolve(source.repo ?? ".");
  try {
    const currentRevision = await gitOutput(repo, ["rev-parse", "HEAD"]);
    await gitOutput(repo, ["cat-file", "-e", `${source.revision}^{commit}`]);
    const paths = source.paths ?? ["."];
    const committed = await gitOutput(repo, [
      "diff",
      "--name-only",
      `${source.revision}..HEAD`,
      "--",
      ...paths,
    ]);
    const unstaged = await gitOutput(repo, ["diff", "--name-only", "--", ...paths]);
    const staged = await gitOutput(repo, ["diff", "--cached", "--name-only", "--", ...paths]);
    const untracked = await gitOutput(repo, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      ...paths,
    ]);
    const ignored = await gitOutput(repo, [
      "ls-files",
      "--others",
      "--ignored",
      "--exclude-standard",
      "--",
      ...paths,
    ]);
    const drift = [
      ...new Set(
        [committed, unstaged, staged, untracked, ignored]
          .flatMap((entry) => entry.split("\n"))
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    ].sort();
    if (drift.length > 0) {
      addFinding(
        findings,
        source.name ?? "source",
        `runtime paths drifted from ${source.revision}: ${drift.join(", ")}`,
      );
    }
    return {
      name: source.name ?? "source",
      repo,
      expectedRevision: source.revision,
      currentRevision,
      paths,
      drift,
    };
  } catch (error) {
    addFinding(
      findings,
      source.name ?? "source",
      error instanceof Error ? error.message : String(error),
    );
    return {
      name: source.name ?? "source",
      repo,
      expectedRevision: source.revision,
      currentRevision: "",
      paths: source.paths ?? ["."],
      drift: [],
    };
  }
}

async function inspectToolkit(toolkit, findings) {
  const repo = resolve(toolkit.repo);
  try {
    const currentRevision = await gitOutput(repo, ["rev-parse", "HEAD"]);
    const dirty = await gitOutput(repo, ["status", "--short"]);
    if (currentRevision !== toolkit.revision) {
      addFinding(
        findings,
        toolkit.name ?? "toolkit",
        `revision ${currentRevision}, expected ${toolkit.revision}`,
      );
    }
    if (dirty) {
      addFinding(findings, toolkit.name ?? "toolkit", "toolkit worktree is not clean");
    }
    return {
      name: toolkit.name ?? "toolkit",
      repo,
      expectedRevision: toolkit.revision,
      currentRevision,
      clean: !dirty,
    };
  } catch (error) {
    addFinding(
      findings,
      toolkit.name ?? "toolkit",
      error instanceof Error ? error.message : String(error),
    );
    return {
      name: toolkit.name ?? "toolkit",
      repo,
      expectedRevision: toolkit.revision,
      currentRevision: "",
      clean: false,
    };
  }
}

async function inspectArtifact(artifact, config, findings) {
  const artifactPath = resolve(artifact.path);
  try {
    if (artifact.format === "directory") {
      const hash = createHash("sha256");
      let totalBytes = 0;
      let fileCount = 0;
      const visit = async (directory) => {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
          const entryPath = join(directory, entry.name);
          if (entry.isDirectory()) {
            await visit(entryPath);
            continue;
          }
          if (!entry.isFile()) continue;
          const bytes = await readFile(entryPath);
          const relativePath = relative(artifactPath, entryPath);
          hash.update(relativePath);
          hash.update("\0");
          hash.update(String(bytes.length));
          hash.update("\0");
          hash.update(bytes);
          totalBytes += bytes.length;
          fileCount += 1;
        }
      };
      await visit(artifactPath);
      if (fileCount === 0) throw new Error(`${artifact.path} contains no files`);
      return {
        name: artifact.name,
        path: artifactPath,
        bytes: totalBytes,
        files: fileCount,
        sha256: hash.digest("hex"),
      };
    }

    const bytes = await readFile(artifactPath);
    let parsed;
    if ((artifact.format ?? "json") === "json") {
      parsed = JSON.parse(bytes.toString("utf8"));
      for (const assertion of artifact.assertions ?? []) {
        const failure = evaluateAssertion(parsed, assertion, config);
        if (failure) {
          addFinding(
            findings,
            artifact.name,
            `${artifact.path} ${assertion.pointer || "/"}: ${failure}`,
          );
        }
      }
    }
    return {
      name: artifact.name,
      path: artifactPath,
      bytes: bytes.length,
      files: 1,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    addFinding(
      findings,
      artifact.name,
      error instanceof Error ? error.message : String(error),
    );
    return {
      name: artifact.name,
      path: artifactPath,
      bytes: 0,
      files: 0,
      sha256: "",
    };
  }
}

export async function verifyReleaseEvidence(inputConfig) {
  const config = { ...inputConfig };
  if (!config.candidate) throw new Error("Release evidence requires a candidate.");
  if (!Array.isArray(config.artifacts) || config.artifacts.length === 0) {
    throw new Error("Release evidence requires at least one artifact.");
  }

  const findings = [];
  const sources = [];
  for (const source of config.sources ?? []) {
    sources.push(await inspectSource(source, findings));
  }
  const toolkits = [];
  for (const toolkit of config.toolkits ?? []) {
    toolkits.push(await inspectToolkit(toolkit, findings));
  }
  const artifacts = [];
  for (const artifact of config.artifacts) {
    artifacts.push(await inspectArtifact(artifact, config, findings));
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: findings.length === 0 ? "passed" : "failed",
    candidate: config.candidate,
    sources,
    toolkits,
    artifacts,
    counts: {
      sources: sources.length,
      toolkits: toolkits.length,
      artifacts: artifacts.length,
      findings: findings.length,
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
  if (!cli.config) throw new Error("Pass --config=/absolute/or/relative/config.mjs");
  const configPath = resolve(String(cli.config));
  const loaded = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const report = await verifyReleaseEvidence(loaded.default);
  console.log(
    `Release evidence: ${report.counts.artifacts} artifacts, ${report.counts.sources} source records, ${report.counts.toolkits} toolkit records, ${report.counts.findings} findings.`,
  );
  if (report.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
