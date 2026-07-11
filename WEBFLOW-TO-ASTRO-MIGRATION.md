# Webflow to Astro Migration Guide

## Purpose

This guide outlines the full process used to replace a Webflow marketing site with a component-based Astro site while preserving design, content, responsive behavior, SEO, accessibility, and performance.

The process does not require Webflow code in production. Webflow exports, live pages, CMS data, and optional DevLink component exports are migration sources. Astro becomes the production source of truth after parity is approved.

## Definition of Done

A Webflow-to-Astro migration is complete when:

- Every intended public page exists at its canonical route.
- Legacy routes redirect deliberately.
- Visible content and section order match the approved source.
- Required assets are local, optimized, and render correctly.
- Desktop, tablet, mobile, and Safari interactions work.
- Forms submit through the new backend with anti-spam protection.
- Metadata, social previews, structured data, sitemap, and crawler files are correct.
- No required production behavior depends on Webflow's runtime.
- Accessibility and performance meet the new site's release standards.
- The exact staging candidate is verified after production deployment.

## Migration Architecture

The workflow has four source layers and one final owner:

```text
Webflow ZIP export       Static markup, CSS, JavaScript references, assets
Webflow CMS CSV export   Structured records, slugs, dates, images, rich text
Live Webflow site        Responsive behavior, CMS rendering, interactions
DevLink export           Optional component-level React reference
Astro application        Final production source of truth
```

Do not treat any one source as complete. A ZIP may omit remote images. CSV files may contain duplicate slugs. The live site may have empty CMS bindings or broken interactions. DevLink exports only Webflow Components, not every page section.

## Phase 1: Repository and Source Discovery

### Confirm the real application root

Before editing, locate:

- `package.json`
- `astro.config.*`
- `src/`
- `public/`
- deployment configuration
- applicable repository instructions

Record the current branch and working tree. Preserve unrelated changes.

### Freeze the source snapshot

Keep the source export immutable. Store:

- Webflow ZIP export.
- Extracted HTML, CSS, JavaScript, images, fonts, and documents.
- CMS CSV files.
- Export date and source hostname.
- Site ID, if available.

Do not edit the frozen export to make the Astro site look correct. Fix the importer or Astro implementation.

### Verify apparently missing assets

When an HTML file references an asset absent from the ZIP:

1. Resolve the URL against the live site.
2. Check the live HTTP status and content type.
3. Determine whether the asset is remote, CMS-hosted, malformed, or genuinely missing.
4. Download only assets required for the migrated site.
5. Record the source URL, local path, hash, and status in an asset manifest.

This avoids classifying an incomplete ZIP as a broken source page.

## Phase 2: Route, Content, and Section Accounting

Create a route matrix before component work begins. Include:

- Static pages.
- Product and service pages.
- Resource listings.
- CMS detail pages.
- Legal pages.
- Error pages.
- Utility and form routes.
- Legacy redirects.
- Intentionally removed routes.

For each page, record:

- Canonical route.
- Source HTML or template.
- CMS collection and record.
- Title and description.
- Hero content.
- Section order.
- Images and documents.
- Interactions.
- Target Astro template or page component.
- Desktop, tablet, and mobile status.

Use [templates/route-and-content-inventory.md](templates/route-and-content-inventory.md) as a starting point.

### Capture an SEO baseline before rebuilding

When the site owner has a valid Ahrefs account and access is available, capture the pre-migration baseline from Ahrefs: organic keywords and positions, top pages by traffic, and pages with backlinks. Build the redirect map from that data, not only from the CMS route list, so pages that earn traffic and links are never dropped silently. Retrieve the Ahrefs API key through the secret manager, as described in [AUTOMATION-INTEGRATION.md](AUTOMATION-INTEGRATION.md).

Without Ahrefs access, use Google Search Console exports and the source platform's analytics, and record the limitation in the acceptance record.

Compare Webflow and Astro at the section level, not only the full page. Record:

- Missing sections.
- Incorrect copy.
- Wrong responsive card set.
- Missing CMS content.
- Wrong dates or publication state.
- Incorrect image or aspect ratio.
- Spacing and geometry differences.
- Interaction differences.
- Metadata differences.
- Broken behavior in the source that should not be reproduced.

Classify each difference as:

- Required parity.
- Intentional Astro improvement.
- Source defect.
- Missing source evidence.
- Deferred business decision.

## Phase 3: Optional DevLink Evaluation

Webflow DevLink can export Webflow Components to a React package. It is useful for inspection when the Webflow Designer has already modeled meaningful reusable components.

DevLink is not a complete site exporter:

- Only Webflow Components are exported.
- Ordinary page sections do not appear unless converted into Components.
- CMS content and route architecture still need separate handling.
- DevLink runtime code is not required for the final Astro implementation.

Keep DevLink tooling out of public routes. A component-export status screen is migration plumbing and should not appear on the production website.

Use DevLink as one of these:

1. A visual reference.
2. A temporary local comparison surface.
3. A source for component anatomy and class relationships.

Do not make it the permanent architecture unless React hydration is genuinely required.

## Phase 4: Build a Reproducible Import Pipeline

Avoid one-time copy and paste for CMS-heavy migrations. Build a script that converts source data into validated Astro content.

### Recommended tools

- Cheerio for HTML parsing.
- A real CSV parser for CMS exports.
- Zod or Astro schemas for content validation.
- `sanitize-html` for imported rich text.
- `slugify` for controlled slug fallbacks.
- Cryptographic hashes for asset identity.
- MIME detection for downloaded files.

### Importer responsibilities

The importer should:

1. Read static HTML and CMS CSV files.
2. Normalize text, dates, URLs, and slugs.
3. Deduplicate records using explicit rules.
4. Fail on duplicate final slugs.
5. Map source fields into typed domain models.
6. Sanitize permitted rich text.
7. Download or copy required assets.
8. Rewrite asset references to local paths.
9. Generate an asset manifest with content hashes.
10. Generate redirect records from legacy URLs.
11. Emit structured Markdown, MDX, JSON, or YAML.
12. Produce a machine-readable import report.
13. Fail when required assets or structures are unresolved.

### Preserve manual content

Generated imports should not delete:

- Astro-authored pages.
- Manually corrected publication state.
- New content created after the export.
- Editorial changes that intentionally supersede Webflow.

Use clear ownership markers or separate generated and authored directories.

### Import report

Record at least:

```json
{
  "generated": {},
  "duplicates": [],
  "skipped": [],
  "unresolvedAssets": [],
  "notes": []
}
```

An import should not be considered clean merely because it exits successfully. Review duplicate and skipped records.

## Phase 5: Define Astro Content Collections

Use explicit Astro content loaders and schemas. Define shared fields for:

- Title and slug.
- Description and excerpt.
- Publication and update dates.
- Draft and archived state.
- Tags and categories.
- Author data.
- Hero and card images.
- Sections and references.
- Calls to action.
- SEO overrides.
- Legacy URLs and redirects.

Create domain-specific schemas when page families have different requirements. A service page may need capability cards and engagement models, while an article needs author, category, and publication metadata.

After Astro upgrades, verify that content modules are populated and that generated route counts remain stable. A build that succeeds with far fewer pages is a migration failure.

## Phase 6: Create the Component System

### Foundations

Extract verified Webflow values into semantic tokens:

- Colors.
- Font families and weights.
- Type sizes and line heights.
- Spacing.
- Containers.
- Borders and radii.
- Shadows.
- Breakpoints.
- Stacking layers.

Add a base style layer for reset behavior, text rendering, focus, reduced motion, and content defaults.

### Primitive components

Useful primitives include:

- `Container`
- `Section`
- `SectionHeading`
- `Action`
- `ArrowAction`
- `ResponsiveImage`

Keep primitive APIs small. Do not force unrelated visual patterns into one universal card component.

### Shared shell

Rebuild these first because every route depends on them:

- Site header.
- Desktop dropdowns.
- Mobile navigation.
- Skip navigation.
- Site footer.
- Shared contact entry point.

Keep navigation data in one typed configuration so header and footer destinations do not drift.

### Domain patterns

Extract components around real recurring content:

- Product cards.
- Capability cards.
- Resource cards.
- Testimonial cards.
- Statistics.
- Partnership displays.
- CTA bands.
- Hero variants.
- Resource listing and article layouts.
- Service detail sections.
- Legal document layout.
- Form fields and choice tiles.

### Typed contracts

Shared data contracts should cover images, actions, headings, navigation groups, products, resources, testimonials, statistics, partnerships, and form choices.

Typed contracts make missing alt text, broken destinations, and malformed content visible before deployment.

## Phase 7: Use Compatibility CSS Deliberately

During migration, preserve verified Webflow class names and load the exported CSS as a temporary compatibility layer.

Use this order:

1. Reset or normalize styles.
2. Webflow base CSS.
3. Exported project CSS.
4. Documented compatibility corrections.
5. Astro-owned semantic component styles.

Every override should have a reason. Remove compatibility rules as Astro components assume ownership.

Do not retain browser workarounds without testing them. In the reference migration, broad text transforms and hidden backfaces intended to fix Safari flicker caused excessive compositing and scrolling risk.

The desired end state is not zero reused class names at any cost. It is clear ownership, no unnecessary runtime dependency, and measurable behavior.

## Phase 8: Migrate Route Families Incrementally

Recommended order:

1. Shared header and footer.
2. Homepage.
3. Product pages.
4. Resource listings.
5. Resource detail pages.
6. Service and capability pages.
7. Focus and compliance pages.
8. Company and partnership pages.
9. Legal pages.
10. Redirects and error pages.

For each family:

1. Implement typed content and shared templates.
2. Match one representative page at all breakpoints.
3. Add behavior and visual tests.
4. Migrate the remaining family routes.
5. Remove the old raw-page adapter for that family.
6. Record intentional differences.

Do not inject whole exported pages with `set:html`. Restrict raw HTML to sanitized rich text and structured-data payloads.

## Phase 9: Replace Webflow Runtime Interactions

Reimplement only the behavior the site needs:

- Dropdown menus.
- Mobile navigation.
- Same-page scrolling.
- Counters.
- Carousels.
- Tabs.
- Modals.
- Multi-step forms.

Use native links, buttons, details, dialogs, and form controls where appropriate. Keep JavaScript small and scoped by data attributes.

Do not reuse generated Webflow IDs as the primary Astro interaction contract. Use meaningful `data-*` attributes.

### Smooth same-page navigation

Account for fixed headers, direct hash entry, and reduced-motion preferences. Cross-page links should remain native.

### Mobile menu activation

Do not synchronously hide or detach a tapped link before Safari completes its default action. Add Playwright WebKit tests using `tap()` for a top-level link and one destination inside every dropdown.

### Scroll locking

Every modal or mobile-menu path that locks body scrolling must restore it on close, Escape, backdrop selection, success, and error.

## Phase 10: Rebuild Forms and Backend Delivery

Do not carry over Webflow form endpoints by accident.

The rebuilt form flow should include:

- Astro-rendered semantic fields.
- Clear labels and validation.
- Same-origin submission endpoint.
- Server-side field validation.
- Length limits and allowed form identifiers.
- Honeypot support where appropriate.
- Cloudflare Turnstile or equivalent anti-spam verification.
- Rate-limit handling.
- Safe email construction.
- Controlled success and error states.
- Mocked automated tests.
- One controlled staging delivery test.

Load Turnstile only when the form becomes visible. Keep token verification on the server.

## Phase 11: Rebuild Metadata and Discovery

Centralize layout metadata for:

- Unique title and description.
- Canonical URL.
- Robots directives.
- Open Graph type, URL, image, dimensions, and alt text.
- Twitter card metadata.
- Article publication and author metadata.
- Verification tags.
- Structured-data inputs.
- Breadcrumbs.

Generate a unique social image for every indexable public page at a platform-compatible size such as `1200 x 630`. This is a requirement of the Open Graph, SEO, and AI discovery work, not an enhancement. Do not share one fallback image across pages, because link previews then fail to distinguish pages in social feeds, chat clients, and AI answer surfaces. Do not use SVG as the only social preview image because many crawlers do not render it.

Automated checks should verify for each indexable page:

- The declared `og:image` URL returns HTTP 200 and a raster content type.
- The image has the exact declared dimensions.
- No two indexable pages declare the same image URL or identical image content.

Generate the images deterministically in the build pipeline from each page's title and approved brand assets so they stay current as pages change.

Verify:

- `robots.txt`
- sitemap files
- `llms.txt` and expanded AI guidance, if used
- redirects
- canonical host consistency
- public and private route indexing rules

Do not copy obsolete analytics, personalization, or tracking scripts merely for parity.

## Phase 12: Optimize Assets and First Paint

### Images

- Preserve aspect ratios.
- Add intrinsic width and height.
- Generate responsive sizes.
- Use eager loading only for likely Largest Contentful Paint assets.
- Keep below-the-fold images lazy.
- Use descriptive alt text or empty alt text for decorative images.
- Verify logos separately at mobile sizes.

### Fonts

- Self-host when appropriate.
- Preload only critical subsets.
- Use `font-display: swap` or another deliberate strategy.
- Provide stable fallback metrics.

### CSS and JavaScript

- Remove unused Webflow compatibility CSS after ownership is transferred.
- Avoid broad compositor hints.
- Avoid large live blur surfaces.
- Minify production assets.
- Inline or split route CSS only when measured and tested.
- Keep meaningful content visible before scripts execute.

### Build pipeline

A production build can include post-processing for:

- Image dimension insertion.
- Static minification.
- Route-specific CSS extraction or inlining.
- Social-card generation.
- Sitemap aliases.
- Build identifiers for deployment verification.

Every post-processing script should have tests because it can modify all generated pages.

## Phase 13: Visual and Behavioral Parity

### Reference viewports

Use at least:

- `1440 x 1000`
- `1024 x 900`
- `768 x 1024`
- `390 x 844`

Also audit horizontal overflow down to 320 CSS pixels.

### Section screenshots

Compare stable section targets rather than relying only on full-page screenshots. Include:

- Shared header and footer.
- Homepage sections.
- Representative heroes.
- Resource layouts.
- Legal content.
- Forms and modals.

Wait for fonts, images, and background images before capture. Disable animations only in screenshot tests, not in the production code.

### Route behavior matrix

For every route, verify:

- Successful HTTP response.
- One primary heading.
- Main landmark.
- Canonical and description metadata.
- No broken required images.
- Image alt attributes.
- No browser errors.
- No failed required requests.
- No horizontal overflow.
- Shared shell present.
- Substantive content present.

## Phase 14: Safari and Mobile Reliability

Follow [ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md](ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md).

Required evidence includes:

1. Playwright WebKit with an iPhone profile.
2. Native Safari in a pinned iPhone Simulator.
3. Live production WebKit tests.

Test long-page scrolling, mobile dropdowns, modals, body scroll restoration, fixed-header spacing, image aspect ratios, and first paint.

## Phase 15: Candidate-Based Deployment

The mandatory production policy is defined in [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md). Native iOS Safari Simulator testing and perfect PageSpeed category scores are release requirements, not optional recommendations.

Recommended production gate:

```text
Astro check
server and Worker tests
build-pipeline tests
production build
browser and WebKit tests
staging deployment
candidate identity verification
PageSpeed mobile and desktop gate with four required scores of 100
production deployment of the same candidate
canonical hostname verification
live WebKit tests
search-engine notification if used
```

Do not validate one build and deploy another.

After deployment, verify:

- Canonical hostname HTTP status.
- Redirect behavior.
- Representative page body and metadata.
- Static assets.
- Forms.
- Sitemap and discovery files.
- Social preview assets.
- Mobile navigation in native Safari.

Production is blocked unless mobile and desktop PageSpeed each report 100 for Performance, Accessibility, Best Practices, and SEO.

## What Was Intentionally Not Migrated

A good migration does not reproduce every source behavior. Common exclusions include:

- Broken CMS placeholders.
- Empty collection states shown to visitors by mistake.
- Malformed asset references.
- Inaccessible heading structure.
- Inaccessible menu behavior.
- Webflow personalization not required by the new site.
- Obsolete analytics.
- Broad browser hacks.
- Whole-page runtime injection.
- Public migration diagnostics.

Document each intentional difference and the reason.

## Common Failure Patterns

### The export is treated as complete

Result: missing remote assets and empty CMS sections.

Fix: compare export, CMS data, and live site.

### DevLink is treated as a site exporter

Result: only a subset of components appears.

Fix: use DevLink for components explicitly modeled in Webflow and keep a separate page and CMS migration process.

### Whole pages are injected into Astro

Result: difficult ownership, duplicated metadata, fragile scripts, and poor maintainability.

Fix: migrate route families into structured components.

### The build passes with missing pages

Result: content loaders or slug behavior changed after a framework update.

Fix: assert expected page counts and representative detail routes.

### CSS cleanup happens too early

Result: major visual drift before components own the affected styles.

Fix: retain a documented compatibility layer and remove it incrementally with screenshot evidence.

### CSS cleanup never happens

Result: unused Webflow rules, large payloads, and Safari compositing problems remain.

Fix: assign style ownership and remove compatibility rules as each component family stabilizes.

### Chromium mobile is treated as Safari

Result: dropdown, focus, scrolling, or viewport bugs reach iPhone users.

Fix: add WebKit touch tests and native Simulator checks.

### PageSpeed audits an error page

Result: misleading scores drive unrelated code changes.

Fix: inspect final URL, status, title, body identity, and runtime warnings before acting on scores.

### Production is verified only on a platform URL

Result: custom-domain routing, cache, DNS, or Worker problems remain unnoticed.

Fix: verify the canonical public hostname.

## Recommended Acceptance Criteria

Adapt these to the project:

```text
Importer unresolved required assets: 0
Duplicate final slugs: 0
Skipped required records: 0
Missing intended routes: 0
Required route HTTP failures: 0
Browser page errors: 0
Horizontal overflow failures: 0
Broken required images: 0
Primary heading violations: 0
Mobile dropdown navigation failures: 0
Visual differences: within approved threshold
Astro diagnostics: 0 errors
Production build: pass
WebKit suite: pass
Native Simulator smoke test: pass
Performance gate: pass
Canonical production verification: pass
```

## Final Handoff

Record:

- Final route inventory.
- Redirect map.
- Import report.
- Asset manifest.
- Component ownership map.
- Intentional differences.
- Automated test results.
- Simulator device and browser versions.
- Performance results.
- Deployment target and candidate identifier.
- Remaining known risks.

After approval, Astro becomes authoritative. Keep the importer and source snapshot for reproducibility and audit history, not as an ongoing hidden runtime dependency.
