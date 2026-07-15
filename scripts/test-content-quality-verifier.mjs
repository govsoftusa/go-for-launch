import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { load } from "cheerio";
import { contentFromSegments, contentHash } from "./lib/content-quality.mjs";

const verifier = new URL("./verify-content-quality.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-content-quality-"));

async function page(directory, route, content) {
  const path = join(directory, route === "/" ? "index.html" : `${route}/index.html`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

function run(config) {
  return spawnSync(process.execPath, [verifier.pathname, `--config=${config}`], { encoding: "utf8" });
}

const validDirectory = join(root, "valid");
const validHtml = `<!doctype html><html><head><title>Clear Public Service Guide</title><link rel="canonical" href="https://example.com/"></head><body><header>Hidden header</header><main><h1>Choose the right public service path</h1><p>This guide helps program managers understand the available options. It explains what each option does, what information the team needs, and when an outside service is useful.</p><p>Start with the outcome residents need. Then compare the evidence, limits, cost, and next step in plain language. If a term is unfamiliar, the page defines it before asking the reader to act.</p></main><footer>Hidden footer</footer></body></html>`;
await page(validDirectory, "/", validHtml);
const validDocument = load(validHtml);
validDocument("script, style, nav, footer, header, form, noscript").remove();
const validRoot = validDocument("main").first();
const validHash = contentHash(contentFromSegments(validRoot.find("h1, h2, h3, h4, p, li").map((_, element) => validDocument(element).text()).get()));
const validReview = join(root, "valid-reviews.json");
await writeFile(validReview, JSON.stringify({ reviews: [{ route: "/", contentHash: validHash, audience: "Program managers selecting a public service approach", reviewer: "Fixture editorial reviewer", perspective: "senior-psychology-professor", reviewedAt: "2026-07-15", approachable: true, humanTone: true, clearPurpose: true, evidenceAware: true, notes: "The page speaks directly to program managers and defines the decision in ordinary language." }] }));
const validReport = join(root, "valid-report.json");
const validConfig = join(root, "valid-config.json");
await writeFile(validConfig, JSON.stringify({ outputDirectory: validDirectory, output: validReport, reviewFile: validReview, minimumReadingEase: 0, routeRules: [{ pattern: "/", audience: "Program managers selecting a public service approach", primaryTask: "Compare options and choose a next step", minimumReadingEase: 0 }] }));
const validResult = run(validConfig);
if (validResult.status !== 0) throw new Error(`Valid content fixture failed:\n${validResult.stdout}${validResult.stderr}`);
const validData = JSON.parse(await readFile(validReport, "utf8"));
if (validData.counts.errors !== 0 || validData.pages[0].contentHash !== validHash) throw new Error("Valid content report has incorrect results.");

const invalidDirectory = join(root, "invalid");
const longSentence = "This sentence keeps adding abstract claims about transformation, innovation, scale, experience, engagement, alignment, optimization, opportunity, strategy, outcomes, platforms, ecosystems, capabilities, solutions, stakeholders, journeys, excellence, leadership, momentum, value, impact, vision, growth, and success without giving the reader a useful stopping point or a concrete decision.";
const longParagraph = Array.from({ length: 12 }, () => "In today's fast-paced digital landscape we delve into a game changer that will unlock the power of a cutting-edge solution.").join(" ");
await page(invalidDirectory, "/", `<!doctype html><html><body><main><h1>Transform everything</h1><p>${longSentence}</p><p>${longParagraph}</p></main></body></html>`);
const invalidReport = join(root, "invalid-report.json");
const invalidConfig = join(root, "invalid-config.json");
const invalidReview = join(root, "invalid-reviews.json");
await writeFile(invalidReview, JSON.stringify({ reviews: [] }));
await writeFile(invalidConfig, JSON.stringify({ outputDirectory: invalidDirectory, output: invalidReport, reviewFile: invalidReview, minimumReadingEase: 80, maximumSentenceWords: 20, maximumParagraphWords: 50, routeRules: [{ pattern: "/", audience: "", primaryTask: "" }] }));
const invalidResult = run(invalidConfig);
const combined = `${invalidResult.stdout}${invalidResult.stderr}`;
for (const expected of ["does not name its intended audience", "does not name the audience's primary task", "sentence has", "paragraph or list item has", "Reading ease is", "machine-like or inflated phrase", "No Stanford Rule editorial review"]) {
  if (invalidResult.status === 0 || !combined.includes(expected)) throw new Error(`Invalid content fixture did not report: ${expected}`);
}

await rm(root, { recursive: true, force: true });
console.log("Stanford Rule content quality verifier tests passed.");
