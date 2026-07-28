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
- Execution-control record:
- Execution-control config:
- Execution-control report:
- Acceptance owner:
- Explicit scope exclusions:
- Deployment authority:
- Rollback method:

## Selected workflows

- [ ] Platform migration
- [ ] WordPress migration
- [ ] Webflow migration
- [ ] Astro and dependency maintenance
- [ ] Sitemap and technical SEO
- [ ] Answer Engine Optimization content work
- [ ] Open Graph and social-card generation
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
- Scored provider preflight command and evidence:
- Full matrix order:
- First-failure evidence directory:
- Fallback or blocker:

### PageSpeed document warmup

- Decision: conditional when dynamic HTML is primed before an audit
- Exact audited URLs:
- Browser-document request contract:
- Candidate identity header:
- Application cache-state header:
- Approved cache-hit values:
- Machine-readable warmup report:
- Cold-document and first-request-after-deploy evidence kept separate:
- Confirmation that a score below 100 remains a failed gate:

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

### Authoritative brand guide and brand kit

- Decision: required when Open Graph or another generated visual workflow is selected
- Capability supported: approved identity, assets, typography, palette, imagery, and social-card direction
- Brand authority and owner:
- Current brand reference:
- Brand-reference SHA-256:
- Approved wordmark or logo variants and SHA-256 values:
- Renderer name, owner, version, and source SHA-256:
- Fallback or blocker: bulk visual generation is blocked

## Social-card adoption gate

- Project-owned renderer selected:
- Representative prototype card names:
- Required cases covered: publication identity / long headline / source artwork when applicable / typographic fallback
- Artwork selection method and durable source reference for each prototype:
- Route-relevance rationale for each prototype:
- Rights review complete: yes / no
- Third-party marks reviewed: yes / no
- Prototype generation command:
- Prototype review artifact:
- Real messaging or social client used:
- Named reviewer:
- Review date:
- Brand authority approved: yes / no
- Template appropriate for the project: yes / no
- Typography approved: yes / no
- Palette approved: yes / no
- Imagery approved: yes / no
- Route relevance approved: yes / no
- Rights and third-party marks approved: yes / no
- Unapproved synthetic artwork absent: yes / no
- Readability approved: yes / no
- Prototype approval file:
- Bulk regeneration status: blocked / approved

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
- [ ] Social-card bulk generation remains blocked until the current representative prototype is approved in a real client.
- [ ] The execution-control record defines completion conditions, scope exclusions, checkpoints, blocker limits, and rollback.
- [ ] The machine-readable execution-control verifier passes for the current phase.
- [ ] Time and attempt limits are treated as pause conditions, not as waivers for mandatory release gates.
- [ ] The complete mandatory release suite will run against the exact frozen candidate after the final change.

Approved by:

Date:
