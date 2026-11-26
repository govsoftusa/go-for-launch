import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const discoveryChecks = {
  discoverability: ["linkHeaders", "dnsAid"],
  contentAccessibility: ["markdownNegotiation"],
  botAccessControl: ["contentSignals"],
  discovery: ["apiCatalog", "mcpServerCard", "agentSkills", "webMcp", "ard"],
};

function urlMatches(value, expected) {
  try {
    return new URL(value).href === new URL(expected).href;
  } catch {
    return false;
  }
}

function advertisesApiCatalog(header) {
  // A quoted Link relation can contain multiple space-separated names.
  for (const match of String(header).matchAll(/;\s*rel\s*=\s*(?:"([^"]*)"|([^;,\s]+))/gi)) {
    if ((match[1] ?? match[2]).toLowerCase().split(/\s+/).includes("api-catalog")) return true;
  }
  return false;
}

function dnsName(value) {
  return String(value ?? "").toLowerCase().replace(/\.$/, "");
}

function matchesService(record, spec) {
  if (record?.type !== spec.type || dnsName(record.name) !== dnsName(spec.name)) return false;
  const [priority, target, ...params] = String(record.data).trim().split(/\s+/);
  const values = new Map(params.map((field) => {
    const i = field.indexOf("=");
    return [field.slice(0, i), field.slice(i + 1).replace(/^"(.*)"$/, "$1")];
  }));
  return /^\d+$/.test(priority) && Number(priority) > 0 && Number(priority) <= 65535
    && dnsName(target) === dnsName(spec.target)
    && values.get("alpn")?.split(",").includes(spec.alpn)
    && (values.get("key65400") ?? values.get("endpoint")) === spec.endpoint;
}

export function checkSearch(runtime, candidate, canonical, tool, fail) {
  if ((runtime.candidate ?? runtime.packageSHA256) !== candidate) fail("runtime", "Wrong release candidate.");
  const mcp = runtime.mcp ?? runtime.liveMcpSearch;
  const web = runtime.webMcp ?? runtime.liveWebMcpSearch;
  const matches = mcp?.matches ?? mcp?.articleMatches;
  const resultUrl = mcp?.resultUrl ?? mcp?.articleUrl;
  if (!tool || mcp?.root !== canonical || mcp?.mcpTool !== tool
      || mcp?.skillsDigestVerified !== true || !Number.isInteger(matches) || matches < 1
      || typeof resultUrl !== "string" || !resultUrl.startsWith(canonical + "/")) {
    fail("MCP", "Require a successful read-only search, a canonical result URL and a verified skill digest.");
  }
  if (!web || web.origin !== canonical || web.nativeWebMCP !== true || web.tool !== tool
      || !Number.isInteger(web.matches) || web.matches < 1) {
    fail("WebMCP", "Require the configured search tool to return results in a native WebMCP browser.");
  }
}

export async function inspectDiscoveryRelease(spec, candidate, findings) {
  const artifacts = [];
  const fail = (area, message) => findings.push({ severity: "error", area, message });
  async function receipt(name, path) {
    try {
      const absolute = resolve(path);
      const bytes = await readFile(absolute);
      artifacts.push({ name, path: absolute, bytes: bytes.length, files: 1,
        sha256: createHash("sha256").update(bytes).digest("hex") });
      const value = JSON.parse(bytes);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
      return value;
    } catch (error) {
      fail(name, error.message);
      return {};
    }
  }

  const canonical = spec?.canonicalOrigin;
  const hosts = spec?.hosts;
  if (!Array.isArray(hosts) || !hosts.length || new Set(hosts).size !== hosts.length
      || !hosts.every(host => typeof host === "string" && /^[a-z0-9.-]+$/.test(host))
      || !hosts.some(host => canonical === 'https://' + host)) {
    fail("agentDiscovery.hosts", "Declare every distinct public hostname and its canonical HTTPS origin.");
    return artifacts;
  }
  const start = Date.parse(spec.deployedAt);
  if (!Number.isFinite(start)) fail("agentDiscovery.deployedAt", "Supply the deployment timestamp.");
  for (const host of hosts) {
    const scan = await receipt("agent scan " + host, spec.scans?.[host]);
    if (!urlMatches(scan.targetRedirectedFrom ?? scan.redirectedFrom ?? scan.targetUrl, 'https://' + host)
        || !urlMatches(scan.targetUrl, canonical) || !urlMatches(scan.url, canonical)) {
      fail(host, "Scanner receipt does not match the requested homepage and its canonical destination.");
    }
    const scanned = Date.parse(scan.scannedAt);
    if (!(scanned >= start && scanned <= Date.now())) fail(host, "Scan must follow this deployment.");
    for (const [group, keys] of Object.entries(discoveryChecks)) {
      for (const key of keys) {
        if (scan.checks?.[group]?.[key]?.status !== "pass") fail(host, key + " did not pass.");
      }
    }
  }

  const dns = spec.dns;
  if (![64, 65].includes(dns?.type) || !dns.name || !dns.target || !dns.alpn
      || !dns.endpoint?.startsWith("https://")) {
    fail("agentDiscovery.dns", "Declare the discovery owner, SVCB or HTTPS type, target, ALPN and HTTPS endpoint.");
  } else {
    if (dns.changeReceipt) {
      const change = await receipt("DNS change", dns.changeReceipt);
      const checksums = change.backup?.sha256;
      if (!Number.isInteger(change.backup?.records) || change.backup.records < 1
          || !["bind", "json"].every(format => /^[0-9a-f]{64}$/i.test(checksums?.[format] ?? ""))) {
        fail("DNS backup", "Supply the pre-change record count and checksums of the BIND and JSON exports.");
      }
      const ds = change.providerDS;
      const validDS = ds && Number.isInteger(ds.keyTag) && ds.keyTag >= 0 && ds.keyTag <= 65535
        && Number.isInteger(ds.algorithm) && ds.algorithm > 0 && ds.algorithm <= 255
        && ds.digest?.length === ({1: 40, 2: 64, 4: 96})[ds.digestType] && /^[a-f0-9]+$/i.test(ds.digest);
      if (!validDS || change.registry?.delegationSigned !== true || !Array.isArray(change.registry.dsData)
          || !change.registry.dsData.some(row => row.keyTag === ds.keyTag && row.algorithm === ds.algorithm
            && row.digestType === ds.digestType && row.digest?.toUpperCase() === ds.digest.toUpperCase())) {
        fail("DNS delegation", "The signed parent delegation must contain the provider's DS.");
      }
    }
    for (const provider of ["google", "cloudflare"]) {
      const answer = await receipt("DNSSEC " + provider, dns.answers?.[provider]);
      if (answer.Status !== 0 || answer.AD !== true || answer.CD === true || answer.TC === true
          || !Array.isArray(answer.Question) || !answer.Question.some(q => q?.type === dns.type && dnsName(q.name) === dnsName(dns.name))
          || !Array.isArray(answer.Answer) || !answer.Answer.some(rr => matchesService(rr, dns))) {
        fail(provider, "Resolver did not authenticate the configured ServiceMode discovery answer.");
      }
    }
    if (dns.answers?.google && dns.answers?.cloudflare && resolve(dns.answers.google) === resolve(dns.answers.cloudflare)) {
      fail("agentDiscovery.dns", "Supply a separate receipt from each resolver.");
    }
  }

  const runtime = await receipt("discovery runtime", spec.runtime);
  checkSearch(runtime, candidate, canonical, spec.tool, fail);
  for (const host of hosts) {
    const row = Array.isArray(runtime.cacheVerification) && runtime.cacheVerification.find(r => r?.requestedHost === host);
    if (row?.httpStatus !== 200 || !urlMatches(row.effectiveUrl, canonical)
        || row.includesSearchScript !== true || !advertisesApiCatalog(row.link)
        || (spec.cached !== false && String(row.edgeCache).toUpperCase() !== "HIT")) {
      fail(host, "Visitor response must carry the discovery Link and search script, including on a cache hit when caching is enabled.");
    }
  }
  return artifacts;
}
