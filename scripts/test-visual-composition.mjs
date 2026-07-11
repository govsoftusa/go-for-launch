import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-visual-"));
const script = resolve("scripts/verify-visual-composition.mjs");

async function fixture(name, decorationLeft) {
  const directory = join(root, name);
  const output = join(directory, "dist");
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "index.html"), `<!doctype html><style>
    [data-visual-artboard] { position: relative; width: 300px; height: 200px; }
    [data-visual-label] { position: absolute; width: 80px; height: 50px; }
    .one { left: 20px; top: 20px; } .two { right: 20px; bottom: 20px; }
    [data-visual-decoration] { position: absolute; left: ${decorationLeft}px; top: 50px; width: 8px; height: 70px; }
  </style><div data-visual-artboard data-visual-name="fixture" data-min-horizontal-fill="0.8" data-min-vertical-fill="0.7">
    <span class="one" data-visual-label data-visual-name="One">One</span>
    <span class="two" data-visual-label data-visual-name="Two">Two</span>
    <i data-visual-decoration data-visual-name="Rule"></i>
  </div>`);
  const config = join(directory, "config.mjs");
  await writeFile(config, `export default ${JSON.stringify({
    outputDirectory: output,
    report: join(directory, "report.json"),
    screenshotDirectory: join(directory, "screenshots"),
    routes: ["/"],
    browsers: ["chromium"],
    viewports: [{ name: "test", width: 500, height: 400 }]
  })};\n`);
  return { directory, config };
}

const valid = await fixture("valid", 145);
const validResult = spawnSync(process.execPath, [script, `--config=${valid.config}`], { encoding: "utf8" });
if (validResult.status !== 0) throw new Error(`Valid visual fixture failed:\n${validResult.stdout}${validResult.stderr}`);

const invalid = await fixture("invalid", 55);
const invalidResult = spawnSync(process.execPath, [script, `--config=${invalid.config}`], { encoding: "utf8" });
if (invalidResult.status === 0) throw new Error("Decoration collision did not fail visual composition verification.");
const invalidReport = JSON.parse(await readFile(join(invalid.directory, "report.json"), "utf8"));
if (!invalidReport.failures.some((failure) => failure.includes("Rule crosses One"))) {
  throw new Error(`Expected collision finding was missing:\n${JSON.stringify(invalidReport, null, 2)}`);
}

console.log("Visual composition verifier tests passed.");
