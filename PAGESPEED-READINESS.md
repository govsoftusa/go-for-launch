# PageSpeed Document Readiness

PageSpeed Insights cannot start loading browser resources until the tested
document arrives. A perfect client bundle cannot compensate for a slow first
HTML response.

Some dynamic sites intentionally warm a public document cache before a
PageSpeed run. That is valid only when the warmup follows the same request path
as a browser navigation and produces observable reusable cache state. A generic
server-side `fetch(url)` is not enough evidence.

## Failure This Prevents

A dynamic Astro site used middleware that cached only public browser document
requests. Cache eligibility required both an HTML `Accept` header and
`Sec-Fetch-Dest: document`.

The PageSpeed runner issued two generic Node fetches and described them as a
visitor warmup. Those requests never entered the document-cache branch, so
PageSpeed measured an uncached database render. Browser main-thread work,
blocking time, layout stability, and responsive images were already healthy,
but Speed Index remained below the release requirement.

The fault was in the warmup contract. It was not justification to retry a real
score, discard a failed run, or reduce the 100 requirement.

## Hard Rule

If a PageSpeed workflow claims to warm HTML, it must:

1. Request the exact URL that PageSpeed will audit, including reviewed query
   parameters.
2. Send `Accept: text/html,application/xhtml+xml`.
3. Send `Sec-Fetch-Dest: document`.
4. Verify HTTP status, HTML content type, final hostname, expected candidate
   identity, and project-owned body markers.
5. Repeat the document request at least once.
6. Require an observable reusable cache state on the final request.
7. Preserve a machine-readable warmup report next to every PageSpeed report.

The final cache signal may come from an application header or a platform
header. Configure the header that proves the layer the project intends to
exercise. For an application-owned KV HTML cache, `CF-Cache-Status` alone does
not prove that application cache was used.

If the deployed site does not expose trustworthy cache state, add a safe
diagnostic response header or do not claim that the route was warmed. Do not
infer a hit from response time alone.

## Reusable Verifier

Copy
[`templates/pagespeed-warmup.config.mjs`](templates/pagespeed-warmup.config.mjs)
into the target project, update the neutral placeholders, and run:

```bash
node ../go-for-launch/scripts/verify-pagespeed-warmup.mjs \
  --config=pagespeed-warmup.config.mjs
```

The verifier always sends the required browser-document headers. Project
configuration cannot replace them. Each target must name a cache-state header
and the values that mean the document is reusable.

The verifier fails when:

- A target is not successful HTML.
- A redirect ends on the wrong hostname.
- Candidate identity is missing or stale.
- Required application markers are absent.
- A forbidden legacy marker is present.
- The final request does not report an approved cache-hit state.
- The request or response times out.

Add the resulting report to the project release-evidence manifest whenever the
PageSpeed process uses a warmup.

## Separate Evidence Surfaces

A warm PageSpeed document is one release measurement. It does not replace:

- A purged cold-document budget.
- A first-request-after-deploy budget.
- A bounded concurrent-request test.
- Real-user Cloudflare observability.
- Playwright WebKit.
- Native iOS Safari.
- The PageSpeed requirement itself.

Every valid PageSpeed result remains controlling. A category below 100 is a
failed gate. Warmup verification does not authorize score retries, selective
result deletion, or promotion of a different candidate.

## Recommended Order

1. Freeze and identify the exact candidate.
2. Verify route convergence.
3. Run cold, warm, and bounded burst server tests separately.
4. Run the PageSpeed document-readiness verifier on every audited URL.
5. Run complete mobile and desktop PageSpeed rounds.
6. Preserve every scored run and the warmup report.
7. Stop production if any required category is below 100.
