import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function estimatedWidth(value, fontSize) {
  return [...String(value)].reduce((width, character) => {
    if (character === " ") return width + fontSize * 0.3;
    if (/[MW@%&]/.test(character)) return width + fontSize * 0.88;
    if (/[A-Z0-9]/.test(character)) return width + fontSize * 0.66;
    if (/[mw]/.test(character)) return width + fontSize * 0.78;
    if (/[iltfjr]/.test(character)) return width + fontSize * 0.34;
    return width + fontSize * 0.55;
  }, 0);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableCardInput(config, card, name) {
  const typography = typographyRules(config);
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
    typography,
    sourceAssetSha256: String(card.sourceAssetSha256 || "")
  };
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

function validateBrandContract(config, failures) {
  const typography = typographyRules(config);
  const rules = config.brandRules;
  if (!rules) {
    failures.push("Configuration must define brandRules");
    return;
  }

  const approvedColors = new Set((rules.approvedColors || []).map((value) => String(value).toLowerCase()));
  for (const [name, value] of Object.entries(config.colors || {})) {
    if (!approvedColors.has(String(value).toLowerCase())) failures.push(`Brand color ${name} is not in brandRules.approvedColors`);
  }

  const approvedFonts = new Set((rules.approvedFontFamilies || []).map(String));
  if (!approvedFonts.has(typography.sansFamily)) failures.push("Configured sans font family is not brand approved");
  if (!approvedFonts.has(typography.accentFamily)) failures.push("Configured accent font family is not brand approved");

  const minimumSupportingSize = Number(rules.minimumSupportingTextSize || 18);
  const maximumHeadlineSize = Number(rules.maximumHeadlineTextSize || 84);
  for (const [name, size] of Object.entries({
    eyebrow: typography.eyebrowSize,
    supporting: typography.supportingSize,
    destination: typography.destinationSize
  })) {
    if (size < minimumSupportingSize) failures.push(`${name} text is below the brand readability minimum of ${minimumSupportingSize} pixels`);
  }
  for (const [name, size] of Object.entries({ headlineOne: typography.headlineOneSize, headlineTwo: typography.headlineTwoSize })) {
    if (size > maximumHeadlineSize) failures.push(`${name} text exceeds the brand readability maximum of ${maximumHeadlineSize} pixels`);
  }

  const minimumPadding = Number(rules.minimumSafePadding || 60);
  const contentBounds = { left: 72, top: 58, right: 692, bottom: 562 };
  if (contentBounds.left < minimumPadding || contentBounds.top < minimumPadding - 2 || 1200 - contentBounds.right < minimumPadding || 630 - contentBounds.bottom < minimumPadding) {
    failures.push(`Template content violates the brand minimum safe padding of ${minimumPadding} pixels`);
  }

  const regions = [
    { name: "eyebrow", top: 62, bottom: 87 },
    { name: "headlineOne", top: 246 - typography.headlineOneSize * 0.82, bottom: 246 + typography.headlineOneSize * 0.22 },
    { name: "headlineTwo", top: 332 - typography.headlineTwoSize * 0.82, bottom: 332 + typography.headlineTwoSize * 0.22 },
    { name: "supporting", top: 420 - typography.supportingSize * 0.82, bottom: 420 + typography.supportingSize * 0.22 },
    { name: "destination", top: 548 - typography.destinationSize * 0.82, bottom: 548 + typography.destinationSize * 0.22 }
  ];
  for (let index = 1; index < regions.length; index += 1) {
    if (regions[index].top < regions[index - 1].bottom) failures.push(`${regions[index - 1].name} text overlaps ${regions[index].name} text`);
  }
}

function validateDisplayUrl(value, name, fontSize, failures) {
  if (!value) {
    failures.push(`${name}: display URL is required`);
    return;
  }
  if (value.includes("…") || value.includes("...")) failures.push(`${name}: display URL must not be truncated`);
  if (/\s/.test(value)) failures.push(`${name}: display URL must not contain whitespace`);
  if (estimatedWidth(value, fontSize) > 620) failures.push(`${name}: display URL exceeds the safe text region, use the canonical hostname instead of truncation`);
}

function renderArtwork(config, card, width, height) {
  const eyebrow = card.eyebrow || config.eyebrow;
  const tagline = card.tagline || config.tagline;
  const displayUrl = card.displayUrl || config.domain;
  const mark = card.mark || config.mark || "GFL";
  const typography = typographyRules(config);
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${escapeXml(config.colors?.background || "#07110f")}"/>
    <defs>
      <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#ffffff" stroke-opacity=".07"/></pattern>
      <radialGradient id="planet" cx="35%" cy="30%"><stop offset="0" stop-color="${escapeXml(config.colors?.accent || "#d6ff70")}"/><stop offset=".48" stop-color="${escapeXml(config.colors?.secondary || "#83f3c8")}"/><stop offset="1" stop-color="#17372e"/></radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <circle cx="960" cy="315" r="205" fill="none" stroke="#ffffff" stroke-opacity=".18"/>
    <ellipse cx="960" cy="315" rx="278" ry="116" fill="none" stroke="${escapeXml(config.colors?.accent || "#d6ff70")}" stroke-opacity=".42" stroke-width="2" transform="rotate(-14 960 315)"/>
    <circle cx="960" cy="315" r="124" fill="url(#planet)"/>
    <text x="960" y="337" text-anchor="middle" fill="#07110f" font-family="${escapeXml(typography.sansFamily)}" font-size="62" font-weight="900">${escapeXml(mark)}</text>
    <rect x="72" y="70" width="44" height="4" fill="${escapeXml(config.colors?.accent || "#d6ff70")}"/>
    <text x="130" y="82" fill="#dfe8e3" font-family="${escapeXml(typography.sansFamily)}" font-size="${typography.eyebrowSize}" font-weight="700" letter-spacing="2">${escapeXml(eyebrow)}</text>
    <text x="72" y="246" fill="#ffffff" font-family="${escapeXml(typography.sansFamily)}" font-size="${typography.headlineOneSize}" font-weight="800">${escapeXml(card.lineOne)}</text>
    <text x="72" y="332" fill="${escapeXml(config.colors?.accent || "#d6ff70")}" font-family="${escapeXml(typography.accentFamily)}" font-size="${typography.headlineTwoSize}" font-style="italic">${escapeXml(card.lineTwo)}</text>
    <text x="72" y="420" fill="#aebbb5" font-family="${escapeXml(typography.sansFamily)}" font-size="${typography.supportingSize}">${escapeXml(tagline)}</text>
    <text x="72" y="548" fill="#ffffff" font-family="${escapeXml(typography.sansFamily)}" font-size="${typography.destinationSize}" font-weight="700">${escapeXml(displayUrl)}</text>
  </svg>`;
}

const configPath = resolve(option("--config", "open-graph.config.mjs"));
const config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
const root = dirname(configPath);
const outputDirectory = isAbsolute(config.outputDirectory) ? config.outputDirectory : resolve(root, config.outputDirectory || "public");
const stateFile = isAbsolute(config.stateFile || "") ? config.stateFile : resolve(root, config.stateFile || "open-graph-state.json");
const width = config.width || 1200;
const height = config.height || 630;
const regenerate = process.argv.includes("--regenerate");
const failures = [];
const names = new Set();
const previousState = await readFile(stateFile, "utf8").then(JSON.parse).catch(() => null);
const previousCards = new Map((previousState?.cards || []).map((card) => [card.name, card]));
const nextRecords = [];
let generated = 0;
let reused = 0;

if (width !== 1200 || height !== 630) failures.push("Open Graph output must be 1200 by 630 pixels");
if (!Array.isArray(config.cards) || config.cards.length === 0) failures.push("Configuration must define at least one card");
if (!config.templateVersion) failures.push("Configuration must define templateVersion");
if (!config.seoContractVersion) failures.push("Configuration must define seoContractVersion");
validateBrandContract(config, failures);

for (const card of config.cards || []) {
  const name = card.name || card.slug;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name || "")) {
    failures.push(`Invalid card name: ${name || "missing"}`);
    continue;
  }
  if (names.has(name)) {
    failures.push(`Duplicate card name: ${name}`);
    continue;
  }
  names.add(name);

  const eyebrow = card.eyebrow || config.eyebrow;
  const tagline = card.tagline || config.tagline;
  const displayUrl = card.displayUrl || config.domain;
  const typography = typographyRules(config);
  if (!card.purpose) failures.push(`${name}: intended purpose is required for readability review`);
  if (estimatedWidth(card.lineOne, typography.headlineOneSize) > 620) failures.push(`${name}: lineOne exceeds the safe text region`);
  if (estimatedWidth(card.lineTwo, typography.headlineTwoSize) > 620) failures.push(`${name}: lineTwo exceeds the safe text region`);
  if (estimatedWidth(eyebrow, typography.eyebrowSize) > 500) failures.push(`${name}: eyebrow exceeds the safe text region`);
  if (estimatedWidth(tagline, typography.supportingSize) > 620) failures.push(`${name}: tagline exceeds the safe text region`);
  validateDisplayUrl(displayUrl, name, typography.destinationSize, failures);
  if (config.contactInformation?.required) {
    const expectedContact = String(config.contactInformation.value || "");
    if (!expectedContact) failures.push(`${name}: contact information is required but no value is configured`);
    else if (!String(displayUrl).includes(expectedContact)) failures.push(`${name}: required contact information is not visible in the card destination`);
  }
}

if (failures.length > 0) {
  error("Open Graph card contract failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exit(1);
}

if (regenerate) await mkdir(outputDirectory, { recursive: true });

for (const card of config.cards || []) {
  const name = card.name || card.slug;

  const inputSha256 = sha256(JSON.stringify(stableCardInput(config, card, name)));
  const output = resolve(outputDirectory, `og-${name}.png`);
  const existing = await readFile(output).catch(() => null);
  const existingSha256 = existing ? sha256(existing) : null;
  const previous = previousCards.get(name);
  const unchanged = Boolean(existing && previous && previous.inputSha256 === inputSha256 && previous.outputSha256 === existingSha256);

  if (unchanged) {
    nextRecords.push(previous);
    reused += 1;
    continue;
  }

  if (!regenerate) {
    if (!existing || !previous) failures.push(`${name}: approved card state is missing, run the explicit regeneration command`);
    else if (previous.inputSha256 !== inputSha256) failures.push(`${name}: card rendering inputs changed, run the explicit regeneration command and repeat visual approval`);
    else failures.push(`${name}: card bytes do not match recorded state, restore the approved file or run the explicit regeneration command and repeat visual approval`);
    continue;
  }

  const artwork = renderArtwork(config, card, width, height);
  const png = await sharp(Buffer.from(artwork), { density: 192 })
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: true, quality: 92, dither: 0 })
    .toBuffer();
  await writeFile(output, png);
  nextRecords.push({ name, file: `og-${name}.png`, inputSha256, outputSha256: sha256(png) });
  generated += 1;
}

if (previousCards.size !== names.size && !regenerate && previousState) {
  for (const previousName of previousCards.keys()) {
    if (!names.has(previousName)) failures.push(`${previousName}: recorded card is no longer configured, use explicit regeneration after reviewing route removal`);
  }
}

if (failures.length > 0) {
  error("Open Graph card contract failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exitCode = 1;
} else if (regenerate) {
  const state = {
    version: 2,
    templateVersion: String(config.templateVersion),
    seoContractVersion: String(config.seoContractVersion),
    cards: nextRecords.sort((left, right) => left.name.localeCompare(right.name))
  };
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`);
  log(`Open Graph regeneration complete: ${generated} generated, ${reused} unchanged and reused.`);
} else {
  log(`Verified and reused ${reused} approved Open Graph cards without rewriting files.`);
}
