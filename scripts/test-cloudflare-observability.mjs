import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const verifier = new URL("./verify-cloudflare-observability.mjs", import.meta.url);
const root = await mkdtemp(join(tmpdir(), "go-for-launch-cloudflare-"));

function payload({ lcpP75 = 2_000_000, lcpP99 = 4_000_000, inpP75 = 100_000, clsP75 = 0.05, edge500 = 0 } = {}) {
  return {
    rum: {
      data: {
        viewer: {
          accounts: [{
            routeVitals: [{
              count: 30,
              dimensions: { requestPath: "/", deviceType: "mobile" },
              quantiles: {
                largestContentfulPaintP75: lcpP75,
                largestContentfulPaintP99: lcpP99,
                interactionToNextPaintP75: inpP75,
                cumulativeLayoutShiftP75: clsP75
              }
            }],
            lcpDebug: [{
              count: 30,
              dimensions: {
                requestPath: "/",
                deviceType: "mobile",
                largestContentfulPaintElement: "main img.hero",
                largestContentfulPaintObjectHost: "www.example.gov",
                largestContentfulPaintObjectPath: "/images/hero.webp",
                lcpFetchPriority: "high",
                lcpInitiatorType: "img"
              },
              quantiles: {
                largestContentfulPaintP75: lcpP75,
                largestContentfulPaintP90: lcpP75,
                largestContentfulPaintP99: lcpP99,
                lcpResourceLoadDelayP75: 100_000,
                lcpResourceLoadTimeP75: 200_000,
                lcpElementRenderDelayP75: 300_000
              }
            }],
            inpDebug: [],
            clsDebug: []
          }]
        }
      }
    },
    edge: {
      data: {
        viewer: {
          zones: [{
            edgeStatusTotals: [
              { count: 1000 - edge500, dimensions: { edgeResponseStatus: 200 } },
              { count: edge500, dimensions: { edgeResponseStatus: 500 } }
            ],
            edgeErrorPaths: edge500 > 0 ? [{ count: edge500, dimensions: { clientRequestPath: "/api/contact", edgeResponseStatus: 500 } }] : []
          }]
        }
      }
    }
  };
}

function run(input, output, extra = [], env = process.env) {
  return spawnSync(process.execPath, [verifier.pathname, `--input=${input}`, `--output=${output}`, ...extra], { encoding: "utf8", env });
}

const cleanInput = join(root, "clean.json");
const cleanOutput = join(root, "clean-report.json");
await writeFile(cleanInput, JSON.stringify(payload()));
const clean = run(cleanInput, cleanOutput, ["--mode=thresholds", "--required=true", "--edge-required=true"]);
if (clean.status !== 0) throw new Error(`Clean Cloudflare fixture failed:\n${clean.stdout}${clean.stderr}`);
const cleanReport = JSON.parse(await readFile(cleanOutput, "utf8"));
if (cleanReport.counts.blockingFindings !== 0 || cleanReport.routes[0].largestContentfulPaintP75Ms !== 2000) {
  throw new Error("Clean Cloudflare report is incorrect.");
}

const blockedInput = join(root, "blocked.json");
const blockedOutput = join(root, "blocked-report.json");
await writeFile(blockedInput, JSON.stringify(payload({ lcpP75: 3_000_000, lcpP99: 10_000_000, edge500: 25 })));
const blocked = run(blockedInput, blockedOutput, ["--mode=thresholds", "--required=true", "--edge-required=true"]);
if (blocked.status === 0 || !blocked.stderr.includes("rum-lcp-p99-element") || !blocked.stderr.includes("edge-5xx-rate")) {
  throw new Error("Blocking Cloudflare fixture did not fail on RUM and edge errors.");
}
const blockedReport = JSON.parse(await readFile(blockedOutput, "utf8"));
if (blockedReport.counts.blockingFindings < 3 || blockedReport.edge.rate5xx !== 0.025) {
  throw new Error("Blocking Cloudflare report counts are incorrect.");
}

const advisoryOutput = join(root, "advisory-report.json");
const advisory = run(blockedInput, advisoryOutput, ["--mode=advisory"]);
if (advisory.status !== 0) throw new Error("Advisory Cloudflare findings should not block.");
const advisoryReport = JSON.parse(await readFile(advisoryOutput, "utf8"));
if (!advisoryReport.findings.some((item) => item.severity === "warning")) throw new Error("Advisory findings were not recorded.");

const partialInput = join(root, "partial.json");
const partialOutput = join(root, "partial-report.json");
const partialPayload = payload();
partialPayload.edge = { errors: [{ message: "zone analytics permission unavailable" }] };
await writeFile(partialInput, JSON.stringify(partialPayload));
const partial = run(partialInput, partialOutput, ["--mode=advisory"]);
if (partial.status !== 0) throw new Error("Optional edge permission should not discard valid RUM evidence.");
const partialReport = JSON.parse(await readFile(partialOutput, "utf8"));
if (!partialReport.availability.rum || partialReport.availability.edge || partialReport.availability.edgeErrors.length !== 1) {
  throw new Error("Partial Cloudflare permission state is incorrect.");
}
const requiredEdgeOutput = join(root, "required-edge-report.json");
const requiredEdge = run(partialInput, requiredEdgeOutput, ["--mode=advisory", "--edge-required=true"]);
if (requiredEdge.status === 0 || !requiredEdge.stderr.includes("cloudflare-edge-api-error")) {
  throw new Error("Required edge permission failure did not block.");
}

const baselineInput = join(root, "baseline.json");
const baselineOutput = join(root, "baseline-report.json");
await writeFile(baselineInput, JSON.stringify(payload({ lcpP75: 1_000_000 })));
const baselineRun = run(baselineInput, baselineOutput, ["--mode=advisory"]);
if (baselineRun.status !== 0) throw new Error("Baseline Cloudflare fixture failed.");
const regressionOutput = join(root, "regression-report.json");
const regressionRun = run(cleanInput, regressionOutput, ["--mode=regressions", `--baseline=${baselineOutput}`]);
if (regressionRun.status === 0 || !regressionRun.stderr.includes("rum-lcp-regression")) {
  throw new Error("Cloudflare baseline regression did not fail.");
}
const missingBaselineOutput = join(root, "missing-baseline-report.json");
const missingBaseline = run(cleanInput, missingBaselineOutput, ["--mode=regressions"]);
if (missingBaseline.status === 0 || !missingBaseline.stderr.includes("cloudflare-baseline-required")) {
  throw new Error("Cloudflare regression mode passed without a baseline.");
}

const optionalOutput = join(root, "optional-report.json");
const optional = spawnSync(process.execPath, [verifier.pathname, `--output=${optionalOutput}`], {
  encoding: "utf8",
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: "",
    CLOUDFLARE_GLOBAL_API_KEY: "",
    CLOUDFLARE_AUTH_EMAIL: "",
    CLOUDFLARE_ACCOUNT_ID: "",
    CLOUDFLARE_RUM_HOSTNAME: ""
  }
});
if (optional.status !== 0) throw new Error("Optional Cloudflare check should skip without credentials.");
const optionalReport = JSON.parse(await readFile(optionalOutput, "utf8"));
if (!optionalReport.skipped || optionalReport.status !== "skipped") throw new Error("Optional Cloudflare report did not record its skipped state.");

await rm(root, { recursive: true, force: true });
log("Cloudflare observability verifier tests passed.");
