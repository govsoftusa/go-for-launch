# Design Optimization Brief and Acceptance Record

Use this worksheet for any visual optimization, design refactor, responsive redesign, or brand-system implementation. Complete it alongside [Design Optimization and Brand Continuity](../DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md).

## Design Gate Policy

- Mode: off, advisory, or required
- Framework: material, apple-liquid-glass, custom, or hybrid
- Scope: changed-ui or full-site
- Custom or hybrid guide:
- Reviewer required: yes or no
- Machine-readable gate result:

Do not use this record to waive mandatory accessibility, responsive behavior, browser, SEO, AEO, sitemap, performance, or production checks.

## Project

- Site:
- Repository and Astro root:
- Canonical hostname:
- Staging hostname:
- Candidate identifier:
- Source revision:
- Design owner:
- Technical owner:
- Reviewer:
- Date opened:
- Date accepted:

## Scope

- Work type: optimization, partial redesign, complete redesign, migration
- Routes and route families in scope:
- Primary audiences:
- Primary audience tasks:
- Business or user problem:
- Explicit stakeholder requirements:
- Explicit exclusions:
- Approved brand source:

## Global Chrome Classification

Complete this section when the site has, adds, removes, or changes a bar near the logo or primary navigation.

| Element | Classification | User purpose | Content owner | Destination | Publish date | Review or expiration date |
|---|---|---|---|---|---|---|
| Primary header | Navigation | | | | | |
| Optional top bar | Alert, announcement, utility, brand statement, or not used | | | | | |

- Why does any second header layer need to exist?
- Could its content be served more clearly in the primary header or page content?
- Does the treatment imply urgency, warning, or live status?
- Is that implication factually correct?
- Where is substantive content preserved if a misplaced bar is removed?
- How does the anatomy change at expanded, medium, compact, and 320 CSS pixel widths?

## Baseline Evidence

Record first-viewport and full-page evidence for representative routes.

| Route or state | 1440 by 1000 | 1024 by 900 | 768 by 1024 | 390 by 844 | 320 wide | Notes |
|---|---|---|---|---|---|---|
| Homepage | | | | | | |
| Representative interior page | | | | | | |
| Long-form page | | | | | | |
| Navigation open | | | | | | |
| Form or modal | | | | | | |

## Brand Anchor Inventory

Use preserve, refine, replace with approval, or unknown as the decision.

| Brand anchor | Current evidence | Decision | Intended treatment | Approval or rationale |
|---|---|---|---|---|
| Logo and symbol | | | | |
| Primary and supporting colors | | | | |
| Typography character | | | | |
| Photography or illustration | | | | |
| Icon style | | | | |
| Shape language | | | | |
| Voice and terminology | | | | |
| Composition patterns | | | | |
| Trust signals | | | | |

## Diagnosis

### Hierarchy

- What should the visitor understand first?
- What is the primary action?
- What should earn attention next?
- What currently competes for attention?
- What evidence shows the hierarchy needs improvement?

### Density

- Where does content feel cramped or excessively sparse?
- Which canvas, gutter, measure, grid, or component constraint causes it?
- Which changes will solve the root problem?
- How will the result be judged?

### Interaction

- Which components or states are unclear or incomplete?
- Which keyboard, touch, loading, success, and error behaviors must change?
- Which interactions differ across compact and expanded layouts?

## Brand-Safe Design Tokens

### Color roles

| Role | Token | Value | Contrast contexts | Brand rationale |
|---|---|---|---|---|
| Brand primary | | | | |
| Brand accent | | | | |
| Page background | | | | |
| Elevated surface | | | | |
| Strong text | | | | |
| Muted text | | | | |
| Border or separator | | | | |
| Focus indicator | | | | |
| Success | | | | |
| Warning | | | | |
| Error | | | | |

### Typography roles

| Role | Family | Size range | Weight | Line height | Measure or wrap rule |
|---|---|---|---|---|---|
| Display | | | | | |
| Page title | | | | | |
| Section title | | | | | |
| Subsection title | | | | | |
| Body | | | | | |
| Supporting body | | | | | |
| Label | | | | | |
| Metadata | | | | | |

### Spacing, geometry, and elevation

- Spacing scale:
- Page gutter ranges:
- Content maximum widths:
- Reading measure:
- Section rhythm:
- Component padding roles:
- Corner radius roles:
- Border roles:
- Elevation roles:
- Control heights:
- Icon sizes:

## Responsive Anatomy

Use content-led breakpoints. Do not assume that device names define the breakpoint.

| Concern | Compact | Medium | Expanded |
|---|---|---|---|
| Navigation model | | | |
| Page gutter | | | |
| Content maximum width | | | |
| Grid columns | | | |
| Hero composition | | | |
| Reading measure | | | |
| Card anatomy | | | |
| Action placement | | | |
| Media behavior | | | |
| Sticky or fixed elements | | | |
| Disclosure behavior | | | |

## Materials and Motion

- Where is translucency or glass used, and why is it a control or navigation layer?
- What solid fallback is provided?
- How is foreground separation maintained over changing content?
- Are any glass surfaces nested?
- Which effects are removed for reduced transparency or increased contrast?
- Which motion explains state or spatial change?
- What happens under reduced motion?
- What native Safari risks require direct inspection?

## Acceptance Criteria

### Brand continuity

- [ ] The design remains recognizable without relying only on the logo.
- [ ] Preserved brand anchors are visible in the candidate.
- [ ] Every refined anchor has a documented rationale.
- [ ] Every replacement that changes brand meaning has stakeholder approval.
- [ ] The result feels like a more capable version of the same organization, or is explicitly approved as a rebrand.

### Hierarchy and density

- [ ] Page purpose is clear in the first viewport.
- [ ] One primary action has appropriate emphasis.
- [ ] Hero scale supports rather than delays the page purpose.
- [ ] Heading wraps are intentional at every required viewport.
- [ ] Content has adequate breathing room without excessive page length.
- [ ] Grid column changes occur before content becomes cramped.
- [ ] Long-form pages have a comfortable reading measure.

### Components and interaction

- [ ] Changed components have default, hover, focus, active, disabled, loading, success, and error states where applicable.
- [ ] Compact and expanded navigation expose the same required destinations.
- [ ] Keyboard and touch behavior are complete.
- [ ] Forms and validation remain understandable.
- [ ] Motion is meaningful and respects reduced motion.
- [ ] Every global bar has a documented alert, announcement, utility, or brand-statement classification.
- [ ] Evergreen brand positioning is not styled as an alert.
- [ ] Announcements have a content owner and review or expiration date.
- [ ] The logo, navigation, optional bars, hero, and first content section form a clear first-viewport hierarchy.

### Accessibility

- [ ] Normal and large text contrast passes WCAG 2.2 AA.
- [ ] Non-text contrast and focus indicators pass.
- [ ] Content remains usable at 200 percent text resize.
- [ ] Ordinary page content reflows at 320 CSS pixels.
- [ ] WCAG text spacing overrides do not clip or hide content.
- [ ] Pointer target size and spacing pass.
- [ ] Color is not the only means of communicating meaning.
- [ ] Automated findings were reviewed manually.
- [ ] Screen reader names, roles, states, and reading order were checked for changed components.

### Browser and device evidence

| Environment | Candidate or URL | Result | Evidence | Reviewer |
|---|---|---|---|---|
| Chromium desktop | | | | |
| Chromium mobile | | | | |
| Playwright WebKit | | | | |
| Native iOS Safari | | | | |
| Reduced motion | | | | |
| Increased contrast | | | | |
| Reduced transparency | | | | |
| 200 percent text resize | | | | |
| 320 CSS pixel reflow | | | | |

## Before and After Review

| Route or state | Before evidence | Candidate evidence | Improvement | Remaining difference |
|---|---|---|---|---|
| Homepage | | | | |
| Representative interior page | | | | |
| Long-form page | | | | |
| Navigation open | | | | |
| Form or modal | | | | |

## Release Evidence

- Build result:
- Automated test result:
- Accessibility result:
- Playwright WebKit result:
- Native iOS Safari device and UDID:
- Native iOS Safari result:
- Staging verification:
- PageSpeed mobile scores:
- PageSpeed desktop scores:
- Production deployment identifier:
- Canonical hostname verification:

## Differences, Risks, and Approvals

| Difference or risk | Reason | Impact | Owner | Approval or follow-up |
|---|---|---|---|---|
| | | | | |

## Final Decision

- [ ] Accepted for production.
- [ ] Rejected, revise and repeat the gate.
- [ ] Blocked by missing authority, evidence, environment, or approval.

- Decision:
- Reviewer:
- Date:
- Notes:

### Human approval of global chrome

- Candidate reviewed:
- Preview or staging URL:
- Desktop evidence:
- Mobile evidence:
- Open navigation evidence:
- Alert or announcement state evidence, if applicable:
- Human reviewer:
- Decision:
- Approval date:
- Requested revisions, if rejected:
