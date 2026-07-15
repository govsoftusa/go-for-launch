import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { error, log } from "node:console";
import process from "node:process";
import sharp from "sharp";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function absolute(root, value) {
  return isAbsolute(value) ? value : resolve(root, value);
}

const configPath = resolve(option("--config", "brand-assets.config.mjs"));
const config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
const root = dirname(configPath);
const failures = [];
const assets = new Map();

if (!config.brandGuide?.file || !config.brandGuide?.sha256) {
  failures.push("Brand guide file and SHA-256 are required");
} else {
  const guide = await readFile(absolute(root, config.brandGuide.file)).catch(() => null);
  if (!guide) failures.push(`Brand guide is missing: ${config.brandGuide.file}`);
  else if (sha256(guide) !== config.brandGuide.sha256) failures.push(`Brand guide hash changed: ${config.brandGuide.file}`);
}

for (const asset of config.assets || []) {
  if (!asset.id || assets.has(asset.id)) {
    failures.push(`Brand asset id is missing or duplicated: ${asset.id || "missing"}`);
    continue;
  }
  if (!asset.file || !asset.sha256 || !asset.variant) {
    failures.push(`${asset.id}: file, SHA-256, and named variant are required`);
    continue;
  }
  if (!Array.isArray(asset.allowedSurfaces) || asset.allowedSurfaces.length === 0) failures.push(`${asset.id}: allowedSurfaces is required`);
  if (!Number.isFinite(asset.minimumClearSpaceRatio) || asset.minimumClearSpaceRatio < 0) failures.push(`${asset.id}: minimumClearSpaceRatio is required`);

  const file = absolute(root, asset.file);
  const bytes = await readFile(file).catch(() => null);
  if (!bytes) {
    failures.push(`${asset.id}: approved brand asset is missing, ${asset.file}`);
    continue;
  }
  if (sha256(bytes) !== asset.sha256) failures.push(`${asset.id}: approved brand asset hash changed`);
  const metadata = await sharp(bytes).metadata().catch(() => null);
  if (!metadata?.width || !metadata?.height) failures.push(`${asset.id}: intrinsic dimensions are unreadable`);
  assets.set(asset.id, { ...asset, metadata });
}

if (!Array.isArray(config.usages) || config.usages.length === 0) failures.push("At least one brand asset usage is required");

for (const usage of config.usages || []) {
  const asset = assets.get(usage.assetId);
  if (!asset) {
    failures.push(`${usage.context || "Unknown context"}: approved asset is missing from the manifest`);
    continue;
  }
  if (!usage.context) failures.push(`${asset.id}: usage context is required`);
  if (!asset.allowedSurfaces.includes(usage.surface)) failures.push(`${usage.context}: ${asset.variant} is not approved for the ${usage.surface} surface`);
  if (!Number.isFinite(usage.renderedWidth) || !Number.isFinite(usage.renderedHeight) || usage.renderedWidth <= 0 || usage.renderedHeight <= 0) {
    failures.push(`${usage.context}: positive rendered dimensions are required`);
    continue;
  }

  const intrinsicRatio = asset.metadata.width / asset.metadata.height;
  const renderedRatio = usage.renderedWidth / usage.renderedHeight;
  if (Math.abs(intrinsicRatio - renderedRatio) / intrinsicRatio > 0.01) failures.push(`${usage.context}: brand asset is stretched or distorted`);
  if (asset.minimumRenderedWidth && usage.renderedWidth < asset.minimumRenderedWidth) failures.push(`${usage.context}: brand asset is below its minimum rendered width`);

  const requiredClearSpace = Math.min(usage.renderedWidth, usage.renderedHeight) * asset.minimumClearSpaceRatio;
  for (const side of ["top", "right", "bottom", "left"]) {
    if (!Number.isFinite(usage.clearSpace?.[side]) || usage.clearSpace[side] < requiredClearSpace) {
      failures.push(`${usage.context}: ${side} clear space is below ${requiredClearSpace.toFixed(1)} pixels`);
    }
  }
}

if (failures.length) {
  error("Brand asset provenance verification failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`Verified ${assets.size} approved brand assets across ${config.usages.length} usage contexts.`);
}
