#!/usr/bin/env node
/**
 * verify-aeo.mjs
 * Go for Launch: Agent-Facing Discovery Signals Verifier
 *
 * Checks the built candidate for agent-facing discovery signals:
 *   - llms.txt present in the build root and structurally valid
 *   - _headers file advertises llms.txt and sitemap.xml via Link headers
 *   - (with --live) Live HTTP check for Link response header on the site root
 *
 * Usage:
 *   node scripts/verify-aeo.mjs --dir=dist --site=https://www.example.com
 *   node scripts/verify-aeo.mjs --dir=dist --site=https://www.example.com --live
 *   node scripts/verify-aeo.mjs --dir=dist --site=https://www.example.com --report=aeo-report.json
 *
 * Exit codes:
 *   0  All required checks passed (warnings may still be present)
 *   1  One or more required checks failed (blockers present)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import { URL } from 'url';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) { result[arg.slice(2)] = true; }
    else { result[arg.slice(2, eq)] = arg.slice(eq + 1); }
  }
  return result;
}

const args = parseArgs(process.argv);
const dir = args.dir ?? 'dist';
const site = args.site ?? null;
const runLive = args.live === true || args.live === 'true';
const reportPath = args.report ?? null;

const report = {
  timestamp: new Date().toISOString(),
  dir,
  site,
  llmsTxt: {
    path: null,
    exists: false,
    valid: false,
    issues: [],
  },
  linkHeaders: {
    path: null,
    exists: false,
    hasLlmsTxt: false,
    hasSitemap: false,
    issues: [],
  },
  liveCheck: runLive
    ? {
        url: site,
        performed: false,
        statusCode: null,
        hasLinkHeader: false,
        linkHeaderValue: null,
        issues: [],
      }
    : { skipped: true, reason: 'Pass --live to enable live HTTP checks.' },
  passed: false,
  blockers: [],
  warnings: [],
};

// --- Check llms.txt ---

const llmsCandidates = [
  join(dir, 'llms.txt'),
  join(dir, '.well-known', 'llms.txt'),
];
let llmsPath = null;
for (const candidate of llmsCandidates) {
  if (existsSync(candidate)) {
    llmsPath = candidate;
    break;
  }
}

if (!llmsPath) {
  report.llmsTxt.exists = false;
  report.llmsTxt.issues.push(
    'llms.txt not found. Expected at ' + join(dir, 'llms.txt') + '.'
  );
  report.warnings.push(
    'llms.txt is missing from the build output. ' +
    'Add public/llms.txt using templates/llms.txt as a starting point, then rebuild.'
  );
} else {
  report.llmsTxt.path = llmsPath;
  report.llmsTxt.exists = true;
  const content = readFileSync(llmsPath, 'utf8').trim();
  if (content.length === 0) {
    report.llmsTxt.issues.push('llms.txt exists but is empty.');
    report.blockers.push(
      'llms.txt is empty. Populate it using templates/llms.txt before staging.'
    );
  } else {
    const lines = content.split('\n');
    const hasH1 = lines.some(l => /^#\s+\S/.test(l));
    const hasAbout = /^##\s+about/im.test(content);
    if (!hasH1) {
      report.llmsTxt.issues.push(
        'llms.txt does not contain a level-one heading (# Organization Name).'
      );
      report.blockers.push(
        'llms.txt is missing a required level-one heading.'
      );
    }
    if (!hasAbout) {
      report.llmsTxt.issues.push(
        'llms.txt does not include an ## About section.'
      );
      report.warnings.push(
        'llms.txt is missing an ## About section. Add one to describe the organization.'
      );
    }
    if (hasH1) {
      report.llmsTxt.valid = true;
    }
  }
}

// --- Check _headers ---

const headersPath = join(dir, '_headers');
if (!existsSync(headersPath)) {
  report.linkHeaders.exists = false;
  report.linkHeaders.issues.push(
    '_headers file not found at ' + headersPath + '.'
  );
  report.warnings.push(
    '_headers file missing. ' +
    'Create public/_headers with Link headers for llms.txt and sitemap.xml.'
  );
} else {
  report.linkHeaders.path = headersPath;
  report.linkHeaders.exists = true;
  const headersContent = readFileSync(headersPath, 'utf8');

  report.linkHeaders.hasLlmsTxt =
    /rel=["']describedby["']/i.test(headersContent) &&
    /llms\.txt/i.test(headersContent);

  report.linkHeaders.hasSitemap =
    /rel=["']sitemap["']/i.test(headersContent);

  if (!report.linkHeaders.hasLlmsTxt) {
    report.linkHeaders.issues.push(
      '_headers does not include Link for llms.txt with rel="describedby".'
    );
    report.warnings.push(
      'Add to _headers: Link: </llms.txt>; rel="describedby"; type="text/plain"'
    );
  }
  if (!report.linkHeaders.hasSitemap) {
    report.linkHeaders.issues.push(
      '_headers does not include Link for sitemap.xml with rel="sitemap".'
    );
    report.warnings.push(
      'Add to _headers: Link: </sitemap.xml>; rel="sitemap"'
    );
  }
}

// --- Live HTTP check ---

function fetchResponse(url) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(new Error('Invalid URL: ' + url));
    }
    const getter = parsed.protocol === 'https:' ? httpsGet : httpGet;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + (parsed.search || ''),
      headers: {
        Accept: 'text/html',
        'User-Agent': 'go-for-launch-aeo-verifier/1.0',
      },
    };
    const req = getter(options, res => {
      res.resume();
      resolve({ statusCode: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out after 10 seconds.'));
    });
  });
}

async function runLiveCheck() {
  if (!site) {
    report.liveCheck = { skipped: true, reason: 'No --site URL provided.' };
    return;
  }
  try {
    const { statusCode, headers } = await fetchResponse(site);
    report.liveCheck.performed = true;
    report.liveCheck.statusCode = statusCode;
    const linkRaw = headers['link'] ?? null;
    report.liveCheck.linkHeaderValue = linkRaw;
    if (linkRaw) {
      report.liveCheck.hasLinkHeader = true;
      if (!/llms\.txt/i.test(linkRaw)) {
        report.liveCheck.issues.push(
          'Link header present but does not reference llms.txt.'
        );
        report.warnings.push(
          'Live check: Link header is present but missing llms.txt reference.'
        );
      }
    } else {
      report.liveCheck.hasLinkHeader = false;
      report.liveCheck.issues.push(
        'No Link response header found on the site root.'
      );
      report.warnings.push(
        'Live check: No Link header on ' + site + '. ' +
        'Verify _headers is deployed correctly and Cloudflare Pages is serving it.'
      );
    }
  } catch (err) {
    report.liveCheck.performed = false;
    report.liveCheck.issues.push('Live check failed: ' + err.message);
    report.warnings.push('Live check could not complete: ' + err.message);
  }
}

// --- Output ---

function label(ok) {
  return ok ? 'PASS' : 'FAIL';
}

function printReport() {
  process.stdout.write('\nverify-aeo results\n');
  process.stdout.write('==================\n\n');

  process.stdout.write('llms.txt\n');
  process.stdout.write(
    '  exists : ' + label(report.llmsTxt.exists) + '\n'
  );
  if (report.llmsTxt.exists) {
    process.stdout.write(
      '  valid  : ' + label(report.llmsTxt.valid) + '\n'
    );
    process.stdout.write('  path   : ' + report.llmsTxt.path + '\n');
  }
  for (const issue of report.llmsTxt.issues) {
    process.stdout.write('  issue  : ' + issue + '\n');
  }

  process.stdout.write('\n_headers\n');
  process.stdout.write(
    '  exists     : ' + label(report.linkHeaders.exists) + '\n'
  );
  if (report.linkHeaders.exists) {
    process.stdout.write(
      '  llms.txt   : ' + label(report.linkHeaders.hasLlmsTxt) + '\n'
    );
    process.stdout.write(
      '  sitemap    : ' + label(report.linkHeaders.hasSitemap) + '\n'
    );
  }
  for (const issue of report.linkHeaders.issues) {
    process.stdout.write('  issue      : ' + issue + '\n');
  }

  if (!report.liveCheck.skipped) {
    process.stdout.write('\nLive HTTP check\n');
    if (report.liveCheck.performed) {
      process.stdout.write(
        '  status     : ' + report.liveCheck.statusCode + '\n'
      );
      process.stdout.write(
        '  Link header: ' + label(report.liveCheck.hasLinkHeader) + '\n'
      );
      if (report.liveCheck.linkHeaderValue) {
        process.stdout.write(
          '  value      : ' + report.liveCheck.linkHeaderValue + '\n'
        );
      }
    } else {
      process.stdout.write('  performed  : false\n');
    }
    for (const issue of report.liveCheck.issues) {
      process.stdout.write('  issue      : ' + issue + '\n');
    }
  }

  if (report.blockers.length > 0) {
    process.stdout.write('\nBlockers (must fix before staging):\n');
    for (const b of report.blockers) {
      process.stdout.write('  [BLOCK] ' + b + '\n');
    }
  }

  if (report.warnings.length > 0) {
    process.stdout.write('\nWarnings (triage before release):\n');
    for (const w of report.warnings) {
      process.stdout.write('  [WARN]  ' + w + '\n');
    }
  }

  process.stdout.write('\nResult: ' + (report.passed ? 'PASS' : 'FAIL') + '\n\n');
}

async function main() {
  if (runLive) {
    await runLiveCheck();
  }

  report.passed = report.blockers.length === 0;

  printReport();

  if (reportPath) {
    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      process.stdout.write('Report written to ' + reportPath + '\n');
    } catch (err) {
      process.stderr.write(
        'verify-aeo: could not write report: ' + err.message + '\n'
      );
    }
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch(err => {
  process.stderr.write(
    'verify-aeo: unexpected error: ' + err.message + '\n'
  );
  process.exit(1);
});
