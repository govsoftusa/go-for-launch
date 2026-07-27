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
  adoptionGate: {
    brandReferenceSha256: "a".repeat(64),
    rendererContract: {
      kind: "toolkit-reference",
      name: "Test reference renderer",
      version: "1",
      sourceSha256: "b".repeat(64)
    },
    minimumPrototypeCards: 1,
    prototypeCardNames: ["home"],
    requiredCases: ["publication-identity", "long-headline"],
    prototypeCases: [
      { name: "home", cases: ["publication-identity", "long-headline"] }
    ],
    prototypeOutputDirectory: "prototype-public",
    prototypeReviewDirectory: "prototype-review",
    prototypeStateFile: "prototype-state.json",
    prototypeApprovalFile: "prototype-approval.json",
    reviewContract: {
      reviewer: "Prototype Reviewer",
      reviewedOn: "2026-07-15",
      brandReference: "Test brand system version 1",
      realClient: "Test messaging client",
      brandAuthorityApproved: true,
      templateAppropriateApproved: true,
      typographyApproved: true,
      paletteApproved: true,
      imageryApproved: true,
      noUnapprovedSyntheticArtwork: true,
      readabilityApproved: true,
      brandIntegrityApproved: true,
      contactInformationApproved: true
    }
  },
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

function run(extra = [], selectedConfig = config) {
  return spawnSync(process.execPath, [generateScript.pathname, `--config=${selectedConfig}`, ...extra], { encoding: "utf8" });
}

function review(extra = [], selectedConfig = config) {
  return spawnSync(process.execPath, [reviewScript.pathname, `--config=${selectedConfig}`, ...extra], { encoding: "utf8" });
}

await writeConfig();

const missing = run();
if (missing.status === 0 || !missing.stderr.includes("explicit regeneration")) {
  throw new Error("A normal build was allowed to create a missing Open Graph card.");
}

const blockedBulk = run(["--regenerate"]);
if (blockedBulk.status === 0 || !blockedBulk.stderr.includes("prototype approval is missing")) {
  throw new Error("Bulk Open Graph generation was allowed without representative prototype approval.");
}

const prototype = run(["--prototype"]);
if (prototype.status !== 0 || !prototype.stdout.includes("prototype generation complete")) {
  throw new Error(`Representative Open Graph prototype generation failed:\n${prototype.stdout}${prototype.stderr}`);
}
const prototypeSheets = review(["--prototype"]);
if (prototypeSheets.status !== 0) {
  throw new Error(`Representative Open Graph prototype review sheets failed:\n${prototypeSheets.stdout}${prototypeSheets.stderr}`);
}

await writeConfig({
  ...baseConfig,
  adoptionGate: {
    ...baseConfig.adoptionGate,
    reviewContract: {
      ...baseConfig.adoptionGate.reviewContract,
      templateAppropriateApproved: false
    }
  }
});
const rejectedPrototypeApproval = review(["--approve-prototype"]);
if (
  rejectedPrototypeApproval.status === 0 ||
  !rejectedPrototypeApproval.stderr.includes("template appropriateness")
) {
  throw new Error("Prototype approval was allowed without template appropriateness confirmation.");
}

await writeConfig();
const prototypeApproval = review(["--approve-prototype"]);
if (prototypeApproval.status !== 0) {
  throw new Error(`Representative Open Graph prototype approval failed:\n${prototypeApproval.stdout}${prototypeApproval.stderr}`);
}
const prototypeApprovalCheck = review(["--check-prototype"]);
if (prototypeApprovalCheck.status !== 0) {
  throw new Error(`Representative Open Graph prototype approval check failed:\n${prototypeApprovalCheck.stdout}${prototypeApprovalCheck.stderr}`);
}

await writeConfig({
  ...baseConfig,
  adoptionGate: {
    ...baseConfig.adoptionGate,
    rendererContract: {
      ...baseConfig.adoptionGate.rendererContract,
      sourceSha256: "d".repeat(64)
    }
  }
});
const changedRendererBlocked = run(["--regenerate"]);
if (
  changedRendererBlocked.status === 0 ||
  !changedRendererBlocked.stderr.includes("stale for the current visual system")
) {
  throw new Error("Changed renderer source did not invalidate prototype approval.");
}
await writeConfig();

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

const stalePrototype = run(["--regenerate"]);
if (stalePrototype.status === 0 || !stalePrototype.stderr.includes("prototype approval")) {
  throw new Error("Changed representative inputs did not invalidate prototype approval.");
}
const changedPrototype = run(["--prototype"]);
if (changedPrototype.status !== 0) throw new Error(`Changed prototype generation failed:\n${changedPrototype.stdout}${changedPrototype.stderr}`);
const changedPrototypeApproval = review(["--approve-prototype"]);
if (changedPrototypeApproval.status !== 0) {
  throw new Error(`Changed prototype approval failed:\n${changedPrototypeApproval.stdout}${changedPrototypeApproval.stderr}`);
}
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

const customConfig = join(root, "custom-open-graph.config.mjs");
const customBase = {
  ...baseConfig,
  outputDirectory: "custom-public",
  stateFile: "custom-state.json",
  adoptionGate: {
    ...baseConfig.adoptionGate,
    rendererContract: {
      kind: "project-owned",
      name: "Custom editorial renderer",
      version: "1",
      sourceSha256: "c".repeat(64)
    },
    prototypeOutputDirectory: "custom-prototype-public",
    prototypeReviewDirectory: "custom-prototype-review",
    prototypeStateFile: "custom-prototype-state.json",
    prototypeApprovalFile: "custom-prototype-approval.json"
  },
  cards: [
    {
      ...baseConfig.cards[0],
      brandAssetSha256: "brand-hash",
      renderingFingerprint: { layout: "custom-editorial", revision: 1 }
    }
  ]
};
await writeFile(
  customConfig,
  `const config = ${JSON.stringify(customBase)};
config.renderCard = async ({ width, height }) => \`<svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}"><rect width="100%" height="100%" fill="#d6ff70"/></svg>\`;
export default config;
`
);
const customPrototype = run(["--prototype"], customConfig);
if (customPrototype.status !== 0) {
  throw new Error(`Project-owned Open Graph prototype failed:\n${customPrototype.stdout}${customPrototype.stderr}`);
}
const customPrototypeApproval = review(["--approve-prototype"], customConfig);
if (customPrototypeApproval.status !== 0) {
  throw new Error(`Project-owned Open Graph prototype approval failed:\n${customPrototypeApproval.stdout}${customPrototypeApproval.stderr}`);
}
const customRendered = run(["--regenerate"], customConfig);
if (customRendered.status !== 0) {
  throw new Error(`Project-owned Open Graph renderer failed:\n${customRendered.stdout}${customRendered.stderr}`);
}
const customVerified = run([], customConfig);
if (customVerified.status !== 0 || !customVerified.stdout.includes("without rewriting")) {
  throw new Error(`Project-owned Open Graph output was not reusable:\n${customVerified.stdout}${customVerified.stderr}`);
}

await rm(root, { recursive: true, force: true });
log("Open Graph prototype adoption, reuse, custom rendering, explicit regeneration, input fingerprint, safe geometry, and hash-bound approval tests passed.");
