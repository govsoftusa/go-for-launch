# Release Gate Throughput on a Large Archive

<!-- case-study-normalization-reviewed -->

## Purpose

This case study records why a complete Go for Launch evidence set failed to
converge on a large server-rendered archive, and what to change in the toolkit
so it converges next time.

It is deliberately not about the application. The application reached
Performance, Accessibility and Best Practices at 100 on mobile and desktop
across four route families in repeated rounds, with no application defect
controlling any release decision. The constraint was the shape of the gate and
the environment it ran in.

The migration findings for this platform pair are in
[wordpress-emdash-news-archive-migration.md](wordpress-emdash-news-archive-migration.md).
The runtime and cache findings are in
[wordpress-emdash-cloudflare-release-hardening.md](wordpress-emdash-cloudflare-release-hardening.md).
This study covers only gate economics and operator environment.

## Normalized Scope

- Source platform: WordPress, roughly four thousand published articles and
  fourteen years of archive.
- Target: Astro with EmDash CMS on Cloudflare Workers, D1, R2 and KV.
- Public route surface: roughly twelve thousand indexable routes.
- Evidence per candidate: a complete HTML snapshot of every route, semantic SEO
  over every indexable route, over one hundred thousand browser and viewport
  interface checks across two engines, render sharpness over every route,
  runtime image verification over roughly fifteen thousand variants, two dozen
  PageSpeed audits, native mobile Safari on a simulator, form and search
  checks, route parity, redirect verification and a malware scan.
- Observed over one working period: roughly sixty sequential candidates, no
  complete evidence set for any one of them.

## Finding 1: Evidence bound to global candidate identity does not converge

The release contract required preserving exact candidate identity from build
through verification. That rule is correct and must stay: mixing evidence from
different builds is how a broken release ships.

Combined with a suite that walks the entire route surface, it has a property
nobody stated. Any change of any kind discards the entire evidence set,
including a one-line fix to a problem the suite itself just found. Candidates
were cut roughly every twenty-five minutes. A complete run took hours.

The convergence condition is simply:

```
suite_runtime < mean_time_between_candidate_changes
```

When that inequality is false, a complete evidence set can never accumulate,
regardless of application quality. The team is not failing to reach the bar;
the bar is receding at the speed they approach it.

### Reusable rule

Bind each gate's evidence to a hash of the inputs that gate actually reads, not
to the global candidate identifier. A gate's evidence remains valid for a new
candidate when its declared inputs are unchanged, the toolkit revision is
unchanged, and its artifact still validates against its assertions. Valid
evidence carries forward; invalid evidence is re-run. The manifest records, per
gate, which candidate produced the evidence and the input hash that justifies
inheriting it.

Declare inputs broadly when unsure. A gate that re-runs unnecessarily costs
time. A gate that carries forward when it should not have ships a defect. The
asymmetry is not close.

The largest wins are the cheap deterministic gates that currently re-run for no
reason: malware scanning, redirect verification, route parity, brand assets and
Open Graph approvals. Gates that measure rendered output keep broad input sets.

## Finding 2: The verifier overloaded the origin it was verifying

A complete snapshot at a concurrency in the low twenties overloaded the origin
and produced transient failures. The unchanged rerun at a concurrency of eight
completed every route with zero failures.

Those transient failures are indistinguishable from real defects in the report.
They cost a candidate.

### Reusable rule

Every long-running verifier declares a concurrency ceiling per project, not a
library default. On a server-rendered site the origin is doing real work per
request, and the verifier is the largest single client it will ever have. When
a run produces scattered failures with no pattern, re-run at half concurrency
before investigating the application.

## Finding 3: An unbounded wait in a browser verifier

The interface verifier could wait indefinitely for a document fonts-ready
promise that never settled on some routes. A hung verifier is worse than a
failing one because it consumes the run without producing a verdict.

### Reusable rule

Every wait in a browser-driving verifier is bounded and fails closed with the
exact route and browser identity in the message. No unbounded promise waits.

A later run exposed a second failure mode. One WebKit page reported a font
readiness timeout near the end of a six-figure assertion sweep, while the exact
route, engine, and viewport passed ten consecutive isolated reruns. Treating
that first timeout as either a confirmed application defect or a silent retry
would both be wrong.

When the first font-readiness wait expires, discard the affected page and
require three consecutive fresh-page confirmations for the same route, engine,
and viewport. Any failed confirmation remains a blocking result. When all
three pass, measure the last fresh page and preserve the initial timeout plus
every confirmation in the machine-readable report. This does not retry a
failed geometry assertion or lower any threshold. It separates persistent font
failure from browser-process state and leaves an auditable record either way.

## Finding 4: A stochastic gate treated as deterministic

The same unchanged candidate scored 100, then a low-nineties value, then 100 on
the same route and profile. The process had no way to say which of the three
measured what it claimed to.

The wrong fix is to average, take a best-of-N, or lower the threshold. The
requirement of four category scores at 100 exists for a reason and should not
move.

### Reusable rule

Separate **admissibility** from **result**.

A performance run counts as evidence only when its preconditions held, asserted
programmatically and recorded in the artifact:

1. The response carried the exact expected candidate identity header.
2. No other gate was running. Enforce with a lock file that every long-running
   verifier takes.
3. Only one measurement request was in flight for the whole matrix.
4. The cache state was the declared one, warmed a fixed number of times, and
   the response carried the expected cache status.
5. A defined quiet interval elapsed since the previous run against that host.

An inadmissible run is void: not a pass, not a failure. Discard it, log which
precondition failed, and re-run. An admissible run below the threshold is a
failure and blocks.

This is stricter than averaging, not looser. It converts an argument about
which of three numbers is real into a recorded fact about which runs were
valid.

Reduce the variance itself as well: run the matrix serially on an otherwise
idle machine, use one measurement source rather than mixing a hosted API with a
local runner in the same matrix, and pin the runner and browser versions in the
artifact.

## Finding 5: Route parity measured against the wrong authority

The route parity gate reported a pass over roughly twelve thousand routes while
three indexed pages had regressed from HTTP 200 to HTTP 301.

The check compared the candidate against a route inventory generated from the
migration dataset. That answers "does the candidate serve everything we think
exists". It never asks the live source platform what it actually serves, so it
cannot see a status-class regression at all.

A gate that counts twelve thousand things and never consults the authority
produces more confidence than it earns.

### Reusable rule

Add a source-authority parity check distinct from inventory parity. Compare
status classes with an asymmetric rule:

| Authority | Candidate | Verdict |
|---|---|---|
| 2xx | 3xx, 4xx or 5xx | Fail. An indexed page became a redirect or vanished. |
| 3xx or 4xx | 2xx | Warn. Legitimate but must be a recorded decision, because it also enters the sitemap. |
| same class | same class | Pass. |

Do not run it over every route. The source platform is usually still serving
real traffic. Check a permanent watch list of paths that have regressed before,
plus every route where the candidate does not answer 2xx, plus a stratified
sample.

The specific trap this caught is worth naming: paths whose slugs suggest they
are duplicates of the home page, such as a `blog`, `home` or `homepage` path,
are frequently real indexed pages on a long-lived site. Slug-based inference
about page identity is not safe. This regression was found, fixed and
documented, and then reintroduced by a later change because no automated check
existed to hold the decision in place.

## Finding 6: The operator environment is part of the gate

The final blocker on the last candidate was not the application. The laptop
locked. A multi-hour unattended run outlasted the login session, the
screensaver started, the session locked, and the automation could no longer
drive the mobile simulator for the native Safari gate.

### Reusable rule

Any gate that requires a graphical session, a simulator or desktop automation
must run under an explicit wakefulness assertion held for the lifetime of the
run, and must verify that assertion before starting rather than discovering the
lock hours later.

On macOS this is `caffeinate` with display, system, disk and user-activity
assertions. The user-activity assertion is the one that matters: preventing
display sleep alone does not prevent the screensaver, and it is the screensaver
that triggers the lock.

The wrapper must not modify the screen-lock policy, the screensaver password
setting or disk encryption. Those persist after the run and belong to the
machine owner. A release process that quietly disables a laptop's lock is a
worse problem than the one it solves. Hold assertions in a process so they are
released on exit, including on crash.

Add a preflight to the release runner: if a gate in the plan requires a
graphical session and no wakefulness assertion is held, refuse to start.

## Finding 7: The standard moved while it was being measured against

Several toolkit revisions landed during the same working period, including the
bounded-wait fix from Finding 3 and a new runtime image verification behavior.
Each is an improvement. Each is also an implicit invalidation of every
candidate measured against the earlier revision.

### Reusable rule

Record the toolkit revision in the candidate manifest and refuse to start a run
when the toolkit working tree is dirty or its HEAD differs from the pinned
revision. A toolkit fix found mid-run is legitimate, but it ends the candidate:
pin the new revision, cut a new candidate, and say so in the report.

## Finding 8: Scope grew during the freeze

Bot-protection widgets on every public form, a new legal hub with policy pages
that did not exist on the source site, social card approvals, modern image
format generation and cache partitioning by release identity all landed while
the release was being verified. Each is defensible work. Together they meant the
artifact under measurement kept changing shape.

### Reusable rule

Once a candidate is cut for promotion, the only admissible changes are fixes
for gate failures on that candidate. New capability goes to the next release.
State this in the project onboarding document so it is a rule rather than a
judgment call made under pressure.

## Finding 9: Advisory findings consumed blocking attention

One run recorded zero errors alongside a few hundred advisory target-size
warnings. Advisory output competed with blocking output for attention.

### Reusable rule

Classify every gate output as blocking or advisory in configuration. Advisory
findings are collected and reviewed on a cadence; they never invalidate a
candidate and never trigger a re-run. Promoting a class from advisory to
blocking is a deliberate, recorded decision.

## Reusable Checks to Add

- Per-gate evidence carry-forward keyed by declared input hashes.
- A verifier lock file that all long-running gates take, so measurement gates
  can assert exclusivity.
- Performance-run admissibility preconditions recorded in the artifact, with
  void runs logged by failed precondition.
- Source-authority status parity, with the asymmetric rule and a permanent
  watch list.
- A wakefulness preflight for any gate requiring a graphical session.
- A pinned-toolkit-revision preflight.
- Fixed-seed stratified route sampling for intermediate candidates, with the
  complete route set reserved for the candidate intended for promotion. A
  sampled run is labelled and can never satisfy the final gate.

## Still Open

- Whether a proportion of the interface-check surface can be sampled without
  losing the defect class it exists to catch. The count is large because the
  route surface is large, not because each route is uncertain.
- Whether performance evidence can ever be inherited across candidates. The
  input set for a rendered-output measurement is close to the whole
  application, so the honest answer may be no.
- Whether a production route-consistency probe belongs in the standard gate
  set. A canary on a large zone showed alternating candidate and source
  responses immediately after route attachment, consistent with propagation
  rather than application behavior. A plain HTTP 200 was insufficient to detect
  it; identity, robots policy, cache policy and an application marker were all
  required.
