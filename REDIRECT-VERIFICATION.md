# Trailing-Slash and Alternate-URL Redirect Verification

Canonical metadata does not consolidate a public redirect surface by itself. Every noncanonical URL that the site intentionally supports must return one permanent redirect to the exact canonical URL, preserving the path and query string unless an approved redirect map changes the destination.

## Configure the Policy

Copy [`redirects.config.mjs`](templates/redirects.config.mjs), then set:

- The canonical origin.
- The public canonical sitemap URL.
- `always` or `never` for trailing slashes.
- Apex, HTTP, legacy host, and other alternate origins that must redirect.
- Explicit legacy-path probes that cannot be derived from the sitemap.

Never add a hostname to the alternate list until it is intentionally in scope and points to the deployment being tested.

## Run the Live Verifier

Copy [`verify-redirects.mjs`](scripts/verify-redirects.mjs) into the target repository and run it against staging routing when the staging environment can represent the production hosts, then run it against production after deployment:

```bash
node scripts/verify-redirects.mjs --config=redirects.config.mjs
```

The verifier reads every canonical page from the sitemap and checks:

- Every canonical URL returns a direct success response.
- The opposite trailing-slash form returns HTTP 301 or 308.
- The redirect reaches the exact canonical path in one hop.
- A probe query string survives the redirect.
- Every configured alternate origin redirects every sitemap route to the canonical origin.
- Explicit legacy probes reach their approved destinations.

It uses `redirect: "manual"` so a browser or HTTP client cannot hide a redirect chain by following it automatically.

## Why Public Verification Is Required

Astro's `trailingSlash` setting controls development routing and on-demand rendered pages. Astro documents that prerendered pages depend on host behavior and cannot rely on Astro redirects for this case. Cloudflare, another CDN, or an origin server must implement the public redirect, and the final host must be tested.

Check configured Cloudflare rules separately from public behavior. A correct rule that is not deployed, loses query strings, conflicts with another rule, or points at the wrong zone still fails acceptance.

## Release Evidence

Record:

- Redirect configuration revision.
- Canonical origin and trailing-slash policy.
- Alternate origins tested.
- Sitemap route count.
- Explicit legacy probes.
- Status, Location header, path, and query preservation result.
- Any redirect chain, loop, SSL, DNS, or ownership blocker.

Any failed canonical response, temporary redirect, multi-hop chain, lost path, lost query, loop, or wrong destination blocks production signoff.

## Official Reference

- [Astro trailingSlash configuration](https://docs.astro.build/en/reference/configuration-reference/#trailingslash)
