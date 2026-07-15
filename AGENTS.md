# Go for Launch Instructions

- Follow applicable local workspace and repository instructions when using this toolbox inside another project.
- Keep this repository focused on reusable platform-to-Astro migration, Astro version and dependency maintenance for existing sites, iOS Safari, WebKit, performance, accessibility, SEO, and deployment guidance.
- Separate general guidance from site-specific case studies.
- Record symptoms, root causes, fixes, failed experiments, tests, and acceptance evidence.
- Never include credentials, secret values, private environment contents, or token-bearing URLs.
- Use current compatible framework and testing versions when commands are executed. Treat versions recorded in case studies as historical evidence.
- Before creating a production candidate, fetch the toolkit's configured upstream branch and compare it with the checked-out revision. Use the newest compatible upstream revision and record its commit in the release evidence. A missing upstream, failed comparison, or checked-out revision behind upstream blocks production unless an explicit reviewed pin is documented.
- Do not present one PageSpeed run, one screenshot, or Chromium mobile emulation as sufficient Safari evidence.
- Use Markdown for documentation and keep commands safe to adapt by using placeholders for site-specific identifiers.
- Keep general guidance at the repository root and site-specific evidence under `case-studies/`.
- Add reusable worksheets under `templates/`.

## Core Interface Gate and Project-Controlled Design Gate

- Treat accessibility, legibility, semantic interaction, responsive reflow, browser behavior, Playwright WebKit, and native iOS Safari as mandatory release requirements for every project.
- Run the mandatory render sharpness gate against every exact production build. Direct blur on content layers, forced font rasterization, accidental fractional transforms, unshipped first-choice fonts, and fractional inline SVG scaling block production.
- Treat every visible side rail, table of contents, policy rail, vertical tab list, and in-page navigation group as release-critical navigation. Every item must use a real link with a valid destination, retain a native no-JavaScript fallback, and pass click, keyboard, touch, active-state, and target-visibility checks.
- Run `scripts/verify-side-navigation.mjs` against every exact production build when the site contains side navigation. A missing destination, missing hash target, JavaScript-only item, or unmarked required side-navigation region blocks production.
- Read `VISUAL-COMPOSITION-TESTING.md` for every CSS illustration, diagram, generated page graphic, chart, hero artwork, or website email graphic. Mark its artboard, label regions, and decorative geometry, then run `scripts/verify-visual-composition.mjs` against the exact build in Chromium and WebKit. Label collisions, decorative geometry crossing text, unsafe bounds, or failed reviewed fill thresholds block production in every design mode.
- Use `scripts/verify-render-sharpness.mjs` for the read-only build gate. Use its explicit `--fix` mode only on source, then rebuild and repeat every affected check.
- Read `DESIGN-GATE-POLICY.md` before adding or changing a design-system requirement.
- Design-system conformance is project controlled through `design-gate.config.mjs` with `off`, `advisory`, or `required` modes. The default is `off`.
- Run the design gate for every release and preserve its machine-readable result, including when project policy disables the review.
- Read `DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md` and complete `templates/design-optimization-brief.md` when the design mode is `advisory` or `required` and the configured scope applies.
- Block production on design-system findings only when the configured mode is `required`.
- Never allow the design mode to disable or weaken SEO, AEO, sitemap, accessibility, mobile, web, performance, browser, forms, staging, or production verification.
- Do not claim Material Design, Apple design, Liquid Glass, custom-system, or hybrid conformance without a passing applicable design review.

## Mandatory Production Gate

- Confirm the checked-out Go for Launch revision is current with its configured upstream before building the candidate.
- Build the production candidate before production deployment.
- Generate and validate the complete XML sitemap as part of the normal build command. A build without a passing sitemap check is a failed build.
- Generate a passing machine-readable render sharpness report from the exact production build.
- Generate a passing machine-readable visual composition report and reviewed screenshots for every marked visual artboard in the exact production build.
- Compare every indexable built page canonical with the sitemap and verify the exact sitemap URL in `robots.txt`.
- Run `scripts/verify-site-health.mjs` against the exact production build. Block release on oversized referenced images, missing built image assets, metadata outside configured limits, duplicate metadata, redirecting internal links, links to missing pages, orphaned indexable pages, or invalid crawler declarations.
- Run `scripts/verify-semantic-seo.mjs` against the exact production build with reviewed project rules. Block release on canonical-origin drift, incomplete or misaligned titles, missing route intent, unreviewed thin content, invalid citation URLs, missing required citation evidence, or detected claim and source drift.
- Treat citation topical overlap as a review signal rather than proof that a source supports a claim. High-stakes claims require a named reviewer, review date, expected claim terms, expected source terms, and a short limitation note.
- Run `scripts/verify-ahrefs-site-audit.mjs` after staging when approved Ahrefs API v3 access exists. Missing optional access must produce a visible skipped report. Missing required access or configured active Ahrefs errors and warnings block production.
- Preserve the machine-readable site-health report with the release evidence. Re-run it after any image optimization, HTML transformation, CSS transformation, redirect change, or metadata change.
- Test the built candidate in Playwright WebKit using an iPhone device profile.
- Test the built candidate in native iOS Safari using an explicitly selected Xcode Simulator device and UDID.
- Verify mobile navigation, dropdown destinations, forms, modals, scrolling, first paint, fixed-header spacing, image rendering, and horizontal overflow in the Simulator.
- Verify every side-navigation item in Playwright and repeat representative side-navigation interaction in native iOS Safari. Testing only the first item is not sufficient.
- When Open Graph, SEO, or AI discovery work is in scope, verify every indexable public page declares its own unique Open Graph image and that each declared image resolves with the exact declared dimensions.
- Treat approved Open Graph files as immutable release artifacts. Normal builds must verify and reuse them without rewriting bytes, filenames, encoding, or modification times. Only an explicit reviewed regeneration command may create or replace a card.
- Fingerprint only card-rendering inputs. Unrelated SEO policy, sitemap, citation, dependency, timestamp, environment, and build changes must not regenerate or invalidate a card.
- Require a state manifest containing the rendering input hash and output hash. A missing card, changed input, altered file, or stale manifest must fail closed instead of silently generating output.
- Generate contact sheets for every Open Graph image, inspect them for overlap, clipping, jagged artwork, incorrect content, and unsafe cropping, then record hash-bound approval for the exact reviewed files. Missing or stale visual approval blocks release.
- Reject clipped glyphs, missing descenders, blurry small text, truncated display URLs, upscaled raster artwork, accidental status symbols, incorrect aspect ratios, and supporting text below the project's readable minimum. Bind approval to both the rendering input hash and final file hash.
- Require every card to declare its intended sharing purpose and brand contract. The contract must cover approved colors, approved type families, safe padding, minimum supporting-text size, maximum headline size, and whether visible contact information is required.
- Require automated bounds checks plus named human approval for readability, hierarchy, contact accuracy when applicable, and brand integrity. Text that overlaps, clips, exceeds its region, or is too large or too small blocks release.
- Before using any brand asset, locate and review the authoritative brand guide and current brand kit. Do not substitute a convenient export, crop a mark from a lockup, or infer a light or dark variant.
- Record the brand guide hash, asset hash, named variant, allowed surfaces, rendered dimensions, and clear space in `brand-assets.config.mjs`, then run `scripts/verify-brand-assets.mjs`. Wrong surface variants, changed hashes, distortion, undersizing, or insufficient clear space block release.
- Deploy the exact built candidate to staging before production.
- Run PageSpeed Insights against the staged candidate for both mobile and desktop.
- Require a score of 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.
- Do not deploy or push the candidate to production when any required iOS Simulator check fails or any PageSpeed category is below 100.
- After production deployment, repeat the live WebKit suite and a native iOS Safari smoke test against the canonical hostname.
