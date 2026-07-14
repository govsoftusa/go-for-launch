# Astro Assets Implementation and Verification

Use `astro:assets` for local content images that benefit from optimization. Keep source images under `src/` so Astro can transform them. Files under `public/` are copied without transformation, which is appropriate for stable direct-address assets such as favicons, robots files, and generated Open Graph images.

## Default Implementation

Copy [`ResponsivePicture.astro`](templates/astro-assets/ResponsivePicture.astro) into the site, then use it with an imported local source:

```astro
---
import ResponsivePicture from "../components/ResponsivePicture.astro";
import team from "../assets/team.jpg";
---

<ResponsivePicture
  src={team}
  alt="The website team reviewing a release checklist"
  width={960}
/>
```

The component uses Astro's `Picture` component, emits AVIF and WebP sources, preserves intrinsic dimensions, uses a constrained responsive layout, and provides `srcset` and `sizes` in the built output.

For a single output format, use Astro's `Image` component directly:

```astro
---
import { Image } from "astro:assets";
import diagram from "../assets/diagram.png";
---

<Image src={diagram} alt="Release workflow" layout="constrained" width={900} />
```

## Authoring Rules

- Import local raster images from `src/`.
- Give informative images concise alternative text.
- Use an empty `alt` only for an image that is truly decorative and adds no information.
- Preserve explicit intrinsic width and height in the generated HTML.
- Use `loading="eager"` and `fetchpriority="high"` only for the likely largest-contentful-paint image.
- Lazy load below-the-fold images.
- Authorize remote image sources with `image.domains` or `image.remotePatterns` before expecting Astro to process them.
- Do not convert an SVG logo to a raster format only to use `Image`. Astro can import local SVG files as components.
- Measure build time and output volume when a site has a large image library.

Native `img` is valid HTML. It is still appropriate for already optimized external assets, direct public files, email-compatible markup, or cases where transformation is intentionally disabled. The release requirement is stable layout, accessible text alternatives, correct delivery, and measured performance, not a blanket ban on `img`.

## Built Output Test

Copy [`verify-images.mjs`](scripts/verify-images.mjs) and its helper into the target project. Run it after `astro build`:

```bash
node scripts/verify-images.mjs --dir=dist
```

The verifier fails when an image lacks `alt`, positive intrinsic dimensions, or required `srcset` and `sizes` attributes for Astro constrained and full-width responsive layouts. It also requires every `picture` to contain source elements and exactly one fallback image.

Run the [Ahrefs-style site-health audit](SITE-HEALTH-AUDIT.md) after all final HTML and CSS transformations. It discovers referenced local images in markup, `srcset`, inline styles, built stylesheets, and social metadata, then enforces the project's byte budget. Checking only source image folders misses large CSS backgrounds and cannot prove which assets the production candidate actually uses.

Keep original migration assets immutable. Generate optimized derivatives, preserve aspect ratios and SVG view boxes, then repeat screenshot, render-sharpness, and Open Graph review after optimization.

The test inspects final HTML because a correct source component can still produce unexpected output after configuration, content, or dependency changes. Keep browser checks for decoding errors, aspect ratio, first paint, responsive selection, and horizontal overflow.

## Astro Configuration

Astro can apply a responsive layout globally. Confirm that this is appropriate for the site's content and CSS before enabling it:

```js
export default defineConfig({
  image: {
    layout: "constrained",
    responsiveStyles: true
  }
});
```

Tailwind projects may choose to own responsive image styles instead. Do not enable two conflicting style contracts without testing the built result.

## Official References

- [Astro images guide](https://docs.astro.build/en/guides/images/)
- [`astro:assets` API](https://docs.astro.build/en/reference/modules/astro-assets/)
- [Astro remote image authorization](https://docs.astro.build/en/guides/images/#authorizing-remote-images)
