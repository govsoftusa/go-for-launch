import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const verifier = new URL("./verify-side-navigation.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-side-navigation-"));

async function writePage(directory, route, body) {
  const file = route === "/" ? join(directory, "index.html") : join(directory, route, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `<!doctype html><html><body>${body}</body></html>`);
}

function verify(directory, extra = []) {
  return spawnSync(process.execPath, [verifier.pathname, `--root=${directory}`, "--require=true", ...extra], {
    encoding: "utf8"
  });
}

const valid = join(root, "valid");
await writePage(
  valid,
  "/",
  '<nav data-side-navigation aria-label="Sections"><a data-side-navigation-item href="#overview">Overview</a><a data-side-navigation-item href="/details/">Details</a></nav><h2 id="overview">Overview</h2>'
);
await writePage(valid, "/details/", "<h1>Details</h1>");
const validResult = verify(valid);
if (validResult.status !== 0) {
  throw new Error(`Valid side navigation fixture failed:\n${validResult.stdout}${validResult.stderr}`);
}

const buttonOnly = join(root, "button-only");
await writePage(
  buttonOnly,
  "/",
  '<nav data-side-navigation><button data-side-navigation-item>Overview</button><a data-side-navigation-item href="#details">Details</a></nav><h2 id="details">Details</h2>'
);
const buttonResult = verify(buttonOnly);
if (buttonResult.status === 0 || !buttonResult.stderr.includes("SIDE_NAV_NATIVE_LINK")) {
  throw new Error("JavaScript-only side navigation did not fail the native link rule.");
}

const missingHash = join(root, "missing-hash");
await writePage(
  missingHash,
  "/",
  '<nav data-side-navigation><a data-side-navigation-item href="#overview">Overview</a><a data-side-navigation-item href="#missing">Missing</a></nav><h2 id="overview">Overview</h2>'
);
const missingHashResult = verify(missingHash);
if (missingHashResult.status === 0 || !missingHashResult.stderr.includes("SIDE_NAV_HASH_TARGET")) {
  throw new Error("Missing same-page side navigation target did not fail verification.");
}

const missingRoute = join(root, "missing-route");
await writePage(
  missingRoute,
  "/",
  '<nav data-side-navigation><a data-side-navigation-item href="#overview">Overview</a><a data-side-navigation-item href="/missing/">Missing route</a></nav><h2 id="overview">Overview</h2>'
);
const missingRouteResult = verify(missingRoute);
if (missingRouteResult.status === 0 || !missingRouteResult.stderr.includes("SIDE_NAV_ROUTE_TARGET")) {
  throw new Error("Missing side navigation route did not fail verification.");
}

const noNavigation = join(root, "no-navigation");
await writePage(noNavigation, "/", "<h1>No navigation</h1>");
const noNavigationResult = verify(noNavigation);
if (noNavigationResult.status === 0 || !noNavigationResult.stderr.includes("SIDE_NAV_REQUIRED")) {
  throw new Error("Required side navigation absence did not fail verification.");
}

await rm(root, { recursive: true, force: true });
console.log("Side navigation verifier tests passed.");
