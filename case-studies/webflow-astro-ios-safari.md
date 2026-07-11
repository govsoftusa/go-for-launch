# Webflow-to-Astro iOS Safari Remediation Case Study

This case study is maintained under `case-studies/` and indexed by the repository `README.md`. Site-identifying names, hostnames, and identifiers have been replaced with placeholders.

## Purpose

This document records the work completed on a production Astro marketing site, originally built in Webflow, to address mobile Safari rendering, scrolling, layout, and perceived freezing problems. It is intended to be reusable for another Astro marketing site, especially one migrated from Webflow or another visual builder.

The work covered five related problem classes:

1. Mobile hero content was too close to the fixed navigation.
2. Safari intermittently stalled or appeared partially painted while scrolling.
3. Webflow compatibility CSS forced excessive GPU compositing.
4. The project lacked Safari-specific automated regression coverage.
5. Mobile dropdown links received touch events but did not complete navigation in iOS Safari.

The final production deployment passed the site's required mobile and desktop PageSpeed gates, visual parity tests, route tests, form tests, and a dedicated iPhone WebKit stress suite.

## Project Context

The relevant Astro application is located at:

```text
brands/example-brand/website/webflow export and astro site
```

The application is a static Astro site deployed through Cloudflare Workers. It uses:

- Astro static output
- Cloudflare Workers static assets
- PageSpeed Insights as a production gate
- Playwright for visual, behavior, form, and WebKit testing
- A shared fixed navigation and modal contact experience
- Webflow CSS as a temporary compatibility layer
- Astro-owned page and interaction code layered after the compatibility CSS

The primary public verification target was:

```text
https://www.example.com/
```

The staging verification target was:

```text
https://test.stage.example.com/
```

## User-Visible Symptoms

The reported symptoms were not limited to one exact failure mode.

### Service page spacing

On a narrow iPhone viewport, the service page heading appeared too close to the fixed navigation. The gap looked accidental and reduced readability at the top of the page.

The original effective clearance between the bottom of the fixed header and the top of the service heading was approximately 17 CSS pixels on the supplied mobile screenshot.

### Intermittent scrolling failure

Scrolling could behave correctly on one load and then appear unresponsive or incomplete on another. The user described the site as if part of the page had not loaded.

### Delayed or incomplete paint

On iOS Safari, the site could appear blank or partially painted for several seconds before content appeared. This was especially concerning on long migrated pages.

### Flashing content

Some elements flashed during refresh or initial paint. This made the site feel less polished even when the final layout was correct.

## Root Causes Found

The investigation found multiple independent causes and risks. There was no single magic CSS rule that explained every symptom.

## Root Cause 1: Blanket GPU Promotion of Text

The global base stylesheet contained this rule:

```css
h1,
h2,
h3,
h4,
h5,
h6,
p,
span,
a,
button {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
```

This is sometimes added as a supposed Safari flicker fix. On a real marketing site it can be harmful.

Every matching element becomes eligible for its own compositing layer. Long pages may contain hundreds of headings, paragraphs, links, spans, and buttons. Safari must track, rasterize, and composite those layers while the user scrolls.

Before removal, the representative service page had 63 transformed text elements. After removal, it had 1 remaining transformed text element from legitimate site behavior.

The rule was removed from:

```text
src/styles/base.css
```

### Reusable rule

Do not apply `translateZ(0)`, `translate3d(0, 0, 0)`, `will-change: transform`, or `backface-visibility: hidden` to broad text selectors.

Only promote a layer when all of the following are true:

- The element is actively animated.
- The animation benefits measurably from compositing.
- The promotion is scoped to that element.
- The promotion is removed when the animation ends, when practical.
- The page is tested in Safari on a long document.

## Root Cause 2: Duplicate Page-Scoped Webflow Workarounds

Removing the global rule was not sufficient. Nine migrated page components contained their own inline copy of the same workaround:

```css
/* Safari text flicker fix */
h1, h2, h3, h4, h5, h6,
p, span, a, button {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
```

The affected route families were:

- Four focus-area pages
- Five compliance and governance pages

The affected component directories were:

```text
src/components/pages/focus-areas/
src/components/pages/compliance-and-governance-standards/
```

Those page-scoped blocks were removed.

The same components also contained an unused anti-flicker declaration:

```css
.anti-flicker,
.anti-flicker * {
  visibility: hidden !important;
  opacity: 0 !important;
}
```

No source element or runtime behavior used the `anti-flicker` class. The unused declaration was removed to prevent future code from accidentally hiding a whole page subtree.

### Reusable audit command

Run this from the Astro application root:

```bash
rg -n 'translateZ\(0\)|translate3d\(|backface-visibility|will-change|anti-flicker' src public
```

Review every result. Do not assume a global fix removed component-level duplicates.

## Root Cause 3: Viewport-Sized Live Blur

The Webflow compatibility CSS implemented the hero background wash as a large blurred element:

```css
.gradient-wrapper {
  filter: blur(100px);
  background-color: #22397324;
  border-radius: 50%;
  width: 50vw;
  height: 50vw;
  position: absolute;
  inset: -20rem auto auto -10rem;
}
```

At mobile breakpoints, the same element expanded to approximately the width of the viewport and up to 70 percent of the viewport height.

Large live CSS blurs are expensive because the browser must rasterize an offscreen surface with additional blur padding and composite it into the page. The cost increases with the rendered area, blur radius, device scale factor, and scroll invalidation behavior.

The compatibility override replaced the live blur with a static radial fill:

```css
/* Keep the soft hero wash without a viewport-sized live blur in Safari. */
.gradient-wrapper {
  filter: none;
  background: radial-gradient(
    circle at center,
    rgb(34 57 115 / 14%) 0%,
    rgb(34 57 115 / 8%) 45%,
    rgb(34 57 115 / 0%) 75%
  );
  border-radius: 0;
}
```

This preserves the visual impression while avoiding runtime blur filtering.

The override is located in:

```text
public/css/site-overrides.css
```

### Reusable rule

Avoid large `filter: blur(...)` and `backdrop-filter: blur(...)` surfaces on long mobile pages.

Prefer one of these alternatives:

1. A static CSS gradient with no filter.
2. A pre-rendered lightweight AVIF or WebP background.
3. A smaller localized effect that is not fixed or viewport-sized.
4. No decoration at the narrowest breakpoint.

## Root Cause 4: Insufficient Mobile Hero Clearance

The fixed navigation consumed substantial vertical space on iPhone layouts. The service hero did not reserve enough top padding below it.

The service template was updated to use:

```css
@media (max-width: 767px) {
  .service-hero {
    padding: 160px 0 56px;
  }
}
```

The final automated measurement showed approximately 33.9 CSS pixels between the fixed header and heading. The regression test requires at least 28 CSS pixels.

The relevant component is:

```text
src/components/core-services/CoreServiceWebflowLayout.astro
```

### Reusable measurement

Do not validate fixed-header spacing by visual intuition alone. Measure it:

```ts
const header = document.querySelector<HTMLElement>(".site-header");
const heading = document.querySelector<HTMLElement>("main h1");

const headingGap =
  (heading?.getBoundingClientRect().top || 0) -
  (header?.getBoundingClientRect().bottom || 0);
```

For this site, 28 CSS pixels was chosen as the minimum acceptable clearance.

## Root Cause 5: Mobile Dropdown Closed Before Safari Activated the Link

The mobile navigation appeared correct and dropdown destinations had valid `href` values. Direct top-level links worked, but links inside Products, Resources, and Company did nothing when tapped in iOS Safari.

An event trace showed that Safari generated pointer and touch events for the submenu link. Before Safari emitted the click, the dropdown toggle received `focusout` with `relatedTarget` set to `null`. The shared dropdown handler interpreted that as focus leaving the dropdown and synchronously hid the submenu. Safari then completed the pointer sequence against a different element and did not perform the anchor's default navigation.

The original behavior was effectively:

```js
dropdown.addEventListener("focusout", (event) => {
  if (!dropdown.contains(event.relatedTarget)) {
    close();
  }
});
```

The fix keeps desktop focus behavior while avoiding synchronous mobile cleanup:

```js
dropdown.addEventListener("focusout", (event) => {
  if (!isMobile() && !dropdown.contains(event.relatedTarget)) {
    close();
  }
});
```

The enclosing mobile menu also used to close synchronously from the selected link's click handler. That cleanup is now deferred until the event's default navigation action can run:

```js
menu.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", () => {
    if (isMobile()) {
      window.setTimeout(closeMenu, 0);
    }
  });
});
```

The implementation is in:

```text
public/js/site-interactions.js
```

### Reusable lesson

Do not synchronously remove, hide, disable, or detach a tapped anchor before its default action completes. Mobile Safari's touch, focus, pointer, and click ordering is not identical to desktop Chromium. Use native anchors, preserve them through activation, and test with Playwright `tap()` plus a real Simulator.

## Why the Fix Did Not Reuse Webflow Runtime Code

The goal was visual and interaction parity, not runtime parity.

The remediation retained Astro-owned HTML, CSS, and JavaScript. It did not restore Webflow animation code or broad Webflow browser workarounds.

This matters for three reasons:

1. The original workaround caused the Safari compositing risk.
2. Static Astro output can render useful content before client JavaScript runs.
3. The project must preserve performance, SEO, accessibility, and maintainability.

## Safari-Specific Playwright Project

The previous mobile Playwright project used an iPhone viewport with Chromium. That is useful for responsive testing but does not exercise WebKit behavior.

A dedicated WebKit project was added:

```ts
{
  name: "ios-webkit",
  testMatch: /ios-webkit\.spec\.ts/,
  use: {
    ...devices["iPhone 13"],
    browserName: "webkit",
    viewport: { width: 390, height: 844 }
  }
}
```

The regular Chromium projects ignore the Safari-specific file:

```ts
testIgnore: /ios-webkit\.spec\.ts/
```

The configuration is in:

```text
playwright.config.ts
```

### Install the matching WebKit runtime

The installed Playwright browser runtime must match the package version:

```bash
npx playwright install webkit
```

Do not rely on an older cached WebKit build after updating Playwright.

## Safari Regression Suite

The Safari suite is located at:

```text
tests/e2e/ios-webkit.spec.ts
```

It covers:

- Five core-service pages
- The custom software page
- Four focus-area pages
- Five compliance pages
- The shared contact modal
- One direct top-level mobile navigation destination
- One destination inside each Products, Resources, and Company dropdown

That is 20 Safari-focused tests.

The navigation tests use touch input and wait for the destination URL together with the tap:

```ts
await Promise.all([
  page.waitForURL((url) => url.pathname === expectedPath),
  link.tap()
]);
```

Using `click()` alone would not reproduce the touch and focus sequence that caused the Safari failure.

## What the Safari Tests Assert

### HTTP and paint readiness

Each route must return an OK response and expose a visible heading after network idle.

```ts
const response = await page.goto(route, { waitUntil: "networkidle" });
expect(response?.ok()).toBeTruthy();
await expect(page.locator("h1").first()).toBeVisible();
```

### No horizontal overflow

```ts
const overflow =
  document.documentElement.scrollWidth > window.innerWidth + 1;

expect(overflow).toBe(false);
```

The one-pixel tolerance avoids false positives from fractional device-pixel rounding.

### Limited transformed text

```ts
const compositedText = [
  ...document.querySelectorAll<HTMLElement>(
    "h1,h2,h3,h4,h5,h6,p,span,a,button"
  )
].filter((element) => getComputedStyle(element).transform !== "none").length;

expect(compositedText).toBeLessThanOrEqual(4);
```

The threshold allows a small number of intentional transformed controls while preventing a blanket text transform from returning.

### No large live blur

```ts
const largeLiveBlurs = [
  ...document.querySelectorAll<HTMLElement>("body *")
].filter((element) => {
  const styles = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    styles.filter.includes("blur(") &&
    rect.width * rect.height > 40_000
  );
}).length;

expect(largeLiveBlurs).toBe(0);
```

The 40,000 square CSS pixel threshold is intentionally conservative. Adjust it only after measuring the target design.

### Fixed-header clearance

```ts
expect(layout.headingGap).toBeGreaterThanOrEqual(28);
```

### Complete scroll-cycle responsiveness

The test scrolls from the top to the maximum document position and back using `requestAnimationFrame`.

It records frame intervals and asserts:

```ts
expect(profile.frames).toBeGreaterThan(80);
expect(profile.p95Frame).toBeLessThan(80);
expect(profile.maxFrame).toBeLessThan(500);
expect(profile.finalScroll).toBe(0);
```

These thresholds are regression guards, not universal performance standards.

- More than 80 frames confirms the browser continued scheduling animation frames.
- A p95 below 80 milliseconds rejects repeated severe stalls.
- A maximum below 500 milliseconds rejects a major freeze.
- A final scroll position of zero confirms both directions completed.

### No JavaScript page errors

```ts
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));

expect(errors).toEqual([]);
```

### Modal scroll restoration

The suite verifies the shared contact modal locks background scrolling while open and restores scrolling after close.

```ts
await page.locator("[data-contact-anchor]").click();
await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

await page.getByRole("button", { name: "Close contact form" }).click();
await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

await page.evaluate(() => window.scrollTo(0, 500));
await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
```

This test is important because a stale `overflow: hidden` state can look exactly like a frozen page.

## Baseline and Final Measurements

Representative production WebKit profile before removing broad text promotion:

```json
{
  "transformedText": 63,
  "elements": 150,
  "frames": 108,
  "p95": 18,
  "max": 45,
  "finalScroll": 5559,
  "maxScroll": 5559
}
```

Representative local profile after the primary fix:

```json
{
  "transformedText": 1,
  "elements": 150,
  "headingGap": 33.9,
  "frames": 109,
  "p95": 18,
  "max": 19
}
```

The main improvement was not the average frame interval. It was the dramatic reduction in unnecessary composited text and the removal of the worst long-frame outlier in this sample.

## iOS Simulator Setup

The Mac originally had only Command Line Tools selected:

```text
/Library/Developer/CommandLineTools
```

`xcrun simctl` was unavailable because full Xcode and an iOS runtime were not installed.

The reusable installer is located at:

```text
scripts/install-ios-simulator.sh
```

It performs these tasks:

1. Verifies macOS and Homebrew.
2. Installs `mas` and `jq` when missing.
3. Installs Xcode from the Mac App Store.
4. Selects the Xcode developer directory.
5. Accepts the Xcode license.
6. Completes first-launch setup.
7. Downloads the current iOS Simulator runtime.
8. Selects or creates an iPhone Simulator.
9. Boots the device.
10. Opens Simulator pinned to the chosen UDID.
11. Writes a timestamped log.

Run it from the repository root:

```bash
./scripts/install-ios-simulator.sh
```

Logs are written to:

```text
~/Library/Logs/example-brand/install-ios-simulator-YYYYMMDD-HHMMSS.log
```

The installed environment used for final testing was:

```text
Xcode 26.6
iOS Simulator runtime 26.5
iPhone 17 Pro
```

## Pin Simulator Commands to a UDID

Do not use `booted` when more than one Simulator may be running.

This is ambiguous:

```bash
xcrun simctl openurl booted https://example.com/
xcrun simctl io booted screenshot screenshot.png
```

Use an explicit UDID:

```bash
UDID="YOUR-SIMULATOR-UDID"

xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b
xcrun simctl openurl "$UDID" "https://example.com/"
xcrun simctl io "$UDID" screenshot screenshot.png
```

Open the matching Simulator window explicitly:

```bash
open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app \
  --args -CurrentDeviceUDID "$UDID"
```

### Detect extra booted devices

```bash
xcrun simctl list devices | rg Booted
```

### Shut down all booted devices except the target

```bash
KEEP_UDID="YOUR-TARGET-UDID"

for udid in $(
  xcrun simctl list devices -j |
    jq -r --arg keep "$KEEP_UDID" \
      '.devices[] | .[] | select(.state == "Booted" and .udid != $keep) | .udid'
); do
  xcrun simctl shutdown "$udid"
done
```

## Important Simulator Testing Limitation

Mouse-drag automation against the Simulator window was not accepted as reliable evidence.

During testing, synthetic Computer Use drag gestures sometimes:

- Activated a link instead of scrolling.
- Switched focus to another Simulator window.
- Produced transient black compositing surfaces.
- Failed to change the actual page scroll position.

Those effects could be mistaken for a website bug. The strongest signal was that the same artifact occurred on both the old and local candidate builds while the page scroll position did not change.

The reliable acceptance evidence therefore came from:

- Actual Simulator rendering and navigation inspection.
- Playwright WebKit scroll profiling.
- Visual parity screenshots.
- DOM measurements.
- Live production WebKit tests.

For native WebDriver automation of iOS Safari, enable SafariDriver once:

```bash
sudo xcrun safaridriver --enable
```

Then create a WebDriver session with capabilities similar to:

```json
{
  "capabilities": {
    "alwaysMatch": {
      "browserName": "Safari",
      "platformName": "iOS",
      "safari:useSimulator": true,
      "safari:deviceType": "iPhone",
      "safari:deviceName": "iPhone 17 Pro",
      "safari:deviceUDID": "YOUR-SIMULATOR-UDID"
    }
  }
}
```

Apple also requires Remote Automation to be enabled for the target device. Web Inspector is normally available for booted simulators.

## Local Validation Workflow

From the Astro application root:

```bash
npm run check
npm run build
```

Start a production preview:

```bash
npx astro preview --host 127.0.0.1 --port 4330
```

Run the Safari suite:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4330 \
  npx playwright test tests/e2e/ios-webkit.spec.ts \
  --project=ios-webkit
```

Run visual parity and Safari together:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4330 \
  npx playwright test \
  tests/e2e/parity.spec.ts \
  tests/e2e/ios-webkit.spec.ts
```

Run the complete browser suite:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4330 \
  npx playwright test
```

## Production Deployment Gate

The project does not deploy directly after a successful build. Production deployment runs a candidate verification chain:

```text
npm run check
test Worker behavior
test build-pipeline scripts
deploy the exact candidate to staging
run PageSpeed against staging
require perfect category scores
deploy the same candidate to production
submit URLs to IndexNow
```

The production command is:

```bash
npm run deploy:production
```

The gate requires all four PageSpeed categories to equal 100 on mobile and desktop:

- Performance
- Accessibility
- Best Practices
- SEO

The final Safari remediation deployment reported:

```text
Mobile: 100 / 100 / 100 / 100
Desktop: 100 / 100 / 100 / 100
Mobile FCP: 956 ms
Mobile LCP: 1651 ms
Mobile TBT: 0 ms
Mobile CLS: 0
Desktop FCP: 334 ms
Desktop LCP: 527 ms
Desktop TBT: 0 ms
Desktop CLS: 0.002451058591892814
```

The final production Worker version was:

```text
EXAMPLE-WORKER-VERSION-ID
```

The final live Safari suite result was:

```text
20 passed
0 failed
```

The broader validation results during this work included:

```text
Astro check: 0 errors, 0 warnings, 0 hints
Desktop, tablet, and mobile behavior and parity suite: 332 passed, 8 intentional skips
Local iPhone WebKit suite: 20 passed
Live production iPhone WebKit suite: 20 passed
Native iPhone 17 Pro Simulator: Products dropdown navigation passed
Worker tests: 16 passed
Build-pipeline tests: 6 passed
IndexNow: 56 URLs submitted, HTTP 200
```

## Generated Output Cleanup

This repository tracks parts of `dist`, so builds and deploys create noisy generated changes.

After validation, restore tracked generated output and delete only untracked generated output:

```bash
git restore --worktree dist
git ls-files --others --exclude-standard -z dist | xargs -0 rm -f
find dist -type d -empty -delete
git diff --check
```

Run these commands from the application directory or adjust the path from the repository root.

Never restore source files as part of generated-output cleanup.

## False Leads and Lessons

### False lead: Add more Safari GPU fixes

The original CSS claimed to fix Safari flicker by adding transforms and hidden backfaces. That workaround increased compositing pressure and was removed.

Lesson: a browser-specific workaround is not evidence of a browser-specific fix. Measure layer count and frame behavior.

### False lead: One successful responsive Chromium test is enough

Chromium with an iPhone viewport does not exercise WebKit layout and compositing behavior.

Lesson: keep a dedicated WebKit project.

### False lead: `simctl booted` always identifies the expected device

Xcode and Simulator can boot another device automatically. Commands using `booted` may capture or navigate the wrong phone.

Lesson: pin every command and the Simulator UI to one UDID.

### False lead: A synthetic drag proves Safari scrolling

Dragging the Simulator surface through generic desktop automation produced misleading black frames and accidental navigation.

Lesson: use SafariDriver, XCTest, or browser-level WebKit automation for repeatable interaction evidence.

### False lead: A first live failure always means the deployed code is wrong

Immediately after deployment, one live WebKit run received an older HIPAA page response with 22 transformed text elements. Repeated cache-busted requests showed Cloudflare edge propagation converging to the new response.

Lesson: verify propagation with repeated requests and inspect the actual returned HTML before changing source again.

Example propagation check:

```bash
for i in $(seq 1 20); do
  url="https://www.example.com/page/?propagation=$i-$(date +%s%N)"
  curl -fsS -o /tmp/page.html "$url"
  count=$(rg -o 'translateZ\(0\)' /tmp/page.html | wc -l | tr -d ' ')
  printf 'try=%02d transforms=%s\n' "$i" "$count"
done
```

## Reusable Audit Checklist

### CSS and compositing

- [ ] Search for blanket `translateZ(0)` rules.
- [ ] Search for `backface-visibility: hidden` on broad selectors.
- [ ] Search for `will-change` that remains active at rest.
- [ ] Search for large `filter: blur(...)` surfaces.
- [ ] Search for viewport-sized `backdrop-filter` surfaces.
- [ ] Search component-local styles, not only global stylesheets.
- [ ] Confirm anti-flicker classes cannot hide the document indefinitely.

### Layout

- [ ] Measure fixed-header clearance at mobile breakpoints.
- [ ] Verify no horizontal overflow at 390, 375, 360, and 320 CSS pixels.
- [ ] Verify long words and headings wrap without changing the page width.
- [ ] Verify images preserve aspect ratio.
- [ ] Verify fixed navigation does not cover anchor targets.

### Scrolling and interaction

- [ ] Scroll from top to bottom and back in WebKit.
- [ ] Record frame intervals during the scroll cycle.
- [ ] Test `prefers-reduced-motion` behavior.
- [ ] Open and close every modal.
- [ ] Confirm body overflow is restored after close.
- [ ] Confirm mobile navigation opens and closes.
- [ ] Use touch input to open every mobile dropdown.
- [ ] Confirm one destination inside every dropdown completes navigation.
- [ ] Confirm focus cleanup does not hide a tapped link before activation.
- [ ] Confirm same-page anchors clear the fixed header.
- [ ] Confirm no JavaScript page errors occur.

### Simulator

- [ ] Install full Xcode and an iOS runtime.
- [ ] Record the selected device UDID.
- [ ] Shut down unexpected booted devices.
- [ ] Open Simulator with `-CurrentDeviceUDID`.
- [ ] Use exact UDIDs in `simctl` commands.
- [ ] Confirm the address bar shows the expected host.
- [ ] Do not treat generic desktop drag artifacts as webpage failures.

### Performance and deployment

- [ ] Run Astro check.
- [ ] Run a production build.
- [ ] Run visual parity tests.
- [ ] Run dedicated WebKit tests.
- [ ] Run the complete route matrix.
- [ ] Deploy the exact candidate to staging.
- [ ] Run PageSpeed against staging.
- [ ] Deploy only after the required gate passes.
- [ ] Verify the canonical production hostname.
- [ ] Repeat live WebKit tests after edge propagation.

## Minimal Porting Plan for Another Astro Site

1. Add a Playwright WebKit project using the target mobile viewport.
2. Add route lists for the longest and most interactive pages.
3. Add assertions for overflow, page errors, transformed text, and large blurs.
4. Add a complete animated scroll-cycle profile.
5. Add modal overflow restoration tests.
6. Audit global and page-local CSS for broad compositing hacks.
7. Replace large live filters with static visual equivalents.
8. Measure fixed-header clearance instead of relying on screenshots alone.
9. Test locally in WebKit and in an explicitly pinned Simulator.
10. Run visual parity tests to ensure performance fixes did not alter the design.
11. Deploy to staging and run a performance gate against the exact candidate.
12. Repeat the WebKit suite against production after propagation.
13. Add touch-navigation tests for direct links and every dropdown group.

## Recommended Acceptance Criteria

Use these as a starting point, then tune them for the new site:

```text
Astro diagnostics: 0 errors
Browser page errors: 0
Horizontal overflow: 0 routes
Large live blur surfaces: 0
Broad transformed text: no blanket rule
Fixed-header heading gap: at least 28 CSS pixels
Scroll frames: more than 80 for a 900 ms down and 900 ms up profile
Scroll p95 frame interval: less than 80 ms
Scroll maximum frame interval: less than 500 ms
Final scroll position: 0
Visual regression: within the project's approved threshold
Required PageSpeed categories: pass the project's release gate
```

## References

- Apple, WebDriver: <https://developer.apple.com/documentation/safari-developer-tools/webdriver/>
- Apple, Enable WebDriver on iOS and iPadOS: <https://developer.apple.com/documentation/safari-developer-tools/ios-enabling-webdriver>
- Apple, Inspecting iOS and iPadOS: <https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios>
- Apple, Installing Xcode and Simulators: <https://developer.apple.com/documentation/safari-developer-tools/installing-xcode-and-simulators>
- WebKit, WebDriver is Coming to Safari in iOS 13: <https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/>
- Astro documentation: <https://docs.astro.build/>
- Playwright WebKit documentation: <https://playwright.dev/docs/browsers#webkit>

## Final Takeaway

The most important correction was removing code that attempted to fix Safari by forcing more compositing.

For content-heavy Astro sites, Safari reliability improved by making the rendering model simpler:

- Fewer promoted layers
- No broad transforms on text
- No large runtime blur filters
- Explicit space below fixed navigation
- Static content available before JavaScript
- WebKit-specific automated coverage
- Pinned and observable Simulator state
- Native link activation preserved through Safari's touch and focus event order
- A deployment gate that protects performance and visual quality

The general strategy is to reduce rendering work, measure the actual DOM and frame behavior, and verify the exact production candidate instead of layering additional browser-specific hacks onto an already complex page.
