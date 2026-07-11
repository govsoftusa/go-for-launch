import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { auditSideNavigation } from "./lib/side-navigation.mjs";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const root = argument("root");
const output = argument("output");
const requireNavigation = argument("require") === "true";

if (!root) {
  console.error("Usage: node scripts/verify-side-navigation.mjs --root=<build-directory> [--require=true] [--output=<report.json>]");
  process.exit(2);
}

let result;
try {
  result = auditSideNavigation(root, { requireNavigation });
} catch (error) {
  console.error(`Side navigation audit could not run: ${error.message}`);
  process.exit(2);
}

if (output) {
  const outputPath = resolve(output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}

if (result.findings.length > 0) {
  for (const finding of result.findings) {
    console.error(`${finding.file} [${finding.code}] ${finding.message}`);
  }
  console.error(`Side navigation audit failed with ${result.findings.length} finding(s).`);
  process.exit(1);
}

console.log(
  `Side navigation audit passed across ${result.scanned.pages} page(s), ${result.scanned.navigations} navigation region(s), and ${result.scanned.items} item(s).`
);
