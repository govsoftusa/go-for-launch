import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { log } from "node:console";
import sharp from "sharp";
import { assertArtworkSuitability, inspectArtworkSuitability } from "./lib/artwork-suitability.mjs";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-artwork-"));
const flat = join(root, "flat.png");
const informative = join(root, "informative.png");

await sharp({ create: { width: 320, height: 240, channels: 3, background: "#b8b8b8" } }).png().toFile(flat);
await sharp({ create: { width: 320, height: 240, channels: 3, background: "#071526" } })
  .composite([{
    input: Buffer.from('<svg width="320" height="240" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="24" width="128" height="192" fill="#ef2445"/><circle cx="238" cy="120" r="74" fill="#ffffff"/></svg>')
  }])
  .png()
  .toFile(informative);

const flatResult = await inspectArtworkSuitability(flat);
if (flatResult.suitable || flatResult.reason !== "low-detail-artwork") {
  throw new Error("Flat placeholder artwork was not rejected.");
}

const informativeResult = await assertArtworkSuitability(informative);
if (!informativeResult.suitable) throw new Error("Informative artwork did not pass.");

await rm(root, { recursive: true, force: true });
log("Social-card artwork suitability tests passed.");
