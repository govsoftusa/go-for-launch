# Semantic SEO and Citation Review Gate

Technical SEO can prove that a page is crawlable and structurally complete. It cannot, by itself, prove that the title accurately represents the page, that a page serves the website's purpose, or that a cited source supports the nearby claim.

Go for Launch adds a semantic review layer through [`verify-semantic-seo.mjs`](scripts/verify-semantic-seo.mjs). The gate reads the final built HTML, applies project-specific intent rules, validates external citations, and writes a machine-readable report for release evidence.

## What the Gate Checks

For every indexable page, the verifier checks:

- The canonical URL is absolute, uses the configured production origin, and matches the built route.
- The title stays within the project's reviewed editorial range.
- The title has enough meaningful words and does not look mechanically truncated.
- The title does not repeat the same descriptive word enough to resemble keyword stuffing.
- The title shares meaningful terms with the visible `h1` and primary page content.
- The route is covered by a reviewed page-intent rule when the project requires full coverage.
- The primary content meets the reviewed word-count range for its content type.
- The title and content contain the route's approved topic and purpose terms.

For citation-bearing content, the verifier also checks:

- Citation links use valid HTTP or HTTPS URLs.
- Citation anchor text is descriptive rather than generic text such as `click here` or `source`.
- Content types that require sources contain at least one external citation.
- A reviewed evidence record exists when the project requires one.
- The nearby claim still contains the terms approved during citation review.
- The cited source still contains the reviewed source terms when source content can be fetched or supplied in a snapshot.
- The citation URL returns a successful or redirecting HTTP response when live checks are enabled.
- The nearby claim and fetched source have a configurable minimum level of topical overlap.

Topical overlap is a drift signal, not proof of truth. A source may contain the same words while contradicting a claim, and a valid source may use different terminology. High-stakes claims still require a named human reviewer and a short evidence note.

## Configure Page Intent

Copy [`templates/semantic-seo.config.mjs`](templates/semantic-seo.config.mjs) into the website project. Replace every example term with language grounded in the site's actual audience, services, and content strategy.

Each `pageRules` entry can define:

- One route pattern or an array of route patterns.
- Minimum and maximum primary-content word counts.
- Approved title terms and the number that must match.
- Approved content-purpose terms and the number that must match.
- Whether the route requires at least one external citation.

Use narrow rules for distinct content families. A legal policy, service page, product page, newsroom article, and technical publication should not share one word-count or keyword rule.

Set `requirePageRule` to `true` for production. This makes a newly added indexable route fail until its search intent and content-depth policy have been reviewed.

## Title Length Is a Project Budget

The template uses 30 to 60 characters as a strict default editorial budget. Google does not publish a fixed title-character limit. Google says titles should be descriptive and concise, and explains that displayed title links are truncated to fit the device when necessary.

Adjust the range only with written search-result and content evidence. A title inside the range can still be poor if it is vague, duplicated, stuffed with keywords, disconnected from the `h1`, or unrelated to the page body. A longer title can be valid when the subject genuinely requires it, but the project should document that exception instead of silently disabling title review.

## Record Citation Support

When `requireReviews` is enabled, every citation needs a record containing:

- The exact built route.
- The exact citation URL.
- One or more phrases expected in the nearby claim.
- One or more phrases expected in the supporting source.
- The reviewer.
- The review date.
- A short note explaining what the source supports and any limitation.

The build checks this record for drift. If editors rewrite the claim, replace the source, or let the review become older than the configured maximum age, the gate fails and requires a new review.

For a source that blocks automated retrieval, store a dated source snapshot in the configuration or release evidence. Do not treat a blocked fetch as proof that the citation is wrong, and do not mark it valid without a human review.

## Build Integration

Add the semantic check after the final HTML is generated and before staging:

```json
{
  "scripts": {
    "verify:semantic-seo": "node scripts/verify-semantic-seo.mjs --config=semantic-seo.config.mjs",
    "build": "astro build && npm run verify:semantic-seo"
  }
}
```

The report defaults to `artifacts/semantic-seo-report.json`. Preserve it with the exact candidate hash and release record.

Enable live citation requests in the reviewed project configuration for the production candidate. Keep source snapshots for deterministic tests, but do not let a permanent snapshot replace periodic public URL checks.

## Optional Ahrefs API v3 Check

[`verify-ahrefs-site-audit.mjs`](scripts/verify-ahrefs-site-audit.mjs) can read a saved Ahrefs Site Audit issues response or request the current project issues from Ahrefs API v3. The API path is optional because it requires an eligible Ahrefs plan, consumes API units, and depends on project access.

The adapter:

- Uses the official Site Audit issues endpoint.
- Reads the API key only from the configured environment variable.
- Never writes the key or an authenticated URL to the report.
- Filters resolved issues whose affected URL count is zero.
- Supports reviewed issue ID or issue name exceptions.
- Fails on configured importance levels, which default to `Error` and `Warning`.
- Records a visible skipped result when access is unavailable and the project has not made Ahrefs mandatory.

Use [`templates/ahrefs-site-audit.config.mjs`](templates/ahrefs-site-audit.config.mjs) as the starting point. Set `required` to `true` only when the release environment is contractually expected to have Ahrefs access. Missing access must then block the release rather than creating a false pass.

Ahrefs reports public crawl behavior. It complements the local semantic and site-health gates. It does not replace them, and an old Ahrefs email or PDF does not prove the current candidate is clean.

## Release Acceptance

Before production:

1. Build the exact candidate.
2. Run structural SEO, sitemap, image, site-health, semantic SEO, interface-quality, side-navigation, and render-sharpness gates.
3. Review every semantic warning and either fix it or record a narrow, dated exception.
4. Preserve the semantic SEO JSON report and citation review records.
5. Deploy the same candidate to staging.
6. Check citation URLs from the release environment.
7. Run Ahrefs Site Audit when approved access exists.
8. Verify canonicals, sitemap files, crawler policy, and representative citations on the canonical production hostname.

## Primary References

- [Google Search Central, influencing title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google Search Central, link and anchor text best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Ahrefs API v3 introduction](https://docs.ahrefs.com/en/api/docs/introduction)
- [Ahrefs Site Audit API](https://docs.ahrefs.com/en/api/reference/site-audit)
- [Ahrefs Site Audit project issues endpoint](https://docs.ahrefs.com/en/api/reference/site-audit/get-issues)
