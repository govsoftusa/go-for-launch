# Deterministic Open Graph Image Generation

Every indexable page needs its own relevant social preview. A deterministic generator makes those images repeatable, reviewable, and safe to enforce in the build instead of relying on hand-edited files.

## Configure the Cards

Copy [`open-graph.config.mjs`](templates/open-graph.config.mjs) into the target site. Keep page-specific text in the `cards` array and shared brand choices in the top-level configuration.

Card names become `public/og-NAME.png`. Names are limited to lowercase letters, digits, and hyphens so output paths cannot escape the configured directory.

## Generate and Check

Copy [`generate-open-graph.mjs`](scripts/generate-open-graph.mjs) into the target site and install the current compatible `sharp` release:

```bash
npm install sharp
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs --check
```

Generation uses fixed dimensions, fonts, geometry, color values, encoding settings, and source order. It uses no timestamps, random values, network resources, or system font files. The same configuration and compatible Sharp runtime therefore produce the same PNG bytes.

The check mode renders in memory and compares the exact bytes with the committed or staged files. It fails when a file is missing or stale. The SEO validator separately confirms that every page declares a unique image, that the image resolves from final output, and that its real dimensions are 1200 by 630.

## Build Order

Generate images before Astro builds the pages that reference them:

```text
generate deterministic Open Graph images
build Astro
materialize and verify sitemap.xml
verify SEO, JSON-LD, headings, hreflang, and Open Graph files
verify image output
run browser tests
```

Do not use a shared fallback on indexable pages. A build must fail when a new route lacks a configured image or when two pages declare the same preview.

## Text and Design Constraints

- Keep important text within the center-safe area used by common social crops.
- Use high-contrast text at sizes that remain readable in a small feed card.
- Keep the page topic in the image text, not only the brand.
- Use `og:image:alt` to describe the preview's information, not its decorative geometry.
- Review long titles for clipping before release.
- Treat social previews as presentation metadata. Do not claim that they directly improve search ranking.
