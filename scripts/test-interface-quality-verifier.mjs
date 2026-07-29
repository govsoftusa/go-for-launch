import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-interface-quality-"));
const verifier = resolve("scripts/verify-interface-quality.mjs");

async function page(directory, route, html) {
  const path = join(directory, route === "/" ? "index.html" : `${route}/index.html`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html);
}

function run(config) {
  return spawnSync(process.execPath, [verifier, `--config=${config}`], { encoding: "utf8" });
}

const validDirectory = join(root, "valid", "dist");
const sharedValidStyle = `<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; overflow-x: clip; }
  .site-header { height: 56px; padding: 8px 16px; background: #071321; }
  .site-header a, button { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; }
  .hero { height: 280px; padding: 24px; }
  .actions { display: flex; gap: 12px; margin-bottom: 20px; }
  .divider { border-top: 1px solid #777; padding-top: 16px; }
  .next { min-height: 160px; padding: 20px; }
  .home-layout { background: #071321; color: white; }
  .about-layout { background: #f4efe5; color: #171717; }
  .citation { overflow: visible; }
</style>`;
await page(validDirectory, "/", `<!doctype html><html><head><link rel="canonical" href="https://example.com/">${sharedValidStyle}</head><body>
  <header class="site-header"><a href="/about/">About</a></header>
  <main class="home-layout" data-page-archetype="editorial-cover">
    <section class="hero"><h1>Start with a useful question</h1><div class="actions"><button>Begin</button><a href="/about/">Learn more</a></div><div class="divider">Current status</div></section>
    <section class="next"><figure>Distinctive home illustration</figure><p>Read the evidence before deciding what a claim means.</p></section>
    <img src="https://cdn.example.com/must-not-load.png" alt="">
  </main></body></html>`);
await page(validDirectory, "/about/", `<!doctype html><html><head><link rel="canonical" href="https://example.com/about/">${sharedValidStyle}</head><body>
  <header class="site-header"><a href="/">Home</a></header>
  <main class="about-layout" data-page-archetype="narrative-record">
    <article style="content-visibility:auto;contain-intrinsic-size:auto 700px"><h1>How the review works</h1><p>Two source links can wrap beside each other without creating a collision: <a class="citation" href="https://example.com/source-one">Source one with a descriptive title</a> and <a class="citation" href="https://example.com/source-two">Source two with another descriptive title</a>.</p></article>
  </main></body></html>`);
await page(validDirectory, "/encoded/%d1%8f/", `<!doctype html><html><head><link rel="canonical" href="https://example.com/encoded/%d1%8f/">${sharedValidStyle}</head><body>
  <header class="site-header"><a href="/">Home</a></header>
  <main class="about-layout" data-page-archetype="narrative-record"><article><h1>Encoded route</h1><p>Percent-encoded snapshot paths remain reachable.</p></article></main>
</body></html>`);
await page(validDirectory, "/about-two/", `<!doctype html><html><head><link rel="canonical" href="https://example.com/about-two/">${sharedValidStyle}</head><body>
  <header class="site-header"><a href="/">Home</a></header>
  <main class="about-layout" data-page-archetype="narrative-record"><article><h1>Second narrative route</h1><p>This route is covered by a tested representative instead of another browser sweep.</p></article></main>
</body></html>`);
const validReport = join(root, "valid", "report.json");
const validConfig = join(root, "valid", "config.mjs");
await writeFile(validConfig, `export default ${JSON.stringify({
  outputDirectory: validDirectory,
  report: validReport,
  screenshotDirectory: join(root, "valid", "screenshots"),
  browsers: ["chromium"],
  viewports: [{ name: "mobile", width: 320, height: 700 }],
  differentiationBrowsers: ["chromium"],
  differentiationViewports: ["mobile"],
  minimumDistinctiveDimensions: 2,
  routeConcurrency: 2,
  progressEvery: 1,
  coverageMode: "representatives",
  coverageKeyFields: ["family", "archetype"],
  coverageInventory: [
    { path: "/", family: "home", archetype: "editorial-cover" },
    { path: "/about/", family: "about", archetype: "narrative-record" },
    { path: "/encoded/%d1%8f/", family: "about", archetype: "narrative-record" },
    { path: "/about-two/", family: "about", archetype: "narrative-record" }
  ],
  network: {
    externalRequests: "block",
    maximumCompletedExternalRequests: 0
  },
  differentiationScope: "every-route-to-family-representative",
  screenshots: "none",
  header: { selector: ".site-header", maximumViewportHeightRatio: 0.2 },
  controls: {
    overlap: { ignoreSelectors: [".citation"] },
    targetSize: { enabled: true, severity: "error", ignoreSelectors: [".citation"] }
  },
  routes: [
    {
      path: "/",
      family: "home",
      archetype: "editorial-cover",
      purpose: "Orient a new visitor",
      contentRhythm: "Compact opening followed by an illustrated explanation",
      visualIdentity: "Dark editorial cover",
      representativeReason: "The only editorial-cover route",
      requiredSelectors: ["main", ".actions"],
      distinctiveSelectors: [".home-layout"],
      hero: { selector: ".hero", maximumViewportHeightRatio: 0.5, nextContentSelector: ".next", minimumNextContentPixels: 20 },
      clearance: [{ name: "Actions above status divider", from: ".actions", to: ".divider", minimum: 16 }]
    },
    {
      path: "/about/",
      family: "about",
      archetype: "narrative-record",
      purpose: "Explain the review method",
      contentRhythm: "Single long-form narrative",
      visualIdentity: "Light reading surface",
      representativeReason: "Representative narrative route with wrapping inline links",
      requiredSelectors: ["article"],
      distinctiveSelectors: [".about-layout"]
    },
    {
      path: "/encoded/%d1%8f/",
      family: "about",
      archetype: "narrative-record",
      purpose: "Verify encoded snapshot routing",
      contentRhythm: "Single long-form narrative",
      visualIdentity: "Light reading surface",
      representativeReason: "Encoded-path routing outlier",
      requiredSelectors: ["article"],
      distinctiveSelectors: [".about-layout"]
    }
  ]
})};\n`);
const validResult = run(validConfig);
if (validResult.status !== 0) throw new Error(`Valid interface fixture failed:\n${validResult.stdout}${validResult.stderr}`);
if (!validResult.stdout.includes("Interface quality progress: 3/3 checks (100.0%).")) {
  throw new Error("Valid interface fixture did not report final progress.");
}
const validData = JSON.parse(await readFile(validReport, "utf8"));
if (validData.counts.errors !== 0 || validData.counts.checks !== 3) throw new Error("Valid interface report has incorrect counts.");
if (
  validData.coverageMode !== "representatives" ||
  validData.counts.inventoryRoutes !== 4 ||
  validData.network.completedExternalRequests !== 0 ||
  validData.network.blockedExternalRequests < 1
) {
  throw new Error("Representative coverage or external-network isolation was not recorded.");
}

const recoveredFontDirectory = join(root, "recovered-font", "dist");
await page(recoveredFontDirectory, "/", `<!doctype html><html><head>
  <link rel="canonical" href="https://example.com/">
  <script>
    if (!localStorage.getItem("font-readiness-initial-timeout")) {
      localStorage.setItem("font-readiness-initial-timeout", "seen");
      Object.defineProperty(document.fonts, "ready", {
        configurable: true,
        value: new Promise(() => {})
      });
    }
  </script>
  ${sharedValidStyle}
</head><body>
  <header class="site-header"><a href="/">Home</a></header>
  <main class="home-layout" data-page-archetype="editorial-cover">
    <section class="hero"><h1>Fresh page font confirmation</h1></section>
  </main>
</body></html>`);
const recoveredFontReport = join(root, "recovered-font", "report.json");
const recoveredFontConfig = join(root, "recovered-font", "config.mjs");
await writeFile(recoveredFontConfig, `export default ${JSON.stringify({
  outputDirectory: recoveredFontDirectory,
  report: recoveredFontReport,
  screenshotDirectory: join(root, "recovered-font", "screenshots"),
  browsers: ["chromium"],
  viewports: [{ name: "mobile", width: 320, height: 700 }],
  differentiationBrowsers: [],
  differentiationViewports: [],
  routeConcurrency: 1,
  fontReadinessTimeoutMs: 20,
  screenshots: "none",
  header: { selector: ".site-header", maximumViewportHeightRatio: 0.2 },
  controls: { targetSize: { enabled: false } },
  routes: [
    {
      path: "/",
      family: "home",
      archetype: "editorial-cover",
      purpose: "Verify fresh-page font confirmation",
      contentRhythm: "One test region",
      visualIdentity: "Test fixture",
      requiredSelectors: ["main"],
      distinctiveSelectors: [".home-layout"]
    }
  ]
})};\n`);
const recoveredFontResult = run(recoveredFontConfig);
if (recoveredFontResult.status !== 0) {
  throw new Error(`Recoverable font timeout fixture failed:\n${recoveredFontResult.stdout}${recoveredFontResult.stderr}`);
}
const recoveredFontData = JSON.parse(await readFile(recoveredFontReport, "utf8"));
if (
  recoveredFontData.counts.fontReadinessRecoveries !== 1 ||
  recoveredFontData.fontReadinessRecoveries[0]?.status !== "recovered" ||
  recoveredFontData.fontReadinessRecoveries[0]?.confirmations?.length !== 3
) {
  throw new Error("Recoverable font timeout did not record three fresh-page confirmations.");
}

const stalledFontDirectory = join(root, "stalled-font", "dist");
await page(stalledFontDirectory, "/", `<!doctype html><html><head>
  <link rel="canonical" href="https://example.com/">
  <script>
    Object.defineProperty(document.fonts, "ready", {
      configurable: true,
      value: new Promise(() => {})
    });
  </script>
  ${sharedValidStyle}
</head><body>
  <header class="site-header"><a href="/">Home</a></header>
  <main class="home-layout" data-page-archetype="editorial-cover">
    <section class="hero"><h1>Persistent font timeout</h1></section>
  </main>
</body></html>`);
const stalledFontReport = join(root, "stalled-font", "report.json");
const stalledFontConfig = join(root, "stalled-font", "config.mjs");
await writeFile(stalledFontConfig, `export default ${JSON.stringify({
  outputDirectory: stalledFontDirectory,
  report: stalledFontReport,
  screenshotDirectory: join(root, "stalled-font", "screenshots"),
  browsers: ["chromium"],
  viewports: [{ name: "mobile", width: 320, height: 700 }],
  differentiationBrowsers: [],
  differentiationViewports: [],
  routeConcurrency: 1,
  fontReadinessTimeoutMs: 20,
  screenshots: "none",
  header: { selector: ".site-header", maximumViewportHeightRatio: 0.2 },
  controls: { targetSize: { enabled: false } },
  routes: [
    {
      path: "/",
      family: "home",
      archetype: "editorial-cover",
      purpose: "Verify persistent font failure",
      contentRhythm: "One test region",
      visualIdentity: "Test fixture",
      requiredSelectors: ["main"],
      distinctiveSelectors: [".home-layout"]
    }
  ]
})};\n`);
const stalledFontResult = run(stalledFontConfig);
if (stalledFontResult.status === 0) throw new Error("Persistent font timeout fixture passed.");
const stalledFontData = JSON.parse(await readFile(stalledFontReport, "utf8"));
if (
  stalledFontData.fontReadinessRecoveries[0]?.status !== "failed" ||
  !stalledFontData.findings.some((finding) => finding.code === "font-readiness-timeout")
) {
  throw new Error("Persistent font timeout did not fail closed.");
}

const invalidDirectory = join(root, "invalid", "dist");
const invalidStyle = `<style>
  * { box-sizing: border-box; }
  body { margin: 0; }
  .site-header { height: 160px; }
  main { width: 520px; background: white; color: black; }
  .hero { height: 800px; position: relative; }
  .actions { position: relative; width: 200px; height: 44px; }
  .actions button { position: absolute; inset: 0; width: 160px; height: 44px; }
  .divider { border-top: 1px solid black; }
</style>`;
for (const [route, archetype, routeClass] of [["/", "cover", "home-layout"], ["/about/", "record", "about-layout"]]) {
  await page(invalidDirectory, route, `<!doctype html><html><head><link rel="canonical" href="https://example.com${route}">${invalidStyle}</head><body>
    <header class="site-header"><a href="/">Home</a></header>
    <main class="${routeClass}" data-page-archetype="${archetype}"><section class="hero"><h1>Same layout</h1><div class="actions"><button>First</button><button>Second</button></div><div class="divider">Status</div></section></main>
  </body></html>`);
}
const invalidReport = join(root, "invalid", "report.json");
const invalidConfig = join(root, "invalid", "config.mjs");
await writeFile(invalidConfig, `export default ${JSON.stringify({
  outputDirectory: invalidDirectory,
  report: invalidReport,
  screenshotDirectory: join(root, "invalid", "screenshots"),
  browsers: ["chromium"],
  viewports: [{ name: "mobile", width: 320, height: 700 }],
  differentiationBrowsers: ["chromium"],
  differentiationViewports: ["mobile"],
  minimumDistinctiveDimensions: 2,
  screenshots: "none",
  header: { selector: ".site-header", maximumViewportHeightRatio: 0.15 },
  controls: { targetSize: { enabled: false } },
  routes: [
    { path: "/", family: "home", archetype: "cover", purpose: "Orient", contentRhythm: "Opening", visualIdentity: "Cover", requiredSelectors: ["main"], distinctiveSelectors: [".home-layout"], hero: { selector: ".hero", maximumViewportHeightRatio: 0.6 }, clearance: [{ from: ".actions", to: ".divider", minimum: 16 }] },
    { path: "/about/", family: "about", archetype: "record", purpose: "Explain", contentRhythm: "Narrative", visualIdentity: "Record", requiredSelectors: ["main"], distinctiveSelectors: [".about-layout"] }
  ]
})};\n`);
const invalidResult = run(invalidConfig);
if (invalidResult.status === 0) throw new Error("Invalid interface fixture passed.");
const invalidData = JSON.parse(await readFile(invalidReport, "utf8"));
for (const expected of ["horizontal-overflow", "controls-overlap", "clearance-too-small", "hero-too-tall", "site-header-too-tall", "route-families-too-similar"]) {
  if (!invalidData.findings.some((finding) => finding.code === expected)) throw new Error(`Invalid interface fixture did not report ${expected}.`);
}

await rm(root, { recursive: true, force: true });
console.log("Interface quality verifier tests passed.");
