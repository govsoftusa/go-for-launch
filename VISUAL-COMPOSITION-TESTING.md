# Visual Composition Testing

Rendering successfully is not visual acceptance. Go for Launch treats structural composition safety as a mandatory interface check, even when design-system conformance is off. Decorative lines crossing text, labels colliding, content escaping an artboard, and artwork that leaves excessive unplanned space can make a technically valid site look unfinished.

This gate applies to CSS illustrations, diagrams, generated page graphics, charts, hero artwork, and email graphics rendered as part of a website project. It does not decide whether a project follows Material Design, Apple guidance, or another optional design system.

## Mark the Visual Contract

Mark every composition that needs structural review:

```html
<div
  data-visual-artboard
  data-visual-name="Release workflow"
  data-min-horizontal-fill="0.68"
  data-min-vertical-fill="0.62"
  data-min-edge-inset="16"
>
  <span data-visual-label data-visual-name="Source">Source</span>
  <span data-visual-label data-visual-name="Verified output">Verified output</span>
  <i data-visual-decoration data-visual-name="Connector"></i>
</div>
```

Use `data-visual-label` on non-nested text or symbol regions that must remain separate. Use `data-visual-decoration` on rules, connectors, ornaments, and other geometry that must not cross labels. Do not mark an outer label group and its inner text at the same time.

The fill thresholds measure the bounding area occupied by marked labels. Choose reviewed values that reject accidental dead zones without forcing every illustration to be dense. The default is 50 percent in each direction.

## Configure the Exact Build

Copy [`templates/visual-composition.config.mjs`](templates/visual-composition.config.mjs) and list every route that contains a marked artboard. Include every changed route family. Keep desktop, mobile, and 320 CSS pixel coverage unless a recorded project constraint requires another viewport.

Run the verifier after the production build:

```bash
node /path/to/go-for-launch/scripts/verify-visual-composition.mjs --config=visual-composition.config.mjs
```

The verifier serves the static output locally, opens it in Chromium and WebKit, measures the rendered geometry, captures every marked artboard, and writes a machine-readable report. It fails when:

- A configured route does not contain a marked artboard.
- A label leaves the artboard safe area.
- Two marked labels overlap.
- A marked decorative element crosses a label.
- Marked content does not meet the reviewed horizontal or vertical fill threshold.
- A browser cannot render the configured route successfully.

Wire this command into the unskippable release verification command. Preserve its JSON report and screenshots with the candidate evidence.

## Human Review Still Matters

Geometry checks cannot judge whether a visual has a clear story, good balance, appropriate emphasis, or professional craft. Inspect every captured artboard at native size and answer:

- Does the reading order match the process being explained?
- Is every connector necessary and unambiguous?
- Does empty space support hierarchy, or does it look accidental?
- Does the visual remain balanced at desktop, mobile, and minimum width?
- Are labels legible without relying on decoration for meaning?

Record the reviewer, candidate identifier, reviewed routes, viewports, findings, and decision. Any collision, accidental dead zone, confusing connector, or unprofessional composition blocks production as core interface safety. Design-system taste remains governed separately by the project-controlled design gate.
