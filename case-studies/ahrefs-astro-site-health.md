# Ahrefs Findings Converted into an Astro Build Gate

<!-- case-study-normalization-reviewed -->

## Scope

This case study records how an external Ahrefs report was converted into reusable final-output checks for an Astro information site. The implementation details are site-specific evidence. The reusable policy and verifier are in [SITE-HEALTH-AUDIT.md](../SITE-HEALTH-AUDIT.md).

No production deployment was part of this work. A fresh external crawl remains required after the corrected candidate is deployed.

## Symptoms

The crawler summary covered roughly two hundred internal URLs and reported:

- Dozens of oversized image files.
- Dozens of canonical URLs with no incoming internal links.
- One inaccessible `robots.txt` finding.
- More than one hundred missing image alternative-text findings.
- Dozens of links to redirects.
- Dozens of redirected pages with no incoming links.
- Several titles that were too long.
- Several meta descriptions that were too long or too short.
- Dozens of redirect responses.

The report was useful, but it described a prior public crawl. Current public verification showed that `robots.txt` already returned HTTP 200, so that item was treated as stale evidence rather than a reason for an unnecessary source change.

## Root Causes

The migration preserved many large source assets. Several were still referenced by final page markup or CSS even when the most visible `<img>` elements looked optimized.

Internal navigation mixed canonical trailing-slash routes with URLs that required a redirect. Some canonical pages appeared only in the sitemap and had no meaningful incoming link from another indexable page.

Metadata had been written page by page without one final-output length and uniqueness policy. Individual component tests did not expose the site-wide pattern.

Crawler-file checks had focused on the source tree. That did not distinguish between a missing built artifact, a deployment routing failure, and a stale external crawl.

## Failed or Incomplete Approaches

### Scanning Only `<img>` Elements

This missed large background images referenced by inline styles and built stylesheets. The corrected audit scans ordinary image elements, responsive sources, social metadata, inline CSS, and external built CSS.

### Scanning the Source Asset Directory

This produced noise from immutable migration evidence and unused files. The corrected audit starts with final HTML and CSS references, then checks only the local assets used by the candidate.

### Naive `srcset` Parsing

Exported filenames containing spaces caused naive whitespace splitting to identify the wrong path. The corrected parser separates candidates at commas and removes only a valid width or density descriptor from the end.

### Rasterizing SVG with an Arbitrary Density

One optimization experiment changed the effective intrinsic geometry of a vector asset and broke a visual-parity test. The corrected process preserves SVG geometry and requires screenshot and render-sharpness checks after conversion.

### Treating an Old Crawler Email as Current State

The `robots.txt` warning no longer matched the public response. The corrected process verifies the current public URL first, records the candidate and crawl date, and requires a fresh crawl after deployment.

## Fixes

- Canonicalized internal links so navigation points directly to final routes.
- Rejected links to generated redirect pages and missing built targets.
- Required incoming internal links for indexable pages, with explicit reviewed exceptions only.
- Enforced title and meta-description limits from final HTML.
- Enforced unique titles and descriptions across indexable pages.
- Checked referenced local image file size after final HTML and CSS transformations.
- Preserved original migration assets and optimized only derived output.
- Required `robots.txt` in the built candidate with an exact canonical sitemap declaration.
- Preserved a machine-readable report as release evidence.

## Reusable Implementation

The generic verifier added to Go for Launch is [`verify-site-health.mjs`](../scripts/verify-site-health.mjs). Its reviewed configuration template is [`site-health.config.mjs`](../templates/site-health.config.mjs).

The fixture suite proves both a passing candidate and failures for:

- Oversized referenced images.
- Redirecting internal links.
- Missing internal targets.
- Orphaned canonical pages.
- Titles and descriptions outside configured limits.
- Duplicate metadata.
- Incorrect sitemap declarations in `robots.txt`.

## Acceptance Evidence

The originating Astro candidate completed these checks:

- Dozens of indexable pages passed the final site-health audit.
- Dozens of rendered assets were optimized, saving several dozen MiB.
- Dozens of page-specific social cards passed generation and visual approval.
- More than five hundred Playwright tests passed across desktop Chromium, mobile Chromium, and iPhone WebKit, with reviewed intentional skips and no failures.
- The Go for Launch generic verifier independently rechecked several hundred local image references with no findings.
- The Go for Launch repository test suite passed with zero Astro diagnostics and all verifier fixtures green.

## Release Lesson

External crawlers and local build gates answer different questions. The local gate prevents known structural defects from reaching staging. A fresh public crawl verifies what the deployed hostname actually exposes. A release needs both when crawler access is available.
