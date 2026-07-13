# Astro Mobile Safari Testing and Release Checklist

This checklist is mandatory before production. Any unchecked required item blocks release. PageSpeed must report 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.

## Baseline

- [ ] Read applicable repository instructions.
- [ ] Record the existing working tree and preserve unrelated changes.
- [ ] Confirm the real Astro application root.
- [ ] Inventory every public and intentionally private route.
- [ ] Capture legacy desktop, tablet, and mobile references.
- [ ] Record the canonical hostname, staging target, and deployment contract.

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
- [ ] Page purpose and the primary action are clear at every required viewport.
- [ ] Hero scale supports the page purpose and does not delay useful content.
- [ ] Heading measure, content density, section rhythm, grid transitions, and card anatomy pass visual review.
- [ ] The site remains recognizable without relying only on the logo.
- [ ] Glass, translucency, blur, elevation, and motion support hierarchy and remain legible.
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

## Layout

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

## Automated Tests

- [ ] Astro diagnostics pass.
- [ ] Production build passes.
- [ ] The normal production build generates `/sitemap.xml` and runs the sitemap verifier.
- [ ] Every indexable built canonical appears exactly once in the sitemap.
- [ ] Every sitemap URL maps to an indexable built page on the canonical origin.
- [ ] `robots.txt` advertises the exact canonical sitemap URL.
- [ ] Unit and server-side tests pass.
- [ ] Chromium desktop tests pass.
- [ ] Chromium mobile tests pass.
- [ ] Playwright WebKit tests pass using `tap()` for touch flows.
- [ ] Route matrix has no missing pages or required assets.
- [ ] Static-output SEO validator passes for titles, descriptions, canonicals, Open Graph, JSON-LD, and headings.
- [ ] Every indexable page has exactly one `h1`, and heading levels do not jump.
- [ ] Image output validator passes for alternative text, intrinsic dimensions, responsive `srcset`, `sizes`, and picture fallbacks.
- [ ] Localized sites have complete reciprocal hreflang clusters, localized self-canonicals, and `x-default`.
- [ ] Visual regression results are recorded, and they pass when the design mode is `required`.
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

- [ ] PageSpeed mobile Performance equals 100.
- [ ] PageSpeed mobile Accessibility equals 100.
- [ ] PageSpeed mobile Best Practices equals 100.
- [ ] PageSpeed mobile SEO equals 100.
- [ ] PageSpeed desktop Performance equals 100.
- [ ] PageSpeed desktop Accessibility equals 100.
- [ ] PageSpeed desktop Best Practices equals 100.
- [ ] PageSpeed desktop SEO equals 100.
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
- [ ] Structured data parses and matches visible content.
- [ ] Every JSON-LD root has `@context` and `@type`, or a typed `@graph`.
- [ ] Answer-focused pages use complete natural-language question headings and immediate, self-contained answers.
- [ ] FAQ answers are present in built HTML and remain readable without JavaScript.
- [ ] FAQ or Q&A structured data is used only for eligible visible content and exactly matches that content.
- [ ] Technical, regulatory, legal, statistical, and time-sensitive claims cite current primary sources.
- [ ] A last-reviewed date and responsible reviewer are visible on maintained guidance.
- [ ] SEO content work records its Search Console, Ahrefs, support, sales, or analytics question evidence.
- [ ] Public discovery files include only intended public routes.
- [ ] The staged `/sitemap.xml` and every referenced child sitemap return HTTP 200 with XML content.
- [ ] Search Console property access and permission were checked when approved access exists.
- [ ] The canonical sitemap is submitted in Search Console, or the exact access or verification blocker is recorded.
- [ ] Private routes use appropriate metadata and response headers.
- [ ] Third-party scripts load only when needed.

## Deployment

- [ ] The production candidate was built before staging and Simulator testing.
- [ ] The exact tested candidate is deployed to staging.
- [ ] Staging returns the candidate identifier expected by the release gate.
- [ ] PageSpeed audited the expected staging candidate rather than an error, stale, or access-denied page.
- [ ] All eight required PageSpeed category checks equal 100.
- [ ] No production push occurs before the Simulator and PageSpeed gates pass.
- [ ] Production deployment completes successfully.
- [ ] The canonical public hostname serves the new candidate.
- [ ] The production `/sitemap.xml`, child sitemaps, and robots declaration pass public HTTP checks.
- [ ] Apex and alternate-host redirects behave correctly.
- [ ] Opposite trailing-slash forms return one HTTP 301 or 308 to the exact canonical URL.
- [ ] Redirect probes preserve paths and query strings unless an approved map intentionally changes the path.
- [ ] Localized canonical, hreflang, language selector, and sitemap behavior passes on public hosts.
- [ ] Live WebKit tests pass after propagation.
- [ ] Native iOS Safari navigation works on production.
- [ ] Generated build output is cleaned without reverting source changes.
- [ ] Final evidence records versions, test counts, scores, and remaining risks.
- [ ] Final evidence records sitemap counts and Search Console verification and submission status.
- [ ] Final evidence records the AEO query baseline, reviewed pages, sources, and measurement plan when answer-focused content changed.
- [ ] Final evidence records the design mode, framework, status, findings, and evidence paths.
