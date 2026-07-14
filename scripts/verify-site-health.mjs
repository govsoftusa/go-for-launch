import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { error, log } from "node:console";
import process from "node:process";
import { load } from "cheerio";
import { collectHtmlFiles, isNoIndex, routeFromHtmlFile } from "./lib/html.mjs";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function loadConfig(path) {
  if (!path) return {};
  const absolute = resolve(path);
  if (absolute.endsWith(".json")) return JSON.parse(await readFile(absolute, "utf8"));
  return (await import(`${pathToFileURL(absolute).href}?v=${Date.now()}`)).default;
}

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path, extension)));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) files.push(path);
  }
  return files;
}

function booleanOption(name, fallback) {
  return option(name, String(fallback)) === "true";
}

function numberOption(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a nonnegative number`);
  return value;
}

function normalizeRoute(pathname, trailingSlash) {
  let value = decodeURIComponent(pathname).replace(/\/+/g, "/");
  if (!value.startsWith("/")) value = `/${value}`;
  if (value === "/") return value;
  if (extname(value)) return value;
  if (trailingSlash === "always") return value.endsWith("/") ? value : `${value}/`;
  if (trailingSlash === "never") return value.replace(/\/$/, "");
  return value;
}

function isPagePath(pathname) {
  const extension = extname(decodeURIComponent(pathname)).toLowerCase();
  return !pathname.startsWith("/api/") && (!extension || extension === ".html");
}

function srcsetCandidates(value) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/i, ""))
    .filter(Boolean);
}

function cssUrls(value) {
  return [...value.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)]
    .map((match) => match[2].trim())
    .filter((candidate) => candidate && !candidate.startsWith("data:"));
}

function matchesAllowlist(pathname, allowlist) {
  return allowlist.some((entry) => entry === pathname || (entry.endsWith("*") && pathname.startsWith(entry.slice(0, -1))));
}

const fileConfig = await loadConfig(option("--config", ""));
const outputDirectory = resolve(option("--dir", fileConfig.outputDirectory || "dist"));
const site = new URL(option("--site", fileConfig.site || "https://example.com"));
const output = resolve(option("--output", fileConfig.output || "artifacts/site-health-report.json"));
const trailingSlash = option("--trailing-slash", fileConfig.trailingSlash || "always");
const maximumImageBytes = numberOption("--maximum-image-bytes", fileConfig.maximumImageBytes ?? 100_000);
const maximumTitleLength = numberOption("--maximum-title-length", fileConfig.maximumTitleLength ?? 60);
const minimumDescriptionLength = numberOption("--minimum-description-length", fileConfig.minimumDescriptionLength ?? 110);
const maximumDescriptionLength = numberOption("--maximum-description-length", fileConfig.maximumDescriptionLength ?? 155);
const requireIncomingLinks = booleanOption("--require-incoming-links", fileConfig.requireIncomingLinks ?? true);
const requireUniqueTitles = booleanOption("--require-unique-titles", fileConfig.requireUniqueTitles ?? true);
const requireUniqueDescriptions = booleanOption("--require-unique-descriptions", fileConfig.requireUniqueDescriptions ?? true);
const requireRobots = booleanOption("--require-robots", fileConfig.requireRobots ?? true);
const sitemapUrl = new URL(option("--sitemap-url", fileConfig.sitemapUrl || `${site.origin}/sitemap.xml`));
const orphanAllowlist = fileConfig.orphanAllowlist || [];
const largeImageAllowlist = fileConfig.largeImageAllowlist || [];
const configuredRedirectRoutes = fileConfig.redirectRoutes || [];
const imageExtensions = new Set((fileConfig.imageExtensions || [".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]).map((value) => value.toLowerCase()));
const failures = [];
const imageReferences = new Map();
const pages = new Map();

function recordImage(candidate, baseUrl, owner) {
  let url;
  try {
    url = new URL(candidate, baseUrl);
  } catch {
    failures.push(`${owner}: invalid image URL ${candidate}`);
    return;
  }
  if (url.origin !== site.origin || !imageExtensions.has(extname(url.pathname).toLowerCase())) return;
  const owners = imageReferences.get(url.pathname) || new Set();
  owners.add(owner);
  imageReferences.set(url.pathname, owners);
}

for (const file of await collectHtmlFiles(outputDirectory)) {
  const route = routeFromHtmlFile(outputDirectory, file);
  const html = await readFile(file, "utf8");
  const document = load(html);
  const isRedirect = document('meta[http-equiv="refresh" i]').length > 0;
  const links = [];

  for (const element of document("a[href]")) {
    const href = document(element).attr("href") || "";
    let url;
    try {
      url = new URL(href, new URL(route, site));
    } catch {
      failures.push(`${route}: invalid link ${href}`);
      continue;
    }
    if (url.origin === site.origin) links.push({ href, url });
  }

  for (const element of document("img[src], meta[property='og:image'], meta[name='twitter:image']")) {
    const candidate = document(element).attr("src") || document(element).attr("content");
    if (candidate) recordImage(candidate, new URL(route, site), route);
  }
  for (const element of document("img[srcset], source[srcset]")) {
    for (const candidate of srcsetCandidates(document(element).attr("srcset") || "")) recordImage(candidate, new URL(route, site), route);
  }
  for (const candidate of cssUrls(html)) recordImage(candidate, new URL(route, site), route);

  pages.set(route, {
    route,
    html,
    isRedirect,
    isIndexable: !isRedirect && !isNoIndex(html),
    title: document("title").first().text().trim(),
    description: (document('meta[name="description" i]').first().attr("content") || "").trim(),
    canonical: document('link[rel="canonical" i]').first().attr("href") || "",
    links
  });
}

for (const cssFile of await collectFiles(outputDirectory, ".css")) {
  const publicPath = `/${relative(outputDirectory, cssFile).split(sep).join("/")}`;
  const css = await readFile(cssFile, "utf8");
  for (const candidate of cssUrls(css)) recordImage(candidate, new URL(publicPath, site), publicPath);
}

const redirectRoutes = new Set(configuredRedirectRoutes);
for (const page of pages.values()) if (page.isRedirect) redirectRoutes.add(page.route);
const redirectsFile = resolve(outputDirectory, "_redirects");
if (existsSync(redirectsFile)) {
  const redirects = await readFile(redirectsFile, "utf8");
  for (const line of redirects.split(/\r?\n/)) {
    const source = line.trim().split(/\s+/)[0];
    if (source?.startsWith("/") && !source.includes("*")) redirectRoutes.add(source);
  }
}

const indexablePages = [...pages.values()].filter((page) => page.isIndexable);
const incoming = new Map(indexablePages.map((page) => [page.route, new Set()]));
const titleOwners = new Map();
const descriptionOwners = new Map();

for (const page of indexablePages) {
  if (page.title.length > maximumTitleLength) failures.push(`${page.route}: title is ${page.title.length} characters, maximum is ${maximumTitleLength}`);
  if (page.description.length < minimumDescriptionLength) failures.push(`${page.route}: meta description is ${page.description.length} characters, minimum is ${minimumDescriptionLength}`);
  if (page.description.length > maximumDescriptionLength) failures.push(`${page.route}: meta description is ${page.description.length} characters, maximum is ${maximumDescriptionLength}`);

  if (requireUniqueTitles && page.title) {
    const owner = titleOwners.get(page.title);
    if (owner) failures.push(`${page.route}: title duplicates ${owner}`);
    else titleOwners.set(page.title, page.route);
  }
  if (requireUniqueDescriptions && page.description) {
    const owner = descriptionOwners.get(page.description);
    if (owner) failures.push(`${page.route}: meta description duplicates ${owner}`);
    else descriptionOwners.set(page.description, page.route);
  }

  let canonical;
  try {
    canonical = new URL(page.canonical);
  } catch {
    failures.push(`${page.route}: canonical is missing or invalid`);
  }
  if (canonical && canonical.href !== new URL(page.route, site).href) failures.push(`${page.route}: canonical does not match the built route`);

  for (const { href, url } of page.links) {
    if (!isPagePath(url.pathname)) continue;
    const directRoute = decodeURIComponent(url.pathname);
    const targetRoute = normalizeRoute(url.pathname, trailingSlash);
    if (redirectRoutes.has(directRoute) || redirectRoutes.has(targetRoute)) failures.push(`${page.route}: internal link targets a redirect, ${href}`);
    if (directRoute !== targetRoute && pages.has(targetRoute)) failures.push(`${page.route}: internal link uses a redirecting URL, ${href}`);
    if (!pages.has(targetRoute)) failures.push(`${page.route}: internal page link is not built, ${href}`);
    if (incoming.has(targetRoute) && targetRoute !== page.route) incoming.get(targetRoute).add(page.route);
  }
}

if (requireIncomingLinks) {
  for (const [route, owners] of incoming) {
    if (route !== "/" && owners.size === 0 && !orphanAllowlist.includes(route)) failures.push(`${route}: indexable canonical page has no incoming internal links`);
  }
}

for (const [pathname, owners] of imageReferences) {
  const decoded = decodeURIComponent(pathname);
  const localPath = resolve(outputDirectory, `.${decoded}`);
  if (!localPath.startsWith(`${outputDirectory}${sep}`) && localPath !== outputDirectory) {
    failures.push(`${[...owners].join(", ")}: local image path escapes the build directory, ${pathname}`);
    continue;
  }
  if (!existsSync(localPath)) {
    failures.push(`${[...owners].join(", ")}: referenced local image is not built, ${pathname}`);
    continue;
  }
  const file = await stat(localPath);
  if (file.size > maximumImageBytes && !matchesAllowlist(pathname, largeImageAllowlist)) {
    failures.push(`${[...owners].join(", ")}: image exceeds ${maximumImageBytes} bytes, ${pathname} is ${file.size} bytes`);
  }
}

const robotsPath = resolve(outputDirectory, "robots.txt");
if (requireRobots && !existsSync(robotsPath)) {
  failures.push("robots.txt is missing from the built output");
} else if (requireRobots) {
  const robots = await readFile(robotsPath, "utf8");
  if (!/^\s*User-agent\s*:/im.test(robots)) failures.push("robots.txt has no User-agent directive");
  const sitemapLines = [...robots.matchAll(/^\s*Sitemap\s*:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  if (!sitemapLines.includes(sitemapUrl.href)) failures.push(`robots.txt does not advertise ${sitemapUrl.href}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  site: site.origin,
  thresholds: {
    maximumImageBytes,
    maximumTitleLength,
    minimumDescriptionLength,
    maximumDescriptionLength
  },
  counts: {
    htmlPages: pages.size,
    indexablePages: indexablePages.length,
    redirectRoutes: redirectRoutes.size,
    referencedLocalImages: imageReferences.size,
    errors: [...new Set(failures)].length
  },
  errors: [...new Set(failures)]
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

if (report.errors.length > 0) {
  error("Site health verification failed:");
  for (const failure of report.errors) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`Site health verification passed: ${indexablePages.length} indexable pages, ${imageReferences.size} local image references, and no audit findings.`);
}
