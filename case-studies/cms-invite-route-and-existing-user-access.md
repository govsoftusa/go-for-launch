# CMS invitation routing and existing-user access

<!-- case-study-normalization-reviewed -->

## Symptom

An authenticated administrator could load the dashboard, users, and editors,
but the new-user invitation modal returned `Admin privileges required`.
The role shown in the user list was correct. Repeating login would not resolve
the invitation route's missing authenticated request context.

## Root cause

The unmodified EmDash 1.1.0 auth middleware classified a trailing-slash
invitation prefix as public. Public routes passed through without resolving
the session user, while the invitation creation handler required that user to
have an Admin role. An application's trailing-slash policy exposed the
inconsistency between those two framework contracts.

This is distinct from stale sessions, incorrect database roles, email provider
configuration, and failed invitation delivery. Locate the first rejected
boundary before changing any of those systems.

## Supported existing-account path

An invitation creates a new account. It is not a role-change or recovery action
for an email address that already exists. The framework also explicitly
rejects an invitation when the target email belongs to an existing user.

For an authorized existing-account access change:

1. Open the account in the native Users detail panel.
2. Select and save the approved role.
3. Verify the saved role in the user list and detail panel.
4. Send the supported recovery sign-in email when a fresh access link is needed.
5. Preserve existing passkeys and record application acceptance separately from
   mailbox receipt.

The supported user update and recovery routes resolved the administrator's
session and completed these actions. No rebuild, framework patch, replacement
account, or direct database write was necessary.

## Verification lessons

A passing login, dashboard, collection-list, and draft-lifecycle test does not
prove invitations work. Record these as separate acceptance claims:

- New-user invitation, with a disposable email sink and genuinely new user.
- Existing-user promotion, with a saved-role reload and rollback.
- Existing-user recovery, with the email sink proving the intended recipient
  and canonical link host.
- Both slash forms of auth routes under the application's real routing policy.
- Anonymous and insufficient-role requests rejected before token creation.

Run browser and compiled-runtime tests in the private development environment
with external requests blocked. Do not send real invitation emails as part of
a candidate test. Production actions must target only the authorized user.

Short-lived UI success notices can disappear before a later screenshot. Capture
the result when it appears, or use bounded operational evidence without
printing tokens. A stored recovery token alone does not prove email delivery,
because token storage precedes the provider send in this framework.

Document the framework route inconsistency independently of a successful
existing-account workaround. Do not weaken authorization checks, label an
untested invitation flow as passing, or patch core merely to accomplish an
account action that already has a supported path.
