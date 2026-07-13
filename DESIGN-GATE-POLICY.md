# Configurable Design-System Gate

Go for Launch separates mandatory website quality from optional design-system conformance. Every project must pass the core release gates for accessibility, responsive behavior, browser reliability, mobile Safari, SEO, AEO, sitemap completeness, forms, performance, staging, and production verification. A project may decide whether Material Design, Apple Liquid Glass guidance, a custom design system, or a hybrid design review should influence or block its release.

The design-system gate is the only project-controlled release gate. Turning it off must not disable or weaken any core check.

## The Three Modes

| Mode | Design review behavior | Production effect |
|---|---|---|
| `off` | Do not evaluate design-system conformance. Record a skipped result. | Never blocks production. |
| `advisory` | Evaluate the selected design system and record findings. | Findings remain visible but do not block production. |
| `required` | Require a valid passing review or supported not-applicable record. | Missing, invalid, or failed review blocks production. |

The reusable configuration defaults to `off`. This makes framework-specific design review opt-in while leaving universal interface safety mandatory.

## Mandatory Core Interface Safety

The following checks remain required in every mode:

- Semantic content and controls.
- Keyboard operation and visible focus.
- WCAG 2.2 contrast, resize, reflow, text spacing, target size, and motion checks.
- Legible content, stable layout, and no overlap, clipping, or horizontal overflow.
- Sharp text, logos, and interface icons without accidental compositor blur, fractional scaling, forced smoothing, or unshipped first-choice fonts.
- Complete navigation and interaction behavior on supported viewports.
- Chromium, Playwright WebKit, and native iOS Safari verification.
- Static first paint and essential content without client-side JavaScript.
- PageSpeed, SEO, AEO, sitemap, redirect, localization, form, staging, and production requirements that apply to the project.

These requirements are framework-neutral. They do not claim that a site conforms to Material Design, Apple guidance, or another visual system.

## Project Configuration

Copy the reusable configuration into the site repository:

```bash
cp /path/to/go-for-launch/templates/design-gate.config.mjs ./design-gate.config.mjs
```

The configuration contains only design-system policy. It intentionally has no setting for disabling the core release gates.

```js
export default {
  mode: "off",
  framework: "none",
  scope: "changed-ui",
  customGuide: null,
  reviewerRequired: false
};
```

Supported framework values are:

- `none`, valid only when the mode is `off`.
- `material`, for Material Design conformance.
- `apple-liquid-glass`, for review against selected public Apple design guidance, including appropriate use of Liquid Glass.
- `custom`, for a project or organization design system.
- `hybrid`, for a documented combination with clear boundaries.

Use `changed-ui` when review applies only to releases that change user-interface files. Use `full-site` when the policy requires review of the complete site candidate. A custom or hybrid selection requires `customGuide` to point to the governing local document.

Do not describe Material Design or Apple Liquid Glass as universal web best practices. They are optional design languages. Accessibility, usability, legibility, responsive behavior, and browser reliability are universal release concerns.

## Review Record

Copy [templates/design-review-record.json](templates/design-review-record.json) into the release evidence directory. A completed review uses `pass`, `fail`, or `not-applicable`.

A passing record identifies the exact candidate and provides evidence:

```json
{
  "candidate": "candidate-123",
  "status": "pass",
  "reviewer": "Design owner",
  "reviewedAt": "2026-07-13",
  "reason": "",
  "evidence": ["evidence/design/home-mobile.png"],
  "findings": []
}
```

A not-applicable record requires a concrete reason and applicability evidence, such as a changed-file manifest. This prevents a required gate from disappearing silently.

```json
{
  "status": "not-applicable",
  "reason": "No user-interface files changed.",
  "evidence": ["evidence/changed-files.txt"],
  "findings": []
}
```

## Run the Gate

Run the design-system gate after the mandatory build and core validators:

```bash
node /path/to/go-for-launch/scripts/run-design-gate.mjs \
  --config=design-gate.config.mjs \
  --review=evidence/design-review.json \
  --output=evidence/design-gate-result.json
```

The runner always writes a machine-readable result. It exits successfully for `off`, advisory findings, a passing review, or a supported not-applicable decision. It exits with an error for an invalid configuration and for a missing, invalid, or failed review in `required` mode.

Example disabled result:

```json
{
  "gate": "design-system-conformance",
  "mode": "off",
  "framework": "none",
  "scope": "changed-ui",
  "status": "skipped",
  "blocking": false,
  "reason": "Disabled by project policy.",
  "findings": []
}
```

## Build Integration

The production workflow should execute in this order:

1. Build the exact candidate and generate the complete sitemap.
2. Run every mandatory core validator, including the render sharpness gate, and every browser gate.
3. Run the design-system gate and preserve its result.
4. Stop when a core gate fails.
5. Stop on a design finding only when the design mode is `required`.
6. Continue with staging, PageSpeed, native Safari, and public-host verification.

Do not implement this as a shell branch that silently omits design review. Run the gate in every release so the result states `skipped`, `advisory-findings`, `not-applicable`, `passed`, or `failed`.

## Claims and Acceptance

A project must not claim Material Design, Apple design, Liquid Glass, custom-system, or hybrid conformance unless an applicable review passed. An `off`, `advisory-findings`, or `not-applicable` result is not conformance evidence.

When `reviewerRequired` is true, a passing review must name the reviewer and review date. Use [templates/design-optimization-brief.md](templates/design-optimization-brief.md) for the detailed design review and [DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md](DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md) for the review method.

## Adoption Checklist

- [ ] Copy and commit `design-gate.config.mjs` in the site repository.
- [ ] Choose `off`, `advisory`, or `required` deliberately.
- [ ] Select one design framework or document hybrid boundaries.
- [ ] Keep all core release gates non-configurable.
- [ ] Add the design gate runner after the core validators.
- [ ] Preserve `design-gate-result.json` with release evidence.
- [ ] Require a review record when the selected mode and scope make design review applicable.
- [ ] Avoid conformance claims without a passing applicable review.
