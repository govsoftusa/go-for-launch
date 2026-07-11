# Interface Quality and Page Differentiation Gate

A page can pass a build, look polished in one screenshot, and still be uncomfortable to use. Controls can touch separators at one breakpoint, a two-column layout can overflow only at tablet width, a closed mobile menu can confuse naive overlap tests, and several routes can reuse one composition so completely that the site feels like a template with swapped copy.

Go for Launch treats geometry safety as a mandatory release concern. It also requires projects with multiple route families to define and verify the intended differences between those families. This is separate from optional Material Design, Apple Liquid Glass, custom-system, or hybrid conformance.

## What the gate checks

Run:

```sh
node scripts/verify-interface-quality.mjs --config=interface-quality.config.mjs
```

The verifier serves the exact built output and checks every configured route in Chromium and WebKit at the reviewed viewport matrix. The standard template includes 1440, 1024, 768, 390, and 320 CSS pixel widths.

The blocking geometry checks cover:

- Horizontal document overflow.
- Visible controls that leave the viewport.
- Controls whose rendered content is clipped.
- Unrelated controls whose rendered fragments overlap.
- Project-defined clearance between actions, separators, status bands, media, or the next structural region.
- Project-defined maximum header and hero proportions.
- Project-defined first-viewport visibility for the content after a hero.
- Missing route-specific elements and missing page-archetype markers.

Target-size findings are warnings by default because WCAG includes exceptions that require context. Inline text links are excluded from the automated target-size check. Projects may make the remaining findings blocking after documenting the applicable control and spacing policy.

## Why the browser measurement uses fragments

An inline link can wrap across two lines. Its overall bounding rectangle includes empty space between its line fragments. Comparing only that outer rectangle can falsely report that the link overlaps a nearby inline link.

The interface gate compares every rectangle returned by `getClientRects()`. It also excludes controls inside a closed `details` region while retaining the visible `summary`. These rules avoid two false positives found during real responsive testing.

## Route family and archetype contract

Every indexable route must be covered when `requireIndexableCoverage` is enabled. Each route record declares:

- `family`, the route family that may intentionally share one composition.
- `archetype`, the project-owned page composition used by that family.
- `purpose`, the reader purpose of the route.
- `contentRhythm`, the intended sequence and density of content.
- `visualIdentity`, the route family's intended visual character.
- `distinctiveSelectors`, visible elements that prove the route-specific treatment exists.

Render one visible `data-page-archetype` marker on each configured page:

```html
<main data-page-archetype="technical-dossier" data-solutions-experience>
  <!-- page content -->
</main>
```

Routes in one article or product-detail family may share an archetype. Different route families may not silently claim the same archetype. If two routes genuinely belong to the same composition, classify them as the same family rather than inventing different names.

## Measured page differentiation

A unique marker is documentation, not proof. The verifier also creates a rendered fingerprint for each page at the configured differentiation viewports. It compares five dimensions:

1. Structure, including the order and display roles of the main page regions.
2. Layout, including grid, flex, and positioning behavior.
3. Palette, using rendered background colors.
4. Typography, using the rendered page-title family, size, weight, line height, and alignment.
5. Media, using image, figure, video, form, and background-image roles.

Different route families must differ in at least the configured number of dimensions. The template requires two. This rejects a site where every page has the same layout and visual treatment with different text, while allowing one coherent brand system to connect the pages.

Do not chase the score by adding arbitrary colors, images, or markup. The project must first define a useful route archetype, then implement the differences that support the page's purpose.

## Header and hero contracts

There is no universal correct hero height. A campaign page, reading page, application screen, and legal record have different needs. Each project sets reviewed limits where a hero exists.

Use a route contract to define:

- The hero selector.
- The maximum share of the viewport height it may occupy.
- The next meaningful region.
- How much of that next region should be visible in the first viewport, when appropriate.

Use the global header contract to keep stacked navigation, announcements, and utility controls from consuming an excessive share of the compact viewport. The number is a project decision supported by the design brief, not a universal design-system rule.

## Clearance contracts

Ordinary collision detection cannot tell whether a button touching a separator is intentional. Add a clearance contract for important relationships:

```js
{
  name: "Primary actions above the status divider",
  from: "[data-primary-actions]",
  to: "[data-status-region]",
  minimum: 16,
  requireHorizontalIntersection: true
}
```

Use clearance contracts for action groups above borders, sticky controls above safe areas, captions below media, or any reviewed relationship where zero overlap is not enough.

## Content similarity works with this gate

The Stanford Rule verifier compares route openings, closings, and full copy across content families. High similarity can reveal mechanically repeated introductions, generic calls to action, and pages that differ only by nouns.

Page differentiation and content similarity answer different questions:

- The interface gate asks whether routes have safe geometry and intentional page compositions.
- The content gate asks whether routes make distinct human arguments in language suited to their audience and task.

Both reports are required evidence. Neither report proves design quality or human authorship by itself.

## Project integration

1. Copy [`templates/interface-quality.config.mjs`](templates/interface-quality.config.mjs) into the target project.
2. Add `data-site-header` to the persistent site header.
3. Add one `data-page-archetype` marker to each configured route.
4. Define every indexable route, family, purpose, content rhythm, visual identity, and distinctive selector.
5. Add hero and clearance contracts only where the relationship exists.
6. Run the verifier after the exact production build.
7. Wire it into the normal build or unskippable release verification command.
8. Preserve the JSON report and failure screenshots with candidate evidence.
9. Inspect first-viewport and full-page captures for every route family at native size.
10. Repeat the gate after any HTML, CSS, font, content, asset, breakpoint, or global-header change.

## Human review

The automated gate cannot decide whether a page is beautiful, whether a visual metaphor is appropriate, or whether different compositions still feel like one brand. Reviewers must inspect:

- Header clarity and compact behavior.
- Hero scale and first-viewport usefulness.
- Action hierarchy and spacing around separators.
- Heading wrapping, reading measure, and paragraph density.
- Tablet transitions, not only desktop and phone layouts.
- The visual and editorial reason each route family differs.
- Brand continuity across palettes, typography, images, and layout archetypes.
- Native Safari behavior after staging and again on production.

Any unexplained collision, clipping, overflow, excessive hero, missing route-family distinction, or first-viewport obstruction blocks production. Fix the source, rebuild, and repeat the complete affected gate.
