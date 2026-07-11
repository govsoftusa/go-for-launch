import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runSharpnessAudit } from "./lib/render-sharpness.mjs";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const root = argument("root");
const output = argument("output");
const fix = process.argv.includes("--fix");

if (!root) {
  console.error("Usage: node scripts/verify-render-sharpness.mjs --root=<source-or-build-directory> [--output=<report.json>] [--fix]");
  process.exit(2);
}

let result;
try {
  result = runSharpnessAudit(root, { fix });
} catch (error) {
  console.error(`Render sharpness audit could not run: ${error.message}`);
  process.exit(2);
}

if (output) {
  const outputPath = resolve(output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}

if (result.fixedFiles.length > 0) {
  console.log(`Render sharpness auto-fix updated ${result.fixedFiles.length} source file(s). Rebuild before release.`);
}

if (result.findings.length > 0) {
  for (const finding of result.findings) {
    console.error(`${finding.file}:${finding.line} [${finding.code}] ${finding.selector}, ${finding.message}`);
  }
  console.error(`Render sharpness audit failed with ${result.findings.length} finding(s).`);
  process.exit(1);
}

console.log(`Render sharpness audit passed across ${result.scanned.css} CSS file(s) and ${result.scanned.markup} markup file(s).`);
