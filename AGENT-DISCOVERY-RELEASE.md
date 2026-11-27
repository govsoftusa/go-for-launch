# Releasing public agent discovery

When your release requires all nine public discovery checks, set `taskEnvelope.agentDiscoveryRequired` to `true` in the execution-control record. List the canonical origin and every public alias in the release contract. A managed CMS can serve the discovery endpoints directly.

## Before production

Freeze the deployable artifact and record its build identity. On staging, initialize an MCP client, list the tools and call the site's read-only search with a query known to match published content. In a browser with native WebMCP, run the advertised tool with the same query. Check the returned public URLs, the skill file's digest and the resources linked by the discovery catalog. Set `candidate.gates.agentDiscoveryStaging` to a record with `status`, `origin`, `tool` and `evidence` (the receipt path). Use the same runtime fields shown below with the staging origin and candidate identity. Run the project's native Safari and PageSpeed checks against the representative routes.

Before changing DNS, export the zone and record the backup checksum. Compute the DS from the provider’s DNSKEY and compare its key tag, algorithm, digest type and digest with the registrar’s entry. After publication, check the parent registry and collect validating resolver answers for the configured discovery record name. For releases that change DNS, set `dns.changeReceipt` to a JSON receipt with `backup.records`, SHA-256 checksums in `backup.sha256.bind` and `backup.sha256.json`, `providerDS` (keyTag, algorithm, digestType and digest), and the parent RDAP `secureDNS` object under `registry`. Preserve the zone exports in the project’s backup location.

## Production signoff

1. Deploy the staged artifact. Record the deployment time in UTC. If a rendered page still serves the previous release, refresh the application's generated HTML cache first, then the CDN. Revisit each public homepage until the visitor-facing cache serves the new Link header and search script.
2. Submit each public hostname separately to the approved Is It Agent Ready scanner. Save its JSON response with the requested URL, final URL, scan time and per-check statuses. Require a pass for Link headers, DNS-AID, Markdown negotiation, Content Signals, the API catalog, the MCP server card, Agent Skills, WebMCP and the ARD manifest. Keep the publisher's approved content-use policy in the project record.
3. Query Google and Cloudflare DNS over HTTPS with DNSSEC requested and checking enabled. Save each resolver's DNS JSON response. The gate checks authenticated data, the queried owner, the positive ServiceMode priority, service target, ALPN and endpoint. Use type 64 for SVCB or 65 for HTTPS.
4. Repeat the MCP and WebMCP searches against production. Record the resulting evidence in the shape below. Use the frozen build identity as `candidate`. For a ZIP release, the verifier also accepts the computed `packageSHA256`.
5. Copy [the release configuration](templates/discovery-release.config.mjs) beside the receipts, or add its `agentDiscovery` section to the project's existing release-evidence configuration. Run the command below. After verification passes, set `candidate.gates.agentDiscoveryLive.status` to `passed` and its `evidence` field to the manifest path. The closed execution-control phase checks its status and build identity.

```sh
node /path/to/go-for-launch/scripts/verify-release-evidence.mjs --config=./discovery-release.config.mjs
```

For a public site approved for third-party scanning, collect one receipt per hostname. Set `host` to the hostname being scanned and `owner` to the full DNS record name. The commands below show a type 64 query.

```sh
host=www.example.com
owner=_index._agents.example.com
curl -fsS --max-time 90 https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data "{\"url\":\"https://$host\",\"enabledChecks\":[\"linkHeaders\",\"dnsAid\",\"markdownNegotiation\",\"contentSignals\",\"apiCatalog\",\"mcpServerCard\",\"agentSkills\",\"webMcp\",\"ard\"]}" > "$host-scan.json"
curl -fsS --max-time 20 "https://dns.google/resolve?name=$owner&type=64&do=true&cd=false" > dns-google.json
curl -fsS --max-time 20 -H 'Accept: application/dns-json' \
  "https://cloudflare-dns.com/dns-query?name=$owner&type=64&do=true&cd=false" > dns-cloudflare.json
```

Point each entry in `scans` at its corresponding output file.

The verifier reads saved receipts offline. Collect fresh receipts for each deployment. Keep the original scan responses with the project. A compact copy may retain the scan identity fields and the nine nested statuses. For a site that intentionally serves uncached HTML, set `cached` to `false` and keep the header and script checks.

```json
{
  "candidate": "replace-with-frozen-build-identity",
  "liveMcpSearch": {
    "root": "https://www.example.com",
    "mcpTool": "search_articles",
    "skillsDigestVerified": true,
    "articleMatches": 2,
    "articleUrl": "https://www.example.com/articles/example/"
  },
  "liveWebMcpSearch": {
    "origin": "https://www.example.com",
    "nativeWebMCP": true,
    "tool": "search_articles",
    "matches": 2
  },
  "cacheVerification": [
    {
      "requestedHost": "example.com",
      "effectiveUrl": "https://www.example.com/",
      "httpStatus": 200,
      "edgeCache": "HIT",
      "link": "<https://www.example.com/.well-known/api-catalog>; rel=\"api-catalog\"",
      "includesSearchScript": true
    }
  ]
}
```

Include one cache observation per hostname. This example shows the apex row. A site serving both apex and www also records the www row.
