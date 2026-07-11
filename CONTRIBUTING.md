# Contributing

Thank you for helping improve Go for Launch, a toolbox for Astro sites.

## Ways to Contribute

- Add a migration lesson with reproducible evidence.
- Add a source-platform adapter design.
- Improve a checklist or template.
- Add an Astro, WebKit, accessibility, SEO, or performance test pattern.
- Document a failed migration approach and why it failed.
- Add a normalized case study.
- Correct outdated framework or browser guidance.

## Contribution Standards

Contributions should:

1. Be platform-neutral unless clearly labeled as a case study.
2. Separate observed symptoms from confirmed root causes.
3. Include reproduction steps or source evidence.
4. Include a regression test or acceptance check when practical.
5. Follow [Case Study Normalization Policy](CASE-STUDY-NORMALIZATION.md) and avoid organization names, personal information, real domains, infrastructure identifiers, secret values, private customer data, private URLs, and credentials.
6. Avoid copying proprietary source content into public examples.
7. Identify historical versions and measurements as historical.
8. Preserve accessibility, SEO, performance, and native browser behavior.

## Production Guidance Standard

Any contributed production workflow must preserve the repository's mandatory release gate:

- Build the production candidate first.
- Test it with Playwright WebKit and native iOS Safari through Xcode Simulator.
- Audit the same staged candidate with PageSpeed Insights.
- Require 100 for Performance, Accessibility, Best Practices, and SEO on both mobile and desktop.
- Assert viewport-specific resource loading and require preloads to match measured LCP resources.
- Preserve an advisory Cloudflare RUM baseline and post-release comparison when approved analytics access exists.
- Block production when any required test or score fails.

Contributions must not describe Chromium mobile emulation or a passing build as a replacement for native iOS Simulator testing.

## Adding a Case Study

Read [Case Study Normalization Policy](CASE-STUDY-NORMALIZATION.md), normalize the filename and the complete document, add the required review marker, and run `npm run case-studies:verify` before submission. A normalization finding blocks the contribution. Do not add a client identifier or domain to an allowlist.

Create a Markdown file under `case-studies/` containing:

- Source platform and target architecture.
- Scope and route count.
- User-visible symptoms.
- Source evidence.
- Root causes.
- Implementation changes.
- Failed experiments.
- Automated tests.
- Native browser tests.
- Performance and accessibility results.
- Deployment verification.
- Reusable lessons.

Remove all organization, person, domain, account, repository, resource, and release-candidate identifiers before submission. Round nonessential measurements that could make an incident correlatable while preserving the technical conclusion.

## Adding a Platform Adapter

Document:

- Supported export or API formats.
- Authentication boundaries without credential values.
- Input and output contracts.
- Duplicate and slug policy.
- Asset handling.
- Error and unsupported-structure behavior.
- Test fixtures.
- Known limitations.

## Pull Requests

- Keep each pull request focused.
- Explain the problem and evidence.
- List changed documents or examples.
- Report validation performed.
- Link related issues.
- Note any behavior that remains unverified.

## Style

- Use clear Markdown headings.
- Prefer concrete commands and testable criteria.
- Use placeholders for site IDs, domains, account IDs, and device identifiers.
- Avoid claims that one tool or score proves complete migration quality.
- Keep site-specific language inside case studies.
