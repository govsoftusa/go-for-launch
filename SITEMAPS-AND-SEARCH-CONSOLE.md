# Sitemaps and Google Search Console

An XML sitemap is release infrastructure for an informational website. Every production build must generate it, prove that it covers every indexable built page, and publish it at the canonical host. A build that omits or misstates the sitemap is not a releasable build.

Search Console ownership verification and sitemap submission are separate operations. A sitemap does not prove ownership. Verify access to the property first, then inspect and submit the sitemap when authorized access exists.

## Build Contract

The site build command must perform these operations in one command:

1. Build the production Astro output.
2. Materialize the conventional `/sitemap.xml` URL.
3. Validate the sitemap against the built HTML.
4. Exit with a nonzero status when validation fails.

For an Astro site, install and configure the official sitemap integration with the canonical site URL:

```js
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.example.com",
  integrations: [sitemap()]
});
```

Astro may emit `sitemap-index.xml` plus one or more child sitemap files. Preserve those generated files, and also copy the generated index to a real `sitemap.xml` file so crawlers and operators have one conventional entry point:

```js
import { copyFile } from "node:fs/promises";

await copyFile("dist/sitemap-index.xml", "dist/sitemap.xml");
```

Wire preparation and verification into the normal build command. Do not leave sitemap verification as an optional command that maintainers can forget:

```json
{
  "scripts": {
    "build": "astro build && node scripts/prepare-sitemap.mjs && node scripts/verify-sitemap.mjs --dir=dist --site=https://www.example.com --sitemap=sitemap.xml"
  }
}
```

Copy [`scripts/verify-sitemap.mjs`](scripts/verify-sitemap.mjs) into the target repository. The dependency-free verifier fails the build when:

- The sitemap or a referenced child sitemap is missing.
- The XML has no sitemap entries.
- A URL uses a different origin, query, or fragment.
- A URL is duplicated.
- An indexable built HTML page has no canonical URL.
- A built canonical URL is missing from the sitemap.
- A sitemap URL has no corresponding indexable built page.
- `robots.txt` is missing or does not advertise the exact canonical sitemap URL.

Pages intentionally excluded from search must use explicit `noindex` metadata. Error pages named `404.html` or `500.html` are excluded from the comparison. All other built HTML is treated as indexable and must appear exactly once.

## Public Verification

After staging and production deployment, verify the public files rather than trusting the build directory:

- `/sitemap.xml` returns HTTP 200 with XML content.
- Every child sitemap returns HTTP 200.
- Every listed URL uses the canonical scheme and hostname.
- Every listed URL returns the intended indexable page, not a redirect, error, placeholder, or access challenge.
- Every indexable canonical URL is represented once.
- `/robots.txt` advertises the exact canonical `/sitemap.xml` URL.

The sitemap check must be repeated against the canonical production hostname after deployment. A correct local file does not prove that Cloudflare routing, cache rules, or deployment output publishes it correctly.

## Search Console Workflow

Use this workflow only when the owner has granted Search Console access and the automation has an approved Google OAuth credential or connected tool. Do not request, print, or store a raw access token in repository files.

1. List the properties available to the current Google identity.
2. Prefer the Domain property, such as `sc-domain:example.com`, because it covers protocols and subdomains. Use a URL-prefix property only when that is the owner-approved scope.
3. Record the permission level. An absent property or an unverified permission is not a pass.
4. If ownership is not verified, stop sitemap submission and establish verification first. For a Domain property, obtain Google's DNS TXT token through the approved Search Console flow, add it through the authorized DNS provider, complete verification, and preserve the token so verification remains valid.
5. List the sitemaps already submitted for the verified property.
6. Compare the exact canonical sitemap URL, normally `https://www.example.com/sitemap.xml`.
7. If it is missing and the credential has write scope, submit that exact URL.
8. List or inspect the sitemap again and record its submission state, last submitted time, warnings, and errors.
9. If access or write permission is unavailable, record the manual handoff. Do not silently claim the sitemap was submitted.

For API integrations, the relevant Search Console endpoints are:

```text
GET https://www.googleapis.com/webmasters/v3/sites
GET https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps
PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
```

Encode both the property identifier and sitemap URL as path parameters. Listing can use a read-only scope. Submission requires the Search Console write scope and sufficient property permission.

## Required Evidence

Record these items in the migration or release acceptance record:

- Sitemap build command and result.
- Number of indexable built pages.
- Number of unique sitemap URLs.
- Canonical sitemap URL.
- Staging and production HTTP verification.
- Search Console property identifier and permission level.
- Property ownership status.
- Existing or newly submitted sitemap status.
- Submission time, warnings, errors, or exact access blocker.

## Official References

- [Google, Verify your site ownership](https://support.google.com/webmasters/answer/9008080)
- [Google, Manage your sitemaps using the Sitemaps report](https://support.google.com/webmasters/answer/7451001)
- [Search Console API, Sites list](https://developers.google.com/webmaster-tools/v1/sites/list)
- [Search Console API, Sitemaps list](https://developers.google.com/webmaster-tools/v1/sitemaps/list)
- [Search Console API, Sitemaps submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
