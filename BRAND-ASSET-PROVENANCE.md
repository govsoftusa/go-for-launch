# Brand Asset Provenance and Usage

Brand assets are controlled source materials. A convenient logo already present in a website export is not automatically the correct variant for a new context.

## Hard Rules

1. Locate the authoritative brand guide and current brand-kit directory before using any logo, logomark, wordmark, icon, seal, mascot, illustration, or branded template.
2. Record the SHA-256 of the reviewed brand guide and every approved asset. A changed hash requires renewed review.
3. Name the exact asset variant and its allowed surface. Common examples include full color on light, reversed on dark, white on dark, monochrome for one-color output, and a separately approved photographic-background variant.
4. Never crop a logomark out of a full lockup when an approved standalone logomark exists.
5. Never recolor, stretch, rotate, skew, add effects, or reconstruct a brand asset unless the brand guide explicitly permits it.
6. Preserve the intrinsic aspect ratio within one percent.
7. Enforce the brand guide's minimum rendered size and clear space on every side.
8. Treat light, dark, colored, patterned, and photographic backgrounds as different usage contexts. A variant approved for one context is not approved for another.
9. Record every production usage in `brand-assets.config.mjs`, including the context, selected asset, surface, rendered dimensions, and actual clear space.
10. Run the brand asset verifier before social-card approval, screenshot approval, staging, and production.

## Workflow

```bash
shasum -a 256 path/to/brand-guide.pdf path/to/approved-logo.svg
node scripts/verify-brand-assets.mjs --config=brand-assets.config.mjs
```

The verifier checks source existence, exact hashes, intrinsic dimensions, approved surface, proportional rendering, minimum size, and clear space. It does not decide whether a surface is visually light or dark. Screenshot and human brand review must confirm that the configured surface matches the actual design.

## Social Cards

Every social-card review must identify the brand guide and exact logo assets used. The card approval record must confirm:

- The logo variant is approved for the actual background.
- The logo retains its aspect ratio.
- Clear space and minimum size meet the brand guide.
- The logo is not competing with page content or decorative artwork.
- The asset remains sharp at full size and social-preview size.
- Any fallback artwork uses approved brand assets, not a crop from another file.

A wrong light or dark variant invalidates approval for every affected card, even when dimensions, metadata, and file hashes otherwise pass.
