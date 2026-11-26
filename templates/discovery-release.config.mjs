// Copy this into the project. Paths below are relative to the evidence directory.
import { fileURLToPath } from "node:url";
const file = name => fileURLToPath(new URL(name, import.meta.url));

export default {
  candidate: "replace-with-frozen-build-identity",
  report: file("discovery-manifest.json"),
  agentDiscovery: {
    deployedAt: "replace-with-production-deployment-time-in-UTC",
    canonicalOrigin: "https://www.example.com",
    hosts: ["example.com", "www.example.com"],
    scans: {
      "example.com": file("apex-scan.json"),
      "www.example.com": file("www-scan.json"),
    },
    runtime: file("runtime.json"),
    tool: "search_articles",
    cached: true,
    dns: {
      // For a DNS change, include changeReceipt: file("dns-change.json").
      name: "_index._agents.example.com",
      type: 64,
      target: "www.example.com",
      alpn: "h2",
      endpoint: "https://www.example.com/.well-known/api-catalog",
      answers: { google: file("dns-google.json"), cloudflare: file("dns-cloudflare.json") },
    },
  },
};
