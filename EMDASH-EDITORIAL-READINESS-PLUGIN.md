# EmDash Editorial Readiness Plugin

## Purpose

An EmDash site can apply Go for Launch editorial SEO and AEO checks when a
post is written without rebuilding the Astro application or crawling the
archive. The correct pattern is a bounded editorial-readiness plugin backed by
the existing targeted editorial publishing lane.

The plugin is not an automatic writer, an image selector, a ranking promise, or
a replacement for the application release gate.

## Separation of responsibilities

Keep reusable validation contracts in Go for Launch:

- report schema;
- title, description, heading, image, canonical, citation, structured-data,
  and answer-focused validators;
- editorial publish evidence mapping;
- deterministic test fixtures;
- objective blocker and advisory finding categories.

Keep project data in the target repository:

- canonical origin and route patterns;
- brand, typography, color, and Open Graph rules;
- editorial length budgets;
- required collections and fields;
- image dimensions and crop policy;
- audience, topic, entity, citation, and review rules;
- approval records and generated evidence.

Do not add a site name, domain, visual treatment, or editorial claim to the
shared plugin.

## Required EmDash lifecycle

A publication gate must be authoritative for every publication path. It needs
a server-side, veto-capable hook that runs immediately before:

- first publication;
- direct publication of a live edit;
- publication of a staged revision;
- scheduled publication;
- restoration that makes content public.

The hook must receive the final content, SEO metadata, media references,
collection, publication mode, locale, and authenticated actor capability. It
must be able to return stable findings or abort with a stable error code.

EmDash 0.31.1 has `content:beforeSave`, which can abort a save, and
`content:afterPublish`, which runs after the public transition. Neither is an
authoritative prepublication boundary. A plugin for that version may provide
advisory draft reports, but it must not claim to block every publication path.

Do not enforce only in an admin button. API, scheduled, revision, and future
editor clients could bypass it.

## Finding classes

Use three states:

- `ready`, no blockers;
- `needs_review`, advisory findings only;
- `blocked`, one or more objective publication failures.

Objective failures may include:

- missing required title, excerpt, byline, date, taxonomy, canonical, or image;
- non-self canonical or accidental noindex;
- missing image object, dimensions, alternative text, provenance, or rights
  decision;
- undersized or upscaled featured image;
- featured image duplicated at the beginning of the body;
- missing, invalid, stale, unapproved, off-brand, or synthetic Open Graph
  artwork;
- invalid Article or NewsArticle structured-data inputs;
- multiple primary headings or invalid heading order;
- broken required internal link or required citation;
- FAQ markup that is not identical to visible qualifying content;
- stale content approval hash.

Subjective findings should remain advisory. Examples include an unclear
opening, weak deck, possible headline improvement, or additional context that
may help readers.

## AEO behavior

AEO extends ordinary SEO and cannot bypass it. The plugin should check whether
answer-focused content:

- addresses an evidence-backed reader question;
- gives a direct response immediately after the question;
- renders the complete response in initial HTML;
- uses consistent entity names;
- distinguishes fact, quotation, recommendation, review, and opinion;
- places sources near time-sensitive or factual claims;
- records a reviewer and last-reviewed date where maintenance is required;
- uses FAQPage only when the exact visible content qualifies.

The plugin must not fabricate questions, facts, quotations, expertise,
citations, sources, or structured data. It must not promise ranking or
inclusion in an answer system.

## Performance and privacy budget

Editor feedback should use pure local checks first. Cache network checks by
content hash and normalized URL. Apply a bounded debounce while editing and
one authoritative check before publication.

Do not crawl the archive, run a full PageSpeed matrix, upload an application
artifact, or purge the full cache during an ordinary post publish. Do not send
private draft content or personal information to an external service unless
the project has explicitly approved that service and documented the data
boundary.

## Evidence contract

Each report should include:

- collection and content identifier;
- content hash and policy version;
- publication transition;
- objective blockers and advisory findings;
- checked media identities and dimensions;
- checked canonical and dependent route graph;
- source and review records where applicable;
- request count, transfer bytes, and duration;
- result, reviewer, review date, and rollback reference.

Never include credentials, cookies, challenge tokens, private environment
values, or personal draft content in release evidence.

## Implementation sequence

1. Define a platform-neutral report schema and pure validators.
2. Build deterministic fixtures for valid, warning, and blocked posts.
3. Add an advisory EmDash editor panel and authenticated report route.
4. Compare automated findings with human editorial review in shadow mode.
5. Add or adopt a veto-capable server-side prepublication hook.
6. Prove every direct, revision, scheduled, restore, admin, and API path.
7. Enable objective blockers, while keeping subjective guidance advisory.
8. Export the final report into the Go for Launch editorial publish record.
9. Run the targeted route-graph gate after publication.

Any change to the plugin, hook, application integration, schema, security
boundary, or renderer is an application release. It requires the complete
exact-candidate suite, Playwright WebKit, native iOS Safari, and PageSpeed 100
for Performance, Accessibility, Best Practices, and SEO on mobile and desktop.

## Acceptance criteria

- Incomplete drafts remain saveable.
- Every publication path reaches the authoritative server check.
- Objective blockers stop publication with actionable field references.
- Advisory findings do not mutate content automatically.
- Identical content and policy inputs produce identical reports.
- Approved Open Graph files remain immutable during ordinary saves and builds.
- Media selection remains a human editorial decision.
- The normal post workflow remains within the editorial request and transfer
  budgets.
- Publication triggers only targeted route and cache validation.
- The plugin cannot weaken any application release gate.
