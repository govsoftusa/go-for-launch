# Project Onboarding, Requirements, and External Services

Complete this onboarding before Go for Launch changes a website. The purpose is to separate toolkit capabilities from the inputs, operating systems, accounts, paid services, and permissions that a particular project needs.

Copy [`templates/project-onboarding.md`](templates/project-onboarding.md) into the website repository and complete it with the project owner. Do not infer approval for a paid service or connect a broad external account because the toolkit can use it.

## 1. Select the workflows

Record which Go for Launch workflows are in scope:

- Platform, WordPress, or Webflow migration.
- Astro and dependency maintenance.
- Sitemap and technical SEO validation.
- Answer Engine Optimization content work.
- Performance and accessibility remediation.
- WebKit and native iOS Safari testing.
- Cloudflare deployment, forms, Turnstile, or Email Service.
- Cloudflare production RUM and edge HTTP observability.
- Scheduled maintenance through a desktop agent, API, CI runner, or operating-system scheduler.
- Optional design-system review.

Every selected workflow must identify its required inputs. Services that support one workflow do not become universal project requirements.

## 2. Classify every external source

Use one of these decisions for every service:

- **Required:** The selected workflow cannot produce valid evidence without it.
- **Conditional:** It is needed only because the project uses that platform or feature.
- **Optional:** It may improve research or automation, but its absence does not block unrelated checks.
- **Not used:** The project has deliberately excluded it.
- **Blocked:** It is required for the selected workflow, but access, approval, or setup is incomplete.

- **Source CMS, export, API, or database**, provides content, publication state, media, routes, and platform behavior, conditional for migrations when public capture is incomplete.
- **Git host**, provides remote history, collaboration, CI, and deployment triggers, conditional when the project uses a remote Git service.
- **Cloudflare**, provides Pages or Workers hosting, DNS, headers, bindings, and deployment, conditional when Cloudflare is the selected provider.
- **Cloudflare Web Analytics and GraphQL Analytics**, provide production RUM, LCP element evidence, and optional edge HTTP error rates, conditional when Cloudflare hosts the canonical site and approved read access exists.
- **Cloudflare Turnstile and Email Service**, provide abuse protection and server-side form delivery, conditional when a website has forms and selects this pattern.
- **Google PageSpeed Insights**, provides required mobile and desktop release scores, required for every production release, public access is sufficient.
- **PageSpeed API credential**, provides automated requests and additional API quota, conditional when the public interface or anonymous quota is insufficient.
- **Google Search Console**, provides query evidence, property state, inspection, and sitemap submission, conditional when approved property access exists or the project requires ownership work.
- **Ahrefs**, provides paid keyword research, backlink evidence, and public crawl data, optional and used only when the project approves and provides access.
- **Analytics, site search, support, sales, and form data**, provide first-party questions, journeys, and conversion evidence, conditional for AEO or content research based on what the project has.
- **Secret manager**, provides least-privilege credential retrieval without placing secrets in the repository, conditional when a workflow uses protected external accounts.
- **Design-system references**, provide Material, Apple, custom, or hybrid conformance evidence, optional according to project policy.

Ahrefs is not required for Go for Launch, technical SEO validation, AEO implementation, sitemap checks, browser tests, PageSpeed, or deployment. When it is unavailable, use approved first-party evidence and record the research limitation.

Cloudflare RUM is not a replacement for PageSpeed or Safari testing. When it is unavailable, preserve a skipped report and continue independent required gates unless the reviewed project contract classifies Cloudflare observability as required. Read [Cloudflare Production Observability](CLOUDFLARE-OBSERVABILITY.md) before selecting thresholds or enforcement.

## 3. Decide whether to purchase or connect services

For every conditional or optional service:

1. Record the exact capability it supports.
2. Record whether an existing account is approved for this project.
3. Determine current provider pricing, plan limits, API limits, and data retention before purchase. Do not rely on prices copied into this repository.
4. Name the account owner and billing approver.
5. Grant the smallest project, property, repository, or zone scope that can do the work.
6. Store credentials in the approved secret manager. Never place tokens in a prompt, source file, committed environment file, screenshot, or test report.
7. Run a masked authentication check and record pass, fail, or blocked without preserving secret values.
8. Record the fallback when the service is unavailable.

A configured service is not accepted until the agent can reach the intended project, property, zone, or repository and can prove that the permission level matches the planned operation.

## 4. Record the local testing environment

Go for Launch uses three distinct browser evidence layers:

- **macOS with full Xcode and an installed iOS runtime**, supports Chromium, Playwright WebKit, and native Safari in Xcode iOS Simulator.
- **macOS without full Xcode or without an iOS runtime**, supports Chromium and Playwright WebKit, but not native Safari in Xcode iOS Simulator.
- **Linux**, supports Chromium and Playwright WebKit when Playwright supports the runner, but not native Safari in Xcode iOS Simulator.
- **Windows**, supports Chromium and Playwright WebKit when Playwright supports the runner, but not native Safari in Xcode iOS Simulator.

Playwright WebKit is valuable automated coverage, but it is not evidence from Apple's Safari app, iOS browser chrome, virtual keyboard, touch stack, or Xcode Simulator runtime.

The mandatory Go for Launch production policy requires native Safari evidence from an explicitly selected Xcode iOS Simulator device and UDID. A Windows or Linux operator can perform the other build and browser work, but the exact candidate must be transferred to a qualified macOS runner before production. If no qualified Mac environment is available, record the limitation and block production under the standard policy. Do not relabel Chromium mobile emulation, a generic WebKit run, or a remote screenshot as native iOS Simulator evidence.

## 5. Finish the setup record

Before implementation begins, the completed project record must contain:

- Selected Go for Launch workflows.
- Required, conditional, optional, not-used, and blocked service decisions.
- Paid-service and billing approvals, when applicable.
- Named owners for every external account.
- Masked connection checks and least-privilege scope.
- Fallbacks for optional sources.
- Operating system, browser runners, Xcode version, iOS runtime, Simulator device name, and UDID.
- A clear native Safari limitation when the active environment is not a qualified Mac.
- Staging and production commands, canonical hostname, and deployment authority.
- The current Go for Launch revision used by the project.

Revisit this record whenever a workflow, provider, billing plan, account owner, deployment target, or release environment changes.
