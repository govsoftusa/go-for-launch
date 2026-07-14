import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const verifier = new URL("./verify-site-health.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-site-health-"));
const site = "https://www.example.com";
const description = "This page gives visitors a clear and specific summary of the public information, services, and next steps available here.";

function html({ route, title, body, pageDescription = description, canonical = `${site}${route}`, robots = "" }) {
  return `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${pageDescription}">${robots}<link rel="canonical" href="${canonical}"></head><body>${body}</body></html>`;
}

async function page(directory, route, content) {
  const path = route === "/" ? join(directory, "index.html") : join(directory, route, "index.html");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function fixture(name) {
  const directory = join(root, name);
  await mkdir(join(directory, "assets"), { recursive: true });
  return directory;
}

function verify(directory, output) {
  return spawnSync(process.execPath, [
    verifier.pathname,
    `--dir=${directory}`,
    `--site=${site}`,
    `--output=${output}`,
    "--trailing-slash=always"
  ], { encoding: "utf8" });
}

const valid = await fixture("valid");
await writeFile(join(valid, "assets", "content.webp"), Buffer.alloc(1_000));
await writeFile(join(valid, "assets", "background.webp"), Buffer.alloc(1_000));
await writeFile(join(valid, "styles.css"), ".hero { background-image: url('/assets/background.webp'); }");
await writeFile(join(valid, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
await page(valid, "/", html({
  route: "/",
  title: "Example Public Information",
  body: '<h1>Home</h1><a href="/about/">About</a><img src="/assets/content.webp" alt="Public information" width="800" height="450">'
}));
await page(valid, "/about/", html({
  route: "/about/",
  title: "About the Example Service",
  pageDescription: "Learn how this example service provides dependable public information, accessible digital tools, and clear ways to contact the responsible team.",
  body: '<h1>About</h1><a href="/">Home</a>'
}));
const validOutput = join(root, "valid-report.json");
const validResult = verify(valid, validOutput);
if (validResult.status !== 0) throw new Error(`Valid site-health fixture failed:\n${validResult.stdout}${validResult.stderr}`);
const validReport = JSON.parse(await readFile(validOutput, "utf8"));
if (validReport.counts.errors !== 0 || validReport.counts.indexablePages !== 2) throw new Error("Valid site-health report has incorrect counts.");

const invalid = await fixture("invalid");
await writeFile(join(invalid, "assets", "large.png"), Buffer.alloc(100_001));
await writeFile(join(invalid, "robots.txt"), `User-agent: *\nSitemap: ${site}/wrong.xml\n`);
await page(invalid, "/", html({
  route: "/",
  title: "This title is intentionally much too long for a reliable search result presentation and must fail",
  pageDescription: "Too short",
  body: '<h1>Home</h1><a href="/legacy/">Legacy</a><a href="/missing/">Missing</a><img src="/assets/large.png" alt="Large">'
}));
await page(invalid, "/about/", html({
  route: "/about/",
  title: "Duplicate",
  body: "<h1>About</h1>"
}));
await page(invalid, "/contact/", html({
  route: "/contact/",
  title: "Duplicate",
  body: "<h1>Contact</h1>"
}));
await page(invalid, "/legacy/", '<!doctype html><html><head><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/about/"></head></html>');
const invalidOutput = join(root, "invalid-report.json");
const invalidResult = verify(invalid, invalidOutput);
const combined = `${invalidResult.stdout}${invalidResult.stderr}`;
for (const expected of [
  "title is",
  "meta description is 9 characters",
  "internal link targets a redirect",
  "internal page link is not built",
  "has no incoming internal links",
  "image exceeds 100000 bytes",
  "robots.txt does not advertise",
  "title duplicates"
]) {
  if (invalidResult.status === 0 || !combined.includes(expected)) throw new Error(`Invalid site-health fixture did not report: ${expected}`);
}
const invalidReport = JSON.parse(await readFile(invalidOutput, "utf8"));
if (invalidReport.counts.errors < 8) throw new Error("Invalid site-health report did not preserve all expected failures.");

await rm(root, { recursive: true, force: true });
log("Site health verifier tests passed.");
