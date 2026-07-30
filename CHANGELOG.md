# Changelog

This file records reusable improvements to Go for Launch so maintainers can understand what changed, why it changed, how projects are affected, and which tests prove the behavior.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Canonical CMS Authentication at Cutover

#### Symptom

- Email sign-in links continued to use a retired preview hostname after a
  production cutover.
- A passkey created on the preview hostname failed on the canonical production
  hostname even after the canonical URL was added to the password manager
  item.
- The CMS admin shell loaded while existing records appeared as blank drafts.
- A clean browser reproduced the failure, disproving the initial extension
  hypothesis.
- Global trailing-slash middleware changed the request URL without recomputing
  framework route parameters, so the CMS received undefined identifiers.

#### Root Cause

- The CMS stored a private authentication base URL separately from its public
  site URL and canonical metadata.
- WebAuthn passkeys remained bound to the relying-party identifier used during
  registration. Password manager website aliases did not change that binding.
- Admin-shell availability was treated as proof that every CMS API request
  worked.
- Internal URL substitution was assumed to perform a new route match.

#### Hard Rules and Implementation

- Added a canonical authentication-origin cutover sequence to the
  WordPress-to-EmDash migration guide.
- Require one bounded magic-link host assertion and one canonical passkey
  sign-out and sign-in cycle before retiring preview-host access.
- Require old passkey access to remain until the canonical passkey succeeds.
- Defined a guarded break-glass repair for initial-setup values that lack a
  supported setter, including point-in-time recovery, exact row accounting,
  read-back verification, and rollback.
- Require an existing CMS record to load and save in a clean browser with the
  exact content API request observed at the server.
- Added checklist controls that distinguish client-side request filtering from
  CMS, database, and application defects.
- Require exact slashless admin API requests to preserve populated collection
  and item parameters when a site enforces trailing slashes.
- Require method-preserving normalization to pass list, existing-item, authors,
  trash, save, and publish checks in the private candidate environment.

#### Test Evidence

- Documentation and case-study normalization checks pass.
- No application release, performance threshold, mobile test, desktop test, or
  PageSpeed requirement changed.

### CMS Fixture Keys Ignore Test-Only Dependency Churn

#### Symptom

- A complete private CMS fixture rebuild started even though publication data,
  importer behavior, compatibility patches, and production dependencies had
  not changed.
- The only package-lock difference was a development-only parser used by a
  release check.

#### Root Cause

- The fixture key hashed the complete package lock rather than the production
  dependency graph represented by the stored CMS state.

#### Hard Rules and Implementation

- Key CMS fixtures by seed, complete content archive, importer, compatibility
  patches, and normalized production dependencies.
- Exclude packages explicitly marked development-only from the dependency
  fingerprint.
- Require a unit check proving development dependency changes preserve the
  fingerprint and production dependency changes invalidate it.
- Permit a one-time cache alias only after every schema and content input is
  proven identical.
- Keep exact-candidate browser, performance, mobile, desktop, security, and
  PageSpeed gates independent from fixture reuse.

#### Test Evidence

- Documentation and case-study normalization checks pass.
- No score threshold or mandatory release gate changed.

### Private Runtime Media Fixtures and Stable Candidate Identity

#### Symptom

- A private site-health run followed runtime-image redirects to original media.
  Small originals passed while large originals failed, so the gate did not
  consistently prove that the image transformation path worked.
- A separate fixture parser split historical filenames at the first
  extension-like segment and selected a slightly different sample than the
  site-health parser.
- Test harness corrections caused release identifiers to change even when the
  deployable site artifact was unchanged.

#### Root Cause

- The local database fixture did not include the deterministic runtime media
  sample, and the verifier checked only response status, type, and bytes.
- Runtime inventory selection was duplicated between the verifier and the
  fixture builder.
- Artifact identity, source-control identity, and harness identity were treated
  as one value.

#### Hard Rules and Implementation

- Added required runtime-image response headers so a redirected original cannot
  satisfy a transformed-image gate.
- Added zero-request runtime-image inventory mode. Private fixture preparation
  now consumes the exact selected paths emitted by the authoritative verifier.
- Required bounded, reusable local object fixtures with explicit request,
  transfer, substitution, and cache provenance.
- Defined candidate identity as the deployable artifact identity. Harness-only
  changes invalidate evidence but retain the candidate identifier only when a
  deterministic artifact hash remains unchanged.
- Required projects to identify framework-generated build entropy. Stable
  build secrets must use supported private environment inputs, while embedded
  paths require a canonical workspace. Secrets must never enter source,
  console output, or evidence.
- Made Open Graph approval checks read-only for review artifacts. The check
  still validates every approved image, input fingerprint, output hash,
  dimension, format, opacity, byte limit, and approval record, but it no longer
  regenerates contact sheets that were already reviewed.

#### Test Evidence

- Site-health tests reject an unexpected delivery-source header and accept
  inventory generation without contacting the configured runtime origin.
- Documentation, normalization, and the complete repository test suite pass.

### Editorial Publishing Without Application Rebuilds

#### Symptom

- Routine publication and featured-image corrections triggered full Astro
  builds, artifact uploads, archive crawls, and repeated application release
  gates even though application code had not changed.
- A content defect expanded into global renderer experiments, increasing risk
  and delaying a small editorial correction.
- A source image that returned successfully was assumed to exist in the
  publication media store, and a small selected image produced a blurry lead.

#### Root Cause

- The toolkit treated every production mutation as an application candidate
  change and had no formal editorial publishing lane.
- Content corrections, application defects, cache invalidation, and media
  reconciliation were not classified separately before work began.
- Cache layers and dependent routes were not recorded as an explicit route
  graph.

#### Hard Rules and Implementation

- Added `EDITORIAL-PUBLISHING-AND-DYNAMIC-CONTENT.md` to classify CMS-only
  changes, define targeted validation, preserve performance, and escalate
  application changes.
- Added reusable editorial publish record and configuration templates.
- Added `scripts/verify-editorial-publish.mjs` and tests. The verifier rejects
  application-file changes, application builds, direct database writes,
  incomplete route checks, stale dependencies, changed security boundaries,
  and missing risk-based performance evidence.
- Added delta-import, media-reconciliation, targeted invalidation, duplicate
  hero, responsive-image, route-graph, and archive-review-queue rules.
- Kept the application release gate unchanged. Application changes still
  require the complete exact-candidate suite, native iOS Safari, mobile and
  desktop coverage, and PageSpeed 100 in all four categories.

#### Test Evidence

- The editorial verifier accepts a complete CMS-only record.
- It rejects application changes, builds, incomplete dependent-route evidence,
  changed security boundaries, and a missing high-risk PageSpeed result.
- Documentation, case-study normalization, and the complete repository test
  suite pass.

### Large Publication Production Cutover Controls

#### Symptom

- A protected candidate and public canonical host shared one Worker service.
  The outer cache returned a public document on the protected host before
  Worker middleware could add its robots and cache policy.
- The apex passed HEAD redirect checks while a cached GET root returned the
  canonical homepage with status 200.
- A public PageSpeed matrix contained provider-error slots with no Lighthouse
  result, while every real score still had to remain immutable and equal 100.
- The existing publication case study stopped at an earlier blocked state and
  did not record the final successful cutover.

#### Root Cause

- Host-aware application code was expected to enforce policy even when
  Cloudflare answered from an outer cache first.
- Control-plane success and one correct response were treated as weaker
  evidence than repeated multi-region convergence.
- Redirect verification did not explicitly require GET and HEAD first hops.
- PageSpeed policy distinguished provider access from site scores but did not
  define a safe supplement contract for missing external-error slots.

#### Hard Rules and Implementation

- Require separate protected and public Worker services when an outer cache can
  precede middleware, with explicit bindings, secrets, preview-host, and
  scheduled-work state.
- Require a third minimal apex redirect service for cached public applications.
  It has no application bindings or scheduled work, preserves path and query,
  sends `Cache-Control: no-store`, and exposes a nonsecret marker.
- Verify apex GET and HEAD for root, path, and query-bearing paths.
- Permit public edge document readiness only when edge hit, candidate,
  application marker, canonical, indexing, and cache policy all agree.
  Protected staging still requires its application cache signal.
- Permit targeted PageSpeed supplements only for preserved provider-error
  slots. Never replace a scored result.
- Require one source record for every separately deployed runtime.
- Updated the anonymized WordPress to EmDash case study with the rounded
  archive scale, remote Podman evidence, forms, search, native Safari, Open
  Graph correction, convergence, final 100-point matrix, apex isolation, and
  evidence reconciliation.

#### Test Evidence

- The complete repository test suite passes.
- Case-study normalization and documentation verification pass.
- Every required PageSpeed score remains 100 for Performance, Accessibility,
  Best Practices, and SEO on mobile and desktop.
- The new guidance preserves failed convergence and provider reports instead
  of relabeling or overwriting them.

### Editorial Artwork Provenance for Social-Card Prototypes

#### Symptom

- A technically valid homepage prototype used the first available recent
  article image. The photograph was unrelated to the publication identity, and
  another convenient source contained a prominent third-party event mark.
- Dimensions, file hashes, palette checks, and general imagery approval all
  passed because the contract did not explain why the selected visual
  represented the shared route.

#### Root Cause

- Source eligibility and editorial suitability were treated as the same
  decision.
- Inventory order silently became an art-direction rule.
- Image ownership review did not separately require inspection for trademarks,
  sponsor marks, watermarks, generated text, or synthetic content.

#### Hard Rules and Implementation

- Every representative prototype now requires an `artworkReview` contract with
  an approved selection method, route-relevance rationale, rights review,
  third-party-mark review, and synthetic-artwork review.
- Source artwork requires a durable source reference and SHA-256. A designed
  fallback records why no suitable source image was selected.
- Publication-identity artwork must be curated for that route. The newest item
  or first inventory record cannot become the implicit homepage image.
- Prototype approval now separately records route-relevance approval and
  rights-and-marks approval, and those values are bound into the immutable
  prototype input and approval records.
- Updated onboarding, production instructions, the release checklist, and the
  reusable Open Graph template with neutral examples.

#### Test Evidence

- Prototype generation fails when route relevance is not approved.
- Prototype generation fails when third-party-mark review is missing.
- The existing renderer, brand, input-hash, output-hash, and real-client
  approval tests remain required.

### PageSpeed Provider Preflight and First-Failure Triage

#### Symptom

- A full audit matrix was started before provider quota was verified, so every
  request failed before scoring.
- After authenticated access produced valid results, one route scored below
  100 because its first-viewport image used an on-demand transform while
  another route reused a release-local derivative of the same source.

#### Root Cause

- Provider readiness, site performance, and matrix completion were handled as
  one loop.
- A valid failed score did not require preservation of the filmstrip, network,
  LCP resource, responsive-source, and comparison-route evidence before
  another attempt.

#### Hard Rules and Implementation

- Require one scored provider probe before a multi-route or repeated-round
  matrix. Quota, authentication, billing, and provider errors are external
  blockers, not site-performance findings.
- Preserve every valid score and stop the remaining matrix at the first
  category below 100.
- Require the frozen candidate's execution-control record to identify the raw
  report, candidate, URL, strategy, dominant audit, diagnosis evidence, and
  next bounded action.
- Performance failures additionally require filmstrip, network, and LCP
  evidence, including preload and responsive-source inspection.
- Any remediation creates a new candidate. The final candidate still runs the
  complete mobile and desktop matrix and must earn 100 in Performance,
  Accessibility, Best Practices, and SEO.

#### Test Evidence

- A frozen candidate with a failed PageSpeed gate and no triage record fails
  execution-control verification.
- A complete preserved first-failure record passes the process verifier while
  the candidate remains in the failed, non-production-ready phase.
- Existing regression coverage still rejects a PageSpeed score of 99 for
  production readiness.

### Machine-Verifiable Execution Control

- Added `scripts/verify-execution-control.mjs` and a reusable project
  configuration so bounded-delivery rules are checked rather than relying only
  on narrative process documentation.
- Required a complete task envelope, reviewed scope, evidence-bearing
  checkpoints, supported finding classifications, and explicit blocker states.
- Rejected raised attempt, investigation, or progress limits unless a named
  owner records the rationale and the specifically supported next action.
- Rejected active blockers that reach their attempt or time limit without a
  reviewed bounded continuation.
- Required frozen candidates to declare every build, browser, device,
  interface, accessibility, security, and PageSpeed gate.
- Required production-ready candidates to record passing evidence for every
  declared gate and exactly 100 in all four PageSpeed categories for both
  mobile and desktop.
- Added regression coverage proving that a 99 PageSpeed result, an unreviewed
  raised limit, and an unapproved third attempt all fail closed.
- Kept execution control separate from release evidence. A passing process
  report cannot replace the complete exact-candidate release suite.

### PageSpeed Document Readiness

- Added a reusable verifier for projects that warm dynamic HTML before
  PageSpeed. It sends browser-document headers, verifies the exact candidate
  and application markers, and requires the final request to expose an
  approved reusable cache state.
- Added a configuration template and regression fixture proving that a generic
  server-side fetch can miss middleware cache eligibility while an HTML
  document navigation reaches the intended cache path.
- Required projects that use warmups to preserve a separate machine-readable
  readiness report for every audited URL.
- Kept cold-document, first-request-after-deploy, bounded burst, real-user,
  WebKit, native Safari, and PageSpeed evidence independent.
- Explicitly prohibited treating a successful warmup as permission to retry,
  discard, or waive a genuine PageSpeed score below 100.

### Execution Control and Bounded Delivery

- Added a reusable execution-control policy that separates process limits from
  release requirements. Time limits, attempt limits, scope decisions,
  deferrals, deadlines, and prior test results cannot waive a mandatory gate.
- Added a task-envelope requirement covering the requested outcome, acceptance
  owner, in-scope systems, explicit exclusions, completion conditions,
  deployment authority, rollback, and the initial candidate state.
- Added a four-way finding classification so required outcomes and release
  blockers remain distinct from recommended follow-up and unrelated work.
- Added representative-proof and named-review requirements before bulk work on
  subjective branding, navigation, information architecture, editorial,
  interaction, and design-system changes.
- Added a default stop threshold of two unsuccessful attempts or ninety minutes
  of active work on one blocker. Crossing the threshold records a blocked
  result and requires a supported owner decision before work continues.
- Added a repeated-evidence stop rule so materially identical failures trigger
  root-cause review instead of speculative adjacent changes.
- Added tiered testing for fast edit loops and phase checkpoints while
  preserving the complete mandatory release suite for the exact frozen
  candidate after the final change.
- Added candidate-freeze, checkpoint, progress-record, follow-up, and
  production-remediation rules that preserve known-good work and rollback.
- Added `templates/execution-control-record.md` for task envelopes, finding
  registers, checkpoints, blocker evidence, bounded continuation decisions,
  exact-candidate results, promotion, and closeout.
- Integrated execution control into project onboarding, repository agent
  instructions, production policy, and the mandatory release checklist.

### WordPress to EmDash on Astro Migration Path

- Added a WordPress to EmDash adapter covering the three assumptions an EmDash target breaks: database-resident content, per-request route resolution, and Portable Text rich text.
- Added a two-stage extraction model that emits the framework's neutral intermediate dataset before any target-specific conversion, so extraction is re-runnable, diffable, and able to feed the parity verifier independently of the running site.
- Added `scripts/wp-extract.mjs`, which reads a WordPress database directly rather than a platform XML export, because the export omits the media offload mapping and the legacy redirect tables that a large migration depends on.
- Added media resolution through the offload plugin's own table. Offloaded objects carry a version segment that the path stored in article bodies does not, so a hostname-prefix rewrite produces well-formed URLs that fail for every image. Every object in the reference migration was affected.
- Added delivery-variant selection restricted to the platform's core image sizes, because sites that have changed themes retain hard-cropped variants that silently recompose photographs while passing every automated check.
- Added `scripts/emdash-seed.mjs`, which splits schema, taxonomies, menus and bylines into the seed file and emits bulk content separately, because the seed file is inlined into every build.
- Added deterministic Portable Text key rewriting, so two generator runs over identical input produce byte-identical output and migration runs can be diffed.
- Added migration identity fields for source record ID, source permalink, and publish date, none of which the seed schema carries and all of which dated permalinks and idempotent import require.
- Added `scripts/emdash-import.mjs`, an idempotent bulk importer over the REST API with bounded concurrency, dry-run and limit flags, and failure capture, closing the absence of a headless bulk-import path.
- Added an index-and-slice archive resolver for numbered pagination, because cursor-only pagination cannot serve a deep archive page requested directly from a search result.
- Added `scripts/verify-route-parity.mjs`, which builds the expected route inventory from the extracted dataset, fails on duplicate content slugs and reserved-slug collisions, and probes a deterministic article sample against a candidate.
- Added `scripts/generate-redirects.mjs` with rule prioritisation, middleware overflow beyond the edge platform's static redirect limit, and recorded removal of vulnerability-probe rules that legacy 404-redirect plugins accumulate.
- Added a taxonomy-archive indexation policy that requires traffic data before any archive is suppressed, defaulting to suppressing only empty archives. The common thin-content heuristic was measured on the reference migration and found backwards: roughly ninety percent of tag-archive traffic came from archives a three-post threshold would have deindexed, because those archives rank for proper nouns where post count does not predict search demand.
- Added `templates/wp-extract.config.json` and `templates/emdash-migration.config.mjs`.

### Pre-Migration Source Compromise Audit

- Added a source compromise audit as a migration gate, run against the backup before extraction, after a production migration found an active compromise with a must-use-plugin dropper, a database-resident payload backup, and an external script injected into pages served to visitors.
- Documented the checks: active plugin list, must-use plugins, encoded and self-writing PHP, executables under uploads, suspicious options, injected content in the database, accounts, and scheduled tasks.
- Documented the remediation order, since removing a payload before its persistence mechanism restores it on the next request.
- Documented the three outcomes and what each means for the migration, including the case where the platform is compromised but the content is clean.

### Case Studies

- Added a normalized WordPress to EmDash news archive migration case study recording the offloaded-media key mismatch, non-reproducible Portable Text conversion, cursor pagination limitation, prose-corrupting shortcode stripper, unsafe theme-generated image variants, adversarial legacy redirect table, inverted thin-archive heuristic, and source compromise findings.
- Added a normalized WordPress to EmDash Cloudflare release-hardening case study covering isolated candidate identity, D1 and edge-cache performance, responsive media, compression, method-safe caching, server-enforced Turnstile, mobile navigation, CDN-injected test nondeterminism, exact-candidate evidence, social-card brand rejection, and the hard gates that correctly stopped production.

### Project-Owned Open Graph Rendering

- Added a fail-closed adoption gate that prohibits bulk Open Graph regeneration
  until a representative prototype set has current named approval.
- Bound prototype approval to the authoritative brand-reference hash, renderer
  source hash, shared visual-system fingerprint, prototype input hashes, and
  prototype output hashes.
- Added separate prototype generation, review, approval, and verification modes
  so a project can reject an unsuitable visual system before generating the
  full route inventory.
- Required real messaging or social-client review plus explicit approval of
  brand authority, template suitability, typography, palette, imagery,
  readability, and the absence of unapproved synthetic artwork.
- Added onboarding records for the brand authority, renderer ownership,
  representative cases, real-client review, and bulk-generation decision.
- Added an asynchronous `renderCard` extension hook so a project can keep the
  shared immutable-generation and approval contract without inheriting the
  toolkit reference template as its visual identity.
- Added `brandAssetSha256` and `renderingFingerprint` inputs for exact wordmark,
  font, source-selection, and custom-layout provenance.
- Added bounded concurrent card rendering for large route inventories.
- Required stakeholder rejection to invalidate a prior hash-valid visual
  approval, because byte integrity does not prove brand suitability.
- Documented real editorial imagery as the preferred source when it supports
  the crop without enlargement, with a designed typographic fallback for
  missing, flat, unreadable, or undersized assets.
- Added regression coverage for a project-owned renderer and immutable reuse
  of its output.

## 0.4.0, 2026-07-22

### Case Study Normalization Gate

- Established normalized case-study filenames and documents that exclude organization, person, domain, infrastructure, release-candidate, unique asset, and nonessential exact measurement details.
- Added a permanent normalization policy, required full-file review marker, contributor rules, release checklist, blocking verifier, and regression fixtures.
- Added the normalization gate to `npm test` and the package `prepack` lifecycle so missing review evidence, personal paths and contact values, nonapproved hosts, UUIDs, long identifiers, token-bearing URLs, and identifying infrastructure metadata fail before packaging or release.
- Added explicit npm package contents plus repository, issue, homepage, and discovery metadata for the 0.4.0 release.

### Interface Quality and Page Differentiation Gate

- Added a browser-measured interface-quality verifier that covers every configured indexable route in Chromium and WebKit at expanded, compact desktop, tablet, mobile, and 320 CSS pixel widths.
- Added blocking checks for control overlap, clipped controls, horizontal overflow, controls outside the viewport, project-defined clearance, route-specific hero limits, first-viewport next-content visibility, and global header proportions.
- Added line-fragment geometry so wrapped inline links do not create false overlap findings, and excluded hidden descendants of closed disclosure regions while retaining their visible summaries.
- Added project-owned page-family and archetype contracts with required reader purpose, content rhythm, visual identity, distinctive selectors, and visible `data-page-archetype` markers.
- Added rendered route-family comparison across structure, layout, palette, typography, and media dimensions so unrelated pages cannot pass by changing only copy and marker names.
- Added a reusable configuration template, machine-readable report, failure screenshots, regression fixtures, release policy, checklist coverage, and design-brief evidence fields.
- Expanded the Stanford Rule content verifier with configurable cross-route opening, closing, and full-copy similarity checks organized by content family, plus template-required read-aloud and route-specific review approvals.
- Added a multi-page educational-site case study recording the action-divider collision, 768 CSS pixel overflow, wrapped-link false positive, closed-menu false positive, and mixed-version Cloudflare propagation finding that produced these reusable rules.
- Updated Astro to 7.1.3 while retaining TypeScript 6.0.3 because Astro Check 0.9.9 does not yet accept the current TypeScript 7 release.

### Project-Specific Extension Boundary

- Added a reusable extension guide that keeps project identities, claims, visual treatments, thresholds, scripts, configuration, approval records, and build notes in the target project.
- Added onboarding fields for the local instruction file, project extension record, and required command that invokes project-owned behavior.
- Required project extensions to participate in the normal build or test chain instead of relying on an optional standalone command.
- Documented generator and approval-contract ownership, toolkit upgrade handling, and the standard for promoting a local need into a generic shared capability.

### Cloudflare Production Observability

- Added a reusable Cloudflare GraphQL Analytics verifier for route and device Core Web Vitals, LCP selectors and asset paths, INP and CLS debug elements, and optional edge HTTP status rates.
- Added advisory, threshold, and baseline-regression modes with minimum sample requirements and separate handling for account RUM and zone HTTP permissions.
- Added secure Global API Key authentication as a fallback to the preferred scoped API token, using Cloudflare's documented email and key headers.
- Changed raw edge `4xx` rate to report-only by default after live zone evidence showed automated WordPress and PHP probes dominating otherwise healthy traffic. Edge `5xx` enforcement remains enabled by default.
- Added a reviewed configuration template, saved-response fixtures, masked credential guidance, machine-readable reports, and regression tests.
- Required viewport-specific browser request assertions so hidden mobile artwork cannot load on desktop, hidden desktop artwork cannot load on mobile, and preloads must match the measured LCP resource.
- Added a production workflow that captures a historical RUM baseline, keeps PageSpeed and Safari as independent gates, then checks Cloudflare immediately and after sufficient post-release traffic.
- Documented that Cloudflare RUM currently covers Chromium rather than native Safari, that rolling windows can include previous-release traffic, and that missing data must never be reported as a pass.

### Native Safari Menu Follow-up

- Updated the filtered-header mobile Safari case study with the final full-viewport header grid fix.
- Recorded iOS 26.5 staging and production menu evidence and the expanded Chromium and WebKit regression suite.

### Stanford Rule Content Quality Gate

- Added a required final-output content gate that defines the audience and primary task for every public route.
- Added deterministic checks for machine-like filler, inflated language, excessive sentence and paragraph length, reading accessibility, and repetitive sentence openings.
- Added a hash-bound editorial review using a senior psychology professor perspective to assess approachability, human tone, clear purpose, and evidence awareness.
- Added a reusable configuration, review record, verifier, unit fixtures, production policy, project instructions, and release checklist coverage.
- Clarified that the Stanford Rule is a Go for Launch editorial standard, not a Stanford University policy or AI-authorship detector.

### Project Onboarding and Service Classification

- Added a required onboarding guide and reusable project record that separate toolkit capabilities from required, conditional, optional, unused, and blocked services.
- Added an explicit paid-service decision, account ownership, least-privilege setup, masked access verification, and fallback workflow.
- Clarified that Ahrefs is optional and does not block unrelated SEO, AEO, browser, sitemap, PageSpeed, or release checks.
- Added an operating-system evidence matrix and a production stop rule when the exact candidate cannot reach a qualified Mac with full Xcode and an installed iOS Simulator runtime.
- Added the onboarding gate to project instructions, the production policy, the release checklist, the AEO guide, and the main README.

### Social Card Artwork Suitability

- Added a hard rule that source-image validity is not enough. Flat gray placeholders, empty transparent exports, low-information gradients, and other visually empty assets must not appear in approved cards.
- Added a reusable pixel-statistics helper that measures average color-channel deviation after flattening transparency.
- Required projects to bind the artwork threshold and selection result into the immutable rendering-input fingerprint.
- Added automated evidence that flat placeholder artwork fails while informative artwork passes.
- Recorded the first integration, where eight low-information page assets were replaced by the approved navy fallback while genuine monochrome photography remained eligible.

### Scoped Image Budgets

- Added path-scoped byte limits to the site-health verifier so reviewed social cards can retain a documented finite budget without weakening the ordinary content-image budget.
- Added regression coverage proving a 150 KB social card can pass a 180 KB scoped ceiling while the global image ceiling remains 100 KB.
- Documented that a finite scoped budget is preferred over an unlimited allowlist.

### Working Practice

- Add an entry whenever a production incident, migration gap, visual defect, browser defect, SEO finding, accessibility issue, or release failure produces a reusable rule.
- Record the symptom, root cause, hard rule, implementation, migration impact, and test evidence.
- Keep site-specific evidence in `case-studies/`. Keep this changelog focused on reusable toolkit behavior.

## 0.3.1, 2026-07-15

### Visual Composition Gate

- Added browser-measured geometry checks for CSS illustrations, diagrams, generated page graphics, charts, hero artwork, and website email graphics.
- Added `data-visual-artboard`, `data-visual-label`, and `data-visual-decoration` contracts for label bounds, overlap, decorative crossings, safe inset, and reviewed fill thresholds.
- Added Chromium and WebKit captures across configured desktop, mobile, and minimum-width viewports.
- Added `VISUAL-COMPOSITION-TESTING.md`, a reusable verifier, configuration template, unit geometry helpers, browser fixtures, machine-readable reports, and human review requirements.
- Removed an unused geometry helper so the toolkit returns zero Astro diagnostics.

### Brand Asset Provenance Gate

#### Symptom

- A social-card fallback used a full-color logomark on a dark navy panel even though the authoritative brand guide required a white or reversed variant.
- The image passed dimensions, file-hash, readability, and general visual checks because the process verified output quality without proving that the selected source asset was the correct brand-kit variant.

#### Root Cause

- A convenient website logo export was treated as interchangeable with the current brand kit.
- The approval record identified palette and general brand integrity but did not identify the source guide, exact asset, allowed background surface, or clear-space rule.

#### Hard Rules Added

- Review the authoritative current brand guide and brand kit before using any logo, logomark, wordmark, icon, seal, mascot, illustration, or branded template.
- Record exact SHA-256 values for the guide and every approved asset.
- Record each asset's named variant, allowed surfaces, minimum rendered size, and minimum clear-space ratio.
- Never crop a standalone mark from another lockup when an approved standalone asset exists.
- Never recolor, distort, rotate, skew, or add effects unless the guide explicitly allows it.
- Treat light, dark, colored, patterned, and photographic surfaces as separate contexts.
- A wrong light or dark variant invalidates approval for every affected output.

#### Implementation

- Added `BRAND-ASSET-PROVENANCE.md`.
- Added `scripts/verify-brand-assets.mjs` and `templates/brand-assets.config.mjs`.
- Added verification for source existence, guide and asset hashes, allowed surfaces, intrinsic and rendered aspect ratios, minimum width, and clear space on all sides.
- Added brand provenance requirements to project instructions, production policy, social-card guidance, and the release checklist.

#### Test Evidence

- Valid guide, asset, surface, ratio, size, and clear-space records pass.
- Changed brand-guide hashes fail.
- A light-background asset used on a dark surface fails.
- Distorted rendering fails.
- Insufficient clear space fails.
- The first integration replaced a dark-panel full-color mark with the exact approved white logomark and replaced the light-panel logo with the official primary full-color lockup.

## 0.3.0, 2026-07-15

### Social Card Release Safety

#### Symptom

- Ordinary builds regenerated every social card, even when card content and SEO presentation rules were unchanged.
- Repeated rendering introduced avoidable visual churn, including clipped descenders, oversized or undersized text, truncated destination text, blurry supporting labels, jagged artwork, weak padding, and template symbols that could be mistaken for validation status.
- A file hash could prove which image was reviewed, but it did not prove which rendering inputs or review purpose produced that image.

#### Root Cause

- Generation and verification were the same operation.
- The generator had no persistent rendering-input state.
- Visual approval was bound only to output bytes.
- Brand palette, typography, padding, contact information, and intended sharing purpose were review suggestions instead of enforceable contracts.

#### Hard Rules Added

- Normal builds are read-only for approved social cards. They verify and reuse files without changing bytes, filenames, encoding, or modification times.
- Only an explicit `--regenerate` command may create or replace a card.
- Rendering fingerprints include only card-visible inputs and versioned card rules. Unrelated SEO, sitemap, citation, dependency, timestamp, environment, and build changes cannot churn cards.
- Missing files, changed rendering inputs, changed bytes, stale state, and removed routes fail closed.
- Every card declares an intended sharing purpose.
- Every project declares approved colors, approved type families, safe padding, minimum supporting-text size, maximum headline size, and whether contact information is required.
- Displayed destinations cannot use an ellipsis or unusable truncation.
- Human approval is bound to both the rendering-input SHA-256 and image SHA-256.
- A named reviewer must explicitly approve readability, brand integrity, and contact information handling.

#### Implementation

- Added a version 2 social-card state manifest containing rendering-input and output hashes.
- Added separate `open-graph:regenerate` and `open-graph:verify` commands.
- Updated the deterministic generator to reuse unchanged files, preserve modification times, render at increased density, and downsample once.
- Added machine checks for brand colors, type families, font-size limits, safe padding, text-region overlap, intended purpose, contact information, URL truncation, dimensions, opacity, format, and file size.
- Updated visual approval manifests with review context, card purpose, input hashes, and output hashes.
- Expanded the production policy, release checklist, project instructions, template configuration, and Open Graph guide.

#### Migration Impact

- Existing projects must perform one explicit regeneration to create the version 2 state manifest.
- Projects must add `purpose`, `brandRules`, `typography`, `contactInformation`, and `reviewContract` configuration.
- Existing visual approvals must be repeated because version 1 approval manifests do not contain rendering-input hashes or review context.
- After migration, clean builds must reuse the committed card assets and fail if an unapproved change would require regeneration.

#### Test Evidence

- Missing cards fail normal builds.
- Explicit regeneration creates state and output.
- Repeated normal verification preserves image modification times.
- Explicit regeneration also reuses unchanged cards.
- Unrelated SEO policy changes do not invalidate or rewrite cards.
- Changed rendering inputs require explicit regeneration and invalidate visual approval.
- Altered image bytes fail closed.
- Truncated destinations, unsafe text width, non-brand colors, and text below the readability minimum fail generation.
- Approval without explicit readability confirmation fails.
- The complete toolkit test suite passes with zero Astro diagnostics.

#### First Integration Lessons

- Keep approved cards in a persistent source-controlled location such as `public/generated/social`. A clean Astro build may replace `dist`, so `dist` alone cannot preserve immutable reviewed assets.
- Split the project pipeline into a render phase and a release-verification phase. The explicit maintenance command may render changed cards, while the ordinary release build only copies and verifies the approved cache.
- Long titles must fail instead of receiving an ellipsis. Add smaller responsive headline sizes only when they remain above the reviewed minimum and their measured bottom edge stays above supporting content.
- Record layout measurements such as headline size, line count, bottom edge, and displayed destination in project state so final-output checks can reject overlap and truncation without depending on OCR.
- Apply a reviewed social-card file budget separately from ordinary content-image budgets. Social previews have fixed large dimensions and should not be forced through an unrelated image threshold after approval.
- The first 72-card integration proved that a repeated normal verification can preserve every source image hash and modification time while still rewriting page metadata in final build output.

## 0.2.0, 2026-07-15

### Added

- Mandatory semantic SEO and citation review with canonical-origin, title, route-intent, content-depth, source URL, and claim-drift checks.
- Ahrefs API v3 integration as an optional or required staging gate.
- Final-output site-health auditing for image weight, metadata, redirects, broken links, orphaned pages, and crawler declarations.
- Hash-bound Open Graph contact-sheet review.
- Render-sharpness checks for blur, forced rasterization, unshipped fonts, and fractional transforms.
- Mandatory side-navigation checks covering native links, valid destinations, keyboard, touch, WebKit, and native iOS Safari behavior.
- Project-controlled design-system review that cannot weaken accessibility, SEO, performance, forms, browser, or mobile gates.

### Changed

- Production releases require the latest compatible toolkit revision, exact-candidate staging, mobile and desktop PageSpeed scores of 100 in all four categories, Playwright WebKit, and native iOS Safari Simulator evidence.

## 0.1.0, 2026-07-10

### Added

- Platform-to-Astro migration guidance with Webflow and WordPress workflows.
- Astro component-system, asset, sitemap, redirects, SEO metadata, structured data, AEO, Cloudflare forms, accessibility, and responsive testing guidance.
- Native iOS Safari testing playbook for blank initial paint, frozen scrolling, touch navigation, fixed-header spacing, forms, modals, image aspect ratios, and horizontal overflow.
- Production release policy requiring staging verification and canonical-host checks.
