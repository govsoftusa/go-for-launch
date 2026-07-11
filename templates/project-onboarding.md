# Go for Launch Project Onboarding Record

## Project identity

- Project:
- Repository:
- Canonical hostname:
- Project owner:
- Technical owner:
- Date reviewed:
- Go for Launch revision:
- Local instruction file:
- Project extension record:
- Required build or test command that invokes project extensions:

## Selected workflows

- [ ] Platform migration
- [ ] WordPress migration
- [ ] Webflow migration
- [ ] Astro and dependency maintenance
- [ ] Sitemap and technical SEO
- [ ] Answer Engine Optimization content work
- [ ] Performance and accessibility
- [ ] Interface geometry, responsive layout, and route-family differentiation
- [ ] WebKit and native iOS Safari testing
- [ ] Cloudflare deployment
- [ ] Cloudflare forms, Turnstile, and Email Service
- [ ] Cloudflare production RUM and edge HTTP observability
- [ ] Scheduled agent maintenance
- [ ] Optional design-system review

## External source decisions

Use `required`, `conditional`, `optional`, `not used`, or `blocked`. Complete one record for every source below.

### Source CMS, export, API, or database

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Git host

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Cloudflare, Turnstile, and Email Service

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Cloudflare Web Analytics and edge HTTP analytics

- Decision:
- Capability supported: production RUM baseline, LCP element diagnosis, and optional edge HTTP error rates
- Account and scope owner:
- Account Analytics Read verified:
- Zone analytics read verified, if selected:
- Canonical RUM hostname:
- Minimum samples and time window:
- Enforcement mode: advisory, regressions, or thresholds
- Masked access check:
- Fallback or blocker: preserve a skipped report and retain PageSpeed, WebKit, and native Safari gates

### Google PageSpeed Insights and optional API credential

- Decision: required for production scoring, API credential is conditional
- Capability supported: production release scores
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Google Search Console

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Ahrefs

- Decision: optional unless a reviewed project contract says otherwise
- Capability supported: research or public crawl evidence only
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker: use approved first-party evidence

### Analytics, site search, support, sales, and form data

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Secret manager

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

### Design-system references

- Decision:
- Capability supported:
- Account and scope owner:
- Paid plan approved by:
- Masked access check:
- Fallback or blocker:

## Local and release environment

- Operating system and version:
- Node and package-manager versions:
- Chromium available: yes / no
- Playwright WebKit available: yes / no
- Full Xcode installed: yes / no
- iOS Simulator runtime installed: yes / no
- Simulator device name:
- Simulator UDID:
- Native Safari evidence available: yes / no
- If no, qualified Mac handoff runner and owner:
- If no Mac runner exists, production status: blocked

## Deployment contract

- Build command:
- Sitemap verification command:
- Full test command:
- Interface quality verification command:
- Staging command and URL:
- Production command and project:
- Canonical-host verification command:
- Deployment authority:

## Approval

- [ ] Every selected workflow has its required inputs.
- [ ] Optional services are not presented as universal requirements.
- [ ] Paid services have an explicit owner and approval.
- [ ] External accounts passed masked, least-privilege access checks.
- [ ] Secrets remain outside prompts, source, logs, and evidence.
- [ ] Non-Mac native Safari limitations are recorded.
- [ ] A qualified Mac runner is assigned for the exact production candidate.
- [ ] No blocked required item is being treated as complete.

Approved by:

Date:
