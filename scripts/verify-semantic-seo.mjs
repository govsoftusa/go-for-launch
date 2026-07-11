import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { error, log } from "node:console";
import { load } from "cheerio";
import { readIndexablePages } from "./lib/html.mjs";

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "and", "are", "because", "been", "before", "being", "between",
  "both", "but", "can", "could", "does", "each", "for", "from", "has", "have", "how", "into", "its", "more",
  "most", "not", "only", "other", "our", "out", "over", "page", "that", "the", "their", "there", "these",
  "they", "this", "through", "under", "using", "very", "was", "what", "when", "where", "which", "while", "who",
  "why", "will", "with", "would", "your"
]);

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

function booleanOption(name, fallback) {
  return option(name, String(fallback)) === "true";
}

function numberOption(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a nonnegative number`);
  return value;
}

function escapePattern(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function matchesPattern(value, pattern) {
  const expression = escapePattern(pattern)
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${expression}$`).test(value);
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => matchesPattern(value, pattern));
}

function words(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

function meaningfulWords(value, ignoredTerms = []) {
  const ignored = new Set(ignoredTerms.flatMap((term) => words(term)));
  return words(value).filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !ignored.has(word));
}

function overlap(left, right, ignoredTerms = []) {
  const leftWords = new Set(meaningfulWords(left, ignoredTerms));
  const rightWords = new Set(meaningfulWords(right, ignoredTerms));
  return [...leftWords].filter((word) => rightWords.has(word));
}

function phraseMatches(text, phrases) {
  const normalized = ` ${words(text).join(" ")} `;
  return phrases.filter((phrase) => normalized.includes(` ${words(phrase).join(" ")} `));
}

function genericAnchor(value) {
  return /^(?:click here|here|learn more|read more|source|website|link|article|reference|more)$/i.test(value.trim());
}

function dateAgeDays(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.valueOf()) / 86_400_000);
}

function sourceTextFromHtml(html) {
  const document = load(html);
  document("script, style, nav, footer, header, form").remove();
  return [
    document("title").first().text(),
    document('meta[name="description" i]').first().attr("content") || "",
    document("h1").first().text(),
    document("main, article, body").first().text()
  ].join(" ").replace(/\s+/g, " ").trim();
}

async function fetchCitation(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "User-Agent": "GoForLaunch-SemanticSEO/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const html = contentType.includes("html") ? await response.text() : "";
    return {
      checkedAt: new Date().toISOString(),
      status: response.status,
      finalUrl: response.url,
      contentType,
      sourceText: html ? sourceTextFromHtml(html) : ""
    };
  } catch (cause) {
    return {
      checkedAt: new Date().toISOString(),
      status: 0,
      finalUrl: url,
      contentType: "",
      sourceText: "",
      error: cause instanceof Error ? cause.message : String(cause)
    };
  } finally {
    clearTimeout(timer);
  }
}

const config = await loadConfig(option("--config", ""));
const outputDirectory = resolve(option("--dir", config.outputDirectory || "dist"));
const site = new URL(option("--site", config.site || "https://example.com"));
const output = resolve(option("--output", config.output || "artifacts/semantic-seo-report.json"));
const checkExternal = booleanOption("--check-external", config.citations?.checkExternal ?? false);
const failOnWarnings = booleanOption("--fail-on-warnings", config.failOnWarnings ?? false);
const titlePolicy = {
  minimumCharacters: numberOption("--minimum-title-length", config.title?.minimumCharacters ?? 30),
  maximumCharacters: numberOption("--maximum-title-length", config.title?.maximumCharacters ?? 60),
  minimumWords: numberOption("--minimum-title-words", config.title?.minimumWords ?? 4),
  minimumH1Overlap: numberOption("--minimum-title-h1-overlap", config.title?.minimumH1Overlap ?? 2),
  minimumContentOverlap: numberOption("--minimum-title-content-overlap", config.title?.minimumContentOverlap ?? 3),
  maximumRepeatedWord: numberOption("--maximum-repeated-title-word", config.title?.maximumRepeatedWord ?? 2),
  ignoredTerms: config.title?.ignoredTerms || []
};
const contentSelectors = config.contentSelectors || ["article", "main"];
const pageRules = config.pageRules || [];
const requirePageRule = config.requirePageRule ?? false;
const citationPolicy = {
  routePatterns: config.citations?.routePatterns || [],
  requireOnMatchedRoutes: config.citations?.requireOnMatchedRoutes ?? false,
  requireReviews: config.citations?.requireReviews ?? false,
  maximumReviewAgeDays: config.citations?.maximumReviewAgeDays ?? 365,
  minimumContextSourceOverlap: config.citations?.minimumContextSourceOverlap ?? 2,
  lowOverlapSeverity: config.citations?.lowOverlapSeverity || "warning",
  timeoutMs: config.citations?.timeoutMs ?? 8_000,
  concurrency: config.citations?.concurrency ?? 6,
  ignoredUrls: config.citations?.ignoredUrls || [],
  reviews: config.citations?.reviews || [],
  snapshots: new Map((config.citations?.sourceSnapshots || []).map((entry) => [entry.url, entry]))
};
const findings = [];
const citationChecks = [];
const pendingCitationSources = [];
const fetchedSources = new Map();
const pages = await readIndexablePages(outputDirectory);

if (!['error', 'warning'].includes(citationPolicy.lowOverlapSeverity)) throw new Error("citations.lowOverlapSeverity must be error or warning");
if (!Number.isInteger(citationPolicy.concurrency) || citationPolicy.concurrency < 1) throw new Error("citations.concurrency must be a positive integer");

function finding(severity, code, route, message, details = {}) {
  findings.push({ severity, code, route, message, ...details });
}

function matchingRule(route) {
  return pageRules.find((rule) => matchesAny(route, Array.isArray(rule.patterns) ? rule.patterns : [rule.pattern || route]));
}

function matchingReview(route, url) {
  return citationPolicy.reviews.find((review) => review.route === route && review.url === url);
}

for (const page of pages) {
  const document = load(page.html);
  const title = document("title").first().text().replace(/\s+/g, " ").trim();
  const h1 = document("h1").first().text().replace(/\s+/g, " ").trim();
  const root = document(contentSelectors.join(", ")).first().length ? document(contentSelectors.join(", ")).first() : document("body");
  const content = root.text().replace(/\s+/g, " ").trim();
  const contentWordCount = words(content).length;
  const rule = matchingRule(page.route);
  const titleWords = meaningfulWords(title, titlePolicy.ignoredTerms);
  const titleCounts = new Map();

  for (const word of titleWords) titleCounts.set(word, (titleCounts.get(word) || 0) + 1);

  if (title.length < titlePolicy.minimumCharacters) finding("error", "title-too-short", page.route, `Title has ${title.length} characters, minimum is ${titlePolicy.minimumCharacters}.`);
  if (title.length > titlePolicy.maximumCharacters) finding("error", "title-too-long", page.route, `Title has ${title.length} characters, maximum is ${titlePolicy.maximumCharacters}.`);
  if (words(title).length < titlePolicy.minimumWords) finding("error", "title-too-few-words", page.route, `Title has fewer than ${titlePolicy.minimumWords} words.`);
  if (/(?:\.{3}|…|[,;:|/-])\s*$/.test(title)) finding("error", "title-looks-truncated", page.route, "Title ends with punctuation that suggests truncation or an incomplete template.");
  for (const [word, count] of titleCounts) {
    if (count > titlePolicy.maximumRepeatedWord) finding("error", "title-keyword-repetition", page.route, `Title repeats "${word}" ${count} times.`);
  }

  const h1Overlap = overlap(title, h1, titlePolicy.ignoredTerms);
  if (h1Overlap.length < titlePolicy.minimumH1Overlap) {
    finding("error", "title-h1-mismatch", page.route, `Title and h1 share ${h1Overlap.length} meaningful terms, minimum is ${titlePolicy.minimumH1Overlap}.`);
  }
  const contentOverlap = overlap(title, content, titlePolicy.ignoredTerms);
  if (contentOverlap.length < titlePolicy.minimumContentOverlap) {
    finding("error", "title-content-mismatch", page.route, `Title and primary content share ${contentOverlap.length} meaningful terms, minimum is ${titlePolicy.minimumContentOverlap}.`);
  }

  const canonical = document('link[rel="canonical" i]').first().attr("href") || "";
  try {
    const canonicalUrl = new URL(canonical);
    const expected = new URL(page.route, site);
    if (canonicalUrl.origin !== site.origin) finding("error", "canonical-origin", page.route, `Canonical origin is ${canonicalUrl.origin}, expected ${site.origin}.`, { url: canonical });
    if (canonicalUrl.pathname !== expected.pathname || canonicalUrl.search || canonicalUrl.hash) {
      finding("error", "canonical-route", page.route, `Canonical does not match the built route ${expected.href}.`, { url: canonical });
    }
  } catch {
    finding("error", "canonical-invalid", page.route, "Canonical URL is missing or invalid.", { url: canonical });
  }

  if (requirePageRule && !rule) finding("error", "page-intent-unconfigured", page.route, "No semantic page rule covers this indexable route.");
  if (rule) {
    const minimumWords = rule.minimumWords ?? 0;
    const maximumWords = rule.maximumWords ?? Number.POSITIVE_INFINITY;
    if (contentWordCount < minimumWords) finding("error", "content-too-thin", page.route, `Primary content has ${contentWordCount} words, minimum is ${minimumWords}.`);
    if (contentWordCount > maximumWords) finding("warning", "content-too-long", page.route, `Primary content has ${contentWordCount} words, reviewed maximum is ${maximumWords}.`);

    const titleTerms = rule.titleTerms || [];
    const minimumTitleTerms = rule.minimumTitleTerms ?? (titleTerms.length > 0 ? 1 : 0);
    const matchedTitleTerms = phraseMatches(title, titleTerms);
    if (matchedTitleTerms.length < minimumTitleTerms) {
      finding("error", "title-intent-missing", page.route, `Title matches ${matchedTitleTerms.length} configured intent terms, minimum is ${minimumTitleTerms}.`, { expectedTerms: titleTerms });
    }

    const contentTerms = rule.contentTerms || [];
    const minimumContentTerms = rule.minimumContentTerms ?? (contentTerms.length > 0 ? 1 : 0);
    const matchedContentTerms = phraseMatches(`${h1} ${content}`, contentTerms);
    if (matchedContentTerms.length < minimumContentTerms) {
      finding("error", "content-intent-missing", page.route, `Content matches ${matchedContentTerms.length} configured purpose terms, minimum is ${minimumContentTerms}.`, { expectedTerms: contentTerms });
    }
  }

  const citationRoute = citationPolicy.routePatterns.length === 0 || matchesAny(page.route, citationPolicy.routePatterns);
  if (!citationRoute) continue;

  const citations = [];
  for (const element of root.find("a[href]")) {
    const href = document(element).attr("href") || "";
    if (document(element).is("[data-citation-ignore]")) continue;
    let url;
    try {
      url = new URL(href, new URL(page.route, site));
    } catch {
      finding("error", "citation-url-invalid", page.route, `Citation URL is invalid: ${href}.`, { url: href });
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === site.origin) continue;
    if (citationPolicy.ignoredUrls.some((pattern) => matchesPattern(url.href, pattern))) continue;
    const anchor = document(element).text().replace(/\s+/g, " ").trim();
    const contextElement = document(element).closest("p, li, blockquote, figcaption");
    const context = (contextElement.length ? contextElement.text() : document(element).parent().text()).replace(/\s+/g, " ").trim();
    citations.push({ url: url.href, anchor, context });
  }

  if ((rule?.requireCitations || citationPolicy.requireOnMatchedRoutes) && citations.length === 0) {
    finding("error", "citation-missing", page.route, "This content type requires at least one external source citation.");
  }

  for (const citation of citations) {
    if (!citation.anchor || genericAnchor(citation.anchor)) {
      finding("error", "citation-anchor-generic", page.route, `Citation anchor text is empty or generic for ${citation.url}.`, { url: citation.url });
    }

    const review = matchingReview(page.route, citation.url);
    if (citationPolicy.requireReviews && !review) {
      finding("error", "citation-review-missing", page.route, `Citation has no reviewed evidence record: ${citation.url}.`, { url: citation.url });
    }
    if (review) {
      if (!review.reviewer || !review.reviewedAt || !review.note || !review.claimTerms?.length || !review.sourceTerms?.length) {
        finding("error", "citation-review-incomplete", page.route, `Citation review is incomplete for ${citation.url}.`, { url: citation.url });
      } else {
        const reviewAge = dateAgeDays(review.reviewedAt);
        if (!Number.isFinite(reviewAge)) {
          finding("error", "citation-review-date-invalid", page.route, `Citation review date is invalid for ${citation.url}.`, { url: citation.url });
        } else if (reviewAge < 0) {
          finding("error", "citation-review-date-future", page.route, `Citation review date is in the future for ${citation.url}.`, { url: citation.url });
        } else if (reviewAge > citationPolicy.maximumReviewAgeDays) {
          finding("error", "citation-review-stale", page.route, `Citation review is older than ${citationPolicy.maximumReviewAgeDays} days for ${citation.url}.`, { url: citation.url });
        }
        const contextMatches = phraseMatches(citation.context, review.claimTerms);
        if (contextMatches.length === 0) {
          finding("error", "citation-claim-drift", page.route, `Citation context no longer contains a reviewed claim term for ${citation.url}.`, { url: citation.url, expectedTerms: review.claimTerms });
        }
      }
    }

    pendingCitationSources.push({ route: page.route, citation, review });
  }
}

async function evaluateCitationSource({ route, citation, review }) {
  let source = citationPolicy.snapshots.get(citation.url) || null;
  if (checkExternal) {
    if (!fetchedSources.has(citation.url)) fetchedSources.set(citation.url, fetchCitation(citation.url, citationPolicy.timeoutMs));
    source = await fetchedSources.get(citation.url);
  }
  if (!source) {
    if (checkExternal || review) finding("warning", "citation-source-not-checked", route, `Citation source content was not available for drift checking: ${citation.url}.`, { url: citation.url });
    return;
  }

  citationChecks.push({ route, url: citation.url, ...source, sourceText: undefined });
  if (!source.status || source.status >= 400) {
    finding("error", "citation-unreachable", route, `Citation returned HTTP ${source.status || "failure"}: ${citation.url}.`, { url: citation.url, status: source.status || 0 });
  }
  const sourceText = source.sourceText || [source.title, source.description, source.text].filter(Boolean).join(" ");
  if (review?.sourceTerms?.length && phraseMatches(sourceText, review.sourceTerms).length === 0) {
    finding("error", "citation-source-drift", route, `Citation source no longer contains a reviewed source term for ${citation.url}.`, { url: citation.url, expectedTerms: review.sourceTerms });
  }
  const sourceOverlap = overlap(`${citation.anchor} ${citation.context}`, sourceText, titlePolicy.ignoredTerms);
  if (sourceText && sourceOverlap.length < citationPolicy.minimumContextSourceOverlap) {
    finding(citationPolicy.lowOverlapSeverity, "citation-low-topical-overlap", route, `Citation context and source share ${sourceOverlap.length} meaningful terms, minimum is ${citationPolicy.minimumContextSourceOverlap}.`, { url: citation.url });
  }
}

let nextCitation = 0;
await Promise.all(Array.from({ length: Math.min(citationPolicy.concurrency, pendingCitationSources.length) }, async () => {
  while (nextCitation < pendingCitationSources.length) {
    const index = nextCitation;
    nextCitation += 1;
    await evaluateCitationSource(pendingCitationSources[index]);
  }
}));

findings.sort((left, right) => `${left.route}:${left.code}:${left.url || ""}`.localeCompare(`${right.route}:${right.code}:${right.url || ""}`));
citationChecks.sort((left, right) => `${left.route}:${left.url}`.localeCompare(`${right.route}:${right.url}`));

const errors = findings.filter((entry) => entry.severity === "error");
const warnings = findings.filter((entry) => entry.severity === "warning");
const report = {
  generatedAt: new Date().toISOString(),
  site: site.origin,
  configuration: {
    checkExternal,
    failOnWarnings,
    requirePageRule,
    title: titlePolicy,
    citationRoutes: citationPolicy.routePatterns,
    requireCitationReviews: citationPolicy.requireReviews
  },
  counts: {
    pages: pages.length,
    citationChecks: citationChecks.length,
    errors: errors.length,
    warnings: warnings.length
  },
  findings,
  citationChecks
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length > 0 || (failOnWarnings && warnings.length > 0)) {
  error("Semantic SEO verification failed:");
  for (const entry of findings) error(`- [${entry.severity}] ${entry.route}: ${entry.message}`);
  process.exitCode = 1;
} else {
  log(`Semantic SEO verification passed: ${report.counts.pages} indexable pages, ${citationChecks.length} checked citations, ${warnings.length} advisory findings.`);
}
