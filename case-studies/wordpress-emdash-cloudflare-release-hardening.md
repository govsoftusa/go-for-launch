# WordPress to EmDash Cloudflare Release Hardening

<!-- case-study-normalization-reviewed -->

## Purpose

This case study records reusable deployment, performance, cache safety, form
security, browser testing, and release-gate lessons from moving a large
publication archive from WordPress to an EmDash-managed Astro site on
Cloudflare.

The project identity, domains, routes, dates, infrastructure identifiers,
content, exact inventory totals, exact test counts, and exact performance
measurements have been removed or generalized. Example hostnames use
`example.com`.

The related extraction and content-model findings are recorded in
[WordPress to EmDash News Archive Migration](wordpress-emdash-news-archive-migration.md).

## Normalized Scope

The source was a long-running publication with:

- Thousands of articles and indexable archive routes.
- Deep category, tag, author, and pagination families.
- A large historical image library.
- Legacy redirects and platform-specific endpoints.
- Public search and lead-generation forms.
- A compromised WordPress origin that could not be treated as a safe rollback
  without separate remediation.

The target used Astro, EmDash, Cloudflare Workers, D1, KV, object storage, and
Cloudflare edge caching.

## Release Decision

The candidate became substantially faster and passed representative technical
checks, but production remained blocked.

The release process correctly separated technical remediation from production
authorization. A temporary candidate hostname served the new Worker while the
canonical and apex hostnames continued to serve the existing site. No
production route, DNS record, or redirect changed because several mandatory
full-scope and human-approval gates were incomplete.

This was a successful release-gate outcome. A healthy candidate does not
authorize a cutover when the release contract remains unmet.

## Candidate Identity and Isolation

The candidate used a temporary hostname such as
`candidate.example.com`, while every indexable page retained
`https://www.example.com` as its canonical URL.

Every response also carried an opaque candidate identity header:

```http
X-Release-Candidate: <reviewed-candidate-id>
```

The evidence record bound the candidate hostname, source revision, toolkit
revision, Worker version, build output, and test artifacts together. Tests
first asserted that identity before evaluating the page.

### Reusable rule

Never infer candidate identity from a deployment timestamp or a successful HTTP
response. Require an explicit identity value in the response and release
record. Promote only the exact candidate that passed.

## Performance Investigation

### Symptom

Public archive pages took several seconds on a cold request and failed under
moderate concurrent verification traffic. Warm edge responses were two orders
of magnitude faster.

### Root cause

The main problem was server rendering backed by repeated D1 reads, not browser
JavaScript. Archive templates repeatedly hydrated large ordered indexes and
shared page chrome. Read replication existed but was not enabled for the public
path. Response caching and shared query caching were incomplete.

The verification crawler made the situation worse by acting as a load test
against the uncached origin.

### Fixes

- Enabled D1 read replication for eligible public reads.
- Enabled query coalescing so concurrent identical reads share work.
- Removed repeated archive queries and reused ordered index results.
- Added a KV-backed distributed object cache for query snapshots.
- Added a KV-backed anonymous HTML cache for public document responses.
- Added Cloudflare response caching with content tags and invalidation.
- Used a reviewed freshness period plus a stale-while-refresh window.
- Reworked sitemap generation to select only routing and indexation fields.
- Resolved independent media-derivative listings in parallel before rendering
  a feed instead of awaiting one object-storage listing per card.
- Cached other expensive shared-output routes when their responses were safe to
  reuse.
- Added bounded retry, backoff, and request timeouts to import and verification
  tooling.
- Separated cold-path, warm-path, smoke, and concurrency tests.

The HTML cache key included the opaque release candidate, the route, and an
indexability mode. Protected staging HTML could not satisfy a production
request, and a new deployment could not read a prior candidate's document.
Only query-free GET and HEAD documents were eligible. Administration, forms,
search, feeds, assets, authenticated requests, cookie-bearing requests, and
responses that set cookies bypassed the cache.

The complete route snapshot used an explicit verification query parameter, so
it also bypassed HTML storage. This prevented a release crawl from filling KV
with the entire archive while still allowing popular visitor routes to gain a
globally replicated first-document path.

### Outcome

Cold archive requests fell from multi-second responses to a much smaller
bounded range. Warm edge responses fell to tens of milliseconds. The candidate
then tolerated the reviewed verification burst without server errors.

One late smoke run still found a large tag archive taking more than ten seconds
on its first request. The database page query was already bounded. The remaining
delay came from responsive-image components awaiting several independent object
storage listings in series. Resolving those listings with one `Promise.all`
reduced the rotating cold archive suite to a bounded range and kept the
concurrent burst below its reviewed limit.

### Reusable rule

Measure server timing and D1 activity before adding browser optimization.
Establish separate budgets for:

1. A purged cold request.
2. A warm edge request.
3. A bounded concurrent burst.
4. The first request after a deployment or purge.

Do not present a warm cache result as the cold-path result.

## Media Delivery

### Symptom

Large source images and repeated on-demand transformations hurt mobile
performance. Routing every migrated asset through the image transformation
binding also risked exhausting the transformation allowance.

### Fixes

- Preserved source objects instead of destructively replacing them.
- Copied media to object storage before changing the serving path.
- Served hot media through a same-origin route.
- Generated responsive WebP derivatives from the preserved source.
- Added intrinsic dimensions and responsive candidates.
- Restricted automatic selection to safe image families rather than historical
  theme crops.
- Added long-lived immutable caching for derivative files.
- Resolved a feed's independent derivative inventories concurrently.
- Removed unused connection hints.
- Verified real image bytes, content type, dimensions, and cache headers.

### Reusable rule

A valid image URL is not sufficient evidence. Fetch representative image bytes
from every source family, inspect composition, and verify the browser selects a
right-sized candidate for each viewport.

## Compression and Automatic Analytics Injection

### Symptom

HTML was not receiving the expected Brotli compression, and an extra browser
analytics request affected page behavior.

### Root cause

Automatic Cloudflare browser analytics injection modified the response and
introduced a `no-transform` behavior. The change prevented the expected edge
compression path and added a request the application did not own.

### Fix

The automatic injection was disabled for the candidate. Application-owned
observability remained separate from page transformation. Brotli compression,
response headers, and browser request sets were retested on the live candidate.

### Reusable rule

When the deployed response differs from Worker output, inspect CDN-injected
HTML, headers, and scripts before changing application code.

## Cache Correctness

Performance caching introduced new correctness and security failure modes.

### Missing cache hints

One route passed an undefined value into the Astro cache API. The code had
appeared safe while the cache provider was disabled. Once caching was enabled,
the route threw during rendering and returned the not-found page.

The fix was to centralize cache-hint handling, ignore absent hints safely, and
require helper functions to return a valid cache object when caching is
intended.

### Stale candidate HTML

Native Safari exposed an older navigation response after a new Worker version
had deployed. Deployment success did not invalidate every host-scoped response.

A hostname purge did not remove HTML stored through the Worker Cache API. The
reliable replacement sequence was:

1. Update the route to the new Worker.
2. Poll an uncached query until the exact candidate identity appears.
3. Purge the application cache tag used by HTML responses.
4. Poll clean URLs until the same candidate appears.
5. Repeat the tag purge if route propagation raced the first purge.
6. Retest in native Safari.

### Split production route state

A controlled production canary attached only the canonical hostname while the
apex remained on the prior application. Alternating requests to the canonical
hostname returned the reviewed candidate and the prior application within the
same sequence. The route API had reported success, but the visitor-visible
application identity was not yet consistent.

The canary route was removed immediately, the zone cache was purged, and the
prior application was verified repeatedly before the release stopped. The
apex was never attached.

The available evidence was consistent with route propagation or split edge
state immediately after route creation, but did not prove the cause. The
release process was changed to require an explicit convergence interval and
repeated multi-network identity checks before application tests begin.

Each route consistency probe must assert:

- Exact release identity.
- Expected application marker.
- Public or protected robots policy for the requested hostname.
- Expected browser and edge cache policy.
- Stable results across repeated requests and more than one network or region.

### Reusable rule

A successful route API response and one correct HTTP response do not prove
production convergence. Attach one public hostname as a canary, wait the
reviewed propagation interval, and require repeated identity agreement before
PageSpeed, forms, crawlers, or apex attachment. Roll back on any mixed identity.

### Unsafe method caching

A POST to the temporary hostname received cached GET content. That bypassed the
server validation path and proved that HTML cache eligibility was too broad.

The fix combined application and edge controls:

- Cache only GET and HEAD document responses.
- Bypass cache for every other method on candidate, canonical, and apex hosts.
- Send form responses with explicit private or no-store behavior.
- Test a missing-token POST through every public hostname and require a
  server-generated rejection.

A normalized Cloudflare rule expression is:

```text
(http.host in {"candidate.example.com" "www.example.com" "example.com"})
and (http.request.method ne "GET" and http.request.method ne "HEAD")
```

### Reusable rule

After enabling HTML caching, test GET, HEAD, POST, cache purge, content
invalidation, and deployment replacement independently. A fast GET does not
prove safe form handling.

## Turnstile on Every Public Form

Client-side widgets alone were not accepted as protection. Every public form
had to cross a shared server-side verification boundary.

### Implementation contract

- Inventory all rendered public forms from final output.
- Add a managed Turnstile widget to each form.
- Restrict widget hostnames to reviewed production, candidate, and local test
  hosts.
- Keep the secret only in the Worker environment.
- Execute the widget only after form interaction or submission.
- Require a token on the server.
- Call Siteverify from the server before any form action.
- Verify success, expected action, and expected hostname.
- Fail closed when the secret, token, verification response, action, or
  hostname is missing or invalid.
- Return HTTP 403 for a rejected submission.
- Perform no search, email, write, redirect, or side effect before validation.
- Keep EmDash form defaults set to Turnstile so future CMS-created forms inherit
  protection.

### Search forms

Search had originally used GET. A Turnstile token is single-use and should not
be placed in a query string, log, history entry, or shareable URL.

The safe pattern was:

1. Submit the search form with POST.
2. Validate Turnstile on the server.
3. Redirect with HTTP 303 to a clean GET search URL containing only the search
   query.

This preserved bookmarkable results without exposing the token.

The first hardened implementation still had two usability defects. The header
replaced its search field with a link, and a rejected verification returned a
plain text document with no route back into the publication. The corrected
pattern kept an inline header search, deferred the challenge until input, held
submission until a token existed, and redirected a failed check to a styled
same-origin error state.

The CMS search API had also changed its response field from a resolved result
list to an item inventory. The page silently read the obsolete field and
displayed no matches. The fix resolved each collection and entry identifier
before rendering. A release test now requires a known query to return real
entries, not merely an HTTP 200 search page.

Comment forms used a separate deferred adapter so loading an article did not
download the challenge. The script began loading only after a reader
interacted with the comment form. A form-scoped reset event ensured that a
comment retry reset the comment widget rather than the header search widget.

An inline module version of the shared client appeared in HTML but did not
attach its handlers in a real browser. Moving the client to one small,
same-origin classic script made its boot state observable and ensured all
forms shared one listener set. The release test asserted that the client
reached its ready state before exercising a real challenge.

Each isolated Worker name was a distinct secret target. Creating a new
candidate Worker did not copy the prior candidate's Turnstile secret. The
deployment sequence therefore attached the existing secret to each candidate
before any positive form test, without printing it.

### Closed-program interest forms

One public program was not accepting new business. Its prior page implied an
active offer, so it was replaced with a direct closed-status notice and an
optional one-update form.

The form:

- Made no promise that the program would reopen.
- Collected only name, email, optional organization, and optional context.
- Required explicit consent for the one availability update.
- Used a unique email key so repeat submissions updated one record.
- Stored the record only after Turnstile passed.
- Returned to a styled same-origin success or error state.

A positive edge test used a clearly synthetic address, verified the database
write, deleted that exact record, and proved the test count returned to zero.

### Repository gate

A project-owned verifier compared the final form inventory with:

- The number of rendered widgets.
- The expected action values.
- The shared server verification call.
- The hostname and action checks.
- The non-GET cache bypass contract.
- The EmDash default spam-protection setting.

Any unprotected form or missing server boundary failed the normal project test
chain.

### Reusable rule

Turnstile is complete only when both the browser and server contract pass.
Verify a successful interactive submission and a direct missing-token POST.
Repeat both against the candidate hostname through the real edge.

## Mobile Navigation and Browser Evidence

### Symptom

A compact horizontal navigation rail clipped items on narrow screens while
appearing acceptable at common desktop and mobile widths.

### Fix

The rail was replaced with a native `details` disclosure using real links and
no JavaScript dependency. The final design retained keyboard, touch, and
no-script behavior.

### Verification

- Chromium and WebKit covered expanded desktop, compact desktop, tablet,
  mobile, and the narrowest required width.
- The interface gate checked clipping, overlap, overflow, clearance, and
  page-family markers.
- Playwright WebKit exercised open, close, and navigation behavior.
- Native iOS Safari repeated the representative interaction against the live
  candidate.

### Reusable rule

Native Safari is also a cache and deployment test. If it disagrees with local
WebKit, compare the candidate identity and response age before assuming a
browser-only defect.

## Publication Header and Story Hierarchy

### Symptom

The inherited header devoted most of the first viewport to a wordmark and
tagline. A compact redesign then hid direct navigation and reduced search to a
link. Article pages delayed the headline hook behind too much chrome.

### Fix

- Reduced the masthead to a compact logo band.
- Kept direct section links on desktop and a native disclosure on mobile.
- Kept a real inline search field at every viewport.
- Placed category, headline, deck, author, and share controls before the lead
  image.
- Shortened long imported excerpts into a publication-style deck.
- Preserved a readable system-serif italic deck without a dedicated font
  download.

### Reusable rule

Measure the header and the first meaningful story content as one composition.
A polished masthead still fails when readers must scroll before learning what
the page is about.

## CSS and Rendering Performance

The historical theme carried tens of kilobytes of selectors that no current
template used. The complete source stylesheets were preserved for audit, while
generated runtime copies retained only selectors exercised by application
templates and were minified. This cut the legacy runtime CSS by roughly two
thirds without discarding the source record.

Two browser optimizations created subtle regressions:

- Applying `content-visibility` to an entire responsive row gave the row a
  temporary intrinsic geometry that overlapped pagination and the footer.
  Containment was narrowed to individual story cards.
- Using the two-axis intrinsic-size shorthand gave offscreen cards a large
  placeholder width and created horizontal overflow on phones. The fix used
  block-axis intrinsic sizing only.

An opacity-based scroll reveal also delayed visible paint and produced false
low-contrast findings while Lighthouse captured the initial state. Removing
opacity preserved optional movement without hiding readable content.

### Reusable rule

Contain the smallest repeatable unit, specify only the axis that needs a
placeholder, and test the initial animation frame with accessibility and
Speed Index tooling.

## Staging Indexability and PageSpeed

Temporary candidate and Worker hostnames were initially added to the
indexable-host allowlist so Lighthouse would award its crawlability audit.
That exposed a duplicate publication archive on publicly reachable
subdomains.

The corrected policy kept only the canonical hostname and redirecting apex in
the allowlist. Every validation host emitted `noindex` in both HTML and the
response header.

That protection exposed a gate-integrity trap. Both the page-only content
snapshot and the complete release snapshot copied the staging robots meta
tag. Shared analyzers then treated every page as nonindexable and could report
a misleading zero-page pass. Each snapshot now removes only the staging
robots marker from its local analysis copy while leaving the live candidate
protected. Every release report must also assert the expected page count, not
accept an empty pass.

The protected staging PageSpeed gate then required the exact candidate header,
production canonical, both robots controls, three category scores of 100, and
every weighted SEO audit except intentional crawlability. Promotion remained
provisional until the unchanged candidate scored 100 in all four categories
on the canonical production hostname. A production failure required immediate
rollback.

### Reusable rule

Do not weaken staging index protection to manufacture a synthetic SEO score.
Prove that crawlability is the only protected-staging SEO failure, then require
the complete crawlable score on the canonical production host during
provisional promotion.

## Cold Dynamic HTML Versus Browser Weight

A final mobile trace showed zero blocking time, negligible layout shift, small
responsive images, and no eager Turnstile request, yet Performance remained
below the perfect release threshold. The controlling delay was the cold
dynamic HTML response. Browser resources could not begin until server
rendering completed.

This distinction matters. More client minification would not fix a document
that has not arrived. The evidence record therefore preserved separate cold
render, warm edge, and browser resource results.

## CDN-Injected Bot Detection and Local Snapshots

Cloudflare bot protection appended a request-specific JavaScript probe after
the Worker response. Its background request prevented the local interface
snapshot from reaching network idle.

The local snapshot removed only the known Cloudflare-injected probe from the
captured response. Bot protection remained enabled, and live-browser checks
still exercised the real edge response.

### Reusable rule

Snapshot sanitization must be exact and documented. It may remove only known
infrastructure-generated nondeterminism. It must not remove application output,
security controls, layout content, or failed requests that the application
owns.

## Social Cards Must Carry the Publication Identity

### Symptom

The first complete Open Graph set passed dimensions, file hashes, route
coverage, and a recorded visual approval. A real messaging preview still
looked unrelated to the publication. It used a generic technology template,
synthetic geometry, a random route-code mark, generic type, and colors that
only loosely borrowed from the site.

### Root cause

The project changed values in a reusable renderer without evaluating whether
the renderer itself matched the publication. The approval proved that the
reviewed files were stable, but it did not prove that the design was
appropriate. The page templates already carried real archive photography and
an authoritative wordmark, but the social-card pipeline ignored both.

### Fixes

- Invalidated the rejected approval immediately.
- Incremented the visual template and social-card content contract versions.
- Added a project-owned renderer hook to the deterministic shared pipeline.
- Used the authoritative wordmark, publication palette, and exact editorial
  font outlines.
- Selected real page or archive photography from the migrated media records.
- Deduplicated source downloads, recorded exact source hashes, and cached the
  reviewed bytes for deterministic regeneration.
- Rejected visually flat and undersized sources before rendering.
- Used a route-specific typographic fallback instead of enlarging small files
  or inventing replacement imagery.
- Bound custom layout decisions, source-selection results, font hash, and
  wordmark hash into each card's rendering fingerprint.
- Regenerated contact sheets for the complete route inventory and required a
  new approval.

### Reusable rule

Technical approval cannot rescue an off-brand template. Preview representative
cards in a real messaging client early, before producing the full inventory.
If a stakeholder rejects the visual system, treat that as approval
invalidation, not a request to relabel the existing output.

## Gate Findings That Correctly Blocked Production

### A prior PageSpeed pass was not current evidence

An earlier candidate reached the required score in every category. A later run
against the exact candidate had mobile Performance below the required
threshold. The newest exact-candidate result controlled the decision.

### Representative route coverage was incomplete

Representative page archetypes passed browser and viewport checks, but the
release policy required every indexable route. A sample could identify defects
and guide fixes, but it could not close a full-route gate.

### Render-sharpness scope needed review

Representative public pages passed. A whole-output scan also inspected
administrative dependency CSS that public pages did not load. The correct next
step was a reviewed scope decision or upstream fix, not silently ignoring the
finding.

### Open Graph evidence was incomplete

The migrated publication reused historical imagery and lacked a complete set
of unique, hash-bound, visually approved social cards for every indexable page.

### Editorial evidence was incomplete

The archive lacked current route-level audience, task, content-quality, and
hash-bound editorial approval records required by the project release policy.

### The rollback origin was unsafe

The legacy WordPress origin had evidence of compromise. Keeping it as a
rollback target required separate remediation and verification.

### Reusable rule

Do not convert a missing approval into a technical waiver. Do not reduce a gate
because a migration has many routes. Record the missing evidence, preserve the
candidate, and leave production unchanged.

## Failed or Misleading Approaches

- Judging performance from one warm request hid cold D1 and render cost.
  Separate cold, warm, and burst evidence.
- Running route verification while measuring made the verifier the load
  generator. Serialize load, smoke, and performance runs.
- Accepting HTTP 200 as a smoke pass missed truncated HTML and broken images.
  Assert content markers and real asset bytes.
- Caching every document-like request allowed POST to receive cached GET
  content. Use method-aware application and edge rules.
- Adding Turnstile only in the browser allowed direct requests to bypass the
  widget. Use a shared server-side Siteverify gate.
- Keeping search as token-bearing GET exposed a single-use token in the URL.
  Use POST validation followed by a clean 303 GET.
- Trusting deployment completion to clear cache allowed stale candidate HTML.
  Wait for route convergence, purge the HTML cache tag, and retest clean URLs.
- Treating a hostname purge as equivalent to a Worker Cache API tag purge left
  old HTML in place.
- Awaiting media derivative discovery inside each card serialized independent
  object-storage requests and made a cold archive look like a database problem.
- Accepting zero-page analysis reports let staging `noindex` hide the exact
  pages the release gates were meant to inspect.
- Assuming a new Worker inherited the prior Worker's secrets made positive
  Turnstile tests fail even though the browser received a valid token.
- Using one successful PageSpeed run did not describe the final candidate.
  The latest exact-candidate run controls.
- Treating representative routes as full coverage left route families
  untested. Use a complete route inventory and final-output gates.
- Disabling a security feature to simplify tests changed the deployed security
  posture. Use exact snapshot sanitization plus live edge tests.

## Reusable Release Sequence

1. Fetch the toolkit upstream and verify the selected revision.
2. Preserve the project state and record the source revision.
3. Build the exact production candidate.
4. Deploy it only to an isolated candidate hostname and attach required secrets.
5. Wait for route convergence, purge the HTML cache tag, then assert candidate
   identity on clean URLs, canonical output, robots behavior, and HTTPS.
6. Establish cold, warm, and concurrent server-performance evidence.
7. Verify media bytes, responsive selection, compression, and cache headers.
8. Run route parity, redirects, sitemap, site health, semantic SEO, content
   quality, render sharpness, interface, side navigation, design, and visual
   composition gates as applicable.
9. Inventory every public form and test browser plus direct-request Turnstile
   behavior through the real edge.
10. Verify method-aware cache rules, purge behavior, and content invalidation.
11. Run Chromium, Playwright WebKit, and native iOS Safari checks.
12. Run protected-staging PageSpeed mobile and desktop against the exact
    candidate.
13. Confirm all required human approvals are current and hash-bound.
14. Stop if any hard gate fails.
15. After a complete staging pass, provisionally promote the exact candidate
    and configure the apex-to-canonical redirect.
16. Require four PageSpeed scores of 100 on the canonical production host or
    roll back immediately.
17. Repeat live browser, form, cache, crawler, and observability checks on the
    production host.

## Evidence to Preserve

- Toolkit and project source revisions.
- Candidate identity and Worker deployment identity.
- Build, typecheck, and security-scan output.
- Route, redirect, sitemap, and crawler reports.
- Cold, warm, burst, and PageSpeed results.
- Interface, render-sharpness, side-navigation, design, and visual-composition
  reports.
- Turnstile form inventory and positive plus negative submission evidence.
- Synthetic form-record cleanup evidence when a positive test writes data.
- Cache-rule expression and edge response evidence for each HTTP method.
- Playwright WebKit and native Safari results.
- Open Graph manifests and hash-bound visual approval.
- Content-quality reports and hash-bound editorial approval.
- Production cutover decision, including explicit blockers.

## Outcome

The work produced a faster, safer release candidate and exposed several defects
that local builds and representative smoke tests did not reveal. The most
important result was procedural: the production gate held. The existing site
remained in place while the exact missing evidence was documented for a later
release.
