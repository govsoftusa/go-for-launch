# Astro Mobile Safari Testing and Release Checklist

This checklist is mandatory before production. Any unchecked required item blocks release. PageSpeed must report 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.

## Baseline

- [ ] Read applicable repository instructions.
- [ ] Record the existing working tree and preserve unrelated changes.
- [ ] Confirm the real Astro application root.
- [ ] Inventory every public and intentionally private route.
- [ ] Capture legacy desktop, tablet, and mobile references.
- [ ] Record the canonical hostname, staging target, and deployment contract.

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
- [ ] Unit and server-side tests pass.
- [ ] Chromium desktop tests pass.
- [ ] Chromium mobile tests pass.
- [ ] Playwright WebKit tests pass using `tap()` for touch flows.
- [ ] Route matrix has no missing pages or required assets.
- [ ] Visual regression tests pass within the approved threshold.
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
- [ ] Canonical metadata is correct per page.
- [ ] Open Graph previews use the correct per-page content and image.
- [ ] Every indexable public page declares its own unique Open Graph image. No shared fallback image across pages.
- [ ] Each declared Open Graph image returns HTTP 200, a raster content type, and the exact declared dimensions.
- [ ] Structured data parses and matches visible content.
- [ ] Public discovery files include only intended public routes.
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
- [ ] Apex and alternate-host redirects behave correctly.
- [ ] Live WebKit tests pass after propagation.
- [ ] Native iOS Safari navigation works on production.
- [ ] Generated build output is cleaned without reverting source changes.
- [ ] Final evidence records versions, test counts, scores, and remaining risks.
