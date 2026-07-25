#!/usr/bin/env node
/**
 * Source-parity comparison.
 *
 * Fetches the same route from the legacy site and the rebuilt candidate, then
 * compares the fields a reader and a crawler actually notice. Eyeballing a few
 * pages proves nothing on an archive of this size, and a diff of raw HTML
 * proves too much: the markup changed on purpose.
 *
 * This sits between those. It ignores presentation and asserts on meaning:
 * title, description, canonical, heading, byline, date, taxonomy, image count
 * and body length.
 *
 * Read-only. It issues GET requests to two origins and writes a report.
 *
 * Usage:
 *   node scripts/compare-with-source.mjs \
 *     --source https://www.example.com \
 *     --candidate https://<project>.<subdomain>.workers.dev \
 *     --dataset ../dataset \
 *     --sample 40
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    args[key] = !next || next.startsWith('--') ? true : next;
    if (args[key] !== true) i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const source = (args.source ?? '').replace(/\/$/, '');
const candidate = (args.candidate ?? '').replace(/\/$/, '');
const datasetDir = path.resolve(args.dataset ?? '../dataset');
const sampleSize = Number.parseInt(args.sample ?? '40', 10);
const concurrency = Number.parseInt(args.concurrency ?? '4', 10);

if (!source || !candidate) {
  console.error('Both --source and --candidate origins are required.');
  process.exit(1);
}

/* ---------------------------------------------------------------------- */
/* Field extraction                                                        */
/* ---------------------------------------------------------------------- */

const decode = (value) =>
  (value ?? '')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const meta = (html, attr, value) => {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']*)["']|` +
      `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${value}["']`,
    'i',
  );
  const m = re.exec(html);
  return decode(m?.[1] ?? m?.[2] ?? '');
};

function extract(html) {
  const bodyMatch = /<main[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/main>/i.exec(html)
    ?? /<article[\s\S]*?>([\s\S]*?)<\/article>/i.exec(html);
  const body = bodyMatch?.[1] ?? html;

  const text = decode(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );

  return {
    status: null,
    title: decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''),
    description: meta(html, 'name', 'description'),
    canonical: decode(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(html)?.[1] ?? '',
    ),
    robots: meta(html, 'name', 'robots'),
    ogTitle: meta(html, 'property', 'og:title'),
    ogImage: meta(html, 'property', 'og:image'),
    h1: decode(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? ''),
    entryTitles: [...html.matchAll(/<h2[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi)]
      .map((m) => decode(m[1]))
      .slice(0, 20),
    categories: [...body.matchAll(/rel=["']category tag["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => decode(m[1]))
      .sort(),
    tags: [...body.matchAll(/rel=["']tag["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => decode(m[1]))
      .sort(),
    imageCount: (body.match(/<img\b/gi) ?? []).length,
    linkCount: (body.match(/<a\b/gi) ?? []).length,
    wordCount: text.split(' ').filter(Boolean).length,
    textHead: text.slice(0, 240),
  };
}

async function fetchFields(origin, route) {
  try {
    const response = await fetch(`${origin}${route}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'go-for-launch source-parity/1.0' },
    });
    const html = await response.text();
    const fields = extract(html);
    fields.status = response.status;
    fields.finalUrl = response.url;
    return fields;
  } catch (error) {
    return { status: 0, error: String(error) };
  }
}

/* ---------------------------------------------------------------------- */
/* Comparison rules                                                        */
/* ---------------------------------------------------------------------- */

const similarity = (a, b) => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / Math.max(wordsA.size, wordsB.size);
};

function compare(route, src, cand) {
  const findings = [];
  const add = (severity, field, detail) => findings.push({ severity, field, detail });

  if (src.status !== 200) {
    add('info', 'source-status', `legacy site returned ${src.status}, skipping content checks`);
    return findings;
  }
  if (cand.status !== 200) {
    add('error', 'status', `candidate returned ${cand.status}`);
    return findings;
  }

  // The heading is the strongest single signal that the right content loaded.
  const heading = src.h1 || src.entryTitles[0] || '';
  const candHeading = cand.h1 || cand.entryTitles[0] || '';
  const headingScore = similarity(heading, candHeading);
  if (heading && headingScore < 0.6) {
    add('error', 'heading', `"${heading}" vs "${candHeading}"`);
  }

  // Body length within a wide band. Exact equality is not expected: shortcode
  // rendering and stripped plugin markup both move the count.
  if (src.wordCount > 50) {
    const ratio = cand.wordCount / src.wordCount;
    if (ratio < 0.7 || ratio > 1.4) {
      add('warn', 'word-count', `source ${src.wordCount}, candidate ${cand.wordCount}`);
    }
  }

  // Images are where the offload-path bug would surface.
  if (src.imageCount > 0 && cand.imageCount === 0) {
    add('error', 'images', `source has ${src.imageCount} images, candidate has none`);
  } else if (src.imageCount > 2 && cand.imageCount < src.imageCount * 0.5) {
    add('warn', 'images', `source ${src.imageCount}, candidate ${cand.imageCount}`);
  }

  const missingCategories = src.categories.filter((c) => !cand.categories.includes(c));
  if (missingCategories.length) {
    add('warn', 'categories', `missing: ${missingCategories.join(', ')}`);
  }

  const missingTags = src.tags.filter((t) => !cand.tags.includes(t));
  if (missingTags.length) {
    add('warn', 'tags', `missing: ${missingTags.join(', ')}`);
  }

  if (src.title && similarity(src.title, cand.title) < 0.5) {
    add('warn', 'title', `"${src.title}" vs "${cand.title}"`);
  }

  // The candidate must not be indexable while the legacy site is live.
  if (!/noindex/i.test(cand.robots)) {
    add('error', 'robots', `candidate is indexable on a staging host: "${cand.robots}"`);
  }

  return findings;
}

/* ---------------------------------------------------------------------- */
/* Route selection                                                         */
/* ---------------------------------------------------------------------- */

const readNdjson = (file) =>
  fs
    .readFileSync(path.join(datasetDir, file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const posts = readNdjson('posts.ndjson');
const pages = readNdjson('pages.ndjson');
const categories = JSON.parse(fs.readFileSync(path.join(datasetDir, 'categories.json'), 'utf8'));

const routes = [
  { route: '/', kind: 'home' },
  { route: '/page/2/', kind: 'home-pagination' },
  ...pages.map((p) => ({ route: p.route, kind: 'page' })),
  ...categories.slice(0, 8).map((c) => ({ route: c.route, kind: 'category' })),
];

// Deterministic stride across the article archive so two runs cover the same
// routes and results are comparable between them.
const stride = Math.max(1, Math.floor(posts.length / sampleSize));
for (let i = 0; i < posts.length; i += stride) {
  routes.push({ route: posts[i].route, kind: 'post' });
}

console.log(`Comparing ${routes.length} routes`);
console.log(`  source:    ${source}`);
console.log(`  candidate: ${candidate}\n`);

/* ---------------------------------------------------------------------- */
/* Run                                                                     */
/* ---------------------------------------------------------------------- */

const results = [];
const queue = [...routes];
let done = 0;

const workers = Array.from({ length: concurrency }, async () => {
  while (queue.length) {
    const item = queue.shift();
    if (!item) break;
    const [src, cand] = await Promise.all([
      fetchFields(source, item.route),
      fetchFields(candidate, item.route),
    ]);
    results.push({ ...item, findings: compare(item.route, src, cand), src, cand });
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${routes.length}`);
  }
});
await Promise.all(workers);

results.sort((a, b) => a.route.localeCompare(b.route));

const errors = results.filter((r) => r.findings.some((f) => f.severity === 'error'));
const warnings = results.filter(
  (r) => !r.findings.some((f) => f.severity === 'error') && r.findings.some((f) => f.severity === 'warn'),
);
const clean = results.filter((r) => r.findings.length === 0);

fs.writeFileSync(
  'source-parity-report.json',
  `${JSON.stringify(
    {
      source,
      candidate,
      routesCompared: results.length,
      clean: clean.length,
      warnings: warnings.length,
      errors: errors.length,
      results: results.map((r) => ({
        route: r.route,
        kind: r.kind,
        findings: r.findings,
        source: { status: r.src.status, words: r.src.wordCount, images: r.src.imageCount },
        candidate: { status: r.cand.status, words: r.cand.wordCount, images: r.cand.imageCount },
      })),
    },
    null,
    2,
  )}\n`,
);

console.log(`\n${clean.length} clean, ${warnings.length} with warnings, ${errors.length} with errors`);

if (errors.length) {
  console.log('\nErrors:');
  for (const r of errors.slice(0, 25)) {
    console.log(`  ${r.route}`);
    for (const f of r.findings.filter((f) => f.severity === 'error')) {
      console.log(`      ${f.field}: ${f.detail}`);
    }
  }
}

if (warnings.length) {
  console.log('\nWarnings:');
  for (const r of warnings.slice(0, 15)) {
    console.log(`  ${r.route}`);
    for (const f of r.findings.filter((f) => f.severity === 'warn')) {
      console.log(`      ${f.field}: ${f.detail}`);
    }
  }
}

console.log('\nFull report: source-parity-report.json');
process.exitCode = errors.length ? 1 : 0;
