# CMS Authentication and Session Gate

## Purpose

A CMS login is not proven by a rendered login screen, a successful credential
ceremony, a redirect, a cookie, or an admin shell. The release must prove that
the credential assertion establishes a session that is immediately usable by
the editor and remains usable through real content operations.

This gate applies when a production application includes an authenticated CMS,
administrative console, editorial portal, or other write-capable control
surface.

## Storage requirement

The authentication handoff is a write followed immediately by a read. Its
session source of truth must provide the consistency required by that sequence.

Do not use an eventually consistent cache as the sole source of truth for a
newly issued login session unless the framework has a documented handoff
mechanism that survives a read miss. A cache is appropriate for publication
objects and rendered HTML. It is not automatically appropriate for
authentication state.

For Cloudflare deployments:

- Workers KV is an eventually consistent cache.
- D1 can provide a primary-backed session for immediate continuity.
- Durable Objects can provide strongly ordered state when the session design
  requires it.
- A custom Astro session driver must use option names that the deployment
  adapter does not reserve or overwrite.

Record the selected store, required consistency, adapter behavior, table or
namespace, migration, rollback, and expiry policy in
[`templates/cms-authentication-session-record.md`](templates/cms-authentication-session-record.md).

## Required candidate proof

Run the proof against the compiled production-format candidate in the private
test environment. Use a disposable local administrator and local-only data.
Never use a production credential, token, cookie, or content record in the
candidate proof.

The proof must:

1. Complete the configured credential assertion.
2. Make an immediate authenticated identity request.
3. Require the expected role or capability.
4. Load the real admin base path.
5. Load every required editorial collection through the admin console.
6. Render at least one real fixture title from each collection.
7. Open one existing record from each required collection.
8. Create a disposable draft through the same authenticated API used by the
   console.
9. Edit the draft and reload its editor.
10. Delete the draft and prove cleanup.

For a publication CMS, posts and pages are separate required collections.
Passing one does not establish that the other works.

Observe exact final responses. A method-preserving trailing-slash redirect may
be valid, but the gate must wait for the final collection or item response and
require success. Do not count a 3xx response as proof that the handler received
valid route parameters or a preserved request body.

Authentication bootstrap routes require a stricter check. Compare the exact
slashless paths emitted by the CMS client with the authentication middleware's
public route table. If the framework recognizes a public route by exact string,
either serve that path directly or normalize only terminal slashes before the
public-route lookup. A framework-required method-preserving redirect is valid
only when its final path remains public and reaches the credential verifier.
Require the passkey options and verification requests to reach their public
handlers without encountering middleware that requires an existing session.

When email login is protected by Turnstile or another browser challenge, open
the actual dynamic email state in the compiled candidate. A static script tag,
source scan, or fail-closed server response is not sufficient. The proof must
observe a visible challenge, confirm that submission remains disabled until
verification, and inspect the outgoing request to confirm that it carries the
challenge token. Stub the external challenge client in the private browser
environment so this proof does not consume production traffic or provider
quota. Separately require the server to reject a missing or invalid token.

## Evidence boundaries

The machine-readable report may record:

- candidate identity;
- source and toolkit revisions;
- test origin class;
- response statuses;
- expected role level;
- collection names;
- visible fixture counts;
- public fixture titles;
- create, edit, reload, and cleanup results.
- exact authentication bootstrap paths and redirect status;
- visible anti-spam challenge and token attachment results.

It must not record:

- raw tokens;
- passkey material;
- session cookies;
- personal email addresses;
- private content bodies;
- production administrator identifiers;
- token-bearing URLs.

Create local credentials with a cryptographically secure random source. Store
the raw value only in a mode 0600 temporary file, never print it, and delete it
in a final cleanup path. Store only a hash when the CMS token model requires
hashed tokens.

## Production verification

The local candidate proof does not replace a bounded canonical check after
promotion. A human must complete one supported canonical login and confirm:

- the immediate identity request is authenticated;
- the expected collections load;
- one existing record opens;
- the session survives an ordinary admin navigation.

Do not create or mutate production editorial content solely for a release
smoke test unless the project owner approved a reversible production test
record. Prefer read-only production confirmation after the candidate CRUD
lifecycle has passed locally.

## Failure classification

Use the first failing transition:

| Transition | Likely class |
|---|---|
| Credential ceremony fails | relying-party, origin, browser, or credential configuration |
| Credential request returns `Not authenticated` before verification | public route classification or URL normalization |
| Verification succeeds, immediate identity fails | session write, consistency, cookie, or middleware |
| Email form enforces a challenge that is not visible | dynamic form mounting, client readiness, content blocking, or script lifecycle |
| Admin shell loads, collections fail | API routing, authorization, client blocking, or database |
| Lists load, editor fails | item routing, schema, revision, or hydration |
| Create works, edit fails | optimistic concurrency, method or body preservation, or permission |
| Cleanup fails | delete permission, trash lifecycle, or route mismatch |

Stop changing passkeys when the credential ceremony succeeds and the immediate
identity request fails. Stop changing the database when the browser never sends
the content request. Diagnose the failing transition with request and server
evidence.

## Non-waiver rule

This gate does not lower performance, browser, mobile, Safari, accessibility,
SEO, security, or PageSpeed requirements. It is an additional functional gate
for a write-capable control surface.
