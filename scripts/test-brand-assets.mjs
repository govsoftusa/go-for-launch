import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const verifier = new URL("./verify-brand-assets.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-brand-"));
const guide = join(root, "brand-guide.txt");
const lightLogo = join(root, "primary.svg");
const darkLogo = join(root, "white.svg");
const config = join(root, "brand-assets.config.mjs");
const svg = (fill) => `<svg width="100" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="40" fill="${fill}"/></svg>`;
await writeFile(guide, "Reviewed brand guide");
await writeFile(lightLogo, svg("#123456"));
await writeFile(darkLogo, svg("#ffffff"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const guideHash = hash("Reviewed brand guide");
const lightHash = hash(svg("#123456"));
const darkHash = hash(svg("#ffffff"));

function configuration() {
  return {
    brandGuide: { file: guide, sha256: guideHash },
    assets: [
      { id: "light", file: lightLogo, sha256: lightHash, variant: "Full Color", allowedSurfaces: ["light"], minimumClearSpaceRatio: 0.25, minimumRenderedWidth: 100 },
      { id: "dark", file: darkLogo, sha256: darkHash, variant: "White", allowedSurfaces: ["dark"], minimumClearSpaceRatio: 0.25, minimumRenderedWidth: 32 }
    ],
    usages: [
      { context: "Light panel", assetId: "light", surface: "light", renderedWidth: 200, renderedHeight: 80, clearSpace: { top: 20, right: 20, bottom: 20, left: 20 } },
      { context: "Dark panel", assetId: "dark", surface: "dark", renderedWidth: 100, renderedHeight: 40, clearSpace: { top: 10, right: 10, bottom: 10, left: 10 } }
    ]
  };
}

async function run(value) {
  await writeFile(config, `export default ${JSON.stringify(value)};\n`);
  return spawnSync(process.execPath, [verifier.pathname, `--config=${config}`], { encoding: "utf8" });
}

const valid = await run(configuration());
if (valid.status !== 0) throw new Error(`Valid brand assets failed:\n${valid.stdout}${valid.stderr}`);

const changedGuide = configuration();
changedGuide.brandGuide.sha256 = "bad";
const changedGuideResult = await run(changedGuide);
if (changedGuideResult.status === 0 || !changedGuideResult.stderr.includes("Brand guide hash changed")) throw new Error("Changed brand guide did not fail.");

const wrongSurface = configuration();
wrongSurface.usages[1].assetId = "light";
const surfaceResult = await run(wrongSurface);
if (surfaceResult.status === 0 || !surfaceResult.stderr.includes("not approved for the dark surface")) throw new Error("Wrong surface variant did not fail.");

const distorted = configuration();
distorted.usages[0].renderedHeight = 60;
const distortionResult = await run(distorted);
if (distortionResult.status === 0 || !distortionResult.stderr.includes("stretched or distorted")) throw new Error("Distorted brand asset did not fail.");

const crowded = configuration();
crowded.usages[0].clearSpace.left = 5;
const clearSpaceResult = await run(crowded);
if (clearSpaceResult.status === 0 || !clearSpaceResult.stderr.includes("left clear space")) throw new Error("Insufficient clear space did not fail.");

console.log("Brand guide hash, asset provenance, surface, aspect ratio, size, and clear-space tests passed.");
