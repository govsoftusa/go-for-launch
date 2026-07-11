# Astro Internationalization, Canonicals, and Hreflang

Internationalization is a route, content, metadata, sitemap, and redirect contract. Astro's i18n router can create locale-aware routes and URL helpers, but a site must still render localized titles, descriptions, canonicals, visible language selectors, and hreflang links in its HTML.

## Decide the URL Model First

Choose one durable model before creating pages:

- Unprefixed default locale and prefixed secondary locales, such as `/about/` and `/es/acerca/`.
- Every locale prefixed, such as `/en/about/` and `/es/acerca/`.
- Locale domains, only when the deployment and server-rendering constraints are understood.

Do not infer translations by replacing only the first path segment. Localized slugs often differ. Maintain a typed route group that maps one conceptual page to every published locale. Start with [`localized-seo.ts`](templates/astro-i18n/localized-seo.ts).

## Astro Configuration

This example keeps the default locale unprefixed and requires trailing slashes:

```js
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.example.com",
  trailingSlash: "always",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "en-US",
    locales: ["en-US", "es"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false
    }
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en-US",
        locales: {
          "en-US": "en-US",
          es: "es"
        }
      }
    })
  ]
});
```

Keep `site`, `build.format`, and `trailingSlash` aligned. Astro documents `directory` with `trailingSlash: "always"` and `file` with `trailingSlash: "never"`. Prerendered redirect behavior still depends on the host, so verify it publicly.

## Render Localized Metadata

For each route, obtain the canonical and complete alternate cluster from the route map:

```astro
---
import SeoHead from "../components/seo/SeoHead.astro";
import { localizedSeo } from "../i18n/localized-seo";

const locale = "es";
const { canonical, alternates } = localizedSeo("about", locale, Astro.site);
---

<html lang={locale}>
  <head>
    <SeoHead
      title="Acerca del equipo"
      description="Información sobre el equipo."
      {canonical}
      {alternates}
      siteName="Example"
      image={{ src: "/og-about-es.png", alt: "Acerca del equipo" }}
      ogLocale="es"
    />
  </head>
</html>
```

Every localized page must:

- Canonicalize to itself, not to the default-language page.
- List itself and every published translation in the hreflang cluster.
- Include one `x-default` link, normally pointing to the default-language version or a language selector.
- Use absolute URLs.
- Use the same reciprocal cluster on every page in the translation group.
- Set `html lang` to the same language tag used by its self hreflang entry.
- Localize visible content, title, description, Open Graph text, image alternative text, and structured data.
- Omit an unpublished translation instead of linking to a fallback copy as if it were translated.

## Language Selection and Redirects

Provide crawlable links for changing language. Do not depend on a form, client-side event, or browser-language redirect as the only discovery path. Avoid forcing users or crawlers away from a URL solely from `Accept-Language`. If the root redirects to a default locale, make it deterministic, permanent only when appropriate, and covered by the redirect verifier.

## Sitemap and Validation

Configure `@astrojs/sitemap` i18n output, then run all of these in the normal build:

```bash
node scripts/verify-sitemap.mjs --dir=dist --site=https://www.example.com --sitemap=sitemap.xml
node scripts/verify-seo.mjs --dir=dist --site=https://www.example.com --trailing-slash=always --require-hreflang=true
```

The SEO verifier checks self-canonicals, locale tags, `x-default`, target existence, and reciprocity across the final built pages. After deployment, inspect the public sitemap XML to confirm its alternate language links match the HTML clusters.

## Acceptance Matrix

Record one row per translation group and locale:

| Page key | Locale | Public URL | Canonical | Self hreflang | x-default | Reciprocal | Sitemap | Result |
|---|---|---|---|---|---|---|---|---|
| about | en-US | `/about/` | self | yes | yes | yes | yes | pass |
| about | es | `/es/acerca/` | self | yes | yes | yes | yes | pass |

Also test localized 404 behavior, navigation, forms, directionality when right-to-left content exists, fonts, date and number formatting, and Search Console property coverage.

## Official References

- [Astro internationalization routing](https://docs.astro.build/en/guides/internationalization/)
- [Astro i18n API](https://docs.astro.build/en/reference/modules/astro-i18n/)
- [Astro sitemap i18n](https://docs.astro.build/en/guides/integrations-guide/sitemap/#i18n)
- [Google localized versions guidance](https://developers.google.com/search/docs/specialty/international/localized-versions)
