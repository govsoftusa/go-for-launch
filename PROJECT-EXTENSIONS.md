# Project-Specific Extensions

Go for Launch is a reusable toolkit. A website may need stricter rules, custom visuals, project-owned validators, or specialized release evidence. Those requirements belong in the website repository, not in the shared toolkit.

## Ownership rule

Keep these items in the target project:

- Project identity, domains, routes, audiences, content, and claims.
- Brand rules, art direction, visual templates, and approved assets.
- Project-specific thresholds, exceptions, and required evidence.
- Custom scripts, fixtures, configuration, state manifests, approval records, and generated review artifacts.
- External account decisions, deployment targets, service bindings, and masked access results.
- Local instructions and build notes that explain how the project extends Go for Launch.

Keep only reusable behavior in Go for Launch. Shared code must not contain a client's name, domain, copy, claim, route, visual treatment, or approval data. Site-specific results belong in the target project or, when useful as public historical evidence, in a clearly labeled toolkit case study.

## Recommended project layout

```text
target-project/
├── AGENTS.md
├── docs/
│   ├── go-for-launch-onboarding.md
│   └── go-for-launch-project-extension.md
├── scripts/
│   └── go-for-launch/
├── package.json
├── project-specific.config.mjs
└── project-specific-approvals.json
```

Use the project's existing conventions when they provide an equivalent location. The important requirement is ownership, traceability, and unskippable build integration.

## Integration process

1. Copy `templates/project-onboarding.md` into the target project and complete it.
2. Read the target workspace and repository instruction files before changing code.
3. Create a local extension record, normally `docs/go-for-launch-project-extension.md`.
4. In that record, list each local rule, file, command, approval artifact, owner, and reason it is project-specific.
5. Call unchanged Go for Launch scripts directly from the project's package scripts when shared behavior is sufficient.
6. Put custom behavior in a project-owned wrapper, adapter, validator, or generator when the shared behavior is not sufficient.
7. Wire the project-owned command into the normal build or test chain before the shared release gates that depend on it.
8. Prove the extension runs through the accepted project command. A standalone script that the normal build can skip is not integrated.
9. Run the Go for Launch test suite after shared documentation or code changes. Run the target project's full test suite after local extension changes.
10. Record the toolkit revision, project test result, and any renewed human approval in the project's release evidence.

## Package script pattern

This example keeps a project-owned preparation step local and then calls reusable toolkit validators:

```json
{
  "scripts": {
    "prepare:project": "node scripts/go-for-launch/prepare-project.mjs",
    "verify:sitemap": "node /path/to/go-for-launch/scripts/verify-sitemap.mjs --dir=dist --site=https://www.example.com --sitemap=sitemap.xml",
    "build": "npm run prepare:project && astro build && npm run verify:sitemap",
    "test": "npm run check && npm run build && npm run test:browser"
  }
}
```

Replace the paths and commands with reviewed project values. Do not copy example domains or thresholds into production configuration.

## Generators and approval contracts

Generated social cards, email graphics, reports, and similar artifacts often combine reusable validation with project-owned design. Keep the project renderer, render inputs, state manifest, and approval records together in the target project.

When a local generator uses a hash-bound approval contract:

- The generator and reviewer must calculate the same stable input.
- Normal builds must verify approved output without rewriting it.
- Explicit regeneration must require renewed visual review and approval.
- Toolkit upgrades must not silently change approved bytes or invalidate unrelated project artifacts.
- A local extension record must explain how to reconcile reusable fixes from the toolkit without losing project-owned behavior.

## When to change Go for Launch

Change the shared toolkit only when the need is reusable across projects. A shared enhancement must include a generic interface, platform-neutral defaults, tests, documentation, and a template or example where appropriate. The target project still owns its selected values and implementation data.

Do not solve a local need by adding a conditional branch for that project to a shared script. If a generic interface is not justified, keep the complete extension local.

## Upgrade checklist

For each toolkit update:

1. Fetch and compare the configured Go for Launch upstream.
2. Record the selected toolkit revision in the project onboarding file.
3. Review shared changes that overlap the local extension.
4. Apply reusable fixes to the project-owned wrapper or local copy when needed.
5. Run the toolkit tests.
6. Run the project's full build and test commands.
7. Renew hash-bound or human approvals when their governed inputs changed.
8. Preserve the results in project release evidence.
