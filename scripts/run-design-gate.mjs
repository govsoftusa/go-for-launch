import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { evaluateDesignGate } from "./lib/design-gate.mjs";

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...parts] = argument.replace(/^--/, "").split("=");
    return [key, parts.join("=")];
  })
);

const configPath = resolve(options.config || "design-gate.config.mjs");
const reviewPath = options.review ? resolve(options.review) : null;
const outputPath = resolve(options.output || "evidence/design-gate-result.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

let config;
try {
  config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
} catch (error) {
  console.error(`Unable to load design gate configuration at ${configPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

let review = null;
if (reviewPath) {
  try {
    review = await readJson(reviewPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      review = null;
    } else {
      console.error(`Unable to read design review record at ${reviewPath}.`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

const result = evaluateDesignGate(config, review);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(`Design gate: ${result.status}. Mode: ${result.mode}. Framework: ${result.framework}.`);
console.log(`Result: ${outputPath}`);
for (const finding of result.findings) console.log(`Finding: ${finding}`);

if (result.blocking) process.exitCode = 1;
