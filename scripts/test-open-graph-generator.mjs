import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const script = new URL("./generate-open-graph.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-og-"));
const config = join(root, "open-graph.config.mjs");
await writeFile(config, `export default ${JSON.stringify({
  outputDirectory: "public",
  width: 1200,
  height: 630,
  eyebrow: "TEST TOOLKIT",
  tagline: "Build. Test. Release.",
  domain: "www.example.com",
  mark: "GFL",
  cards: [{ name: "home", lineOne: "Build better", lineTwo: "Astro websites." }]
})};\n`);

function run(extra = []) {
  return spawnSync(process.execPath, [script.pathname, `--config=${config}`, ...extra], { encoding: "utf8" });
}

const first = run();
if (first.status !== 0) throw new Error(`First Open Graph generation failed:\n${first.stdout}${first.stderr}`);
const output = join(root, "public", "og-home.png");
const firstHash = createHash("sha256").update(await readFile(output)).digest("hex");
const second = run();
if (second.status !== 0) throw new Error(`Second Open Graph generation failed:\n${second.stdout}${second.stderr}`);
const secondHash = createHash("sha256").update(await readFile(output)).digest("hex");
if (firstHash !== secondHash) throw new Error("Open Graph output was not byte-for-byte deterministic.");

const check = run(["--check"]);
if (check.status !== 0) throw new Error(`Open Graph check failed:\n${check.stdout}${check.stderr}`);
await writeFile(output, "stale");
const stale = run(["--check"]);
if (stale.status === 0 || !stale.stderr.includes("missing or stale")) throw new Error("Stale Open Graph fixture did not fail correctly.");

await rm(root, { recursive: true, force: true });
log("Deterministic Open Graph generation and stale-file tests passed.");
