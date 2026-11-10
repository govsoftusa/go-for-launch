/**
 * Shared catalogue and rules for scripts/verify-agent-readiness.mjs.
 *
 * The catalogue lists every check shown on https://isitagentready.com/ as read
 * on 2026-11-10, plus llms-full.txt, which the scanner documents but does not
 * list. Paths and field names come from the scanner's own per-check pages.
 * Where those pages list a field without saying it is required, the rule here
 * reports a note instead of a failure.
 */

export const STATUSES = ["required", "optional", "not-applicable"];

// Crawler names the scanner's guidance lists for robots.txt.
export const AI_CRAWLERS = [
  "OAI-SearchBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot"
];

export const CONTENT_SIGNAL_KEYS = ["ai-train", "search", "ai-input"];

// `scored` is true when the scanner's pages say the check counts toward its
// score or levels, false when they say it does not, and null when they do not
// say either way.
//
// `needs` says where a check can be answered:
//   "build"  the built output directory is enough
//   "any"    the built output, the live site, or both
//   "live"   only a running site can answer
export const CHECKS = [
  { id: "robotsTxt", category: "Discoverability", name: "robots.txt", scored: true, needs: "build", verifiedBy: "verify-sitemap.mjs" },
  { id: "sitemap", category: "Discoverability", name: "Sitemap", scored: true, needs: "build", verifiedBy: "verify-sitemap.mjs" },
  { id: "linkHeaders", category: "Discoverability", name: "Link headers", scored: true, needs: "any", verifiedBy: "verify-aeo.mjs" },
  { id: "dnsAid", category: "Discoverability", name: "DNS for AI Discovery (DNS-AID)", scored: null, needs: "live", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "markdownNegotiation", category: "Content", name: "Markdown negotiation", scored: true, needs: "live", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "llmsTxt", category: "Content", name: "llms.txt", scored: false, needs: "build", verifiedBy: "verify-aeo.mjs" },
  { id: "llmsFullTxt", category: "Content", name: "llms-full.txt", scored: false, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "aiBotRules", category: "Bot access control", name: "AI bot rules", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "contentSignals", category: "Bot access control", name: "Content Signals", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "webBotAuth", category: "Bot access control", name: "Web Bot Auth", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "apiCatalog", category: "Protocol discovery", name: "API Catalog", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "oauthDiscovery", category: "Protocol discovery", name: "OAuth discovery", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "oauthProtectedResource", category: "Protocol discovery", name: "OAuth Protected Resource", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "authMd", category: "Protocol discovery", name: "Auth.md", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "mcpServerCard", category: "Protocol discovery", name: "MCP Server Card", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "a2aAgentCard", category: "Protocol discovery", name: "A2A Agent Card", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "agentSkills", category: "Protocol discovery", name: "Agent Skills", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "webMcp", category: "Protocol discovery", name: "WebMCP", scored: true, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "ard", category: "Protocol discovery", name: "ARD manifest", scored: null, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "personalAgentProtocol", category: "Protocol discovery", name: "Personal Agent Protocol (Poppy)", scored: false, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "x402", category: "Commerce", name: "x402", scored: false, needs: "live", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "mpp", category: "Commerce", name: "MPP", scored: false, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "ucp", category: "Commerce", name: "UCP", scored: false, needs: "any", verifiedBy: "verify-agent-readiness.mjs" },
  { id: "acp", category: "Commerce", name: "ACP", scored: false, needs: "any", verifiedBy: "verify-agent-readiness.mjs" }
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function filled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function filledArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function absoluteHttpUrl(value) {
  if (!filled(value)) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function missing(object, names) {
  return names.filter((name) => object?.[name] === undefined || object?.[name] === null || object?.[name] === "");
}

function outcome() {
  return { problems: [], notes: [] };
}

// --- Configuration ---------------------------------------------------------

export function validateConfig(config) {
  const errors = [];
  if (!isObject(config) || !isObject(config.checks)) {
    return ["The config must export an object with a `checks` section."];
  }
  const known = new Set(CHECKS.map((check) => check.id));
  for (const id of Object.keys(config.checks)) {
    if (!known.has(id)) errors.push(`Unknown check "${id}" in the config.`);
  }
  for (const check of CHECKS) {
    const entry = config.checks[check.id];
    if (!isObject(entry)) {
      errors.push(`"${check.id}" (${check.name}) is missing from the config. Mark it required, optional, or not-applicable.`);
      continue;
    }
    if (!STATUSES.includes(entry.status)) {
      errors.push(`"${check.id}" has status "${entry.status}". Use required, optional, or not-applicable.`);
      continue;
    }
    if (entry.status === "not-applicable" && !filled(entry.reason)) {
      errors.push(`"${check.id}" is marked not-applicable without a written reason.`);
    }
    if (entry.liveOnly === true && check.needs === "build") {
      errors.push(`"${check.id}" is read from the built output, so it cannot be set to liveOnly.`);
    }
  }
  const signals = config.checks.contentSignals;
  if (isObject(signals?.expected)) {
    for (const [key, value] of Object.entries(signals.expected)) {
      if (!CONTENT_SIGNAL_KEYS.includes(key)) errors.push(`contentSignals.expected has an unknown signal "${key}".`);
      if (!["yes", "no"].includes(value)) errors.push(`contentSignals.expected.${key} must be "yes" or "no".`);
    }
  }
  const x402 = config.checks.x402;
  if (isObject(x402) && x402.status !== "not-applicable" && !filledArray(x402.paths)) {
    errors.push('"x402" needs at least one entry in `paths`. The scanner does not publish the path it requests, so the project names its own paid route.');
  }
  return errors;
}

// --- robots.txt ------------------------------------------------------------

export function parseRobots(text) {
  const groups = [];
  const ungroupedContentSignals = [];
  let current = null;
  let previousWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (!current || !previousWasAgent) {
        current = { agents: [], rules: [], contentSignals: [] };
        groups.push(current);
      }
      current.agents.push(value);
      previousWasAgent = true;
      continue;
    }
    previousWasAgent = false;
    if (field === "content-signal") (current ? current.contentSignals : ungroupedContentSignals).push(value);
    if ((field === "allow" || field === "disallow") && current) current.rules.push({ field, value });
  }
  return { groups, ungroupedContentSignals };
}

export function checkAiBotRules(robotsText, options = {}) {
  const result = { present: false, ...outcome() };
  const groups = parseRobots(robotsText).groups.filter((group) => group.rules.length > 0);
  const agents = new Set(groups.flatMap((group) => group.agents.map((agent) => agent.toLowerCase())));
  const named = AI_CRAWLERS.filter((name) => agents.has(name.toLowerCase()));
  result.present = agents.has("*") || named.length > 0;
  if (named.length > 0) result.notes.push(`Named AI crawlers: ${named.join(", ")}.`);
  for (const name of options.mustName || []) {
    if (!agents.has(String(name).toLowerCase())) result.problems.push(`robots.txt has no rules for ${name}.`);
  }
  return result;
}

export function checkContentSignals(robotsText, options = {}) {
  const result = { present: false, ...outcome() };
  const { groups, ungroupedContentSignals } = parseRobots(robotsText);
  const lines = [...groups.flatMap((group) => group.contentSignals), ...ungroupedContentSignals];
  result.present = lines.length > 0;
  if (!result.present) return result;
  if (ungroupedContentSignals.length > 0) {
    result.problems.push("A Content-Signal line appears before any User-agent line. Put it inside a User-agent group.");
  }
  const seen = new Map();
  for (const line of lines) {
    for (const part of line.split(",").map((value) => value.trim()).filter(Boolean)) {
      const [key, value] = part.split("=").map((item) => item?.trim().toLowerCase());
      if (!CONTENT_SIGNAL_KEYS.includes(key)) {
        result.problems.push(`Content-Signal has an unknown signal "${part}". Use ${CONTENT_SIGNAL_KEYS.join(", ")}.`);
        continue;
      }
      if (!["yes", "no"].includes(value)) {
        result.problems.push(`Content-Signal ${key} must be yes or no, found "${value ?? ""}".`);
        continue;
      }
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(value);
    }
  }
  for (const [key, expected] of Object.entries(options.expected || {})) {
    const values = seen.get(key);
    if (!values) result.problems.push(`Content-Signal does not state ${key}. The config expects ${key}=${expected}.`);
    else if (values.size > 1 || !values.has(expected)) {
      result.problems.push(`Content-Signal states ${key}=${[...values].join(" and ")}. The config expects ${key}=${expected}.`);
    }
  }
  result.notes.push(`Signals found: ${[...seen].map(([key, values]) => `${key}=${[...values].join("/")}`).join(", ") || "none"}.`);
  return result;
}

// --- Link header -----------------------------------------------------------

// Relation types the scanner's Link header guidance lists.
export const SCANNER_LINK_RELATIONS = ["api-catalog", "service-desc", "service-doc", "describedby"];

export function parseLinkHeader(value) {
  const links = [];
  for (const match of String(value || "").matchAll(/<([^>]*)>([^,<]*)/g)) {
    const rel = match[2].match(/;\s*rel\s*=\s*"?([^";]+)"?/i)?.[1] || "";
    links.push({ target: match[1], relations: rel.toLowerCase().split(/\s+/).filter(Boolean) });
  }
  return links;
}

// --- Published documents ---------------------------------------------------

function listedButMissing(result, object, names, where) {
  const absent = missing(object, names);
  if (absent.length > 0) result.notes.push(`${where} does not include ${absent.join(", ")}, which the scanner's guidance lists.`);
}

function validateWebBotAuth(json) {
  const result = outcome();
  if (!filledArray(json.keys)) result.problems.push("The key directory must list at least one public key under `keys`.");
  return result;
}

function validateApiCatalog(json) {
  const result = outcome();
  if (!filledArray(json.linkset)) {
    result.problems.push("The API catalog must contain a non-empty `linkset` list.");
    return result;
  }
  json.linkset.forEach((entry, index) => {
    if (!filled(entry?.anchor)) result.problems.push(`linkset entry ${index + 1} has no \`anchor\`.`);
    else if (!entry["service-desc"] && !entry["service-doc"]) {
      result.notes.push(`linkset entry ${index + 1} has neither service-desc nor service-doc.`);
    }
  });
  return result;
}

function validateOauthDiscovery(json) {
  const result = outcome();
  if (!filled(json.issuer)) result.problems.push("The OAuth metadata must state an `issuer`.");
  listedButMissing(result, json, ["authorization_endpoint", "token_endpoint", "jwks_uri", "grant_types_supported", "response_types_supported"], "The OAuth metadata");
  return result;
}

function validateProtectedResource(json) {
  const result = outcome();
  if (!filled(json.resource)) result.problems.push("The protected resource metadata must state `resource`.");
  if (!filledArray(json.authorization_servers)) result.problems.push("The protected resource metadata must list at least one entry in `authorization_servers`.");
  return result;
}

function validateAuthMd(text) {
  const result = outcome();
  const heading = text.split(/\r?\n/).find((line) => /^#\s+\S/.test(line)) || "";
  if (!/auth\.md/i.test(heading)) result.problems.push("auth.md must open with a level-one heading that contains `auth.md`.");
  return result;
}

function validateMcpServerCard(json) {
  const result = outcome();
  if (!filled(json.serverInfo?.name) || !filled(json.serverInfo?.version)) {
    result.problems.push("The MCP Server Card must state `serverInfo.name` and `serverInfo.version`.");
  }
  if (!filled(json.transport?.endpoint) && !filled(json.endpoint)) result.notes.push("The MCP Server Card does not state a transport endpoint.");
  listedButMissing(result, json, ["capabilities"], "The MCP Server Card");
  return result;
}

function validateA2aAgentCard(json) {
  const result = outcome();
  if (!filled(json.name)) result.problems.push("The A2A Agent Card must state `name`.");
  listedButMissing(result, json, ["version", "description", "supportedInterfaces", "capabilities", "skills"], "The A2A Agent Card");
  (Array.isArray(json.skills) ? json.skills : []).forEach((skill, index) => {
    const absent = missing(skill, ["id", "name", "description"]);
    if (absent.length > 0) result.notes.push(`Agent Card skill ${index + 1} does not include ${absent.join(", ")}.`);
  });
  return result;
}

function validateAgentSkills(json) {
  const result = outcome();
  if (!filledArray(json.skills)) {
    result.problems.push("The Agent Skills index must contain a non-empty `skills` list.");
    return result;
  }
  if (!filled(json.$schema)) result.notes.push("The Agent Skills index does not name its `$schema`.");
  json.skills.forEach((skill, index) => {
    const label = filled(skill?.name) ? skill.name : `skill ${index + 1}`;
    const absent = missing(skill, ["name", "type", "description", "url", "digest"]);
    if (absent.length > 0) result.problems.push(`${label} does not include ${absent.join(", ")}.`);
    if (filled(skill?.type) && !["skill-md", "archive"].includes(skill.type)) {
      result.problems.push(`${label} has type "${skill.type}". Use skill-md or archive.`);
    }
    if (filled(skill?.digest) && !/^sha256:[0-9a-f]{64}$/i.test(skill.digest)) {
      result.problems.push(`${label} has a digest that is not in the form sha256:<64 hex characters>.`);
    }
  });
  return result;
}

function validateArd(json) {
  const result = outcome();
  if (!filled(json.specVersion)) result.problems.push("The ARD manifest must state `specVersion`.");
  if (!filled(json.host?.displayName) || !filled(json.host?.identifier)) {
    result.problems.push("The ARD manifest must state `host.displayName` and `host.identifier`.");
  }
  if (!filledArray(json.entries)) {
    result.problems.push("The ARD manifest must contain a non-empty `entries` list.");
    return result;
  }
  json.entries.forEach((entry, index) => {
    const absent = missing(entry, ["identifier", "displayName", "type"]);
    if (absent.length > 0) result.problems.push(`ARD entry ${index + 1} does not include ${absent.join(", ")}.`);
    if ((entry?.url === undefined) === (entry?.data === undefined)) {
      result.problems.push(`ARD entry ${index + 1} must have exactly one of \`url\` or \`data\`.`);
    }
  });
  return result;
}

function validatePoppy(json) {
  const result = outcome();
  if (!filled(json.protocol_version)) result.problems.push("poppy.json must state `protocol_version`.");
  listedButMissing(result, json.organization, ["name", "domain"], "The `organization` section of poppy.json");
  return result;
}

function paymentOperations(json) {
  const operations = [];
  for (const [path, item] of Object.entries(isObject(json.paths) ? json.paths : {})) {
    for (const [method, operation] of Object.entries(isObject(item) ? item : {})) {
      if (isObject(operation) && operation["x-payment-info"] !== undefined) {
        operations.push({ label: `${method.toUpperCase()} ${path}`, info: operation["x-payment-info"] });
      }
    }
  }
  return operations;
}

function validateMpp(json) {
  const result = outcome();
  for (const { label, info } of paymentOperations(json)) {
    const absent = missing(info, ["intent", "method", "amount"]);
    if (absent.length > 0) result.problems.push(`x-payment-info on ${label} does not include ${absent.join(", ")}.`);
  }
  return result;
}

function validateUcp(json) {
  const result = outcome();
  listedButMissing(result, json, ["protocol_version", "services", "capabilities", "endpoints"], "The UCP profile");
  return result;
}

function validateAcp(json) {
  const result = outcome();
  if (json.protocol?.name !== "acp") result.problems.push('The ACP document must set `protocol.name` to "acp".');
  if (!filled(json.protocol?.version)) result.problems.push("The ACP document must state `protocol.version`.");
  if (!absoluteHttpUrl(json.api_base_url)) result.problems.push("The ACP document must give `api_base_url` as a full http or https address.");
  if (!filledArray(json.transports)) result.problems.push("The ACP document must list at least one entry in `transports`.");
  if (!filledArray(json.capabilities?.services)) result.problems.push("The ACP document must list at least one entry in `capabilities.services`.");
  return result;
}

function validateLlmsFull(text) {
  const result = outcome();
  if (text.trim().length === 0) result.problems.push("llms-full.txt is empty.");
  return result;
}

// One entry per check that is answered by a published file. `paths` are tried
// in order. `contentType` is set only where the scanner's guidance states one.
export const DOCUMENTS = {
  llmsFullTxt: { paths: ["/llms-full.txt"], kind: "text", validate: validateLlmsFull },
  webBotAuth: { paths: ["/.well-known/http-message-signatures-directory"], kind: "json", validate: validateWebBotAuth },
  apiCatalog: { paths: ["/.well-known/api-catalog"], kind: "json", contentType: "application/linkset+json", validate: validateApiCatalog },
  oauthDiscovery: { paths: ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"], kind: "json", validate: validateOauthDiscovery },
  oauthProtectedResource: { paths: ["/.well-known/oauth-protected-resource"], kind: "json", validate: validateProtectedResource },
  authMd: { paths: ["/auth.md"], kind: "text", validate: validateAuthMd },
  mcpServerCard: { paths: ["/.well-known/mcp/server-card.json"], kind: "json", validate: validateMcpServerCard },
  a2aAgentCard: { paths: ["/.well-known/agent-card.json"], kind: "json", validate: validateA2aAgentCard },
  agentSkills: { paths: ["/.well-known/agent-skills/index.json"], kind: "json", validate: validateAgentSkills },
  ard: { paths: ["/.well-known/ai-catalog.json"], kind: "json", validate: validateArd },
  personalAgentProtocol: { paths: ["/.well-known/poppy.json"], kind: "json", validate: validatePoppy },
  mpp: {
    paths: ["/openapi.json"],
    kind: "json",
    validate: validateMpp,
    // An OpenAPI file with no payment details is an ordinary API description,
    // so it does not count as publishing MPP.
    counts: (json) => paymentOperations(json).length > 0
  },
  ucp: { paths: ["/.well-known/ucp"], kind: "json", validate: validateUcp },
  acp: { paths: ["/.well-known/acp.json"], kind: "json", validate: validateAcp }
};

/**
 * Judge one published document.
 *
 * `read(path)` returns `{ found, text, contentType }` for the built output or
 * the live site. The result says whether the document is published there and
 * lists what is wrong with it.
 */
export async function evaluateDocument(definition, read, place) {
  const result = { present: false, path: null, ...outcome() };
  for (const path of definition.paths) {
    const file = await read(path);
    if (!file.found) continue;
    const type = (file.contentType || "").split(";")[0].trim().toLowerCase();
    // A site that answers every unknown address with its HTML shell has not
    // published the document.
    if (place === "live" && type === "text/html") continue;
    let content = file.text;
    if (definition.kind === "json") {
      try {
        content = JSON.parse(file.text);
      } catch {
        result.present = true;
        result.path = path;
        result.problems.push(`${path} is not valid JSON.`);
        return result;
      }
      if (!isObject(content)) {
        result.present = true;
        result.path = path;
        result.problems.push(`${path} must contain a JSON object.`);
        return result;
      }
    }
    if (definition.counts && !definition.counts(content)) continue;
    result.present = true;
    result.path = path;
    const verdict = definition.validate(content);
    result.problems.push(...verdict.problems);
    result.notes.push(...verdict.notes);
    if (place === "live" && definition.contentType && type !== definition.contentType) {
      result.problems.push(`${path} is served as ${type || "no content type"}. The scanner's guidance asks for ${definition.contentType}.`);
    }
    return result;
  }
  return result;
}

// --- WebMCP ----------------------------------------------------------------

// The scanner detects WebMCP by loading the page in a browser. Reading the
// source for the same names is an approximation, and the report says so.
export function findWebMcp(source) {
  const found = [];
  if (/\bmodelContext\b/.test(source)) found.push("modelContext script call");
  if (/<form\b[^>]*\stoolname\s*=/i.test(source)) found.push("form with a toolname attribute");
  return found;
}
