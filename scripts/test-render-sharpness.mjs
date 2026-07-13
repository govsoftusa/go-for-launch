import assert from "node:assert/strict";
import { log } from "node:console";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeCss, analyzeMarkup, runSharpnessAudit } from "./lib/render-sharpness.mjs";

const cleanCss = `
body { font-family: system-ui, sans-serif; text-rendering: auto; -webkit-font-smoothing: auto; }
.glass::before { backdrop-filter: blur(16px); }
.art { --render-sharpness-intent: intentional; filter: blur(6px); }
.button:hover { transform: scale(0.98); }
`;

assert.equal(analyzeCss(cleanCss).length, 0);

const riskyCss = `
body { font-family: Inter, system-ui, sans-serif; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
.header { backdrop-filter: blur(20px); transform: translateY(1.1rem); will-change: transform; }
.label { text-shadow: 0 1px 3px rgb(0 0 0 / 30%); }
`;

const codes = analyzeCss(riskyCss).map((finding) => finding.code).sort();
assert.deepEqual(codes, [
  "blurred-text-shadow",
  "content-backdrop-blur",
  "forced-font-smoothing",
  "forced-text-rendering",
  "fractional-content-transform",
  "permanent-compositor-layer",
  "unshipped-font-family"
].sort());

assert.equal(analyzeMarkup('<svg width="44" height="44" viewBox="0 0 48 48"></svg>').length, 1);
assert.equal(analyzeMarkup('<svg width="48" height="48" viewBox="0 0 48 48"></svg>').length, 0);
assert.equal(analyzeMarkup('<svg width="44" height="44" viewBox="0 0 48 48" data-render-sharpness="allow"></svg>').length, 0);
assert.equal(analyzeMarkup('<svg viewBox="0 0 48 48"></svg>').length, 0);
assert.equal(analyzeCss('code { font-family: monospace; } .reset { font-family: unset; }').length, 0);

const root = mkdtempSync(join(tmpdir(), "go-for-launch-sharpness-"));
mkdirSync(join(root, "styles"));
writeFileSync(join(root, "styles", "site.css"), riskyCss);
writeFileSync(join(root, "styles", "fonts.css"), '@font-face { font-family: Inter; src: url("/inter.woff2"); }');
writeFileSync(join(root, "index.html"), '<svg width="44" height="44" viewBox="0 0 48 48"></svg>');

const before = runSharpnessAudit(root);
assert.equal(before.status, "failed");
assert.ok(before.findings.length >= 8);

const after = runSharpnessAudit(root, { fix: true });
const fixedCss = readFileSync(join(root, "styles", "site.css"), "utf8");
const fixedHtml = readFileSync(join(root, "index.html"), "utf8");

assert.match(fixedCss, /backdrop-filter:\s*none/);
assert.match(fixedCss, /transform:\s*none/);
assert.match(fixedCss, /will-change:\s*auto/);
assert.match(fixedCss, /text-rendering:\s*auto/);
assert.match(fixedCss, /-webkit-font-smoothing:\s*auto/);
assert.match(fixedHtml, /width="48" height="48"/);
assert.equal(after.findings.length, 0);

log("Render sharpness tests passed.");
