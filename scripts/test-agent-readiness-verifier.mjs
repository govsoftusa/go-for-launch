import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { log } from "node:console";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { CHECKS, validateConfig } from "./lib/agent-readiness.mjs";
import template from "../templates/agent-readiness.config.mjs";

const verifier = new URL("./verify-agent-readiness.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-agent-readiness-test-"));
const site = "https://www.example.com";
const signals = { "ai-train": "no", search: "yes", "ai-input": "yes" };
const linkHeader = '</llms.txt>; rel="describedby"; type="text/plain", </sitemap.xml>; rel="sitemap"';

function fail(message, run) {
  throw new Error(`${message}${run ? `\n${run.stdout}${run.stderr}` : ""}`);
}

function put(directory, path, content) {
  const file = join(directory, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`);
}

function page(route, body = "") {
  return `<!doctype html><html lang="en"><head><title>Example</title><link rel="canonical" href="${site}${route}"></head><body><h1>Example</h1>${body}</body></html>`;
}

// A site with only the files an informational site normally has.
function brochureSite(name) {
  const directory = join(root, name);
  put(directory, "index.html", page("/"));
  put(directory, "about/index.html", page("/about/"));
  put(directory, "sitemap.xml", `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url><url><loc>${site}/about/</loc></url></urlset>`);
  put(directory, "robots.txt", `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  put(directory, "llms.txt", "# Example\n\n> Public information from Example.\n\n## About\n\nExample publishes public information.\n");
  put(directory, "_headers", '/*\n  Link: </llms.txt>; rel="describedby"; type="text/plain"\n  Link: </sitemap.xml>; rel="sitemap"\n');
  return directory;
}

// A site that publishes every item on the scanner's list.
function completeSite(name) {
  const directory = brochureSite(name);
  const skill = "# Site guide\n\nHow to find public information on this site.\n";
  put(directory, "index.html", page("/", '<form toolname="search-site" tooldescription="Search the site"><input name="q" toolparamdescription="Words to search for"></form>'));
  put(directory, "robots.txt", `User-agent: *\nContent-Signal: ai-train=no, search=yes, ai-input=yes\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  put(directory, "llms.txt", `# Example\n\n> Public information from Example.\n\n## About\n\nExample publishes public information.\n\n## Content\n\n- [Full text](${site}/llms-full.txt): every page in one file.\n`);
  put(directory, "llms-full.txt", "# Example\n\nThe complete public text of the site.\n");
  put(directory, "auth.md", "# auth.md for Example\n\nAgents register through the protected resource metadata.\n");
  put(directory, ".well-known/http-message-signatures-directory", { keys: [{ kty: "OKP", crv: "Ed25519", x: "JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs" }] });
  put(directory, ".well-known/api-catalog", { linkset: [{ anchor: `${site}/api/`, "service-desc": [{ href: `${site}/openapi.json` }] }] });
  put(directory, ".well-known/openid-configuration", {
    issuer: site,
    authorization_endpoint: `${site}/authorize`,
    token_endpoint: `${site}/token`,
    jwks_uri: `${site}/jwks`,
    grant_types_supported: ["authorization_code"],
    response_types_supported: ["code"]
  });
  put(directory, ".well-known/oauth-protected-resource", { resource: `${site}/api/`, authorization_servers: [site] });
  put(directory, ".well-known/mcp/server-card.json", { serverInfo: { name: "example", version: "1.0.0" }, transport: { endpoint: "/mcp" }, capabilities: { tools: {} } });
  put(directory, ".well-known/agent-card.json", {
    name: "Example agent",
    version: "1.0.0",
    description: "Answers questions about Example.",
    supportedInterfaces: [{ url: `${site}/a2a`, protocolBinding: "JSONRPC" }],
    capabilities: {},
    skills: [{ id: "answer", name: "Answer", description: "Answers a question." }]
  });
  put(directory, ".well-known/agent-skills/site-guide/SKILL.md", skill);
  put(directory, ".well-known/agent-skills/index.json", {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [{
      name: "site-guide",
      type: "skill-md",
      description: "How to find public information on this site.",
      url: "/.well-known/agent-skills/site-guide/SKILL.md",
      digest: `sha256:${createHash("sha256").update(skill).digest("hex")}`
    }]
  });
  put(directory, ".well-known/ai-catalog.json", {
    specVersion: "0.9",
    host: { displayName: "Example", identifier: "urn:air:www.example.com:host:site" },
    entries: [{ identifier: "urn:air:www.example.com:skills:site-guide", displayName: "Site guide", type: "text/markdown", url: `${site}/.well-known/agent-skills/site-guide/SKILL.md` }]
  });
  put(directory, ".well-known/poppy.json", { protocol_version: "0.1", organization: { name: "Example", domain: "www.example.com" } });
  put(directory, "openapi.json", {
    openapi: "3.1.0",
    info: { title: "Example", version: "1.0.0" },
    paths: { "/paid": { get: { "x-payment-info": { intent: "charge", method: "card", amount: "0.01" }, responses: { 402: { description: "Payment required" } } } } }
  });
  put(directory, ".well-known/ucp", { protocol_version: "2026-01-11", services: {}, capabilities: {}, endpoints: {} });
  put(directory, ".well-known/acp.json", { protocol: { name: "acp", version: "2026-01-30" }, api_base_url: `${site}/acp`, transports: ["rest"], capabilities: { services: ["checkout"] } });
  return directory;
}

function everyCheck(status, changes = {}) {
  const checks = Object.fromEntries(CHECKS.map((check) => [check.id, { status }]));
  checks.x402.paths = ["/paid"];
  checks.contentSignals.expected = signals;
  for (const [id, change] of Object.entries(changes)) checks[id] = { ...checks[id], ...change };
  return checks;
}

function templateChecks(changes = {}) {
  const checks = structuredClone(template.checks);
  for (const [id, change] of Object.entries(changes)) checks[id] = { ...checks[id], ...change };
  return checks;
}

// --- A local site for the checks that need a server -------------------------

const controlFile = join(root, "server-control.json");
const serverScript = join(root, "fixture-server.mjs");
writeFileSync(serverScript, `
  import { createServer } from "node:http";
  import { existsSync, readFileSync, statSync } from "node:fs";
  import { extname, join } from "node:path";
  const types = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".xml": "application/xml" };
  const server = createServer((request, response) => {
    const control = JSON.parse(readFileSync(process.argv[2], "utf8"));
    const url = new URL(request.url, "http://127.0.0.1");
    const accept = request.headers.accept || "";
    if (url.pathname === "/dns-query") {
      response.writeHead(200, { "content-type": "application/dns-json" });
      response.end(JSON.stringify(control.dns
        ? { Status: 0, Answer: [{ name: url.searchParams.get("name"), type: 64, TTL: 300, data: "1 agent.example.com. alpn=a2a port=443" }] }
        : { Status: 3 }));
      return;
    }
    if (url.pathname === "/paid") {
      response.writeHead(control.paid ? 402 : 200, { "content-type": "application/json" });
      response.end("{}");
      return;
    }
    if (url.pathname === "/" && accept.includes("text/markdown") && control.markdown) {
      response.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "x-markdown-tokens": "42", vary: "Accept" });
      response.end("# Example\\n");
      return;
    }
    let file = join(control.root, url.pathname === "/" ? "index.html" : url.pathname);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      response.writeHead(control.htmlFallback ? 200 : 404, { "content-type": control.htmlFallback ? "text/html; charset=utf-8" : "text/plain" });
      response.end(control.htmlFallback ? "<!doctype html><title>Example</title>" : "Not found");
      return;
    }
    const catalog = url.pathname === "/.well-known/api-catalog" ? control.catalogType || "application/linkset+json" : null;
    const headers = { "content-type": catalog || types[extname(file)] || "application/json" };
    if (url.pathname === "/" && control.link) headers.link = control.link;
    response.writeHead(200, headers);
    response.end(readFileSync(file));
  });
  server.listen(0, "127.0.0.1", () => console.log(server.address().port));
`);
writeFileSync(controlFile, "{}");
const server = spawn(process.execPath, [serverScript, controlFile], { stdio: ["ignore", "pipe", "inherit"] });
const port = await new Promise((resolvePort, reject) => {
  server.once("error", reject);
  server.stdout.once("data", (chunk) => resolvePort(Number(String(chunk).trim())));
});
const liveUrl = `http://127.0.0.1:${port}`;

let runNumber = 0;
function verify({ directory, checks, live = null, settings = {}, args = null }) {
  runNumber += 1;
  const configPath = join(root, `run-${runNumber}.config.mjs`);
  const reportPath = join(root, `run-${runNumber}.report.json`);
  writeFileSync(configPath, `export default ${JSON.stringify({ site, outputDirectory: directory, dnsResolver: `${liveUrl}/dns-query`, ...settings, checks }, null, 2)};\n`);
  const command = args || [`--config=${configPath}`, `--report=${reportPath}`];
  if (live) {
    writeFileSync(controlFile, JSON.stringify({ root: directory, ...live }));
    command.push("--live", `--live-url=${live.url || liveUrl}`);
  }
  const run = spawnSync(process.execPath, [verifier.pathname, ...command], { encoding: "utf8" });
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
  const byId = Object.fromEntries((report?.checks || []).map((item) => [item.id, item]));
  return { ...run, report, byId };
}

const liveNeeds = new Set(CHECKS.filter((check) => check.needs === "live").map((check) => check.id));
const healthy = { markdown: true, dns: true, paid: true, link: linkHeader };

try {
  // The template names every check, and gives a reason for each one it rules out.
  const templateIds = Object.keys(template.checks).sort().join(",");
  if (templateIds !== CHECKS.map((check) => check.id).sort().join(",")) fail("The template does not list exactly the checks in the catalogue.");
  if (validateConfig(template).length > 0) fail(`The template is not a valid config: ${validateConfig(template).join(" ")}`);

  // A site that publishes everything passes from the built output alone, and
  // the checks that need a server are reported as not checked.
  const complete = completeSite("complete");
  const built = verify({ directory: complete, checks: everyCheck("required") });
  if (built.status !== 0 || !built.report.passed || built.report.complete) fail("The complete site did not pass from its built output.", built);
  for (const check of CHECKS) {
    const expected = liveNeeds.has(check.id) ? "not-checked" : "pass";
    if (built.byId[check.id].result !== expected) fail(`${check.id} should be ${expected} without --live, found ${built.byId[check.id].result}.`, built);
  }
  if (built.report.warnings.length !== liveNeeds.size) fail("Each check that was not run should produce one warning.", built);

  // With a running site, every check passes and the request count is recorded.
  const served = verify({ directory: complete, checks: everyCheck("required"), live: healthy });
  if (served.status !== 0 || !served.report.complete) fail("The complete site did not pass against the local server.", served);
  for (const check of CHECKS) {
    if (served.byId[check.id].result !== "pass") fail(`${check.id} should pass against the local server, found ${served.byId[check.id].result}.`, served);
  }
  if (served.report.live.requests < 1 || served.report.live.requests > served.report.live.maximumRequests) fail("The live request count is missing or over its limit.", served);

  // One broken site for every check.
  const broken = {
    robotsTxt: { change: (d) => rmSync(join(d, "robots.txt")), expect: "Missing dist/robots.txt" },
    sitemap: { change: (d) => put(d, "sitemap.xml", `<?xml version="1.0"?><urlset><url><loc>${site}/</loc></url></urlset>`), expect: "Built page is missing from the sitemap" },
    linkHeaders: { change: (d) => put(d, "_headers", '/*\n  Link: </sitemap.xml>; rel="sitemap"\n'), expect: "does not include Link for llms.txt" },
    dnsAid: { live: { dns: false }, expect: "required but is not published" },
    markdownNegotiation: { live: { markdown: false }, expect: "required but is not published" },
    llmsTxt: { change: (d) => put(d, "llms.txt", ""), expect: "empty" },
    llmsFullTxt: { change: (d) => put(d, "llms.txt", "# Example\n\n## About\n\nExample.\n"), expect: "does not link to llms-full.txt" },
    aiBotRules: { change: (d) => put(d, "robots.txt", `User-agent: *\nContent-Signal: ai-train=no, search=yes, ai-input=yes\n\nSitemap: ${site}/sitemap.xml\n`), expect: "required but is not published" },
    contentSignals: { change: (d) => put(d, "robots.txt", `User-agent: *\nContent-Signal: ai-train=yes, search=yes, ai-input=yes\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`), expect: "expects ai-train=no" },
    webBotAuth: { change: (d) => put(d, ".well-known/http-message-signatures-directory", { keys: [] }), expect: "at least one public key" },
    apiCatalog: { change: (d) => put(d, ".well-known/api-catalog", { linkset: [{ "service-desc": [] }] }), expect: "has no `anchor`" },
    oauthDiscovery: { change: (d) => put(d, ".well-known/openid-configuration", { token_endpoint: `${site}/token` }), expect: "must state an `issuer`" },
    oauthProtectedResource: { change: (d) => put(d, ".well-known/oauth-protected-resource", { resource: `${site}/api/`, authorization_servers: [] }), expect: "authorization_servers" },
    authMd: { change: (d) => put(d, "auth.md", "# Signing in\n"), expect: "level-one heading" },
    mcpServerCard: { change: (d) => put(d, ".well-known/mcp/server-card.json", { serverInfo: { name: "example" } }), expect: "serverInfo.version" },
    a2aAgentCard: { change: (d) => put(d, ".well-known/agent-card.json", { description: "No name." }), expect: "must state `name`" },
    agentSkills: { change: (d) => put(d, ".well-known/agent-skills/site-guide/SKILL.md", "# Site guide\n\nEdited after the digest was written.\n"), expect: "digest that does not match" },
    webMcp: { change: (d) => put(d, "index.html", page("/")), expect: "required but is not published" },
    ard: { change: (d) => put(d, ".well-known/ai-catalog.json", { specVersion: "0.9", host: { displayName: "Example", identifier: "urn:air:www.example.com:host:site" }, entries: [{ identifier: "a", displayName: "A", type: "text/markdown", url: site, data: "both" }] }), expect: "exactly one of" },
    personalAgentProtocol: { change: (d) => put(d, ".well-known/poppy.json", { organization: { name: "Example", domain: "www.example.com" } }), expect: "protocol_version" },
    x402: { live: { paid: false }, expect: "required but is not published" },
    mpp: { change: (d) => put(d, "openapi.json", { paths: { "/paid": { get: { "x-payment-info": { intent: "charge", method: "card" } } } } }), expect: "does not include amount" },
    ucp: { change: (d) => put(d, ".well-known/ucp", "{ not json"), expect: "is not valid JSON" },
    acp: { change: (d) => put(d, ".well-known/acp.json", { protocol: { name: "other", version: "1" }, api_base_url: "/acp", transports: [], capabilities: {} }), expect: "protocol.name" }
  };
  for (const check of CHECKS) {
    const scenario = broken[check.id];
    if (!scenario) fail(`No failing fixture for ${check.id}.`);
    const directory = completeSite(`broken-${check.id}`);
    scenario.change?.(directory);
    const run = verify({ directory, checks: everyCheck("required"), live: scenario.live ? { ...healthy, ...scenario.live } : null });
    const item = run.byId[check.id];
    if (run.status !== 1 || item?.result !== "fail" || !item.problems.join(" ").includes(scenario.expect)) {
      fail(`The broken ${check.id} fixture did not fail with "${scenario.expect}".`, run);
    }
  }

  // An informational site passes with the template, and each ruled-out check
  // carries its reason into the report.
  const brochure = brochureSite("brochure");
  const plain = verify({ directory: brochure, checks: templateChecks() });
  if (plain.status !== 0) fail("The informational site did not pass with the template config.", plain);
  if (plain.byId.oauthDiscovery.result !== "not-applicable" || plain.byId.oauthDiscovery.reason !== template.checks.oauthDiscovery.reason) fail("A ruled-out check lost its reason.", plain);
  if (plain.byId.agentSkills.result !== "absent" || plain.byId.markdownNegotiation.result !== "not-checked") fail("Optional checks were not reported as expected.", plain);
  if (!plain.stdout.includes("NOT APPLICABLE") || !plain.stdout.includes("reason  :")) fail("The printed results do not show the reasons.", plain);

  // The same site against a server that answers unknown addresses with its
  // HTML shell: nothing is treated as published.
  const shell = verify({ directory: brochure, checks: templateChecks(), live: { link: linkHeader, markdown: true, htmlFallback: true } });
  if (shell.status !== 0 || !shell.report.complete) fail("An HTML fallback page was treated as a published document.", shell);
  if (shell.byId.markdownNegotiation.result !== "pass" || shell.byId.mcpServerCard.result !== "not-applicable") fail("Live results for the informational site are wrong.", shell);

  // The template requires what the scanner scores and any site can pass.
  for (const id of ["robotsTxt", "sitemap", "linkHeaders", "markdownNegotiation", "llmsTxt", "aiBotRules", "contentSignals"]) {
    if (template.checks[id].status !== "required") fail(`The template should mark ${id} required.`);
  }
  const noMarkdown = verify({ directory: brochure, checks: templateChecks(), live: { link: linkHeader } });
  if (noMarkdown.status !== 1 || noMarkdown.byId.markdownNegotiation.result !== "fail") fail("The template passed a site that does not answer Markdown requests.", noMarkdown);
  const noSignals = brochureSite("no-signals");
  put(noSignals, "robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  const unsigned = verify({ directory: noSignals, checks: templateChecks() });
  if (unsigned.status !== 1 || unsigned.byId.contentSignals.result !== "fail") fail("The template passed a site with no Content-Signal line.", unsigned);

  // A check ruled out in the config fails when the site publishes it anyway.
  const contradicted = verify({ directory: complete, checks: everyCheck("required", { mcpServerCard: { status: "not-applicable", reason: "The site runs no MCP server." } }) });
  if (contradicted.status !== 1 || !contradicted.byId.mcpServerCard.problems.join(" ").includes("Marked not-applicable")) fail("A published file marked not-applicable did not fail.", contradicted);

  // An optional file that is published must still be valid.
  const optionalBroken = brochureSite("optional-broken");
  put(optionalBroken, ".well-known/agent-card.json", "<html>");
  const optional = verify({ directory: optionalBroken, checks: templateChecks({ a2aAgentCard: { status: "optional" } }) });
  if (optional.status !== 1 || optional.byId.a2aAgentCard.result !== "fail") fail("An invalid optional file did not fail.", optional);

  // Without an llms.txt, the Link entry for it is not expected, and an entry
  // that points to a missing llms.txt fails.
  const noLlms = brochureSite("no-llms");
  rmSync(join(noLlms, "llms.txt"));
  const dangling = verify({ directory: noLlms, checks: templateChecks({ llmsTxt: { status: "optional" } }) });
  if (dangling.status !== 1 || !dangling.byId.linkHeaders.problems.join(" ").includes("llms.txt is not in the built output")) fail("A Link entry for a missing llms.txt did not fail.", dangling);
  put(noLlms, "_headers", '/*\n  Link: </sitemap.xml>; rel="sitemap"\n');
  const sitemapOnly = verify({ directory: noLlms, checks: templateChecks({ llmsTxt: { status: "optional" } }), live: { link: '</sitemap.xml>; rel="sitemap"', markdown: true } });
  if (sitemapOnly.status !== 0 || sitemapOnly.byId.linkHeaders.result !== "pass" || sitemapOnly.byId.llmsTxt.result !== "absent") fail("A site with no llms.txt and a sitemap Link entry did not pass.", sitemapOnly);
  const missingRequired = verify({ directory: noLlms, checks: templateChecks() });
  if (missingRequired.status !== 1 || missingRequired.byId.llmsTxt.result !== "fail" || missingRequired.byId.linkHeaders.result !== "fail") fail("A required llms.txt that is missing did not fail.", missingRequired);

  // A check answered only by the running site is not judged from the build.
  const edge = verify({ directory: brochure, checks: templateChecks({ contentSignals: { status: "required", liveOnly: true } }) });
  if (edge.status !== 0 || edge.byId.contentSignals.result !== "not-checked") fail("A live-only check was judged from the built output.", edge);

  // What the live site serves must match what was built.
  const noHeader = verify({ directory: complete, checks: everyCheck("required"), live: { ...healthy, link: null } });
  if (noHeader.status !== 1 || !noHeader.byId.linkHeaders.problems.join(" ").includes("does not serve it")) fail("A missing live Link header did not fail.", noHeader);
  const wrongType = verify({ directory: complete, checks: everyCheck("required"), live: { ...healthy, catalogType: "application/json" } });
  if (wrongType.status !== 1 || !wrongType.byId.apiCatalog.problems.join(" ").includes("application/linkset+json")) fail("An API catalog with the wrong content type did not fail.", wrongType);

  // Live requests stop at the configured limit, and an unreachable site fails.
  const capped = verify({ directory: complete, checks: everyCheck("required"), live: healthy, settings: { maximumLiveRequests: 3 } });
  if (capped.status !== 1 || capped.report.live.requests !== 3 || !capped.report.blockers.join(" ").includes("limit of 3 live requests")) fail("The live request limit was not enforced.", capped);
  const unreachable = verify({ directory: complete, checks: everyCheck("required"), live: { ...healthy, url: "http://127.0.0.1:9" }, settings: { liveTimeoutMs: 2_000 } });
  if (unreachable.status !== 1 || !unreachable.byId.markdownNegotiation.problems.join(" ").includes("could not be checked")) fail("An unreachable site did not fail.", unreachable);

  // The config must be complete before anything runs.
  const rejected = [
    [templateChecks({ ucp: { status: "not-applicable", reason: " " } }), "without a written reason"],
    [Object.fromEntries(Object.entries(templateChecks()).filter(([id]) => id !== "ard")), "is missing from the config"],
    [{ ...templateChecks(), favicon: { status: "required" } }, 'Unknown check "favicon"'],
    [templateChecks({ sitemap: { status: "sometimes" } }), "Use required, optional, or not-applicable"],
    [templateChecks({ x402: { status: "required", paths: [] } }), "needs at least one entry in `paths`"],
    [templateChecks({ contentSignals: { status: "optional", expected: { "ai-train": "maybe" } } }), 'must be "yes" or "no"'],
    [templateChecks({ robotsTxt: { status: "required", liveOnly: true } }), "cannot be set to liveOnly"]
  ];
  for (const [checks, message] of rejected) {
    const run = verify({ directory: brochure, checks });
    if (run.status !== 1 || !run.stderr.includes(message) || run.report?.checks) fail(`A config error was not reported: ${message}`, run);
  }
  const noConfig = verify({ directory: brochure, checks: templateChecks(), args: [`--dir=${brochure}`] });
  if (noConfig.status !== 1 || !noConfig.stderr.includes("--config")) fail("Running without a config did not fail.", noConfig);
} finally {
  server.kill();
  await rm(root, { recursive: true, force: true });
}

log("Agent readiness verifier tests passed.");
