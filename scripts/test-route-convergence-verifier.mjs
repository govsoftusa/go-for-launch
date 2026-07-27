import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyRouteConvergence } from "./verify-route-convergence.mjs";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-route-convergence-"));
const release = "fixture-candidate";
let mixedPublic = false;
let publicRequests = 0;

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/measurements" && request.method === "POST") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ id: "fixture-measurement" }));
    return;
  }
  if (url.pathname === "/measurements/fixture-measurement") {
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        status: "finished",
        results: [
          {
            probe: { country: "US", city: "Fixture City" },
            result: {
              statusCode: 200,
              headers: {
                "x-release-candidate": release,
                "cloudflare-cdn-cache-control": "public, max-age=3600",
              },
              timings: { total: 10 },
            },
          },
        ],
      }),
    );
    return;
  }
  const protectedTarget = url.pathname === "/protected";
  publicRequests += protectedTarget ? 0 : 1;
  const legacy = !protectedTarget && mixedPublic && publicRequests === 3;

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html");
  response.setHeader("CF-Ray", protectedTarget ? "fixture-SJC" : "fixture-IAD");
  if (!legacy) response.setHeader("X-Release-Candidate", release);
  if (protectedTarget) {
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  } else if (!legacy) {
    response.setHeader("Cloudflare-CDN-Cache-Control", "public, max-age=3600");
  }
  response.end(
    legacy
      ? "<html><head></head><body>wp-content legacy application</body></html>"
      : `<html><head><meta name="robots" content="${
          protectedTarget ? "noindex, nofollow" : "index, follow"
        }"></head><body>Example publication</body></html>`,
  );
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Fixture server did not bind.");
const base = `http://127.0.0.1:${address.port}`;
const reportPath = join(root, "report.json");
const config = {
  rounds: 3,
  intervalMs: 0,
  globalPingApi: base,
  report: reportPath,
  targets: [
    {
      name: "protected candidate",
      url: `${base}/protected`,
      expectedHostname: "127.0.0.1",
      expectedRelease: release,
      requiredBodyMarkers: ["Example publication"],
      forbiddenBodyMarkers: ["wp-content"],
      robotsMode: "protected",
      edgeCacheMode: "no-store",
    },
    {
      name: "public canary",
      url: `${base}/public`,
      expectedHostname: "127.0.0.1",
      expectedRelease: release,
      requiredBodyMarkers: ["Example publication"],
      forbiddenBodyMarkers: ["wp-content"],
      robotsMode: "public",
      edgeCacheMode: "public",
      globalPing: {
        locations: [{ country: "US", limit: 1 }],
        pollIntervalMs: 0,
      },
    },
  ],
};

const passing = await verifyRouteConvergence(config);
if (passing.status !== "passed" || passing.counts.checks !== 13) {
  throw new Error("Valid route convergence fixture did not pass.");
}
const saved = JSON.parse(await readFile(reportPath, "utf8"));
if (saved.counts.colos !== 2) throw new Error("Edge location evidence was not recorded.");
if (saved.counts.remoteLocations !== 1) {
  throw new Error("Remote location evidence was not recorded.");
}

mixedPublic = true;
publicRequests = 0;
const failing = await verifyRouteConvergence({ ...config, report: undefined });
if (failing.status !== "failed") {
  throw new Error("Mixed application identity fixture did not fail.");
}
if (!failing.findings.some((finding) => finding.message.includes("release identity"))) {
  throw new Error("Mixed fixture did not report the missing release identity.");
}
if (!failing.findings.some((finding) => finding.message.includes("forbidden application marker"))) {
  throw new Error("Mixed fixture did not report the legacy application marker.");
}

await new Promise((resolveClose) => server.close(resolveClose));
await rm(root, { recursive: true, force: true });
console.log("Route convergence verifier tests passed.");
