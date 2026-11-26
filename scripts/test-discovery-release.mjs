import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyReleaseEvidence } from "./verify-release-evidence.mjs";
import { discoveryChecks } from "./lib/discovery-release.mjs";

const root = await mkdtemp(join(tmpdir(), "discovery-gate-"));
const file = name => join(root, name);
const save = (name, data) => writeFile(file(name), JSON.stringify(data));
const apex = "example.com";
const www = "www.example.com";
const origin = "https://" + www;
const owner = "_index._agents." + apex;
const endpoint = origin + "/.well-known/api-catalog";
const candidate = "fixture-release";
const config = { candidate, agentDiscovery: {
  canonicalOrigin: origin, hosts: [apex, www], deployedAt: "2025-01-01T00:00:00Z",
  scans: { [apex]: file("apex"), [www]: file("www") }, tool: "search", runtime: file("runtime"),
  dns: { name: owner, type: 64, target: www, endpoint, alpn: "h2",
    answers: { google: file("google"), cloudflare: file("cf") } },
} };
const checks = Object.fromEntries(Object.entries(discoveryChecks).map(([group, keys]) =>
  [group, Object.fromEntries(keys.map(k => [k, { status: "pass" }]))]));
const scan = { targetUrl: origin, url: origin, scannedAt: "2025-01-02T00:00:00Z", checks };
const dns = { Status: 0, AD: true, Question: [{ name: owner, type: 64 }],
  Answer: [{ name: owner, type: 64, data: '1 ' + www + '. alpn="h2" key65400="' + endpoint + '"' }] };
const runtime = { candidate,
  mcp: { root: origin, mcpTool: "search", skillsDigestVerified: true, matches: 1, resultUrl: origin + "/result" },
  webMcp: { origin, nativeWebMCP: true, tool: "search", matches: 1 },
  cacheVerification: [apex, www].map(requestedHost => ({ requestedHost, effectiveUrl: origin,
    httpStatus: 200, edgeCache: "HIT", includesSearchScript: true, link: '<' + endpoint + '>; rel="api-catalog"' })),
};
async function fails(change, expected) {
  await change();
  const report = await verifyReleaseEvidence(config);
  assert.equal(report.status, "failed");
  assert(report.findings.some(f => (f.area + " " + f.message).includes(expected)), expected);
}
try {
  await save("apex", { ...scan, redirectedFrom: "https://" + apex });
  await save("www", scan);
  await save("google", dns);
  await save("cf", dns);
  await save("runtime", runtime);
  const ok = await verifyReleaseEvidence(config);
  assert.equal(ok.status, "passed");
  assert.equal(ok.artifacts.length, 5);
  await fails(() => save("apex", scan), "requested homepage");
  await save("apex", { ...scan, redirectedFrom: "https://" + apex });
  await fails(() => save("www", { ...scan, scannedAt: "2024-12-31" }), "deployment");
  for (const [group, keys] of Object.entries(discoveryChecks)) {
    for (const k of keys) {
      const missing = structuredClone(scan);
      delete missing.checks[group][k];
      await fails(() => save("www", missing), k + " did not pass");
    }
  }
  await save("www", scan);
  await fails(() => save("cf", { ...dns, AD: false }), "authenticate");
  await fails(() => save("cf", { ...dns, Answer: [] }), "authenticate");
  await fails(() => save("cf", { ...dns, Answer: [{ ...dns.Answer[0], data: dns.Answer[0].data.replace(/^1/, "0") }] }), "authenticate");
  await save("cf", dns);
  await fails(() => save("runtime", { ...runtime, candidate: "old" }), "Wrong release candidate");
  await fails(() => save("runtime", { ...runtime, webMcp: { ...runtime.webMcp, matches: 0 } }), "WebMCP");
  await fails(() => save("runtime", { ...runtime, cacheVerification: runtime.cacheVerification.slice(1) }), "Visitor response");
  await save("runtime", runtime);
  config.agentDiscovery.dns.changeReceipt = file("change");
  const ds = {keyTag: 2371, algorithm: 13, digestType: 2, digest: "a".repeat(64)};
  const change = {providerDS: ds, registry: {delegationSigned: true, dsData: [ds]},
    backup: {records: 2, sha256: {bind: "b".repeat(64), json: "c".repeat(64)}}};
  await save("change", change);
  assert.equal((await verifyReleaseEvidence(config)).status, "passed");
  await fails(() => save("change", {...change, backup: {records: 2}}), "DNS backup");
  await fails(() => save("change", {...change, registry: {delegationSigned: true, dsData: []}}), "DNS delegation");
  console.log("Discovery release verifier tests passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}
