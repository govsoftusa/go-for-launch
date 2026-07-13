import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { error, log } from "node:console";
import process from "node:process";
import { URL } from "node:url";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const outputDirectory = resolve(option("--dir", "dist"));
const site = new URL(option("--site", "https://example.com"));
const sitemapName = option("--sitemap", "sitemap.xml");
const failures = [];

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
}

function safeOutputPath(url) {
  const path = resolve(outputDirectory, `.${decodeURIComponent(url.pathname)}`);
  const relation = relative(outputDirectory, path);
  if (relation.startsWith(`..${sep}`) || relation === "..") {
    throw new Error(`Sitemap child escapes the build directory: ${url.href}`);
  }
  return path;
}

async function collectSitemapUrls(path, visited = new Set()) {
  if (visited.has(path)) {
    throw new Error(`Recursive sitemap reference: ${path}`);
  }
  visited.add(path);

  const xml = await readFile(path, "utf8").catch(() => "");
  if (!xml) {
    throw new Error(`Missing sitemap file: ${relative(outputDirectory, path)}`);
  }

  const entries = locs(xml);
  if (entries.length === 0) {
    throw new Error(`Sitemap has no loc entries: ${relative(outputDirectory, path)}`);
  }

  if (/<sitemapindex\b/i.test(xml)) {
    const urls = [];
    for (const entry of entries) {
      const child = new URL(entry);
      if (child.origin !== site.origin) {
        throw new Error(`Sitemap index uses the wrong origin: ${entry}`);
      }
      urls.push(...(await collectSitemapUrls(safeOutputPath(child), visited)));
    }
    return urls;
  }

  if (!/<urlset\b/i.test(xml)) {
    throw new Error(`Unsupported sitemap root: ${relative(outputDirectory, path)}`);
  }

  return entries;
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function canonicalFromHtml(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "rel").split(/\s+/).includes("canonical")) return attribute(tag, "href");
  }
  return "";
}

function isNoIndex(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "name").toLowerCase() === "robots" && /(?:^|,)\s*noindex\b/i.test(attribute(tag, "content"))) return true;
  }
  return false;
}

let sitemapUrls = [];
try {
  sitemapUrls = await collectSitemapUrls(resolve(outputDirectory, sitemapName));
} catch (error) {
  failures.push(error.message);
}

const normalizedSitemapUrls = [];
for (const entry of sitemapUrls) {
  try {
    const url = new URL(entry);
    if (url.origin !== site.origin) failures.push(`Sitemap URL uses the wrong origin: ${entry}`);
    if (url.search || url.hash) failures.push(`Sitemap URL contains a query or fragment: ${entry}`);
    normalizedSitemapUrls.push(url.href);
  } catch {
    failures.push(`Sitemap URL is not absolute: ${entry}`);
  }
}

const duplicates = normalizedSitemapUrls.filter((entry, index) => normalizedSitemapUrls.indexOf(entry) !== index);
for (const duplicate of new Set(duplicates)) failures.push(`Duplicate sitemap URL: ${duplicate}`);

const builtCanonicals = [];
for (const path of await htmlFiles(outputDirectory)) {
  const name = relative(outputDirectory, path);
  if (/^(?:404|500)\.html$/i.test(name)) continue;
  const html = await readFile(path, "utf8");
  if (isNoIndex(html)) continue;
  const canonical = canonicalFromHtml(html);
  if (!canonical) {
    failures.push(`Indexable HTML has no canonical link: ${name}`);
    continue;
  }
  try {
    const url = new URL(canonical);
    if (url.origin !== site.origin) failures.push(`Canonical uses the wrong origin in ${name}: ${canonical}`);
    builtCanonicals.push(url.href);
  } catch {
    failures.push(`Canonical is not absolute in ${name}: ${canonical}`);
  }
}

const sitemapSet = new Set(normalizedSitemapUrls);
const canonicalSet = new Set(builtCanonicals);
for (const canonical of canonicalSet) {
  if (!sitemapSet.has(canonical)) failures.push(`Built page is missing from the sitemap: ${canonical}`);
}
for (const entry of sitemapSet) {
  if (!canonicalSet.has(entry)) failures.push(`Sitemap URL has no indexable built page: ${entry}`);
}

const sitemapUrl = new URL(sitemapName, site).href;
const robots = await readFile(resolve(outputDirectory, "robots.txt"), "utf8").catch(() => "");
if (!robots) failures.push("Missing dist/robots.txt.");
if (robots && !robots.split(/\r?\n/).some((line) => line.trim() === `Sitemap: ${sitemapUrl}`)) {
  failures.push(`robots.txt does not advertise the exact sitemap URL: ${sitemapUrl}`);
}

if (failures.length > 0) {
  error("Sitemap verification failed:");
  for (const failure of failures) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`Sitemap verification passed: ${canonicalSet.size} indexable pages match ${sitemapName}.`);
}
