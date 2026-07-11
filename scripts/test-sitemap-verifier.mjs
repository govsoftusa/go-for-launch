import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";
import { URL } from "node:url";

const script = new URL("./verify-sitemap.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-sitemap-"));

async function fixture(name, { pages = ["/", "/about/"], sitemapPages = pages, robots = true } = {}) {
  const directory = join(root, name);
  await mkdir(directory, { recursive: true });
  for (const route of pages) {
    const path = route === "/" ? join(directory, "index.html") : join(directory, route, "index.html");
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, `<html><head><link rel="canonical" href="https://www.example.com${route}"></head><body></body></html>`);
  }
  await writeFile(
    join(directory, "sitemap.xml"),
    `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPages.map((route) => `<url><loc>https://www.example.com${route}</loc></url>`).join("")}</urlset>`
  );
  if (robots) await writeFile(join(directory, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://www.example.com/sitemap.xml\n");
  return directory;
}

function verify(directory) {
  return spawnSync(process.execPath, [script.pathname, `--dir=${directory}`, "--site=https://www.example.com", "--sitemap=sitemap.xml"], { encoding: "utf8" });
}

const complete = verify(await fixture("complete"));
if (complete.status !== 0 || !complete.stdout.includes("2 indexable pages")) throw new Error(`Complete fixture failed:\n${complete.stdout}${complete.stderr}`);

const missingPage = verify(await fixture("missing-page", { sitemapPages: ["/"] }));
if (missingPage.status === 0 || !missingPage.stderr.includes("Built page is missing from the sitemap")) throw new Error("Missing page fixture did not fail correctly.");

const unexpectedPage = verify(await fixture("unexpected-page", { sitemapPages: ["/", "/about/", "/gone/"] }));
if (unexpectedPage.status === 0 || !unexpectedPage.stderr.includes("Sitemap URL has no indexable built page")) throw new Error("Unexpected page fixture did not fail correctly.");

const missingRobots = verify(await fixture("missing-robots", { robots: false }));
if (missingRobots.status === 0 || !missingRobots.stderr.includes("Missing dist/robots.txt")) throw new Error("Missing robots fixture did not fail correctly.");

await rm(root, { recursive: true, force: true });
log("Sitemap verifier tests passed.");
