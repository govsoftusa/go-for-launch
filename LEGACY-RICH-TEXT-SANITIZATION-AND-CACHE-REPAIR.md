# Legacy Rich Text Sanitization and Cache Repair

## Purpose

Use this gate when a migration converts HTML from a legacy content management
system into a structured rich text format. It prevents executable source text
from becoming visible article prose, and it defines a bounded repair process
when an affected record has already reached production.

The failure is easy to miss. A browser does not execute a script after an HTML
converter has turned its text node into a paragraph. The page remains valid,
the route returns 200, and ordinary malware scans may pass. Readers instead see
large blocks of JavaScript, configuration data, or CDATA markers inside the
article.

## Root Cause Pattern

Some rich text converters walk through unknown HTML elements and preserve their
text descendants. Removing only the opening and closing tags is therefore not
sanitization. The complete subtree of each noncontent element must be removed
before conversion.

At minimum, remove these subtrees from imported editorial HTML:

- `script`
- `style`
- `template`

Inventory `iframe`, `object`, `embed`, and project-specific widget markup
separately. These may represent intentional editorial embeds and need an
explicit conversion policy rather than automatic deletion.

## Required Migration Gate

1. Count unsafe source tags before conversion and record the count.
2. Remove complete unsafe subtrees before the rich text converter runs.
3. Convert the sanitized HTML.
4. Scan the serialized structured output, not only the source HTML.
5. Fail on executable markers, CDATA, or long JavaScript-like text blocks.
6. Generate twice and require byte-identical output.
7. Review every source record that contained an unsafe tag, even when the
   generated output passes.

Useful output checks include project-reviewed signatures for known providers,
plus general indicators such as CDATA delimiters, configuration bootstrap
objects, exception wrappers, and function bodies embedded in text blocks.
Signatures are defense in depth. Complete subtree removal is the primary
control.

## Production Repair Contract

Treat a repair as a content correction only when it changes content records and
does not alter renderer, schema, routing, dependencies, security boundaries, or
infrastructure.

1. Enumerate affected records with a database query and record exact IDs.
2. Capture a database restore point before writing.
3. Regenerate each affected record from the authoritative sanitized source.
4. Preserve the previous live value as a revision.
5. Update the live record and search index in one transaction when supported.
6. Verify record count, revision count, content length, and zero executable
   markers directly in the database.
7. Invalidate every cache layer that can serve public HTML.
8. Verify each changed canonical route in a real browser.
9. Apply the same repair to the development fixture and private development
   database.

Direct database writes are break-glass work. Prefer the supported CMS API when
it can complete the correction and invalidation atomically. If direct writes
are necessary, approval, backup, rollback, revision preservation, and parity
evidence are mandatory.

## Distinguish Cache Layers

Do not treat a successful cache purge response as proof that current HTML is
being served. A dynamic publication may have all of these layers:

- Worker entrypoint response cache
- framework route cache
- Workers Cache API
- CDN cache
- CMS object cache
- browser cache

Record the cache status and age before and after invalidation. Request the exact
canonical URL without a query string. A query parameter can create a clean
cache miss while the canonical URL remains stale.

Cloudflare Workers Caching configured through `cache.enabled` runs before the
Worker. A Worker response can therefore stay stale even when the database and
an uncached query variant are correct. Make cache tags available on every
public HTML response and use the provider mechanism designed for that cache
layer. If the provider accepts an invalidation but the same cache age and body
remain, stop repeating the request. Use one reviewed fallback, such as an exact
artifact redeployment when cache keys are version-scoped, then verify the
canonical route after propagation.

## Acceptance Evidence

The repair passes only when all of the following are true:

- the source unsafe-tag inventory is preserved;
- generated structured content contains no executable markers;
- affected production rows and revisions reconcile;
- canonical production routes contain no imported executable text;
- the current application identity remains correct;
- browser console output contains no related errors;
- the development fixture and private database match the repair;
- the migration audit fails when a regression fixture contains an unsafe
  subtree.

Keep requests bounded. Verify only the changed records and their named route
dependencies. This repair does not justify a public archive crawl, repeated
performance testing, or a full site rebuild.
