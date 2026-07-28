# Execution Control and Bounded Delivery

Go for Launch defines strict production requirements. This policy defines how
work proceeds toward those requirements without turning one failed gate into an
unbounded development loop.

Execution controls govern the work process. They never weaken a release gate.
A time limit, attempt limit, scope limit, deferral, owner decision, prior test
result, or delivery deadline cannot convert a failed mandatory gate into a
pass. Production remains blocked until the exact final candidate passes every
required build, mobile, desktop, Chromium, WebKit, native iOS Safari,
accessibility, security, interface, performance, and PageSpeed check.

## 1. Create the task envelope before editing

Copy [`templates/execution-control-record.md`](templates/execution-control-record.md)
into the target project and record:

- The requested outcome and the person who can accept it.
- The repositories, routes, systems, and environments in scope.
- Explicit exclusions and work that requires separate authorization.
- The acceptance checks that define completion.
- Deployment authority and the rollback method.
- The initial branch, commit, working-tree state, and Go for Launch revision.
- Default investigation and remediation limits.

The task envelope is the active contract. A new finding does not silently
expand it.

## 2. Classify findings before acting

Classify every new finding as one of these:

- **Required outcome:** necessary to complete the requested change.
- **Release blocker:** a mandatory gate that prevents the requested promotion.
- **Recommended follow-up:** valuable work that can be completed separately.
- **Unrelated:** outside the active task.

Only a required outcome or release blocker enters the active task without a
scope decision. Record recommended follow-up work instead of implementing it
opportunistically. Preserve unrelated work and do not modify it.

If a newly discovered release blocker would materially change the design,
architecture, cost, external systems, production behavior, or delivery
timeline, pause and obtain an explicit owner decision before expanding the
implementation.

## 3. Work through bounded phases

Use these phases:

1. **Orientation:** read current instructions, inspect the working tree, fetch
   required upstreams, identify the live source of truth, and record the
   baseline.
2. **Representative proof:** implement the smallest representative vertical
   slice or prototype that can disprove the proposed direction.
3. **Implementation:** expand only the approved direction to the agreed scope.
4. **Candidate freeze:** assign a commit and build identity, then stop feature
   and polish work.
5. **Release verification:** run the complete mandatory gate against the exact
   frozen candidate.
6. **Promotion and live verification:** deploy the same candidate, verify the
   public result, and preserve rollback readiness.

Do not generate a full visual inventory, migrate an entire content family, or
apply a new interaction pattern site-wide before its representative proof
passes the applicable automated checks and named human review.

## 4. Require human review for subjective direction

Automated success does not establish brand fit, editorial quality, information
architecture, visual hierarchy, or user-experience quality.

Require named human approval before bulk implementation when work changes:

- Brand identity, typography, palette, imagery, or social cards.
- Navigation, information architecture, or route-family structure.
- Editorial voice, legal presentation, or public claims.
- A primary interaction, form flow, or conversion path.
- A project-controlled design system.

The approval must identify the reviewed artifact and candidate. Approval of a
prototype does not waive later exact-candidate testing.

## 5. Bound remediation attempts

The default control threshold for one blocker is:

- Two unsuccessful remediation attempts, or
- Ninety minutes of active investigation and remediation.

A project may set a lower threshold. A higher threshold requires a recorded
owner decision made before the existing threshold is exceeded, including the
evidence that another attempt is likely to produce new information.

When either threshold is reached:

1. Stop changing code related to that blocker.
2. Record the exact failure and current candidate.
3. Record each attempted fix and its result.
4. State the supported root-cause hypothesis and remaining uncertainty.
5. Present the smallest viable options, including rollback, deferral, alternate
   implementation, external escalation, or continued investigation.
6. Mark the task blocked until an option is selected.

Reaching a threshold never changes the release result. The gate remains failed.

## 6. Stop on repeated evidence

If two consecutive verification cycles produce materially identical failure
evidence, do not make another speculative adjacent change. Return to root-cause
analysis and the task envelope.

If two progress updates contain no new code result, test result, provider fact,
or user-visible evidence, mark the blocker explicitly. Do not describe elapsed
time or repeated waiting as progress.

Missing credentials, unavailable services, propagation delays, third-party
rate limits, unclear ownership, and pending human review are pause conditions.
Do not compensate for them by expanding unrelated implementation.

## 7. Use tiered testing without weakening final verification

Use three testing levels:

1. **Edit loop:** run the smallest relevant unit, type, lint, rendering, or
   browser test for fast feedback.
2. **Phase checkpoint:** run the affected workflow tests and a production build
   before expanding a prototype or declaring implementation complete.
3. **Frozen candidate:** run the complete mandatory Go for Launch release suite
   against the exact final candidate.

After the final source, content, dependency, configuration, infrastructure, or
artifact change, the complete mandatory release suite must run against the new
frozen candidate. Any later change creates a new candidate and requires the
complete mandatory suite again before production.

Targeted tests may accelerate development. They cannot replace the final
complete suite.

## 8. Preserve checkpoints and evidence

Commit each independently verified phase when repository policy allows it.
Keep design exploration, functional implementation, release configuration, and
production remediation separable.

At every meaningful checkpoint, and at least every thirty minutes of active
work, update the execution record with:

- What changed.
- What passed and failed.
- The current commit and candidate identity.
- The current blocker.
- The next bounded action.
- Active time spent on the blocker.
- Any scope or approval decision.

Evidence must describe the tested candidate, not a nearby preview or previous
release.

## 9. Freeze scope at candidate creation

Candidate freeze ends feature development. After freeze:

- Make only changes required to resolve a mandatory failed gate.
- Record every change and create a new candidate identity.
- Return polish and nonblocking improvements to follow-up work.
- Do not combine unrelated cleanup with release remediation.

Completion means the task envelope and mandatory gates pass. It does not mean
every discovered improvement has been implemented.

## 10. Control production remediation

Prepare and verify rollback before promotion. If a production issue cannot be
corrected and verified within two bounded attempts, restore the last known-good
release when rollback is safe and available.

Production pressure does not authorize a new unreviewed design, a weakened
test, a rebuilt unverified candidate, or a bypassed gate.

## Required project artifacts

Every active adoption or release project must preserve:

- The completed project onboarding record.
- The completed execution-control record.
- The current task envelope and finding classifications.
- Prototype or representative-proof approvals when applicable.
- Candidate identities and checkpoint commits.
- Attempt and time-limit decisions for blockers.
- The final complete release evidence for the exact candidate.
- Follow-up items excluded from the completed task.

