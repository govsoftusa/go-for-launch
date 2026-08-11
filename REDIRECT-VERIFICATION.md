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

## Apex Redirects on Cached Worker Applications

When the canonical application uses Cloudflare document caching, put the apex
redirect on a separate minimal Worker service and cache namespace. A
host-aware redirect inside the application cannot run when an outer cache
returns a previously stored canonical document first.

The apex service should have no application data bindings or scheduled work,
disable any unneeded public preview hostname, preserve the complete path and
query, send `Cache-Control: no-store`, and expose a stable nonsecret marker.

Verify the first hop with both GET and HEAD for:

- The apex root.
- A representative content path.
- A query-bearing path.

Require the exact permanent status and `Location` value. A HEAD redirect does
not excuse a GET root that returns status 200 with the canonical document body.
Preserve the GET and HEAD evidence separately.

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
