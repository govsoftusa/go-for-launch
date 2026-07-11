# Astro Mobile Safari Porting Playbook

## Mandatory Release Requirement

Before production, build the exact candidate, test it in Playwright WebKit and native iOS Safari through Xcode Simulator, deploy that candidate to staging, and run PageSpeed Insights against staging for mobile and desktop. Performance, Accessibility, Best Practices, and SEO must each equal 100 in both strategies. Any failed Simulator check, failed required test, or score below 100 blocks production.

See [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md) for the complete gate and stop conditions.

## Objective

Use this playbook when moving a website from Webflow, WordPress, or another platform into Astro. The objective is content and design parity with a simpler, fast, accessible Astro implementation that works in desktop browsers and native iOS Safari.

Do not copy a legacy runtime merely to reproduce its appearance. Preserve verified content, layout, responsive behavior, assets, interactions, metadata, and brand standards while rebuilding the implementation around Astro components and small, testable client scripts.

## 1. Establish Sources of Truth

Before editing code, identify:

- The exported site snapshot used for content, structure, class names, and assets.
- The live legacy site used for CMS content, animation, and responsive behavior missing from the export.
- The Astro repository and real application root.
- The staging and production deployment targets.
- The canonical hostname and redirect policy.
- The current route inventory, including legal, article, product, service, and error routes.

Capture reference screenshots at desktop, tablet, and mobile sizes. A useful starting matrix is `1440 x 1000`, `1024 x 900`, `768 x 1024`, and `390 x 844`. Also test 320 CSS pixels for overflow.

For each route, record:

- Page title and metadata.
- Section order and visible copy.
- Image source, intrinsic dimensions, aspect ratio, and alt text.
- Navigation destinations and same-page anchors.
- Forms, modals, menus, carousels, counters, and other interactions.
- Known legacy defects that should not be reproduced.

## 2. Preserve Static First Paint

Astro should emit meaningful HTML before client JavaScript runs. Avoid hiding the whole document until hydration, animation initialization, font loading, or a legacy runtime completes.

Audit for:

```bash
rg -n 'visibility:\s*hidden|opacity:\s*0|display:\s*none|anti-flicker|data-wf-page|webflow.js' src public
```

If content flashes or remains blank:

1. Disable JavaScript and verify primary content is still visible.
2. Inspect inline styles and startup classes applied to `html`, `body`, `main`, or large wrappers.
3. Confirm critical CSS is available before first paint.
4. Confirm fonts use sensible fallbacks and do not gate visibility.
5. Confirm images have dimensions so later decoding does not move content.
6. Remove runtime code that only exists to reveal already-rendered HTML.

## 3. Audit Safari Rendering Cost

Search global and component-local CSS:

```bash
rg -n 'translateZ\(0\)|translate3d\(|backface-visibility|will-change|filter:\s*blur|backdrop-filter|position:\s*fixed|100vh' src public
```

Common migration defects include:

- Blanket `translateZ(0)` or hidden backfaces on headings, paragraphs, links, spans, and buttons.
- Permanent `will-change` on elements that are not currently animating.
- Large live blur or backdrop-filter surfaces.
- Multiple fixed or sticky layers spanning the viewport.
- Duplicate Safari workarounds copied into page-scoped style blocks.
- Unused anti-flicker selectors capable of hiding a page subtree.

Prefer static gradients or optimized image assets over viewport-sized live filters. Promote only elements that are actively animated and measurably benefit from compositing.

## 4. Make Mobile Layout Explicit

Do not depend on desktop rules shrinking correctly. Define mobile constraints for:

- Fixed-header clearance.
- Hero top and bottom padding.
- Stable image aspect ratios.
- Card and grid widths.
- Long headings and unbroken strings.
- Modal height and internal scrolling.
- Safe areas and browser toolbar changes.
- Touch targets of at least 44 by 44 CSS pixels.

Useful CSS foundations:

```css
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

html,
body {
  max-width: 100%;
}

img,
svg,
video,
canvas {
  max-width: 100%;
  height: auto;
}
```

Measure fixed-header spacing instead of relying only on screenshots:

```ts
const header = document.querySelector<HTMLElement>(".site-header");
const heading = document.querySelector<HTMLElement>("main h1");
const gap =
  (heading?.getBoundingClientRect().top || 0) -
  (header?.getBoundingClientRect().bottom || 0);
```

## 5. Build Safari-Safe Interactions

Use native links for navigation. JavaScript may manage menu state, but it should not replace normal anchor behavior.

### Do not remove a tapped link before default navigation

iOS Safari can report `relatedTarget` as `null` when a submenu link is tapped. If a `focusout` handler immediately hides the dropdown, Safari may emit pointer and touch events but never complete the anchor click.

Unsafe pattern:

```js
dropdown.addEventListener("focusout", (event) => {
  if (!dropdown.contains(event.relatedTarget)) closeDropdown();
});
```

Safer pattern:

```js
dropdown.addEventListener("focusout", (event) => {
  if (!isMobile() && !dropdown.contains(event.relatedTarget)) {
    closeDropdown();
  }
});
```

If the enclosing mobile menu closes when a link is selected, defer the visual close until Safari has processed the link's default action:

```js
link.addEventListener("click", () => {
  if (isMobile()) window.setTimeout(closeMenu, 0);
});
```

This is not a general recommendation to delay navigation. It prevents state cleanup from deleting or hiding the event target before the browser completes native link activation.

### Keep mobile menu geometry independent of a filtered fixed header

Safari can treat a fixed element with `backdrop-filter` as a containing block for fixed descendants. A full-screen menu placed inside a fixed, blurred header may then resolve its fixed insets against the header's small box instead of the viewport.

The resulting defect can be state-dependent:

- The menu works at the top of the page.
- Scrolling adds a class that enables `backdrop-filter` on the header.
- Opening the menu after that state change collapses its geometry.
- Navigation links spill out of the menu, overlap the logo and page content, or appear over transparent sections.
- Chromium testing at the same viewport may not reproduce the failure.

Do not test only the initial header state. Scroll a long page until the sticky or fixed header changes appearance, then open and close the mobile navigation in WebKit and native Safari.

A robust pattern anchors the menu panel below the header with an explicit dynamic viewport height. Remove the header blur while the panel is open:

```css
.site-header.menu-active {
  background: var(--header-background);
  backdrop-filter: none;
}

@media (max-width: 64rem) {
  .primary-nav {
    position: absolute;
    top: var(--header-height);
    left: 0;
    width: 100%;
    height: calc(100dvh - var(--header-height));
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--menu-background);
  }
}
```

Keep the open state synchronized in JavaScript:

```js
function setMenuOpen(open) {
  menu.dataset.open = String(open);
  button.setAttribute("aria-expanded", String(open));
  header.classList.toggle("menu-active", open);
  document.body.classList.toggle("menu-open", open);
}
```

The regression test should reproduce the state that triggered the defect and assert geometry, not only visibility:

```ts
test("mobile menu fills the viewport after the header is scrolled", async ({ page }) => {
  await page.goto("/long-page/");
  await page.locator("#lower-section").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-header]")).toHaveClass(/scrolled/);

  await page.locator("[data-menu-button]").tap();
  const geometry = await page.locator("[data-menu]").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const links = Array.from(element.querySelectorAll("a")).map((link) => link.getBoundingClientRect());
    return {
      top: box.top,
      bottom: box.bottom,
      viewportHeight: window.innerHeight,
      background: getComputedStyle(element).backgroundColor,
      links: links.map((link) => ({ top: link.top, bottom: link.bottom }))
    };
  });

  expect(geometry.top).toBeGreaterThan(0);
  expect(Math.abs(geometry.bottom - geometry.viewportHeight)).toBeLessThanOrEqual(1);
  expect(geometry.background).not.toBe("rgba(0, 0, 0, 0)");
  for (let index = 1; index < geometry.links.length; index += 1) {
    expect(geometry.links[index].top).toBeGreaterThanOrEqual(geometry.links[index - 1].bottom);
  }
});
```

This test exists to catch a geometry and compositing defect. A simple `toBeVisible()` assertion would pass even while links overlap the page.

### Restore scrolling after modals and menus

Every code path that sets `overflow: hidden`, `position: fixed`, or a scroll-lock class must restore it when the UI closes, including Escape, backdrop clicks, successful form submission, route changes, and initialization errors.

### Smooth scrolling

Use small Astro-owned behavior for same-page anchors. Respect `prefers-reduced-motion`, offset fixed headers, and avoid long scripted animation loops. Keep normal cross-page links native.

## 6. Add Real WebKit Coverage

Chromium mobile emulation is useful but does not exercise WebKit. Add an explicit Playwright project:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "ios-webkit",
      testMatch: /ios-webkit\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 390, height: 844 }
      }
    }
  ]
});
```

Use `locator.tap()` for mobile navigation tests. A mouse click does not exercise the same touch and focus sequence.

Test at least:

- One direct top-level navigation link.
- One link inside every dropdown group.
- Menu open and close states.
- Menu geometry after the header enters every scroll-dependent visual state.
- Modal open, close, validation, and scroll restoration.
- Top-to-bottom and bottom-to-top scrolling on the longest routes.
- No horizontal overflow.
- Fixed-header anchor clearance.
- Page errors and failed required assets.
- Reduced-motion behavior.

Wait for URL changes together with the tap:

```ts
await Promise.all([
  page.waitForURL((url) => url.pathname === expectedPath),
  link.tap()
]);
```

## 7. Test Native iOS Safari

Use full Xcode and a downloaded iOS Simulator runtime. Pin every command to one device UDID:

```bash
UDID="YOUR-SIMULATOR-UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$UDID"
xcrun simctl openurl "$UDID" "http://127.0.0.1:4321/"
```

Inspect the actual Safari address bar and destination content after tapping navigation links. Test local production output, staging, and the canonical production hostname.

Generic desktop drag automation can mis-target Simulator controls or produce misleading frames. Prefer WebKit automation for repeatable scroll measurements and use native Simulator interaction for visual and tap confirmation.

## 8. Protect Performance, SEO, and Accessibility

Safari fixes should simplify rendering, not add more JavaScript or browser-specific decoration.

Preserve:

- Static HTML content.
- Unique titles and descriptions.
- Canonical URLs.
- Per-page Open Graph and Twitter metadata, including a unique social image for every indexable page.
- Structured data that matches visible content.
- Intrinsic image dimensions and responsive sources.
- Keyboard focus and semantic controls.
- Reduced-motion support.
- Server-side form validation and anti-spam verification.
- Crawlable public content and deliberately protected private routes.

Lazy load third-party scripts, including Turnstile, when their UI is opened. Keep validation on the server.

## 9. Use a Candidate-Based Release Gate

The exact output tested on staging should be the output promoted to production.

Recommended sequence:

```text
Astro diagnostics
unit and Worker tests
production build
Playwright behavior tests
Playwright WebKit tests
visual regression tests
staging deployment
PageSpeed and live staging checks
production deployment
canonical hostname checks
live WebKit tests
```

After deployment, verify the canonical hostname rather than relying only on a temporary platform URL. Allow for edge propagation, then repeat cache-busted checks before treating one stale response as a regression.

## 10. Document Evidence

For every defect, record:

- User-visible symptom.
- Reproduction route and viewport.
- Browser and operating system.
- Root cause with the relevant event, style, or network evidence.
- Source change.
- Regression test.
- Local result.
- Native Simulator result.
- Staging result.
- Production result.
- Performance and accessibility impact.
- Failed approaches and why they were reverted.

This turns one migration fix into a reusable engineering asset instead of a collection of one-off patches.
