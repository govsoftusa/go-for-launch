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

const configPath = resolve(option("--config", "open-graph.config.mjs"));
const config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
const root = dirname(configPath);
const outputDirectory = isAbsolute(config.outputDirectory) ? config.outputDirectory : resolve(root, config.outputDirectory || "public");
const width = config.width || 1200;
const height = config.height || 630;
const checkOnly = process.argv.includes("--check");
const failures = [];
const names = new Set();

if (width !== 1200 || height !== 630) failures.push("Open Graph output must be 1200 by 630 pixels");
if (!Array.isArray(config.cards) || config.cards.length === 0) failures.push("Configuration must define at least one card");

await mkdir(outputDirectory, { recursive: true });

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

  const artwork = `
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
    <text x="960" y="337" text-anchor="middle" fill="#07110f" font-family="Arial, sans-serif" font-size="62" font-weight="900" letter-spacing="-5">${escapeXml(config.mark || "GFL")}</text>
    <rect x="72" y="70" width="44" height="4" fill="${escapeXml(config.colors?.accent || "#d6ff70")}"/>
    <text x="130" y="82" fill="#dfe8e3" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">${escapeXml(config.eyebrow)}</text>
    <text x="72" y="246" fill="#ffffff" font-family="Arial, sans-serif" font-size="76" font-weight="800" letter-spacing="-5">${escapeXml(card.lineOne)}</text>
    <text x="72" y="332" fill="${escapeXml(config.colors?.accent || "#d6ff70")}" font-family="Georgia, serif" font-size="74" font-style="italic" letter-spacing="-4">${escapeXml(card.lineTwo)}</text>
    <text x="72" y="420" fill="#aebbb5" font-family="Arial, sans-serif" font-size="24">${escapeXml(config.tagline)}</text>
    <text x="72" y="548" fill="#ffffff" font-family="Arial, sans-serif" font-size="23" font-weight="700">${escapeXml(config.domain)}</text>
  </svg>`;
  const png = await sharp(Buffer.from(artwork)).png({ compressionLevel: 9 }).toBuffer();
  const output = resolve(outputDirectory, `og-${name}.png`);
  if (checkOnly) {
    const existing = await readFile(output).catch(() => null);
    if (!existing || !existing.equals(png)) failures.push(`Generated Open Graph image is missing or stale: ${output}`);
  } else {
    await writeFile(output, png);
  }
}

if (failures.length > 0) {
  error("Open Graph generation failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`${checkOnly ? "Verified" : "Generated"} ${names.size} deterministic Open Graph images at 1200 by 630 pixels.`);
}
