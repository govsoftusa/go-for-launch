# Design Optimization and Brand Continuity

This standard provides the review method for design optimization, visual refinement, interface modernization, and responsive layout work performed with Go for Launch. It applies to an existing Astro site, a migration into Astro, and a new site whose brand system has already been established.

The goal is not to make every site look alike. The goal is to improve clarity, usability, accessibility, responsiveness, and perceived quality while preserving the identity that makes the site recognizable and trustworthy.

Framework-specific design review is project controlled. Read [Configurable Design-System Gate](DESIGN-GATE-POLICY.md) first. Use this workflow and [templates/design-optimization-brief.md](templates/design-optimization-brief.md) when the project selects `advisory` or `required` design review and its configured scope applies.

Accessibility, legibility, semantic interaction, responsive reflow, browser behavior, and native Safari reliability remain mandatory in every design mode. Turning design review off does not waive those core interface checks.

## Design Policy Context

The project configuration selects one of three modes:

- `off`, no design-system conformance review is performed.
- `advisory`, design findings are recorded but do not block production.
- `required`, missing or failed design review blocks production.

The project also selects Material Design, Apple Liquid Glass guidance, a custom design system, or a documented hybrid. These are optional design languages, not universal web requirements. Do not blend systems or claim conformance without an applicable passing review.

## Governing Principle

Design optimization must make the product easier to understand and use without erasing its brand.

Preserve the brand's recognizable anchors. Improve the system that presents them. Do not replace a coherent identity with a generic trend, a framework demonstration, or an imitation of another company.

A design change is successful only when all of the following are true:

1. The page communicates its purpose and primary action more clearly.
2. The layout has enough room for content at every supported viewport.
3. The brand remains recognizable without relying only on the logo.
4. Navigation and controls remain understandable, accessible, and responsive.
5. Decorative effects support hierarchy instead of competing with content.
6. The exact production candidate passes visual, accessibility, browser, native Safari, and performance gates.

## Research Basis

This standard combines durable interface principles from current public platform guidance. It does not require a site to imitate an operating system or component library.

- Material 3 and Android adaptive-layout guidance recommends responding to available window size rather than assuming one device type. Window size classes are useful planning references for compact, medium, and expanded experiences. See [Android Developers, Use window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes).
- Material Design treats typography as a system of purposeful roles and emphasizes component states as part of interaction clarity. See [Material Design, Typography](https://m3.material.io/styles/typography/overview) and [Material Design, Interaction states](https://m3.material.io/foundations/interaction/states/overview).
- Apple's Liquid Glass guidance reserves glass for a navigation and control layer above content, warns against glass in the content layer and nested glass, and requires legibility across changing backgrounds. See [Apple, Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).
- Apple describes hierarchy as a product of layout and grouping, not decoration alone, and emphasizes coherent adaptation across device sizes. See [Apple, Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/).
- WCAG 2.2 defines measurable requirements for contrast, text resizing, reflow, focus, target size, motion, and other accessibility needs. See [W3C, Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/).

Use those sources as constraints and reasoning tools. The target site's brand, content, users, and tasks remain the design source of truth.

## Design Review Workflow

Complete the following phases in order. Record the decisions and evidence in the design optimization brief.

## Phase 1: Establish the Design Baseline

Do not start by changing CSS. First establish what exists, what matters, and what is failing.

### Confirm scope and authority

Record:

- The routes and route families in scope.
- Whether the work is an optimization, partial redesign, complete redesign, or migration.
- The approved brand source, such as a style guide, production site, design file, asset library, or stakeholder direction.
- The intended audiences and their primary tasks.
- The business or user problem the design work must solve.
- Elements that stakeholders have explicitly required the work to preserve or change.

If brand authority is unclear, preserve the current production identity and make only reversible system improvements until a stakeholder resolves the ambiguity.

### Capture the current experience

Capture full-page and first-viewport evidence for representative pages at a minimum of:

- 1440 by 1000 CSS pixels for expanded desktop.
- 1024 by 900 CSS pixels for compact desktop or large tablet landscape.
- 768 by 1024 CSS pixels for tablet portrait.
- 390 by 844 CSS pixels for a common mobile viewport.
- 320 CSS pixels wide for the WCAG reflow boundary.

Include the homepage, every materially different route family, long-form content, navigation states, forms, modals, data-heavy sections, and error or empty states when present.

Record observations, not just screenshots. A screenshot without an explanation of the problem is weak evidence.

### Inventory brand anchors

Separate brand identity from incidental implementation details.

Brand anchors normally include:

- Logo and symbol treatment.
- Primary and supporting color roles.
- Typography character, including whether the voice is geometric, humanist, editorial, technical, formal, or conversational.
- Photography, illustration, icon, and diagram style.
- Shape language, such as corner geometry, line treatment, or recurring motifs.
- Voice, message hierarchy, and terminology.
- Recognizable composition patterns.
- Trust signals, institutional cues, and audience expectations.

For each anchor, mark it as preserve, refine, replace with approval, or unknown. Do not treat every existing pixel value as a brand anchor.

## Phase 2: Diagnose Before Styling

Design optimization begins with diagnosis. Identify the root problem instead of restyling the symptom.

### Hierarchy audit

For each representative page, answer:

1. What should the visitor understand first?
2. What is the primary action?
3. What supporting information earns attention next?
4. Can a visitor scan the page without reading every word?
5. Are size, weight, contrast, spacing, and position telling the same story?
6. Does decoration compete with the message?

Common hierarchy failures include an oversized hero, several actions with equal emphasis, headings that overpower their sections, insufficient separation between major ideas, and decorative surfaces that attract more attention than content.

### Density audit

Content looks cramped when the available canvas, type measure, spacing, and component anatomy are out of balance. Do not solve density only by reducing font size.

Check:

- Content maximum width and viewport gutters.
- Line length and reading measure.
- Section spacing and internal component padding.
- Grid column count at each viewport.
- Heading width, wrapping, and line height.
- Card content length and minimum height assumptions.
- Repeated borders, shadows, labels, and badges.
- Empty space that supports grouping versus empty space that merely makes a page taller.

When content is squished, prefer a wider adaptive canvas, fewer columns, more appropriate component anatomy, or clearer content grouping before shrinking text.

### Interaction audit

Inspect all relevant states:

- Default.
- Hover where hover exists.
- Keyboard focus.
- Active or pressed.
- Selected.
- Disabled.
- Loading.
- Success.
- Error.
- Open and closed navigation.

A component is not designed if only its resting state is designed.

### Global header, alert, announcement, and utility-bar audit

Every persistent bar near the top of a page must have a defined purpose. Classify it before deciding how it should look or where it should appear.

- An alert communicates urgent risk, service disruption, safety information, required action, or another condition that materially affects the current visit.
- An announcement communicates timely information with a clear destination, content owner, publication date, and review or expiration date.
- A utility bar provides recurring tasks or settings, such as account access, language selection, location, accessibility controls, or support.
- A brand statement communicates evergreen positioning, a mission, a value proposition, or an identity promise.

Brand statements belong in durable page content, a concise brand lockup, or a relevant hero. Do not style evergreen brand or marketing copy like an alert merely to make it prominent.

Rules:

- Prefer one coherent primary header layer containing the logo, primary navigation, and primary header action.
- Add a second global layer only when it has a distinct user purpose that cannot be served clearly inside the primary header or page content.
- Do not stack a promotional bar, logo row, navigation row, and hero when the layers compete for the first viewport.
- Do not use a status dot, warning color, alert icon, or urgent treatment unless the content represents an actual state that warrants that signal.
- Give announcements a content owner, destination when action is expected, publication date, and expiration or review date.
- Provide dismissal only when hiding the message is safe and the dismissal can be remembered appropriately. Do not make critical safety or service information easy to dismiss accidentally.
- Preserve substantive information when removing a misplaced bar by moving it to the correct content layer when it is not already represented elsewhere.
- Test the complete header anatomy with and without the optional bar at expanded, medium, compact, and 320 CSS pixel widths.
- Verify sticky positioning, focus order, skip-link behavior, menu opening, scroll clearance, and content visibility in Chromium, WebKit, and native Safari.

If the content cannot be classified, do not publish the bar until the content owner clarifies its purpose.

## Phase 3: Define Brand-Safe Design Tokens

Translate the brand into reusable roles before editing individual pages. Keep stable brand anchors separate from flexible interface tokens.

### Color roles

Define colors by purpose, not by arbitrary names:

- Brand primary.
- Brand accent.
- Page background.
- Elevated surface.
- Strong text.
- Muted text.
- Border or separator.
- Focus indicator.
- Success, warning, and error.
- Control surface or optional translucent material.

Each role must work in its actual context. A color that passes on white may fail on a translucent or image-backed surface.

### Typography roles

Define a restrained type system with roles such as:

- Display.
- Page title.
- Section title.
- Subsection title.
- Body.
- Supporting body.
- Label.
- Metadata.

Preserve the brand's typographic character while correcting cramped tracking, overly condensed text, weak body contrast, poor line height, and uncontrolled heading wraps. Use responsive sizing with sensible minimum and maximum values. Do not make heading size proportional to viewport width without limits.

### Spacing and geometry

Define:

- A spacing scale.
- Responsive page gutters.
- Section rhythm.
- Component padding.
- Corner radius roles.
- Border and elevation roles.
- Icon sizes.
- Control heights.

Related elements should share tighter spacing than unrelated groups. Repeated components should use the same anatomy unless their purpose differs.

## Phase 4: Build the Responsive Anatomy

Responsive design is not a smaller desktop page. Define how the experience changes when space and input conditions change.

### Use content-led ranges

Material window size classes can inform planning, but breakpoints must be placed where the actual design stops working. Test the transition rather than assuming the named device.

At each meaningful range, define:

- Navigation model.
- Page gutter and content maximum width.
- Grid column count.
- Hero composition.
- Reading measure.
- Card anatomy.
- Action placement.
- Media behavior.
- Sticky or fixed elements.
- Disclosure behavior.

### Preserve task priority

The primary task must remain apparent on desktop, tablet, and mobile. Reordering is allowed when it improves comprehension, but content or actions must not silently disappear because the viewport is smaller.

### Treat the hero as an introduction

The hero should establish identity, purpose, and the primary action. It should not consume space merely to appear dramatic.

Review:

- Whether the value proposition is visible without excessive scrolling.
- Whether the next meaningful section is discoverable in a common desktop viewport when appropriate for the page.
- Whether the primary action is clearly stronger than secondary actions.
- Whether decorative art supports the message.
- Whether headline measure and wrapping remain intentional at every viewport.

There is no universal hero height. The correct height follows from the page's purpose, content, and viewport, not a fixed trend.

### Design grids to breathe

Use the number of columns the content can support. A three-column grid that creates narrow, tall, repetitive cards is not automatically more efficient than a two-column grid.

Prefer:

- Expanded layouts that use available width without producing unreadably long lines.
- Medium layouts that reduce columns before content becomes cramped.
- Compact layouts that use a clear single-column reading flow.
- Consistent card padding and alignment.
- Fewer visible borders when spacing and surface contrast already establish grouping.

## Phase 5: Apply Materials and Effects with Restraint

Brand identity comes before visual fashion. Blur, translucency, gradients, shadows, and animated effects are supporting materials.

### Glass and translucency

Use translucent or glass-like material primarily for navigation, controls, temporary overlays, and other elements that float above content. This follows Apple's public guidance that Liquid Glass belongs in the navigation and control layer.

Rules:

- Do not place every content card on glass.
- Do not nest glass surfaces.
- Do not use live blur across large scrolling regions.
- Keep foreground content legible against every background the material may cross.
- Use borders, shadows, tint, or solid backing when separation is otherwise unclear.
- Provide a stable solid fallback when backdrop filtering is unsupported.
- Reduce or remove translucency for users who request reduced transparency or increased contrast where the platform exposes those preferences.
- Verify that glass does not introduce scroll, battery, or rendering problems in native Safari.

### Elevation and boundaries

Use surface tone, spacing, border, and shadow as a coordinated system. Avoid giving every element the same border and radius, which flattens hierarchy and produces a box-heavy interface.

An elevated surface should communicate a reason, such as interactivity, temporary presence, grouping, or separation from the page background.

### Motion

Motion should explain state change, preserve spatial context, or confirm an action. It must not delay access to content.

Rules:

- Respect `prefers-reduced-motion`.
- Avoid entrance animation on every section.
- Do not animate layout properties when a cheaper and more stable transform or opacity transition serves the same purpose.
- Keep focus, menu, modal, and disclosure state changes understandable without motion.
- Test interrupted animations and rapid repeated input.

## Phase 6: Meet Mandatory Accessibility Requirements

Automated accessibility tools are necessary, but they do not replace visual inspection, keyboard testing, screen reader reasoning, or native browser testing.

At minimum:

- Meet WCAG 2.2 AA contrast requirements, including 4.5 to 1 for normal text and 3 to 1 for large text.
- Preserve content and functionality at 200 percent text resize.
- Reflow without two-dimensional scrolling at 320 CSS pixels for ordinary page content.
- Support the WCAG text spacing overrides without clipping or loss of content.
- Provide visible keyboard focus with sufficient contrast and clearance.
- Use native links, buttons, inputs, and disclosure semantics wherever possible.
- Make pointer targets at least 24 by 24 CSS pixels or satisfy the WCAG spacing exception. Prefer 44 by 44 CSS pixels for important touch controls where the layout allows it. See [W3C, Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [W3C, Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced).
- Verify custom text can accept the spacing values described by [W3C, Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing) without loss of information.
- Do not encode meaning through color alone.
- Keep labels persistent and instructions understandable.

Do not claim accessibility compliance solely from an automated scan.

## Phase 7: Implement as a Coherent System

Make the smallest coherent set of changes that solves the diagnosed problems.

### Implementation rules

- Use the latest mutually compatible Astro and dependency versions required by repository instructions.
- Prefer design tokens and shared components over scattered one-off values.
- Preserve semantic HTML and progressively enhance interaction.
- Keep essential content available without client-side JavaScript.
- Separate desktop and compact navigation implementations when their interaction models genuinely differ, while keeping destinations and semantics consistent.
- Avoid a universal card or section component that erases meaningful content differences.
- Avoid broad global overrides that can silently change unrelated routes.
- Cover every affected route family, not only the homepage.
- Record intentional visual changes so they are not mistaken for parity defects.

### Brand continuity review

Before visual acceptance, answer these questions with evidence:

1. If the logo were hidden, would the color, type, voice, imagery, and composition still feel connected to the brand?
2. Which brand anchors were preserved?
3. Which anchors were refined, and why?
4. Did any popular design convention replace a distinctive brand behavior without an explicit user benefit?
5. Does the updated site feel like a more capable version of the same organization?

If the answer to the final question is no, the work needs revision or explicit stakeholder approval as a rebrand.

## Phase 8: Validate the Exact Candidate

Visual acceptance follows the configured design mode. In `required` mode it is a release gate. In `advisory` mode it records findings without blocking production. Passing code checks does not prove that a design conforms to the selected system.

### Applicable visual review

Review first-viewport and full-page captures at the baseline viewport set. Compare them with the recorded baseline and inspect:

- Brand continuity.
- Clear page purpose and primary action.
- Hero scale and first-viewport usefulness.
- Heading measure and wrapping.
- Content density and breathing room.
- Section rhythm.
- Grid transitions.
- Card consistency.
- Navigation in open, closed, hover, focus, and active states.
- Forms, validation, loading, success, and error states.
- Long-form reading comfort.
- Footer and final call to action.
- Overflow, clipping, overlap, and unintended blank space.

Screenshots supplement interactive inspection. They do not replace it.

### Human approval when project policy requires it

When `reviewerRequired` is true, changes to a logo, primary navigation, alert, announcement bar, utility bar, sticky header, or other global chrome require explicit approval from the designated human stakeholder.

Approval must:

- Apply to an identified candidate.
- Follow review of the actual rendered candidate, not only a code diff or verbal description.
- Include expanded desktop and compact mobile evidence.
- Include open navigation and any visible alert or announcement states.
- Record the reviewer, decision, and date.
- Occur before production promotion.

An isolated staging or preview deployment is the preferred approval surface. Automated checks and design-agent judgment can prepare a candidate, but they cannot substitute for the required human decision.

### Mandatory accessibility and preference review

Verify:

- Keyboard-only navigation.
- Visible focus.
- Automated accessibility scan with findings reviewed manually.
- 200 percent text resize.
- 320 CSS pixel reflow.
- Text spacing overrides.
- Reduced motion.
- Increased contrast and reduced transparency where testable.
- Touch target size and spacing.
- Screen reader names, roles, states, and reading order for changed components.

### Required browser and device review

Follow [TESTING-AND-RELEASE-CHECKLIST.md](TESTING-AND-RELEASE-CHECKLIST.md). Test the exact candidate in Chromium, Playwright WebKit, and native iOS Safari. Inspect live blur, sticky positioning, fixed navigation, viewport changes, text rendering, scrolling, menus, forms, and modals.

### Candidate evidence

Record:

- Candidate identifier and source revision.
- Design brief.
- Brand anchor inventory.
- Before and after captures.
- Viewports and device environments.
- State coverage.
- Accessibility results.
- Browser and native Safari results.
- PageSpeed results.
- Known differences and stakeholder approvals.
- Final acceptance decision and reviewer.

If code, content, assets, dependencies, or generated output changes after acceptance, rebuild and repeat the affected gates.

## Stop Conditions

Stop a `required` design release when any of the following is true. In `advisory` mode, record the same conditions as non-blocking findings while continuing to enforce every mandatory core gate:

- The approved brand source or design authority is materially ambiguous.
- The work erases recognizable brand anchors without explicit rebrand approval.
- The page purpose or primary action is less clear than the baseline.
- Content is cramped, clipped, overlapping, or missing at a required viewport.
- The hero or decorative treatment prevents useful first-viewport content.
- Interaction states are missing or inconsistent.
- Navigation destinations or essential actions disappear on a viewport.
- Contrast, focus, resize, reflow, text spacing, reduced motion, or target-size checks fail.
- Translucency or blur reduces legibility or causes native Safari rendering problems.
- Representative interior routes were not reviewed.
- Visual acceptance evidence is missing.
- A global bar has not been classified as an alert, announcement, utility bar, or brand statement.
- Evergreen brand or marketing copy is presented as an urgent alert without a genuine alert condition.
- An announcement lacks a content owner, destination when needed, or review or expiration date.
- A global navigation, logo, alert, announcement, utility-bar, or sticky-header change lacks explicit human approval of the identified candidate.
- A stakeholder has not approved a change that is effectively a rebrand.
- Any mandatory production gate in [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md) fails.

In `required` mode, do not waive a visual or brand failure because the build passes, the homepage looks polished, or a performance score is high. In `advisory` mode, preserve the finding in release evidence. In every mode, fix mandatory accessibility, responsive behavior, browser, and production failures before release.

## Definition of Done

When design review is applicable, design optimization is complete only when:

- The design brief and brand anchor inventory are complete.
- The diagnosed hierarchy, density, or interaction problems have measurable resolutions.
- The responsive anatomy is documented and verified.
- Brand continuity passes review.
- Changed components include complete interaction states.
- Accessibility and preference checks pass.
- Representative route families pass visual review at all required viewports.
- Playwright WebKit and native iOS Safari checks pass.
- PageSpeed requirements pass on the exact staged candidate.
- Stakeholder decisions and intentional differences are recorded.
- Required human approval of global chrome is recorded against the exact candidate.
- Production verification confirms the accepted design on the canonical hostname.
