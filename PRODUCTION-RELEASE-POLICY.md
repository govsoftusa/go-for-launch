# Production Release Policy

## Policy

A migrated Astro site must not be deployed or pushed to production until the exact production candidate passes the required build, browser, native iOS Safari, staging, and PageSpeed gates in this document.

Passing `astro build` alone is not sufficient. Chromium mobile emulation alone is not sufficient. A PageSpeed run against a different build, a preview error page, or the previous production version is not sufficient.

## Required Sequence

```text
install dependencies from the lockfile
run Astro diagnostics
run unit, server, form, and build-pipeline tests
build the production candidate
verify the generated sitemap covers every indexable built page
run desktop and mobile browser tests
run Playwright WebKit with an iPhone profile
test the built candidate in native iOS Safari through Xcode Simulator
deploy the exact candidate to staging
verify staging serves the expected candidate
run PageSpeed Insights on staging for mobile and desktop
require four scores of 100 in both strategies
deploy the same candidate to production
verify the canonical hostname
verify the public sitemap and robots declaration
repeat live WebKit and native iOS Safari smoke tests
```

Do not rebuild between the successful staging audit and production promotion unless the new output repeats the complete gate.

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
4. Run the complete live Playwright WebKit suite.
5. Open the canonical hostname in native iOS Safari Simulator.
6. Repeat mobile-menu, dropdown navigation, form or modal, and scrolling smoke tests.
7. Confirm no horizontal overflow or blank first paint.
8. Record production deployment and verification evidence.

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
- Sitemap URL, indexable page count, sitemap URL count, and validation result.
- Search Console property, permission, verification, and sitemap submission status when access exists.
- Automated test results.
- Simulator environment and results.
- Mobile and desktop PageSpeed scores.
- Staging verification.
- Production deployment identifier.
- Canonical-host verification.
- Remaining risks.
