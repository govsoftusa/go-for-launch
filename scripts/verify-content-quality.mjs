import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { load } from "cheerio";
import { readIndexablePages } from "./lib/html.mjs";
import { contentFromSegments, contentHash, matchingRule, normalizeText, phraseHits, readingEase, repeatedOpenings, sentences, words } from "./lib/content-quality.mjs";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function loadData(path) {
  if (!path) return {};
  const absolute = resolve(path);
  if (absolute.endsWith(".json")) return JSON.parse(await readFile(absolute, "utf8"));
  return (await import(`${pathToFileURL(absolute).href}?v=${Date.now()}`)).default;
}

function ageDays(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.valueOf()) / 86_400_000);
}

const config = await loadData(option("--config", "content-quality.config.mjs"));
const outputDirectory = resolve(option("--dir", config.outputDirectory || "dist"));
const output = resolve(option("--output", config.output || "artifacts/content-quality-report.json"));
let reviewData = { reviews: config.reviews || [] };
if (config.reviewFile) {
  try {
    reviewData = await loadData(config.reviewFile);
  } catch (cause) {
    if (!(cause && typeof cause === "object" && "code" in cause && cause.code === "ENOENT" && config.requireReview === false)) throw cause;
  }
}
const reviews = reviewData.reviews || [];
const pages = await readIndexablePages(outputDirectory);
const findings = [];
const pageResults = [];
const defaultPhrases = [
  "in today's fast-paced digital landscape",
  "in the ever-evolving landscape",
  "delve into",
  "unlock the power",
  "leverage the power",
  "navigate the complexities",
  "game changer",
  "revolutionize the way",
  "seamlessly integrate",
  "cutting-edge solution",
  "robust and scalable",
  "it is important to note",
  "at the end of the day"
];
const policy = {
  requireRouteRule: config.requireRouteRule ?? true,
  requireReview: config.requireReview ?? true,
  maximumReviewAgeDays: config.maximumReviewAgeDays ?? 180,
  maximumSentenceWords: config.maximumSentenceWords ?? 34,
  maximumParagraphWords: config.maximumParagraphWords ?? 110,
  minimumReadingEase: config.minimumReadingEase ?? 42,
  readingEaseSeverity: config.readingEaseSeverity || "error",
  openingWords: config.openingWords ?? 2,
  maximumRepeatedOpenings: config.maximumRepeatedOpenings ?? 3,
  phraseSeverity: config.phraseSeverity || "error",
  phrases: [...defaultPhrases, ...(config.additionalPhrases || [])]
};

function finding(severity, code, route, message, details = {}) {
  findings.push({ severity, code, route, message, ...details });
}

if (!["error", "warning"].includes(policy.readingEaseSeverity)) throw new Error("readingEaseSeverity must be error or warning");
if (!["error", "warning"].includes(policy.phraseSeverity)) throw new Error("phraseSeverity must be error or warning");

for (const page of pages) {
  const document = load(page.html);
  document("script, style, nav, footer, header, form, noscript").remove();
  const root = document(config.contentSelector || "main").first().length ? document(config.contentSelector || "main").first() : document("body");
  const text = contentFromSegments(root.find("h1, h2, h3, h4, p, li").map((_, element) => document(element).text()).get());
  const hash = contentHash(text);
  const rule = matchingRule(page.route, config.routeRules || []);
  const metrics = {
    words: words(text).length,
    sentences: sentences(text).length,
    readingEase: readingEase(text),
    longestSentenceWords: 0,
    longestParagraphWords: 0
  };

  if (policy.requireRouteRule && !rule) finding("error", "audience-rule-missing", page.route, "No content audience rule covers this route.");
  if (rule && !normalizeText(rule.audience)) finding("error", "audience-missing", page.route, "The route rule does not name its intended audience.");
  if (rule && !normalizeText(rule.primaryTask)) finding("error", "primary-task-missing", page.route, "The route rule does not name the audience's primary task.");

  const maximumSentenceWords = rule?.maximumSentenceWords ?? policy.maximumSentenceWords;
  for (const sentence of sentences(text)) {
    const count = words(sentence).length;
    metrics.longestSentenceWords = Math.max(metrics.longestSentenceWords, count);
    if (count > maximumSentenceWords) finding("error", "sentence-too-long", page.route, `A sentence has ${count} words, maximum is ${maximumSentenceWords}.`, { excerpt: sentence.slice(0, 180) });
  }

  const maximumParagraphWords = rule?.maximumParagraphWords ?? policy.maximumParagraphWords;
  for (const element of root.find("p, li")) {
    const paragraph = normalizeText(document(element).text());
    const count = words(paragraph).length;
    metrics.longestParagraphWords = Math.max(metrics.longestParagraphWords, count);
    if (count > maximumParagraphWords) finding("error", "paragraph-too-long", page.route, `A paragraph or list item has ${count} words, maximum is ${maximumParagraphWords}.`, { excerpt: paragraph.slice(0, 180) });
  }

  const minimumReadingEase = rule?.minimumReadingEase ?? policy.minimumReadingEase;
  if (metrics.readingEase < minimumReadingEase) finding(policy.readingEaseSeverity, "reading-ease-low", page.route, `Reading ease is ${metrics.readingEase}, minimum is ${minimumReadingEase}.`);

  for (const phrase of phraseHits(text, [...policy.phrases, ...(rule?.additionalPhrases || [])])) {
    finding(policy.phraseSeverity, "machine-like-phrase", page.route, `Content contains the configured machine-like or inflated phrase: "${phrase}".`);
  }

  for (const repeated of repeatedOpenings(text, policy.openingWords, policy.maximumRepeatedOpenings)) {
    finding("warning", "repetitive-sentence-opening", page.route, `The sentence opening "${repeated.opening}" appears ${repeated.count} times.`);
  }

  const review = reviews.find((entry) => entry.route === page.route);
  if (policy.requireReview && !review) {
    finding("error", "editorial-review-missing", page.route, "No Stanford Rule editorial review covers this route.");
  } else if (review) {
    if (!normalizeText(review.reviewer)) finding("error", "reviewer-missing", page.route, "The editorial review does not name a reviewer.");
    if (review.perspective !== "senior-psychology-professor") finding("error", "review-perspective-invalid", page.route, "The editorial review must use the senior-psychology-professor perspective.");
    if (review.contentHash !== hash) finding("error", "editorial-review-stale", page.route, "The editorial review hash does not match the built content.", { expected: hash, actual: review.contentHash || "" });
    if (rule?.audience && review.audience !== rule.audience) finding("error", "review-audience-mismatch", page.route, "The editorial review audience does not match the route rule.");
    if (ageDays(review.reviewedAt) < 0 || ageDays(review.reviewedAt) > policy.maximumReviewAgeDays) finding("error", "editorial-review-date", page.route, "The editorial review date is invalid, in the future, or stale.");
    for (const field of ["approachable", "humanTone", "clearPurpose", "evidenceAware"]) {
      if (review[field] !== true) finding("error", "editorial-review-failed", page.route, `The editorial review did not approve ${field}.`);
    }
    if (normalizeText(review.notes).length < 20) finding("error", "editorial-review-notes", page.route, "The editorial review needs a specific note of at least 20 characters.");
  }

  pageResults.push({ route: page.route, contentHash: hash, audience: rule?.audience || "", primaryTask: rule?.primaryTask || "", metrics });
}

const counts = {
  pages: pages.length,
  errors: findings.filter((item) => item.severity === "error").length,
  warnings: findings.filter((item) => item.severity === "warning").length
};
const report = {
  gate: "Stanford Rule content quality",
  definition: "A Go for Launch editorial standard, not a Stanford University policy or AI-authorship detector.",
  generatedAt: new Date().toISOString(),
  outputDirectory,
  counts,
  pages: pageResults,
  findings
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

for (const item of findings) console.error(`${item.severity.toUpperCase()} ${item.route} ${item.code}: ${item.message}`);
console.log(`Stanford Rule content quality: ${counts.pages} pages, ${counts.errors} errors, ${counts.warnings} warnings.`);
console.log(`Report: ${output}`);
if (counts.errors > 0 || (config.failOnWarnings && counts.warnings > 0)) process.exitCode = 1;
