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

function typographyRules(config) {
  return {
    sansFamily: String(config.typography?.sansFamily || "Arial, sans-serif"),
    accentFamily: String(config.typography?.accentFamily || "Georgia, serif"),
    eyebrowSize: Number(config.typography?.eyebrowSize || 18),
    headlineOneSize: Number(config.typography?.headlineOneSize || 76),
    headlineTwoSize: Number(config.typography?.headlineTwoSize || 74),
    supportingSize: Number(config.typography?.supportingSize || 24),
    destinationSize: Number(config.typography?.destinationSize || 23)
  };
}

function stableCardInput(config, card, name) {
  return {
    contractVersion: 1,
    templateVersion: String(config.templateVersion || "1"),
    seoContractVersion: String(config.seoContractVersion || "1"),
    width: config.width || 1200,
    height: config.height || 630,
    name,
    lineOne: String(card.lineOne || ""),
    lineTwo: String(card.lineTwo || ""),
    eyebrow: String(card.eyebrow || config.eyebrow || ""),
    tagline: String(card.tagline || config.tagline || ""),
    displayUrl: String(card.displayUrl || config.domain || ""),
    mark: String(card.mark || config.mark || "GFL"),
    colors: {
      background: String(config.colors?.background || "#07110f"),
      accent: String(config.colors?.accent || "#d6ff70"),
      secondary: String(config.colors?.secondary || "#83f3c8")
    },
    typography: typographyRules(config),
    sourceAssetSha256: String(card.sourceAssetSha256 || "")
  };
}

const configPath = resolve(option("--config", "open-graph.config.mjs"));
const config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
const root = dirname(configPath);
const outputDirectory = isAbsolute(config.outputDirectory) ? config.outputDirectory : resolve(root, config.outputDirectory || "public");
const reviewDirectory = resolve(root, config.reviewDirectory || "output/open-graph-review");
const approvalFile = resolve(root, config.approvalFile || "open-graph-approvals.json");
const stateFile = isAbsolute(config.stateFile || "") ? config.stateFile : resolve(root, config.stateFile || "open-graph-state.json");
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
const maximumBytes = config.maximumBytes || 250_000;
const state = await readFile(stateFile, "utf8").then(JSON.parse).catch(() => null);
const stateCards = new Map((state?.cards || []).map((card) => [card.name, card]));
const reviewContract = config.reviewContract || {};

if (!state || state.version !== 2) failures.push(`Missing or unsupported Open Graph state manifest: ${stateFile}`);

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
  if (metadata.hasAlpha) failures.push(`${filename} must be fully opaque`);
  if (image.byteLength > maximumBytes) failures.push(`${filename} exceeds the ${maximumBytes} byte limit`);

  const outputSha256 = createHash("sha256").update(image).digest("hex");
  const recorded = stateCards.get(name);
  if (!recorded) failures.push(`${filename} has no rendering input state`);
  else if (recorded.outputSha256 !== outputSha256) failures.push(`${filename} does not match its recorded output hash`);
  else {
    const expectedInputSha256 = createHash("sha256").update(JSON.stringify(stableCardInput(config, card, name))).digest("hex");
    if (recorded.inputSha256 !== expectedInputSha256) failures.push(`${filename} rendering inputs do not match the state manifest`);
  }

  records.push({
    name,
    file: filename,
    sha256: outputSha256,
    inputSha256: recorded?.inputSha256 || "missing",
    purpose: card.purpose || "missing",
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
  version: 2,
  templateVersion: String(config.templateVersion || "missing"),
  seoContractVersion: String(config.seoContractVersion || "missing"),
  reviewContract: {
    reviewer: String(reviewContract.reviewer || ""),
    reviewedOn: String(reviewContract.reviewedOn || ""),
    brandReference: String(reviewContract.brandReference || ""),
    readabilityApproved: reviewContract.readabilityApproved === true,
    brandIntegrityApproved: reviewContract.brandIntegrityApproved === true,
    contactInformationApproved: reviewContract.contactInformationApproved === true
  },
  cards: records.map(({ name, file, inputSha256, sha256, purpose }) => ({ name, file, purpose, inputSha256, sha256 }))
};

if (approve || checkOnly) {
  if (!manifest.reviewContract.reviewer) failures.push("Visual approval requires a named reviewer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.reviewContract.reviewedOn)) failures.push("Visual approval requires reviewedOn in YYYY-MM-DD format");
  if (!manifest.reviewContract.brandReference) failures.push("Visual approval requires a brand reference");
  if (!manifest.reviewContract.readabilityApproved) failures.push("Visual approval requires explicit readability approval");
  if (!manifest.reviewContract.brandIntegrityApproved) failures.push("Visual approval requires explicit brand integrity approval");
  if (!manifest.reviewContract.contactInformationApproved) failures.push("Visual approval requires explicit contact information approval or confirmation that contact information is not required");
}

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
