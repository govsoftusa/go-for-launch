# Incremental Static Build Decision Gate

Astro 7.2 added experimental incremental static builds. The feature can restore
unchanged pages from a previous build instead of rendering them again. Go for
Launch treats this as an optional build optimization, not a release waiver and
not a default for every site.

The decision must be made before every Astro application build. Agents must
inspect the current content, route generation, rendering dependencies, changed
inputs, available cache, and measured benefit. They must then select one of
three modes:

- `standard`, build normally without incremental reuse;
- `incremental`, reuse only pages whose reviewed data and code remain valid;
- `forced`, ignore reusable page output and render every page again.

Copy [`templates/incremental-build.config.mjs`](templates/incremental-build.config.mjs)
into the target project, update it for the planned build, and run
[`scripts/verify-incremental-build-decision.mjs`](scripts/verify-incremental-build-decision.mjs)
before starting Astro. Preserve the report with the build evidence.

```bash
node scripts/verify-incremental-build-decision.mjs --config=incremental-build.config.mjs
```

The assessment is required by Go for Launch. Incremental rendering remains
optional. A valid `standard` or `forced` decision is a successful assessment.

## What Astro Reuses

Incremental reuse applies only to pages returned from `getStaticPaths()` with a
string `cacheKey`. Static pages that do not use `getStaticPaths()` still render
on every build.

Astro also hashes the page module dependency graph. A change to the page,
layout, component, stylesheet, or imported data module invalidates every page
that depends on that module. Configuration and dependency changes invalidate
the complete incremental cache.

This is an important design constraint for large archives. If one imported
module contains every article or product, changing one item can change that
module hash and invalidate every page generated from it. Per-entry content
collections or separately loaded records usually produce a more useful
invalidation boundary.

## Build-by-Build Inspection

Before each build, inspect and record all of the following:

1. The resolved Astro version from the lockfile.
2. Whether the output is static.
3. The total prerendered page count.
4. The number of pages produced by `getStaticPaths()`.
5. The number of those pages with reviewed `cacheKey` values.
6. The pages expected to be restored after accounting for changed code and
   data dependencies.
7. Every file, content source, configuration file, environment input, and
   dependency changed since the reusable cache was created.
8. Whether middleware changes prerendered HTML.
9. Whether server islands are present and use a reviewed stable `ASTRO_KEY`.
10. Whether the cache exists, survives the build environment, and belongs only
    to this project and build lineage, including its recorded source.
11. The latest controlled full-render parity evidence.
12. Expected time and percentage savings against project-owned minimums.

Do not select `incremental` merely because a cache exists. Select it only when
the verifier recommends it and the expected savings justify the added cache
state.

## Cache-Key Contract

A `cacheKey` identifies every mutable data input that can change the rendered
page. Include a stable digest of the page record and all data-derived output,
including when applicable:

- related articles, products, or navigation cards;
- category, pagination, archive, and previous or next links;
- active promotions, notices, advertisements, or sponsor data;
- shared settings, taxonomy labels, author records, and feature flags;
- locale data and translated route labels;
- dates or review state rendered into the document;
- nonsecret environment values that affect output.

Astro tracks imported code. The key still has to cover mutable data that does
not change the imported module graph. Review time, randomness, environment,
remote data, generated identifiers, and indirect lookup results explicitly.
Never put a secret value in a key, log, report, cache path, or evidence file.
Use a nonsecret version or digest when secret-dependent state legitimately
changes public output.

Example:

```js
import { createHash } from "node:crypto";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function getStaticPaths() {
  const records = await loadRecords();
  const promotion = await loadActivePromotion();

  return records.map((record) => {
    const related = relatedRecords(record, records);
    return {
      params: { slug: record.slug },
      props: { record, related, promotion },
      cacheKey: digest({
        record: record.digest,
        related: related.map((item) => item.digest),
        promotion: promotion.version,
      }),
    };
  });
}
```

The key must be deterministic. Preserve array ordering when ordering changes
the page. Normalize unordered sets before hashing.

## Project Configuration

Use an explicit per-build switch so the recorded decision controls the Astro
configuration:

```js
import { defineConfig } from "astro/config";

const incrementalBuild = process.env.GFL_INCREMENTAL_BUILD === "1";

export default defineConfig({
  cacheDir: ".astro-cache",
  experimental: {
    incrementalBuild,
  },
  build: {
    concurrency: 1,
  },
});
```

Astro defaults build concurrency to `1`. An explicit setting is optional, but
the recorded resolved value must remain `1` when incremental reuse is selected.
Astro disables incremental reuse when concurrency is greater than `1`.

Do not commit `.astro-cache`. Add the selected cache directory to the target
project's ignore file.

## Cache Persistence and Isolation

Astro stores its cache under `node_modules/.astro` by default. A clean package
installation can delete this directory, and an ephemeral Podman or CI container
will lose it unless it is mounted or restored.

For repeatable automation:

- restore the cache only after dependency installation, or configure a cache
  directory outside `node_modules`;
- mount or restore that directory into the Podman build environment;
- isolate it by project and reviewed build lineage;
- include the operating system, architecture, Node version, Astro version, and
  lockfile identity in the external cache key;
- never share writable build caches between unrelated or untrusted projects;
- treat a missing or ambiguous cache as a `standard` build;
- record the restored cache source without including credentials.

The incremental cache is build state, not a deployable artifact. Deploy only
the exact verified output directory and provider manifest required by the
project.

## Full-Render Parity Adoption Gate

Before the first incremental production candidate, and whenever the cache-key
implementation or rendering boundary changes, compare incremental output with
a full render of identical source and environment inputs.

1. Populate a reviewed cache with a full build.
2. Apply a controlled page-data change.
3. Build incrementally and preserve the complete output hash.
4. Perform a forced full render without changing source or environment.
5. Preserve the complete output hash from the full render.
6. Require the hashes to match.
7. Repeat with a cross-page dependency change.
8. Repeat with a shared component or layout change.
9. Record the build times, restored-page counts, invalidated-page counts, and
   evidence paths.

The parity evidence remains reusable only while the renderer, cache-key logic,
content model, middleware behavior, Astro minor version, and relevant build
configuration remain unchanged. Record a fingerprint covering that contract
and the time the parity comparison passed.

## When to Select Each Mode

### Incremental

Select `incremental` only when:

- the resolved Astro version supports the feature;
- static `getStaticPaths()` pages have reviewed keys;
- a project-isolated persistent cache is available;
- cross-page and volatile inputs are fully reviewed;
- middleware does not mutate prerendered HTML;
- server-island key requirements are satisfied;
- current parity evidence passes with equal output hashes;
- the expected savings exceed the project's recorded minimums.

### Standard

Select `standard` when incremental reuse is safe but unavailable or not useful,
including:

- a small site or few eligible pages;
- a cold build with no prior cache;
- most pages will be invalidated by shared code or data changes;
- the measured savings are below the project threshold;
- the Astro version or output mode does not support the feature.

### Forced

Select `forced` when reuse is unsafe or its correctness cannot be established,
including:

- middleware that changes prerendered HTML changed;
- cache implementation or cache-key logic changed;
- a rendering input remains unknown;
- full-render parity failed;
- a project-specific policy requires a periodic clean render;
- Astro release notes require cache regeneration.

Use Astro's force option for the build and preserve the newly populated cache
only after the build and complete verification pass.

## Release-Gate Relationship

Incremental rendering changes how the output is produced. It does not reduce
what Go for Launch verifies.

Every production candidate still requires exhaustive static checks over every
indexable output page, the complete sitemap, site health, semantic SEO, content
quality, render sharpness, interface coverage, WebKit, native iOS Safari,
staging identity, PageSpeed, artifact evidence, and canonical production
verification.

A restored page belongs to the new candidate only because it exists in the new
output directory and passes the complete current gate. A cache hit from an
older build is not evidence by itself.

If a build decision report is missing, failed, stale, or tied to another
candidate, do not begin the production build.

## Official Astro References

- [Experimental incremental static builds](https://docs.astro.build/en/reference/experimental-flags/incremental-build/)
- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/)
- [Configuring experimental flags](https://docs.astro.build/en/reference/experimental-flags/)
