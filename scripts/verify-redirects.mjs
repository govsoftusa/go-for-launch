import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL, URL } from "node:url";
import { error, log } from "node:console";
import process from "node:process";

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

function decodeXml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
}

async function sitemapPages(url, visited = new Set()) {
  if (visited.has(url.href)) throw new Error(`Recursive sitemap reference: ${url.href}`);
  visited.add(url.href);
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "GoForLaunch-RedirectVerifier/1.0" } });
  if (response.status !== 200) throw new Error(`Sitemap did not return HTTP 200: ${url.href}, found ${response.status}`);
  const xml = await response.text();
  if (!/(?:application|text)\/[^;]*xml/i.test(response.headers.get("content-type") || "")) throw new Error(`Sitemap did not return an XML content type: ${url.href}`);
  const entries = locs(xml);
  if (/<sitemapindex\b/i.test(xml)) {
    const pages = [];
    for (const entry of entries) pages.push(...(await sitemapPages(new URL(entry), visited)));
    return pages;
  }
  if (!/<urlset\b/i.test(xml)) throw new Error(`Unsupported sitemap root: ${url.href}`);
  return entries.map((entry) => new URL(entry));
}

function withProbe(url) {
  const probe = new URL(url);
  probe.searchParams.set("gfl_redirect_probe", "1");
  return probe;
}

async function expectRedirect(source, destination, failures) {
  let response;
  try {
    response = await fetch(source, { redirect: "manual", headers: { "user-agent": "GoForLaunch-RedirectVerifier/1.0" } });
  } catch (cause) {
    failures.push(`${source.href}: request failed, ${cause.message}`);
    return;
  }
  if (![301, 308].includes(response.status)) {
    failures.push(`${source.href}: expected HTTP 301 or 308, found ${response.status}`);
    return;
  }
  const location = response.headers.get("location");
  if (!location) {
    failures.push(`${source.href}: redirect has no Location header`);
    return;
  }
  const resolved = new URL(location, source);
  if (resolved.href !== destination.href) failures.push(`${source.href}: expected redirect to ${destination.href}, found ${resolved.href}`);
}

const fileConfig = await loadConfig(option("--config", ""));
const canonicalOrigin = new URL(option("--canonical-origin", fileConfig.canonicalOrigin || "https://www.example.com")).origin;
const sitemapUrl = new URL(option("--sitemap-url", fileConfig.sitemapUrl || `${canonicalOrigin}/sitemap.xml`));
const trailingSlash = option("--trailing-slash", fileConfig.trailingSlash || "always");
const alternateOrigins = (option("--alternate-origins", "") || "").split(",").filter(Boolean).length > 0
  ? option("--alternate-origins", "").split(",").filter(Boolean)
  : fileConfig.alternateOrigins || [];
const failures = [];
let pages = [];

try {
  pages = await sitemapPages(sitemapUrl);
} catch (cause) {
  failures.push(cause.message);
}

for (const page of pages) {
  if (page.origin !== canonicalOrigin) {
    failures.push(`Sitemap URL uses the wrong canonical origin: ${page.href}`);
    continue;
  }
  if (page.search || page.hash) failures.push(`Sitemap URL contains a query or fragment: ${page.href}`);

  try {
    const response = await fetch(page, { redirect: "manual", headers: { "user-agent": "GoForLaunch-RedirectVerifier/1.0" } });
    if (response.status < 200 || response.status >= 300) failures.push(`${page.href}: canonical URL did not return a direct success response, found ${response.status}`);
  } catch (cause) {
    failures.push(`${page.href}: canonical request failed, ${cause.message}`);
  }

  if (page.pathname !== "/") {
    const opposite = new URL(page);
    opposite.pathname = trailingSlash === "always" ? page.pathname.replace(/\/$/, "") : `${page.pathname}/`;
    await expectRedirect(withProbe(opposite), withProbe(page), failures);
  }

  for (const alternateOrigin of alternateOrigins) {
    const source = withProbe(new URL(`${page.pathname}${page.search}`, new URL(alternateOrigin).origin));
    await expectRedirect(source, withProbe(page), failures);
  }
}

for (const probe of fileConfig.probes || []) {
  await expectRedirect(new URL(probe.source), new URL(probe.destination), failures);
}

if (failures.length > 0) {
  error("Redirect verification failed:");
  for (const failure of [...new Set(failures)]) error(`- ${failure}`);
  process.exitCode = 1;
} else {
  log(`Redirect verification passed: ${pages.length} sitemap routes use the ${trailingSlash} trailing-slash policy and ${alternateOrigins.length} alternate origins redirect in one permanent hop.`);
}
