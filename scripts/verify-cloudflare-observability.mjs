import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { error, log } from "node:console";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function booleanOption(name, fallback) {
  return option(name, String(fallback)) === "true";
}

async function loadConfig(path) {
  if (!path) return {};
  const absolute = resolve(path);
  if (absolute.endsWith(".json")) return JSON.parse(await readFile(absolute, "utf8"));
  return (await import(`${pathToFileURL(absolute).href}?v=${Date.now()}`)).default;
}

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function duration(value, divisor) {
  const number = finite(value);
  return number === null ? null : number / divisor;
}

function ratio(value, total) {
  return total > 0 ? value / total : null;
}

function routeKey(route) {
  return `${route.path}\u0000${route.deviceType}`;
}

function thresholdSeverity(mode) {
  return mode === "thresholds" ? "error" : "warning";
}

function regressionSeverity(mode) {
  return mode === "thresholds" || mode === "regressions" ? "error" : "warning";
}

async function graphqlRequest(endpoint, authentication, query, variables) {
  const authenticationHeaders = authentication.mode === "api-token"
    ? { Authorization: `Bearer ${authentication.apiToken}` }
    : {
        "X-Auth-Email": authentication.authEmail,
        "X-Auth-Key": authentication.globalApiKey
      };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...authenticationHeaders,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`Cloudflare GraphQL API returned HTTP ${response.status}.`);
  return response.json();
}

function apiErrors(payload) {
  return Array.isArray(payload?.errors)
    ? payload.errors.map((item) => String(item.message || item)
      .replace(/com\.cloudflare\.api\.token\.[a-z0-9]+/gi, "Cloudflare API token")
      .replace(/\b[a-f0-9]{32}\b/gi, "[resource-id]"))
    : [];
}

const config = await loadConfig(option("--config", ""));
const input = option("--input", config.input || "");
const output = resolve(option("--output", config.output || "artifacts/cloudflare-observability-report.json"));
const baselineInput = option("--baseline", config.baselineInput || "");
const required = booleanOption("--required", config.required ?? false);
const edgeRequired = booleanOption("--edge-required", config.edgeRequired ?? false);
const mode = option("--mode", config.mode || "advisory");
const accountId = option("--account-id", String(config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || ""));
const zoneId = option("--zone-id", String(config.zoneId || process.env.CLOUDFLARE_ZONE_ID || ""));
const hostname = option("--hostname", String(config.hostname || process.env.CLOUDFLARE_RUM_HOSTNAME || ""));
const apiTokenEnvironmentVariable = config.apiTokenEnvironmentVariable || "CLOUDFLARE_API_TOKEN";
const apiToken = process.env[apiTokenEnvironmentVariable] || "";
const globalApiKeyEnvironmentVariable = config.globalApiKeyEnvironmentVariable || "CLOUDFLARE_GLOBAL_API_KEY";
const authEmailEnvironmentVariable = config.authEmailEnvironmentVariable || "CLOUDFLARE_AUTH_EMAIL";
const globalApiKey = process.env[globalApiKeyEnvironmentVariable] || "";
const authEmail = process.env[authEmailEnvironmentVariable] || "";
const authentication = apiToken
  ? { mode: "api-token", apiToken, globalApiKey: "", authEmail: "" }
  : globalApiKey && authEmail
    ? { mode: "global-api-key", apiToken: "", globalApiKey, authEmail }
    : { mode: "none", apiToken: "", globalApiKey: "", authEmail: "" };
const endpoint = config.endpoint || "https://api.cloudflare.com/client/v4/graphql";
const windowHours = Math.max(1, Number(config.windowHours || 24));
const minimumSamples = Math.max(1, Number(config.minimumSamples || 20));
const minimumEdgeRequests = Math.max(1, Number(config.minimumEdgeRequests || 100));
const groupLimit = Math.min(1000, Math.max(1, Number(config.groupLimit || 250)));
const durationDivisor = Number(config.durationDivisor || 1000);
const thresholds = {
  largestContentfulPaintP75Ms: 2500,
  largestContentfulPaintP99Ms: 8000,
  interactionToNextPaintP75Ms: 200,
  cumulativeLayoutShiftP75: 0.1,
  edge4xxRate: null,
  edge5xxRate: 0.01,
  ...(config.thresholds || {})
};
const regression = {
  ratio: 1.25,
  largestContentfulPaintP75Ms: 250,
  interactionToNextPaintP75Ms: 50,
  cumulativeLayoutShiftP75: 0.05,
  ...(config.regression || {})
};

if (!new Set(["advisory", "thresholds", "regressions"]).has(mode)) {
  throw new Error(`Unsupported Cloudflare observability mode: ${mode}`);
}
if (!Number.isFinite(durationDivisor) || durationDivisor <= 0) {
  throw new Error("durationDivisor must be a positive number.");
}

const start = option("--start", config.start || isoHoursAgo(windowHours));
const end = option("--end", config.end || new Date().toISOString());
let source = "none";
let rumPayload = null;
let edgePayload = null;
let skippedReason = "";

const rumQuery = `
query CloudflareRum($accountId: string!, $host: string!, $start: Time!, $end: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountId }) {
      routeVitals: rumWebVitalsEventsAdaptiveGroups(
        limit: ${groupLimit}
        filter: { datetime_geq: $start, datetime_leq: $end, requestHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { requestPath deviceType }
        quantiles {
          largestContentfulPaintP75
          largestContentfulPaintP99
          interactionToNextPaintP75
          cumulativeLayoutShiftP75
        }
      }
      lcpDebug: rumWebVitalsEventsAdaptiveGroups(
        limit: ${groupLimit}
        filter: { datetime_geq: $start, datetime_leq: $end, requestHost: $host }
        orderBy: [quantiles_largestContentfulPaintP99_DESC]
      ) {
        count
        dimensions {
          requestPath
          deviceType
          largestContentfulPaintElement
          largestContentfulPaintObjectHost
          largestContentfulPaintObjectPath
          lcpFetchPriority
          lcpInitiatorType
        }
        quantiles {
          largestContentfulPaintP75
          largestContentfulPaintP90
          largestContentfulPaintP99
          lcpResourceLoadDelayP75
          lcpResourceLoadTimeP75
          lcpElementRenderDelayP75
        }
      }
      inpDebug: rumWebVitalsEventsAdaptiveGroups(
        limit: ${groupLimit}
        filter: { datetime_geq: $start, datetime_leq: $end, requestHost: $host }
        orderBy: [quantiles_interactionToNextPaintP99_DESC]
      ) {
        count
        dimensions { requestPath deviceType interactionToNextPaintElement interactionToNextPaintName }
        quantiles { interactionToNextPaintP75 interactionToNextPaintP90 interactionToNextPaintP99 }
      }
      clsDebug: rumWebVitalsEventsAdaptiveGroups(
        limit: ${groupLimit}
        filter: { datetime_geq: $start, datetime_leq: $end, requestHost: $host }
        orderBy: [quantiles_cumulativeLayoutShiftP99_DESC]
      ) {
        count
        dimensions { requestPath deviceType cumulativeLayoutShiftElement }
        quantiles { cumulativeLayoutShiftP75 cumulativeLayoutShiftP90 cumulativeLayoutShiftP99 }
      }
    }
  }
}`;

const edgeQuery = `
query CloudflareEdge($zoneId: string!, $host: string!, $start: Time!, $end: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneId }) {
      edgeStatusTotals: httpRequestsAdaptiveGroups(
        limit: 600
        filter: { datetime_geq: $start, datetime_leq: $end, clientRequestHTTPHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { edgeResponseStatus }
      }
      edgeErrorPaths: httpRequestsAdaptiveGroups(
        limit: ${groupLimit}
        filter: {
          datetime_geq: $start
          datetime_leq: $end
          clientRequestHTTPHost: $host
          edgeResponseStatus_geq: 400
        }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { clientRequestPath edgeResponseStatus }
      }
    }
  }
}`;

if (input) {
  const fixture = JSON.parse(await readFile(resolve(input), "utf8"));
  rumPayload = fixture.rum || fixture;
  edgePayload = fixture.edge || null;
  source = "file";
} else if (accountId && hostname && authentication.mode !== "none") {
  const variables = { accountId, host: hostname, start, end };
  rumPayload = await graphqlRequest(endpoint, authentication, rumQuery, variables);
  if (zoneId) {
    edgePayload = await graphqlRequest(endpoint, authentication, edgeQuery, { zoneId, host: hostname, start, end });
  }
  source = "api";
} else {
  const missing = [
    !accountId ? "CLOUDFLARE_ACCOUNT_ID" : "",
    !hostname ? "CLOUDFLARE_RUM_HOSTNAME" : "",
    authentication.mode === "none" ? `${apiTokenEnvironmentVariable} or ${globalApiKeyEnvironmentVariable} with ${authEmailEnvironmentVariable}` : ""
  ].filter(Boolean);
  skippedReason = `Cloudflare observability check skipped because ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} unavailable.`;
}

const rumErrors = apiErrors(rumPayload);
const edgeErrors = apiErrors(edgePayload);
const account = rumPayload?.data?.viewer?.accounts?.[0] || {};
const zone = edgePayload?.data?.viewer?.zones?.[0] || {};
const routes = (account.routeVitals || []).map((group) => ({
  path: group.dimensions?.requestPath || "",
  deviceType: group.dimensions?.deviceType || "unknown",
  samples: Number(group.count || 0),
  largestContentfulPaintP75Ms: duration(group.quantiles?.largestContentfulPaintP75, durationDivisor),
  largestContentfulPaintP99Ms: duration(group.quantiles?.largestContentfulPaintP99, durationDivisor),
  interactionToNextPaintP75Ms: duration(group.quantiles?.interactionToNextPaintP75, durationDivisor),
  cumulativeLayoutShiftP75: finite(group.quantiles?.cumulativeLayoutShiftP75)
}));
const lcpDebug = (account.lcpDebug || []).map((group) => ({
  path: group.dimensions?.requestPath || "",
  deviceType: group.dimensions?.deviceType || "unknown",
  samples: Number(group.count || 0),
  element: group.dimensions?.largestContentfulPaintElement || "",
  assetHost: group.dimensions?.largestContentfulPaintObjectHost || "",
  assetPath: group.dimensions?.largestContentfulPaintObjectPath || "",
  fetchPriority: group.dimensions?.lcpFetchPriority || "",
  initiatorType: group.dimensions?.lcpInitiatorType || "",
  largestContentfulPaintP75Ms: duration(group.quantiles?.largestContentfulPaintP75, durationDivisor),
  largestContentfulPaintP90Ms: duration(group.quantiles?.largestContentfulPaintP90, durationDivisor),
  largestContentfulPaintP99Ms: duration(group.quantiles?.largestContentfulPaintP99, durationDivisor),
  resourceLoadDelayP75Ms: duration(group.quantiles?.lcpResourceLoadDelayP75, durationDivisor),
  resourceLoadTimeP75Ms: duration(group.quantiles?.lcpResourceLoadTimeP75, durationDivisor),
  elementRenderDelayP75Ms: duration(group.quantiles?.lcpElementRenderDelayP75, durationDivisor)
}));
const inpDebug = (account.inpDebug || []).map((group) => ({
  path: group.dimensions?.requestPath || "",
  deviceType: group.dimensions?.deviceType || "unknown",
  samples: Number(group.count || 0),
  element: group.dimensions?.interactionToNextPaintElement || "",
  interaction: group.dimensions?.interactionToNextPaintName || "",
  interactionToNextPaintP75Ms: duration(group.quantiles?.interactionToNextPaintP75, durationDivisor),
  interactionToNextPaintP90Ms: duration(group.quantiles?.interactionToNextPaintP90, durationDivisor),
  interactionToNextPaintP99Ms: duration(group.quantiles?.interactionToNextPaintP99, durationDivisor)
}));
const clsDebug = (account.clsDebug || []).map((group) => ({
  path: group.dimensions?.requestPath || "",
  deviceType: group.dimensions?.deviceType || "unknown",
  samples: Number(group.count || 0),
  element: group.dimensions?.cumulativeLayoutShiftElement || "",
  cumulativeLayoutShiftP75: finite(group.quantiles?.cumulativeLayoutShiftP75),
  cumulativeLayoutShiftP90: finite(group.quantiles?.cumulativeLayoutShiftP90),
  cumulativeLayoutShiftP99: finite(group.quantiles?.cumulativeLayoutShiftP99)
}));
const statusTotals = (zone.edgeStatusTotals || []).map((group) => ({
  status: Number(group.dimensions?.edgeResponseStatus || 0),
  requests: Number(group.count || 0)
}));
const totalRequests = statusTotals.reduce((sum, item) => sum + item.requests, 0);
const requests4xx = statusTotals.filter((item) => item.status >= 400 && item.status < 500).reduce((sum, item) => sum + item.requests, 0);
const requests5xx = statusTotals.filter((item) => item.status >= 500).reduce((sum, item) => sum + item.requests, 0);
const edge = {
  available: Boolean(edgePayload) && edgeErrors.length === 0,
  totalRequests,
  requests4xx,
  requests5xx,
  rate4xx: ratio(requests4xx, totalRequests),
  rate5xx: ratio(requests5xx, totalRequests),
  errorPaths: (zone.edgeErrorPaths || []).map((group) => ({
    path: group.dimensions?.clientRequestPath || "",
    status: Number(group.dimensions?.edgeResponseStatus || 0),
    requests: Number(group.count || 0)
  }))
};

const findings = [];
function finding(severity, code, details) {
  findings.push({ severity, code, ...details });
}

if (source === "none") {
  finding(required ? "error" : "info", "cloudflare-observability-skipped", { message: skippedReason });
}
for (const message of rumErrors) {
  finding(required ? "error" : "warning", "cloudflare-rum-api-error", { message });
}
for (const message of edgeErrors) {
  finding(edgeRequired ? "error" : "warning", "cloudflare-edge-api-error", { message });
}
if (source !== "none" && rumErrors.length === 0 && routes.length === 0) {
  finding(required ? "error" : "info", "cloudflare-rum-no-data", {
    message: "Cloudflare returned no RUM route groups for the configured host and time window."
  });
}
if (edgeRequired && !edgePayload) {
  finding("error", "cloudflare-edge-unavailable", {
    message: "Edge HTTP analytics are required but CLOUDFLARE_ZONE_ID or edge analytics evidence is unavailable."
  });
}
if (mode === "regressions" && !baselineInput) {
  finding("error", "cloudflare-baseline-required", {
    message: "Regression mode requires a prior machine-readable Cloudflare observability report."
  });
}

for (const route of routes.filter((item) => item.samples >= minimumSamples)) {
  const metrics = [
    ["largestContentfulPaintP75Ms", thresholds.largestContentfulPaintP75Ms, "rum-lcp-p75"],
    ["interactionToNextPaintP75Ms", thresholds.interactionToNextPaintP75Ms, "rum-inp-p75"],
    ["cumulativeLayoutShiftP75", thresholds.cumulativeLayoutShiftP75, "rum-cls-p75"]
  ];
  for (const [metric, maximum, code] of metrics) {
    if (route[metric] !== null && route[metric] > maximum) {
      finding(thresholdSeverity(mode), code, {
        path: route.path,
        deviceType: route.deviceType,
        samples: route.samples,
        metric,
        value: route[metric],
        maximum
      });
    }
  }
}

for (const item of lcpDebug.filter((entry) => entry.samples >= minimumSamples)) {
  if (item.largestContentfulPaintP99Ms !== null && item.largestContentfulPaintP99Ms > thresholds.largestContentfulPaintP99Ms) {
    finding(thresholdSeverity(mode), "rum-lcp-p99-element", {
      path: item.path,
      deviceType: item.deviceType,
      samples: item.samples,
      element: item.element,
      assetHost: item.assetHost,
      assetPath: item.assetPath,
      value: item.largestContentfulPaintP99Ms,
      maximum: thresholds.largestContentfulPaintP99Ms
    });
  }
}

if (edge.available && totalRequests >= minimumEdgeRequests) {
  if (typeof thresholds.edge4xxRate === "number" && Number.isFinite(thresholds.edge4xxRate) && edge.rate4xx > thresholds.edge4xxRate) {
    finding(thresholdSeverity(mode), "edge-4xx-rate", { value: edge.rate4xx, maximum: thresholds.edge4xxRate, requests: requests4xx, totalRequests });
  }
  if (edge.rate5xx > thresholds.edge5xxRate) {
    finding(thresholdSeverity(mode), "edge-5xx-rate", { value: edge.rate5xx, maximum: thresholds.edge5xxRate, requests: requests5xx, totalRequests });
  }
}

let baseline = null;
if (baselineInput) {
  baseline = JSON.parse(await readFile(resolve(baselineInput), "utf8"));
  const previousRoutes = new Map((baseline.routes || []).map((route) => [routeKey(route), route]));
  const metricRules = [
    ["largestContentfulPaintP75Ms", regression.largestContentfulPaintP75Ms, "rum-lcp-regression"],
    ["interactionToNextPaintP75Ms", regression.interactionToNextPaintP75Ms, "rum-inp-regression"],
    ["cumulativeLayoutShiftP75", regression.cumulativeLayoutShiftP75, "rum-cls-regression"]
  ];
  for (const route of routes.filter((item) => item.samples >= minimumSamples)) {
    const previous = previousRoutes.get(routeKey(route));
    if (!previous || Number(previous.samples || 0) < minimumSamples) continue;
    for (const [metric, minimumDelta, code] of metricRules) {
      const currentValue = finite(route[metric]);
      const previousValue = finite(previous[metric]);
      if (currentValue === null || previousValue === null) continue;
      const delta = currentValue - previousValue;
      const regressedByRatio = previousValue === 0 ? currentValue > minimumDelta : currentValue / previousValue >= regression.ratio;
      if (delta >= minimumDelta && regressedByRatio) {
        finding(regressionSeverity(mode), code, {
          path: route.path,
          deviceType: route.deviceType,
          samples: route.samples,
          metric,
          previous: previousValue,
          current: currentValue,
          delta,
          requiredRatio: regression.ratio
        });
      }
    }
  }
}

const blockingFindings = findings.filter((item) => item.severity === "error");
const warningFindings = findings.filter((item) => item.severity === "warning");
const status = blockingFindings.length > 0
  ? "failed"
  : source === "none"
    ? "skipped"
    : rumErrors.length > 0
      ? "permission-error"
      : edgeErrors.length > 0
        ? "partial"
        : routes.length === 0
          ? "no-data"
          : warningFindings.length > 0
            ? "advisory"
            : "passed";
const report = {
  generatedAt: new Date().toISOString(),
  source,
  status,
  authenticationMode: source === "file" ? "fixture" : authentication.mode,
  skipped: source === "none",
  skippedReason,
  hostname,
  window: { start, end, hours: windowHours },
  availability: {
    rum: source !== "none" && rumErrors.length === 0,
    edge: edge.available,
    rumErrors,
    edgeErrors
  },
  policy: {
    required,
    edgeRequired,
    mode,
    minimumSamples,
    minimumEdgeRequests,
    durationDivisor,
    thresholds,
    regression,
    baselineConfigured: Boolean(baselineInput)
  },
  counts: {
    routeGroups: routes.length,
    lcpDebugGroups: lcpDebug.length,
    inpDebugGroups: inpDebug.length,
    clsDebugGroups: clsDebug.length,
    findings: findings.length,
    blockingFindings: blockingFindings.length
  },
  routes,
  lcpDebug,
  inpDebug,
  clsDebug,
  edge,
  findings
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

if (blockingFindings.length > 0) {
  error("Cloudflare observability verification failed:");
  for (const item of blockingFindings) {
    error(`- [${item.code}] ${item.path || item.message || "configured policy failed"}`);
  }
  process.exitCode = 1;
} else if (source === "none") {
  log(skippedReason);
} else {
  log(`Cloudflare observability verification ${status} with ${routes.length} RUM route groups, ${edge.totalRequests} edge requests, and ${warningFindings.length} advisory findings.`);
}
