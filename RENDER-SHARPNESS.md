# Render Sharpness Gate

Text, logos, and interface icons must remain visually sharp in the exact production candidate. A valid color contrast score does not prove that glyph edges are clear. Browser compositing, fractional scaling, forced smoothing, unsupported fonts, and persistent transforms can make otherwise accessible content look fuzzy.

The render sharpness gate is mandatory core interface safety. It runs regardless of the project's optional design-system mode.

## What the Gate Detects

The reusable validator examines final CSS and rendered markup for deterministic sharpness hazards:

- Background blur applied directly to a content-bearing element instead of a decorative layer.
- A blur filter applied directly to content.
- Text shadows that soften ordinary interface text.
- Forced font smoothing instead of the browser and operating system default.
- Forced `text-rendering` modes with inconsistent browser behavior.
- Persistent fractional transforms or scaling on content layers.
- Permanent compositor hints through `will-change`.
- A first-choice font family that has no matching local system family or declared `font-face`.
- Inline SVG dimensions that fractionally scale the declared view box.

The check reports machine-readable findings and exits unsuccessfully when a hazard remains.

## Mandatory Production Check

Run the validator after the exact production build and before staging:

```bash
node /path/to/go-for-launch/scripts/verify-render-sharpness.mjs \
  --root=dist \
  --output=artifacts/render-sharpness-report.json
```

The normal project build or release command must invoke this check. A missing report, an unreadable build directory, or any remaining finding blocks production.

The report records:

- Gate status.
- Whether the result is blocking.
- Absolute audited root.
- CSS and markup file counts.
- Files changed by an explicit source auto-fix.
- Finding code, file, line, selector, and explanation.

## Safe Auto-Fix Workflow

Auto-fix is explicit because a production build must not silently rewrite source or generated output. Run it against source files, inspect the changes, rebuild, and then run the read-only production gate against the new `dist` directory.

```bash
node /path/to/go-for-launch/scripts/verify-render-sharpness.mjs \
  --root=src \
  --fix \
  --output=artifacts/render-sharpness-source-fix.json

npm run build

node /path/to/go-for-launch/scripts/verify-render-sharpness.mjs \
  --root=dist \
  --output=artifacts/render-sharpness-report.json
```

The fixer handles deterministic accidental patterns:

- Direct content blur becomes `none`.
- Ordinary text shadow becomes `none`.
- Forced smoothing and forced text rendering become `auto`.
- Persistent fractional content transforms become `none`.
- Permanent `will-change` becomes `auto`.
- Fractionally scaled inline SVG width and height are aligned to the view box dimensions.

The fixer does not guess which undeclared custom font should replace a missing font. Select a shipped font or a stable system stack in source.

Never run auto-fix against `dist` and treat that output as a source correction. Generated output must be rebuilt from corrected source.

## Intentional Visual Effects

Blur belongs on decorative background layers, normally `::before` or `::after`, while text and logos remain on an unfiltered content layer. Decorative pseudo-elements pass automatically.

When a non-pseudo content selector intentionally needs an effect, declare the intent inside the rule:

```css
.intentional-art-treatment {
  --render-sharpness-intent: intentional;
  filter: blur(8px);
}
```

Use this exception sparingly. It records intent but does not prove legibility. The exact candidate still requires browser and native Safari visual inspection.

An inline SVG with intentionally unusual dimensions can use `data-render-sharpness="allow"`. Prefer pixel-aligned dimensions for logos and interface icons.

## Required Visual Review

Automation identifies known causes of fuzzy rendering. It cannot decide whether every font looks subjectively crisp on every display. The release review must also inspect representative first viewports and text-heavy sections in:

- Chromium at device pixel ratios 1 and 2 where the environment supports both.
- Playwright WebKit with an iPhone profile.
- Native Safari on the selected iPhone Simulator.
- The staged custom hostname at normal browser zoom.

Inspect the logo, navigation, small uppercase labels, body copy, large headings, buttons, text over elevated surfaces, animated text, and inline SVG icons. Compare captures at their native resolution. Do not judge sharpness from a thumbnail or a screenshot resampled by chat, email, or presentation software.

## Acceptance Rules

Production is blocked when:

- The render sharpness report is missing or failed.
- Text or a logo is inside a filtered or persistently transformed content layer without explicit design intent.
- A required font is not shipped and does not have an approved system fallback.
- An inline logo or interface SVG uses accidental fractional scaling.
- Browser or native Safari review shows softness not explained by intentional motion or artwork.
- The auto-fix changed source and the site was not rebuilt and retested.

Record the JSON report, native-resolution screenshots, browser matrix, candidate identifier, and any intentional exceptions with the release evidence.
