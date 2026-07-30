# Editorial Publishing and Dynamic Content

This workflow lets an Astro site backed by a runtime CMS publish or correct
content without rebuilding and redeploying the entire application. It preserves
the full Go for Launch release standard by separating two different kinds of
production change.

## The Two Lanes

| Lane | Typical change | Required validation |
|---|---|---|
| Editorial publishing | CMS records, publication state, taxonomies, authors, and media metadata | Targeted validation of the changed entry and every dependent public route |
| Application release | Astro source, components, templates, schemas, dependencies, configuration, infrastructure, routing, cache code, forms, or security boundaries | Complete exact-candidate release suite, including mobile, desktop, WebKit, native iOS Safari, and PageSpeed 100 in all four categories |

The editorial lane is not a smaller application release. It is a controlled
data mutation against an application candidate that has already passed the
complete release gate.

## Classification Gate

Before changing production, answer these questions:

1. Can the requested outcome be completed entirely through a supported CMS UI
   or API?
2. Will application source, dependencies, configuration, infrastructure,
   routing, cache implementation, templates, schemas, or built artifacts remain
   byte-for-byte unchanged?
3. Can the content change be rolled back through the CMS?
4. Is the current production application candidate already verified?
5. Can the affected route graph be named before publication?

If every answer is yes, use the editorial lane. If any answer is no, use the
application release lane. For a hybrid task, complete and verify the reversible
editorial correction separately, then open a separately authorized application
release for the remaining defect.

Never change a global renderer merely because one article has an incorrect
featured image, duplicated lead image, missing body media, or stale metadata.
Correct the content record first. Treat the renderer concern as a separate
finding.

## Prepare the Content Delta

Copy these files into the target project:

- `templates/editorial-publish-record.md`
- `templates/editorial-publish.config.mjs`

Record:

- source record identifiers and checksums;
- intended publication state and canonical route;
- fields that will change;
- media identifiers, object keys, intrinsic dimensions, content type, and
  delivery URLs;
- expected home, category, author, feed, sitemap, search, and related-content
  dependencies;
- rollback data;
- current application identity.

For a newer WordPress export, extract only records newer than the recorded
migration watermark or records whose source checksum changed. Upsert by a
stable source identifier. Repeating the import must produce no additional
records and no unrelated mutations.

Treat media reconciliation as a separate step. A legacy URL returning 200 does
not prove that the CMS media record points to an existing object. Verify the
object key and delivery URL, then use a sufficiently large source image with a
responsive same-origin derivative when the application supports one.

## Publish Through the CMS

Use the supported CMS UI or API. Normal publishing must not:

- edit application files;
- run an Astro build;
- create or upload a new application candidate;
- modify a Worker or routing rule;
- flush the entire site cache;
- write directly to the CMS database.

Normal editorial publishing also has a hard request budget. Record estimated
and observed requests and transfer bytes in the editorial publish record. The
normal ceiling is 200 external requests and 250,000,000 transfer bytes. Stop
and redesign the targeted route graph before either ceiling is exceeded. Do not
switch to an archive-wide crawl, full application build, or release suite.

Direct database changes are break-glass operations. They require explicit
approval, a point-in-time backup or export, a precise rollback statement,
least-privilege access, a record of every affected row, and post-write API and
rendered-page parity checks.

## Publication Lifecycle Contract

A runtime CMS must define cache behavior for every content state transition,
not only the first publish. Prove these cases before relying on the editorial
lane:

| Transition | Public HTML invalidation |
|---|---|
| First publish | Required after the published record is durable |
| Direct edit of live content | Required after the live record is durable |
| Save of a staged revision | Forbidden until the revision is published |
| Publish of a staged revision | Required after the revision becomes live |
| Draft save | Forbidden because no public record changed |
| Scheduled-content save | Forbidden until the scheduled publish occurs |
| Scheduled publish | Required after the record becomes live |
| Unpublish | Required after the public record is withdrawn |
| Restore | Required after the public record is restored |

Do not infer these behaviors from hook names. Exercise each transition with a
record whose public output can be distinguished before and after the action.
Confirm that draft and staged-revision saves leave the current public document
unchanged. Confirm that direct live edits and later revision publishes replace
the public document without an application build.

The first-publish path and the published-edit path are different operational
contracts. A CMS can pass one while leaving the other stale. Treat lifecycle
coverage as a prerequisite for routine publishing, not as an optional cache
optimization.

## Invalidate the Route Graph

Invalidate only the content record and public surfaces that depend on it. For a
post, that commonly includes:

- the post route;
- the home page when it lists recent posts;
- each category and tag archive that lists the post;
- each author archive;
- related-content surfaces;
- site search;
- RSS or Atom feeds;
- the sitemap or sitemap index.

HTML edge cache, Worker Cache API, CDN asset cache, object cache, CMS query
cache, and browser cache are separate layers. Record each layer touched. Do not
assume that purging one layer invalidates the others.

## Targeted Editorial Gate

After publishing, verify the changed entry on the canonical production host:

- GET and HEAD return the expected status;
- the response identifies the current verified application candidate;
- canonical URL and index policy are correct;
- title, deck, author, publication date, categories, and article body match the
  intended record;
- the featured image is editorially correct, sharp at rendered size, has useful
  alternative text, and uses an appropriate responsive derivative;
- the featured image is not repeated accidentally at the start of the body;
- local image requests succeed and remain within the reviewed byte budget;
- interactive forms retain their approved anti-spam boundary;
- the route does not expose a staging, preview, or alternate production host.

Then verify every named dependent route. Confirm that listings, feeds, search,
and sitemap state agree with the publication state. A post is not successfully
published when its direct route works but the public route graph remains stale.

Run:

```sh
node /path/to/go-for-launch/scripts/verify-editorial-publish.mjs \
  --config=editorial-publish.config.mjs
```

The verifier checks the evidence record. It does not crawl the site or replace
browser inspection.

## Performance Conservation

Publishing content can change a home-page LCP image, archive card density, HTML
size, or image transfer cost even when application code is unchanged. Classify
the performance risk:

- `low`: text or metadata correction that does not affect a listing or
  first-viewport resource;
- `medium`: new content appears in listings but does not become a measured LCP
  resource;
- `high`: the change affects a home-page or article LCP image, introduces large
  media, changes first-viewport markup, or materially changes a high-traffic
  route.

For medium and high risk, preserve a targeted browser trace for affected
first-viewport routes. Confirm the LCP resource, responsive source selection,
transfer bytes, image sharpness, layout stability, and application identity.
For high risk, run a targeted PageSpeed check when the provider is available.
A valid score below the project requirement is a production regression and
must be handled under the project rollback policy.

This targeted conservation check does not weaken the application release gate.
Any application change still requires the complete 100/100 mobile and desktop
matrix and every other mandatory release check.

## Image Corrections at Archive Scale

Automated image audits may identify featured images that are too small,
stretched, duplicated in the body, badly cropped, or missing from object
storage. Detection may be automated. Selection must remain editorial.

Create a review queue containing:

- current selected image and rendered dimensions;
- intrinsic dimensions and transfer bytes;
- suitable images referenced by the article;
- crop and aspect-ratio notes;
- rights and provenance;
- recommended action without an automatic mutation.

Do not select the largest image blindly. Theme-generated crops, posters,
thumbnails, logos, and unrelated inline images can all be larger than the
correct lead image.

## Stop and Escalate

Stop the editorial workflow and open an application release when:

- the CMS cannot represent the required correction;
- the rendered page remains wrong while the CMS record is correct;
- a schema or renderer change is required;
- a cache implementation defect prevents targeted invalidation;
- authentication, authorization, forms, or anti-spam code must change;
- a global media policy or image component must change;
- the current application identity cannot be proven;
- targeted checks expose a broader application regression.

Record the finding before changing lanes. Do not hide an application release
inside a content publish.

## Failure Lessons to Preserve

Useful evidence includes failed attempts, not only the final successful state.
Record these recurring failure classes:

- an old build directory was uploaded after a source identity changed;
- edge locations briefly served mixed application identities;
- a full-resolution source image was sharp but far too expensive to transfer;
- a global image-policy experiment increased unresolved runtime media
  references;
- a full-page screenshot stitch created an apparent layout defect that stable
  viewport measurements did not reproduce;
- a PageSpeed provider error prevented a score and was preserved as an external
  blocker rather than relabeled as a site pass;
- an editorial task expanded into repeated full builds even though no
  application change was needed.
- a staged revision was saved but not published, leaving the live route
  unchanged even though the editor showed the corrected data;
- an artifact copy retained files that the new build no longer produced,
  creating a mixed release directory that did not represent any candidate.

For application releases, clean and rebuild the exact source revision before
upload. Copy the verified artifact with replacement semantics so files absent
from the source are deleted from the destination. Verify deployed identity,
wait for identity convergence, and run the complete gate. For editorial
publishes, keep the application candidate unchanged and verify the targeted
route graph.
