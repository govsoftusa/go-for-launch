import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const generateScript = new URL("./generate-open-graph.mjs", import.meta.url);
const reviewScript = new URL("./review-open-graph.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-og-"));
const config = join(root, "open-graph.config.mjs");
const baseConfig = {
  outputDirectory: "public",
  reviewDirectory: "review",
  approvalFile: "open-graph-approvals.json",
  stateFile: "open-graph-state.json",
  templateVersion: "1",
  seoContractVersion: "1",
  maximumBytes: 250000,
  width: 1200,
  height: 630,
  eyebrow: "TEST TOOLKIT",
  tagline: "Build. Test. Release.",
  domain: "www.example.com",
  mark: "GFL",
  colors: {
    background: "#07110f",
    accent: "#d6ff70",
    secondary: "#83f3c8"
  },
  typography: {
    sansFamily: "Arial, sans-serif",
    accentFamily: "Georgia, serif",
    eyebrowSize: 18,
    headlineOneSize: 76,
    headlineTwoSize: 74,
    supportingSize: 24,
    destinationSize: 23
  },
  brandRules: {
    approvedColors: ["#07110f", "#d6ff70", "#83f3c8"],
    approvedFontFamilies: ["Arial, sans-serif", "Georgia, serif"],
    minimumSafePadding: 60,
    minimumSupportingTextSize: 18,
    maximumHeadlineTextSize: 84
  },
  contactInformation: { required: true, value: "www.example.com" },
  reviewContract: {
    reviewer: "Test Reviewer",
    reviewedOn: "2026-07-15",
    brandReference: "Test brand system version 1",
    readabilityApproved: true,
    brandIntegrityApproved: true,
    contactInformationApproved: true
  },
  cards: [{ name: "home", purpose: "Verify a readable homepage sharing card.", lineOne: "Build better", lineTwo: "Astro websites." }]
};

async function writeConfig(value = baseConfig) {
  await writeFile(config, `export default ${JSON.stringify(value)};\n`);
}

function run(extra = []) {
  return spawnSync(process.execPath, [generateScript.pathname, `--config=${config}`, ...extra], { encoding: "utf8" });
}

function review(extra = []) {
  return spawnSync(process.execPath, [reviewScript.pathname, `--config=${config}`, ...extra], { encoding: "utf8" });
}

await writeConfig();

const missing = run();
if (missing.status === 0 || !missing.stderr.includes("explicit regeneration")) {
  throw new Error("A normal build was allowed to create a missing Open Graph card.");
}

const first = run(["--regenerate"]);
if (first.status !== 0) throw new Error(`First explicit Open Graph regeneration failed:\n${first.stdout}${first.stderr}`);
const output = join(root, "public", "og-home.png");
const firstBytes = await readFile(output);
const firstHash = createHash("sha256").update(firstBytes).digest("hex");
const firstMtime = (await stat(output, { bigint: true })).mtimeNs;

const verify = run();
if (verify.status !== 0 || !verify.stdout.includes("without rewriting")) {
  throw new Error(`Read-only Open Graph verification failed:\n${verify.stdout}${verify.stderr}`);
}
const verifiedMtime = (await stat(output, { bigint: true })).mtimeNs;
if (verifiedMtime !== firstMtime) throw new Error("Read-only Open Graph verification rewrote an unchanged card.");

const explicitUnchanged = run(["--regenerate"]);
if (explicitUnchanged.status !== 0 || !explicitUnchanged.stdout.includes("0 generated, 1 unchanged")) {
  throw new Error(`Explicit regeneration did not reuse an unchanged card:\n${explicitUnchanged.stdout}${explicitUnchanged.stderr}`);
}
const reusedMtime = (await stat(output, { bigint: true })).mtimeNs;
if (reusedMtime !== firstMtime) throw new Error("Explicit regeneration rewrote a card whose inputs were unchanged.");

await writeConfig({ ...baseConfig, unrelatedSeoPolicyNote: "This does not affect card rendering." });
const unrelatedSeoChange = run();
if (unrelatedSeoChange.status !== 0) {
  throw new Error(`An unrelated SEO policy change invalidated the card:\n${unrelatedSeoChange.stdout}${unrelatedSeoChange.stderr}`);
}
if ((await stat(output, { bigint: true })).mtimeNs !== firstMtime) throw new Error("An unrelated SEO policy change rewrote the card.");

const reviewSheets = review();
if (reviewSheets.status !== 0) throw new Error(`Open Graph review sheet generation failed:\n${reviewSheets.stdout}${reviewSheets.stderr}`);
const unapproved = review(["--check"]);
if (unapproved.status === 0 || !unapproved.stderr.includes("missing or stale")) {
  throw new Error("Unapproved Open Graph images did not fail visual review.");
}
const approval = review(["--approve"]);
if (approval.status !== 0) throw new Error(`Open Graph visual approval failed:\n${approval.stdout}${approval.stderr}`);
const approved = review(["--check"]);
if (approved.status !== 0) throw new Error(`Approved Open Graph images did not pass review:\n${approved.stdout}${approved.stderr}`);

const changedConfig = {
  ...baseConfig,
  cards: [{ name: "home", purpose: "Verify a readable homepage sharing card.", lineOne: "Ship better", lineTwo: "Astro websites." }]
};
await writeConfig(changedConfig);
const changedWithoutPermission = run();
if (changedWithoutPermission.status === 0 || !changedWithoutPermission.stderr.includes("rendering inputs changed")) {
  throw new Error("Changed card inputs did not require explicit regeneration.");
}
const unchangedBytes = await readFile(output);
if (!unchangedBytes.equals(firstBytes)) throw new Error("A failed read-only check changed card bytes.");

const changedWithPermission = run(["--regenerate"]);
if (changedWithPermission.status !== 0) throw new Error(`Explicit changed-card regeneration failed:\n${changedWithPermission.stdout}${changedWithPermission.stderr}`);
const secondHash = createHash("sha256").update(await readFile(output)).digest("hex");
if (firstHash === secondHash) throw new Error("Changed rendering inputs did not change Open Graph output.");
const staleApproval = review(["--check"]);
if (staleApproval.status === 0 || !staleApproval.stderr.includes("missing or stale")) {
  throw new Error("Changed card output did not invalidate visual approval.");
}

await writeFile(output, "stale");
const stale = run();
if (stale.status === 0 || !stale.stderr.includes("card bytes do not match")) throw new Error("Altered card bytes did not fail read-only verification.");
const repaired = run(["--regenerate"]);
if (repaired.status !== 0) throw new Error(`Explicit repair failed:\n${repaired.stdout}${repaired.stderr}`);

await writeConfig({
  ...baseConfig,
  domain: "www.example.com/a/path/that/is/intentionally/far/too/long/for/a/useful/social-card/destination..."
});
const truncatedUrl = run(["--regenerate"]);
if (truncatedUrl.status === 0 || !truncatedUrl.stderr.includes("must not be truncated")) {
  throw new Error("A truncated display URL did not fail card generation.");
}

await writeConfig({
  ...baseConfig,
  cards: [{ name: "unsafe", purpose: "Verify unsafe title rejection.", lineOne: "This title is intentionally much too long for the configured safe text region", lineTwo: "Review required." }]
});
const unsafe = run(["--regenerate"]);
if (unsafe.status === 0 || !unsafe.stderr.includes("safe text region")) {
  throw new Error("Unsafe Open Graph text geometry did not fail generation.");
}

await writeConfig({
  ...baseConfig,
  typography: { ...baseConfig.typography, destinationSize: 12 }
});
const tooSmall = run(["--regenerate"]);
if (tooSmall.status === 0 || !tooSmall.stderr.includes("below the brand readability minimum")) {
  throw new Error("Supporting text below the brand readability minimum did not fail generation.");
}

await writeConfig({
  ...baseConfig,
  colors: { ...baseConfig.colors, accent: "#ff00ff" }
});
const unsafeColor = run(["--regenerate"]);
if (unsafeColor.status === 0 || !unsafeColor.stderr.includes("not in brandRules.approvedColors")) {
  throw new Error("A non-brand color did not fail generation.");
}

await writeConfig({
  ...baseConfig,
  reviewContract: { ...baseConfig.reviewContract, readabilityApproved: false }
});
const unreadableApproval = review(["--approve"]);
if (unreadableApproval.status === 0 || !unreadableApproval.stderr.includes("readability approval")) {
  throw new Error("Visual approval was allowed without explicit readability approval.");
}

await rm(root, { recursive: true, force: true });
log("Open Graph reuse, explicit regeneration, input fingerprint, safe geometry, and hash-bound approval tests passed.");
