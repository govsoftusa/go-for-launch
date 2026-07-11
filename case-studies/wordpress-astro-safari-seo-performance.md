# WordPress-to-Astro Safari, SEO, Performance, and Production Runbook

This case study is maintained under `case-studies/` and indexed by the repository `README.md`. Site-identifying names, hostnames, and identifiers have been replaced with placeholders. Use the shared porting playbook for general guidance and this document for site-specific evidence. The application source remains a separate project checkout, so confirm its current location before editing, testing, or deploying application code.

## Purpose

This runbook records the complete process used to validate, remediate, test, and deploy a WordPress-origin Astro marketing site. It is intended for future agents and engineers working in this repository.

The acceptance target was broader than a successful build. The finished site had to:

- Preserve the established site brand, logo, typography, content, and legal structure.
- Work correctly in real mobile Safari, not only a desktop browser with a narrow viewport.
- Score 100 in Performance, Accessibility, Best Practices, and SEO for mobile and desktop PageSpeed tests on every indexable public page.
- Provide accurate Open Graph previews and explicit search and AI discovery guidance.
- Keep the Master Service Agreement private from normal discovery and indexing.
- Deploy through the correct Cloudflare account and work on the canonical public hostname.

## Non-Negotiable Product Rules

1. The existing site identity is the source of truth. Do not redraw, reinterpret, recolor, or replace the logo.
2. The site is operated by a distinct legal entity. Keep operator attribution accurate and do not associate the site with unrelated companies or brands.
3. The public legal source set consists of the Legal Hub, Privacy Policy, and Terms and Conditions.
4. The Master Service Agreement is presented during account sign-up and onboarding. It must not appear in the primary navigation, footer, public sitemap, public structured data, or public discovery copy.
5. The MSA route must emit `noindex`, `nofollow`, and `noarchive` directives in both HTML metadata and Cloudflare response headers.
6. Do not expose email addresses, API credentials, Cloudflare tokens, PageSpeed keys, or 1Password values in source code, command output, documentation, or logs.
7. Preserve unrelated working-tree changes. This repository may already contain user work. Never revert it as part of a performance or deployment task.

## Final Route and Discovery Model

| Route | Purpose | Indexable | In sitemap | Public navigation |
|---|---|---|---|---|
| `/` | Main marketing page | Yes | Yes | Yes |
| `/legal/` | Public legal directory | Yes | Yes | Footer |
| `/privacy-policy/` | Public privacy policy | Yes | Yes | Legal Hub and footer |
| `/terms-and-conditions/` | Public terms | Yes | Yes | Legal Hub and footer |
| `/msa/` | Agreement shown during sign-up | No | No | No |

The apex domain redirects permanently to the canonical host:

```text
https://example.com/* -> https://www.example.com/*
```

The canonical production origin is `https://www.example.com`.

## Repository Map

The key implementation surfaces are:

| Path | Responsibility |
|---|---|
| `src/components/SeoHead.astro` | Canonical metadata, robots directives, Open Graph, Twitter, hreflang, favicon, manifest, and discovery links |
| `src/components/SiteHeader.astro` | Announcement strip, desktop navigation, and mobile navigation |
| `src/components/SiteFooter.astro` | Conventional footer, legal links, social links, and operator trademark statement |
| `src/components/ContactModal.astro` | Responsive contact dialog, Turnstile loading, validation, and submission behavior |
| `src/layouts/LegalLayout.astro` | Shared legal document structure and legal metadata integration |
| `src/layouts/ErrorLayout.astro` | Shared branded error-page structure |
| `src/pages/index.astro` | Homepage content, responsive hero, structured data, and image loading |
| `src/pages/legal.astro` | Public legal directory and legal structured data |
| `src/pages/privacy-policy.astro` | Public privacy policy |
| `src/pages/terms-and-conditions.astro` | Public terms |
| `src/pages/msa.astro` | Private MSA route with restrictive indexing controls |
| `src/pages/403.astro`, `404.astro`, `500.astro` | Branded error responses |
| `src/styles/global.css` | Typography, responsive layout, mobile navigation, reduced motion, and accessibility states |
| `workers/contact-form.js` | Cloudflare Worker validation, Turnstile verification, and email delivery |
| `wrangler.contact.jsonc` | Contact Worker route and Cloudflare Email Routing binding |
| `wrangler.toml` | Cloudflare Pages project and build output configuration |
| `public/robots.txt` | Search and AI crawler policy |
| `public/llms.txt` | Concise AI discovery guidance |
| `public/llms-full.txt` | Expanded entity and content guidance for AI systems |
| `public/_headers` | Cloudflare cache policy and `X-Robots-Tag` protection |
| `scripts/generate-social-images.mjs` | Deterministic Open Graph and responsive image generation |
| `scripts/write-sitemap-alias.mjs` | Conventional and legacy-compatible sitemap aliases |
| `playwright.config.ts` | Desktop Chromium and iOS WebKit test projects |
| `tests/e2e/` | Desktop, Safari, mobile interaction, and SEO assertions |
| `tsconfig.json` | Astro source scope and archive exclusions |

## Phase 1, Establish a Trustworthy Baseline

### 1. Inspect instructions and repository state

Before editing:

```bash
pwd
rg --files -g 'AGENTS.md' -g '!node_modules'
git status --short
git branch --show-current
node --version
npm --version
```

Read every applicable `AGENTS.md`. Record existing modified and untracked files. Do not assume that all dirty files belong to the current task.

### 2. Confirm the real application root

Verify the Astro application using `package.json`, `astro.config.*`, `src/`, and the active Cloudflare configuration. Do not deploy an archive, generated `dist/` directory, or an old WordPress export.

### 3. Update compatible dependencies

At the time of this work, the validated versions were:

- Astro `7.0.7`
- `@astrojs/sitemap` `3.7.3`
- Playwright `1.61.1`
- Sharp `0.35.3`
- `@astrojs/check` `0.9.9`
- TypeScript `6.0.3`

Check current compatibility before changing these versions. The newest TypeScript release is not automatically the correct choice. TypeScript 6 was used because it satisfied the active Astro check peer range.

Run:

```bash
npm install
npm audit
npm run check
npm run build
```

### 4. Keep archived WordPress files out of type checking

The repository contained a roughly 265 MB archived WordPress tree. An unrestricted `astro check` scanned that archive, produced irrelevant warnings, and exhausted a 4 GB heap.

The fix was to scope `tsconfig.json` to active application files and exclude generated and archived directories:

```json
{
  "include": [
    ".astro/types.d.ts",
    "src/**/*",
    "tests/**/*",
    "playwright.config.ts"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "site-archive-*"
  ]
}
```

Do not raise the heap limit to hide this problem. Scope the checker to the actual application.

## Phase 2, Audit Mobile Safari Correctly

### Why desktop emulation is insufficient

Chromium mobile emulation does not reproduce the WebKit rendering pipeline, Safari compositing behavior, viewport handling, or native toolbar effects. Use three layers of evidence:

1. Playwright WebKit with an iPhone device profile.
2. Xcode Simulator running native Mobile Safari.
3. The live production hostname after deployment.

### Source audit for common Safari defects

Search for broad compositing and blur rules before changing anything:

```bash
rg -n 'translateZ|backface-visibility|will-change|backdrop-filter|filter:\s*blur|100vh|position:\s*fixed' src public
```

Pay special attention to rules applied to `*`, `body`, `main`, or large page sections. Broad `translateZ(0)`, backface visibility, and large live blur surfaces can create expensive Safari layers and visual artifacts.

Do not add compositor hints without measured evidence. In this site, the broad compositing problems described by an earlier migration runbook were not present in the active source.

### Playwright WebKit configuration

The mobile project uses the Playwright iPhone 13 device profile and WebKit at `390 x 844`. The desktop project uses Chromium at `1440 x 1000`.

Use repository scripts:

```bash
npm run test:webkit
npm test
```

The iOS test suite validates:

- Every public route returns a successful response.
- The main heading is visible.
- No horizontal overflow exists.
- Images include explicit width and height attributes.
- No excessive transformed text or large live blur surface exists.
- Header-to-heading spacing remains at least 24 pixels.
- Animated scroll down and back up completes smoothly.
- The mobile menu opens, closes, and responds to Escape.
- The contact modal locks and restores body scrolling.
- Turnstile is absent at initial page load and appears only after the modal opens.
- No uncaught page errors occur.

The scroll test records animation frames. Its accepted limits are p95 under 80 ms and maximum frame delay under 500 ms. These are regression guards, not a substitute for native Safari inspection.

### Native iPhone Simulator workflow

Confirm installed tooling:

```bash
xcodebuild -version
xcrun simctl list runtimes
xcrun simctl list devices available
```

The validated environment was Xcode `26.6`, iOS `26.5`, and an iPhone 17 Pro simulator. The original machine-specific UDID has been replaced with a placeholder.

Always target a specific UDID so another simulator cannot receive the command:

```bash
UDID='YOUR-SIMULATOR-UDID'
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$UDID"
xcrun simctl openurl "$UDID" 'http://127.0.0.1:4321/'
```

Open and inspect at least:

- Homepage initial viewport
- Mobile menu open state
- Contact modal
- Legal Hub
- Privacy Policy
- Terms and Conditions
- Production homepage

Check typography, header density, first-viewport content, safe-area behavior, horizontal overflow, modal scrolling, menu controls, images, and footer layout.

Synthetic drag gestures can produce transient black simulator captures even when the site renders correctly. A black frame immediately after navigation is not enough evidence of a web defect. Recheck with a fresh Simulator app state, take another capture, and compare with WebKit and the production URL.

Shut down the simulator after verification:

```bash
xcrun simctl shutdown "$UDID"
```

## Phase 3, Mobile Layout Remediation

The key mobile changes were deliberately small and brand-preserving:

- The announcement was shortened to preserve clarity and reduce header height.
- A redundant contact link in the top strip was hidden on mobile.
- The hero image was constrained to `min(260px, 100%)` on small screens.
- The headline became visible in the first viewport and became an earlier paint candidate.
- `text-size-adjust: 100%` was applied to prevent Safari font inflation.
- The page retained a 320 pixel minimum layout width.
- Main-content overflow was clipped, with a hidden fallback where necessary.
- Reduced-motion preferences disabled nonessential animation.
- Navigation and modal controls maintained at least 44 by 44 pixel touch targets.

The final mobile announcement copy is:

```text
Your same-day service headline | Not affiliated with the related state agency
```

Do not redesign the header, logo, or content hierarchy to solve a spacing problem. First remove redundancy, tighten responsive constraints, and verify the real first viewport.

## Phase 4, Performance Remediation

### Root cause 1, Turnstile loaded on every page

The hidden contact modal originally included the Cloudflare Turnstile script in the initial document. This added third-party work even when visitors never opened the form.

The fix was to remove the static external script and create it dynamically inside `loadTurnstile()` when the contact modal opens. The test suite confirms that the script is absent on initial load and present after modal activation.

Keep server-side Turnstile validation. Lazy loading changes delivery timing, not the security boundary.

### Contact form delivery boundary

The public site does not expose a telephone number or direct email address as its primary contact method. `ContactModal.astro` submits to `/api/contact`, which is routed to `workers/contact-form.js`.

The Worker must:

- Accept only the expected method and content type.
- Enforce field lengths and validate required values server-side.
- Verify the Turnstile token with Cloudflare before sending anything.
- Reject malformed, automated, and replayed submissions.
- Construct the email from validated values without trusting user-supplied headers.
- Send through the `CONTACT_EMAIL` Cloudflare Email Routing binding.
- Return minimal error messages that do not reveal implementation details.

`wrangler.contact.jsonc` binds the Worker to `www.example.com/api/contact`. Its destination address is configuration, but credentials and Turnstile secrets must remain in Cloudflare secret storage. Do not place them in Astro public environment variables.

After changing the contact flow, test successful submission, invalid field rejection, missing Turnstile rejection, mobile keyboard behavior, modal scrolling, duplicate clicks, and user-visible recovery from a server error. Do not send repeated real test messages during every visual regression run.

### Root cause 2, the hero image delayed mobile LCP

The homepage hero image was the initial Largest Contentful Paint candidate. The source AVIF was approximately 897 pixels wide and 30 KB. Async decoding contributed roughly 1.1 seconds of element render delay on the mobile PageSpeed profile.

The image pipeline now generates:

- `hero-registration-720.avif`, quality 40, effort 9, approximately 16 KB
- A matching 720 pixel WebP fallback
- Exact 1200 by 630 Open Graph PNG images

The homepage uses a mobile media source and preload for the 720 pixel AVIF, retains the original desktop source, and uses synchronous decoding for the critical hero. Element render delay dropped to roughly 128 ms in the successful run.

### Failed image experiments

Two experiments should not be repeated without new evidence:

1. A quality 70 mobile AVIF was approximately 32 KB, larger than the original asset, and did not improve performance.
2. Embedding the mobile AVIF as a base64 data URL increased the HTML document to roughly 80 KB, worsened First Contentful Paint, and reduced the mobile performance score to 97. It was reverted.

Moving the image preload before font preloads was reasonable but did not independently produce a consistent 100. The decisive improvement came from reducing mobile hero dimensions while preserving the intended composition.

### Stable dimensions and layout shift

Every content image should have intrinsic width and height attributes. Fixed-format controls should have stable dimensions. The final homepage mobile Cumulative Layout Shift was `0.008`, and desktop was `0.017` in the recorded 100-score runs.

## Phase 5, Accessibility Remediation

### Legal filter contrast

The active legal filter used white text on `#128abe`, which produced approximately `3.88:1` contrast. Lighthouse requires at least `4.5:1` for normal text.

The active, hover, and focus background changed to the established darker blue token `#0a6f9d`. This preserved the brand while raising contrast enough for a 100 Accessibility score.

### Heading hierarchy

The imported WordPress legal content contained multiple internal `h1` elements beneath the page-level `h1`. Internal legal headings were changed to `h2`, producing one primary heading per page and a predictable document outline.

### Required interaction checks

- Keyboard focus remains visible.
- Modal focus and close controls are reachable.
- Escape closes the mobile menu and modal where appropriate.
- Touch controls meet the 44 by 44 pixel minimum.
- Reduced motion is honored.
- Text remains selectable and readable without transforms.
- Color is not the only active-state indicator.

## Phase 6, SEO and AI Discovery

### Canonical metadata

`SeoHead.astro` centralizes:

- Unique title and description
- Canonical URL
- `en-US` document language
- `en-US` and `x-default` hreflang links
- Robots preview directives
- Open Graph URL, type, image, secure image URL, dimensions, and alt text
- Twitter large-image card metadata and image alt text
- Sitemap link
- `llms.txt` and `llms-full.txt` links
- Favicon, Apple touch icon, and web manifest links
- Light color scheme and format-detection behavior

The public-page robots directive permits rich previews. The private MSA directive is restrictive.

### Structured data

Use structured data only where it accurately represents visible public content:

- Homepage, organization and website context
- Legal Hub, `CollectionPage`, `ItemList`, and `BreadcrumbList`
- Privacy and Terms, `WebPage` and `BreadcrumbList`
- MSA, no JSON-LD

Every JSON-LD block is parsed in the Playwright SEO suite.

### Open Graph images

The build generates four exact-brand PNG assets at 1200 by 630 pixels:

- Homepage
- Legal Hub
- Privacy Policy
- Terms and Conditions

The generator composites the existing site logo and approved artwork with a deterministic Sharp pipeline. It does not use an AI interpretation of the logo. This matters because generative logo variants would violate the brand requirement.

The SEO test fetches each declared Open Graph image and verifies:

- HTTP 200
- `image/png`
- Exact 1200 by 630 dimensions

### AI guidance files

`llms.txt` and `llms-full.txt` define:

- The site brand as the canonical entity
- The operating company as the operator
- The geographic market scope
- Intended audience and service description
- Public page hierarchy
- The public legal source set
- Non-affiliation with the related government agency
- Instructions not to invent pricing, coverage, government affiliation, or private contract terms

These files help retrieval systems understand the site. They do not guarantee model behavior or inclusion in a particular AI product.

### AI crawler rules

`robots.txt` explicitly permits the public site for:

- OAI-SearchBot
- GPTBot
- Claude-SearchBot
- Claude-User
- PerplexityBot

Every crawler group disallows `/msa`. The wildcard group also disallows the MSA and permits the LLM guidance files.

Crawler names and behavior can change. Verify against current vendor documentation before future edits:

- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)
- [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)

### Sitemap compatibility

The postbuild script generates public-only sitemap aliases for conventional and previously submitted paths:

- `/sitemap.xml`
- `/sitemap-index.xml`
- `/sitemap_index.xml`
- `/page-sitemap.xml`
- `/post-sitemap.xml`
- `/category-sitemap.xml`
- `/author-sitemap.xml`

The aliases contain only canonical public URLs. The MSA must never be included.

### Private MSA protection

Use defense in depth:

1. Page-level robots metadata with `noindex,nofollow,noarchive`.
2. Cloudflare `_headers` rule with `X-Robots-Tag: noindex, nofollow, noarchive` for `/msa*`.
3. `robots.txt` disallow rule.
4. Exclusion from every sitemap.
5. No header, footer, Legal Hub, or structured-data link.

Remember that `robots.txt` alone is not a confidentiality mechanism. The agreement is shown in the account sign-up flow. If contractual access requirements become stronger, move delivery behind application authentication.

## Branded Error Pages

The site includes branded `403`, `404`, and `500` pages using `ErrorLayout.astro`. They preserve the approved logo, header, typography, color tokens, hero artwork, and useful routes back into the site.

Error pages should:

- State the status and problem in plain language.
- Provide a primary path home and a secondary contact action.
- Include helpful links to core homepage sections.
- Use the shared SEO component with `noindex` enabled.
- Avoid structured data that could make an error response look like public content.
- Reuse local optimized assets and avoid blocking third-party requests.
- Remain usable at mobile widths and with keyboard navigation.

Static hosting behavior can differ between direct route requests and platform-generated errors. Verify each error page directly, then verify an unknown production path. Confirm the HTTP status expected from Cloudflare separately from the visual content. A visually correct `404` document served with HTTP 200 is not equivalent to a real 404 response.

## Phase 7, Cloudflare and PageSpeed Diagnosis

### Secure PageSpeed key retrieval

Store the PageSpeed API key in a secret manager. Retrieve it into a process-local variable without printing it.

Use the existing service-account environment bootstrap. Never echo the result:

```bash
PS_KEY="$(your-secret-manager read pagespeed-api-key)"
test -n "$PS_KEY"
```

Use the key only as a process-local variable. Unset it after testing:

```bash
unset PS_KEY
```

### PageSpeed request shape

Call `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` with:

- Canonical page URL
- `strategy=mobile` or `strategy=desktop`
- Categories for performance, accessibility, best practices, and SEO
- The API key

Store responses in a temporary directory outside the repository. Do not commit reports that contain request URLs with credentials.

PageSpeed can occasionally return a transient 500. Rerun only the failed case before diagnosing a site regression.

### The misleading 100, 96, 96, 40 result

An early mobile PageSpeed run reported `100/96/96/40`. That result was not measuring the website. Google received a Cloudflare 403 response and audited the error page.

This is a critical diagnostic lesson. Before acting on a Lighthouse score, inspect:

- Final response URL
- HTTP status
- HTML title and body identity
- Lighthouse runtime warnings
- Whether the expected canonical and page content were present

### Cloudflare root cause

A custom WAF rule named `Allowed Countries` blocked all countries except Canada, the United States, and India. International PageSpeed infrastructure and AI crawlers could not reach the public site.

The rule expression was:

```text
(not ip.geoip.country in {"CA" "US" "IN"})
```

The rule was disabled after confirming the site was intended to be publicly crawlable. Managed WAF protections remained active, and the contact endpoint retained Turnstile and server-side validation.

Cloudflare rule updates require the complete rule shape. Sending only `{ "enabled": false }` returned HTTP 400 because the API also required `action`, `expression`, and `description`.

The successful update preserved those fields and set `enabled` to `false`. After any security-rule change, fetch the rule again and confirm the stored state. Do not treat a successful local command as sufficient evidence.

### Preview deployment caveat

Cloudflare Pages preview URLs intentionally receive restrictive indexing behavior. A preview SEO score around 69 can be expected even when the canonical site reaches 100. Do not weaken preview protection to make a preview Lighthouse SEO number green.

Use preview deployments for rendering and interaction checks. Use the canonical hostname for final SEO acceptance.

## Phase 8, Build and Test Gates

The build pipeline is:

```text
generate responsive and social images
Astro production build
write sitemap aliases
```

Required local gates:

```bash
npm audit
npm run check
npm run build
npm test
```

Expected final result:

- `npm audit`, zero vulnerabilities
- `astro check`, zero errors, zero warnings, zero hints
- Playwright, 21 passing tests
- No generated-file edits performed manually in `dist/`

For a production-only WebKit smoke test:

```bash
PLAYWRIGHT_BASE_URL='https://www.example.com' npm run test:webkit
```

The recorded live result was 5 passing iOS WebKit tests.

## Phase 9, Cloudflare Deployment

### Account and project

The validated Cloudflare Pages target is:

- Account ID: configured through the deployment environment
- Zone ID: configured through the deployment environment
- Pages project: `example-www`
- Canonical domain: `www.example.com`

Account and zone identifiers are not authentication secrets, but API tokens and global keys are secrets.

### Staging deployment

Use a non-production branch for visual and interaction validation:

```bash
CLOUDFLARE_ACCOUNT_ID='YOUR-CLOUDFLARE-ACCOUNT-ID' \
npx --yes wrangler@4.110.0 pages deploy dist --project-name=example-www --branch=staging-safari-seo --commit-dirty=true
```

The transient `pages.dev` URL is evidence that an upload completed. It is not the production acceptance target.

### Production deployment

After all local and staging gates pass:

```bash
CLOUDFLARE_ACCOUNT_ID='YOUR-CLOUDFLARE-ACCOUNT-ID' \
npx --yes wrangler@4.110.0 pages deploy dist --project-name=example-www --branch=main --commit-dirty=true
```

If cached HTML prevents the canonical host from showing the new deployment, purge only through an authenticated Cloudflare API flow using the credential stored in 1Password. Never place the credential in shell history or documentation.

### Required live verification

Verify the canonical host, not only `pages.dev`:

```bash
curl -sSIL 'https://example.com/'
curl -sSIL 'https://www.example.com/'
curl -sSIL 'https://www.example.com/legal/'
curl -sSIL 'https://www.example.com/privacy-policy/'
curl -sSIL 'https://www.example.com/terms-and-conditions/'
curl -sSIL 'https://www.example.com/msa/'
curl -sSIL 'https://www.example.com/sitemap.xml'
curl -sSIL 'https://www.example.com/robots.txt'
curl -sSIL 'https://www.example.com/llms.txt'
```

Confirm:

- Apex returns 301 to `www`.
- Public pages return 200.
- Sitemap returns XML.
- Robots and LLM files return plain text.
- Open Graph assets return PNG.
- MSA returns 200 for sign-up presentation and includes the restrictive `X-Robots-Tag` header.
- No public page or sitemap links to `/msa/`.

Then run the live WebKit suite and PageSpeed matrix.

## Phase 10, PageSpeed Acceptance Matrix

Run mobile and desktop tests against every indexable public route:

| Page | Mobile | Desktop |
|---|---|---|
| Homepage | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Legal Hub | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Privacy Policy | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Terms and Conditions | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

Score order is Performance, Accessibility, Best Practices, SEO.

Recorded homepage lab metrics:

| Metric | Mobile | Desktop |
|---|---|---|
| First Contentful Paint | 0.9 s | 0.3 s |
| Largest Contentful Paint | 1.7 s | 0.6 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0.008 | 0.017 |
| Speed Index | 0.9 s | Not required for the acceptance record |

PageSpeed is a lab test and may vary. Preserve the underlying budgets and regression tests instead of coding to one transient run.

## Failure Patterns and Lessons

### Failure, auditing a Cloudflare error page

Symptom: mobile SEO and accessibility scores were low while performance was suspiciously perfect.

Lesson: inspect HTTP status and audited content before changing application code.

### Failure, partial Cloudflare rule patch

Symptom: API returned 400 when only the enabled property was sent.

Lesson: Cloudflare custom-rule updates require the complete rule representation.

### Failure, inlining the hero image

Symptom: HTML grew to roughly 80 KB and mobile performance fell to 97.

Lesson: avoid base64 inlining for this hero. Use a small preloaded AVIF with a normal URL.

### Failure, higher AVIF quality without size inspection

Symptom: the generated mobile file exceeded the original asset size.

Lesson: always inspect generated byte size and visual quality. A smaller pixel width does not guarantee a smaller encoded file.

### Failure, trusting a single black Simulator frame

Symptom: a screenshot immediately after navigation showed black content.

Lesson: reproduce with a fresh app state and compare native Safari, Playwright WebKit, and the live site before changing rendering code.

### Failure, treating preview SEO as production SEO

Symptom: a Pages preview scored 69 in SEO.

Lesson: preview environments are intentionally noindex. Measure SEO on the canonical hostname.

### Failure, unrestricted Astro checking

Symptom: archived WordPress files produced noise and exhausted memory.

Lesson: constrain TypeScript and Astro checks to active source and test files.

## Future Agent Checklist

### Before editing

- [ ] Read applicable `AGENTS.md` files.
- [ ] Record the dirty working tree and preserve unrelated changes.
- [ ] Confirm the active Astro app root and Cloudflare project.
- [ ] Confirm current compatible dependency versions.
- [ ] Inspect the current production site before assuming a regression.

### Before deployment

- [ ] Run `npm audit`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Inspect desktop Chromium and iOS WebKit screenshots.
- [ ] Inspect native Mobile Safari in the pinned Simulator.
- [ ] Confirm Turnstile loads only after the contact modal opens.
- [ ] Confirm all Open Graph images are exact-brand 1200 by 630 PNGs.
- [ ] Confirm public structured data parses.
- [ ] Confirm MSA protection in metadata, headers, robots, links, and sitemaps.

### After deployment

- [ ] Verify apex redirect and canonical `www` responses.
- [ ] Verify all public routes, discovery files, sitemap aliases, and OG images.
- [ ] Verify the MSA `X-Robots-Tag` header.
- [ ] Run the live iOS WebKit suite.
- [ ] Run the complete mobile and desktop PageSpeed matrix.
- [ ] Inspect any PageSpeed failure response before modifying source.
- [ ] Confirm Cloudflare security-rule state after any API update.
- [ ] Stop local servers and shut down the Simulator.

## Final Acceptance Evidence

The completed remediation produced:

- Astro check with zero errors, warnings, or hints.
- npm audit with zero vulnerabilities.
- 21 passing local Playwright tests.
- 5 passing WebKit tests against production.
- Native Safari validation on an iPhone 17 Pro simulator.
- 100 in all four PageSpeed categories for mobile and desktop on all public indexable routes.
- Exact 1200 by 630 Open Graph images using approved brand assets.
- Public SEO, structured data, sitemap, robots, and AI discovery files.
- Private MSA exclusion from public navigation, footer, sitemap, structured data, and indexing.
- A verified 301 from `example.com` to `www.example.com`.
- A verified production deployment at `https://www.example.com`.

This evidence set, rather than a successful upload alone, defines a correct production release.
