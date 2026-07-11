# Stanford Rule Content Quality Gate

## Definition

The Stanford Rule is a Go for Launch editorial standard requested by the project's maintainer. It is not a Stanford University policy, research finding, endorsement, or authorship detector.

For every public page, the writer and reviewer adopt the perspective of a senior psychology professor who understands how people attend to, interpret, remember, and act on information. The goal is content that feels approachable to its intended audience, sounds like a thoughtful person wrote it, makes its purpose clear, and supports important claims with evidence.

The rule does not ask a page to sound academic. It asks the reviewer to use mature judgment about audience, cognitive load, trust, motivation, and clarity.

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
- Sentence openings are not repeated so often that the copy feels templated.
- Openings, closings, and full copy are compared across different content families so route-specific pages do not repeat one generic argument.
- Every built page has an editorial record using the `senior-psychology-professor` perspective.
- The reviewer approves approachability, human tone, purpose, and evidence awareness.
- The project template also requires a read-aloud cadence review and confirmation that the page makes a route-specific argument.
- The review date is current.
- The review hash matches the exact main content in the built page.

This is a style and quality gate. It cannot reliably determine whether a person or a model drafted the text. Go for Launch must not advertise the result as AI detection. The correct claim is that the final content passed defined automated checks and a hash-bound editorial review.

## Review workflow

1. Copy [`templates/content-quality.config.mjs`](templates/content-quality.config.mjs) into the website repository.
2. Define the audience, primary task, and reading threshold for every route family.
3. Give each route rule a `contentFamily` so intentional collection templates can be distinguished from unrelated pages that need their own argument.
4. Build the website.
5. Run the verifier once to obtain each page's content hash, cross-route comparisons, and automated findings.
6. Rewrite content whose opening, closing, or full-copy similarity exceeds the reviewed threshold, unless the pages deliberately belong to the same content family.
7. Review the rendered page while adopting the senior psychology professor perspective. Read it aloud, remove stiff or mechanically balanced phrasing, and confirm that the page could not be relabeled as another route without substantive rewriting.
8. Copy [`templates/content-quality.reviews.json`](templates/content-quality.reviews.json), record the exact hash, and complete every approval field with a specific note.
9. Run the verifier again. A missing or stale review blocks the build.
10. Rebuild and repeat the review whenever public content changes.

The review applies to rendered content, not only source text. Navigation, repeated labels, hidden fallback text, and component composition can change how a page reads after it is assembled.

Cross-route similarity uses word-shingle overlap as a review signal. It does not prove that copy is automated, duplicated, or poor. Configure route families and thresholds deliberately, inspect every finding, and rewrite pages that lack a route-specific purpose or argument. Do not silence a finding by assigning arbitrary family names.

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

The Stanford Rule content quality report is mandatory for every production candidate. Errors block release. Warnings require review and may be configured to block release. Any content change invalidates the stored hash and requires a new editorial approval before production.
