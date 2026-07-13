import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Buffer } from "node:buffer";
import { error, log } from "node:console";
import process from "node:process";
import sharp from "sharp";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

const configPath = resolve(option("--config", "open-graph.config.mjs"));
const config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
const root = dirname(configPath);
const outputDirectory = isAbsolute(config.outputDirectory) ? config.outputDirectory : resolve(root, config.outputDirectory || "public");
const reviewDirectory = resolve(root, config.reviewDirectory || "output/open-graph-review");
const approvalFile = resolve(root, config.approvalFile || "open-graph-approvals.json");
const approve = process.argv.includes("--approve");
const checkOnly = process.argv.includes("--check");
const failures = [];
const records = [];
const columns = 3;
const rows = 4;
const cardsPerSheet = columns * rows;
const thumbnailWidth = 360;
const thumbnailHeight = 189;
const cellWidth = 380;
const cellHeight = 244;
const sheetPadding = 20;

for (const card of config.cards || []) {
  const name = card.name || card.slug;
  const filename = `og-${name}.png`;
  const imagePath = resolve(outputDirectory, filename);
  if (!existsSync(imagePath)) {
    failures.push(`Missing Open Graph image: ${imagePath}`);
    continue;
  }

  const image = await readFile(imagePath);
  const metadata = await sharp(image).metadata();
  if (metadata.width !== 1200 || metadata.height !== 630 || metadata.format !== "png") {
    failures.push(`${filename} must be a 1200 by 630 PNG`);
  }

  records.push({
    name,
    file: filename,
    sha256: createHash("sha256").update(image).digest("hex"),
    imagePath
  });
}

records.sort((left, right) => left.name.localeCompare(right.name));
await rm(reviewDirectory, { recursive: true, force: true });
await mkdir(reviewDirectory, { recursive: true });

for (let offset = 0; offset < records.length; offset += cardsPerSheet) {
  const batch = records.slice(offset, offset + cardsPerSheet);
  const sheetWidth = sheetPadding * 2 + columns * cellWidth;
  const sheetHeight = sheetPadding * 2 + rows * cellHeight;
  const composites = [];

  for (const [index, record] of batch.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = sheetPadding + column * cellWidth;
    const top = sheetPadding + row * cellHeight;
    const thumbnail = await sharp(record.imagePath).resize(thumbnailWidth, thumbnailHeight).png().toBuffer();
    const label = Buffer.from(`
      <svg width="${thumbnailWidth}" height="42" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="4" y="26" fill="#10211c" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700">${escapeXml(record.name)}</text>
      </svg>`);
    composites.push({ input: thumbnail, left, top });
    composites.push({ input: label, left, top: top + thumbnailHeight });
  }

  const sheetNumber = String(Math.floor(offset / cardsPerSheet) + 1).padStart(2, "0");
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: "#e7ece9" } })
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(resolve(reviewDirectory, `open-graph-review-${sheetNumber}.jpg`));
}

const manifest = {
  version: 1,
  cards: records.map(({ name, file, sha256 }) => ({ name, file, sha256 }))
};

if (failures.length > 0) {
  error("Open Graph visual review failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exitCode = 1;
} else if (approve) {
  await writeFile(approvalFile, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`Approved ${records.length} visually reviewed Open Graph images.`);
} else if (checkOnly) {
  const approved = await readFile(approvalFile, "utf8").then(JSON.parse).catch(() => null);
  if (JSON.stringify(approved) !== JSON.stringify(manifest)) {
    error(`Open Graph visual approval is missing or stale. Review ${reviewDirectory}, then run the visual review command with --approve.`);
    process.exitCode = 1;
  } else {
    log(`Verified visual approval for ${records.length} Open Graph images.`);
  }
} else {
  log(`Created ${Math.ceil(records.length / cardsPerSheet)} Open Graph review sheet(s) in ${reviewDirectory}.`);
}
