# Answer Engine Optimization for Informational Websites

Answer Engine Optimization, or AEO, is the practice of making accurate website content easy for search engines and AI answer systems to find, understand, extract, and cite. AEO extends conventional SEO. It does not replace crawlability, indexing, useful content, internal links, canonical URLs, sitemaps, performance, accessibility, or Search Console measurement.

Google states that AI Overviews and AI Mode use the same foundational SEO requirements as Google Search. A page must be indexed and eligible to appear with a snippet, and Google does not require a special AI file or special schema. Treat clear question and answer content as a user-focused content pattern, not a shortcut or ranking guarantee.

## Research Questions From Evidence

Do not invent a large FAQ library from internal terminology. Build a question inventory from the language people already use:

- Google Search Console queries, impressions, clicks, positions, and landing pages.
- Ahrefs matching terms, questions, parent topics, competitor gaps, and top pages when approved access exists.
- Site search, support tickets, sales calls, form submissions, documentation gaps, and customer interviews.
- Google autocomplete, related searches, and People Also Ask as secondary discovery inputs.
- Primary sources for formal definitions, technical requirements, regulations, statistics, and time-sensitive claims.

Ahrefs is optional. It is not required to use Go for Launch, perform technical SEO validation, build answer-first content, or pass the production gate. Use it only when the project has approved account access. Otherwise, use the credible first-party and public evidence available to the project and record any research limitation.

Record each candidate question with its source, wording, intent, audience, current destination, proposed destination, supporting source, and measurement plan. Prefer evidence-backed questions with a clear user need over speculative volume.

## Build One Topic Cluster Per Page

Each FAQ page or embedded FAQ section must own one primary subject. A catch-all FAQ that mixes pricing, implementation, support, compliance, and unrelated product features weakens both user navigation and topical clarity.

Use this structure:

1. Write an H1 that describes the topic in natural language.
2. Define the topic in one to three opening sentences.
3. Use a complete question as each H2 or H3.
4. Put the answer immediately after its question.
5. Render the full answer in the initial HTML. An accordion may be used only when the answer remains present without client-side JavaScript.
6. Link to deeper supporting pages after the direct answer when more detail is useful.

Combine embedded FAQs and dedicated pages deliberately. Embedded questions should resolve page-specific evaluation or implementation concerns. A dedicated FAQ page should consolidate a coherent category without duplicating identical answers across many URLs.

## Write Answers That Stand Alone

Start each answer with a direct resolution that remains meaningful when quoted without the surrounding page. A useful editorial guideline is to resolve the question in the first 40 to 60 words and keep the complete answer under 200 words when the subject permits. Accuracy and completeness take priority over a fixed word count.

Strong answers:

- Use the official names of products, organizations, standards, and concepts consistently.
- State the subject explicitly instead of relying on pronouns or a preceding answer.
- Separate facts, recommendations, limitations, and commercial claims.
- Use short lists for criteria or steps.
- Cite primary sources near technical, legal, regulatory, or statistical claims.
- Include the year when a statement can become stale.
- Display a last-reviewed date and responsible reviewer for maintained guidance.

Avoid filler before the answer, unsupported superlatives, keyword repetition, hidden answers, fabricated questions, and claims that an answer engine will cite or rank the page.

## Use Structured Data Accurately

Visible content comes first. `FAQPage` structured data is optional and must not be used to compensate for weak or missing content.

When `FAQPage` JSON-LD is used:

- Mark up only questions and answers visible on that page.
- Keep the schema text identical to the visible answer text.
- Update the schema in the same source object as the visible content so the two cannot drift.
- Parse the JSON-LD during automated tests.
- Validate representative pages with Google's Rich Results Test after deployment.

Google currently limits FAQ rich results primarily to well-known government and health sites. Valid FAQ markup does not guarantee a rich result, higher ranking, or inclusion in an AI answer. Do not use `QAPage` for an editorial FAQ. Google reserves `QAPage` for a single question where users can submit multiple answers.

## Agent-Facing Discovery Signals

Search engines, AI crawlers, and autonomous agents discover content through signals beyond HTML. Three additions improve agent discoverability for a typical informational or lead-generation site. The first two, llms.txt and HTTP Link headers, are required for any site built with the Go for Launch toolkit. Markdown content negotiation is optional. Implement them in the order they appear here.

### llms.txt

Publish a plain text file at `/llms.txt` that describes the site in natural language for AI systems. The file format is defined at [llmstxt.org](https://llmstxt.org) and uses Markdown conventions.

A minimal file includes:

- A level-one heading with the organization or site name.
- A short description in a blockquote.
- An About section with one to three sentences describing the organization and its primary audience.
- A Content section linking key pages with short descriptions.

Place the file in the Astro project `public/` directory so Astro copies it unchanged to the build root. Use [`templates/llms.txt`](templates/llms.txt) as a starting point.

Keep the file accurate and current. Update it when primary content, navigation, or key page URLs change. It is not a Google ranking input and does not replace a sitemap.

### HTTP Link Headers for Agent Discovery

Add HTTP `Link` response headers that advertise the llms.txt file and the canonical sitemap. This is required alongside llms.txt. Agents and crawlers that read response headers before parsing HTML discover these resources directly without needing to parse any HTML.

For Cloudflare Pages, create a `_headers` file in the Astro project `public/` directory:

```text
/*
  Link: </llms.txt>; rel="describedby"; type="text/plain"
  Link: </sitemap.xml>; rel="sitemap"
```

Each entry adds a `Link` header to every response from the site. Confirm the `_headers` file appears in the built output root after `astro build`.

Before staging, verify the header is present in the actual HTTP response on the deployed site, not just in the build output. Run:

```bash
curl -sI https://www.example.com/ | grep -i "^link:"
```

A missing Link header on the live site is a release blocker even when the `_headers` file is correctly present in the build output. Cloudflare Pages configuration, caching layers, or a misconfigured Worker can suppress headers that appear correct locally.

### Markdown Content Negotiation

Some AI crawlers send `Accept: text/markdown` to request a Markdown version of a page rather than HTML. Responding correctly requires server-side logic that detects the header and returns a Markdown file for the same URL.

This is optional for most informational sites. llms.txt satisfies the primary machine-readable content need. Prioritize llms.txt and Link headers before implementing Markdown negotiation middleware.

If Markdown negotiation is required, use a Cloudflare Worker deployed in front of the static Astro output. The Worker inspects the `Accept` header and returns a corresponding pre-built `.md` file with `Content-Type: text/markdown; charset=utf-8`. Pre-build the Markdown files during the Astro build step.

### What Not to Implement for Informational Sites

The following signals apply only when a site exposes APIs, agent tools, or commerce integrations. Do not implement them for standard informational or lead-generation sites:

- `/.well-known/mcp.json`: Required only when the site runs a Model Context Protocol server.
- `/.well-known/ai-plugin.json`: Required only when the site exposes an agent skill or plugin.
- OAuth and OIDC discovery endpoints: Required only when the site offers an API that agents can authenticate against.
- DNS-AIG records: An early experimental approach to DNS-based agent discovery. Skip until adoption is established. Re-evaluate quarterly.
- Commerce agent protocols (AAEI, MPP, KCP): Required only for commerce-enabled sites with agent-facing checkout flows.

Third-party site assessment tools often score all of these signals as missing without distinguishing which apply to a given site type. A low score on inapplicable infrastructure is not a defect.

### Verify Agent Discovery Signals

Run [`scripts/verify-aeo.mjs`](scripts/verify-aeo.mjs) against the built candidate to confirm llms.txt and the Link headers are in place before staging:

```bash
node scripts/verify-aeo.mjs --dir=dist --site=https://www.example.com
```

Add `--live` to also check response headers on the deployed staging URL. The script writes a machine-readable JSON report and exits with a non-zero code when signals are missing or malformed.

## Astro Implementation Pattern

Keep each question and answer in one typed source object, then render both the visible HTML and optional JSON-LD from it:

```ts
interface FaqEntry {
  question: string;
  answer: string;
}

const faqs: FaqEntry[] = [
  {
    question: "How does AEO relate to SEO?",
    answer: "AEO extends SEO by making useful, indexed content easier for answer systems to understand and quote. It still depends on conventional SEO foundations including crawlability, internal links, canonical URLs, structured content, performance, and trustworthy sources."
  }
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer }
  }))
};
```

Render every question as a heading and every answer as ordinary HTML. Do not require hydration to expose the text.

## Test the Result

For every page with answer-focused content:

- Confirm the question headings and complete answers exist in the built HTML.
- Confirm the page remains readable with JavaScript disabled.
- Confirm each question belongs to the page's primary topic.
- Confirm every structured answer exactly matches visible content.
- Parse all JSON-LD and reject invalid JSON.
- Verify canonical metadata, unique Open Graph metadata, internal links, and sitemap inclusion.
- Check cited external sources still resolve and still support the claim.
- Test mobile heading wrapping, accordions when used, and horizontal overflow.
- Verify the deployed page through Search Console URL Inspection when access exists.

For agent discoverability signals, run `verify-aeo.mjs` and confirm:

- llms.txt is present in the build output and contains a level-one heading and an About section.
- `_headers` includes `Link: </llms.txt>; rel="describedby"` and `Link: </sitemap.xml>; rel="sitemap"`.
- The Link headers are confirmed present in the actual HTTP response on the deployed site. Run `curl -sI https://www.example.com/ | grep -i "^link:"` and confirm the llms.txt and sitemap entries appear. A missing header on the live site is a blocker even when `_headers` is correct in the build output.
- No verify-aeo.mjs blockers are reported. Warnings do not block release but must be triaged.

Do not block a release because an answer engine did not cite a new page. Citation selection is outside the site's control. Block the release for invalid schema, hidden or contradictory content, unsupported claims, broken sources, missing sitemap coverage, missing or malformed llms.txt, missing Link headers for llms.txt and sitemap on the deployed site, or a failed standard SEO gate.

## Measure and Maintain

Record a baseline before changing content. Review the result at least quarterly and whenever the product, source material, customer questions, or search behavior changes.

Measure:

- Search Console impressions, clicks, position, query mix, and landing-page performance.
- Organic conversions and qualified form submissions.
- Answer-engine citations and brand mentions for a stable set of representative prompts, when an approved monitoring tool exists.
- Competitor citation gaps without copying competitor answers.
- Questions that produce no engagement, duplicate another page, or attract the wrong audience.

Google reports traffic from AI Overviews and AI Mode within the Search Console Performance report under the Web search type rather than as a separate AEO channel. Evaluate Search Console, analytics, lead quality, and citation monitoring together. Preserve dated evidence and avoid attributing every traffic change to one FAQ revision.

## Staying Current with AEO Standards

AEO standards and agent discovery protocols are evolving. Review the following on a recurring basis, at minimum quarterly, and after any major announcement from a search engine or AI platform vendor.

Track for changes:

- The llmstxt.org specification. The format is stable but may gain new optional sections or conventions. Update `templates/llms.txt` and any site-specific llms.txt files when the spec changes meaningfully.
- Google Search Central documentation on AI features and structured data. Google does not require dedicated agent files today but its guidance changes. Re-read the AI features page quarterly.
- Agent tool and plugin discovery standards (`/.well-known/mcp.json`, `/.well-known/ai-plugin.json`). These apply only to sites that expose APIs or agent tools, but the specs are maturing. Review quarterly if any GovSoft property adds an API.
- DNS-AIG (DNS-based Agent Identification and Guidance). An early-stage experimental approach. Skip implementation for now; re-evaluate quarterly.
- Commerce agent protocols (AAEI, MPP, KCP). Skip for informational sites; re-evaluate if a site adds commerce functionality.

When a material change in standards is identified, update `ANSWER-ENGINE-OPTIMIZATION.md`, `verify-aeo.mjs` if the verification logic needs updating, and `templates/llms.txt` if the template format changes. Use a descriptive commit message referencing the source of the change.

The Go for Launch toolkit itself must be kept current. When agent discovery or AEO requirements change, open a pull request against the `main` branch of the `govsoftusa/go-for-launch` repository with a description of what changed and why. Do not defer updates indefinitely; a toolkit that lags real-world requirements causes compounding remediation work on downstream sites.

## Sources

- [HubSpot, FAQs for AEO](https://blog.hubspot.com/marketing/faqs-for-aeo)
- [Google Search Central, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central, General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Search Central, Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Google Search Central, Q&A structured data](https://developers.google.com/search/docs/appearance/structured-data/qapage)
- [llmstxt.org, The llms.txt specification](https://llmstxt.org)
- [IETF RFC 8288, Web Linking](https://www.rfc-editor.org/rfc/rfc8288) (the standard governing HTTP Link headers)
