import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";
import { once } from "node:events";

const verifier = new URL("./verify-semantic-seo.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-semantic-seo-"));
const site = "https://www.example.com";
const sourceServer = spawn(process.execPath, ["-e", `
  const http = require("node:http");
  const server = http.createServer((request, response) => {
    if (request.url === "/research") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end("<!doctype html><title>Federal Public Service Technology Research</title><meta name=description content='Agency performance and measurable outcomes'><main><h1>Public service technology evidence</h1><p>The study documents agency performance, transparent methods, and measurable outcomes.</p></main>");
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  server.listen(0, "127.0.0.1", () => process.stdout.write(String(server.address().port) + "\\n"));
`], { stdio: ["ignore", "pipe", "inherit"] });
const [portOutput] = await once(sourceServer.stdout, "data");
const sourceUrl = `http://127.0.0.1:${String(portOutput).trim()}/research`;
process.on("exit", () => sourceServer.kill());

function html({ route, title, h1, body, canonical = `${site}${route}` }) {
  return `<!doctype html><html lang="en"><head><title>${title}</title><link rel="canonical" href="${canonical}"></head><body><main><article><h1>${h1}</h1>${body}</article></main></body></html>`;
}

async function page(directory, route, content) {
  const path = join(directory, route, "index.html");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

function run(config) {
  return spawnSync(process.execPath, [verifier.pathname, `--config=${config}`], { encoding: "utf8" });
}

const valid = join(root, "valid");
await page(valid, "articles/service-guide", html({
  route: "/articles/service-guide/",
  title: "Public Service Technology Guide",
  h1: "Public Service Technology Guide",
  body: `<p>This public service technology guide explains how agencies evaluate secure systems, accessible delivery, operational reliability, and measurable outcomes for residents.</p><p>A reviewed federal study documents public service technology performance in comparable programs through transparent methods and published findings. See the <a href="${sourceUrl}">federal public service technology study</a>.</p>`
}));
const validReport = join(root, "valid-report.json");
const validConfig = join(root, "valid-config.json");
await writeFile(validConfig, JSON.stringify({
  outputDirectory: valid,
  site,
  output: validReport,
  requirePageRule: true,
  title: { minimumCharacters: 30, maximumCharacters: 60, minimumWords: 4, minimumH1Overlap: 2, minimumContentOverlap: 3, maximumRepeatedWord: 2 },
  pageRules: [{ pattern: "/articles/**", minimumWords: 35, titleTerms: ["public service"], contentTerms: ["technology", "agencies"], minimumContentTerms: 2, requireCitations: true }],
  citations: {
    routePatterns: ["/articles/**"],
    requireOnMatchedRoutes: true,
    checkExternal: true,
    requireReviews: true,
    maximumReviewAgeDays: 365,
    minimumContextSourceOverlap: 2,
    sourceSnapshots: [],
    reviews: [{ route: "/articles/service-guide/", url: sourceUrl, claimTerms: ["public service technology performance"], sourceTerms: ["agency performance", "measurable outcomes"], reviewer: "Fixture reviewer", reviewedAt: "2026-07-14", note: "The source supports the performance example, not a universal outcome claim." }]
  }
}));
const validResult = run(validConfig);
if (validResult.status !== 0) throw new Error(`Valid semantic SEO fixture failed:\n${validResult.stdout}${validResult.stderr}`);
const validData = JSON.parse(await readFile(validReport, "utf8"));
if (validData.counts.errors !== 0 || validData.counts.citationChecks !== 1) throw new Error("Valid semantic SEO report has incorrect counts.");

const invalid = join(root, "invalid");
const invalidUrl = "https://source.example/missing";
const futureUrl = "https://source.example/future";
await page(invalid, "articles/bad", html({
  route: "/articles/bad/",
  title: "Guide:",
  h1: "Unrelated Heading",
  canonical: "https://wrong.example/articles/bad/",
  body: `<p>Thin copy with a <a href="${invalidUrl}">click here</a> citation.</p>`
}));
await page(invalid, "articles/future", html({
  route: "/articles/future/",
  title: "Public Service Technology Evidence",
  h1: "Public Service Technology Evidence",
  body: `<p>This public service technology evidence page gives agencies a clear explanation of secure systems, accessible delivery, operational reliability, measurable outcomes, public accountability, implementation planning, and responsible review. A <a href="${futureUrl}">public service technology evidence source</a> supports the nearby reviewed claim about agency performance and measurable outcomes.</p>`
}));
const invalidReport = join(root, "invalid-report.json");
const invalidConfig = join(root, "invalid-config.json");
await writeFile(invalidConfig, JSON.stringify({
  outputDirectory: invalid,
  site,
  output: invalidReport,
  requirePageRule: true,
  title: { minimumCharacters: 30, maximumCharacters: 60, minimumWords: 4, minimumH1Overlap: 2, minimumContentOverlap: 3, maximumRepeatedWord: 2 },
  pageRules: [{ pattern: "/articles/**", minimumWords: 40, titleTerms: ["public service"], contentTerms: ["technology"], requireCitations: true }],
  citations: {
    routePatterns: ["/articles/**"],
    requireOnMatchedRoutes: true,
    requireReviews: true,
    sourceSnapshots: [
      { url: invalidUrl, status: 404, sourceText: "" },
      { url: futureUrl, status: 200, sourceText: "Public service technology evidence supports agency performance and measurable outcomes." }
    ],
    reviews: [{ route: "/articles/future/", url: futureUrl, claimTerms: ["agency performance"], sourceTerms: ["measurable outcomes"], reviewer: "Fixture reviewer", reviewedAt: "2099-01-01", note: "Future dates must not be accepted." }]
  }
}));
const invalidResult = run(invalidConfig);
const combined = `${invalidResult.stdout}${invalidResult.stderr}`;
for (const expected of [
  "Title has 6 characters",
  "suggests truncation",
  "Title and h1 share",
  "Canonical origin",
  "Primary content has",
  "configured intent terms",
  "empty or generic",
  "no reviewed evidence record",
  "returned HTTP 404",
  "review date is in the future"
]) {
  if (invalidResult.status === 0 || !combined.includes(expected)) throw new Error(`Invalid semantic SEO fixture did not report: ${expected}`);
}
const invalidData = JSON.parse(await readFile(invalidReport, "utf8"));
if (invalidData.counts.errors < 8) throw new Error("Invalid semantic SEO report did not preserve expected findings.");

await rm(root, { recursive: true, force: true });
sourceServer.kill();
log("Semantic SEO verifier tests passed.");
