# Association Header and Announcement Hierarchy

<!-- case-study-normalization-reviewed -->

## Case-study status

- Site type: Stakeholder association website.
- Framework: Astro.
- Hosting: Cloudflare Pages staging project.
- Review period: Mid-2026.
- Human reviewer: Project owner.
- Decision: Approved.

This case study records project-specific evidence. The reusable rules are in [Design Optimization and Brand Continuity](../DESIGN-OPTIMIZATION-AND-BRAND-CONTINUITY.md).

## Symptom

The site placed a bright lime bar above the logo and primary navigation. It contained the evergreen message, "Member-led dealership technology. Practical education, stronger operations, responsible innovation."

The bar looked like an alert or live status surface even though the message did not describe an urgent condition, temporary announcement, required action, or system state.

On desktop, the bar created a separate visual layer above an already prominent floating navigation surface. On mobile, it consumed scarce first-viewport space and visually separated the logo and menu from the top edge.

## Root cause

The message had not been classified before it was styled.

It was a brand statement, but the implementation used alert conventions:

- High-contrast color spanning the full viewport.
- Placement above the global logo and navigation.
- A status dot implying a current state.
- Persistent display on every route.
- No destination, owner, publication date, expiration date, or dismissal behavior.

The problem was therefore not the exact shade, padding, or type size. The problem was that evergreen positioning had been placed in the wrong interface layer.

## Approved correction

The detached bar was removed. The floating branded navigation became the single top control layer.

No substantive association information was lost. The homepage already communicated the relevant positioning through its hero, supporting association-focus panel, and purpose section.

The correction preserved:

- Association logo and brand lockup.
- Teal, ink, lime, and translucent navigation system.
- Primary navigation destinations.
- Membership call to action.
- Homepage value proposition.
- Desktop and mobile menu behavior.

## Human approval workflow

The correction was not treated as accepted because it looked better to the implementer.

The workflow was:

1. Build the correction locally.
2. Run Astro diagnostics, the production build, sitemap validation, Chromium tests, iPhone WebKit tests, and accessibility checks.
3. Add a regression test requiring navigation to be the single top control layer and confirming the old association bar is absent.
4. Publish an isolated Cloudflare preview candidate.
5. Provide desktop and mobile rendered evidence plus the live preview URL to the human stakeholder.
6. Receive explicit approval from the project owner.
7. Promote the approved treatment as a newly identified staging candidate.
8. Verify the custom staging hostname rather than accepting only the transient Pages deployment URL.

## Verification evidence

The promoted staging candidate passed:

- Astro diagnostics with no errors, warnings, or hints.
- A 12-route production build.
- Sitemap verification for all 11 indexable pages.
- 29 applicable browser tests with one expected desktop skip.
- Desktop Chromium route and accessibility coverage.
- iPhone WebKit route, accessibility, and mobile-menu coverage.
- A regression test for the single top control layer.
- Live HTTP 200 verification.
- Candidate-header verification.
- Search-blocking header verification.
- Public TLS certificate verification.
- Live mobile-menu navigation to Membership.

The exact candidate still requires native iOS Safari and PageSpeed completion before a future production release. Staging acceptance does not waive those production gates.

## Reusable lesson

Classify global bars before designing them.

- Use an alert for a genuine urgent condition.
- Use an announcement for timely information with ownership and a review or expiration date.
- Use a utility bar for recurring tasks or settings.
- Put evergreen positioning in durable content or a concise brand lockup.

Prefer one coherent header layer. Add another only when it serves a distinct user need that cannot be served clearly elsewhere.

For global chrome changes, require explicit human approval of an identified rendered candidate after desktop, mobile, and open-navigation review. Automated quality checks are evidence, not approval.
