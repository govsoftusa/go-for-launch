import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { error, log } from "node:console";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function loadConfig(path) {
  if (!path) return {};
  const absolute = resolve(path);
  if (absolute.endsWith(".json")) return JSON.parse(await readFile(absolute, "utf8"));
  return (await import(`${pathToFileURL(absolute).href}?v=${Date.now()}`)).default;
}

function booleanOption(name, fallback) {
  return option(name, String(fallback)) === "true";
}

const config = await loadConfig(option("--config", ""));
const input = option("--input", config.input || "");
const output = resolve(option("--output", config.output || "artifacts/ahrefs-site-audit-report.json"));
const required = booleanOption("--required", config.required ?? false);
const projectId = option("--project-id", String(config.projectId || process.env.AHREFS_PROJECT_ID || ""));
const apiKeyEnvironmentVariable = config.apiKeyEnvironmentVariable || "AHREFS_API_KEY";
const apiKey = process.env[apiKeyEnvironmentVariable] || "";
const endpoint = new URL(config.endpoint || "https://api.ahrefs.com/v3/site-audit/issues");
const failOnImportance = new Set(config.failOnImportance || ["Error", "Warning"]);
const ignoredIssueIds = new Set(config.ignoredIssueIds || []);
const ignoredIssueNames = new Set(config.ignoredIssueNames || []);
let source = "none";
let payload = null;
let skippedReason = "";

if (input) {
  payload = JSON.parse(await readFile(resolve(input), "utf8"));
  source = "file";
} else if (projectId && apiKey) {
  endpoint.searchParams.set("project_id", projectId);
  endpoint.searchParams.set("output", "json");
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`Ahrefs API returned HTTP ${response.status}.`);
  payload = await response.json();
  source = "api-v3";
} else {
  skippedReason = `Ahrefs check skipped because ${projectId ? apiKeyEnvironmentVariable : "AHREFS_PROJECT_ID"} is unavailable.`;
}

const issues = Array.isArray(payload?.issues) ? payload.issues : [];
const activeIssues = issues.filter((issue) =>
  Number(issue.crawled || 0) > 0 &&
  !ignoredIssueIds.has(issue.issue_id) &&
  !ignoredIssueNames.has(issue.name)
);
const blockingIssues = activeIssues.filter((issue) => failOnImportance.has(issue.importance));
const report = {
  generatedAt: new Date().toISOString(),
  source,
  skipped: source === "none",
  skippedReason,
  projectIdConfigured: Boolean(projectId),
  policy: {
    required,
    failOnImportance: [...failOnImportance],
    ignoredIssueIds: [...ignoredIssueIds],
    ignoredIssueNames: [...ignoredIssueNames]
  },
  counts: {
    reportedIssues: issues.length,
    activeIssues: activeIssues.length,
    blockingIssues: blockingIssues.length
  },
  activeIssues: activeIssues.map(({ issue_id, name, category, importance, crawled, added, change, new: newlyFound, removed, missing, is_indexable }) => ({
    issueId: issue_id,
    name,
    category,
    importance,
    affectedUrls: crawled,
    added,
    change,
    newlyFound,
    removed,
    missing,
    indexableOnly: is_indexable
  }))
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

if (report.skipped) {
  if (required) {
    error(skippedReason);
    process.exitCode = 1;
  } else {
    log(skippedReason);
  }
} else if (blockingIssues.length > 0) {
  error("Ahrefs Site Audit verification failed:");
  for (const issue of blockingIssues) error(`- [${issue.importance}] ${issue.name}: ${issue.crawled} affected URLs`);
  process.exitCode = 1;
} else {
  log(`Ahrefs Site Audit verification passed: ${activeIssues.length} active issues and no configured blocking issues.`);
}
