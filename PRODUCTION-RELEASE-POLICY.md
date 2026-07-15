# Production Release Policy

## Policy

A migrated Astro site must not be deployed or pushed to production until the exact production candidate passes the required build, browser, native iOS Safari, staging, and PageSpeed gates in this document.

Passing `astro build` alone is not sufficient. Chromium mobile emulation alone is not sufficient. A PageSpeed run against a different build, a preview error page, or the previous production version is not sufficient.

## Required Sequence

```text
fetch the Go for Launch upstream and confirm the checked-out revision is current
install dependencies from the lockfile
run Astro diagnostics
run unit, server, form, and build-pipeline tests
build the production candidate
complete design and brand continuity review when visual work is in scope
verify rendered text, logos, and interface icons pass the render sharpness gate
verify the generated sitemap covers every indexable built page
verify metadata, JSON-LD, headings, Open Graph files, and image output
run the site-health audit against final HTML, CSS, images, internal links, redirects, metadata, and robots.txt
run the semantic SEO audit against canonicals, titles, page intent, content depth, and citations
verify approved Open Graph cards were reused without writes, inspect complete contact sheets for changed cards, and approve exact rendering input and image hashes
verify localized canonicals and reciprocal hreflang when the site is multilingual
run desktop and mobile browser tests
run Playwright WebKit with an iPhone profile
test the built candidate in native iOS Safari through Xcode Simulator
deploy the exact candidate to staging
verify staging serves the expected candidate
run Ahrefs Site Audit when approved API v3 or crawler access exists
run PageSpeed Insights on staging for mobile and desktop
require four scores of 100 in both strategies
deploy the same candidate to production
verify the canonical hostname
verify the public sitemap and robots declaration
verify trailing-slash, alternate-origin, and legacy redirects
repeat live WebKit and native iOS Safari smoke tests
```

Do not rebuild between the successful staging audit and production promotion unless the new output repeats the complete gate.

## Toolkit Version Requirement

Before creating a production candidate, fetch the configured Go for Launch upstream branch and compare it with the checked-out revision. Use the newest compatible upstream revision and record the repository URL, branch, and commit in the release evidence.

A missing upstream, failed fetch or comparison, or checked-out revision behind upstream blocks production. A project may use a reviewed pinned toolkit revision only when the reason, reviewer, and expiration or upgrade condition are documented in the release record. Automation memory and copied checklists do not replace the current upstream files.

## Sitemap Requirement

The normal production build command must generate and validate the XML sitemap. A separate optional SEO command is not sufficient because it can be skipped while the build appears successful.

The sitemap validator must compare the final built HTML with the generated XML and fail the build when:

- The conventional `/sitemap.xml` file is missing or invalid.
- A referenced child sitemap is missing.
- An indexable built page has no canonical URL.
- An indexable canonical URL is absent from the sitemap.
- A sitemap URL has no corresponding indexable built page.
- A URL is duplicated or uses the wrong origin.
- `robots.txt` omits the exact canonical sitemap URL.

Use [SITEMAPS-AND-SEARCH-CONSOLE.md](SITEMAPS-AND-SEARCH-CONSOLE.md) and the reusable [`scripts/verify-sitemap.mjs`](scripts/verify-sitemap.mjs) validator. After staging and production deployment, verify `/sitemap.xml`, every referenced child sitemap, and `/robots.txt` over public HTTP.

When approved Google Search Console access exists, list the accessible properties and record the permission level. Ownership verification must be complete before sitemap submission. Then list submitted sitemaps and submit the exact canonical `/sitemap.xml` URL when it is missing and write permission is available. Missing access, an unverified property, or a rejected submission must be recorded as a blocker or manual handoff, not a silent pass.

## Site Health Audit Requirement

Run [SITE-HEALTH-AUDIT.md](SITE-HEALTH-AUDIT.md) against the exact final output before staging. The normal production build or an unskippable release command must invoke [`scripts/verify-site-health.mjs`](scripts/verify-site-health.mjs) with the project's reviewed configuration.

The audit must inspect image references in final HTML and CSS, not only files under a source asset directory. It must fail on oversized referenced local images, missing built image assets, metadata outside configured limits, duplicate metadata, internal links that require redirects, links to missing pages, orphaned indexable pages, or an invalid built `robots.txt` declaration. Preserve its JSON report with release evidence.

Keep original migration assets immutable. Optimization must produce derived assets or final build output without changing visible geometry. Rebuild and repeat screenshot, render-sharpness, Open Graph, and site-health checks after any asset transformation.

After staging and production deployment, request `robots.txt`, the canonical sitemap, and representative image assets over public HTTPS. A local artifact cannot prove that routing, Cloudflare configuration, or cache state serves those files correctly. When approved Ahrefs or equivalent crawler access exists, run a fresh crawl and record its date and candidate identifier. Do not treat a stale crawler email as proof of the current deployment.

## Semantic SEO and Citation Requirement

Run [SEMANTIC-SEO-AND-CITATION-REVIEW.md](SEMANTIC-SEO-AND-CITATION-REVIEW.md) against the exact final output before staging. The normal production build or an unskippable release command must invoke [`scripts/verify-semantic-seo.mjs`](scripts/verify-semantic-seo.mjs) with reviewed project rules.

Every indexable route must use the configured canonical production origin and match its built route. Titles must be descriptive, concise within the project's reviewed editorial budget, free of mechanical truncation and keyword repetition, and aligned with the visible `h1` and primary content. Each route family must have a reviewed search intent and content-depth rule. A new indexable route without an intent rule blocks production when the project requires complete coverage.

Content types that make technical, regulatory, legal, statistical, medical, financial, or time-sensitive claims must use descriptive citation links and reviewed evidence records. The record must identify the exact route and URL, expected nearby claim terms, expected source terms, reviewer, review date, and support limitation. Invalid URLs, failed required source checks, missing records, stale records, claim drift, or source drift block production.

Lexical overlap is not proof of factual support. Treat low topical overlap as a review signal and require human review for high-stakes claims. Preserve the machine-readable semantic SEO report and citation records with the candidate evidence.

When approved Ahrefs access exists, run [`scripts/verify-ahrefs-site-audit.mjs`](scripts/verify-ahrefs-site-audit.mjs) against the current Site Audit project after staging. Use Ahrefs API v3 or a saved current response, never the retired API v2. A configured active issue at a blocking importance level fails the release. When Ahrefs is optional and unavailable, preserve a visible skipped report and continue with the mandatory local gates. When project policy requires Ahrefs, missing access blocks production.

## Answer-Focused Content Requirement

When a release adds or materially changes FAQ, AEO, or other answer-focused content, follow [ANSWER-ENGINE-OPTIMIZATION.md](ANSWER-ENGINE-OPTIMIZATION.md). The release evidence must identify the query source, page topic, primary sources, reviewer, last-reviewed date, and measurement baseline.

The built candidate must prove that question headings and complete answers are present in the initial HTML. Any FAQ structured data must parse, describe only visible content, and match the visible wording exactly. Unsupported claims, hidden answers, fabricated questions, ineligible `QAPage` markup, or schema that drifts from the page block production.

Do not promise or require a particular ranking, rich result, AI citation, or answer-engine appearance. Those outcomes are not controlled by the site. The release gate evaluates content quality, technical eligibility, and measurement readiness.

## Core Interface Safety and Configurable Design Review

Accessibility, legibility, semantic interaction, responsive reflow, complete navigation, browser behavior, and native Safari reliability are mandatory for every release. Failures in contrast, focus, keyboard operation, text resize, 320 CSS pixel reflow, text spacing, target size, reduced motion, overlap, clipping, overflow, or essential interaction block production in every design mode.

Framework-specific design conformance follows [Configurable Design-System Gate](DESIGN-GATE-POLICY.md). Each project chooses `off`, `advisory`, or `required` and selects Material Design, Apple Liquid Glass guidance, a custom design system, or a documented hybrid. The design configuration cannot disable or weaken any other release gate.

Run the design gate for every release and preserve its machine-readable result. An `off` result records `skipped`. Advisory findings remain visible but do not block production. Missing, invalid, or failed design evidence blocks production only in `required` mode.

When applicable design review is advisory or required, follow [DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md) and complete the [design optimization brief and acceptance record](templates/design-optimization-brief.md). Review the configured route and viewport scope, interaction states, brand continuity, and selected framework. Require human approval when `reviewerRequired` is true.

Do not claim Material Design, Apple design, Liquid Glass, custom-system, or hybrid conformance unless the applicable review passes.

## Side Navigation Requirement

Every persistent side rail, table of contents, policy rail, vertical tab list, and in-page navigation group is release-critical navigation. Mark each region with `data-side-navigation` and each destination with `data-side-navigation-item` so the exact production build can be audited consistently.

Every marked item must be a real anchor with an accessible name and a valid built route or same-page target. JavaScript may enhance scrolling, active states, panels, or transitions, but the destination must still work when client JavaScript is delayed or unavailable.

Run [`scripts/verify-side-navigation.mjs`](scripts/verify-side-navigation.mjs) against the exact built candidate. The verifier must be part of the normal production build or its unskippable release verification command. Preserve its machine-readable report with the release evidence.

Browser coverage must activate every item in every side-navigation region, not one representative item. Verify the destination, selected or active state, target visibility below fixed navigation, keyboard operation, touch operation, and horizontal overflow. Run the checks in desktop Chromium, mobile Chromium, Playwright WebKit, staging, and the canonical production hostname. Repeat representative interaction in native iOS Safari.

A JavaScript-only item, empty destination, missing built route, missing hash target, missing controlled panel, incorrect active state, hidden target, or untested item blocks production.

## Render Sharpness Requirement

Run [RENDER-SHARPNESS.md](RENDER-SHARPNESS.md) against the exact built candidate before staging. Preserve its machine-readable report with release evidence. A missing or failed report blocks production in every design mode.

The check must reject accidental direct blur on content, forced font smoothing, forced text-rendering modes, persistent fractional transforms, permanent compositor hints, unshipped first-choice fonts, and accidental fractional inline SVG scaling. Intentional decorative blur belongs on a separate pseudo-element or must be explicitly documented.

Use auto-fix only against source. Inspect the change, rebuild the candidate, and repeat the complete affected gate. Never repair generated output and promote it as if source had passed.

## SEO Metadata and Localization Requirement

Use [SEO-HEAD-AND-VALIDATION.md](SEO-HEAD-AND-VALIDATION.md) for the reusable Astro head component and static-output validator. Every indexable page must have one self-canonical URL, one page-specific title and description, one unique 1200 by 630 Open Graph image, valid JSON-LD when present, one `h1`, and a heading hierarchy without skipped levels.

Use [ASTRO-ASSETS.md](ASTRO-ASSETS.md) for responsive image implementation and final-output tests. Informative images require useful alternative text. Every rendered raster image requires positive intrinsic dimensions. Astro constrained and full-width images require the expected responsive output.

For multilingual sites, follow [INTERNATIONALIZATION-AND-HREFLANG.md](INTERNATIONALIZATION-AND-HREFLANG.md). Each localized page must canonicalize to itself and publish a complete reciprocal hreflang cluster with a matching self language and `x-default`. Every declared alternate must resolve to an indexable built page and appear in the localized sitemap.

Generate social images through [OPEN-GRAPH-GENERATION.md](OPEN-GRAPH-GENERATION.md), or an equivalent deterministic process with the same output checks. Generate complete contact sheets, inspect every image at full size, and record hash-bound approval for the exact files. Missing, shared, stale, unreadable, incorrectly sized, overlapping, clipped, visibly jagged, incorrectly cropped, or unapproved images block release.

Normal builds must not generate, rewrite, recompress, rename, or optimize an existing approved social card. They must verify the existing rendering input fingerprint, file hash, and approval record without changing the file or its modification time. New or changed cards require an explicit regeneration command followed by full-size visual review and a new approval bound to both the rendering input hash and final image hash. Unrelated SEO, sitemap, citation, dependency, timestamp, environment, and build changes must not invalidate cards.

A displayed destination that is clipped, ellipsized, too small to read, or too truncated to identify the canonical host blocks production. Clipped glyphs, missing descenders, blurry supporting labels, jagged or stretched artwork, and visual symbols that can be mistaken for status or validation controls also block production.

Each card must declare its intended sharing purpose and a reviewed brand contract. The contract must define approved colors and type families, safe padding, minimum supporting-text size, maximum headline size, and whether visible contact information is required. Automated bounds checks and a named human reviewer must confirm that text is readable, does not overlap, is not clipped, is neither too large nor too small, and preserves brand hierarchy and integrity for the intended purpose.

## Native iOS Safari Requirement

### Environment

Use:

- Full Xcode, not only Command Line Tools.
- An installed iOS Simulator runtime.
- A supported iPhone Simulator.
- An explicitly recorded Simulator UDID.
- Native Safari inside that Simulator.

Pin commands to one device:

```bash
UDID="YOUR-SIMULATOR-UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$UDID"
xcrun simctl openurl "$UDID" "https://staging.example.com/"
```

Do not use `booted` when multiple Simulator devices may be active.

### Required Simulator Checks

Test at least:

- Initial page paint is visible without a multi-second blank screen.
- Header and mobile navigation render correctly.
- The mobile menu opens and closes.
- Every dropdown opens with touch.
- At least one destination inside every dropdown completes navigation.
- Direct top-level links complete navigation.
- Same-page links clear the fixed header.
- Long pages scroll from top to bottom and back.
- No page remains locked after closing a menu or modal.
- Every modal opens, scrolls internally when needed, and closes.
- Forms can be completed with the mobile keyboard.
- Validation and anti-spam controls render correctly.
- Images and logos preserve their aspect ratios.
- No content overlaps at mobile widths.
- No horizontal scrolling exists at the intended minimum width.
- Reduced-motion behavior remains usable.
- The address bar and visible destination content confirm the expected host and route.

Record the Xcode version, iOS runtime, device model, UDID placeholder or internal record, tested hostname, routes, and result.

## Playwright WebKit Requirement

Run WebKit tests against the built candidate using an iPhone device profile. Use touch input for mobile interactions:

```ts
await Promise.all([
  page.waitForURL((url) => url.pathname === expectedPath),
  link.tap()
]);
```

The WebKit suite must cover:

- Representative pages from every route family.
- Mobile navigation and dropdown destinations.
- Modal scroll locking and restoration.
- Form behavior.
- Horizontal overflow.
- Long-page scroll responsiveness.
- JavaScript page errors.
- Fixed-header clearance.
- Image rendering and aspect ratios.

All required WebKit tests must pass before production.

## PageSpeed Requirement

Run PageSpeed Insights against the staged production candidate with both strategies:

- Mobile.
- Desktop.

Require all four Lighthouse category scores to equal 100:

| Strategy | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| Mobile | 100 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

Any score below 100 blocks production deployment.

### Confirm the audited document

Before accepting scores, verify:

- Final audited URL.
- HTTP status.
- Page title.
- Canonical URL.
- Expected candidate or build identifier.
- Expected page content.
- Lighthouse runtime warnings.

Do not accept a score produced from a Cloudflare error page, redirect placeholder, stale deployment, access-denied response, or unrelated preview document.

### API and credential handling

Keep API credentials, including PageSpeed keys, Ahrefs keys, and Cloudflare deploy tokens, in a secret manager. Retrieve them only into process-local variables. Never print them, commit them, include them in URLs stored in logs, or place them in public client code.

PageSpeed Insights has a free anonymous tier with low rate limits. Use it for occasional manual checks. Use an API key for automated or repeated runs so the gate does not fail on quota errors.

When 1Password is the secret manager and the 1Password CLI (`op`) is available, retrieve credentials the way described in [AUTOMATION-INTEGRATION.md](AUTOMATION-INTEGRATION.md).

Retry documented transient API failures only. A genuine category score below 100 is a failed release gate, not a reason to bypass the gate.

## Candidate Identity

The staging response should expose or otherwise permit verification of a candidate identifier generated during the build. The release process must confirm that staging serves the expected candidate before PageSpeed runs.

Production must receive the same candidate. If source, dependencies, generated assets, configuration, or build output changes, repeat the complete gate.

## Production Verification

After deployment:

1. Verify the canonical hostname returns the expected status and candidate.
2. Verify the canonical sitemap, all referenced child sitemaps, and the robots declaration.
3. Verify redirects and representative routes.
4. Run the live verifier from [REDIRECT-VERIFICATION.md](REDIRECT-VERIFICATION.md) against the trailing-slash policy, every alternate origin, and approved legacy probes.
5. Run the complete live Playwright WebKit suite.
6. Open the canonical hostname in native iOS Safari Simulator.
7. Repeat mobile-menu, dropdown navigation, form or modal, and scrolling smoke tests.
8. Confirm no horizontal overflow or blank first paint.
9. Record production deployment and verification evidence.

Production verification does not replace pre-production testing. It confirms routing, propagation, caching, and hostname behavior after promotion.

## Stop Conditions

Stop the production release when:

- Astro diagnostics fail.
- The production build fails.
- The production build does not generate and validate a complete sitemap.
- The sitemap and indexable built canonicals do not match exactly.
- `robots.txt` does not advertise the canonical sitemap URL.
- Required unit, server, form, or build-pipeline tests fail.
- Chromium or WebKit behavior tests fail.
- Native iOS Safari testing is unavailable or fails.
- Required routes, content, images, or metadata are missing.
- The configured design mode is `required` and applicable design evidence, brand continuity review, or visual acceptance is missing or fails.
- The configured design mode is `required` and a visual change erases recognizable brand anchors without explicit rebrand approval.
- Mandatory interaction states, responsive reflow, resize, text spacing, or preference checks fail in any mode.
- The machine-readable render sharpness report is missing or failed, or native-resolution browser review still shows accidental fuzzy text or logos.
- The configured design mode is `required` and hierarchy, density, responsive anatomy, or applicable visual review fails.
- The configured design mode is `required` and a global bar is unclassified, misrepresents evergreen copy as an alert, or lacks required ownership and review information.
- The configured design policy requires a reviewer and a global logo, navigation, alert, announcement, utility-bar, or sticky-header change lacks human approval of the exact rendered candidate.
- Static-output metadata, JSON-LD, heading, image, or localization validation fails.
- The machine-readable site-health report is missing or reports oversized referenced images, metadata defects, redirecting internal links, missing targets, orphaned canonical pages, or invalid crawler declarations.
- The machine-readable semantic SEO report is missing or reports canonical drift, title-content mismatch, uncovered page intent, unreviewed thin content, invalid citations, or citation evidence drift.
- Ahrefs access is required but unavailable, or the current Ahrefs Site Audit reports an active issue at a configured blocking importance.
- Trailing-slash, alternate-origin, or legacy redirect verification fails.
- Horizontal overflow remains.
- Forms or anti-spam verification fail.
- Staging does not serve the expected candidate.
- Any PageSpeed category is below 100 on mobile or desktop.
- PageSpeed audited the wrong document.
- The candidate changed after testing.

Do not waive a stop condition silently. Record the failure, fix it, rebuild, and repeat the gate.

## Release Record

Use [templates/migration-acceptance-record.md](templates/migration-acceptance-record.md) to preserve:

- Candidate identifier.
- Source revision.
- Build result.
- Render sharpness status, report path, reviewed viewports, and intentional exceptions.
- Sitemap URL, indexable page count, sitemap URL count, and validation result.
- Site-health report path, thresholds, page count, image-reference count, and result.
- Search Console property, permission, verification, and sitemap submission status when access exists.
- Automated test results.
- Simulator environment and results.
- Mobile and desktop PageSpeed scores.
- Staging verification.
- Production deployment identifier.
- Canonical-host verification.
- Remaining risks.

Attach the machine-readable design gate result. When design review is applicable, also attach or link the completed [design optimization brief and acceptance record](templates/design-optimization-brief.md).
