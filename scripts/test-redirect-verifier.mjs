import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const script = new URL("./verify-redirects.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-redirects-"));
let canonicalOrigin = "";

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", canonicalOrigin);
  const canonicalHost = new URL(canonicalOrigin).host;
  if (request.headers.host !== canonicalHost) {
    response.writeHead(301, { location: `${canonicalOrigin}${url.pathname}${url.search}` });
    response.end();
    return;
  }
  if (url.pathname === "/sitemap.xml") {
    response.writeHead(200, { "content-type": "application/xml" });
    response.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${canonicalOrigin}/</loc></url><url><loc>${canonicalOrigin}/about/</loc></url></urlset>`);
    return;
  }
  if (url.pathname === "/about") {
    response.writeHead(308, { location: `${canonicalOrigin}/about/${url.search}` });
    response.end();
    return;
  }
  if (url.pathname === "/legacy/") {
    response.writeHead(302, { location: `${canonicalOrigin}/about/${url.search}` });
    response.end();
    return;
  }
  if (url.pathname === "/" || url.pathname === "/about/") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("ok");
    return;
  }
  response.writeHead(404);
  response.end();
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "0.0.0.0", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
canonicalOrigin = `http://127.0.0.1:${address.port}`;
const alternateOrigin = `http://localhost:${address.port}`;

function run(config) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script.pathname, `--config=${config}`], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (value) => { stdout += value; });
    child.stderr.on("data", (value) => { stderr += value; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

const validConfig = join(root, "valid.json");
await writeFile(validConfig, JSON.stringify({
  canonicalOrigin,
  sitemapUrl: `${canonicalOrigin}/sitemap.xml`,
  trailingSlash: "always",
  alternateOrigins: [alternateOrigin]
}));
const valid = await run(validConfig);
if (valid.status !== 0) throw new Error(`Valid redirect fixture failed:\n${valid.stdout}${valid.stderr}`);

const invalidConfig = join(root, "invalid.json");
await writeFile(invalidConfig, JSON.stringify({
  canonicalOrigin,
  sitemapUrl: `${canonicalOrigin}/sitemap.xml`,
  trailingSlash: "always",
  alternateOrigins: [alternateOrigin],
  probes: [{
    source: `${canonicalOrigin}/legacy/?gfl_redirect_probe=1`,
    destination: `${canonicalOrigin}/about/?gfl_redirect_probe=1`
  }]
}));
const invalid = await run(invalidConfig);
if (invalid.status === 0 || !invalid.stderr.includes("expected HTTP 301 or 308")) throw new Error("Temporary redirect fixture did not fail correctly.");

await new Promise((resolve) => server.close(resolve));
await rm(root, { recursive: true, force: true });
log("Trailing-slash, alternate-origin, query-preservation, and status redirect tests passed.");
