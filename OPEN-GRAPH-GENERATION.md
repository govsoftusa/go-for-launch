# Deterministic Open Graph Image Generation

Every indexable page needs its own relevant social preview. A deterministic generator makes those images repeatable, reviewable, and safe to enforce in the build instead of relying on hand-edited files.

## Configure the Cards

Copy [`open-graph.config.mjs`](templates/open-graph.config.mjs) into the target site. Keep page-specific text in the `cards` array and shared brand choices in the top-level configuration.

Card names become `public/og-NAME.png`. Names are limited to lowercase letters, digits, and hyphens so output paths cannot escape the configured directory.

## Generate and Check

Copy [`generate-open-graph.mjs`](scripts/generate-open-graph.mjs) and [`review-open-graph.mjs`](scripts/review-open-graph.mjs) into the target site, then install the current compatible `sharp` release:

```bash
npm install sharp
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs --check
node scripts/review-open-graph.mjs --config=open-graph.config.mjs
```

Generation uses fixed dimensions, fonts, geometry, color values, encoding settings, and source order. It uses no timestamps, random values, network resources, or system font files. The same configuration and compatible Sharp runtime therefore produce the same PNG bytes.

The check mode renders in memory and compares the exact bytes with the committed or staged files. It fails when a file is missing or stale. The SEO validator separately confirms that every page declares a unique image, that the image resolves from final output, and that its real dimensions are 1200 by 630.

Generation and dimension checks cannot determine whether a card is visually polished. A valid 1200 by 630 image can still contain overlapping text, clipped titles, damaged source artwork, poor scaling, or unreadable details. The visual review script creates contact sheets containing every configured card. Inspect those sheets at full size before approval:

```bash
node scripts/review-open-graph.mjs --config=open-graph.config.mjs
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --approve
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --check
```

Approval records the SHA-256 hash of every reviewed image. Any pixel change, new card, removed card, or filename change invalidates approval and blocks the check until the new contact sheets are reviewed. Commit the approval manifest. Do not commit generated review sheets unless the project uses them as release evidence.

## Build Order

Generate images before Astro builds the pages that reference them:

```text
generate deterministic Open Graph images
generate and inspect Open Graph contact sheets
approve the exact image hashes
build Astro
materialize and verify sitemap.xml
verify SEO, JSON-LD, headings, hreflang, and Open Graph files
verify image output
verify the Open Graph approval manifest matches the exact generated images
run browser tests
```

Do not use a shared fallback on indexable pages. A build must fail when a new route lacks a configured image or when two pages declare the same preview.

## Text and Design Constraints

- Keep important text within the center-safe area used by common social crops.
- Use high-contrast text at sizes that remain readable in a small feed card.
- Keep the page topic in the image text, not only the brand.
- Prefer vector artwork and lossless output for logos, diagrams, and flat illustrations.
- Do not enlarge a raster source beyond its useful resolution. Replace low-resolution or visibly aliased artwork.
- Use `og:image:alt` to describe the preview's information, not its decorative geometry.
- Review every card for overlap, clipping, jagged edges, unintended transparency, incorrect content, and safe-area cropping before release.
- Preview representative cards in at least one real messaging or social application because those applications add their own title and description around the image.
- Treat social previews as presentation metadata. Do not claim that they directly improve search ranking.
