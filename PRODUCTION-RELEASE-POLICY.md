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
run desktop and mobile browser tests
run Playwright WebKit with an iPhone profile
test the built candidate in native iOS Safari through Xcode Simulator
deploy the exact candidate to staging
verify staging serves the expected candidate
run PageSpeed Insights on staging for mobile and desktop
require four scores of 100 in both strategies
deploy the same candidate to production
verify the canonical hostname
repeat live WebKit and native iOS Safari smoke tests
```

Do not rebuild between the successful staging audit and production promotion unless the new output repeats the complete gate.

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
2. Verify redirects and representative routes.
3. Run the complete live Playwright WebKit suite.
4. Open the canonical hostname in native iOS Safari Simulator.
5. Repeat mobile-menu, dropdown navigation, form or modal, and scrolling smoke tests.
6. Confirm no horizontal overflow or blank first paint.
7. Record production deployment and verification evidence.

Production verification does not replace pre-production testing. It confirms routing, propagation, caching, and hostname behavior after promotion.

## Stop Conditions

Stop the production release when:

- Astro diagnostics fail.
- The production build fails.
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
- Automated test results.
- Simulator environment and results.
- Mobile and desktop PageSpeed scores.
- Staging verification.
- Production deployment identifier.
- Canonical-host verification.
- Remaining risks.

