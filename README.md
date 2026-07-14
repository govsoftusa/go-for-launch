# Go for Launch

A toolbox for [Astro](https://astro.build) sites. Open-source documentation, checklists, and templates for building and operating Astro websites to a strict production standard.

Go for Launch was started and is sponsored by [GovSoft](https://www.govsoft.com), and is open to community contributions. It is a community project and is not affiliated with or endorsed by the Astro project or Astro Technology Company.

## What Go for Launch Covers

The toolbox serves eleven purposes:

1. **Converting existing sites to Astro.** Complete workflows for rebuilding websites in Astro without losing content, design fidelity, responsive behavior, SEO, accessibility, performance, or browser reliability. The Webflow and WordPress workflows are proven in production, and the platform-neutral framework extends to Squarespace, Wix, Drupal, static HTML, and custom content management systems as alpha guidance.
2. **Keeping existing Astro sites current.** A maintenance process for updating Astro sites already in production to the latest compatible Astro version and dependency set, with every upgrade passing the same release gates as a new migration. See [AUTOMATION-INTEGRATION.md](AUTOMATION-INTEGRATION.md).
3. **Automated testing on web and mobile.** Browser test guidance covering Chromium, Playwright WebKit with iPhone device profiles, and native mobile Safari through the macOS Xcode iOS Simulator using a pinned device UDID. See the [Astro Mobile Safari Porting Playbook](ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md) and the [Testing and Release Checklist](TESTING-AND-RELEASE-CHECKLIST.md).
4. **A 100/100 PageSpeed standard.** A mandatory release gate requiring PageSpeed Insights scores of 100 for Performance, Accessibility, Best Practices, and SEO, on both mobile and desktop, before any production deployment. See the [Production Release Policy](PRODUCTION-RELEASE-POLICY.md).
5. **Complete sitemap and Search Console operations.** Every build must prove that its XML sitemap matches all indexable built pages. When approved Search Console access exists, verify the property, inspect its submitted sitemaps, and submit the canonical sitemap when missing. See [Sitemaps and Google Search Console](SITEMAPS-AND-SEARCH-CONSOLE.md).
6. **SEO and answer-engine content strategy.** Research real questions through Search Console, Ahrefs, support, and sales evidence, then publish focused, answer-first content with accurate optional structured data and measurable maintenance. See [Answer Engine Optimization](ANSWER-ENGINE-OPTIMIZATION.md).
7. **Reusable SEO implementation and validation.** Install a typed Astro SEO head, optimized image component, localized route map, deterministic Open Graph generator with hash-bound visual approval, and final-output validators for metadata, JSON-LD, headings, images, hreflang, and redirects. See [Astro SEO Head and Static Output Validation](SEO-HEAD-AND-VALIDATION.md).
8. **Project-controlled design-system review.** Keep framework-neutral accessibility and usability checks mandatory while allowing each project to set Material Design, Apple Liquid Glass, custom, or hybrid conformance to off, advisory, or required. See [Configurable Design-System Gate](DESIGN-GATE-POLICY.md) and [Design Optimization and Brand Continuity](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md).
9. **Mandatory render sharpness validation.** Detect accidental content blur, forced rasterization, persistent fractional transforms, unshipped fonts, and fractionally scaled inline SVGs in the exact production candidate. See [Render Sharpness Gate](RENDER-SHARPNESS.md).
10. **Side-navigation reliability.** Require native link fallbacks, valid destinations, full-item browser coverage, WebKit coverage, and native iOS Safari evidence for every persistent side rail, table of contents, policy rail, and vertical tab list.
11. **Ahrefs-style final-output health auditing.** Fail builds on oversized referenced images, weak or duplicate metadata, redirecting internal links, missing targets, orphaned canonical pages, and invalid crawler declarations. See [Ahrefs-Style Site Health Build Audit](SITE-HEALTH-AUDIT.md).

## Why This Exists

A migration or upgrade is not complete because the homepage looks similar or `astro build` succeeds. A production release must account for:

- Every public route and redirect.
- CMS content and publication state.
- Images, fonts, documents, and other assets.
- Shared navigation, footer, forms, and interactions.
- Desktop, tablet, mobile, and native Safari behavior.
- Metadata, structured data, social previews, sitemaps, and crawler guidance.
- Accessibility and keyboard behavior.
- Performance budgets and deployment verification.

This repository documents the process used to close those gaps while replacing legacy runtime code with maintainable Astro components.

## Start Here

1. [Webflow to Astro Migration Guide](WEBFLOW-TO-ASTRO-MIGRATION.md)
2. [Platform-Agnostic Migration Framework](PLATFORM-MIGRATION-FRAMEWORK.md)
3. [Astro Mobile Safari Porting Playbook](ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md)
4. [Testing and Release Checklist](TESTING-AND-RELEASE-CHECKLIST.md)
5. [Production Release Policy](PRODUCTION-RELEASE-POLICY.md)
6. [Astro Automation Integration](AUTOMATION-INTEGRATION.md)
7. [Scheduled Astro Maintenance with Desktop Agents](AUTOMATED-MAINTENANCE.md)
8. [Cloudflare Forms Default](CLOUDFLARE-FORMS.md)
9. [Sitemaps and Google Search Console](SITEMAPS-AND-SEARCH-CONSOLE.md)
10. [Answer Engine Optimization](ANSWER-ENGINE-OPTIMIZATION.md)
11. [Astro SEO Head and Static Output Validation](SEO-HEAD-AND-VALIDATION.md)
12. [Astro Assets Implementation and Verification](ASTRO-ASSETS.md)
13. [Internationalization, Canonicals, and Hreflang](INTERNATIONALIZATION-AND-HREFLANG.md)
14. [Redirect Verification](REDIRECT-VERIFICATION.md)
15. [Deterministic Open Graph Generation](OPEN-GRAPH-GENERATION.md)
16. [Configurable Design-System Gate](DESIGN-GATE-POLICY.md)
17. [Design Optimization and Brand Continuity](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md)
18. [Render Sharpness Gate](RENDER-SHARPNESS.md)
19. [Ahrefs-Style Site Health Build Audit](SITE-HEALTH-AUDIT.md)
20. [Contributing Guide](CONTRIBUTING.md)
21. [Roadmap](ROADMAP.md)

## Repository Structure

```text
.
├── README.md
├── WEBFLOW-TO-ASTRO-MIGRATION.md
├── PLATFORM-MIGRATION-FRAMEWORK.md
├── ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md
├── TESTING-AND-RELEASE-CHECKLIST.md
├── PRODUCTION-RELEASE-POLICY.md
├── AUTOMATION-INTEGRATION.md
├── AUTOMATED-MAINTENANCE.md
├── CLOUDFLARE-FORMS.md
├── SITEMAPS-AND-SEARCH-CONSOLE.md
├── ANSWER-ENGINE-OPTIMIZATION.md
├── SEO-HEAD-AND-VALIDATION.md
├── ASTRO-ASSETS.md
├── INTERNATIONALIZATION-AND-HREFLANG.md
├── REDIRECT-VERIFICATION.md
├── OPEN-GRAPH-GENERATION.md
├── DESIGN-GATE-POLICY.md
├── DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md
├── RENDER-SHARPNESS.md
├── SITE-HEALTH-AUDIT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── scripts/
│   ├── verify-sitemap.mjs
│   ├── verify-seo.mjs
│   ├── verify-images.mjs
│   ├── verify-site-health.mjs
│   ├── verify-redirects.mjs
│   ├── generate-open-graph.mjs
│   ├── verify-render-sharpness.mjs
│   └── run-design-gate.mjs
├── case-studies/
│   ├── webflow-astro-ios-safari.md
│   ├── wordpress-astro-safari-seo-performance.md
│   ├── ahrefs-astro-site-health.md
│   ├── go4launch-safari-filtered-header-menu.md
│   └── ohdt-header-announcement-hierarchy.md
└── templates/
    ├── astro-seo/SeoHead.astro
    ├── astro-assets/ResponsivePicture.astro
    ├── astro-i18n/localized-seo.ts
    ├── open-graph.config.mjs
    ├── redirects.config.mjs
    ├── site-health.config.mjs
    ├── design-gate.config.mjs
    ├── design-review-record.json
    ├── route-and-content-inventory.md
    ├── gap-analysis.md
    ├── design-optimization-brief.md
    └── migration-acceptance-record.md
```

## Core Principles

1. Treat the source platform as evidence, not as the new runtime architecture.
2. Capture routes, content, assets, behavior, and metadata before rebuilding.
3. Build static, meaningful HTML that does not depend on client JavaScript to appear.
4. Create typed components around real content patterns rather than one universal component.
5. Generate and validate a complete XML sitemap during every build.
6. Research real search questions and write focused, answer-first content that remains useful outside its surrounding page.
7. Generate unique social previews and validate metadata, JSON-LD, headings, and responsive image output from final HTML.
8. Treat each localized URL as a self-canonical page with reciprocal hreflang and complete sitemap coverage.
9. Verify trailing-slash, alternate-host, and legacy redirects over public HTTP.
10. Keep framework-neutral interface safety mandatory and let projects choose whether design-system conformance is off, advisory, or required.
11. Diagnose hierarchy, density, interaction, and responsive anatomy when project policy enables design review.
12. Preserve recognizable brand anchors unless an authorized stakeholder approves a rebrand.
13. Preserve native links and controls wherever possible.
14. Test WebKit and native iOS Safari, not only Chromium at a narrow viewport.
15. Require text, logos, and interface icons to pass the render sharpness gate.
16. Promote the exact candidate that passed staging checks.
17. Audit final HTML and CSS references for image weight, direct canonical links, internal discoverability, metadata quality, and crawler declarations.
18. Verify the canonical public hostname after deployment.
19. Record intentional differences so accessibility and performance improvements are not mistaken for missing parity.
20. Turn every discovered migration defect into a reusable test or checklist item.

## Evidence Model

Strong migration evidence combines:

- Exported source files and CMS data.
- Live source-site inspection.
- A route and section inventory.
- Asset manifests with hashes and missing-file reports.
- Automated route, interaction, accessibility, and metadata checks.
- Screenshot comparisons at multiple breakpoints.
- A machine-readable design gate result for every release, plus a completed design optimization brief when project policy enables applicable design review.
- Playwright WebKit touch tests.
- Native iPhone Simulator inspection.
- Staging performance audits.
- Canonical production verification.

No single screenshot, Lighthouse result, or passing build proves migration completeness.

## Mandatory Production Standard

Every site using Go for Launch must pass the following gate before production deployment:

1. Fetch the Go for Launch upstream, confirm the checkout is current, and record its commit.
2. Build the production candidate.
3. Generate the sitemap and verify it matches every indexable built page.
4. Run the Ahrefs-style site-health audit against final HTML, CSS, images, links, metadata, redirects, and crawler files.
5. Run the mandatory render sharpness gate and preserve its machine-readable result.
6. Run the side-navigation verifier and activate every marked navigation item in browser tests.
7. Run the automated browser, WebKit, accessibility, form, and route tests against that candidate.
8. Run the configured design-system gate and preserve its result. Only `required` design findings block production.
9. Test the candidate in native iOS Safari through Xcode Simulator using a pinned device UDID.
10. Deploy the same candidate to staging.
11. Run PageSpeed Insights against staging for mobile and desktop.
12. Require 100 for Performance, Accessibility, Best Practices, and SEO in both strategies.
13. Block production when any required test fails or any PageSpeed category is below 100.
14. Verify the sitemap, crawler files, and canonical production hostname after deployment.

The detailed policy is in [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md).

## Forms on Cloudflare

For informational sites hosted on Cloudflare, use the [Cloudflare Forms Default](CLOUDFLARE-FORMS.md). It pairs mandatory server-side Turnstile validation with a destination-restricted Cloudflare Email Service binding. This pattern keeps secrets out of the browser, prevents caller-controlled recipients, and preserves a small static Astro frontend.

## Commercial and Government Support

[GovSoft](https://www.govsoft.com) provides commercial and government implementation support for Astro websites, including migrations, current-version maintenance, accessibility, performance, native Safari testing, Cloudflare deployment, forms, release evidence, and operational handoff. Contact [hello@govsoft.com](mailto:hello@govsoft.com).

GovSoft and Go for Launch are independent of the Astro open-source project, The Astro Technology Company, and Cloudflare. Astro is named only to identify the open-source framework the work supports.

## Project Status and Platform Maturity

Webflow and WordPress are the only source platforms this toolbox has been used on in real production migrations so far. Both are backed by the implementation case studies in `case-studies/`.

Guidance for every other platform, including Squarespace, Wix, Drupal, static HTML, and custom content management systems, is an alpha implementation. It is derived from the platform-neutral framework but has not yet been exercised end to end on a production migration. Expect gaps, verify each step against the actual source platform, and treat the mandatory production gate as the safety net. Production-tested corrections and case studies for these platforms are the most valuable contributions this project can receive.

The documentation currently includes a complete Webflow-to-Astro workflow, an upgrade and dependency-maintenance process for existing Astro sites, reusable Safari testing guidance, release checklists, templates, and two implementation case studies.

## Validate Documentation

Run the repository's dependency-free documentation checks:

```bash
npm test
```

The check validates relative Markdown links and fenced code-block balance.

## Sponsors

[GovSoft](https://www.govsoft.com) sponsors Go for Launch and funds its ongoing development.

Additional sponsors are welcome. Sponsorship supports production validation of the alpha platform guidance, new adapters and test tooling, and continued maintenance. To learn more, email [hello@govsoft.com](mailto:hello@govsoft.com).

## License

This project is available under the [MIT License](LICENSE).
