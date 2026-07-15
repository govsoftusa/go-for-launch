# Astro Automation Integration

This document tells scheduled maintenance automations and coding agents how to use this toolkit when maintaining Astro sites under a local development root.

The toolkit is the release gate source of truth for migrated, imported, or upgraded Astro sites. It covers keeping existing Astro sites on the latest compatible Astro version and dependency set, and it requires every upgrade to pass the same browser, Simulator, and PageSpeed gates as a new migration. Automation prompts may add project-specific constraints, but they must not weaken the gates in this repository.

## Scope

Use this process for each Astro site that may be built, staged, or deployed by an automation:

- Dependency maintenance for Astro and compatible framework packages.
- Webflow, WordPress, static HTML, or other platform imports into Astro.
- Cloudflare Pages or Workers deployments.
- Any production release after a framework, asset, layout, content, interaction, SEO, or deployment change.
- Design optimization, responsive refactoring, visual modernization, or brand-system implementation.

## Required Files

Every run must read these files before deciding whether a site can deploy:

- `AGENTS.md`
- `README.md`
- `ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md`
- `TESTING-AND-RELEASE-CHECKLIST.md`
- `PRODUCTION-RELEASE-POLICY.md`
- `AUTOMATION-INTEGRATION.md`
- `SITEMAPS-AND-SEARCH-CONSOLE.md`
- `ANSWER-ENGINE-OPTIMIZATION.md`
- `SEO-HEAD-AND-VALIDATION.md`
- `ASTRO-ASSETS.md`
- `INTERNATIONALIZATION-AND-HREFLANG.md`
- `REDIRECT-VERIFICATION.md`
- `OPEN-GRAPH-GENERATION.md`
- `DESIGN-GATE-POLICY.md`
- `DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md`
- `RENDER-SHARPNESS.md`
- `CLOUDFLARE-OBSERVABILITY.md`

If this repository changes, the automation must treat the current files as authoritative instead of relying on older automation memory.

Before creating any production candidate, fetch the toolkit's configured upstream branch and compare it with the checked-out revision. Continue only when the checkout is current, or when a reviewed pin with a reason and upgrade condition is documented. Record the toolkit commit in the release evidence. A missing upstream, failed comparison, or checkout behind upstream is a production blocker.

## Per-Site Build Process

For each eligible Astro root:

1. Fetch the Go for Launch upstream, confirm the checkout is current, and record its commit.
2. Read the target repository instructions and deployment docs.
3. Establish a clean git baseline or a deliberate local snapshot commit before edits.
4. Install with the site package manager.
5. Run available diagnostics, type checks, lint, tests, and app-specific smoke checks.
6. Read the project design configuration. Keep core interface safety mandatory in every mode. When `advisory` or `required` design review applies, complete the design optimization brief, inventory brand anchors, diagnose hierarchy and density, define responsive anatomy, and record baseline evidence before changing styles.
7. Build the exact production candidate through a command that generates and validates the complete sitemap.
8. Run the mandatory render sharpness gate against the exact build and preserve its JSON report. If explicit source auto-fix changes a file, rebuild before continuing.
9. Discover every persistent side rail, table of contents, policy rail, and vertical tab list. Mark each region and item, run the side-navigation verifier against the exact build, and activate every item in Chromium and WebKit tests.
10. Compare every indexable built canonical with the generated sitemap and verify the exact sitemap URL in `robots.txt`.
11. Validate final HTML metadata, JSON-LD, heading hierarchy, Open Graph files, image dimensions, and responsive image output.
12. Run the Ahrefs-style site-health audit against final HTML, CSS, referenced image weight, internal links, redirect targets, orphaned canonical pages, metadata limits, and `robots.txt`. Preserve its JSON report.
13. Run the semantic SEO audit against canonical origin, title quality, title-to-content alignment, route-specific intent, reviewed content depth, citation URL availability, and citation evidence drift. Preserve its JSON report.
14. For localized sites, validate self-canonicals, reciprocal hreflang clusters, `x-default`, localized sitemap entries, and localized navigation.
15. Always run accessibility preferences, text resize, reflow, interaction, and responsive safety checks. When design review applies, also capture and inspect the configured viewports, route families, and design-system criteria.
16. Run Playwright WebKit with an iPhone profile when the repo has Playwright coverage or when the automation adds a temporary smoke suite.
17. Record desktop and mobile first-viewport requests, reject hidden-viewport downloads, and confirm every preload matches the measured LCP resource.
18. Test the built candidate in native iOS Safari using an explicit Simulator UDID, including representative side-navigation interaction.
19. Capture an advisory Cloudflare production RUM baseline when the canonical site is Cloudflare-hosted and approved Account Analytics Read access exists.
20. Deploy the exact candidate to staging when a staging target is documented.
21. Verify staging serves the expected candidate, canonical metadata, sitemap, child sitemaps, robots declaration, citations, and every side-navigation destination.
22. Run PageSpeed Insights against staging for mobile and desktop.
23. Require 100 for Performance, Accessibility, Best Practices, and SEO in both strategies.
24. Run Ahrefs Site Audit against the current project when approved API v3 or crawler access exists, and preserve pass, fail, or allowed skipped evidence.
25. Run the design gate, preserve its result, and deploy production only when all core gates and every configured required gate pass and the production target is unambiguous.
26. Verify the canonical production hostname with live HTTP checks, sitemap checks, citation checks, redirect checks, complete side-navigation coverage, WebKit smoke coverage, and native iOS Safari smoke coverage.
27. Query approved Cloudflare edge HTTP analytics immediately, then compare production RUM after sufficient traffic and preserve every report or explicit skipped state.
28. Verify the opposite trailing-slash form, alternate origins, and approved legacy routes redirect in one permanent hop with path and query preservation.
29. When approved Search Console access exists, verify property access, list submitted sitemaps, submit the canonical sitemap when missing, and record the resulting status.
30. When SEO or content work is in scope, research query language from approved Search Console, Ahrefs, support, sales, or analytics evidence before adding answer-focused content.

If a site has only a production deploy script and no safe staging target, do not deploy production unless the repo documentation explicitly allows the production target to serve as the release gate for that site.

## iOS Simulator Isolation

Native iOS Safari checks must use a Simulator device selected for the current site run.

Before opening Safari:

1. List booted devices.
2. If no device is booted, boot a chosen iPhone Simulator and record its UDID.
3. If a booted Simulator may be in use by another site, do not reuse it.
4. Create or select a separate iPhone Simulator device for the current site.
5. Boot the selected UDID and wait for boot status.
6. Open Simulator pinned to that UDID.
7. Open the local candidate, staging URL, and production URL using that UDID.

Never target the generic `booted` selector for Safari testing when more than one Simulator may exist. Always pass the recorded UDID.

Do not shut down or erase a Simulator that was already booted before the current site run. If the automation creates a temporary Simulator device, it may shut down that device after evidence is recorded.

If full Xcode, an iOS runtime, or an available iPhone Simulator is missing, production is blocked for that site. Record the blocker instead of skipping the gate.

## Credential Access Through 1Password

When the machine has 1Password and the 1Password CLI (`op`) available, use it as the secret manager for every API credential this toolkit touches, including PageSpeed API keys, Ahrefs API keys, Cloudflare Analytics tokens, and Cloudflare deploy tokens.

Check availability before assuming access:

```bash
command -v op && op whoami
```

Retrieve secrets only into process-local variables using secret references, and unset them after use:

```bash
CLOUDFLARE_API_TOKEN="$(op read 'op://VAULT-NAME/ITEM-NAME/credential')"
```

Prefer a secret-manager execution wrapper for commands that need the credential only for their own lifetime, because the secret never lands in shell history or a persistent variable. Follow the installed secret manager's current command syntax rather than copying a site-specific credential reference into this repository.

Rules:

- Never print a secret, echo it for debugging, pass it on a command line that gets logged, or write it to a file inside the repository.
- Never commit `op://` vault or item names that reveal customer identities in a public repository. Use placeholders in documentation.
- If `op` is unavailable or the account is not signed in, treat the credential as missing. Record the blocker instead of asking for the raw secret in chat or embedding it in a script.
- Apply the same handling through any other secret manager if 1Password is not the one in use.

## SEO Data Through Ahrefs

When the site owner has a valid Ahrefs account and the agent has access to it, through the Ahrefs API or a connected Ahrefs integration, SEO work must use it rather than working from assumptions. This mirrors the PageSpeed rule: use the real measurement tool when access exists.

Use Ahrefs during migration and maintenance for:

- Capturing baseline organic keywords, positions, and top pages before a migration, so post-migration losses are detectable.
- Building the redirect map from pages with backlinks and organic traffic, not only from the CMS route list.
- Verifying backlink targets still resolve after the migration.
- Running site audit crawls against staging and production candidates.
- Comparing post-release keyword and traffic trends against the pre-migration baseline.

Ahrefs API access requires a paid plan and calls consume plan quota. Confirm the key or integration responds before planning work around it, retrieve the key through the secret manager described above, and record which Ahrefs data was captured in the migration acceptance record.

If no Ahrefs access exists, fall back to Google Search Console exports and the source platform's own analytics for the baseline, and record that limitation.

## Answer Engine Optimization

Treat AEO as an extension of the site's SEO and content strategy. It does not replace indexing, internal links, canonical metadata, sitemap completeness, performance, accessibility, or source quality.

When content work is authorized:

1. Export relevant Search Console queries and landing pages. Add Ahrefs questions and content gaps when approved access exists.
2. Add customer language from support, sales, site search, and form submissions when that data is in scope.
3. Record each proposed question, its evidence source, intent, destination page, supporting source, and measurement plan.
4. Group questions by one primary page topic. Do not create a catch-all FAQ or duplicate the same answer across many routes.
5. Write complete question headings and put a direct, self-contained answer immediately below each heading.
6. Render all answer text in the initial HTML and keep it usable without client-side JavaScript.
7. Cite primary sources for technical, regulatory, legal, statistical, and time-sensitive claims.
8. Add optional `FAQPage` JSON-LD only after the visible content is stable, and generate it from the same source object as the visible questions and answers.
9. Test built HTML, structured-data parsing, visible-to-schema equality, internal links, canonical metadata, Open Graph metadata, and sitemap inclusion.
10. Record a baseline, then review Search Console, conversions, lead quality, and approved citation-monitoring results at least quarterly.

Google does not require special AI files or special schema for AI Overviews or AI Mode. Do not promise ranking, rich results, or citation. Google currently limits FAQ rich results primarily to well-known government and health sites. Read [ANSWER-ENGINE-OPTIMIZATION.md](ANSWER-ENGINE-OPTIMIZATION.md) before implementing an FAQ or other answer-focused content system.

## Sitemap and Search Console Gate

Every build must produce a complete sitemap and fail when the sitemap and indexable built canonicals do not match. Copy [`scripts/verify-sitemap.mjs`](scripts/verify-sitemap.mjs) into the target site and invoke it from the site's normal build command after Astro finishes. The validator also requires `robots.txt` to advertise the exact canonical sitemap URL.

The same unskippable build or release command must run [`scripts/verify-semantic-seo.mjs`](scripts/verify-semantic-seo.mjs) with reviewed project rules. New indexable routes must not bypass page-intent coverage, content-depth review, title alignment, or citation evidence requirements. Read [SEMANTIC-SEO-AND-CITATION-REVIEW.md](SEMANTIC-SEO-AND-CITATION-REVIEW.md) before configuring exceptions.

When an approved Google integration or OAuth credential is available:

1. List Search Console properties for the current identity and select the intended Domain or URL-prefix property.
2. Record the permission level. An absent or unverified property is not a pass.
3. Complete property verification before attempting sitemap submission. Domain property verification uses a Google-provided DNS token through the authorized DNS provider.
4. List submitted sitemaps and compare the exact canonical `/sitemap.xml` URL.
5. Submit the sitemap when missing and write permission is available.
6. Inspect the sitemap again and record its submission time, warnings, errors, or exact blocker.

Submission does not verify ownership. If verification or write access is missing, stop the Search Console mutation and record a manual handoff. The full workflow and official API endpoints are in [SITEMAPS-AND-SEARCH-CONSOLE.md](SITEMAPS-AND-SEARCH-CONSOLE.md).

## PageSpeed Gate

PageSpeed Insights has a free anonymous tier with low rate limits, suitable for occasional manual checks. Automated or repeated runs should use an API key retrieved through the secret manager so the gate does not fail on quota errors.

PageSpeed evidence must be tied to the staged candidate:

- Verify the audited URL, HTTP status, title, canonical URL, and visible content.
- Run mobile and desktop strategies.
- Require all four Lighthouse categories to equal 100 in both strategies.
- Treat any lower score as a release blocker.
- Never print PageSpeed API keys or token-bearing URLs.

If PageSpeed audits a stale page, redirect placeholder, access-denied page, Cloudflare error, or unrelated preview, the result is invalid.

## Cloudflare Production Observability

For a Cloudflare-hosted canonical site, read [Cloudflare Production Observability](CLOUDFLARE-OBSERVABILITY.md) and copy [`templates/cloudflare-observability.config.mjs`](templates/cloudflare-observability.config.mjs) into the target project.

When approved access exists:

1. Verify a least-privilege API token with a masked check.
2. Run the verifier in advisory mode before release and preserve the production RUM baseline.
3. Keep PageSpeed, Playwright WebKit, and native Safari as independent gates.
4. Query edge HTTP errors immediately after deployment when zone analytics access exists.
5. Repeat RUM after 15 minutes, one hour, and 24 hours when the selected windows have enough samples.
6. Use `regressions` or `thresholds` mode only after the project reviews its sample minimums, limits, and blocking policy.

An old production RUM finding does not prove the staged candidate fails. A missing dataset is not a pass. Record available, no-data, skipped, permission-error, and failed states distinctly.

## Evidence Record

For every site touched by automation, report:

- Astro root and git root.
- Toolkit files read.
- Cloudflare evidence.
- Git baseline or snapshot result.
- Dependency versions changed.
- Commands run and pass or fail result.
- Build candidate identity when available.
- Render sharpness report, result, reviewed viewports, and intentional exceptions.
- Sitemap URL, indexable page count, sitemap URL count, and validation result.
- Search Console property, permission, ownership status, and sitemap submission status when access exists.
- Query evidence, topic map, answer-focused routes, source review, and measurement baseline when SEO content work is in scope.
- Design mode, framework, scope, machine-readable result, and applicable findings. Include the completed design optimization brief, brand anchor decisions, viewport evidence, and visual acceptance when review applies.
- Playwright WebKit result.
- Simulator UDID record or production-blocking Simulator blocker.
- Staging target and verification result.
- PageSpeed mobile and desktop scores.
- Cloudflare RUM and edge report paths, windows, sample counts, permission state, enforcement mode, findings, and comparison result when access exists.
- Production deploy target and identifier, when deployed.
- Canonical hostname verification result.
- Skipped gates and exact reason.

Use `templates/migration-acceptance-record.md` for reusable release evidence when the site is being imported, rebuilt, or promoted after meaningful user-facing changes.

## Stop Conditions

Stop before production deployment when:

- The toolkit files cannot be read.
- Git baseline is not clean or deliberately snapshot-committed.
- Build or required tests fail.
- The render sharpness report is missing or failed, or source changed through auto-fix without a complete rebuild.
- The configured design mode is `required` and applicable design work begins without an approved brand source, baseline evidence, or diagnosis.
- The configured design mode is `required` and brand continuity or visual acceptance fails.
- The configured design mode is `required` and a global bar is unclassified or presents evergreen brand positioning as an alert.
- The configured design mode is `required` and an announcement lacks a content owner, destination when needed, or review or expiration date.
- The configured design mode requires a reviewer and the exact rendered candidate lacks that approval.
- The configured design mode is `required` and a visual change removes recognizable brand anchors without explicit rebrand approval.
- Required route-family or design-system evidence is missing under `required` mode, or mandatory interaction, resize, reflow, or preference evidence is missing in any mode.
- The build does not generate a complete sitemap or the sitemap validator fails.
- The public sitemap or robots declaration is missing or incorrect.
- Static-output SEO, JSON-LD, heading, Open Graph, image, or hreflang validation fails.
- The semantic SEO report is missing or fails canonical, title, page-intent, content-depth, citation URL, or citation evidence checks.
- Ahrefs is required by project policy but unavailable, or its current Site Audit has configured blocking issues.
- A canonical route, alternate origin, slash variant, or approved legacy URL returns the wrong redirect status or destination.
- Answer-focused content contains unsupported claims, hidden answers, invalid structured data, or schema that does not match visible content.
- Native iOS Safari testing is unavailable or fails.
- Staging is unavailable without an explicit production-only release policy.
- PageSpeed is below 100 in any required category.
- PageSpeed audited the wrong document.
- Viewport-specific request tests show hidden resource variants loading or a preload does not match the measured LCP resource.
- Cloudflare observability is required but approved access or required data is unavailable.
- An enforced Cloudflare RUM regression, threshold, or edge HTTP error-rate rule fails.
- The production target is ambiguous.
- Credentials are missing.
- The candidate changed after staging, Simulator, or PageSpeed checks.

Stopping is the correct result. Record the blocker and leave the site undeployed.
