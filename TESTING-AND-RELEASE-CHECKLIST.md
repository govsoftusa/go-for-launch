# Astro Mobile Safari Testing and Release Checklist

This checklist is mandatory before production. Any unchecked required item blocks release. PageSpeed must report 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.

## Public case study normalization

- [ ] `CASE-STUDY-NORMALIZATION.md` was read before a case study was created or changed.
- [ ] Every case-study filename, heading, paragraph, code sample, link, screenshot, and embedded output was reviewed for organization, person, domain, account, repository, infrastructure-resource, release-candidate, and correlatable artifact identifiers.
- [ ] Every case study contains the required full-file normalization review marker.
- [ ] Nonessential exact dates, counts, asset names, and performance values were removed or rounded when they could aid re-identification.
- [ ] `npm run case-studies:verify` passes, and no client identifier was added to an allowlist.
- [ ] Any known identifying content blocks commit, packaging, publication, and release even if the automated verifier passes.

## Project onboarding and service decisions

- [ ] `PROJECT-ONBOARDING.md` was read before implementation began.
- [ ] `templates/project-onboarding.md` was copied into the target repository and completed.
- [ ] Every selected workflow identifies the inputs and evidence required to perform it.
- [ ] Every external source is classified as required, conditional, optional, not used, or blocked.
- [ ] The project owner explicitly decided which third-party paid services may be purchased or connected.
- [ ] Every approved external account has a named owner, least-privilege scope, masked access check, and fallback or blocker.
- [ ] Ahrefs is recorded as optional unless a reviewed project contract requires it for one specific workflow.
- [ ] The active build and test operating system is recorded.
- [ ] A qualified macOS runner with full Xcode, an iOS runtime, a Simulator device name, and a UDID is assigned for native Safari testing.
- [ ] If the active operator uses Windows or Linux, the exact candidate handoff to the qualified Mac runner is documented.
- [ ] Production is blocked when required native iOS Simulator evidence cannot be produced.

## Execution control and bounded delivery

- [ ] `EXECUTION-CONTROL.md` was read before implementation began.
- [ ] `templates/execution-control-record.md` was copied into the target repository and completed.
- [ ] `templates/execution-control.config.mjs` was copied into the target repository, and `scripts/verify-execution-control.mjs` passes for the current phase.
- [ ] The production-ready execution-control report records Performance, Accessibility, Best Practices, and SEO at 100 for both mobile and desktop PageSpeed.
- [ ] The task envelope names the requested outcome, acceptance owner, in-scope systems, explicit exclusions, completion conditions, deployment authority, and rollback method.
- [ ] Every new finding is classified as required outcome, release blocker, recommended follow-up, or unrelated before work expands.
- [ ] Subjective brand, editorial, navigation, information-architecture, and interaction directions have representative proof and named human approval before bulk implementation.
- [ ] Blocker attempts and active investigation time are recorded.
- [ ] Two unsuccessful attempts, ninety minutes of active work, or two materially identical failure cycles stop speculative remediation unless a supported bounded continuation is explicitly approved.
- [ ] Reaching a control threshold leaves the failed gate failed and changes the task status to blocked.
- [ ] Checkpoint records identify the current commit, candidate, change, test evidence, blocker, next bounded action, and active time.
- [ ] Candidate freeze excludes polish and unrelated improvements from release remediation.
- [ ] Targeted development tests did not replace the complete mandatory release suite.
- [ ] The complete mandatory release suite passed after the final change against the exact frozen candidate.
- [ ] Any change after candidate freeze created a new candidate and repeated the complete mandatory suite.
- [ ] Follow-up work is recorded separately and is not presented as part of the completed task.

## Incremental static build decision

- [ ] `INCREMENTAL-STATIC-BUILDS.md` was read before the application build.
- [ ] `templates/incremental-build.config.mjs` was copied into the target project and updated for the planned candidate.
- [ ] The agent inspected content, route generation, cache keys, cross-page dependencies, shared modules, volatile inputs, middleware, server islands, configuration, dependencies, and cache availability before selecting a mode.
- [ ] The resolved Astro version and build concurrency came from current project evidence.
- [ ] Total prerendered, `getStaticPaths`, keyed, and expected restored page counts were recorded.
- [ ] The build selected `standard`, `incremental`, or `forced` exactly as the passing decision report recommends, or a safer mismatch has a current named and expiring override.
- [ ] Incremental mode has a persistent project-isolated cache and passing full-render parity evidence with equal output hashes.
- [ ] Incremental mode exceeds the project-owned minimum savings in seconds and percentage.
- [ ] Middleware HTML changes, cache implementation changes, unknown rendering inputs, or failed parity selected forced mode.
- [ ] The complete sitemap, static-output, browser, WebKit, native Safari, PageSpeed, evidence, staging, and production gates remain unchanged for restored pages.

## Editorial publishing and dynamic content

Complete this section instead of the application release sections only when the
classification gate proves that the change is limited to CMS records and media.
Any application change returns the task to the complete checklist. It does not
waive any mobile, desktop, Safari, or 100/100 requirement for an application
release.

- [ ] `EDITORIAL-PUBLISHING-AND-DYNAMIC-CONTENT.md` was read before the production mutation.
- [ ] `templates/editorial-publish-record.md` and `templates/editorial-publish.config.mjs` were copied into the target project and completed.
- [ ] The change is limited to supported CMS record and media mutations.
- [ ] Application source, dependencies, configuration, infrastructure, routing, cache implementation, templates, schemas, and built artifacts remain unchanged.
- [ ] The current production application identity matches a previously verified candidate.
- [ ] The mutation uses the supported CMS UI or API and has a documented rollback.
- [ ] Direct database access is false. Any break-glass exception has explicit approval, a backup, least-privilege scope, exact affected-row evidence, rollback, and parity validation.
- [ ] Delta import uses a stable source identifier and checksum, and a repeated import is an idempotent no-op.
- [ ] Media identifiers, object keys, delivery URLs, intrinsic dimensions, content types, provenance, rights, and intended use were reconciled.
- [ ] Featured-image selection received editorial review and was not chosen automatically by file size or inventory order.
- [ ] The affected route graph names direct routes, home, archives, authors, related content, search, feeds, and sitemaps.
- [ ] CMS query cache, object cache, Worker Cache API, CDN HTML cache, CDN asset cache, and browser cache were considered as separate layers.
- [ ] Only the required content keys and dependent routes were invalidated.
- [ ] Changed canonical routes pass GET and HEAD with the expected status and current application identity.
- [ ] Canonical, index policy, title, deck, author, date, taxonomy, body, publication state, and media match the intended record.
- [ ] The featured image is sharp at rendered size, responsive, within byte budget, and not duplicated accidentally at the start of the body.
- [ ] Home, archive, author, search, feed, related-content, and sitemap surfaces agree with the CMS state.
- [ ] Existing interactive forms retain the approved anti-spam boundary.
- [ ] Any CMS editorial-readiness plugin ran against the final post hash and policy version.
- [ ] Objective publication blockers passed, while subjective SEO and AEO guidance remained advisory.
- [ ] Every authoritative publication path invokes a server-side prepublication check. A client-only editor check is not treated as enforcement.
- [ ] Medium and high performance-risk publishes have a targeted browser trace for affected first-viewport routes.
- [ ] High performance-risk publishes have a passing targeted PageSpeed result when the provider is available. A valid score below the project requirement follows the rollback policy.
- [ ] `scripts/verify-editorial-publish.mjs` passes against the completed record.
- [ ] Any renderer, schema, component, dependency, configuration, routing, cache-code, security-boundary, or infrastructure finding was separated into an application release.
- [ ] No Astro build, application candidate, artifact upload, or full-site cache purge was performed for the qualifying editorial publish.
- [ ] The publish record preserves symptoms, root cause, failed experiments, targeted checks, performance evidence, decision, and rollback status.

## Stanford Rule content quality

- [ ] `STANFORD-RULE-CONTENT-QUALITY.md` was read before public content was written or revised.
- [ ] Every public route names its intended audience and the task that audience is trying to complete.
- [ ] The opening addresses the reader's need before internal implementation details.
- [ ] Requirements, optional tools, examples, and limitations are clearly distinguished.
- [ ] Unfamiliar technical terms are defined before they carry an argument.
- [ ] Machine-like filler, inflated marketing language, and repetitive sentence frames were removed.
- [ ] Openings, closings, and full copy pass the configured cross-route similarity thresholds for different content families.
- [ ] Similarity findings are resolved through route-specific writing or a reviewed same-family classification, not arbitrary exceptions.
- [ ] Sentence length, paragraph length, and reading ease pass the reviewed route thresholds.
- [ ] A reviewer used the senior psychology professor perspective to assess approachability, human tone, clear purpose, and evidence awareness.
- [ ] A reviewer read the page aloud, revised unnatural cadence, and confirmed that it makes a route-specific argument.
- [ ] Every editorial review has a specific note, current date, audience match, and exact built-content hash.
- [ ] The content quality verifier passes against the exact production build.
- [ ] No result is described as AI detection or as a Stanford University policy.

## Baseline

- [ ] Fetch the configured Go for Launch upstream and confirm the checkout is current.
- [ ] Record the toolkit repository, branch, and commit in release evidence.
- [ ] Read applicable repository instructions.
- [ ] Record the existing working tree and preserve unrelated changes.
- [ ] Confirm the real Astro application root.
- [ ] Inventory every public and intentionally private route.
- [ ] Assign every indexable route to a page family and project-owned archetype with a reader purpose, content rhythm, visual identity, and distinctive selectors.
- [ ] Capture legacy desktop, tablet, and mobile references.
- [ ] Record the canonical hostname, staging target, and deployment contract.
- [ ] The CMS stored authentication origin equals the canonical production origin and is not inherited from a retired preview host.
- [ ] A bounded password-reset, invitation, or magic-link test uses the canonical production scheme and hostname.
- [ ] A passkey registered on the canonical production origin completes one sign-out and sign-in cycle before preview-host access is retired.
- [ ] The session source of truth provides the consistency required for an immediate authentication write followed by an identity read.
- [ ] Custom session driver option names were checked against deployment-adapter reserved and overwritten options.
- [ ] The compiled private candidate completes the credential assertion and an immediate authenticated identity request with the expected role.
- [ ] The real CMS admin base path loads, not an assumed shortcut or public application route.
- [ ] An existing CMS record loads and saves in a clean browser, and the exact content API request is observed at the server.
- [ ] Browser extensions or privacy rules that block CMS requests are diagnosed before a client-blocked editor is treated as a server or database defect.
- [ ] If public routes enforce trailing slashes, the slashless CMS API URLs used by the admin reach handlers with populated collection and item parameters.
- [ ] Exact public authentication endpoints remain public after any required slash normalization and reach their verifier without requiring a preexisting session.
- [ ] API slash normalization preserves GET, POST, and PUT semantics, including one disposable local write with its request body intact.
- [ ] A dynamic email login state renders its anti-spam challenge, blocks submission before verification, enables submission after verification, and attaches the token to the outgoing request.
- [ ] The private browser proof stubs the external challenge client while the server separately rejects missing and invalid tokens.
- [ ] CMS list, existing-item, authors, trash, save, and publish requests pass in the private candidate environment.
- [ ] Every required editorial collection renders a real fixture title in the admin console.
- [ ] A disposable local draft can be created, edited, reloaded, moved to trash, and permanently deleted.
- [ ] Redirect responses are not counted as final API success, and the final handler receives preserved route parameters, method, and body.
- [ ] Authentication evidence excludes raw tokens, cookies, personal addresses, private bodies, and token-bearing URLs.

## Project-Controlled Design-System Conformance

- [ ] Read [Configurable Design-System Gate](DESIGN-GATE-POLICY.md) and record the project mode, framework, scope, and reviewer policy.
- [ ] Run the design gate and preserve its machine-readable result, including when the mode is `off`.
- [ ] Confirm the design setting does not disable any mandatory core gate.
- [ ] For `advisory` or `required` review when the configured scope applies, read [Design Optimization and Brand Continuity](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md) and complete [templates/design-optimization-brief.md](templates/design-optimization-brief.md).
- [ ] Treat findings as production blockers only when the mode is `required`.
- [ ] Do not claim conformance without an applicable passing review.

Complete the remaining items in this section only when design review is applicable:

- [ ] Record the approved brand source and design authority.
- [ ] Inventory logo, color, typography, imagery, shape language, voice, composition, and trust anchors.
- [ ] Record whether each brand anchor will be preserved, refined, replaced with approval, or remains unknown.
- [ ] Diagnose hierarchy, density, interaction, and responsive anatomy before changing styles.
- [ ] Classify every bar near the logo or navigation as an alert, announcement, utility bar, or brand statement.
- [ ] Evergreen positioning and marketing copy are not styled as alerts.
- [ ] Every announcement has a content owner, destination when needed, and review or expiration date.
- [ ] The header uses one primary control layer unless a second layer has a distinct documented user purpose.
- [ ] Status dots, warning colors, and alert icons represent genuine current states.
- [ ] Capture baseline and candidate first-viewport and full-page evidence at 1440 by 1000, 1024 by 900, 768 by 1024, 390 by 844, and 320 CSS pixels wide.
- [ ] Review the homepage and every affected route family, including long-form pages and open interaction states.
- [ ] Distinct route families differ for a reader-centered reason and pass the measured structure, layout, palette, typography, and media comparison.
- [ ] Page purpose and the primary action are clear at every required viewport.
- [ ] Hero scale supports the page purpose and does not delay useful content.
- [ ] Heading measure, content density, section rhythm, grid transitions, and card anatomy pass visual review.
- [ ] The site remains recognizable without relying only on the logo.
- [ ] Glass, translucency, blur, elevation, and motion support hierarchy and remain legible.
- [ ] Text, logos, and interface icons remain sharp at native capture resolution.
- [ ] Blur is isolated to decorative layers and is not applied directly to content-bearing containers.
- [ ] Changed components include all applicable default, hover, focus, active, disabled, loading, success, and error states.
- [ ] Visual acceptance is recorded for the exact candidate.
- [ ] A designated human stakeholder approved the exact candidate when `reviewerRequired` is true.

## Static Content and First Paint

- [ ] Primary content is present with JavaScript disabled.
- [ ] No startup class hides `html`, `body`, `main`, or a full-page wrapper.
- [ ] Critical styles are available before first paint.
- [ ] Fonts have stable fallbacks.
- [ ] Images have intrinsic dimensions.
- [ ] The first mobile viewport is useful and not blank.
- [ ] Desktop does not request mobile-only first-viewport artwork.
- [ ] Mobile does not request desktop-only first-viewport artwork.
- [ ] Hidden responsive resource variants are not downloaded.
- [ ] The declared preload and fetch priority match the browser's measured LCP resource.

## Layout

- [ ] The interface-quality verifier covers every indexable route at 1440, 1024, 768, 390, and 320 CSS pixel widths in Chromium and WebKit.
- [ ] Visible controls do not overlap, clip, or leave the horizontal viewport.
- [ ] Important action groups meet their configured clearance from separators, status bands, media, and following structural regions.
- [ ] Header and hero regions meet the reviewed project and route proportions.
- [ ] Inline wrapped links are measured by rendered line fragments, and closed disclosure content is excluded from visible-control checks.
- [ ] No horizontal overflow at 390, 375, 360, and 320 CSS pixels.
- [ ] Fixed navigation clears the first heading.
- [ ] Same-page anchor targets clear fixed navigation.
- [ ] Images and logos preserve source aspect ratios.
- [ ] Cards, grids, and fixed-format controls have stable dimensions.
- [ ] Long text wraps without expanding the document width.
- [ ] Modals fit the visual viewport and scroll internally when needed.

## Safari Rendering

- [ ] No blanket transforms or hidden backfaces on text.
- [ ] No permanent broad `will-change` declarations.
- [ ] No viewport-sized live blur filters.
- [ ] No unused anti-flicker rule can hide content.
- [ ] Long pages scroll from top to bottom and back without stalls.
- [ ] No uncaught JavaScript page errors occur.

## Navigation and Interaction

- [ ] Mobile menu opens and closes.
- [ ] Direct top-level navigation links work with touch.
- [ ] Every dropdown opens with touch.
- [ ] At least one destination inside every dropdown navigates with touch.
- [ ] Dropdown cleanup does not hide the tapped link before default navigation.
- [ ] Escape and keyboard focus behavior work where applicable.
- [ ] Modals lock background scrolling only while open.
- [ ] Closing every modal restores page scrolling.
- [ ] Smooth scrolling respects reduced motion.
- [ ] Forms validate and submit on desktop and mobile.
- [ ] Every persistent side rail, table of contents, policy rail, and vertical tab list is marked with `data-side-navigation`.
- [ ] Every side-navigation item is a real link with a valid native destination when JavaScript is unavailable.
- [ ] Every side-navigation item is activated in browser tests, with its destination, active state, target visibility, keyboard behavior, and touch behavior verified.

## Automated Tests

- [ ] Astro diagnostics pass.
- [ ] Production build passes.
- [ ] The mandatory interface-quality and page-differentiation gate passes against the exact built candidate and its JSON report is preserved.
- [ ] The mandatory render sharpness gate passes against the exact built candidate and its JSON report is preserved.
- [ ] The side-navigation verifier passes against the exact built candidate and its JSON report is preserved.
- [ ] Every CSS illustration, diagram, generated page graphic, chart, hero artwork, and website email graphic in scope is marked for visual composition verification.
- [ ] The visual composition verifier passes in Chromium and WebKit at desktop, mobile, and 320 CSS pixel viewports.
- [ ] Marked labels remain inside their artboards, do not overlap each other, and are not crossed by decorative geometry.
- [ ] Reviewed horizontal and vertical fill thresholds reject accidental dead zones without forcing decorative density.
- [ ] Every generated artboard capture is reviewed at native size for reading order, balance, useful empty space, connector clarity, and professional craft.
- [ ] The visual composition JSON report, screenshots, reviewer, and decision are preserved with the exact candidate evidence.
- [ ] Every named first-choice font is shipped or replaced with an approved system stack.
- [ ] The production build does not download fonts from a live third-party provider.
- [ ] Framework and CMS integrations cannot silently add release-time font downloads.
- [ ] Build-only font packages do not invalidate runtime data fixtures.
- [ ] A disabled integration font does not leave a runtime font component that fails rendering.
- [ ] Inline logos and interface SVGs avoid accidental fractional view-box scaling.
- [ ] The normal production build generates `/sitemap.xml` and runs the sitemap verifier.
- [ ] Every indexable built canonical appears exactly once in the sitemap.
- [ ] Every sitemap URL maps to an indexable built page on the canonical origin.
- [ ] `robots.txt` advertises the exact canonical sitemap URL.
- [ ] Unit and server-side tests pass.
- [ ] Chromium desktop tests pass.
- [ ] Chromium mobile tests pass.
- [ ] Playwright WebKit tests pass using `tap()` for touch flows.
- [ ] Browser request traces cover every breakpoint where the first-viewport resource set changes.
- [ ] The LCP element, asset URL, request start, preload, and responsive source are asserted in browser tests.
- [ ] Route matrix has no missing pages or required assets.
- [ ] Static-output SEO validator passes for titles, descriptions, canonicals, Open Graph, JSON-LD, and headings.
- [ ] Site-health audit passes against final HTML, CSS, images, metadata, internal links, redirects, and `robots.txt`.
- [ ] Semantic SEO audit passes against canonicals, titles, page intent, content depth, and citations.
- [ ] Every indexable route is covered by a reviewed page-intent rule when complete coverage is required.
- [ ] Titles are descriptive, complete, within the reviewed editorial budget, and aligned with the visible `h1` and primary content.
- [ ] Citation-bearing content uses descriptive anchors and valid HTTP or HTTPS source URLs.
- [ ] Required citation evidence records include claim terms, source terms, reviewer, review date, and support limitations.
- [ ] The machine-readable semantic SEO report is preserved with release evidence.
- [ ] Every referenced local image is present and within the reviewed byte budget.
- [ ] Internal links point directly to built canonical routes without a redirect hop.
- [ ] Every indexable page has an incoming internal link, or a documented approved exception.
- [ ] Titles and descriptions are unique and within the configured length limits.
- [ ] The machine-readable site-health report is preserved with release evidence.
- [ ] Open Graph contact sheets include every indexable page and were reviewed at full size.
- [ ] The authoritative brand reference and renderer source are hash-bound in the social-card adoption gate.
- [ ] Representative social-card prototypes covered publication identity, a long headline, source artwork when applicable, and the designed fallback.
- [ ] Every prototype records an approved selection method, route-relevance rationale, source reference when applicable, rights review, third-party-mark review, and synthetic-artwork review.
- [ ] Publication-identity artwork was curated for that route and was not selected implicitly from the newest content item or first inventory record.
- [ ] A named reviewer approved the current prototypes in a real messaging or social client before bulk regeneration.
- [ ] The prototype approval matches the current visual-system, brand-reference, renderer, prototype-input, and prototype-output hashes.
- [ ] Open Graph cards have no overlapping or clipped text, jagged or upscaled artwork, unintended transparency, incorrect page content, or unsafe crop placement.
- [ ] Every social-card source image is visually informative, with flat placeholders and empty exports replaced by an approved designed fallback.
- [ ] No unapproved trademark, sponsor mark, watermark, product packaging, or generated text becomes the focal identity of a card.
- [ ] The normal build reused existing approved Open Graph cards without changing their bytes, names, encoding, or modification times.
- [ ] Any regenerated card was explicitly requested because a rendering input changed, and unchanged cards were not rewritten.
- [ ] Card input fingerprints exclude unrelated SEO policy, sitemap, citation, dependency, timestamp, environment, and build values.
- [ ] Displayed destinations contain no ellipsis or unusable truncation, supporting text remains readable, and letters with descenders are not clipped.
- [ ] Every card declares its intended sharing purpose and passes a named human readability assessment for that purpose.
- [ ] Every color and type family is brand approved, padding meets the brand safe-area minimum, and visual hierarchy preserves brand integrity.
- [ ] The authoritative brand guide and current brand kit were reviewed before selecting each logo, mark, wordmark, icon, seal, or branded illustration.
- [ ] Every brand asset matches its recorded SHA-256, named variant, allowed surface, intrinsic aspect ratio, minimum size, and clear-space requirement.
- [ ] Light, dark, colored, patterned, and photographic surfaces use the exact variants approved for those contexts. No mark was cropped from another lockup or recolored for convenience.
- [ ] Required contact information is visible, useful, accurate, and readable. Cards that do not require contact information explicitly record that decision.
- [ ] Font sizes remain within reviewed minimum and maximum limits, text regions do not overlap, and no glyph ink reaches a clipping boundary.
- [ ] The hash-bound Open Graph approval manifest matches both the rendering input hashes and exact image hashes in the candidate.
- [ ] Every indexable page has exactly one `h1`, and heading levels do not jump.
- [ ] Image output validator passes for alternative text, intrinsic dimensions, responsive `srcset`, `sizes`, and picture fallbacks.
- [ ] Localized sites have complete reciprocal hreflang clusters, localized self-canonicals, and `x-default`.
- [ ] Visual regression results are recorded, and they pass when the design mode is `required`.
- [ ] First-viewport and full-page screenshots for every route family were inspected at native size even when automated interface geometry passed.
- [ ] Form tests use mocked delivery except for one controlled staging submission.

## Native Simulator

- [ ] Full Xcode and an iOS runtime are installed.
- [ ] One target iPhone UDID is recorded.
- [ ] Unexpected booted devices are shut down.
- [ ] Simulator is opened with the target UDID.
- [ ] Local production output is tested in Safari.
- [ ] Staging is tested in Safari.
- [ ] Mobile menu dropdown destinations are tapped and confirmed.
- [ ] Long-page scrolling is inspected.
- [ ] Modal open and close behavior is inspected.
- [ ] Address bar and visible destination content confirm navigation.

## Performance, SEO, and Accessibility

- [ ] `CLOUDFLARE-OBSERVABILITY.md` was read for a Cloudflare-hosted project.
- [ ] Approved Cloudflare account analytics access was checked with a masked least-privilege request, or its unavailable state was recorded.
- [ ] An advisory production RUM baseline records the exact hostname, time window, sample minimum, thresholds, route and device groups, and LCP debug elements when access exists.
- [ ] Cloudflare RUM evidence is not substituted for PageSpeed, WebKit, or native Safari evidence.
- [ ] PageSpeed mobile Performance equals 100.
- [ ] PageSpeed mobile Accessibility equals 100.
- [ ] PageSpeed mobile Best Practices equals 100.
- [ ] PageSpeed mobile SEO equals 100.
- [ ] PageSpeed desktop Performance equals 100.
- [ ] PageSpeed desktop Accessibility equals 100.
- [ ] PageSpeed desktop Best Practices equals 100.
- [ ] PageSpeed desktop SEO equals 100.
- [ ] One PageSpeed provider preflight returned a scored result before the full route and strategy matrix began.
- [ ] API quota, authentication, billing, or provider failures were classified as external blockers rather than site-performance findings.
- [ ] Every valid PageSpeed result was preserved.
- [ ] The matrix stopped at the first valid category below 100 for diagnosis.
- [ ] A failed result records the exact candidate, URL, strategy, raw report, dominant audit, diagnosis evidence, and next bounded action.
- [ ] A Performance failure records filmstrip, network, LCP resource, request timing, preload, and responsive-source evidence.
- [ ] After any PageSpeed remediation, a new candidate ran the complete required mobile and desktop matrix.
- [ ] Any claimed PageSpeed HTML warmup uses the exact audited URL and sends an HTML `Accept` header plus `Sec-Fetch-Dest: document`.
- [ ] Any claimed PageSpeed HTML warmup verifies candidate identity, application markers, and final reusable cache state in a preserved machine-readable report.
- [ ] Warmup evidence remains separate from cold-document, first-request-after-deploy, bounded burst, WebKit, native Safari, and real-user evidence.
- [ ] No warmup result is used to retry, discard, or waive a genuine PageSpeed score below 100.
- [ ] Normal text and large text meet WCAG 2.2 AA contrast requirements in every changed surface state.
- [ ] Changed content and controls remain usable at 200 percent text resize.
- [ ] Ordinary page content reflows without two-dimensional scrolling at 320 CSS pixels.
- [ ] WCAG text spacing overrides do not clip, overlap, or hide content.
- [ ] Pointer target size and spacing pass, with important touch controls targeting 44 by 44 CSS pixels where practical.
- [ ] Reduced motion, increased contrast, and reduced transparency behavior pass where the platform exposes those preferences.
- [ ] Canonical metadata is correct per page.
- [ ] Open Graph previews use the correct per-page content and image.
- [ ] Every indexable public page declares its own unique Open Graph image. No shared fallback image across pages.
- [ ] Each declared Open Graph image returns HTTP 200, a raster content type, and the exact declared dimensions.
- [ ] Representative cards render correctly in a real messaging or social preview, including the application-provided title and description outside the image.
- [ ] Structured data parses and matches visible content.
- [ ] Every JSON-LD root has `@context` and `@type`, or a typed `@graph`.
- [ ] Answer-focused pages use complete natural-language question headings and immediate, self-contained answers.
- [ ] FAQ answers are present in built HTML and remain readable without JavaScript.
- [ ] FAQ or Q&A structured data is used only for eligible visible content and exactly matches that content.
- [ ] Technical, regulatory, legal, statistical, and time-sensitive claims cite current primary sources.
- [ ] A last-reviewed date and responsible reviewer are visible on maintained guidance.
- [ ] SEO content work records credible question evidence from sources available to the project, with Search Console or optional Ahrefs evidence only when approved access exists.
- [ ] Public discovery files include only intended public routes.
- [ ] The staged `/sitemap.xml` and every referenced child sitemap return HTTP 200 with XML content.
- [ ] Search Console property access and permission were checked when approved access exists.
- [ ] The canonical sitemap is submitted in Search Console, or the exact access or verification blocker is recorded.
- [ ] Private routes use appropriate metadata and response headers.
- [ ] Third-party scripts load only when needed.

## Deployment

- [ ] The recorded Go for Launch revision is still current with its configured upstream, or a reviewed pin is documented.
- [ ] The production candidate was built before staging and Simulator testing.
- [ ] The exact tested candidate is deployed to staging.
- [ ] Staging returns the candidate identifier expected by the release gate.
- [ ] Protected candidate hosts and public production hosts use separate Worker services when an outer cache can answer before middleware.
- [ ] Each isolated service has the intended bindings and secrets, public preview state, and scheduled-work state, with no duplicate cron or queue consumer.
- [ ] PageSpeed audited the expected staging candidate rather than an error, stale, or access-denied page.
- [ ] If the PageSpeed runner warms HTML, `scripts/verify-pagespeed-warmup.mjs` passes for every audited URL and its report is bound into release evidence.
- [ ] Protected staging proves application cache state, while any public edge-hit allowance also proves exact candidate, application marker, canonical URL, public indexing, and public cache policy.
- [ ] Every PageSpeed provider error remains preserved and blocked until a matching supplemental result fills only that external-error slot.
- [ ] No supplemental PageSpeed result replaces a scored result, and every completed matrix result has all four categories equal to 100.
- [ ] All eight required PageSpeed category checks equal 100.
- [ ] No production push occurs before the Simulator and PageSpeed gates pass.
- [ ] The production upload uses the framework-generated deployment manifest beside the verified artifact.
- [ ] A local provider dry run proves the complete executable module closure, generated module rules, assets, routes, bindings, compatibility settings, and scheduled triggers before any production request.
- [ ] The dry-run package contains every statically reachable relative module. An entry-only package fails when the entry imports generated chunks.
- [ ] Packaging does not rebuild or transform the frozen candidate.
- [ ] Production deployment completes successfully.
- [ ] Production begins with one canonical canary hostname while the apex and rollback hostname remain on the prior application.
- [ ] The canary is given the reviewed route propagation interval before application gates begin.
- [ ] Repeated probes from more than one network or region agree on the exact candidate identity, application marker, robots policy, and cache policy.
- [ ] Protected candidate probes alternate with public canary probes and never leak protected robots or cache policy to the public hostname.
- [ ] The complete route consistency sequence passes again after a second quiet interval.
- [ ] Any mixed application identity triggers automatic route removal, cache purge, rollback verification, evidence capture, and release stop.
- [ ] The canonical public hostname serves the new candidate.
- [ ] Live production SEO passes before PageSpeed, forms, crawler, or observability gates run.
- [ ] The production `/sitemap.xml`, child sitemaps, and robots declaration pass public HTTP checks.
- [ ] Public `robots.txt` returns HTTP 200 and advertises the exact canonical sitemap URL.
- [ ] A fresh approved external crawl was run after deployment, or the access blocker and required follow-up were recorded.
- [ ] Ahrefs API v3 Site Audit was checked when approved access exists, and the report records pass, fail, or an allowed skipped state.
- [ ] Apex and alternate-host redirects behave correctly.
- [ ] The apex is attached only after the canonical canary passes route consistency twice.
- [ ] A cached public application uses a dedicated minimal apex redirect service with no application data bindings or scheduled work.
- [ ] Apex GET and HEAD first hops pass for the root, a representative path, and a query-bearing path.
- [ ] The apex redirect preserves the exact path and query, sends a permanent status and `Cache-Control: no-store`, and never returns the canonical document body with status 200.
- [ ] Opposite trailing-slash forms return one HTTP 301 or 308 to the exact canonical URL.
- [ ] Redirect probes preserve paths and query strings unless an approved map intentionally changes the path.
- [ ] Localized canonical, hreflang, language selector, and sitemap behavior passes on public hosts.
- [ ] Live WebKit tests pass after propagation.
- [ ] Native iOS Safari navigation works on production.
- [ ] Cloudflare edge HTTP errors were queried immediately after production when approved zone analytics access exists.
- [ ] Cloudflare RUM was compared after sufficient production traffic, with the report distinguishing available, no-data, skipped, permission-error, and failed states.
- [ ] Any required Cloudflare threshold or baseline regression passes under the reviewed enforcement mode.
- [ ] Generated build output is cleaned without reverting source changes.
- [ ] Final evidence records versions, test counts, scores, and remaining risks.
- [ ] Final evidence contains a source record for every separately deployed application, form, scheduled, and redirect runtime.
- [ ] Final evidence records the render sharpness result, report path, native-resolution review, and intentional exceptions.
- [ ] Final evidence records sitemap counts and Search Console verification and submission status.
- [ ] Final evidence records the AEO query baseline, reviewed pages, sources, and measurement plan when answer-focused content changed.
- [ ] Final evidence records the design mode, framework, status, findings, and evidence paths.
- [ ] Final evidence records the interface-quality report, covered routes and viewports, route-family differentiation, clearance checks, header and hero measurements, and any reviewed target-size exceptions.
