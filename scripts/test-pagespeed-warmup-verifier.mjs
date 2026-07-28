import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyPagespeedWarmup } from "./verify-pagespeed-warmup.mjs";

const root = await mkdtemp(join(tmpdir(), "go-for-launch-pagespeed-warmup-"));
const release = "fixture-candidate";
let cacheableDocumentRequests = 0;

const server = createServer((request, response) => {
  const browserDocument =
    request.headers.accept === "text/html,application/xhtml+xml" &&
    request.headers["sec-fetch-dest"] === "document";
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const neverHits = url.pathname === "/never-hits";

  if (browserDocument) cacheableDocumentRequests += 1;
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("X-Release-Candidate", release);
  response.setHeader(
    "X-Document-Cache",
    neverHits
      ? "MISS"
      : browserDocument && cacheableDocumentRequests > 1
        ? "HIT"
        : "MISS",
  );
  response.end("<html><body>Example publication</body></html>");
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Fixture server did not bind.");
}
const base = `http://127.0.0.1:${address.port}`;
const reportPath = join(root, "report.json");
const target = {
  name: "protected candidate",
  url: `${base}/candidate?release-candidate=${release}`,
  expectedHostname: "127.0.0.1",
  expectedRelease: release,
  requiredBodyMarkers: ["Example publication"],
  forbiddenBodyMarkers: ["legacy application"],
  cache: {
    header: "x-document-cache",
    hitValues: ["HIT"],
  },
};

const passing = await verifyPagespeedWarmup({
  attempts: 2,
  report: reportPath,
  targets: [target],
});
if (passing.status !== "passed") {
  throw new Error("Browser-document warmup fixture did not pass.");
}
if (passing.requestContract.secFetchDest !== "document") {
  throw new Error("Warmup report did not preserve the document request contract.");
}
const saved = JSON.parse(await readFile(reportPath, "utf8"));
if (saved.results.at(-1)?.cacheState !== "HIT") {
  throw new Error("Warmup report did not preserve the final cache hit.");
}

cacheableDocumentRequests = 0;
const failing = await verifyPagespeedWarmup({
  attempts: 2,
  targets: [
    {
      ...target,
      name: "cache never becomes reusable",
      url: `${base}/never-hits`,
    },
  ],
});
if (failing.status !== "failed") {
  throw new Error("A warmup with no final cache hit did not fail.");
}
if (!failing.findings.some((finding) => finding.message.includes("expected one of HIT"))) {
  throw new Error("Failed warmup did not report the missing cache hit.");
}

await new Promise((resolveClose) => server.close(resolveClose));
await rm(root, { recursive: true, force: true });
console.log("PageSpeed warmup verifier tests passed.");
