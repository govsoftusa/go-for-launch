# Cloudflare RUM Finds a Hidden-Viewport LCP Regression

<!-- case-study-normalization-reviewed -->

## Context

This case study records a mid-2026 production performance incident on an Astro site hosted by Cloudflare. It is historical evidence for the reusable rules in [Cloudflare Production Observability](../CLOUDFLARE-OBSERVABILITY.md).

The release had passed:

- The exact-candidate staging workflow.
- Mobile and desktop PageSpeed with 100 in Performance, Accessibility, Best Practices, and SEO.
- Chromium and Playwright WebKit behavior tests.
- Native Safari through the Xcode iOS Simulator.
- Production HTTP and visual smoke checks.

Cloudflare Web Analytics still showed a slow real-user LCP tail on the homepage. Its debug view identified the desktop hero artwork at `/images/desktop-hero.webp` as the affected resource.

## Symptom

The Cloudflare dashboard showed most LCP visits in the good range but retained a small poor tail. Element-level data connected the poor observations to the homepage hero artwork rather than to a server error, JavaScript task, or layout shift.

The important lesson was not that PageSpeed was wrong. PageSpeed measured one controlled profile and reported a valid result for that run. Cloudflare RUM measured a distribution of real production sessions, including cold caches, network variation, and actual resource scheduling.

## Root Cause

The responsive hero contained three visual resources:

1. A desktop decorative background.
2. A mobile Capitol image.
3. A desktop Capitol image.

CSS hid the inappropriate elements by viewport, but all three remained in HTML as eager image requests. Both mobile and desktop browsers downloaded resources they could not paint.

The page also preloaded the desktop decorative background instead of the image Cloudflare identified as the desktop LCP resource. One responsive source advertised the same 500-pixel file under multiple width descriptors.

The visual tests proved that the correct artwork was visible. They did not prove that hidden artwork was absent from the network request stream.

## Fix

The hero moved mutually exclusive artwork into media-gated CSS declarations so the browser selects only the resource applicable to its viewport.

The page then used exact media-scoped preloads:

- Mobile preloaded the mobile AVIF.
- Desktop preloaded the desktop WebP that could become LCP.
- The desktop decorative background was no longer incorrectly preloaded as the likely LCP resource.

The accessible mobile artwork retained an image label even though its bitmap moved into CSS. Stable geometry remained in place to avoid layout shift.

## Regression Test

The new browser test records matching hero requests and asserts:

- Mobile requests the mobile artwork.
- Mobile does not request the desktop Capitol or desktop background.
- Desktop requests the desktop Capitol and desktop background.
- Desktop does not request the mobile artwork.

This network assertion is the pre-release control that would have caught the defect. A visibility assertion alone would not.

## Cloudflare Verifier Proof

The first live run of `scripts/verify-cloudflare-observability.mjs` used a read-only Account Analytics token and the previous 24 hours of production RUM. It returned:

- Several dozen route and device groups.
- Several dozen LCP debug groups.
- The homepage desktop LCP selector.
- `/images/desktop-hero.webp` as the representative LCP asset path.
- A homepage desktop LCP P75 above six seconds in the selected historical window.
- A matching element-level P99 tail above the reviewed advisory threshold.

Those values describe a rolling window that still contained pre-fix traffic. They prove that the verifier can retrieve and classify the same field evidence visible in the Cloudflare dashboard. They do not claim that every observation came from the corrected deployment.

The narrow available token could read account RUM but did not have zone analytics read permission for edge HTTP status data. The verifier preserved the RUM result and recorded edge analytics as unavailable rather than discarding all evidence or silently passing it.

An approved Global API Key stored in the secret manager was then tested with Cloudflare's documented key headers. It could read the zone dataset. The selected 24-hour window contained tens of thousands of requests, no `5xx` responses, and a substantial share of automated `4xx` traffic. The leading `404` paths were automated WordPress and PHP probes rather than missing site navigation. This evidence changed the reusable default so raw `4xx` rate remains report-only until a project reviews scan traffic and selects an enforceable limit.

## Acceptance Evidence

After the source fix:

- Desktop requested the desktop Capitol and decorative background, but not the mobile artwork.
- Mobile requested only the mobile artwork from the three hero resources.
- The exact production candidate passed mobile and desktop PageSpeed with four scores of 100 in each strategy.
- Mobile LCP measured below two seconds in the accepted PageSpeed run.
- Desktop LCP measured below one second in the accepted PageSpeed run.
- Responsive behavior tests passed across desktop and mobile viewports.
- Production iPhone WebKit tests passed.
- The native Safari Simulator render was visually clean.
- Production HTML matched the tested candidate bytes.

Cloudflare's rolling field window was expected to age out historical observations as new visits reached the corrected deployment.

## Reusable Rules

1. PageSpeed and production RUM are complementary evidence.
2. Test the network resource set, not only element visibility.
3. A hidden responsive `<img>` can still download.
4. Match preloads to the measured LCP resource for each viewport.
5. Inspect P75 and the slow tail, including P90 and P99.
6. Preserve the exact selector and asset URL in incident evidence.
7. Keep account RUM and zone HTTP permissions separate.
8. Treat missing data and permission errors as explicit states, never as a pass.
9. Preserve historical baselines and compare again only after sufficient post-release traffic.
10. Keep WebKit and native Safari testing because Cloudflare RUM currently covers Chromium Core Web Vitals.

## References

- [Cloudflare Core Web Vitals](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/)
- [Cloudflare Web Analytics data collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
- [Cloudflare Analytics API token configuration](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)
