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

Protected staging with an edge-cache bypass must prove its configured
application cache state. A public canonical host may instead prove a reusable
Cloudflare edge hit when the outer cache returns before the application adds
its diagnostic header. That public exception requires all of the following:

- An edge cache hit.
- The exact expected candidate identity.
- The expected application marker.
- The exact canonical URL and final hostname.
- Public indexing state.
- The reviewed public cache policy.

Never apply the public edge-hit exception to a protected candidate hostname.

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

## Private Lighthouse production projection

A protected candidate intentionally cannot score 100 for SEO when it carries
`noindex`. Do not ignore that audit, remove the 100 requirement, or expose an
indexable public candidate. A private Lighthouse runner may instead exercise
the production branch of the exact artifact when all of these conditions hold:

1. The canonical hostname resolves exclusively to loopback or private
   addresses inside the isolated runner.
2. The runtime listener is not exposed publicly.
3. The exact artifact runs without the private noindex override.
4. The normal protected-origin gate separately proves both noindex metadata and
   a noindex response header.
5. Lighthouse still requires 100 for all four categories.
6. Production verification later proves the same indexable behavior on the
   canonical public hostname.

Private transport also needs production fidelity. When the local provider
runtime offers only HTTP/1.1 and the production edge uses HTTP/2 or HTTP/3,
place a loopback-only HTTP/2 TLS proxy in front of the runtime. Preserve the
canonical Host header and require evidence that the browser negotiated
HTTP/2. Do not accept a report based only on the proxy process starting.

The route's local fixtures must include every fitted image or runtime resource
declared by the measured HTML, in addition to any archive-wide sample. A
missing fixture that activates an emergency legacy fallback is a harness
finding. Preserve the failed report, correct the bounded fixture, and repeat
only the affected measurement before the final complete matrix.

## Provider and Matrix Preflight

Before starting a multi-route, multi-strategy, or repeated-round matrix, run
one authenticated or public probe through the exact API path the matrix will
use. Confirm that it returns a scored Lighthouse result rather than a quota,
authentication, billing, or provider error.

Classify an API quota or provider rejection as an external-service blocker.
It is not a site score and it does not justify editing the candidate. Use the
project's approved secret-manager path for an API credential when anonymous
quota is unavailable. Never print or preserve the secret value in commands,
logs, or evidence.

If a required matrix slot receives no Lighthouse result after its bounded
provider attempts, preserve the raw error. A targeted supplement may fill only
that external-error slot. It must match the candidate, URL, strategy,
configuration, document-readiness contract, and expected document. It must
contain no runtime warning and must score 100 in all four categories.

Hash the raw matrix and every supplement. The merge must reject any attempt to
replace an existing scored result, including a result below 100. A genuine
score remains controlling.

After a successful provider probe:

1. Run the matrix in a deterministic route and strategy order.
2. Preserve each valid result as soon as it arrives.
3. Stop the matrix at the first category below 100.
4. Diagnose that result before another PageSpeed attempt or candidate change.
5. Resume with a new exact candidate only after the supported fix passes its
   targeted check.
6. Run the complete matrix and all required rounds against the final frozen
   candidate.

Stopping early controls wasted work. It does not waive the failed score or the
final complete matrix.

## First-Failure Diagnostic Record

For every valid result below 100, preserve the raw report, candidate identity,
URL, strategy, timestamp, category scores, dominant failed audit, diagnosis,
and next bounded action. Mark that the valid result was preserved and that the
remaining matrix stopped.

When Performance is below 100, also preserve:

- The Lighthouse filmstrip or equivalent progress frames.
- The LCP element and resource URL.
- Request start and end timing for the LCP resource.
- Preload, `fetchpriority`, `srcset`, and `sizes` evidence.
- The relevant network trace or audit detail.
- A comparison with a passing route that uses the same content asset, when one
  exists.

The first-viewport resource path may differ across homepage, archive, taxonomy,
and article templates even when they display the same image. If a passing route
uses a release-local responsive derivative while a failing route performs an
on-demand transform, fix the shared priority-media contract or the affected
route family. Do not keep rerunning the unchanged candidate in the hope that
the transform becomes warm.

The execution-control verifier requires this triage record whenever a frozen
candidate declares a failed mobile or desktop PageSpeed gate. A Performance
failure additionally requires filmstrip, network, and LCP evidence.

## Recommended Order

1. Verify PageSpeed provider access with one scored probe.
2. Freeze and identify the exact candidate.
3. Verify route convergence.
4. Run cold, warm, and bounded burst server tests separately.
5. Run the PageSpeed document-readiness verifier on every audited URL.
6. Run the deterministic mobile and desktop matrix, stopping at the first valid score below 100.
7. Preserve and diagnose the first failed result before another attempt.
8. Freeze a new candidate after any change.
9. Run complete mobile and desktop PageSpeed rounds against the final candidate.
10. Preserve every scored run and the warmup report.
11. Stop production if any required category is below 100.
