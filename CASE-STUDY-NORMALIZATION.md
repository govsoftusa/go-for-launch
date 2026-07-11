# Case Study Normalization Policy

Go for Launch case studies are public technical evidence. They use a normalized presentation that preserves the reusable engineering lesson while excluding client-specific identity and correlatable operational details.

This policy applies to every file under `case-studies/`, including its filename, headings, prose, code samples, screenshots, image metadata, links, and embedded output.

## Required Normalization

Before a case study is committed or included in a package, remove or replace:

- Client, customer, organization, project, product, and internal program names.
- Personal names, email addresses, direct phone numbers, and other personal information.
- Real domains, hostnames, repository URLs, local user paths, and private route names.
- Cloud account, zone, project, Worker, D1, R2, deployment, candidate, and service identifiers.
- Tokens, credentials, private environment values, signed URLs, and secret-manager references that reveal an item or account.
- Exact asset filenames, screenshots, logos, wordmarks, page copy, or metadata that identify the source project.
- UUIDs, long hashes, certificate fingerprints, analytics identifiers, and other correlatable values.
- Exact dates, request counts, test counts, performance values, and route counts when the precision is not necessary to understand or reproduce the lesson.

Use neutral roles and descriptions such as `project owner`, `association site`, `educational site`, and `desktop hero artwork`. Use `example.com` and its subdomains for public URL examples. Round nonessential measurements while retaining the threshold, order of magnitude, and pass or fail result that support the technical conclusion.

Public technology and source-platform names such as Astro, Cloudflare, Webflow, WordPress, Playwright, WebKit, and Ahrefs may remain when they are necessary to explain the engineering behavior. Public documentation links may remain when they point to an approved vendor documentation host and do not contain account-specific query parameters or tokens.

## Required Review Marker

Every case study must contain this exact marker immediately after its title:

```html
<!-- case-study-normalization-reviewed -->
```

The marker records that a human or agent reviewed the complete file, including filename and links, against this policy. It is not permission to retain an identifier and does not override an automated finding.

## Mandatory Verification

Run:

```bash
npm run case-studies:verify
```

The verifier blocks missing review markers, personal email addresses and filesystem paths, UUIDs and long identifiers, nonapproved public hosts, and identifying metadata fields. `npm test` runs the same check and its regression fixtures. The package `prepack` lifecycle runs the normalization and documentation gates again so ordinary `npm pack` and `npm publish` workflows fail closed.

The verifier is intentionally a backstop, not a complete identity detector. The author and reviewer remain responsible for removing names, imagery, phrasing, and context that automated matching cannot recognize. Do not weaken the gate by adding a client domain or identifier to an allowlist.

## Release Rule

Any normalization finding blocks commit, packaging, publication, and release. A changed case study requires a complete new review, not a review of only the changed paragraph.

If identifying content was already committed or published, stop the release, preserve evidence without repeating the value, notify the repository owner, remove it from the current tree, and decide separately whether an approved history rewrite, package deprecation, cache purge, or credential response is required. Do not rewrite shared Git history without explicit authorization.
