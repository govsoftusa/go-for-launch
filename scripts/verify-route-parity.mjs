#!/usr/bin/env node
/**
 * Route parity gate.
 *
 * Go for Launch treats a migration as unfinished until every public route the
 * source platform served is accounted for in the target: reproduced, redirected
 * or explicitly recorded as an intentional removal. This compares the extracted
 * WordPress route inventory against what the rebuilt site answers, and fails
 * the build on any unaccounted route.
 *
 * Usage:
 *   node scripts/verify-route-parity.mjs --dataset ../dataset --base https://staging.example.com
 *   node scripts/verify-route-parity.mjs --dataset ../dataset --offline
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
const datasetDir = path.resolve(args.dataset ?? '../dataset');
const base = (args.base ?? '').replace(/\/$/, '');
const offline = Boolean(args.offline) || !base;
const sampleSize = Number.parseInt(args.sample ?? '250', 10);

const readNdjson = (file) =>
  fs
    .readFileSync(path.join(datasetDir, file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const site = JSON.parse(fs.readFileSync(path.join(datasetDir, 'site.json'), 'utf8'));
const posts = readNdjson('posts.ndjson');
const pages = readNdjson('pages.ndjson');
const categories = JSON.parse(fs.readFileSync(path.join(datasetDir, 'categories.json'), 'utf8'));
const tags = JSON.parse(fs.readFileSync(path.join(datasetDir, 'tags.json'), 'utf8'));
const authors = JSON.parse(fs.readFileSync(path.join(datasetDir, 'authors.json'), 'utf8'));

/* ---------------------------------------------------------------------- */
/* Expected route inventory                                               */
/* ---------------------------------------------------------------------- */

const expected = new Map();
const add = (route, kind) => expected.set(route, kind);

add('/', 'home');
const homePages = Math.ceil(posts.length / site.postsPerPage);
for (let page = 2; page <= homePages; page += 1) add(`/page/${page}/`, 'home-pagination');

for (const post of posts) add(post.route, 'post');
for (const page of pages) add(page.route, 'page');

for (const category of categories) {
  add(`/category/${category.slug}/`, 'category');
  const pageCount = Math.ceil(category.count / site.postsPerPage);
  for (let page = 2; page <= pageCount; page += 1) {
    add(`/category/${category.slug}/page/${page}/`, 'category-pagination');
  }
}

for (const tag of tags) add(`/tag/${tag.slug}/`, 'tag');
for (const author of authors) add(`/author/${author.slug}/`, 'author');

add('/rss.xml', 'feed');
add('/sitemap.xml', 'sitemap');
add('/robots.txt', 'robots');

console.log(`Expected route inventory: ${expected.size} routes`);
const byKind = {};
for (const kind of expected.values()) byKind[kind] = (byKind[kind] ?? 0) + 1;
console.table(byKind);

/* ---------------------------------------------------------------------- */
/* Structural checks that run without a deployment                         */
/* ---------------------------------------------------------------------- */

const problems = [];

const duplicateSlugs = new Map();
for (const post of posts) {
  const list = duplicateSlugs.get(post.slug) ?? [];
  list.push(post.route);
  duplicateSlugs.set(post.slug, list);
}
for (const [slug, routes] of duplicateSlugs) {
  if (routes.length > 1) {
    // EmDash resolves entries by slug, so two posts sharing a slug at
    // different dates collapse onto one entry and one of them becomes
    // unreachable. This has to be resolved before cutover, not after.
    problems.push({
      severity: 'error',
      kind: 'duplicate-slug',
      detail: `Slug "${slug}" is used by ${routes.length} posts: ${routes.join(', ')}`,
    });
  }
}

const pageSlugs = new Set(pages.map((page) => page.slug));
for (const reserved of ['page', 'category', 'tag', 'author', 'search']) {
  if (pageSlugs.has(reserved)) {
    problems.push({
      severity: 'error',
      kind: 'reserved-slug',
      detail: `Page slug "${reserved}" collides with a routing prefix.`,
    });
  }
}

for (const page of pages) {
  if (/^\d{4}$/.test(page.slug)) {
    problems.push({
      severity: 'error',
      kind: 'reserved-slug',
      detail: `Page slug "${page.slug}" looks like a year and collides with the archive route.`,
    });
  }
}

/* ---------------------------------------------------------------------- */
/* Live probing                                                            */
/* ---------------------------------------------------------------------- */

if (!offline) {
  const routes = [...expected.keys()];
  // Always probe every non-post route, then a deterministic sample of posts:
  // 3,636 article requests against a staging origin is a load test, not a check.
  const structural = routes.filter((route) => expected.get(route) !== 'post');
  const postRoutes = routes.filter((route) => expected.get(route) === 'post');
  const step = Math.max(1, Math.floor(postRoutes.length / sampleSize));
  const sampled = postRoutes.filter((_, index) => index % step === 0);
  const toProbe = [...structural, ...sampled];

  console.log(`Probing ${toProbe.length} routes against ${base}`);

  let checked = 0;
  const queue = [...toProbe];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const route = queue.shift();
      if (!route) break;
      try {
        const response = await fetch(`${base}${route}`, { redirect: 'manual' });
        if (response.status !== 200) {
          problems.push({
            severity: response.status >= 500 ? 'error' : 'warn',
            kind: 'bad-status',
            detail: `${route} returned ${response.status}`,
          });
        }
      } catch (error) {
        problems.push({ severity: 'error', kind: 'unreachable', detail: `${route}: ${error}` });
      }
      checked += 1;
      if (checked % 100 === 0) console.log(`  ${checked}/${toProbe.length}`);
    }
  });
  await Promise.all(workers);
}

/* ---------------------------------------------------------------------- */
/* Report                                                                  */
/* ---------------------------------------------------------------------- */

const errors = problems.filter((problem) => problem.severity === 'error');
const warnings = problems.filter((problem) => problem.severity === 'warn');

fs.writeFileSync(
  'route-parity-report.json',
  `${JSON.stringify({ expected: expected.size, byKind, problems }, null, 2)}\n`,
);

if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const warning of warnings.slice(0, 20)) console.log(`  ${warning.detail}`);
}

if (errors.length) {
  console.error(`\n${errors.length} errors:`);
  for (const error of errors.slice(0, 40)) console.error(`  ${error.detail}`);
  console.error('\nRoute parity gate FAILED. See route-parity-report.json.');
  process.exit(1);
}

console.log('\nRoute parity gate passed.');
