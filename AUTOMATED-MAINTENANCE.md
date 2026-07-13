# Scheduled Astro Maintenance with Desktop Agents

This runbook explains how to use Go for Launch as the maintenance contract for a simple informational Astro website. It covers Codex in the ChatGPT desktop experience, ChatGPT Scheduled Tasks, Claude Desktop and Cowork, MCP servers, and API or CI schedulers.

## Supported Scope

Use unattended maintenance only when the site is:

- Static or frontend-only.
- Stored in version control.
- Deterministic to install and build from a lockfile.
- Covered by a documented staging deployment.
- Safe to verify through public browser and HTTP checks.
- Free of database migrations, payments, authentication changes, destructive content workflows, and other stateful release operations.

Forms, search, CMS imports, redirects, and third-party scripts require explicit tests. A site that cannot identify its production deployment command and canonical hostname is not ready for scheduled production maintenance.

## What the Agent Needs

Grant the narrowest set of tools that can complete the workflow:

1. Read and write access to the site checkout.
2. Git status, diff, branch, and commit inspection.
3. Node.js, the package manager named by the lockfile, and access to the package registry.
4. Astro diagnostics and the project test commands.
5. Chromium and Playwright WebKit with an iPhone profile.
6. Sitemap generation and build-output verification.
7. Google Search Console access when the owner has approved it.
8. Native iOS Safari through a pinned Xcode Simulator when the required environment is available.
9. A staging deployment tool for the documented host.
10. PageSpeed Insights for mobile and desktop.
11. Production deployment permission only after every release gate passes.
12. Read access to secrets through a secret manager, without exposing secret values to output or logs.

Common MCP or API integrations include filesystem and Git tools, GitHub, Cloudflare, browser automation, PageSpeed Insights, and a secret manager. Do not connect a broad cloud account when a site-specific token or project-scoped credential is available.

## Codex and ChatGPT

Codex automations are the preferred OpenAI surface when a Codex workspace exposes automation scheduling. Keep the automation attached to the checkout and store durable rules in `AGENTS.md`.

ChatGPT Scheduled Tasks are different from Codex automations. OpenAI currently documents the Scheduled page on ChatGPT web and mobile, not in the ChatGPT desktop or Codex app. Scheduled Tasks also cannot access files attached to a ChatGPT project and do not support webhooks. They are appropriate for reminders and monitoring, but not as the only repository maintenance runner.

For repository work, use one of these patterns:

- A Codex automation with the local checkout, tools, and permissions already in scope.
- A CI schedule that checks out the repository and starts the approved agent workflow.
- A small scheduler service that uses the OpenAI API and exposes only the repository and deployment tools required by the maintenance contract.

Official references:

- [Scheduled Tasks in ChatGPT](https://help.openai.com/en/articles/10291617-tasks-in-chatgpt)
- [Codex use cases](https://developers.openai.com/codex/use-cases?category=automation)
- [Plugins in Codex](https://help.openai.com/en/articles/20001256-plugins-in-codex)

## Claude Desktop and Cowork

Claude Desktop can use local desktop extensions and remote MCP connectors. Install reviewed local extensions from `Settings > Extensions`, or add an approved custom extension through Advanced settings. Remote connectors are configured under `Settings > Connectors`.

Anthropic does not currently document a general recurring scheduler for ordinary Claude Desktop or Cowork tasks. If recurrence is required, use a trusted external trigger such as the operating system scheduler, CI, an API service, or an automation connector such as Zapier or Workato. That trigger should start a new scoped run, not simulate unreviewed clicks in an existing conversation.

Claude Tag can schedule its own work in Slack for eligible Team and Enterprise organizations, but that is a separate product surface and should not be described as Claude Desktop scheduling.

Official references:

- [Getting Started with Local MCP Servers on Claude Desktop](https://support.anthropic.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [When to Use Desktop and Web Connectors](https://support.anthropic.com/en/articles/11725091-when-to-use-desktop-and-web-connectors)
- [Model Context Protocol in Anthropic products](https://docs.anthropic.com/en/docs/mcp)
- [Claude Cowork](https://www.anthropic.com/product/claude-cowork)

## Repository Setup

Add or update `AGENTS.md` in the site root with:

- The real Astro app root.
- Install, diagnostics, build, test, staging, and production commands.
- The canonical hostname and staging hostname.
- Cloudflare Pages or Workers project identifiers when applicable.
- Required browser, WebKit, native Safari, and PageSpeed gates.
- Files or directories that must not be edited.
- The policy for pre-existing human changes.
- Exact stop conditions.

Keep secrets out of `AGENTS.md`, prompts, shell history, and artifacts. Document only the secret-manager item names or environment variable names required by the workflow.

## Recommended Schedule

For a stable informational site, start monthly. Move to weekly only when dependency activity or business requirements justify it. Do not schedule framework upgrades every day.

Separate checks by risk:

- Weekly or monthly: version discovery, dependency audit, Astro diagnostics, sitemap-verified build, and browser tests.
- After a validated change: staged deployment and PageSpeed gate.
- Production: only when the exact staged candidate passes every gate.
- Daily monitoring: public uptime, certificate, sitemap, robots file, and critical-link checks without source changes.

## Automation Prompt

Use this as a starting contract and replace each placeholder with repository evidence:

```text
Maintain the static Astro informational site in [absolute checkout path].

Read every applicable AGENTS.md file and the Go for Launch production policy before changing files. Preserve unrelated human changes. Confirm the real app root, lockfile, deployment project, staging hostname, and canonical production hostname from repository evidence.

Check current compatible releases for Astro, its integrations, adapter, build tooling, TypeScript, test tooling, and deployment tooling. Never force an incompatible dependency tree. Make only targeted maintenance changes that are justified by current release information or a failing check.

Run install, Astro diagnostics, project tests, production build, Chromium, and Playwright WebKit with an iPhone profile. The normal build command must generate the XML sitemap, compare every indexable built canonical with the sitemap, and verify the exact sitemap URL in robots.txt. A missing or incomplete sitemap fails the build. Test the built candidate in native iOS Safari with one recorded Simulator UDID when the environment is available. If native Safari is required but unavailable, stop before production.

Deploy the exact built candidate to the documented staging target. Confirm staging serves that candidate. Run PageSpeed Insights for mobile and desktop and require 100 for Performance, Accessibility, Best Practices, and SEO in both strategies.

Deploy the same candidate to production only when every required gate passes. Verify the canonical hostname, redirects, representative routes, sitemap, child sitemaps, robots file, Open Graph images, WebKit behavior, and a native Safari smoke test after production. When approved Google Search Console access exists, verify the property and permission, list submitted sitemaps, submit the exact canonical sitemap when missing, and record the status. Sitemap submission must not be treated as property ownership verification.

Never print secrets. Never invent a deployment target or hostname. Never deploy when the repository remains dirty from unrelated work, the build changes after staging, a required test fails, or any PageSpeed score is below 100.

Finish with a report of versions checked, files changed, tests run, sitemap counts, Search Console status when available, staging result, PageSpeed scores, production result, live verification, and any stop condition.
```

## Stop Conditions

Stop before production when any of these is true:

- Applicable repository instructions are missing or contradictory.
- The site is stateful or its deployment path is unclear.
- Unrelated human changes cannot be separated safely.
- The compatible dependency set cannot be resolved.
- Diagnostics, tests, build, WebKit, or native Safari checks fail.
- The build omits sitemap verification, the sitemap is incomplete, or the robots declaration is wrong.
- Staging does not serve the expected candidate.
- Any required PageSpeed score is below 100.
- A secret would need to be printed, committed, or copied into the prompt.
- Production would require a database, payment, authentication, or destructive content change.

An automation that stops cleanly and explains why is working as designed.
