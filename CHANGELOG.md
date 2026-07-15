# Changelog

This file records reusable improvements to Go for Launch so maintainers can understand what changed, why it changed, how projects are affected, and which tests prove the behavior.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Native Safari Menu Follow-up

- Updated the Go4Launch case study with the final full-viewport header grid fix.
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
