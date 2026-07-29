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

The normalized production inventory was large enough that sampling alone could
not establish release confidence:

| Surface | Normalized scale |
|---|---:|
| Migrated posts | Roughly 3,600 |
| Expected public routes | Roughly 12,400 |
| Indexable pages | Roughly 12,100 |
| Runtime image references | Nearly 18,000 |
| Interface checks in the final full-route sweep | More than 120,000 |
| Public PageSpeed results | Two dozen |

These values are rounded to prevent correlation with the source publication.
They remain useful because they show why exact-candidate evidence, bounded
recovery, deterministic generation, and machine-readable reconciliation were
necessary.

## Release Decision

Several intermediate candidates correctly remained blocked. The final frozen
candidate passed the complete protected-staging suite, clean remote Podman
build, route convergence, all-route interface checks, live forms, native
Safari, and protected PageSpeed requirements before the canonical hostname
changed.

Production promotion then remained provisional until the same candidate passed
two canonical-host convergence intervals, live SEO, smoke, forms, Chromium,
WebKit, native Safari, and a public PageSpeed matrix with Performance,
Accessibility, Best Practices, and SEO all equal to 100. The apex moved last,
after a dedicated redirect service passed first-hop GET and HEAD verification.

The release succeeded without lowering a score, shrinking a required route
surface, making staging indexable, replacing public evidence with staging
evidence, or discarding failed reports. The decisive change was not a waiver.
It was an isolated production topology plus a more disciplined evidence
sequence.

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

## Clean Remote Build Before Cloud Deployment

The frozen source revision was exported to an approved remote Linux host and
built in a fresh rootless Podman container before any candidate asset or Worker
was uploaded.

The clean environment ran:

- Locked dependency installation.
- Astro type checking.
- Source compromise and malware checks.
- WordPress local-date permalink verification.
- Complete route inventory verification.
- Edge and Worker redirect verification.
- Public form and Turnstile inventory verification.
- The production Astro and Cloudflare Worker build.

This separated repository state, local caches, and Mac-specific behavior from
the deployable candidate. It did not replace WebKit or native Safari. The same
source revision still had to pass those gates on a qualified Mac.

### Reusable rule

Use an isolated build host to prove reproducibility before deployment. Record
the source revision, container image family, dependency lock, build result, and
artifact identity. Never treat remote Linux browser results as native Safari
evidence.

## Legacy Routing and Content Scope

WordPress remained the routing authority for ambiguous legacy URLs even after
EmDash became the content runtime. The migration recorded whether each
historical route was a post, page, taxonomy, redirect, or intentional drop
instead of inferring intent from its current body.

One empty legacy page whose slug duplicated the site's home concept redirected
to the root. Other page redirects remained explicit. Historical posts retained
their local publication-date permalink behavior.

The project's enhanced editorial content review applied to pages, not the
migrated post archive. That scope was recorded as a project rule rather than
silently running page-only acceptance criteria against thousands of legacy
opinions. Technical SEO, sitemap, interface, image, browser, and performance
gates still covered indexable posts.

The legal surface was rebuilt as a hub with privacy and terms routes. Its
operator statement accurately described a volunteer publication whose
contributors expressed their own views without centralized editorial
oversight. The migration did not invent an editorial review promise that the
organization did not provide.

### Reusable rule

Keep content-policy scope separate from route and technical coverage. A
reviewed page-only editorial rule does not authorize excluding posts from
sitemap, canonical, interface, Safari, or PageSpeed-representative testing.

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

### Protected and public hosts shared an outer cache namespace

The first Custom Domain canary placed protected staging and public production
on the same Worker service. A public root document entered Cloudflare's outer
cache. The next clean protected request received that public document before
application middleware ran.

The request pattern proved the layer at fault:

- Unique protected URLs reached the Worker and returned both HTML and response
  `noindex` controls.
- Clean protected URLs returned an aged edge hit with public cache policy and
  no staging robots controls.
- Repeated zone, URL, and application-tag purges did not remove the preexisting
  shared object.
- The protected application cache was correctly partitioned, but it never ran
  for the bad response.

The public canary was detached and the prior canonical route was restored. The
same frozen build was then deployed to separate Worker services:

| Service role | Host class | Indexing | Scheduled work |
|---|---|---|---|
| Protected candidate | Candidate and origin canary | `noindex` | None |
| Public production | Canonical `www` | Indexable | None |
| Existing scheduler | No public release host | Not applicable | Existing cron only |

The candidate and production services reused the tested data bindings, disabled
their public preview subdomains, and received their own secret bindings through
the approved secret flow. A secret attached to one Worker service was never
assumed to exist on another.

After isolation, protected requests consistently returned the protected robots
and cache policy, while public requests consistently returned the public
policy. A failed first regional convergence report was retained during DNS
propagation. Two later reports passed after separate quiet intervals.

### Reusable rule

Do not share a Cloudflare Worker service between protected and public hosts
when an outer cache can serve a document before Worker code. Application cache
keys and middleware cannot repair a response they never receive. A cache purge
may aid recovery, but it is not a substitute for service and cache-namespace
isolation.

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

## Turnstile on Every Public Write Form

Client-side widgets alone were not accepted as protection. Every public form
that could create a record or side effect had to cross a shared server-side
verification boundary. Read-only GET search remained outside that boundary.

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
- Perform no email, write, redirect, or other side effect before validation.
- Keep EmDash form defaults set to Turnstile so future CMS-created forms inherit
  protection.

### Search forms

Search originally used a normal bookmarkable GET. A broad interpretation of
"protect every form" changed it to a token-gated POST and later reduced the
header field to a link. That introduced a spam-verification failure into a
read-only task and degraded the publication navigation.

The final contract restored a real inline GET search field at every viewport.
It does not load Turnstile, does not create a record, and does not expose a
single-use token in a query string. Turnstile remains mandatory for comments
and the interest form because those routes write data.

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

### Closed advertising interest form

The publication was not accepting advertising. Its prior page implied an
active offer, so it was replaced with a direct closed-status notice and an
optional form for one future availability update.

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

Turnstile is complete only when both the browser and server contract pass for
every write form. Do not insert a challenge into a safe read-only GET merely
because it is represented by a `form` element.
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

Native Safari then exposed a separate search defect. Focusing a mobile input
whose text was smaller than 16 CSS pixels caused page zoom, clipped the header,
and made the control appear deformed. The input was raised to a 16 CSS pixel
equivalent and a regression check now rejects an explicit smaller navigation
search size.

### Verification

- Chromium and WebKit covered expanded desktop, compact desktop, tablet,
  mobile, and the narrowest required width.
- The interface gate checked clipping, overlap, overflow, clearance, and
  page-family markers.
- Playwright WebKit exercised open, close, and navigation behavior.
- Native iOS Safari repeated the representative interaction against the live
  candidate.
- Native iOS Safari focused and typed into search without page zoom, followed a
  menu destination, scrolled a long archive to its footer, and returned to the
  top without clipping or scroll lock.

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

### Synthetic warmup missed the document cache

The PageSpeed runner attempted to prime the candidate with two generic
server-side fetches. The middleware admitted only browser document
navigations, identified by an HTML `Accept` header and
`Sec-Fetch-Dest: document`. The warmup requests never entered that branch, so
the next audit paid for a fresh database render.

The runner was changed to issue the exact audited URL with browser-document
headers and to require an application cache-state header to report a reusable
hit on the final request. That evidence was stored separately from every
PageSpeed result.

This did not redefine a cold request, permit score retries, or weaken the
perfect-score gate. It made the stated warm-path measurement match the
visitor-cache behavior it claimed to test.

### Reusable rule

If a synthetic performance workflow claims to warm HTML, verify the request
contract and the cache state. A pair of successful generic fetches and a lower
response time do not prove that a browser navigation can reuse the document.

### Public edge hits can precede application cache diagnostics

The protected candidate could require an application cache-state header because
its outer cache was bypassed. On the public canonical host, Cloudflare could
serve a valid edge hit before the application added that diagnostic header.
Requiring the application header there would incorrectly reject the exact
visitor path the warmup intended to prove.

The public readiness rule therefore accepted a reusable document only when all
of these independent facts agreed:

- The canonical URL and exact candidate identity matched.
- The application marker was present.
- The response was publicly indexable.
- The public CDN cache policy matched the release contract.
- Cloudflare reported an edge hit.

This allowance applied only to the public canonical host. Protected staging
still had to prove its application-level cache state because its edge cache was
required to bypass documents.

### Provider failures and targeted supplements

The final public matrix required three rounds, four representative routes, and
mobile plus desktop, for two dozen scored results. Two provider requests
returned no Lighthouse result. They were external-error slots, not scores of
zero and not passing evidence.

The raw report remained immutable. A targeted supplement merger could fill
only a slot already classified as an external provider error. It required:

- The same candidate, route, strategy, configuration, and warmup contract.
- A valid Lighthouse document with no runtime warning.
- Performance, Accessibility, Best Practices, and SEO all equal to 100.
- Hashes for the original report and every supplement.
- Refusal to replace any existing scored result, whether passing or failing.

The completed matrix contained all required results at 100. No average was
used, no failed score was overwritten, and no threshold changed.

### Reusable rule

Distinguish provider absence from a measured site failure, but leave both
release states blocked until required evidence exists. A supplement may repair
an empty external-error slot only. It must never replace a genuine score.

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

Before bulk regeneration, three representative prototypes were required:

1. Publication identity using a curated, rights-reviewed real photograph.
2. A long article headline using its actual editorial lead image.
3. A typographic fallback using approved brand assets and no synthetic art.

The prototypes were reviewed in an authenticated real share composer without
publishing. Bulk approval then bound the complete card inventory to both input
and output hashes. Changed cards received contact-sheet review, and every card
had to remain below the project's byte limit.

### Reusable rule

Technical approval cannot rescue an off-brand template. Preview representative
cards in a real messaging client early, before producing the full inventory.
If a stakeholder rejects the visual system, treat that as approval
invalidation, not a request to relabel the existing output. Do not use
synthetic placeholder art when real editorial imagery or a designed
typographic fallback is available.

## Intermediate Findings That Correctly Blocked Production

### A prior PageSpeed pass was not current evidence

An earlier candidate reached the required score in every category. A later run
against the exact candidate had mobile Performance below the required
threshold. The newest exact-candidate result controlled the decision.

### Representative route coverage was incomplete

Representative page archetypes passed browser and viewport checks, but the
release policy required every indexable route. A sample could identify defects
and guide fixes, but it could not close a full-route gate.

### Render-sharpness scope required an explicit decision

Representative public pages passed. A whole-output scan also inspected
administrative dependency CSS that public pages did not load. The correct next
step was a reviewed scope decision or upstream fix, not silently ignoring the
finding.

### Open Graph evidence was incomplete and visually wrong

The migrated publication reused historical imagery and lacked a complete set
of unique, hash-bound, visually approved social cards for every indexable page.
The first technically complete set was also rejected as off-brand. Production
remained blocked until the visual system, representative prototypes, contact
sheets, and final hash-bound approval all passed.

### Native Safari found a defect that emulation missed

The mobile search field passed headless browser checks but triggered Safari
focus zoom on the pinned iPhone Simulator. That candidate remained blocked
until the size correction and native retest passed.

### Cloudflare convergence was incomplete

A deployment and Custom Domain update succeeded at the control plane while one
region still failed DNS or served the prior application. The failed reports
remained failed. Production testing began only after repeated multi-region
identity checks agreed twice.

### Cache architecture violated host policy

Protected and public hosts returned the right application result on unique
URLs, but clean URLs crossed policies through the shared outer cache. Purging
could not establish a durable boundary. Production remained blocked until the
host classes used isolated Worker services.

### Reusable rule

Do not convert a missing approval into a technical waiver. Do not reduce a gate
because a migration has many routes. Record the missing evidence, preserve each
failed report, fix the responsible layer, and leave production unchanged until
the exact candidate passes.

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
- Putting Turnstile in read-only search created a spam-verification failure and
  threatened to expose a single-use token in navigation state. Keep safe search
  as a plain GET and reserve Turnstile for write forms.
- Trusting deployment completion to clear cache allowed stale candidate HTML.
  Wait for route convergence, purge the HTML cache tag, and retest clean URLs.
- Treating a hostname purge as equivalent to a Worker Cache API tag purge left
  old HTML in place.
- Sharing one Worker service between protected and public hosts allowed the
  outer cache to cross robots and cache policy boundaries before middleware.
- Trusting HEAD for the apex missed a cached GET root document that never
  reached redirect middleware.
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
- Treating an external PageSpeed provider error as a failed site score confused
  absence of evidence with measured performance. Preserve the empty slot and
  fill only that slot with a matching targeted result.
- Running the complete suite after every speculative change consumed hours
  without isolating the controlling path. Use targeted checks during
  remediation, then freeze and run the full mandatory suite once.

## Apex Redirect Required a Third Service

The first apex attachment reused the public application service. Initial HEAD
requests returned the expected permanent redirect. The structured GET verifier
then found a split result: uncached paths redirected, but the apex root returned
the cached canonical homepage with status 200.

The application middleware contained the right redirect. Cloudflare served the
cached root before that middleware executed. This was the same cache-namespace
failure class as the protected and public collision.

The durable correction was a third minimal Worker service:

- It served only the apex Custom Domain.
- It had no data, media, queue, or scheduled-work bindings.
- Its public preview subdomain was disabled.
- It returned a permanent first-hop redirect.
- It preserved the complete path and query.
- It sent `Cache-Control: no-store`.
- It exposed a stable redirect marker for verification.

The Worker passed local and remote Podman behavior tests plus a deployment dry
run before the apex mapping changed. Production verification then repeated GET
and HEAD for the root, a representative path, and a query-bearing path across
multiple rounds. Every response had to redirect directly to the canonical
host, preserve path and query, and retain the canonical application's exact
candidate identity on the destination.

### Reusable rule

Give an apex redirect its own service and cache namespace. Verify first-hop GET
and HEAD behavior. A HEAD-only pass cannot prove that a cached GET root will
redirect.

## Reusable Release Sequence

1. Fetch the toolkit upstream and verify the selected revision.
2. Freeze one project revision and record its complete runtime inputs.
3. Export that revision to a fresh remote Podman checkout and pass dependency,
   type, compromise, route, redirect, form, and build checks.
4. Deploy only the exact tested output to an isolated protected service and
   attach required secrets without exposing their values.
5. Wait for route convergence, purge only the documented cache layers, then
   assert candidate identity on clean URLs, canonical output, robots behavior,
   and HTTPS.
6. Run the smallest targeted check for the last known failure before spending
   time on the full matrix.
7. Establish cold, warm, and concurrent server-performance evidence.
8. Verify media bytes, responsive selection, compression, and cache headers.
9. Run route parity, redirects, sitemap, site health, semantic SEO, content
   quality, render sharpness, interface, side navigation, design, and visual
   composition gates as applicable.
10. Inventory every public write form and test browser plus direct-request
    Turnstile behavior through the real edge. Test read-only GET search
    separately.
11. Verify method-aware cache rules, purge behavior, and content invalidation.
12. Run Chromium, Playwright WebKit, and native iOS Safari checks.
13. Run protected-staging PageSpeed mobile and desktop against the exact
    candidate.
14. Confirm all required human approvals are current and hash-bound.
15. Stop if any hard gate fails. Preserve the failed report.
16. Deploy the same build to a separate public service with no duplicate cron.
17. Attach only the canonical hostname, then require two multi-region
    convergence passes separated by quiet intervals.
18. Run public SEO, smoke, forms, search, Chromium, WebKit, native Safari, and
    the complete PageSpeed matrix. Every category in every result must equal
    100.
19. Deploy the minimal redirect Worker to a third service, attach the apex, and
    verify first-hop GET and HEAD behavior for root, path, and query.
20. Repeat route convergence and a post-apex public PageSpeed check.
21. Reconcile every artifact, source runtime, toolkit revision, candidate
    assertion, and failed report before release signoff.

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
- Protected, public, and apex service topology with bindings and scheduled-work
  separation.
- Failed and passing multi-region convergence reports.
- Playwright WebKit and native Safari results.
- Open Graph manifests and hash-bound visual approval.
- Content-quality reports and hash-bound editorial approval.
- Raw PageSpeed reports, allowed external-error supplements, and their hashes.
- GET and HEAD apex redirect reports with path and query preservation.
- Production cutover and rollback decisions, including explicit blockers.

## Final Production Evidence

The final normalized evidence package established:

- A clean remote Podman build for the frozen source.
- More than 120,000 interface checks across the complete indexable route set.
- Nearly 18,000 runtime image references verified.
- Two separate zero-finding canonical convergence reports across the remote
  build location and seven external regions.
- Public smoke and live SEO across representative route families.
- Chromium and WebKit form checks with no first-party browser errors.
- GET search results without spam verification.
- Comment and interest forms that initialized Turnstile.
- Direct token-free writes that failed before storage.
- Hash-bound native Safari captures for home, search, interest, and comments.
- Two dozen public PageSpeed results, every category at 100.
- Repeated apex first-hop redirects with exact path and query preservation.
- A final evidence reconciliation containing almost forty artifacts, separate
  source records for both deployed runtimes, the toolkit record, and no
  findings.

The final indexable-host allowlist contained only the canonical host and the
redirecting apex. Candidate, release, and provider preview hosts remained
nonindexable.

## Outcome

The frozen candidate reached production and the apex redirected to the
canonical host. The successful topology used one service for protected
validation, one for the public application, one minimal service for the apex
redirect, and the existing scheduler without duplicate cron.

EmDash and Astro were capable of serving the large publication. The prolonged
work came from legacy routing ambiguity, cold data and media paths, visual
approval gaps, native Safari behavior, Cloudflare cache and route convergence,
and an inefficient sequence of full intermediate retests. The hard gates found
real defects. The reusable improvement is to isolate the responsible layer,
prove the smallest failing path, freeze one candidate, and then run the
complete release contract without weakening it.
