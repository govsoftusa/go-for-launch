# Filtered Header Mobile Safari Menu Defect

<!-- case-study-normalization-reviewed -->

This incident occurred on a multi-page marketing site during a mid-2026 release.

## Symptom

The mobile navigation appeared correct when opened at the top of a page. On some longer pages, opening it after scrolling produced a broken overlay in native Safari:

- Menu links overlapped the brand and each other.
- Links escaped the dark menu surface and appeared over page content.
- The page remained visible between navigation items.
- The failure was especially visible on the support page after scrolling to the contact form.

This made the problem look page-specific even though every page used the same header component.

## Why This State Was Tested

The screenshot showed both a scrolled content section and the open mobile menu. The header changes appearance after `window.scrollY` exceeds its threshold, so testing only the initial page state could not represent the reported conditions.

The investigation reproduced this sequence:

1. Open a long page with an iPhone viewport.
2. Scroll to a lower section so the header receives its `scrolled` class.
3. Open the mobile navigation with a touch-style `tap()`.
4. Inspect the menu's bounding box, computed background, and link rectangles.
5. Compare WebKit behavior with the unscrolled state and native iOS Safari.

The purpose of the geometry assertions was to distinguish an actually full-screen panel from a technically visible element whose contents overflowed a collapsed containing block.

## Root Cause

The header used `position: fixed`. Its scrolled state added `backdrop-filter: blur(...)`. The mobile menu was a fixed descendant of that header and used viewport-style insets.

Safari treated the filtered header as the containing block for the fixed menu. The menu therefore resolved its geometry against the header's 70px box rather than the viewport. Its links remained visible because overflow escaped the collapsed box, while the intended opaque menu background did not cover the page.

The defect depended on three conditions:

- Mobile navigation breakpoint.
- Header already in its filtered, scrolled state.
- Menu opened while that state was active.

## Fix

The first repair absolutely anchored the menu below the fixed header and calculated its height from `100dvh`. That removed the original filtered-descendant failure, but it still left the overlay dependent on positioned geometry that can vary across native Safari releases.

The final implementation makes the open header itself the full viewport container:

- The header receives a `menu-active` class while navigation is open.
- `menu-active` sets the fixed header to `100vh` with a `100dvh` override.
- The header's inner wrapper becomes a two-row grid, one row for the brand and menu button, one row for navigation.
- The navigation participates in that grid instead of using a fixed or absolute viewport overlay.
- The panel has its own opaque background and vertical overflow.
- `menu-active` removes `backdrop-filter` for the lifetime of the open panel.
- Close behavior removes body scroll lock and `menu-active` together.
- Escape closes the panel and restores focus to the menu button.
- Crossing the desktop breakpoint closes stale mobile menu state.

This structure avoids relying on Safari's containing-block treatment for filtered or positioned descendants.

## Automated Regression Test

The added iPhone WebKit test:

- Opens the support page.
- Scrolls to the contact section.
- Confirms the header entered its `scrolled` state.
- Taps the menu button.
- Confirms the menu starts exactly below the 70px mobile header.
- Confirms the menu bottom matches `window.innerHeight` within one pixel.
- Confirms the background is opaque.
- Confirms every link starts at or below the preceding link's bottom edge.
- Presses Escape and confirms the menu and body scroll lock close cleanly.

This test would have failed against the original implementation even though a basic visibility assertion would have passed.

## Validation Result

- Astro diagnostics passed.
- Production build passed.
- Local Chromium and iPhone WebKit suite passed, 27 tests passed and 3 expected desktop-only skips were recorded.
- The specific scrolled-header geometry test passed in iPhone WebKit.
- Stable staging passed the same suite with 27 tests passed and 3 expected desktop-only skips.
- Native Safari on iOS 26.5 passed after opening the full-height menu and following its Testing destination on stable staging.
- Native Safari on iOS 26.5 passed after opening the full-height menu on canonical production.
- PageSpeed returned 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.
- Canonical production passed the same browser suite with 27 tests passed and 3 expected desktop-only skips.

## Reusable Lesson

Any scroll-dependent style can create a separate interaction state. Fixed headers, sticky controls, filters, transforms, containment, and compositing properties should be tested both before and after their state transitions. For overlays, assert the bounding box and opaque coverage in addition to visibility. A full-viewport grid container is more predictable than nesting a viewport overlay inside a filtered fixed header.
