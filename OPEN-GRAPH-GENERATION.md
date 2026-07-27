# Deterministic Open Graph Image Generation

Every indexable page needs a relevant social preview. Social cards are release artifacts, not disposable build output. They must be deterministic, stable across ordinary builds, visually reviewed, and approved by exact hash.

## Hard Rules

1. A normal build is read-only for existing social cards. It must verify and reuse approved files without rewriting bytes, changing filenames, recompressing images, or changing modification times.
2. A missing card, changed card input, altered image file, stale state record, or removed route must fail the normal build. It must never trigger silent generation.
3. Creation or replacement requires an explicit `--regenerate` command. A generic build, SEO audit, dependency update, or deployment command is not permission to regenerate cards.
4. The card input fingerprint contains only values that affect card rendering: card text, displayed destination, dimensions, colors, template version, social-card SEO contract version, and source asset hash. Unrelated SEO rules, crawler settings, sitemap logic, citations, dependencies, timestamps, environment values, or build identifiers must not invalidate cards.
5. Increment `templateVersion` only when visual geometry, typography, encoding, or brand treatment changes. Increment `seoContractVersion` only when the content rules used inside the image change. Document the reason for either change.
6. Explicit regeneration still reuses any card whose rendering fingerprint and output hash remain unchanged.
7. Every new or changed card requires full-size human review. Approval must record both the rendering input SHA-256 and final image SHA-256. Any later input or pixel change invalidates approval.
8. A production candidate must use the same approved files inspected in the contact sheets. Do not rebuild or optimize them between approval, staging, and production.
9. Do not treat a technically valid file as useful artwork. Measure candidate source images after flattening transparency and reject visually flat, empty, placeholder, or low-detail assets. Use an approved designed fallback when a page source does not carry enough information for the card.
10. Bulk regeneration is prohibited until a representative prototype set has current named approval tied to the authoritative brand reference, renderer contract, prototype inputs, and prototype output hashes.

## Configure the Cards

Copy [`open-graph.config.mjs`](templates/open-graph.config.mjs) into the target site. Keep page-specific rendering content in `cards` and shared brand choices at the top level.

The bundled renderer is a reference implementation, not a universal visual
identity. If its composition, typography, symbols, or tone do not match the
project, set `renderCard` to a project-owned asynchronous renderer. The hook
receives the card, complete config, output dimensions, config root, Sharp, and
the XML escape helper. It may return SVG text, a Buffer, or a Uint8Array. The
shared pipeline still enforces dimensions, opacity, deterministic hashing,
explicit regeneration, and hash-bound review.

When a custom renderer needs additional route-specific values, place them in
`card.renderingFingerprint`. Place the reviewed logo or wordmark hash in
`brandAssetSha256`. The input fingerprint then changes when real visual inputs
change, without treating the renderer function's source text or an unrelated
project setting as card content.

Required controls:

- `stateFile` records rendering input and output hashes.
- `approvalFile` records the exact reviewed input and output hashes.
- `templateVersion` identifies visual template behavior.
- `seoContractVersion` identifies the SEO content rules that affect text inside cards.
- `maximumBytes` blocks unnecessarily heavy files.
- `sourceAssetSha256` must be set for any external image or illustration used by a card.
- `brandAssetSha256` records the exact reviewed logo or wordmark used by a custom renderer.
- `renderingFingerprint` records custom template inputs that visibly affect the card.
- `brandRules` defines the approved palette, approved type families, minimum safe padding, minimum supporting-text size, and maximum headline size.
- `typography` defines the actual type families and sizes used by the renderer.
- `contactInformation` declares whether a visible canonical destination or other contact detail is required.
- Every card includes `purpose`, a plain-language statement of what the preview must communicate when that page is shared.
- `reviewContract` records the reviewer, review date, brand reference, readability approval, brand-integrity approval, and contact-information approval.
- `adoptionGate` records the authoritative brand-reference hash, renderer contract, representative prototype cards and cases, real-client review, and immutable prototype approval path.

Before selecting any logo or mark, follow [Brand Asset Provenance and Usage](BRAND-ASSET-PROVENANCE.md). Record the authoritative brand-guide hash and exact asset hashes. A full-color asset approved for a light panel cannot be reused on a dark panel unless the guide explicitly allows it. Run the brand asset verifier before regenerating or approving cards.

Card names become `public/og-NAME.png`. Names are limited to lowercase letters, digits, and hyphens so output paths cannot escape the configured directory.

## Generate, Review, and Verify

Copy [`generate-open-graph.mjs`](scripts/generate-open-graph.mjs) and [`review-open-graph.mjs`](scripts/review-open-graph.mjs) into the target site, then install the current compatible `sharp` release.

Explicit maintenance workflow:

```bash
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs --prototype
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --prototype
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --approve-prototype
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs --regenerate
node scripts/review-open-graph.mjs --config=open-graph.config.mjs
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --approve
```

The prototype set lives outside the production output and state manifest. Use it to validate the visual system before bulk work begins. For projects with at least three cards, include at least three prototypes. Cover publication identity and a long headline in every project. Add source artwork and the designed fallback whenever those layouts exist.

`--approve-prototype` requires a named reviewer, review date, authoritative brand reference, named real messaging or social client, and explicit approval of the template, typography, palette, imagery, brand authority, readability, and absence of unapproved synthetic artwork. The resulting approval is bound to the brand-reference hash, renderer source hash, visual-system fingerprint, prototype input hashes, and prototype output hashes.

`--regenerate` validates that approval before writing any production card. A changed template version, renderer hash, brand reference, shared palette, shared typography, brand rule, prototype selection, or prototype input invalidates it.

Normal build and release workflow:

```bash
node scripts/generate-open-graph.mjs --config=open-graph.config.mjs
node scripts/review-open-graph.mjs --config=open-graph.config.mjs --check
```

The first command in the normal workflow verifies the state manifest, rendering input fingerprint, existing file hash, route set, and safe text constraints. It does not render or write an image. The second command verifies dimensions, format, opacity, file size, recorded output hash, and hash-bound visual approval.

Automated checks must reject non-brand colors, unapproved type families, insufficient padding, supporting text below the configured minimum, headlines above the configured maximum, horizontal text overflow, vertical text-region overlap, truncated destination text, missing required contact information, and missing purpose statements. Human review remains mandatory because automation cannot fully judge hierarchy, clarity, tone, visual balance, or whether the card succeeds for its intended sharing context.

A prior approval is invalid as soon as a stakeholder rejects the template,
even when every file still matches its approved hash. Remove or supersede the
approval, increment the template version, regenerate explicitly, and review
the replacement contact sheets. Hash integrity proves which artwork was
reviewed. It does not prove that the artwork was good.

Commit stable social-card files, the state manifest, and the approval manifest. Review sheets may remain release evidence instead of source-controlled files.

## Rendering Best Practices

- Render text from vector layout at two times or greater density, then downsample once with a high-quality kernel.
- Never scale up low-resolution raster text, logos, screenshots, or illustrations.
- Use shipped fonts or a deterministic vector-safe fallback. Do not depend on an unverified system font.
- Give each text line a declared safe region with enough vertical clearance for capitals, accents, and descenders such as `g`, `j`, `p`, `q`, and `y`.
- Do not crop text layers to nominal font size. Text containers need line-height and ink clearance.
- Keep meaningful text inside the center-safe area used by common social crops.
- Use a readable canonical hostname when the full path does not fit. Never show an ellipsis, a clipped path, or a shortened string that cannot identify the destination.
- Use a minimum practical display size of 20 pixels for destination and supporting text in a 1200 by 630 image.
- Prefer vector logos and artwork. If a raster source is required, record its SHA-256 and verify that its intrinsic size supports the rendered placement.
- Evaluate page artwork separately from brand marks. A correct logo cannot rescue a gray placeholder panel, an empty transparent export, or a near-uniform gradient.
- Prefer real page photography or illustration when the project owns it and
  the file is large enough for the intended crop. A designed typographic
  fallback is safer than enlarging a small source or inventing unrelated art.
- Do not reuse decorative geometry, synthetic marks, or a toolkit's house
  style merely because the renderer can produce it. The card must look like
  the publication or product that owns the destination.
- Use `scripts/lib/artwork-suitability.mjs` in project generators as a baseline low-detail check. Tune the threshold against the project contact sheet, and bind the threshold and selection result into the rendering-input fingerprint.
- Produce an opaque 1200 by 630 raster image with the declared content type.
- Set `og:image:alt` to describe the preview information, not decorative geometry.

## Visual Review Checklist

Inspect every card at full size and in the complete contact sheet. Check:

- No overlapping text, clipped letters, missing descenders, or unsafe edge placement.
- No jagged, stretched, blurry, or incorrectly cropped artwork.
- No flat gray placeholder, empty transparent export, low-information gradient, or other source that reads as missing content.
- No template symbols that could be mistaken for status, validation, warning, or error icons.
- The page topic, title, and destination match the page metadata and visible content.
- Destination text is readable and useful, with no truncation.
- Small labels remain sharp at actual preview size.
- Brand marks retain their aspect ratio and have adequate clear space.
- The card remains understandable when a messaging app adds its own title and description below it.

Preview representative cards in at least one real messaging or social application. Presentation quality cannot be proven from dimensions or file hashes alone.

## Build Order

```text
verify existing card state without writes
verify hash-bound visual approval
build Astro
materialize and verify sitemap.xml
verify SEO, JSON-LD, headings, hreflang, and Open Graph declarations
verify final image dimensions and output hashes
run browser tests
deploy the unchanged candidate to staging
promote the unchanged candidate to production after all gates pass
```

Do not use a shared fallback on indexable pages. A build must fail when a new route lacks a configured card or two pages declare the same preview.

Social previews are presentation metadata. Do not claim that they directly improve search ranking.
