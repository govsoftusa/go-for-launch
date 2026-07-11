# Astro Automation Integration

This document tells scheduled maintenance automations and coding agents how to use this toolkit when maintaining Astro sites under a local development root.

The toolkit is the release gate source of truth for migrated, imported, or upgraded Astro sites. It covers keeping existing Astro sites on the latest compatible Astro version and dependency set, and it requires every upgrade to pass the same browser, Simulator, and PageSpeed gates as a new migration. Automation prompts may add project-specific constraints, but they must not weaken the gates in this repository.

## Scope

Use this process for each Astro site that may be built, staged, or deployed by an automation:

- Dependency maintenance for Astro and compatible framework packages.
- Webflow, WordPress, static HTML, or other platform imports into Astro.
- Cloudflare Pages or Workers deployments.
- Any production release after a framework, asset, layout, content, interaction, SEO, or deployment change.

## Required Files

Every run must read these files before deciding whether a site can deploy:

- `AGENTS.md`
- `README.md`
- `ASTRO-MOBILE-SAFARI-PORTING-PLAYBOOK.md`
- `TESTING-AND-RELEASE-CHECKLIST.md`
- `PRODUCTION-RELEASE-POLICY.md`
- `AUTOMATION-INTEGRATION.md`

If this repository changes, the automation must treat the current files as authoritative instead of relying on older automation memory.

## Per-Site Build Process

For each eligible Astro root:

1. Read the target repository instructions and deployment docs.
2. Establish a clean git baseline or a deliberate local snapshot commit before edits.
3. Install with the site package manager.
4. Run available diagnostics, type checks, lint, tests, and app-specific smoke checks.
5. Build the exact production candidate.
6. Run Playwright WebKit with an iPhone profile when the repo has Playwright coverage or when the automation adds a temporary smoke suite.
7. Test the built candidate in native iOS Safari using an explicit Simulator UDID.
8. Deploy the exact candidate to staging when a staging target is documented.
9. Verify staging serves the expected candidate and canonical metadata.
10. Run PageSpeed Insights against staging for mobile and desktop.
11. Require 100 for Performance, Accessibility, Best Practices, and SEO in both strategies.
12. Deploy production only when all required gates pass and the production target is unambiguous.
13. Verify the canonical production hostname with live HTTP checks, WebKit smoke coverage, and native iOS Safari smoke coverage.

If a site has only a production deploy script and no safe staging target, do not deploy production unless the repo documentation explicitly allows the production target to serve as the release gate for that site.

## iOS Simulator Isolation

Native iOS Safari checks must use a Simulator device selected for the current site run.

Before opening Safari:

1. List booted devices.
2. If no device is booted, boot a chosen iPhone Simulator and record its UDID.
3. If a booted Simulator may be in use by another site, do not reuse it.
4. Create or select a separate iPhone Simulator device for the current site.
5. Boot the selected UDID and wait for boot status.
6. Open Simulator pinned to that UDID.
7. Open the local candidate, staging URL, and production URL using that UDID.

Never target the generic `booted` selector for Safari testing when more than one Simulator may exist. Always pass the recorded UDID.

Do not shut down or erase a Simulator that was already booted before the current site run. If the automation creates a temporary Simulator device, it may shut down that device after evidence is recorded.

If full Xcode, an iOS runtime, or an available iPhone Simulator is missing, production is blocked for that site. Record the blocker instead of skipping the gate.

## Credential Access Through 1Password

When the machine has 1Password and the 1Password CLI (`op`) available, use it as the secret manager for every API credential this toolkit touches, including PageSpeed API keys, Ahrefs API keys, and Cloudflare API tokens used to publish sites.

Check availability before assuming access:

```bash
command -v op && op whoami
```

Retrieve secrets only into process-local variables using secret references, and unset them after use:

```bash
CLOUDFLARE_API_TOKEN="$(op read 'op://VAULT-NAME/ITEM-NAME/credential')"
```

Prefer `op run` for commands that need the credential only for their own lifetime, because the secret never lands in shell history or a persistent variable:

```bash
op run --env-file=./deploy.env -- npx wrangler pages deploy dist --project-name=example-www
```

Rules:

- Never print a secret, echo it for debugging, pass it on a command line that gets logged, or write it to a file inside the repository.
- Never commit `op://` vault or item names that reveal customer identities in a public repository. Use placeholders in documentation.
- If `op` is unavailable or the account is not signed in, treat the credential as missing. Record the blocker instead of asking for the raw secret in chat or embedding it in a script.
- Apply the same handling through any other secret manager if 1Password is not the one in use.

## SEO Data Through Ahrefs

When the site owner has a valid Ahrefs account and the agent has access to it, through the Ahrefs API or a connected Ahrefs integration, SEO work must use it rather than working from assumptions. This mirrors the PageSpeed rule: use the real measurement tool when access exists.

Use Ahrefs during migration and maintenance for:

- Capturing baseline organic keywords, positions, and top pages before a migration, so post-migration losses are detectable.
- Building the redirect map from pages with backlinks and organic traffic, not only from the CMS route list.
- Verifying backlink targets still resolve after the migration.
- Running site audit crawls against staging and production candidates.
- Comparing post-release keyword and traffic trends against the pre-migration baseline.

Ahrefs API access requires a paid plan and calls consume plan quota. Confirm the key or integration responds before planning work around it, retrieve the key through the secret manager described above, and record which Ahrefs data was captured in the migration acceptance record.

If no Ahrefs access exists, fall back to Google Search Console exports and the source platform's own analytics for the baseline, and record that limitation.

## PageSpeed Gate

PageSpeed Insights has a free anonymous tier with low rate limits, suitable for occasional manual checks. Automated or repeated runs should use an API key retrieved through the secret manager so the gate does not fail on quota errors.

PageSpeed evidence must be tied to the staged candidate:

- Verify the audited URL, HTTP status, title, canonical URL, and visible content.
- Run mobile and desktop strategies.
- Require all four Lighthouse categories to equal 100 in both strategies.
- Treat any lower score as a release blocker.
- Never print PageSpeed API keys or token-bearing URLs.

If PageSpeed audits a stale page, redirect placeholder, access-denied page, Cloudflare error, or unrelated preview, the result is invalid.

## Evidence Record

For every site touched by automation, report:

- Astro root and git root.
- Toolkit files read.
- Cloudflare evidence.
- Git baseline or snapshot result.
- Dependency versions changed.
- Commands run and pass or fail result.
- Build candidate identity when available.
- Playwright WebKit result.
- Simulator UDID record or production-blocking Simulator blocker.
- Staging target and verification result.
- PageSpeed mobile and desktop scores.
- Production deploy target and identifier, when deployed.
- Canonical hostname verification result.
- Skipped gates and exact reason.

Use `templates/migration-acceptance-record.md` for reusable release evidence when the site is being imported, rebuilt, or promoted after meaningful user-facing changes.

## Stop Conditions

Stop before production deployment when:

- The toolkit files cannot be read.
- Git baseline is not clean or deliberately snapshot-committed.
- Build or required tests fail.
- Native iOS Safari testing is unavailable or fails.
- Staging is unavailable without an explicit production-only release policy.
- PageSpeed is below 100 in any required category.
- PageSpeed audited the wrong document.
- The production target is ambiguous.
- Credentials are missing.
- The candidate changed after staging, Simulator, or PageSpeed checks.

Stopping is the correct result. Record the blocker and leave the site undeployed.
