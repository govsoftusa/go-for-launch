# Multi-Page Interface Quality and Page Differentiation

<!-- case-study-normalization-reviewed -->

## Scope

An educational website was rebuilt as a multi-page Astro site with a compact editorial homepage, route-specific layouts, public educational content, responsive scientific imagery, Cloudflare hosting, and strict release gates.

The redesign established a useful visual baseline, but final responsive review exposed defects that the existing reusable checks did not express as one complete contract.

## Symptoms

- The homepage action buttons touched the divider above the current-status region on compact screens.
- The Community page's circular room map extended 33 CSS pixels beyond the document at a 768 CSS pixel tablet width.
- Earlier route designs changed copy while repeating nearly the same layout, component rhythm, palette behavior, and page hierarchy.
- Large hero regions delayed useful content and made the first viewport feel less efficient.
- Repeated headings, balanced card copy, and generic calls to action made otherwise accurate content feel mechanically written.

## Root causes

- A responsive rule removed the homepage hero's bottom padding below 1040 CSS pixels.
- The Community layout switched to one column at 760 CSS pixels, leaving a narrow range where two minimum-width columns no longer fit.
- Browser coverage emphasized common desktop and phone profiles but did not run one complete route matrix at 320, 393, 768, 1024, and 1440 CSS pixels.
- Visual-composition checks covered marked artwork, not every interactive control and structural separator on the page.
- Page-family intent and archetype differences were documented editorially but were not represented by a reusable machine-readable contract.
- Content review assessed each route independently and did not compare openings, closings, or full-copy similarity across route families.

## Failed or misleading approaches

### One mobile screenshot

The initial phone view did not reveal the tablet overflow. Responsive acceptance needed explicit medium-width evidence.

### Whole bounding-box overlap checks

An early broad audit reported that two wrapped inline citation links overlapped. The links were correct. Their overall bounding rectangles contained empty areas between line fragments. Comparing `getClientRects()` fragments removed the false positive.

### Measuring closed menu descendants

Controls inside a closed `details` navigation region produced misleading geometry until the audit excluded hidden descendants while retaining the visible `summary` control.

### Accepting the first production browser run

Cloudflare briefly served the new HTML while one edge still returned the prior immutable stylesheet. The new regression test failed correctly. Release verification continued only after the stylesheet hash stabilized across staging, production, and the built artifact.

## Fixes

- Restored deliberate space between the homepage actions and the status divider.
- Changed the Community tablet composition to one centered column with a bounded room map.
- Added an explicit clearance assertion for the homepage action group.
- Added a full-site audit for overlapping controls, clipped controls, and horizontal overflow.
- Tested every public route at five responsive widths.
- Verified the exact candidate in Chromium, mobile Chromium, Playwright WebKit, and native iOS Safari.
- Preserved distinct page archetypes for the homepage, narrative pages, editorial pages, community map, talent pathways, technical dossier, legal record, form workspace, and reading pages.
- Added cross-route editorial comparison to identify repeated openings, closings, and full-page copy.

## Reusable rules

1. Test the whole public route set at expanded, compact desktop, tablet, mobile, and 320 CSS pixel widths.
2. Treat zero overlap as insufficient when actions sit beside rules, dividers, status bands, or fixed regions. Record a minimum clearance.
3. Compare inline control fragments, not only their union bounding box.
4. Exclude controls that are not rendered, including descendants of closed disclosure regions.
5. Require each route family to declare a page archetype, reader purpose, content rhythm, visual identity, and visible distinctive elements.
6. Compare rendered structure, layout, palette, typography, and media roles between different route families.
7. Compare content openings, closings, and full copy across content families.
8. Set reviewed header and hero proportions per project and route. Do not impose one universal hero height.
9. Recheck production after asset propagation. A candidate identifier alone does not prove that every edge returned a consistent HTML and CSS combination.
10. Turn every discovered layout defect into a regression test before release.

## Acceptance evidence

The corrected production candidate passed the full route and viewport interference matrix, visual-composition checks, the production Go for Launch build, Chromium, mobile Chromium, Playwright WebKit, native iOS Safari, canonical and legacy redirects, and all eight required PageSpeed scores of 100.

The reusable implementation produced by this case is documented in [Interface Quality and Page Differentiation Gate](../INTERFACE-QUALITY-AND-PAGE-DIFFERENTIATION.md).
