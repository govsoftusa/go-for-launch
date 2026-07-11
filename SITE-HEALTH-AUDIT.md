# Ahrefs-Style Site Health Build Audit

Search crawlers often report problems that are not visible in a homepage screenshot or a basic Astro build. Oversized images, links that take an unnecessary redirect, orphaned canonical pages, weak metadata, and a missing public `robots.txt` can survive otherwise successful browser and PageSpeed tests.

Go for Launch treats these findings as build defects when they can be proven from the final static output. The reusable [`verify-site-health.mjs`](scripts/verify-site-health.mjs) script provides a deterministic local gate. Ahrefs or another approved crawler remains useful after deployment because it observes public HTTP behavior that a local build cannot prove.

Use the separate [Semantic SEO and Citation Review Gate](SEMANTIC-SEO-AND-CITATION-REVIEW.md) for title-to-content alignment, route-specific search intent, content depth, citation availability, and reviewed source support. Site health proves technical quality. Semantic review proves that editorial intent and evidence have been configured and have not drifted.

## What the Gate Checks

The verifier reads the exact output intended for staging and production. It fails when it finds:

- An indexable page title longer than the configured maximum.
- A meta description shorter or longer than the configured range.
- Duplicate titles or descriptions across indexable pages.
- A canonical URL that does not match the built route.
- An internal page link that uses a noncanonical trailing-slash form.
- An internal link to a generated redirect page or a route declared in `_redirects`.
- An internal page link whose target is absent from the build.
- An indexable canonical page with no incoming internal links, unless explicitly approved.
- A referenced local image missing from the build.
- A referenced local image larger than the configured byte budget.
- A missing `robots.txt`, a missing `User-agent` directive, or a missing exact canonical sitemap declaration.

Image discovery covers ordinary `src` values, `srcset`, `<source>` elements, Open Graph and Twitter image metadata, inline CSS, and built CSS files. This matters because a large decorative background can escape an audit that checks only `<img>` elements.

## Install the Gate

Copy these files into the target project:

- [`scripts/verify-site-health.mjs`](scripts/verify-site-health.mjs)
- [`scripts/lib/html.mjs`](scripts/lib/html.mjs)
- [`templates/site-health.config.mjs`](templates/site-health.config.mjs)

The verifier uses `cheerio`, which is already a Go for Launch dependency. Adapt the template with the real canonical origin and site policy. Then run it after every operation that changes final HTML, CSS, images, redirects, or metadata:

```json
{
  "scripts": {
    "verify:site-health": "node scripts/verify-site-health.mjs --config=site-health.config.mjs",
    "build": "astro build && npm run verify:site-health"
  }
}
```

The command writes a machine-readable JSON report. Preserve that report with release evidence.

## Image Remediation Rules

Keep imported or original assets immutable. Optimize only generated output or derived source assets so the original evidence remains available for comparison.

Use modern raster formats, responsive widths, and appropriate quality settings. Re-run the audit against final HTML and CSS because an unused source file is irrelevant, while a large background referenced by built CSS still affects visitors.

Do not repair file weight by changing visible geometry. SVG conversion must preserve its intrinsic aspect ratio and view box. Raster generation must use the intended pixel dimensions. After optimization, repeat screenshot, render-sharpness, and Open Graph review gates.

The default 100,000-byte budget reflects a strict information-site policy and the crawler finding that prompted this gate. A project may change the threshold with documented performance evidence. Use `imageByteLimits` for a narrowly scoped asset family that has a separate reviewed budget, such as 1200 by 630 social cards. Put an asset in `largeImageAllowlist` only when the larger file is intentional, measured, visually necessary, and cannot have a finite path-scoped limit. An allowlist is not a substitute for optimization.

## Internal Link and Canonical Rules

Link directly to the canonical route. Do not rely on a redirect to add or remove a trailing slash. Do not link to a legacy route that redirects to a current page. These redirects add request latency, consume crawl effort, and can hide navigation drift.

Every indexable page should have at least one meaningful incoming link from another indexable page. Sitemap inclusion alone does not make content discoverable to a visitor. Use `orphanAllowlist` only for deliberately isolated pages with written approval.

## Robots and Public Crawl Verification

The local gate proves that `robots.txt` exists in the candidate and advertises the expected sitemap. It cannot prove that Cloudflare, routing, cache state, authentication, or deployment configuration serves the file publicly.

After staging and production deployment:

1. Request `/robots.txt` over public HTTPS and require HTTP 200.
2. Confirm the body contains the exact canonical sitemap URL.
3. Request the sitemap and every child sitemap over public HTTPS.
4. Run the approved external crawler against the canonical hostname.
5. Compare fresh findings with the saved local report.

A crawler email can contain stale findings from a previous deployment. Verify the current public response before changing source, then request or wait for a fresh crawl. Record the crawl date and candidate identifier so old results are not mistaken for current defects.

## Required Order

1. Build Astro from source.
2. Generate or optimize derived images without modifying immutable originals.
3. Apply any final HTML and CSS transformations.
4. Generate and approve Open Graph cards.
5. Generate and verify the sitemap.
6. Run SEO, image, site-health, semantic SEO, interface-quality, side-navigation, and render-sharpness gates.
7. Run browser, WebKit, native iOS Safari, accessibility, and form tests.
8. Deploy the exact candidate to staging.
9. Verify public crawler files and run PageSpeed for mobile and desktop.
10. Run an approved external crawl when access is available.

Any source or generated-output change after these checks requires a rebuild and repetition of every affected gate.
