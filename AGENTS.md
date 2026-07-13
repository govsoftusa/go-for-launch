# Go for Launch Instructions

- Follow applicable local workspace and repository instructions when using this toolbox inside another project.
- Keep this repository focused on reusable platform-to-Astro migration, Astro version and dependency maintenance for existing sites, iOS Safari, WebKit, performance, accessibility, SEO, and deployment guidance.
- Separate general guidance from site-specific case studies.
- Record symptoms, root causes, fixes, failed experiments, tests, and acceptance evidence.
- Never include credentials, secret values, private environment contents, or token-bearing URLs.
- Use current compatible framework and testing versions when commands are executed. Treat versions recorded in case studies as historical evidence.
- Do not present one PageSpeed run, one screenshot, or Chromium mobile emulation as sufficient Safari evidence.
- Use Markdown for documentation and keep commands safe to adapt by using placeholders for site-specific identifiers.
- Keep general guidance at the repository root and site-specific evidence under `case-studies/`.
- Add reusable worksheets under `templates/`.

## Core Interface Gate and Project-Controlled Design Gate

- Treat accessibility, legibility, semantic interaction, responsive reflow, browser behavior, Playwright WebKit, and native iOS Safari as mandatory release requirements for every project.
- Read `DESIGN-GATE-POLICY.md` before adding or changing a design-system requirement.
- Design-system conformance is project controlled through `design-gate.config.mjs` with `off`, `advisory`, or `required` modes. The default is `off`.
- Run the design gate for every release and preserve its machine-readable result, including when project policy disables the review.
- Read `DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md` and complete `templates/design-optimization-brief.md` when the design mode is `advisory` or `required` and the configured scope applies.
- Block production on design-system findings only when the configured mode is `required`.
- Never allow the design mode to disable or weaken SEO, AEO, sitemap, accessibility, mobile, web, performance, browser, forms, staging, or production verification.
- Do not claim Material Design, Apple design, Liquid Glass, custom-system, or hybrid conformance without a passing applicable design review.

## Mandatory Production Gate

- Build the production candidate before production deployment.
- Generate and validate the complete XML sitemap as part of the normal build command. A build without a passing sitemap check is a failed build.
- Compare every indexable built page canonical with the sitemap and verify the exact sitemap URL in `robots.txt`.
- Test the built candidate in Playwright WebKit using an iPhone device profile.
- Test the built candidate in native iOS Safari using an explicitly selected Xcode Simulator device and UDID.
- Verify mobile navigation, dropdown destinations, forms, modals, scrolling, first paint, fixed-header spacing, image rendering, and horizontal overflow in the Simulator.
- When Open Graph, SEO, or AI discovery work is in scope, verify every indexable public page declares its own unique Open Graph image and that each declared image resolves with the exact declared dimensions.
- Deploy the exact built candidate to staging before production.
- Run PageSpeed Insights against the staged candidate for both mobile and desktop.
- Require a score of 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.
- Do not deploy or push the candidate to production when any required iOS Simulator check fails or any PageSpeed category is below 100.
- After production deployment, repeat the live WebKit suite and a native iOS Safari smoke test against the canonical hostname.
