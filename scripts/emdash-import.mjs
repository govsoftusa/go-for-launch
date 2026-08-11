#!/usr/bin/env node
/**
 * Bulk-imports migrated content into a running EmDash instance over its REST
 * API.
 *
 * EmDash applies `seed/seed.json` at first boot and inlines it into the build,
 * which makes it the wrong carrier for several thousand articles: a seed file
 * holding this archive would be tens of megabytes shipped in every deploy. The
 * admin WordPress importer is the other supported path, and it is interactive,
 * browser-parsed and not reproducible from a script.
 *
 * This closes that gap. It is idempotent: every entry carries its originating
 * WordPress ID in `legacy_id`, and an entry that already exists is updated
 * rather than duplicated, so an interrupted run can simply be repeated.
 *
 * Usage:
 *   EMDASH_URL=https://staging.example.com \
 *   EMDASH_TOKEN=... \
 *   node scripts/emdash-import.mjs --file content/posts.ndjson --collection posts
 */

import fs from 'node:fs';
import readline from 'node:readline';
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
const file = args.file ?? 'content/posts.ndjson';
const collection = args.collection ?? 'posts';
const baseUrl = (args.url ?? process.env.EMDASH_URL ?? '').replace(/\/$/, '');
const token = args.token ?? process.env.EMDASH_TOKEN ?? '';
const concurrency = Number.parseInt(args.concurrency ?? '4', 10);
const dryRun = Boolean(args['dry-run']);
const limit = args.limit ? Number.parseInt(args.limit, 10) : Infinity;

if (!baseUrl) {
  console.error('Set EMDASH_URL (or pass --url) to the target site origin.');
  process.exit(1);
}
if (!token && !dryRun) {
  console.error('Set EMDASH_TOKEN (or pass --token) to an admin API token.');
  process.exit(1);
}

const endpoint = `${baseUrl}/_emdash/api/collections/${collection}/entries`;
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};

const stats = { created: 0, updated: 0, failed: 0, skipped: 0 };
const failures = [];

async function upsert(entry) {
  if (dryRun) {
    stats.skipped += 1;
    return;
  }

  // Match on the WordPress ID rather than the slug. Slugs were edited over the
  // years; the post ID never changed, so it is the only stable identity.
  const lookup = new URL(endpoint);
  lookup.searchParams.set('where[legacy_id]', String(entry.data.legacy_id));
  lookup.searchParams.set('limit', '1');

  let existingId = null;
  try {
    const response = await fetch(lookup, { headers });
    if (response.ok) {
      const body = await response.json();
      existingId = body?.entries?.[0]?.id ?? null;
    }
  } catch {
    /* fall through to create */
  }

  const target = existingId ? `${endpoint}/${existingId}` : endpoint;
  const method = existingId ? 'PATCH' : 'POST';

  const response = await fetch(target, {
    method,
    headers,
    body: JSON.stringify({
      slug: entry.slug,
      status: entry.status,
      data: entry.data,
      bylines: entry.bylines,
      taxonomies: entry.taxonomies,
    }),
  });

  if (!response.ok) {
    stats.failed += 1;
    failures.push({
      legacyId: entry.data.legacy_id,
      slug: entry.slug,
      status: response.status,
      body: (await response.text()).slice(0, 300),
    });
    return;
  }

  if (existingId) stats.updated += 1;
  else stats.created += 1;
}

/** Bounded parallelism: enough to saturate the API, not enough to trip limits. */
async function run() {
  const stream = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });

  const inFlight = new Set();
  let processed = 0;

  for await (const line of stream) {
    if (!line.trim()) continue;
    if (processed >= limit) break;
    processed += 1;

    const entry = JSON.parse(line);
    const task = upsert(entry).finally(() => inFlight.delete(task));
    inFlight.add(task);

    if (inFlight.size >= concurrency) await Promise.race(inFlight);
    if (processed % 100 === 0) {
      console.log(
        `${processed} processed (created ${stats.created}, updated ${stats.updated}, failed ${stats.failed})`,
      );
    }
  }

  await Promise.all(inFlight);

  console.log('\nImport complete');
  console.table(stats);

  if (failures.length) {
    fs.writeFileSync('import-failures.json', `${JSON.stringify(failures, null, 2)}\n`);
    console.error(
      `${failures.length} entries failed. Details in import-failures.json. ` +
        'Re-running this command retries them without duplicating successes.',
    );
    process.exitCode = 1;
  }
}

await run();
