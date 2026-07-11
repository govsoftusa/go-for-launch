# Cloudflare Production Observability

## Purpose

Synthetic tests and real-user monitoring answer different questions. PageSpeed Insights tests one controlled browser profile against one URL at one moment. Cloudflare Web Analytics records how actual production visitors experience routes, devices, networks, cache states, and content over time.

A release can receive a perfect PageSpeed score while a slow tail remains visible in production RUM. Go for Launch therefore uses both forms of evidence:

- Browser resource tests prevent known loading mistakes before release.
- PageSpeed validates the exact staged candidate under a controlled mobile and desktop profile.
- Cloudflare RUM establishes a production baseline and detects route, device, element, and asset regressions after real traffic reaches the deployment.
- Cloudflare edge HTTP analytics identifies elevated `4xx` and `5xx` response rates when the approved token includes zone analytics access.
- Playwright WebKit and native iOS Safari remain required because Cloudflare currently reports Core Web Vitals from Chromium browsers only.

Cloudflare observability complements the mandatory release gate. It does not replace build tests, PageSpeed, WebKit, native Safari, accessibility, visual review, or exact-candidate staging.

## The Failure Pattern This Gate Addresses

A responsive hero can contain a mobile image, a desktop image, and a decorative background. CSS may hide two of those elements while the browser still downloads all three. A warm synthetic run can score well because the assets are small or cached. Real visitors on cold connections may still report a poor LCP tail, and Cloudflare can identify the exact selector and image URL responsible.

The pre-release resource audit must fail when:

- A desktop viewport downloads artwork intended only for mobile.
- A mobile viewport downloads artwork intended only for desktop.
- A hidden image or background is requested even though it cannot paint in that viewport.
- The declared preload does not match the measured LCP resource.
- A responsive source advertises the same file under false width descriptors.
- The LCP image lacks reviewed priority or begins materially later than required by the project budget.
- A route flashes empty content while delayed scripts, styles, fonts, or images determine first paint.

Use request listeners in Playwright and test every responsive breakpoint where the resource set changes. A CSS `display: none` assertion is not sufficient because it does not prove the network request was avoided.

## Cloudflare Data Sources

The verifier uses Cloudflare's GraphQL Analytics API. The Web Analytics datasets are account scoped:

- `rumWebVitalsEventsAdaptiveGroups`
- `rumPerformanceEventsAdaptiveGroups`
- `rumPageloadEventsAdaptiveGroups`

The current implementation queries `rumWebVitalsEventsAdaptiveGroups` for:

- Route and device sample counts.
- LCP at P75 and P99.
- INP at P75.
- CLS at P75.
- LCP selectors, image hosts, image paths, fetch priority, and initiator type.
- LCP resource delay, resource duration, and element render delay.
- INP and CLS debug elements.

When a zone ID and suitable permission are available, it also queries `httpRequestsAdaptiveGroups` for exact status totals and the highest-volume error paths.

The generated report never contains the API token.

## Access and Least Privilege

Prefer a Cloudflare API token and scope it to the intended account and zones. The verifier also supports a Global API Key with its account email when an existing approved operational environment requires that authentication method. A Global API Key is broader than a scoped token, so keep the same process-local handling and never store it in project configuration.

For Web Analytics RUM, grant:

- Account, Account Analytics, Read.

For edge HTTP status analytics, also grant the least-privilege zone analytics read permission required for the selected zone. A token that can read account RUM may still be unable to read zone HTTP analytics. The verifier records those surfaces independently so a missing optional edge permission does not erase available RUM evidence.

Store the credential in a secret manager. Load a scoped token into the process as `CLOUDFLARE_API_TOKEN`, or load a Global API Key and account email as `CLOUDFLARE_GLOBAL_API_KEY` and `CLOUDFLARE_AUTH_EMAIL`. Unset them after the command. Never print them, place them in a URL, commit them, or write them into an artifact.

The non-secret inputs are:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`, optional unless edge analytics are required
- `CLOUDFLARE_RUM_HOSTNAME`

## Configure the Project

Copy [`templates/cloudflare-observability.config.mjs`](templates/cloudflare-observability.config.mjs) into the target project and review every threshold.

The default configuration uses:

| Signal | Default |
|:---|---:|
| Minimum RUM samples per route and device | 20 |
| LCP P75 | 2,500 ms |
| LCP P99 element tail | 8,000 ms |
| INP P75 | 200 ms |
| CLS P75 | 0.1 |
| Edge `4xx` rate | Report only by default |
| Edge `5xx` rate | 1% |
| Baseline regression ratio | 1.25 |

These values are initial safety limits, not a substitute for project judgment. A mature high-traffic service may require stricter budgets. A low-traffic site may need a longer window before it has enough samples.

Raw `4xx` rates often include automated probes for WordPress, PHP, and other software that is not installed on the site. The verifier reports status totals and top paths, but the default `edge4xxRate` is `null` so scan traffic does not block a release. Set a numeric limit only after reviewing expected missing routes, security scans, form validation responses, and bot handling. A `5xx` rate remains enabled by default because server errors more directly indicate a failed application or origin response.

Cloudflare's GraphQL RUM duration fields currently use microseconds even though dashboard documentation describes the displayed metrics in milliseconds. The template therefore sets `durationDivisor: 1000`. If Cloudflare changes the dataset unit, verify the current schema and adjust the reviewed configuration instead of silently accepting implausible values.

## Run the Verifier

Collect an advisory production baseline before deployment:

```bash
node scripts/verify-cloudflare-observability.mjs \
  --config=cloudflare-observability.config.mjs \
  --mode=advisory \
  --output=artifacts/cloudflare-observability-baseline.json
```

After sufficient traffic reaches production, compare the new window with that baseline:

```bash
node scripts/verify-cloudflare-observability.mjs \
  --config=cloudflare-observability.config.mjs \
  --mode=regressions \
  --baseline=artifacts/cloudflare-observability-baseline.json \
  --output=artifacts/cloudflare-observability-post-release.json
```

Use `mode: "thresholds"` only when the project has reviewed the sample minimums and intends every configured threshold breach to fail. Historical production problems describe the previous state, so do not claim they prove the staged candidate is defective. Remediate known issues, retain the baseline, and use post-release comparison to determine whether the promoted candidate improved or regressed.

The verifier supports a saved GraphQL response through `--input` for repeatable tests and incident review.

## Required Workflow

### Before implementation

1. Confirm Cloudflare Web Analytics is enabled for the canonical production hostname.
2. Classify RUM and edge HTTP analytics as required, conditional, optional, or blocked in project onboarding.
3. Verify the API token with a masked request.
4. Record the account, zone, hostname, time window, minimum samples, thresholds, and enforcement mode.
5. Capture an advisory baseline before changing the site.

### Before staging

1. Add viewport-specific request assertions for responsive hero and first-viewport assets.
2. Measure the actual LCP element through browser performance APIs.
3. Verify the preload URL, responsive source, fetch priority, and downloaded resource set agree with the measured LCP element.
4. Run the resource audit in desktop Chromium, mobile Chromium, and WebKit.
5. Block the candidate on unnecessary hidden-viewport downloads or a preload mismatch.

### On staging

1. Deploy the exact candidate.
2. Run the complete browser, WebKit, native Safari, accessibility, and interaction suites.
3. Run PageSpeed for mobile and desktop and require the project's production scores.
4. Do not expect staging RUM to prove production behavior when the hostname has little or no real traffic.

### After production promotion

1. Verify candidate identity and canonical HTTP behavior.
2. Repeat live WebKit and native Safari smoke tests.
3. Run an immediate Cloudflare query to catch edge HTTP errors and confirm the RUM integration remains present.
4. Repeat the RUM query after 15 minutes, one hour, and 24 hours when traffic volume supports those windows.
5. Compare route and device metrics with the saved baseline.
6. Open a remediation incident when a required threshold or baseline regression fails.
7. Preserve each machine-readable report with the release evidence.

## Blocking Semantics

Use `advisory` mode for a historical baseline. Findings remain visible but do not block the new candidate.

Use `regressions` mode for post-release comparisons. A route blocks when both windows meet the minimum sample count and the current value exceeds the configured ratio and minimum absolute delta.

Regression mode without a baseline report fails closed.

Use `thresholds` mode when a project has explicitly reviewed the traffic volume, thresholds, and enforcement consequences. Current threshold breaches and baseline regressions become blocking findings.

Missing data is not a pass. The report must distinguish:

- `available`, the API returned usable data.
- `no data`, the query succeeded but the selected window had no matching samples.
- `skipped`, required identifiers or credentials were unavailable.
- `permission error`, the token could not read the requested dataset.
- `failed`, an enforced threshold, regression, or required-data rule was violated.

When Cloudflare observability is classified as required, missing credentials, missing RUM data, or API errors block the release or post-release signoff. When it is conditional or optional, preserve the skipped or partial report and continue with the independent mandatory gates.

## Report Review

The release reviewer must inspect:

- Routes and device groups with enough samples.
- LCP P75 and P99, not only the average.
- The exact LCP selector and asset URL.
- Resource load delay, load duration, and element render delay.
- INP and CLS debug elements.
- `4xx` and `5xx` rates when zone analytics are available.
- Highest-volume error paths.
- Differences from the saved baseline.
- Data age and whether the window still contains traffic from the previous deployment.

Cloudflare reports Core Web Vitals when the page becomes hidden after load. Recent visitors may not appear immediately, and a rolling window can continue to contain measurements from the previous release. Report the window precisely and do not promise that historical findings will disappear immediately after a fix.

## Official References

- [Cloudflare Core Web Vitals](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/)
- [Cloudflare Web Analytics data collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
- [Cloudflare Analytics API token configuration](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)
- [Cloudflare Analytics API key authentication](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-key-auth/)
- [Cloudflare GraphQL dataset availability](https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/)
- [Cloudflare Observatory dashboard](https://developers.cloudflare.com/speed/observatory/dashboard/)
