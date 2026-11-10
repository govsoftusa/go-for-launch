#!/usr/bin/env node
/**
 * verify-agent-readiness.mjs
 * Go for Launch: Agent Readiness Verifier
 *
 * Checks a site against the list used by https://isitagentready.com/ without
 * sending the site to that scanner. Every check is marked required, optional,
 * or not-applicable in a project config, so a site is judged only on what it
 * truthfully offers:
 *   - required        must be published and valid
 *   - optional        may be left out, but must be valid when published
 *   - not-applicable  must carry a written reason, and fails if it is found
 *                     published anyway
 *
 * robots.txt, the sitemap, llms.txt, and the _headers Link entries are checked
 * by running verify-sitemap.mjs and verify-aeo.mjs. This script adds the rest.
 *
 * Usage:
 *   node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs
 *   node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs --dir=dist --site=https://www.example.com
 *   node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs --live --live-url=https://staging.example.com
 *   node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs --report=artifacts/agent-readiness-report.json
 *
 * Markdown negotiation, DNS records, payment responses, and response headers
 * need a running site. Without --live they are reported as "not checked".
 *
 * Exit codes:
 *   0  No blockers. Read the report for checks that were not run.
 *   1  A required check failed, a published file is invalid, a check marked
 *      not-applicable is published anyway, or the config is incomplete.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CHECKS,
  DOCUMENTS,
  SCANNER_LINK_RELATIONS,
  checkAiBotRules,
  checkContentSignals,
  evaluateDocument,
  findWebMcp,
  parseLinkHeader,
  validateConfig
} from "./lib/agent-readiness.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const userAgent = "go-for-launch-agent-readiness-verifier/1.0";

function parseArgs(argv) {
  const result = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) result[arg.slice(2)] = true;
    else result[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return result;
}

async function loadConfig(path) {
  const absolute = resolve(path);
  if (absolute.endsWith(".json")) return JSON.parse(readFileSync(absolute, "utf8"));
  return (await import(`${pathToFileURL(absolute).href}?v=${Date.now()}`)).default;
}

function stop(message, reportPath, extra = {}) {
  process.stderr.write(`verify-agent-readiness: ${message}\n`);
  if (reportPath) writeReport(reportPath, { timestamp: new Date().toISOString(), passed: false, blockers: [message], ...extra });
  process.exit(1);
}

function writeReport(path, report) {
  try {
    mkdirSync(dirname(resolve(path)), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`Report written to ${path}\n`);
  } catch (err) {
    process.stderr.write(`verify-agent-readiness: could not write report: ${err.message}\n`);
  }
}

const args = parseArgs(process.argv);
if (!args.config || args.config === true) {
  stop("pass --config=<file>. Copy templates/agent-readiness.config.mjs into the project and review every check.", args.report);
}

let config;
try {
  config = await loadConfig(args.config);
} catch (err) {
  stop(`could not read the config: ${err.message}`, args.report);
}

const reportPath = args.report ?? config?.report ?? null;
const configErrors = validateConfig(config);
if (configErrors.length > 0) {
  for (const message of configErrors) process.stderr.write(`  [CONFIG] ${message}\n`);
  stop("the config is incomplete. No checks were run.", reportPath, { blockers: configErrors });
}

const dir = resolve(args.dir ?? config.outputDirectory ?? "dist");
const site = args.site ?? config.site ?? null;
const sitemapName = args.sitemap ?? config.sitemap ?? "sitemap.xml";
const runLive = args.live === true || args.live === "true";
const liveUrl = args["live-url"] ?? config.liveUrl ?? site;
const dnsResolver = config.dnsResolver ?? "https://cloudflare-dns.com/dns-query";
const maximumLiveRequests = config.maximumLiveRequests ?? 60;
const liveTimeoutMs = config.liveTimeoutMs ?? 10_000;

if (!site) stop("no site address. Set `site` in the config or pass --site=https://www.example.com.", reportPath);
if (!existsSync(dir)) stop(`the build directory ${dir} does not exist.`, reportPath);

const live = { enabled: runLive, url: runLive ? liveUrl : null, requests: 0, maximumRequests: maximumLiveRequests, requested: [] };
const liveCache = new Map();

// --- Reading the built output and the live site ----------------------------

function readBuild(path) {
  const file = join(dir, ...path.split("/").filter(Boolean));
  if (!existsSync(file) || !statSync(file).isFile()) return { found: false };
  return { found: true, text: readFileSync(file, "utf8"), contentType: "" };
}

async function liveGet(target, accept = "*/*") {
  const url = new URL(target, liveUrl).href;
  const key = `${accept} ${url}`;
  if (liveCache.has(key)) return liveCache.get(key);
  if (live.requests >= maximumLiveRequests) {
    throw new Error(`stopped at the limit of ${maximumLiveRequests} live requests`);
  }
  live.requests += 1;
  live.requested.push(url);
  const response = await fetch(url, {
    headers: { Accept: accept, "User-Agent": userAgent },
    redirect: "follow",
    signal: AbortSignal.timeout(liveTimeoutMs)
  });
  const record = {
    status: response.status,
    headers: response.headers,
    contentType: response.headers.get("content-type") || "",
    text: await response.text()
  };
  liveCache.set(key, record);
  return record;
}

async function readLive(path) {
  const response = await liveGet(path);
  if (response.status >= 500) throw new Error(`${path} answered HTTP ${response.status}`);
  return { found: response.status === 200, text: response.text, contentType: response.contentType };
}

function mediaType(response) {
  return response.contentType.split(";")[0].trim().toLowerCase();
}

// Run one live step and turn a network failure into a reportable result.
async function onLive(step) {
  try {
    return { place: "live", notes: [], problems: [], ...(await step()) };
  } catch (err) {
    return { place: "live", present: false, problems: [], notes: [], error: err.message };
  }
}

function inBuild(result) {
  return { place: "build", notes: [], problems: [], ...result };
}

// --- Checks already owned by other verifiers -------------------------------

function runSitemapVerifier() {
  const run = spawnSync(
    process.execPath,
    [join(scriptsDirectory, "verify-sitemap.mjs"), `--dir=${dir}`, `--site=${site}`, `--sitemap=${sitemapName}`],
    { encoding: "utf8" }
  );
  const lines = (run.stderr || "").split(/\r?\n/).filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
  if (run.status !== 0 && lines.length === 0) {
    const crash = [`verify-sitemap.mjs stopped unexpectedly: ${(run.stderr || "").trim() || `exit code ${run.status}`}`];
    return { robotsTxt: inBuild({ present: true, problems: crash }), sitemap: inBuild({ present: true, problems: crash }) };
  }
  const aboutRobots = lines.filter((line) => /robots\.txt/i.test(line));
  const aboutSitemap = lines.filter((line) => !/robots\.txt/i.test(line));
  return {
    robotsTxt: inBuild({ present: !lines.some((line) => line.startsWith("Missing dist/robots.txt")), problems: aboutRobots }),
    sitemap: inBuild({ present: !lines.some((line) => line.startsWith("Missing sitemap file")), problems: aboutSitemap })
  };
}

function runAeoVerifier() {
  const scratch = mkdtempSync(join(tmpdir(), "go-for-launch-agent-readiness-"));
  const aeoReport = join(scratch, "aeo-report.json");
  try {
    const run = spawnSync(
      process.execPath,
      [join(scriptsDirectory, "verify-aeo.mjs"), `--dir=${dir}`, `--site=${site}`, `--report=${aeoReport}`],
      { encoding: "utf8" }
    );
    if (!existsSync(aeoReport)) {
      const crash = [`verify-aeo.mjs stopped unexpectedly: ${(run.stderr || "").trim() || `exit code ${run.status}`}`];
      return { llmsTxt: inBuild({ present: true, problems: crash }), linkHeaders: inBuild({ present: true, problems: crash }) };
    }
    const aeo = JSON.parse(readFileSync(aeoReport, "utf8"));
    const linksPresent = aeo.linkHeaders.exists && (aeo.linkHeaders.hasLlmsTxt || aeo.linkHeaders.hasSitemap);
    // verify-aeo.mjs expects a Link entry for llms.txt. That only applies when
    // the site has an llms.txt or the config requires one.
    const llmsExpected = aeo.llmsTxt.exists || config.checks.llmsTxt.status === "required";
    const linkIssues = aeo.linkHeaders.issues.filter((issue) => llmsExpected || !/llms\.txt/i.test(issue));
    if (aeo.linkHeaders.hasLlmsTxt && !aeo.llmsTxt.exists) {
      linkIssues.push("The _headers file advertises llms.txt, but llms.txt is not in the built output.");
    }
    return {
      llmsTxt: inBuild({
        present: aeo.llmsTxt.exists,
        problems: aeo.llmsTxt.exists && !aeo.llmsTxt.valid ? aeo.llmsTxt.issues : [],
        notes: aeo.llmsTxt.valid ? aeo.llmsTxt.issues : []
      }),
      linkHeaders: inBuild({
        present: linksPresent,
        problems: linksPresent ? linkIssues : [],
        notes: linksPresent ? [] : linkIssues,
        advertises: { llmsTxt: aeo.linkHeaders.hasLlmsTxt, sitemap: aeo.linkHeaders.hasSitemap }
      })
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// --- Checks this script adds -----------------------------------------------

function liveLinkHeader(buildResult) {
  return onLive(async () => {
    const response = await liveGet("/", "text/html");
    const links = parseLinkHeader(response.headers.get("link"));
    const result = { present: links.length > 0, problems: [], notes: [] };
    if (!result.present) {
      result.notes.push(`${new URL("/", liveUrl).href} answered HTTP ${response.status} without a Link header.`);
      return result;
    }
    if (!links.some((link) => link.relations.some((relation) => SCANNER_LINK_RELATIONS.includes(relation)))) {
      result.notes.push(`The Link header uses none of the relation types the scanner's guidance lists: ${SCANNER_LINK_RELATIONS.join(", ")}.`);
    }
    if (buildResult?.advertises?.llmsTxt && !links.some((link) => /llms\.txt/i.test(link.target))) {
      result.problems.push("The built _headers file advertises llms.txt, but the live Link header does not.");
    }
    if (buildResult?.advertises?.sitemap && !links.some((link) => link.relations.includes("sitemap"))) {
      result.problems.push("The built _headers file advertises the sitemap, but the live Link header does not.");
    }
    return result;
  });
}

function robotsCheck(rule, options) {
  return {
    build: () => {
      const file = readBuild("/robots.txt");
      return inBuild(file.found ? rule(file.text, options) : { present: false, notes: ["robots.txt is not in the built output."] });
    },
    live: () =>
      onLive(async () => {
        const response = await liveGet("/robots.txt", "text/plain");
        if (response.status !== 200) return { present: false, notes: [`/robots.txt answered HTTP ${response.status}.`] };
        return rule(response.text, options);
      })
  };
}

function skillDigests(indexPath) {
  const problems = [];
  const notes = [];
  const index = JSON.parse(readBuild(indexPath).text);
  for (const skill of Array.isArray(index.skills) ? index.skills : []) {
    if (typeof skill?.url !== "string" || !/^sha256:[0-9a-f]{64}$/i.test(skill?.digest || "")) continue;
    let target;
    try {
      target = new URL(skill.url, new URL(indexPath, site));
    } catch {
      problems.push(`${skill.name} has an address that cannot be read: ${skill.url}`);
      continue;
    }
    if (target.origin !== new URL(site).origin) {
      notes.push(`${skill.name} is hosted on another site, so its digest was not compared.`);
      continue;
    }
    const file = resolve(dir, `.${decodeURIComponent(target.pathname)}`);
    if (relative(dir, file).startsWith("..") || !existsSync(file) || !statSync(file).isFile()) {
      problems.push(`${skill.name} points to ${target.pathname}, which is not in the built output.`);
      continue;
    }
    const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (digest !== skill.digest.slice("sha256:".length).toLowerCase()) {
      problems.push(`${skill.name} has a digest that does not match ${target.pathname}. Recalculate it after every change to the file.`);
    }
  }
  return { problems, notes };
}

function sourceFiles(directory, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if ([".html", ".js", ".mjs"].includes(extname(entry.name).toLowerCase())) found.push(path);
  }
  return found;
}

const webMcpCaveat = "The scanner detects WebMCP by loading the page in a browser. Reading the source is an approximation.";

function webMcpInBuild() {
  const hits = [];
  for (const file of sourceFiles(dir)) {
    if (statSync(file).size > 2_000_000) continue;
    const found = findWebMcp(readFileSync(file, "utf8"));
    if (found.length > 0) hits.push(`${relative(dir, file).split(sep).join("/")} (${found.join(", ")})`);
    if (hits.length === 5) break;
  }
  return inBuild({ present: hits.length > 0, notes: hits.length > 0 ? [`Found in ${hits.join("; ")}.`, webMcpCaveat] : [webMcpCaveat] });
}

function webMcpLive() {
  return onLive(async () => {
    const found = findWebMcp((await liveGet("/", "text/html")).text);
    return {
      present: found.length > 0,
      notes: [found.length > 0 ? `Home page source contains a ${found.join(" and a ")}.` : "Only the home page source was read; linked scripts were not fetched.", webMcpCaveat]
    };
  });
}

function markdownNegotiation(entry) {
  return onLive(async () => {
    const result = { present: false, problems: [], notes: [] };
    const refused = [];
    for (const path of entry.paths?.length ? entry.paths : ["/"]) {
      const markdown = await liveGet(path, "text/markdown");
      if (markdown.status === 200 && mediaType(markdown) === "text/markdown") {
        result.present = true;
        const tokens = markdown.headers.get("x-markdown-tokens");
        result.notes.push(tokens ? `${path} returned Markdown with x-markdown-tokens: ${tokens}.` : `${path} returned Markdown without the optional x-markdown-tokens header.`);
        const html = await liveGet(path, "text/html");
        if (mediaType(html) !== "text/html") {
          result.problems.push(`${path} must still return HTML when Markdown is not requested, but returned ${mediaType(html) || "no content type"}.`);
        }
      } else {
        refused.push(`${path} answered HTTP ${markdown.status} as ${mediaType(markdown) || "no content type"}`);
      }
    }
    if (result.present) result.problems.push(...refused.map((line) => `${line} when Markdown was requested.`));
    else result.notes.push(...refused.map((line) => `${line} when Markdown was requested.`));
    return result;
  });
}

function dnsAid(entry) {
  return onLive(async () => {
    const domain = entry.domain ?? new URL(site).hostname;
    const names = entry.names?.length ? entry.names : ["_index._agents", "_a2a._agents"];
    const records = [];
    for (const name of names) {
      for (const type of ["SVCB", "HTTPS"]) {
        const query = new URL(dnsResolver);
        query.searchParams.set("name", `${name}.${domain}`);
        query.searchParams.set("type", type);
        const response = await liveGet(query.href, "application/dns-json");
        if (response.status !== 200) throw new Error(`the DNS resolver answered HTTP ${response.status}`);
        const answers = (JSON.parse(response.text).Answer || []).filter((answer) => answer.type === 64 || answer.type === 65);
        if (answers.length > 0) records.push(`${name}.${domain} (${type})`);
      }
    }
    return {
      present: records.length > 0,
      notes: [records.length > 0 ? `Records found: ${records.join(", ")}.` : `No SVCB or HTTPS record at ${names.map((name) => `${name}.${domain}`).join(" or ")}.`]
    };
  });
}

function x402(entry) {
  return onLive(async () => {
    const result = { present: false, problems: [], notes: [] };
    const other = [];
    for (const path of entry.paths || []) {
      const response = await liveGet(path);
      if (response.status === 402) result.present = true;
      else other.push(`${path} answered HTTP ${response.status}, not 402 Payment Required.`);
    }
    (result.present ? result.problems : result.notes).push(...other);
    return result;
  });
}

// --- Decide each result ----------------------------------------------------

const placeLabel = { build: "Built output", live: "Live site" };

function decide(check, entry, places) {
  const item = {
    id: check.id,
    name: check.name,
    category: check.category,
    scoredByScanner: check.scored,
    verifiedBy: check.verifiedBy,
    status: entry.status,
    result: null,
    checkedIn: places.map((place) => place.place),
    problems: [],
    notes: []
  };
  if (entry.status === "not-applicable") item.reason = entry.reason;
  const label = (place, text) => `${placeLabel[place.place]}: ${text}`;
  const notes = places.flatMap((place) => place.notes.map((text) => label(place, text)));
  const failedRequests = places.filter((place) => place.error).map((place) => label(place, `could not be checked: ${place.error}.`));

  if (places.length === 0) {
    item.result = entry.status === "not-applicable" ? "not-applicable" : "not-checked";
    if (item.result === "not-checked") item.notes.push("Needs a running site. Run again with --live.");
    return item;
  }

  const publishedIn = places.filter((place) => place.present);
  if (entry.status === "not-applicable") {
    item.notes = [...notes, ...failedRequests];
    if (publishedIn.length > 0) {
      item.result = "fail";
      item.problems.push(`Marked not-applicable, but it is published in the ${publishedIn.map((place) => placeLabel[place.place].toLowerCase()).join(" and the ")}. Remove it, or change its status in the config.`);
    } else {
      item.result = "not-applicable";
    }
    return item;
  }

  if (failedRequests.length > 0) {
    item.result = "fail";
    item.problems = failedRequests;
    item.notes = notes;
    return item;
  }

  if (publishedIn.length === 0) {
    item.notes = notes;
    if (entry.status === "optional") {
      item.result = "absent";
      return item;
    }
    item.result = "fail";
    const explained = places.flatMap((place) => place.problems.map((text) => label(place, text)));
    item.problems = explained.length > 0 ? explained : [`${check.name} is required but is not published.`];
    return item;
  }

  item.notes = notes;
  item.problems = publishedIn.flatMap((place) => place.problems.map((text) => label(place, text)));
  const build = places.find((place) => place.place === "build");
  const liveSite = places.find((place) => place.place === "live");
  if (build?.present && liveSite && !liveSite.present) {
    item.problems.push("Live site: it is in the built output but the live site does not serve it.");
  }
  item.result = item.problems.length > 0 ? "fail" : "pass";
  return item;
}

async function evaluate(check, entry, delegated) {
  const wantsBuild = check.needs !== "live" && entry.liveOnly !== true;
  const wantsLive = runLive && check.needs !== "build";
  const places = [];
  const add = (place) => place && places.push(place);

  if (check.id in delegated) {
    if (wantsBuild) add(delegated[check.id]);
    if (check.id === "linkHeaders" && wantsLive) add(await liveLinkHeader(wantsBuild ? delegated.linkHeaders : null));
    return decide(check, entry, places);
  }

  if (check.id === "aiBotRules" || check.id === "contentSignals") {
    const rule = check.id === "aiBotRules" ? checkAiBotRules : checkContentSignals;
    const run = robotsCheck(rule, entry);
    if (wantsBuild) add(run.build());
    if (wantsLive) add(await run.live());
    return decide(check, entry, places);
  }

  if (check.id === "webMcp") {
    if (wantsBuild) add(webMcpInBuild());
    if (wantsLive) add(await webMcpLive());
    return decide(check, entry, places);
  }

  if (check.id === "markdownNegotiation" && wantsLive) add(await markdownNegotiation(entry));
  if (check.id === "dnsAid" && wantsLive) add(await dnsAid(entry));
  if (check.id === "x402" && wantsLive) add(await x402(entry));

  const definition = DOCUMENTS[check.id];
  if (definition) {
    if (wantsBuild) {
      const built = inBuild(await evaluateDocument(definition, readBuild, "build"));
      if (built.present && built.problems.length === 0 && check.id === "agentSkills") {
        const digests = skillDigests(built.path);
        built.problems.push(...digests.problems);
        built.notes.push(...digests.notes);
      }
      if (built.present && check.id === "llmsFullTxt") {
        const llms = readBuild("/llms.txt");
        if (llms.found && !/llms-full\.txt/i.test(llms.text)) built.problems.push("llms.txt does not link to llms-full.txt.");
      }
      add(built);
    }
    if (wantsLive) add(await onLive(() => evaluateDocument(definition, readLive, "live")));
  }
  return decide(check, entry, places);
}

// --- Output ----------------------------------------------------------------

const resultLabel = {
  pass: "PASS",
  fail: "FAIL",
  absent: "NOT PUBLISHED (optional)",
  "not-applicable": "NOT APPLICABLE",
  "not-checked": "NOT CHECKED"
};

function printReport(report) {
  process.stdout.write("\nverify-agent-readiness results\n");
  process.stdout.write("==============================\n");
  let category = null;
  for (const item of report.checks) {
    if (item.category !== category) {
      category = item.category;
      process.stdout.write(`\n${category}\n`);
    }
    process.stdout.write(`  ${item.name}: ${resultLabel[item.result]}\n`);
    if (item.reason) process.stdout.write(`    reason  : ${item.reason}\n`);
    for (const problem of item.problems) process.stdout.write(`    problem : ${problem}\n`);
    for (const note of item.notes) process.stdout.write(`    note    : ${note}\n`);
  }
  if (report.blockers.length > 0) {
    process.stdout.write("\nBlockers (must fix before staging):\n");
    for (const blocker of report.blockers) process.stdout.write(`  [BLOCK] ${blocker}\n`);
  }
  if (report.warnings.length > 0) {
    process.stdout.write("\nWarnings (triage before release):\n");
    for (const warning of report.warnings) process.stdout.write(`  [WARN]  ${warning}\n`);
  }
  if (report.live.enabled) process.stdout.write(`\nLive requests: ${report.live.requests} of at most ${report.live.maximumRequests}\n`);
  process.stdout.write(`\nResult: ${report.passed ? "PASS" : "FAIL"}${report.passed && !report.complete ? " for the checks that were run" : ""}\n\n`);
}

async function main() {
  const status = (id) => config.checks[id].status;
  const delegated = {};
  const buildWanted = (id) => config.checks[id].liveOnly !== true;
  if (buildWanted("robotsTxt") || buildWanted("sitemap")) Object.assign(delegated, runSitemapVerifier());
  else Object.assign(delegated, { robotsTxt: null, sitemap: null });
  if (buildWanted("llmsTxt") || buildWanted("linkHeaders")) Object.assign(delegated, runAeoVerifier());
  else Object.assign(delegated, { llmsTxt: null, linkHeaders: null });

  const checks = [];
  for (const check of CHECKS) checks.push(await evaluate(check, config.checks[check.id], delegated));

  const count = (result) => checks.filter((item) => item.result === result).length;
  const notChecked = checks.filter((item) => item.result === "not-checked");
  const report = {
    timestamp: new Date().toISOString(),
    scannerListReadOn: "2026-11-10",
    config: resolve(args.config),
    dir,
    site,
    live,
    checks,
    summary: {
      pass: count("pass"),
      fail: count("fail"),
      notPublished: count("absent"),
      notApplicable: count("not-applicable"),
      notChecked: notChecked.length
    },
    complete: notChecked.length === 0,
    passed: false,
    blockers: checks.filter((item) => item.result === "fail").flatMap((item) => item.problems.map((problem) => `${item.name}: ${problem}`)),
    warnings: notChecked.map((item) => `${item.name} (${status(item.id)}) was not checked because it needs a running site. Run again with --live.`)
  };
  report.passed = report.blockers.length === 0;

  printReport(report);
  if (reportPath) writeReport(reportPath, report);
  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`verify-agent-readiness: unexpected error: ${err.message}\n`);
  process.exit(1);
});
