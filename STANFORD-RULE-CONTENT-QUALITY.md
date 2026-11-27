# Stanford Rule Content Quality Gate

## Definition

The Stanford Rule is a Go for Launch editorial standard requested by the project's maintainer. It is not a Stanford University policy, research finding, endorsement, or authorship detector.

For every public page, the writer and reviewer adopt the perspective of a senior psychology professor who understands how people attend to, interpret, remember, and act on information. The goal is content that feels approachable to its intended audience, sounds like a thoughtful person wrote it, makes its purpose clear, and supports important claims with evidence.

The rule does not ask a page to sound academic. It asks the reviewer to use mature judgment about audience, cognitive load, trust, motivation, and clarity.

## Writing for people

A reader arrives with a document to finish, a deadline to meet, or a decision to make. Start there. Content that reads like an AI wrote it for another AI is a defect, even when its spelling, reading score, and content hash pass.

Four recurring causes need attention: the drafting brief leaks into the copy; unsupported abstractions replace real material; style rules become repeated templates; and the writer reviews their own work. The following process addresses each cause.

Apply it to website and product copy, emails, documentation, designs, messages, announcements, visual explanations, architecture diagrams, and subject matter expert review materials. Keep the reader brief and source notes outside the shareable copy. The HTML verifier covers configured web routes; the editorial process also applies to artifacts it cannot inspect.

1. **Write a brief outside the content.** Describe one real reader, their role, the moment they arrive, and what they already believe. State what they should know or do afterwards. List sourced product facts, the customer's language, and real examples. Use the [reader brief template](templates/content-quality.brief.md). Do not invent a customer to fill it.
2. **Gather real language before drafting.** Read meeting notes, transcripts, support threads, customer documents, and the owner's words. Borrow their nouns and verbs. If a claim or scenario has no source, leave it out and ask the owner or record the gap in the private brief.
3. **Draft from the reader's situation.** Open with a concrete deal, document, deadline, or person. Write a headline about something the reader cares about. Do not substitute a page category or navigation description for that meaning.
4. **Remove the drafting scaffolding.** Cut sentences about the page, site, navigation, writing process, or your rules. Cut anything that only makes sense to someone who read the brief.
5. **Get an independent review.** Use a separate agent or a person who did not write the draft. Give them only the copy and source facts, without the writer's rationale or suggested verdict. They must mark the tells below, identify sentences someone at the company would not say to a customer across a table, and check every claim against its source. Record the writer, reviewer, findings, and corrections outside the copy. A second pass by the writer does not satisfy this step.
6. **Revise and compare neighboring pages.** Fix the findings, read the result aloud, and compare the opening, section shape, and sentence frames with adjacent pages. Change repeated structures. Use any one opener or item structure at most twice on a page.

## Tells to reject

| Tell | What to remove or revise |
| --- | --- |
| Meta copy | Sentences about the page, site, or process: "Find the page written for...", "Pick the one closest to you", "Here's what that means", "This page covers", "We'll show you..." |
| Instruction leakage | Announcements of your own rules or virtues: "we'll be straight about what isn't built", "in plain words", "no jargon", "to be honest". State the actual status once where it matters. |
| Persona roll calls | Lists of audiences in place of one reader, such as "A CFO, a banker, a CIO and a compliance officer all use X". Do not imply customer adoption without evidence. |
| Formula rhythm | Stock contrasts and forced symmetry, such as "not X, but Y", "but not for the same reasons", "whether you're X or Y", "from X to Y", default triads, and sentences of identical length. |
| Repeated frames | Reusing "If you're a...", a bold lead-in followed by one sentence, or a heading followed by a one-liner and bullets for every item. Use a frame at most twice per page. |
| Labels in place of meaning | Kickers that repeat the heading or menu; decorative icon rows and badges; all-caps labels and step codes such as "01 · FIND" or "RAISES"; caption-like data lines; status tables or changelogs placed at the top of the copy. |
| Abstract nouns | "The work you do", "what changes", "the capital side", "solutions", "workflows", and "use cases" where a concrete noun is available. |
| Inventory fragments and noun stacks | "Sign-in invitations with delivery and bounce status" or "Members, seats and requests to join" without a sentence explaining what the reader can do and why it matters. |
| Implementation detail | Rate limits, protocol names, field names, retention, row caps, or where a check runs when they do not help the reader decide. If a limit matters to a buyer, explain it once where they choose a plan. |
| Filler | "Seamless", "robust", "leverage", "unlock", "empower", "streamline", "cutting-edge", and "in today's fast-paced world". |

Write to one reader as "you" and use "we" for the company. Use full sentences and plain verbs. Explain why a feature matters. Use as many items as the material needs, vary sentence length and structure, and avoid forcing every list into three items. Never imply that an unbuilt feature works. Never invent customers, quotes, or numbers. Do not leave a placeholder that still needs a real answer.

Technical terms and operational detail still belong in instructions when the intended reader needs them to complete the task. The brief and review record may contain source tables, implementation notes, and process checks because they stay outside the shareable copy.

## Mandatory editorial questions

Review every page from the intended reader's point of view:

1. Who is this page for, and what do they already know?
2. What is the reader trying to decide, understand, or do?
3. Does the opening answer that need before discussing the toolkit or organization?
4. Are unfamiliar terms defined before they are used to carry an argument?
5. Does each paragraph make one useful point in language a person would naturally use?
6. Are requirements separated from optional tools, recommendations, and examples?
7. Are claims specific, proportionate, and connected to evidence?
8. Does the copy avoid inflated promises, synthetic enthusiasm, empty transitions, and repetitive sentence structures?
9. Does the page respect the reader's time with useful headings, short paragraphs, and a clear next step?
10. Would a knowledgeable person be comfortable putting their name and review date on this exact built text?

## What the automated gate checks

Run:

```sh
node scripts/verify-content-quality.mjs --config=content-quality.config.mjs
```

The verifier reads final built HTML and checks:

- Every route has a reviewed audience and primary task.
- Sentences and paragraphs stay within project thresholds.
- Reading ease meets the route's reviewed threshold.
- Configured machine-like filler and inflated marketing phrases are absent.
- Repeated sentence openings generate warnings above the configured count. The independent reviewer decides whether the writing feels templated and checks repeated structures the counter cannot recognize.
- Openings, closings, and full copy are compared across different content families so route-specific pages do not repeat one generic argument.
- Every built page has an editorial record using the `senior-psychology-professor` perspective.
- The reviewer approves approachability, human tone, purpose, and evidence awareness.
- The project template also requires a read-aloud cadence review and confirmation that the page makes a route-specific argument.
- The current starter template requires explicit approvals for a sourced reader brief, source-grounded claims, reader-first writing, removal of scaffolding, independent review, and varied structure across neighboring pages.
- The review date is current.
- The review hash matches the normalized text extracted by the verifier from the built page.

This is a style and quality gate. It cannot reliably determine whether a person or a model drafted the text. Go for Launch must not advertise the result as AI detection. The correct claim is that the final content passed defined automated checks and a hash-bound editorial review.

Boolean approvals record a reviewer's attestation. They do not prove reviewer independence, source accuracy, or natural writing. The operator must inspect the linked brief, source facts, and review findings. Phrase matching, repeated-opening counts, and cross-route similarity only identify possible problems; the independent reviewer covers the full list of tells.

The verifier hashes normalized `h1` through `h4`, `p`, and `li` text inside the selected content root after removing excluded elements, including navigation, headers, footers, forms, and `noscript`. Its hash does not cover every visible word or layout choice. Independently review the entire rendered page, including copy outside that extraction scope.

## Review workflow

1. Copy [`templates/content-quality.config.mjs`](templates/content-quality.config.mjs) into the website repository.
2. Define the audience, primary task, and reading threshold for every route family.
3. Give each route rule a `contentFamily` so intentional collection templates can be distinguished from unrelated pages that need their own argument.
   Complete the Writing for people process before accepting the draft. Keep the private brief and source ledger with the project's reference material.
4. Build the website.
5. Run the verifier once to obtain each page's content hash, cross-route comparisons, and automated findings.
6. Rewrite content whose opening, closing, or full-copy similarity exceeds the reviewed threshold, unless the pages deliberately belong to the same content family.
7. Have the independent reviewer inspect the rendered page using the senior psychology professor perspective and the tells above. Read it aloud, remove stiff or mechanically balanced phrasing, and confirm that the page could not be relabeled as another route without substantive rewriting. Recheck the revised copy against its neighbors.
8. Copy [`templates/content-quality.reviews.json`](templates/content-quality.reviews.json), record the writer, independent reviewer, evidence references, exact hash, and resolved findings. Set an approval to `true` only after that review is complete. The starter values are deliberately unapproved.
9. Run the verifier again. A missing or stale review blocks the build.
10. Rebuild and repeat the review whenever public content changes.

The review applies to rendered content, not only source text. Navigation, repeated labels, hidden fallback text, and component composition can change how a page reads after it is assembled.

Cross-route similarity uses word-shingle overlap as a review signal. It does not prove that copy is automated, duplicated, or poor. Configure route families and thresholds deliberately, inspect every finding, and rewrite pages that lack a route-specific purpose or argument. Do not silence a finding by assigning arbitrary family names.

Existing project configurations keep their configured checks; changing the toolkit template does not retrofit them or approve their content. When adopting this process, add the current `requiredReviewFields` and the two-repeat starter threshold to the project configuration, then obtain a real review. Do not bulk-fill new approvals or replace hashes to make a release pass. The editorial process remains required even where a legacy configuration checks fewer fields.

## Before delivery

- The private brief exists, and every claim traces to a source in it.
- The copy contains no drafting instructions or sentences describing the page, site, process, or rules instead of helping the reader.
- A reviewer who did not write the draft checked the copy and source facts, and their findings were corrected.
- Read aloud, each sentence sounds like someone at the company talking to the reader.
- No opener or structure appears more than twice on a page, and neighboring pages do not share one repeated shape.
- Web review records match the verifier's extracted text, and the independent review covers the complete rendered page. Source notes and review materials remain outside the published copy.

## Writing guidance

Prefer concrete language:

- Say what the toolkit checks, what it needs, and what happens when a check fails.
- Put the reader's question before the implementation detail.
- Use ordinary verbs such as `build`, `check`, `compare`, `record`, and `fix`.
- Name the source, owner, date, limitation, and next action when they matter.
- Vary sentence length naturally, while keeping difficult ideas in manageable units.

Remove synthetic language:

- Do not open with a broad claim about a fast-moving world or digital landscape.
- Do not tell readers to delve into, unlock, leverage, navigate, revolutionize, or seamlessly transform something when a concrete verb would be clearer.
- Do not stack adjectives such as robust, scalable, cutting-edge, innovative, and powerful without measurable evidence.
- Do not repeat the same sentence frame across a row of cards or several paragraphs.
- Do not use a polished slogan where the reader needs a condition, limitation, or instruction.

Technical terms are allowed when the intended audience needs them. Define them, use them consistently, and keep surrounding sentences plain.

## Production rule

The Stanford Rule content quality report is mandatory for every production candidate. Errors block release. Warnings require review and may be configured to block release. Changes to extracted text invalidate its stored hash. Any public content change still requires a renewed editorial review, including changes outside the verifier's extraction scope.
