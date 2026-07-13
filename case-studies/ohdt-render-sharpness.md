# OHDT Navigation and Typography Sharpness

## Symptom

The OHDT stakeholder staging site showed visibly soft text in several areas. The floating navigation was the clearest example. Its logo, OHDT wordmark, and association name all appeared less sharp than adjacent content.

## Root Causes

The review identified several compounding risks:

- The navigation applied `backdrop-filter` to the same element that contained the logo and text. Safari and other browsers can composite that complete element as a raster layer.
- The logo used a 48 by 48 SVG view box but requested a 44 by 44 rendered size, producing a persistent fractional scale.
- The stylesheet requested Inter without shipping an Inter font file or declaring a `font-face`.
- Several headings and labels requested synthesized intermediate font weights.
- The rotating hero outcome moved live text with fractional `em` transforms.
- A program card used a persistent 1.1 `rem` vertical transform, which can land text between device pixels.
- Text-bearing callouts, article navigation, and the mobile menu also used direct backdrop blur.

## Correction

The candidate switched to the native system UI font stack, browser-default smoothing, browser-default text rendering, and stable font weights. The logo now renders at the same 48 by 48 size as its view box and uses integer geometry. Content-bearing surfaces use opaque backgrounds without direct blur. The hero rotation changes visibility without moving glyphs, and the program-card offset uses an integer `rem` value.

The association mark, colors, rounded navigation, elevation, content hierarchy, and section identities remain intact. The correction changes rendering architecture, not brand identity.

## Reusable Rule

Keep decorative blur behind content. Never apply blur, scaling, or a persistent fractional transform to the same layer that paints ordinary text or a logo. Match inline interface SVG dimensions to their view box when practical, and ship every named first-choice font.

The reusable implementation is documented in [Render Sharpness Gate](../RENDER-SHARPNESS.md) and enforced by [`scripts/verify-render-sharpness.mjs`](../scripts/verify-render-sharpness.mjs).

## Acceptance Evidence

- Run the read-only render sharpness gate against the exact built candidate.
- Verify desktop Chromium and iPhone WebKit.
- Inspect native-resolution navigation and text captures.
- Inspect native iOS Safari before production.
- Preserve the report with the release candidate evidence.

This case study records the pattern and the correction. It does not authorize a production release without the remaining Go for Launch gates.
