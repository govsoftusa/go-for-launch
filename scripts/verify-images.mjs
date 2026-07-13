import { resolve } from "node:path";
import { error, log } from "node:console";
import process from "node:process";
import { readIndexablePages, tags } from "./lib/html.mjs";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const outputDirectory = resolve(option("--dir", "dist"));
const failures = [];
const pages = await readIndexablePages(outputDirectory);

for (const page of pages) {
  for (const image of tags(page.html, "img")) {
    const width = Number(image.attributes.get("width"));
    const height = Number(image.attributes.get("height"));
    if (!image.attributes.has("alt")) failures.push(`${page.name}: image is missing alt`);
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) failures.push(`${page.name}: image is missing positive intrinsic width and height`);
    const layout = image.attributes.get("data-astro-image");
    if ((layout === "constrained" || layout === "full-width") && !image.attributes.get("srcset")) failures.push(`${page.name}: responsive Astro image is missing srcset`);
    if ((layout === "constrained" || layout === "full-width") && !image.attributes.get("sizes")) failures.push(`${page.name}: responsive Astro image is missing sizes`);
  }

  for (const match of page.html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)) {
    if (tags(match[1], "source").length === 0) failures.push(`${page.name}: picture has no source elements`);
    if (tags(match[1], "img").length !== 1) failures.push(`${page.name}: picture must contain exactly one fallback image`);
  }
}

if (failures.length > 0) {
  error("Image verification failed:");
  for (const failure of [...new Set(failures)]) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`Image verification passed: ${pages.length} indexable pages have stable image dimensions and valid responsive output.`);
}
