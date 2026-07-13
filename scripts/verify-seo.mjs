import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { URL } from "node:url";
import { error, log } from "node:console";
import process from "node:process";
import sharp from "sharp";
import { hasRel, readIndexablePages, tags, textContent } from "./lib/html.mjs";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const outputDirectory = resolve(option("--dir", "dist"));
const site = new URL(option("--site", "https://example.com"));
const trailingSlash = option("--trailing-slash", "always");
const requireHreflang = option("--require-hreflang", "false") === "true";
const failures = [];
const pages = await readIndexablePages(outputDirectory);
const canonicalPages = new Map();
const imageOwners = new Map();

function meta(html, key, value) {
  return tags(html, "meta").filter((tag) => tag.attributes.get(key)?.toLowerCase() === value.toLowerCase());
}

function expectedUrl(route) {
  return new URL(route.replace(/^\//, ""), site.href.endsWith("/") ? site : new URL(`${site.pathname}/`, site)).href;
}

function validateJsonLd(page) {
  for (const match of page.html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let value;
    try {
      value = JSON.parse(match[1]);
    } catch (cause) {
      failures.push(`${page.name}: JSON-LD is not valid JSON, ${cause.message}`);
      continue;
    }
    const roots = Array.isArray(value) ? value : [value];
    for (const root of roots) {
      if (!root || typeof root !== "object" || Array.isArray(root)) {
        failures.push(`${page.name}: each JSON-LD root must be an object`);
        continue;
      }
      if (!("@context" in root)) failures.push(`${page.name}: JSON-LD root is missing @context`);
      if (!("@type" in root) && !("@graph" in root)) failures.push(`${page.name}: JSON-LD root is missing @type or @graph`);
      if ("@graph" in root && (!Array.isArray(root["@graph"]) || root["@graph"].some((node) => !node || typeof node !== "object" || !("@type" in node)))) {
        failures.push(`${page.name}: every JSON-LD @graph node must be an object with @type`);
      }
    }
  }
}

function validateHeadings(page) {
  const headings = [...page.html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: textContent(match[2])
  }));
  const h1s = headings.filter((heading) => heading.level === 1);
  if (h1s.length !== 1) failures.push(`${page.name}: expected exactly one h1, found ${h1s.length}`);
  if (headings.length > 0 && headings[0].level !== 1) failures.push(`${page.name}: the first heading must be h1`);
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level > headings[index - 1].level + 1) {
      failures.push(`${page.name}: heading level jumps from h${headings[index - 1].level} to h${headings[index].level} at "${headings[index].text}"`);
    }
  }
}

for (const page of pages) {
  const canonicalLinks = tags(page.html, "link").filter((tag) => hasRel(tag, "canonical"));
  if (canonicalLinks.length !== 1) {
    failures.push(`${page.name}: expected exactly one canonical link, found ${canonicalLinks.length}`);
    continue;
  }
  const canonical = canonicalLinks[0].attributes.get("href") || "";
  let canonicalUrl;
  try {
    canonicalUrl = new URL(canonical);
  } catch {
    failures.push(`${page.name}: canonical is not an absolute URL, ${canonical}`);
    continue;
  }
  if (canonicalUrl.origin !== site.origin) failures.push(`${page.name}: canonical uses the wrong origin, ${canonical}`);
  if (canonicalUrl.search || canonicalUrl.hash) failures.push(`${page.name}: canonical contains a query or fragment, ${canonical}`);
  if (canonicalUrl.href !== expectedUrl(page.route)) failures.push(`${page.name}: canonical does not match its built route, expected ${expectedUrl(page.route)}, found ${canonical}`);
  if (trailingSlash === "always" && canonicalUrl.pathname !== "/" && !canonicalUrl.pathname.endsWith("/")) failures.push(`${page.name}: canonical must end in a trailing slash`);
  if (trailingSlash === "never" && canonicalUrl.pathname !== "/" && canonicalUrl.pathname.endsWith("/")) failures.push(`${page.name}: canonical must not end in a trailing slash`);
  if (canonicalPages.has(canonicalUrl.href)) failures.push(`${page.name}: duplicate canonical ${canonicalUrl.href}`);
  canonicalPages.set(canonicalUrl.href, page);

  const titles = [...page.html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => textContent(match[1])).filter(Boolean);
  if (titles.length !== 1) failures.push(`${page.name}: expected exactly one nonempty title, found ${titles.length}`);
  const descriptions = meta(page.html, "name", "description").filter((tag) => (tag.attributes.get("content") || "").trim());
  if (descriptions.length !== 1) failures.push(`${page.name}: expected exactly one nonempty meta description, found ${descriptions.length}`);

  const htmlTag = tags(page.html, "html")[0];
  const language = htmlTag?.attributes.get("lang") || "";
  if (!language) failures.push(`${page.name}: html is missing a lang value`);

  const og = Object.fromEntries(["title", "description", "url", "image", "image:width", "image:height", "image:alt"].map((property) => [
    property,
    meta(page.html, "property", `og:${property}`).map((tag) => tag.attributes.get("content") || "").filter(Boolean)
  ]));
  for (const [property, values] of Object.entries(og)) {
    if (values.length !== 1) failures.push(`${page.name}: expected exactly one nonempty og:${property}, found ${values.length}`);
  }
  if (og.url?.[0] && og.url[0] !== canonicalUrl.href) failures.push(`${page.name}: og:url does not match the canonical`);
  if (og["image:width"]?.[0] !== "1200" || og["image:height"]?.[0] !== "630") failures.push(`${page.name}: Open Graph image dimensions must be 1200 by 630`);
  if (og.image?.[0]) {
    const owner = imageOwners.get(og.image[0]);
    if (owner) failures.push(`${page.name}: Open Graph image is shared with ${owner}, ${og.image[0]}`);
    imageOwners.set(og.image[0], page.name);
  }

  validateJsonLd(page);
  validateHeadings(page);

  const alternates = tags(page.html, "link").filter((tag) => hasRel(tag, "alternate") && tag.attributes.has("hreflang"));
  if (requireHreflang && alternates.length === 0) failures.push(`${page.name}: localized build requires hreflang links`);
  if (alternates.length > 0) {
    const languages = new Set();
    for (const alternate of alternates) {
      const hreflang = (alternate.attributes.get("hreflang") || "").toLowerCase();
      const href = alternate.attributes.get("href") || "";
      if (!/^x-default$|^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(hreflang)) failures.push(`${page.name}: invalid hreflang value ${hreflang}`);
      if (languages.has(hreflang)) failures.push(`${page.name}: duplicate hreflang value ${hreflang}`);
      languages.add(hreflang);
      try {
        new URL(href);
      } catch {
        failures.push(`${page.name}: hreflang URL is not absolute, ${href}`);
      }
    }
    if (!languages.has("x-default")) failures.push(`${page.name}: hreflang cluster is missing x-default`);
    if (language && !languages.has(language.toLowerCase())) failures.push(`${page.name}: hreflang cluster has no self language matching html lang ${language}`);
  }
}

for (const [canonical, page] of canonicalPages) {
  const cluster = tags(page.html, "link")
    .filter((tag) => hasRel(tag, "alternate") && tag.attributes.has("hreflang"))
    .map((tag) => `${(tag.attributes.get("hreflang") || "").toLowerCase()}=${tag.attributes.get("href") || ""}`)
    .sort();
  for (const entry of cluster) {
    const href = entry.slice(entry.indexOf("=") + 1);
    const target = canonicalPages.get(href);
    if (!target) {
      failures.push(`${page.name}: hreflang target has no indexable built page, ${href}`);
      continue;
    }
    const reciprocal = tags(target.html, "link")
      .filter((tag) => hasRel(tag, "alternate") && tag.attributes.has("hreflang"))
      .map((tag) => `${(tag.attributes.get("hreflang") || "").toLowerCase()}=${tag.attributes.get("href") || ""}`)
      .sort();
    if (JSON.stringify(cluster) !== JSON.stringify(reciprocal)) failures.push(`${page.name}: hreflang cluster is not reciprocal with ${target.name}`);
  }

  const image = meta(page.html, "property", "og:image")[0]?.attributes.get("content");
  if (image) {
    const imageUrl = new URL(image);
    if (imageUrl.origin === site.origin) {
      const path = resolve(outputDirectory, `.${decodeURIComponent(imageUrl.pathname)}`);
      const metadata = await sharp(await readFile(path)).metadata().catch(() => null);
      if (!metadata) failures.push(`${page.name}: local Open Graph image is missing or unreadable, ${imageUrl.pathname}`);
      if (metadata && (metadata.width !== 1200 || metadata.height !== 630)) failures.push(`${page.name}: local Open Graph image is not 1200 by 630, ${imageUrl.pathname}`);
    }
  }
  if (!canonical) failures.push(`${page.name}: canonical could not be validated`);
}

if (failures.length > 0) {
  error("SEO verification failed:");
  for (const failure of [...new Set(failures)]) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`SEO verification passed: ${pages.length} indexable pages have valid canonicals, headings, JSON-LD, social metadata, and localization metadata.`);
}
