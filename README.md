# Go for Launch

A toolbox for [Astro](https://astro.build) sites. Open-source documentation, checklists, and templates for building and operating Astro websites to a strict production standard.

**Current version:** 0.5.0

Go for Launch was started and is sponsored by [GovSoft](https://www.govsoft.com), and is open to community contributions. It is a community project and is not affiliated with or endorsed by the Astro project or Astro Technology Company.

## What Go for Launch Covers

The toolbox serves twenty-five purposes:

1. **Converting existing sites to Astro.** Complete workflows for rebuilding websites in Astro without losing content, design fidelity, responsive behavior, SEO, accessibility, performance, or browser reliability. The Webflow and WordPress workflows are proven in production, and the platform-neutral framework extends to Squarespace, Wix, Drupal, static HTML, and custom content management systems as alpha guidance.
2. **Keeping existing Astro sites current.** A maintenance process for updating Astro sites already in production to the latest compatible Astro version and dependency set, with every upgrade passing the same release gates as a new migration. See [AUTOMATION-INTEGRATION.md](AUTOMATION-INTEGRATION.md).
3. **Automated testing on web and mobile.** Browser test guidance covering Chromium, Playwright WebKit with iPhone device profiles, native mobile Safari through the macOS Xcode iOS Simulator using a pinned device UDID, and mandatory [visual composition testing](VISUAL-COMPOSITION-TESTING.md) for generated and CSS-rendered artwork. See the [Astro Mobile Safari Porting Playbook](ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md) and the [Testing and Release Checklist](TESTING-AND-RELEASE-CHECKLIST.md).
4. **A 100/100 PageSpeed standard.** A mandatory release gate requiring PageSpeed Insights scores of 100 for Performance, Accessibility, Best Practices, and SEO, on both mobile and desktop, before any production deployment. See the [Production Release Policy](PRODUCTION-RELEASE-POLICY.md).
5. **Cloudflare production observability.** Query approved real-user Core Web Vitals and optional edge HTTP analytics, preserve historical baselines, identify the exact LCP element and asset, and detect post-release regressions that a controlled PageSpeed run may not expose. See [Cloudflare Production Observability](CLOUDFLARE-OBSERVABILITY.md).
6. **Complete sitemap and Search Console operations.** Every build must prove that its XML sitemap matches all indexable built pages. When approved Search Console access exists, verify the property, inspect its submitted sitemaps, and submit the canonical sitemap when missing. See [Sitemaps and Google Search Console](SITEMAPS-AND-SEARCH-CONSOLE.md).
7. **SEO and answer-engine content strategy.** Research real questions through credible sources available to the project, including first-party support, sales, analytics, site-search, and form evidence. Add Search Console when approved property access exists and use Ahrefs only as an optional source when the project approves access. Then publish focused, answer-first content with accurate optional structured data and measurable maintenance. See [Answer Engine Optimization](ANSWER-ENGINE-OPTIMIZATION.md).
8. **Reusable SEO implementation and validation.** Install a typed Astro SEO head, optimized image component, localized route map, deterministic Open Graph generator with hash-bound visual approval, and final-output validators for metadata, JSON-LD, headings, images, hreflang, and redirects. See [Astro SEO Head and Static Output Validation](SEO-HEAD-AND-VALIDATION.md).
9. **Project-controlled design-system review.** Keep framework-neutral accessibility and usability checks mandatory while allowing each project to set Material Design, Apple Liquid Glass, custom, or hybrid conformance to off, advisory, or required. See [Configurable Design-System Gate](DESIGN-GATE-POLICY.md) and [Design Optimization and Brand Continuity](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md).
10. **Interface quality and page differentiation.** Test every indexable route at expanded, compact desktop, tablet, mobile, and 320 CSS pixel widths for control collisions, clipping, overflow, clearance, reviewed header and hero proportions, and measured route-family differences in structure, layout, palette, typography, and media. See [Interface Quality and Page Differentiation Gate](INTERFACE-QUALITY-AND-PAGE-DIFFERENTIATION.md).
11. **Mandatory render sharpness validation.** Detect accidental content blur, forced rasterization, persistent fractional transforms, unshipped fonts, and fractionally scaled inline SVGs in the exact production candidate. See [Render Sharpness Gate](RENDER-SHARPNESS.md).
12. **Side-navigation reliability.** Require native link fallbacks, valid destinations, full-item browser coverage, WebKit coverage, and native iOS Safari evidence for every persistent side rail, table of contents, policy rail, and vertical tab list.
13. **Ahrefs-style final-output health auditing.** Fail builds on oversized referenced images, weak or duplicate metadata, redirecting internal links, missing targets, orphaned canonical pages, and invalid crawler declarations. See [Ahrefs-Style Site Health Build Audit](SITE-HEALTH-AUDIT.md).
14. **Semantic SEO and citation review.** Require canonical consistency, descriptive and content-aligned titles, route-specific search intent, reviewed content depth, valid citation links, and evidence records that detect claim or source drift. Use Ahrefs API v3 as an optional public-crawl input when approved access exists. See [Semantic SEO and Citation Review Gate](SEMANTIC-SEO-AND-CITATION-REVIEW.md).
15. **Stanford Rule content quality.** Define the audience and task for every page, check final HTML for machine-like filler, inflated language, excessive sentence and paragraph length, repetitive openings, inaccessible reading density, and cross-route copy similarity, then require a hash-bound editorial review from a senior psychology professor perspective. See [Stanford Rule Content Quality Gate](STANFORD-RULE-CONTENT-QUALITY.md).
16. **Bounded delivery without weaker gates.** Define the task envelope, classify findings, prototype subjective work, stop repeated remediation, preserve checkpoints, freeze exact candidates, and separate follow-up work while retaining every mandatory mobile, desktop, WebKit, native Safari, and PageSpeed release requirement. See [Execution Control and Bounded Delivery](EXECUTION-CONTROL.md).
17. **Verified PageSpeed document readiness.** When a dynamic site intentionally warms HTML before PageSpeed, issue a real browser-document request, prove the exact candidate and reusable cache state, and preserve that report without weakening cold-path tests or the 100 requirement. See [PageSpeed Document Readiness](PAGESPEED-READINESS.md).
18. **CMS publishing without application rebuilds.** Classify CMS record and media changes into a dedicated editorial lane, validate the changed route graph and conserve performance without rebuilding Astro, and escalate any renderer or infrastructure change to the unchanged full application release gate. See [Editorial Publishing and Dynamic Content](EDITORIAL-PUBLISHING-AND-DYNAMIC-CONTENT.md).
19. **CMS authentication and session continuity.** Prove the credential assertion, immediate authenticated identity, real collection lists, existing editors, and a disposable draft lifecycle against the compiled private candidate. See [CMS Authentication and Session Gate](CMS-AUTHENTICATION-SESSION-GATE.md).
20. **Optional incremental static builds with a mandatory decision gate.** Before every Astro application build, inspect the changed content and rendering dependency graph, then select a standard, incremental, or forced build. Incremental reuse requires reviewed cache keys, persistent isolated cache state, measured benefit, and full-render parity. See [Incremental Static Build Decision Gate](INCREMENTAL-STATIC-BUILDS.md).
21. **Agent-facing discovery signals.** Publish and validate an accurate `llms.txt`, advertise it and the sitemap through Cloudflare `Link` headers, and record which experimental agent protocols do not apply to the project. These signals supplement ordinary crawlability and never replace SEO, sitemaps, or useful content. See [Answer Engine Optimization](ANSWER-ENGINE-OPTIMIZATION.md).
22. **Frozen release evidence and route convergence.** Bind browser, PageSpeed, deployment, artifact, public-route, and canonical-host evidence to one immutable candidate, then prove that staging and production converge on it before promotion is accepted. See [Production Release Policy](PRODUCTION-RELEASE-POLICY.md) and the reusable `release-evidence` and `route-convergence` templates.
23. **Legacy content and cache integrity.** Sanitize noncontent rich text before structured conversion, preserve revision state, inventory generated output, detect executable text, and verify each cache layer against the canonical route. See [Legacy Rich Text Sanitization and Cache Repair](LEGACY-RICH-TEXT-SANITIZATION-AND-CACHE-REPAIR.md).
24. **Provider topology and release closeout.** Inventory provider services, routes, bindings, queues, schedules, preview hosts, DNS, and shared workloads, then retire obsolete candidates without touching unrelated account resources. See [Production Release Policy](PRODUCTION-RELEASE-POLICY.md).
25. **Large-site verification and request budgeting.** Order inexpensive content gates before archive crawls, cap provider requests, verify direct media objects, preserve the first valid failure, and keep exact-candidate coverage practical for large publications. See [Request Budget and Large-Site Verification](REQUEST-BUDGET-AND-LARGE-SITE-VERIFICATION.md).

## Shipped Feature Inventory

Version 0.5.0 includes documentation, reusable templates, and executable
verifiers. Projects copy the applicable configuration into their own
repository, replace the neutral examples, and add the required commands to
their build and release pipeline.

| Capability | Shipped implementation |
| --- | --- |
| Sitemap, SEO, structured data, headings, images, i18n, and redirects | `verify-sitemap.mjs`, `verify-seo.mjs`, `verify-images.mjs`, `verify-redirects.mjs`, `SeoHead.astro`, `ResponsivePicture.astro`, and `localized-seo.ts` |
| AEO content and agent discovery | `ANSWER-ENGINE-OPTIMIZATION.md`, `verify-aeo.mjs`, and `templates/llms.txt` |
| Site health, semantic SEO, citations, and content quality | `verify-site-health.mjs`, `verify-semantic-seo.mjs`, `verify-content-quality.mjs`, optional Ahrefs verification, and the Stanford Rule review records |
| Open Graph, brand, artwork, and visual quality | Deterministic Open Graph generation and review, brand provenance, artwork suitability, visual composition, interface quality, side-navigation, render-sharpness, and configurable design-gate checks |
| Browser, mobile, and performance release gates | Chromium, Playwright WebKit, native iOS Safari guidance, PageSpeed readiness, route parity, route convergence, Cloudflare observability, and exact-candidate release evidence |
| Build and delivery control | Incremental-build decision, bounded execution, clean artifact, ignored-input, provider-topology, and candidate-retirement requirements |
| Dynamic publishing and protected CMS operation | Editorial publish verification, CMS authentication and session continuity, deterministic fonts, challenge validation, cache-layer proof, and revision-safe artifact replacement |
| Migration and large-site work | Platform-neutral, Webflow, WordPress, and EmDash workflows, source compromise review, direct-object media preflight, request budgeting, rich text repair, extraction, import, and redirect generation |
| Cloudflare operations | Static-host deployment policy, Turnstile plus Email Service forms, apex canonical redirects, staging proof, production observability, and provider closeout |
| Agent-driven maintenance | Claude Desktop and ChatGPT Desktop MCP scheduling guidance, prompt logging, external-service onboarding, platform limitations, and scheduled Astro maintenance |

The executable package entry points are listed in `package.json`. The full
framework test suite covers every reusable verifier with deterministic
fixtures. Provider-backed and native Safari checks remain project-level gates
because they require the target account, domain, candidate, or macOS simulator.

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

1. [Project Onboarding, Requirements, and External Services](PROJECT-ONBOARDING.md)
2. [Execution Control and Bounded Delivery](EXECUTION-CONTROL.md)
3. [Project-Specific Extensions](PROJECT-EXTENSIONS.md)
4. [Changelog](CHANGELOG.md)
5. [Webflow to Astro Migration Guide](WEBFLOW-TO-ASTRO-MIGRATION.md)
6. [Platform-Agnostic Migration Framework](PLATFORM-MIGRATION-FRAMEWORK.md)
7. [WordPress to EmDash on Astro Migration Guide](WORDPRESS-TO-EMDASH-MIGRATION.md)
8. [Editorial Publishing and Dynamic Content](EDITORIAL-PUBLISHING-AND-DYNAMIC-CONTENT.md)
9. [EmDash Editorial Readiness Plugin](EMDASH-EDITORIAL-READINESS-PLUGIN.md)
10. [Pre-Migration Source Compromise Audit](SOURCE-COMPROMISE-AUDIT.md)
11. [Astro Mobile Safari Porting Playbook](ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md)
12. [Testing and Release Checklist](TESTING-AND-RELEASE-CHECKLIST.md)
13. [Production Release Policy](PRODUCTION-RELEASE-POLICY.md)
14. [Astro Automation Integration](AUTOMATION-INTEGRATION.md)
15. [Incremental Static Build Decision Gate](INCREMENTAL-STATIC-BUILDS.md)
16. [Scheduled Astro Maintenance with Desktop Agents](AUTOMATED-MAINTENANCE.md)
17. [Cloudflare Forms Default](CLOUDFLARE-FORMS.md)
18. [Cloudflare Production Observability](CLOUDFLARE-OBSERVABILITY.md)
19. [Sitemaps and Google Search Console](SITEMAPS-AND-SEARCH-CONSOLE.md)
20. [Answer Engine Optimization](ANSWER-ENGINE-OPTIMIZATION.md)
21. [Astro SEO Head and Static Output Validation](SEO-HEAD-AND-VALIDATION.md)
22. [Astro Assets Implementation and Verification](ASTRO-ASSETS.md)
23. [Internationalization, Canonicals, and Hreflang](INTERNATIONALIZATION-AND-HREFLANG.md)
24. [Redirect Verification](REDIRECT-VERIFICATION.md)
25. [Deterministic Open Graph Generation](OPEN-GRAPH-GENERATION.md)
26. [Brand Asset Provenance and Usage](BRAND-ASSET-PROVENANCE.md)
27. [Visual Composition Testing](VISUAL-COMPOSITION-TESTING.md)
28. [Configurable Design-System Gate](DESIGN-GATE-POLICY.md)
29. [Design Optimization and Brand Continuity](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md)
30. [Interface Quality and Page Differentiation Gate](INTERFACE-QUALITY-AND-PAGE-DIFFERENTIATION.md)
31. [Case Study Normalization Policy](CASE-STUDY-NORMALIZATION.md)
32. [Render Sharpness Gate](RENDER-SHARPNESS.md)
33. [Ahrefs-Style Site Health Build Audit](SITE-HEALTH-AUDIT.md)
34. [Semantic SEO and Citation Review Gate](SEMANTIC-SEO-AND-CITATION-REVIEW.md)
35. [Stanford Rule Content Quality Gate](STANFORD-RULE-CONTENT-QUALITY.md)
36. [Contributing Guide](CONTRIBUTING.md)
37. [Roadmap](ROADMAP.md)
38. [PageSpeed Document Readiness](PAGESPEED-READINESS.md)
39. [CMS Authentication and Session Gate](CMS-AUTHENTICATION-SESSION-GATE.md)
40. [Legacy Rich Text Sanitization and Cache Repair](LEGACY-RICH-TEXT-SANITIZATION-AND-CACHE-REPAIR.md)
41. [Request Budget and Large-Site Verification](REQUEST-BUDGET-AND-LARGE-SITE-VERIFICATION.md)

## Repository Structure

```text
.
├── README.md
├── CHANGELOG.md
├── PROJECT-ONBOARDING.md
├── EDITORIAL-PUBLISHING-AND-DYNAMIC-CONTENT.md
├── EMDASH-EDITORIAL-READINESS-PLUGIN.md
├── EXECUTION-CONTROL.md
├── PROJECT-EXTENSIONS.md
├── CASE-STUDY-NORMALIZATION.md
├── CMS-AUTHENTICATION-SESSION-GATE.md
├── LEGACY-RICH-TEXT-SANITIZATION-AND-CACHE-REPAIR.md
├── REQUEST-BUDGET-AND-LARGE-SITE-VERIFICATION.md
├── WEBFLOW-TO-ASTRO-MIGRATION.md
├── PLATFORM-MIGRATION-FRAMEWORK.md
├── WORDPRESS-TO-EMDASH-MIGRATION.md
├── SOURCE-COMPROMISE-AUDIT.md
├── ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md
├── TESTING-AND-RELEASE-CHECKLIST.md
├── PRODUCTION-RELEASE-POLICY.md
├── PAGESPEED-READINESS.md
├── AUTOMATION-INTEGRATION.md
├── INCREMENTAL-STATIC-BUILDS.md
├── AUTOMATED-MAINTENANCE.md
├── CLOUDFLARE-FORMS.md
├── CLOUDFLARE-OBSERVABILITY.md
├── SITEMAPS-AND-SEARCH-CONSOLE.md
├── ANSWER-ENGINE-OPTIMIZATION.md
├── SEO-HEAD-AND-VALIDATION.md
├── ASTRO-ASSETS.md
├── INTERNATIONALIZATION-AND-HREFLANG.md
├── REDIRECT-VERIFICATION.md
├── OPEN-GRAPH-GENERATION.md
├── BRAND-ASSET-PROVENANCE.md
├── VISUAL-COMPOSITION-TESTING.md
├── DESIGN-GATE-POLICY.md
├── DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md
├── INTERFACE-QUALITY-AND-PAGE-DIFFERENTIATION.md
├── RENDER-SHARPNESS.md
├── SITE-HEALTH-AUDIT.md
├── SEMANTIC-SEO-AND-CITATION-REVIEW.md
├── STANFORD-RULE-CONTENT-QUALITY.md
├── CONTRIBUTING.md
├── SECURITY.md
├── scripts/
│   ├── verify-sitemap.mjs
│   ├── verify-seo.mjs
│   ├── verify-aeo.mjs
│   ├── verify-images.mjs
│   ├── verify-site-health.mjs
│   ├── verify-semantic-seo.mjs
│   ├── verify-content-quality.mjs
│   ├── verify-ahrefs-site-audit.mjs
│   ├── verify-cloudflare-observability.mjs
│   ├── verify-redirects.mjs
│   ├── verify-route-parity.mjs
│   ├── verify-route-convergence.mjs
│   ├── verify-pagespeed-warmup.mjs
│   ├── verify-incremental-build-decision.mjs
│   ├── verify-execution-control.mjs
│   ├── verify-editorial-publish.mjs
│   ├── verify-release-evidence.mjs
│   ├── wp-extract.mjs
│   ├── emdash-seed.mjs
│   ├── emdash-import.mjs
│   ├── generate-redirects.mjs
│   ├── generate-open-graph.mjs
│   ├── verify-brand-assets.mjs
│   ├── verify-visual-composition.mjs
│   ├── verify-interface-quality.mjs
│   ├── verify-side-navigation.mjs
│   ├── verify-case-study-normalization.mjs
│   ├── verify-render-sharpness.mjs
│   └── run-design-gate.mjs
├── case-studies/
│   ├── webflow-astro-ios-safari.md
│   ├── wordpress-emdash-news-archive-migration.md
│   ├── wordpress-astro-safari-seo-performance.md
│   ├── ahrefs-astro-site-health.md
│   ├── cloudflare-rum-hidden-viewport-lcp.md
│   ├── filtered-header-mobile-safari-menu.md
│   ├── multi-page-interface-quality.md
│   ├── wordpress-emdash-cloudflare-release-hardening.md
│   ├── release-gate-throughput-on-a-large-archive.md
│   ├── association-header-announcement-hierarchy.md
│   └── association-navigation-render-sharpness.md
└── templates/
    ├── astro-seo/SeoHead.astro
    ├── astro-assets/ResponsivePicture.astro
    ├── astro-i18n/localized-seo.ts
    ├── llms.txt
    ├── open-graph.config.mjs
    ├── brand-assets.config.mjs
    ├── visual-composition.config.mjs
    ├── interface-quality.config.mjs
    ├── redirects.config.mjs
    ├── wp-extract.config.json
    ├── emdash-migration.config.mjs
    ├── site-health.config.mjs
    ├── semantic-seo.config.mjs
    ├── content-quality.config.mjs
    ├── content-quality.reviews.json
    ├── ahrefs-site-audit.config.mjs
    ├── cloudflare-observability.config.mjs
    ├── pagespeed-warmup.config.mjs
    ├── incremental-build.config.mjs
    ├── route-convergence.config.mjs
    ├── release-evidence.config.mjs
    ├── design-gate.config.mjs
    ├── design-review-record.json
    ├── route-and-content-inventory.md
    ├── gap-analysis.md
    ├── design-optimization-brief.md
    ├── project-onboarding.md
    ├── execution-control-record.md
    ├── execution-control.config.mjs
    ├── editorial-publish-record.md
    ├── editorial-publish.config.mjs
    ├── cms-authentication-session-record.md
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
12. Give every route family a reader-centered archetype and verify control geometry, clearance, responsive transitions, and measured page differentiation.
13. Preserve recognizable brand anchors unless an authorized stakeholder approves a rebrand.
14. Preserve native links and controls wherever possible.
15. Test WebKit and native iOS Safari, not only Chromium at a narrow viewport.
16. Assert the viewport-specific network resource set and require preloads to match the measured LCP resource.
17. Require text, logos, and interface icons to pass the render sharpness gate.
18. Promote the exact candidate that passed staging checks.
19. Audit final HTML and CSS references for image weight, direct canonical links, internal discoverability, metadata quality, and crawler declarations.
20. Require each indexable route to have a reviewed search intent, content-depth policy, and title that agrees with its visible subject.
21. Treat citation URL validity and evidence-to-claim review as release data, not informal editorial memory.
22. Define the intended audience and primary task for every public page, compare copy across content families, then require a passing Stanford Rule content quality report tied to the exact built text.
23. Verify the canonical public hostname after deployment.
24. Capture approved Cloudflare production RUM before a release and compare it after sufficient traffic reaches the promoted candidate.
25. Record intentional differences so accessibility and performance improvements are not mistaken for missing parity.
26. Turn every discovered migration defect into a reusable test or checklist item.
27. Bound scope, remediation, and progress reporting without weakening any mandatory release gate.
28. Prove that every claimed PageSpeed document warmup follows the browser navigation path and reaches observable reusable cache state.
29. Curate and hash-bind representative social-card artwork with route relevance, rights, third-party-mark, and synthetic-artwork review before bulk generation.
30. Preflight PageSpeed provider access, preserve the first valid failed score, and diagnose filmstrip, network, and LCP evidence before another attempt.
31. Isolate protected, public, and apex redirect services when an outer cache can answer before Worker middleware.
32. Verify apex redirects with GET and HEAD, including root, path, and query, before release signoff.
33. Fill only empty external-provider PageSpeed slots with exact-candidate supplements, never replace a scored result.
34. Assess every Astro application build before rendering and use incremental page reuse only when cache correctness, persistence, parity, and measured benefit pass.

## Evidence Model

Strong migration evidence combines:

- Exported source files and CMS data.
- Live source-site inspection.
- A route and section inventory.
- A completed execution-control record with the task envelope, finding classifications, checkpoints, blocker decisions, and exact-candidate identity.
- A passing machine-readable execution-control report for the current phase, including every mandatory gate and both PageSpeed strategies at four scores of 100 before production readiness.
- Asset manifests with hashes and missing-file reports.
- Automated route, interaction, accessibility, and metadata checks.
- Screenshot comparisons at multiple breakpoints.
- A machine-readable design gate result for every release, plus a completed design optimization brief when project policy enables applicable design review.
- A machine-readable interface-quality report covering every route, required viewport, browser, clearance contract, hero and header rule, and route-family comparison.
- A machine-readable semantic SEO report with page-intent coverage, content-depth rules, citation checks, and reviewed evidence records.
- Playwright WebKit touch tests.
- Native iPhone Simulator inspection.
- Staging performance audits.
- Cloudflare production RUM and edge HTTP evidence when approved access exists.
- A passing prebuild decision report recording standard, incremental, or forced mode, plus cache and parity evidence when incremental.
- Canonical production verification.

No single screenshot, Lighthouse result, or passing build proves migration completeness.

## Mandatory Production Standard

Every site using Go for Launch must pass the following gate before production deployment:

1. Fetch the Go for Launch upstream, confirm the checkout is current, and record its commit.
2. Inspect the current content and rendering dependency graph, then verify the standard, incremental, or forced build decision.
3. Build the production candidate in the selected mode.
4. Generate the sitemap and verify it matches every indexable built page.
5. Run the Ahrefs-style site-health audit against final HTML, CSS, images, links, metadata, redirects, and crawler files.
6. Run the semantic SEO gate against canonicals, titles, page intent, content depth, and citations.
7. Run the Stanford Rule content quality gate and preserve its hash-bound editorial review.
8. Run the mandatory render sharpness gate and preserve its machine-readable result.
9. Run the interface-quality and page-differentiation gate across every indexable route and required viewport.
10. Run the side-navigation verifier and activate every marked navigation item in browser tests.
11. Run visual composition verification, then run the automated browser, WebKit, accessibility, form, and route tests against that candidate.
12. Run the configured design-system gate and preserve its result. Only `required` design findings block production.
13. Test the candidate in native iOS Safari through Xcode Simulator using a pinned device UDID.
14. Verify the desktop and mobile network resource sets and confirm preloads match the measured LCP resources.
15. Capture an advisory Cloudflare production baseline when approved account analytics access exists.
16. Deploy the same candidate to staging.
17. When the PageSpeed process warms dynamic HTML, verify browser-document cache readiness for every audited URL, then run PageSpeed Insights against staging for mobile and desktop.
18. Require 100 for Performance, Accessibility, Best Practices, and SEO in both strategies.
19. Run Ahrefs Site Audit when approved API or crawler access exists.
20. Block production when any required test fails or any PageSpeed category is below 100.
21. Verify the sitemap, crawler files, citations, and canonical production hostname after deployment.
22. Query Cloudflare immediately for edge errors and repeat RUM comparison after sufficient production traffic when approved access exists.

The detailed policy is in [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md).

## Forms on Cloudflare

For informational sites hosted on Cloudflare, use the [Cloudflare Forms Default](CLOUDFLARE-FORMS.md). It pairs mandatory server-side Turnstile validation with a destination-restricted Cloudflare Email Service binding. This pattern keeps secrets out of the browser, prevents caller-controlled recipients, and preserves a small static Astro frontend.

## Commercial and Government Support

[GovSoft](https://www.govsoft.com) provides commercial and government implementation support for Astro websites, including migrations, current-version maintenance, accessibility, performance, native Safari testing, Cloudflare deployment, forms, release evidence, and operational handoff. Contact [hello@govsoft.com](mailto:hello@govsoft.com).

GovSoft and Go for Launch are independent of the Astro open-source project, The Astro Technology Company, and Cloudflare. Astro is named only to identify the open-source framework the work supports.

## Project Status and Platform Maturity

Webflow and WordPress are the only source platforms this toolbox has been used on in real production migrations so far. Both are backed by the implementation case studies in `case-studies/`. The completed large-publication cutover, cache-isolation findings, forms, Safari, social-card, and 100-point PageSpeed evidence are documented in [WordPress to EmDash Cloudflare Release Hardening](case-studies/wordpress-emdash-cloudflare-release-hardening.md).

Guidance for every other platform, including Squarespace, Wix, Drupal, static HTML, and custom content management systems, is an alpha implementation. It is derived from the platform-neutral framework but has not yet been exercised end to end on a production migration. Expect gaps, verify each step against the actual source platform, and treat the mandatory production gate as the safety net. Production-tested corrections and case studies for these platforms are the most valuable contributions this project can receive.

The documentation currently includes a complete Webflow-to-Astro workflow, an upgrade and dependency-maintenance process for existing Astro sites, reusable Safari testing guidance, release checklists, templates, and implementation case studies.

## Validate Documentation

Run the repository's dependency-free documentation checks:

```bash
npm test
```

The check validates the README version, relative Markdown links, fenced code-block balance, and the case-study normalization policy. Run the dedicated normalization gate with `npm run case-studies:verify` when reviewing case-study changes.

## Sponsors

[GovSoft](https://www.govsoft.com) sponsors Go for Launch and funds its ongoing development.

Additional sponsors are welcome. Sponsorship supports production validation of the alpha platform guidance, new adapters and test tooling, and continued maintenance. To learn more, email [hello@govsoft.com](mailto:hello@govsoft.com).

## License

This project is available under the [MIT License](LICENSE).
