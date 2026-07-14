# Astro SEO Head and Static Output Validation

SEO metadata is a component contract and a build contract. Use the reusable [`SeoHead.astro`](templates/astro-seo/SeoHead.astro) component to render one canonical URL, one page-specific title and description, one page-specific Open Graph image, optional reciprocal language alternates, and valid JSON-LD from page data.

Astro does not add ordinary SEO metadata from `astro.config.mjs`. Set `site` and an explicit trailing-slash policy in the Astro configuration, then render metadata in the page head.

## Install the Component

Copy the template into the target Astro project:

```bash
mkdir -p src/components/seo
cp /path/to/go-for-launch/templates/astro-seo/SeoHead.astro src/components/seo/SeoHead.astro
```

Use it from the site layout. Require an image on every indexable page instead of silently sharing a fallback:

```astro
---
import SeoHead from "../components/seo/SeoHead.astro";

const canonical = new URL(Astro.url.pathname, Astro.site);
---

<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <SeoHead
      title="Page-specific title"
      description="Page-specific description"
      {canonical}
      siteName="Example"
      image={{
        src: "/og-page-name.png",
        alt: "Description of this page preview"
      }}
      ogLocale="en_US"
      structuredData={pageSchema}
    />
  </head>
</html>
```

The component escapes less-than characters in JSON-LD before using `set:html`. This prevents page content containing a closing script sequence from ending the JSON-LD element early.

## JSON-LD Rules

- Generate structured data from the same typed source object as the visible content.
- Give every top-level JSON-LD object `@context` and `@type`, or `@context` and a typed `@graph`.
- Use only schema types that describe the page users can see.
- Do not add `FAQPage`, `QAPage`, ratings, reviews, prices, or organization claims only to seek a search appearance.
- Parse every JSON-LD block in the final built HTML.
- Add content-specific equality tests when schema repeats visible content, especially FAQ questions and answers.

Valid schema creates eligibility, not a promise of ranking, a rich result, or an AI citation.

## Heading Rules

- Render one nonempty `h1` for the primary page topic.
- Make the first heading the `h1`.
- Do not skip levels when entering a subsection. An `h2` may be followed by an `h3`, but not directly by an `h4`.
- Choose heading levels by document structure, not text size.
- Keep navigation labels, card titles, and visual display text out of heading elements when they are not document sections.

## Build Validator

Copy [`verify-seo.mjs`](scripts/verify-seo.mjs) and its `scripts/lib` helper into the site. The validator reads final HTML and checks:

- The canonical is absolute, unique, on the expected origin, and exactly matches the built route.
- The canonical follows the configured trailing-slash policy.
- Every page has one title, description, `html lang`, and `h1`.
- Heading levels do not jump.
- Every JSON-LD block parses and has a typed root.
- Required Open Graph fields exist, `og:url` matches the canonical, images are unique, and local images are 1200 by 630 pixels.
- Localized pages have absolute, complete, reciprocal hreflang clusters with `x-default`.

Run it after the Astro build and Open Graph generation:

```json
{
  "scripts": {
    "build": "node scripts/generate-open-graph.mjs --config=open-graph.config.mjs && astro build && node scripts/prepare-sitemap.mjs && node scripts/verify-sitemap.mjs --dir=dist --site=https://www.example.com --sitemap=sitemap.xml && node scripts/verify-seo.mjs --dir=dist --site=https://www.example.com --trailing-slash=always && node scripts/verify-site-health.mjs --config=site-health.config.mjs"
  }
}
```

For a fully localized build, add `--require-hreflang=true`. A failure blocks staging and production.

The SEO verifier checks metadata structure and semantic contracts. The separate [site-health audit](SITE-HEALTH-AUDIT.md) checks crawler-facing quality across the whole final build, including length budgets, uniqueness, internal link redirects, missing targets, orphaned pages, referenced image weight, and `robots.txt`.

## Official References

- [Astro configuration overview](https://docs.astro.build/en/guides/configuring-astro/)
- [Google structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google localized versions guidance](https://developers.google.com/search/docs/specialty/international/localized-versions)
