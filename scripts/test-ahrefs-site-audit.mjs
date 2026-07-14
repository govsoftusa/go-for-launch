import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const verifier = new URL("./verify-ahrefs-site-audit.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-ahrefs-"));

function run(input, output, extra = []) {
  return spawnSync(process.execPath, [verifier.pathname, `--input=${input}`, `--output=${output}`, ...extra], { encoding: "utf8" });
}

const cleanInput = join(root, "clean.json");
const cleanOutput = join(root, "clean-report.json");
await writeFile(cleanInput, JSON.stringify({ issues: [{ issue_id: "notice", name: "Notice only", category: "Other", importance: "Notice", crawled: 3 }] }));
const clean = run(cleanInput, cleanOutput);
if (clean.status !== 0) throw new Error(`Notice-only Ahrefs fixture failed:\n${clean.stdout}${clean.stderr}`);
const cleanReport = JSON.parse(await readFile(cleanOutput, "utf8"));
if (cleanReport.counts.blockingIssues !== 0 || cleanReport.source !== "file") throw new Error("Clean Ahrefs report is incorrect.");

const blockedInput = join(root, "blocked.json");
const blockedOutput = join(root, "blocked-report.json");
await writeFile(blockedInput, JSON.stringify({ issues: [
  { issue_id: "broken-link", name: "Broken external page", category: "External pages", importance: "Error", crawled: 2 },
  { issue_id: "resolved", name: "Resolved issue", category: "Links", importance: "Error", crawled: 0 }
] }));
const blocked = run(blockedInput, blockedOutput);
if (blocked.status === 0 || !blocked.stderr.includes("Broken external page")) throw new Error("Blocking Ahrefs fixture did not fail.");
const blockedReport = JSON.parse(await readFile(blockedOutput, "utf8"));
if (blockedReport.counts.blockingIssues !== 1 || blockedReport.counts.activeIssues !== 1) throw new Error("Blocking Ahrefs report counts are incorrect.");

const optionalOutput = join(root, "optional-report.json");
const optional = spawnSync(process.execPath, [verifier.pathname, `--output=${optionalOutput}`], {
  encoding: "utf8",
  env: { ...process.env, AHREFS_API_KEY: "", AHREFS_PROJECT_ID: "" }
});
if (optional.status !== 0) throw new Error("Optional Ahrefs check should skip without credentials.");
const optionalReport = JSON.parse(await readFile(optionalOutput, "utf8"));
if (!optionalReport.skipped) throw new Error("Optional Ahrefs report did not record its skipped state.");

await rm(root, { recursive: true, force: true });
log("Ahrefs Site Audit verifier tests passed.");
