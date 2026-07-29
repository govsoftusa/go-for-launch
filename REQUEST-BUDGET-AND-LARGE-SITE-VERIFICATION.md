# Request Budget and Large-Site Verification

Performance gates do not justify an unbounded test load. A release process that
creates millions of requests while proving a publication can serve ordinary
traffic is itself a production defect.

This policy adds request economics to Go for Launch without changing any
quality threshold. Application releases still require mobile and desktop
Lighthouse or PageSpeed lab scores of 100 for Performance, Accessibility, Best
Practices, and SEO. The project must declare which pinned runner is
authoritative before the candidate is frozen. It still requires Chromium,
Playwright WebKit, native iOS Safari, accessibility, security, interface, and
production verification.

## Prefer a private production-format candidate

For edge-hosted applications, use a fresh container on a private host as the
candidate environment. Run the provider's local runtime with local database,
object, cache, image, and session bindings. Populate it from deterministic
source-controlled CMS fixtures.

The provider is deployment-only when project policy says so:

- no public candidate Worker or staging service;
- no workers.dev, pages.dev, or public preview hostname;
- no hosted PageSpeed loop against the provider;
- no archive crawl against production;
- one upload of the frozen artifact;
- a fixed, pre-counted production smoke after deployment.

Fail configuration loading when the candidate hostname resolves to a public
address. Do not rely on an operator remembering the rule.

## Classify the change before testing

Use the editorial publishing lane when only CMS records, publication state,
taxonomies, authors, or media metadata change. Normal editorial publishing:

- does not run an Astro build;
- does not create or deploy an application candidate;
- does not run an archive-wide browser or HTTP crawl;
- does not purge the entire site cache;
- verifies only the changed entries and their named dependent route graph;
- stops at 200 external requests or 250,000,000 transfer bytes.

Use the application release lane when source, templates, dependencies,
configuration, routing, infrastructure, cache behavior, forms, or security
boundaries change.

## Estimate before starting

Every application release must declare a request and transfer estimate before
the first external request. Count each gate separately:

| Gate type | Estimate |
| --- | --- |
| Local build and static HTML checks | Zero external requests |
| Local browser geometry | Zero completed external requests |
| Runtime object or image verification | One request per unique object, plus declared failure retries |
| Candidate snapshot | One request per route, plus declared failure retries |
| Search, form, redirect, and smoke checks | Exact planned request count |
| Local Lighthouse | Fixed mobile and desktop matrix against the private production-format candidate |
| Hosted PageSpeed, when explicitly allowed | One provider probe, fixed warmup, and the fixed scored matrix |
| Production verification | Exact smoke and canonical route count |

Multiply before running:

```text
requests = routes x viewports x engines x attempts
```

Then add assets, retries, warmups, and production checks. Do not describe a
six-figure browser matrix as one test.

The machine-readable execution record defaults to a maximum of 10,000 external
requests and 1,000,000,000 transfer bytes. Raising either maximum requires a
named owner, timestamp, rationale, and exact supported run. An estimate above
the recorded maximum fails before the run starts.

Observed use also fails closed. Stop before the next request when a maximum is
reached. Preserve partial evidence and redesign the verifier. Do not raise the
limit after the overrun to relabel the run as compliant.

## Separate exhaustive static checks from browser checks

Large archives need exhaustive coverage, but not every assertion needs a
browser.

Run static checks over every built indexable route for:

- canonical and sitemap parity;
- metadata, structured data, and index policy;
- internal links and orphan detection;
- content rules;
- route inventory and application identity;
- local asset existence and byte limits.

For runtime-generated images, preserve the complete reference inventory and
verify a deterministic, configured subset when checking every unique variant
would exceed the request budget. Record the total reference count, selected
count, and verified count separately. New editorial media still requires a
targeted check in the editorial publishing lane.

The deterministic archive sample must be combined with every runtime resource
declared by the routes selected for Lighthouse, WebKit, and other browser
gates. Sampling the archive alone can omit the exact images a browser
measurement needs. If the private object binding then follows a production
fallback, the test may download a legacy original and report a payload defect
that the normal fitted path does not have.

Derive the required browser resources from the captured route markup or a
shared route contract. Do not maintain a second handwritten resource list.
Deduplicate the combined set, enforce one total object ceiling, and record how
many objects came from the archive sample and how many came from browser
routes. A cache hit does not remove the ceiling.

Generate the deterministic subset with the same parser that performs the
verification. Emit a zero-request inventory first, populate local fixtures from
that exact selected list, then run the live private check. A separate fixture
parser can drift on historical filenames and silently test a different sample.
When the runtime can redirect to an original asset, require a response header
that proves the reviewed transform path served the image.

Run browser geometry across every reviewed template and meaningful rendering
variant. The representative inventory must still list every indexable route.
Each route maps to a coverage class, and each coverage class must have a tested
representative with a recorded reason. Include deterministic outliers such as
the longest title, oldest compatible record, pagination, form pages, and each
archive surface.

This preserves full route coverage and complete mobile and desktop template
coverage while avoiding repeated execution of identical template code for
thousands of content records.

## Isolate local browser verification

The interface verifier blocks external requests by default. Local HTML, CSS,
JavaScript, fonts, and fixtures may load from the local build server. Requests
to a CDN, production host, analytics service, anti-bot provider, or media
origin are aborted and counted.

If a local browser gate depends on an external resource, make the dependency
local or provide an approved deterministic fixture. Do not let a local loop
become production traffic.

The report records:

- attempted external requests;
- blocked external requests;
- completed external requests;
- reported transfer bytes;
- external origins.

The default completed external request maximum is zero.

## Preserve production transport and host behavior locally

Private browser testing must reproduce the production behavior that changes a
score. Two common differences are hostname-based indexing and multiplexed
transport.

If the application serves `noindex` on every noncanonical host, map the
canonical hostname exclusively to loopback inside the container and start the
same artifact in its production indexability mode. Keep the ordinary private
candidate origin protected and verify that protection separately. The
Lighthouse origin must still resolve only to private addresses. This proves the
real indexable branch without publishing a crawlable candidate or ignoring an
SEO failure.

If the provider's local runtime speaks only HTTP/1.1 but production uses
HTTP/2 or HTTP/3, an HTTP/1.1 Lighthouse result may measure connection
serialization that production does not have. Put a loopback-only HTTP/2 proxy
in front of the local runtime, preserve the original Host header, and require a
machine-readable report proving that the browser negotiated HTTP/2. A proxy
that records no HTTP/2 requests, an upstream failure, or a public listener
invalidates the run.

Transport fidelity cannot weaken throttling, replace the exact artifact, hide a
scored audit, or authorize best-of-N retries. It makes one private measurement
represent the production request path.

## Scope client scripts to the feature

Load form security clients only on pages that render protected forms. A
site-wide anti-bot script on a publication can become one of its largest
request sources even though most pages contain no write action.

Server-side verification remains mandatory for every protected write. Scoping
the client script does not remove or weaken the security boundary.

## Freeze once, certify once

Use targeted checks during development. Do not repeatedly run the complete
archive suite after each repair.

The release sequence is:

1. Prove a representative slice.
2. Complete implementation with targeted tests.
3. Freeze one exact candidate.
4. Calculate and approve its request budget.
5. Run each complete gate once.
6. Stop on the first valid blocking failure.
7. Diagnose using preserved evidence.
8. Create a new candidate only after a supported fix.

Evidence may carry forward only when it is bound to the exact inputs consumed
by a gate and those inputs, the verifier revision, and the asserted artifact
remain unchanged.

The container must export the exact tested artifact. Deployment must consume
that artifact without rebuilding it. Record both the application commit and
toolkit commit beside the artifact, and refuse deployment when either current
commit differs.

## Own and clean up browser processes

The release controller owns the complete browser process tree. On pass, fail,
timeout, interruption, or lost parent process, it terminates those children and
verifies none remain. A run is not complete while an owned headless browser is
still generating traffic.

## Observability stop conditions

Monitor the candidate and canonical hosts while any external suite runs. Stop
the suite when:

- request or transfer use reaches the recorded maximum;
- one test client becomes the dominant traffic source;
- headless browser traffic exceeds the planned browser matrix;
- one support script becomes a top path unexpectedly;
- response status or cache distribution differs materially from the estimate;
- the run continues after its expected check count.

A verifier must have a known maximum. If the operator cannot state how many
requests the command can make, the command is not ready to run against a
public host.
