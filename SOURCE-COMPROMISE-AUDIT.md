# Pre-Migration Source Compromise Audit

## Why This Is a Migration Gate

A migration copies content out of a system that nobody has audited recently.
Long-lived content management installations are a standard compromise target,
and a migration is the moment their contents get read by an automated process,
converted, and written into a clean stack with fewer questions asked than at any
other point in their life.

Three specific risks make this a gate rather than a suggestion.

1. **Injected markup travels.** Spam links and scripts written into article
   bodies survive extraction, conversion and import, and arrive in the new CMS
   as ordinary editorial content that nobody reviews again.
2. **Agents execute what they read.** A migration performed by an automated
   agent involves reading plugin and theme source to understand behaviour. That
   source may be adversarial.
3. **Credentials in the migration path are live.** Deployment credentials, object
   storage keys and admin passwords used to perform a migration are frequently
   the same ones an attacker already holds.

This audit was added after a production migration found an active compromise in
the source backup. It took minutes to run and changed the plan.

## Scope

Run before extraction, against the backup rather than the live site. Read-only.
No step here modifies the source.

## Checks

### 1. Active plugin list

Read the serialised active-plugin option and compare it against the plugin
directory. Look for:

- Entries whose directory name is random or machine-generated.
- Directories with an incongruous extension, for example a folder named as if it
  were an image or document file.
- Plugins with a generic, plausible name that are not in the public plugin
  directory. `CDN Asset Helper`, `Performance Lab`, `WP Cache Manager` and
  similar names are chosen precisely because an administrator scanning a list
  will not stop on them.
- Single-file plugins in a directory of their own with no readme, no assets and
  no changelog.

### 2. Must-use plugins

Enumerate the must-use plugin directory in full. WordPress loads everything
there unconditionally and does not offer to deactivate it. It is the standard
persistence location: deleting a malicious plugin restores it on the next page
load if a dropper lives here.

Anything present that did not come from the host or a known plugin is
suspicious by default.

### 3. Encoded or self-writing PHP

Search PHP under the content directory, excluding uploads, for:

```text
base64_decode    eval(            gzinflate
str_rot13        assert(          preg_replace with /e
file_put_contents targeting a plugin or mu-plugin path
create_function  variable function calls resolved from $GLOBALS
```

A file that reads its own source and writes it to an option is writing its own
backup. That is not a pattern legitimate plugins have.

### 4. Executable files in the uploads directory

The uploads directory should contain media. Any `.php`, `.phtml`, `.phar` or
`.htaccess` file inside it warrants investigation.

### 5. Suspicious options

Options are the standard configuration store for injected code, because they
survive file cleanup. Look for:

- Option names with short, meaningless prefixes such as `_ab_`, `_spk_`, `_wpx_`.
- Long base64 values, especially ones that decode to PHP.
- Options holding external URLs that no installed plugin explains.

Sort options by value length and read the top of the list. Payload backups are
large and stand out immediately.

### 6. Injected content in the database

Search post content for script tags, iframes, and links to hosts that are not
part of the site's normal outbound linking. Count the matches. Zero is the
answer you want and it is common: many infections inject at render time through
a filter rather than writing to the database, which means the content is clean
even when the site is not.

Record the result either way. It is the evidence that the migrated content is
safe.

### 7. Accounts

List administrators with their registration dates. Look for accounts registered
recently, accounts with machine-generated usernames, and any account whose
capabilities were elevated without a corresponding personnel change.

### 8. Scheduled tasks

Read the cron option. Injected code frequently schedules itself so it survives
a single cleanup pass.

## Outcome

The audit produces one of three results.

**Clean.** Record the checks and their results in the project's migration
evidence. Proceed.

**Compromised, content clean.** This is the common case. Proceed with the
migration, and:

- Record the finding, the indicators of compromise and the remediation order in
  a source-compromise document in the target project.
- Do not carry any plugin, theme, option or file from the source into the
  target. Import data only.
- Treat every credential used in the migration path as exposed, and rotate all
  of them at cutover regardless of what the audit found.
- Notify the project owner before continuing. This is their decision, not the
  migrating engineer's.

**Compromised, content affected.** Stop. Cleaning injected content is a separate
task with its own verification, and it must complete before extraction, or the
migration bakes the injection into a fresh system.

## Remediation Order

When a dropper is present, order matters. Removing the payload first accomplishes
nothing, because the dropper restores it.

1. Remove the persistence mechanism, starting with must-use plugins.
2. Remove the payload.
3. Remove the database options that hold the payload backup and its
   configuration.
4. Rotate administrator credentials.
5. Rotate hosting and deployment credentials.
6. Rotate the framework's session salts to invalidate existing sessions.
7. Audit object storage for non-media objects, and rotate its keys.

## What the Target Architecture Changes

Worth stating in the migration record, because it is a substantive part of the
case for the migration rather than a footnote.

- A static or edge-rendered Astro target executes no PHP, so this class of
  persistence has no equivalent surface.
- A CMS that runs plugins in sandboxed isolates does not grant a plugin the
  privileges that made this infection possible.
- Legacy administrative endpoints can be answered with 410 rather than left
  reachable.

## Reporting

Do not put indicators of compromise from a real engagement into a public case
study without the owner's consent, and normalise hostnames and identifiers per
[CASE-STUDY-NORMALIZATION.md](CASE-STUDY-NORMALIZATION.md). The reusable lesson
is the audit and its ordering, not the specific domains involved.
