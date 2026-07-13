import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";
import sharp from "sharp";

const seoScript = new URL("./verify-seo.mjs", import.meta.url);
const imageScript = new URL("./verify-images.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-seo-"));
const site = "https://www.example.com";

function html({ route, title, image, lang = "en-US", headings = "<h1>Title</h1><h2>Section</h2>", jsonLd = '{"@context":"https://schema.org","@type":"WebPage"}', alternates = [] }) {
  const canonical = `${site}${route}`;
  return `<!doctype html><html lang="${lang}"><head><meta name="description" content="Description"><link rel="canonical" href="${canonical}">${alternates.map(({ hreflang, href }) => `<link rel="alternate" hreflang="${hreflang}" href="${href}">`).join("")}<meta property="og:title" content="${title}"><meta property="og:description" content="Description"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${site}/${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Preview"><script type="application/ld+json">${jsonLd}</script><title>${title}</title></head><body>${headings}<img src="/content.png" srcset="/content.png 800w" sizes="100vw" width="800" height="450" alt="Content" data-astro-image="constrained"></body></html>`;
}

async function page(directory, route, content, image) {
  const path = route === "/" ? join(directory, "index.html") : join(directory, route, "index.html");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#07110f" } }).png().toFile(join(directory, image));
}

function verify(script, directory, extra = []) {
  return spawnSync(process.execPath, [script.pathname, `--dir=${directory}`, `--site=${site}`, "--trailing-slash=always", ...extra], { encoding: "utf8" });
}

const single = join(root, "single");
await mkdir(single);
await page(single, "/", html({ route: "/", title: "Home", image: "og-home.png" }), "og-home.png");
const singleResult = verify(seoScript, single);
if (singleResult.status !== 0) throw new Error(`Valid single-locale fixture failed:\n${singleResult.stdout}${singleResult.stderr}`);
const imageResult = verify(imageScript, single);
if (imageResult.status !== 0) throw new Error(`Valid image fixture failed:\n${imageResult.stdout}${imageResult.stderr}`);

const bilingual = join(root, "bilingual");
await mkdir(bilingual);
const alternates = [
  { hreflang: "en-US", href: `${site}/about/` },
  { hreflang: "es", href: `${site}/es/acerca/` },
  { hreflang: "x-default", href: `${site}/about/` }
];
await page(bilingual, "/about/", html({ route: "/about/", title: "About", image: "og-about.png", alternates }), "og-about.png");
await page(bilingual, "/es/acerca/", html({ route: "/es/acerca/", title: "Acerca", image: "og-acerca.png", lang: "es", alternates }), "og-acerca.png");
const bilingualResult = verify(seoScript, bilingual, ["--require-hreflang=true"]);
if (bilingualResult.status !== 0) throw new Error(`Valid bilingual fixture failed:\n${bilingualResult.stdout}${bilingualResult.stderr}`);

const invalidJson = join(root, "invalid-json");
await mkdir(invalidJson);
await page(invalidJson, "/", html({ route: "/", title: "Invalid JSON", image: "og-json.png", jsonLd: "{" }), "og-json.png");
const invalidJsonResult = verify(seoScript, invalidJson);
if (invalidJsonResult.status === 0 || !invalidJsonResult.stderr.includes("JSON-LD is not valid JSON")) throw new Error("Invalid JSON-LD fixture did not fail correctly.");

const invalidHeading = join(root, "invalid-heading");
await mkdir(invalidHeading);
await page(invalidHeading, "/", html({ route: "/", title: "Invalid heading", image: "og-heading.png", headings: "<h1>Title</h1><h3>Skipped</h3>" }), "og-heading.png");
const invalidHeadingResult = verify(seoScript, invalidHeading);
if (invalidHeadingResult.status === 0 || !invalidHeadingResult.stderr.includes("heading level jumps")) throw new Error("Heading hierarchy fixture did not fail correctly.");

const invalidImage = join(root, "invalid-image");
await mkdir(invalidImage);
await page(invalidImage, "/", html({ route: "/", title: "Invalid image", image: "og-image.png" }).replace(' width="800" height="450"', ""), "og-image.png");
const invalidImageResult = verify(imageScript, invalidImage);
if (invalidImageResult.status === 0 || !invalidImageResult.stderr.includes("intrinsic width and height")) throw new Error("Image dimensions fixture did not fail correctly.");

const invalidReciprocal = join(root, "invalid-reciprocal");
await mkdir(invalidReciprocal);
await page(invalidReciprocal, "/about/", html({ route: "/about/", title: "About", image: "og-about.png", alternates }), "og-about.png");
await page(invalidReciprocal, "/es/acerca/", html({ route: "/es/acerca/", title: "Acerca", image: "og-acerca.png", lang: "es", alternates: alternates.slice(1) }), "og-acerca.png");
const invalidReciprocalResult = verify(seoScript, invalidReciprocal, ["--require-hreflang=true"]);
if (invalidReciprocalResult.status === 0 || !invalidReciprocalResult.stderr.includes("not reciprocal")) throw new Error("Hreflang reciprocity fixture did not fail correctly.");

await rm(root, { recursive: true, force: true });
log("SEO, JSON-LD, heading, hreflang, and image verifier tests passed.");
