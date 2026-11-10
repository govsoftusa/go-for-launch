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

Search engines, AI crawlers, and autonomous agents discover content through signals beyond HTML. Cloudflare's scanner at [isitagentready.com](https://isitagentready.com/) checks a site for 22 of them, and an informational or lead-generation site can truthfully publish only some.

Publish what the site really offers, and write down the reason for each item it leaves out. Every site built with the Go for Launch toolkit publishes the items the scanner scores and any site can offer: `robots.txt` with rules for AI crawlers and a Content-Signal line, a sitemap, HTTP Link headers, and Markdown content negotiation. llms.txt is required as well, although the scanner leaves that check off unless it is selected. Every other item is decided per project in `agent-readiness.config.mjs`, where each check is marked required, optional, or not-applicable.

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

### AI Crawler Rules and Content Signals in robots.txt

The scanner reads two things in `robots.txt` beyond the sitemap line.

It looks for rules that apply to AI crawlers. A `User-agent: *` group with at least one `Allow` or `Disallow` line is enough. Name a crawler only when it needs different rules from everyone else. The scanner's guidance lists `OAI-SearchBot`, `Claude-SearchBot`, and `PerplexityBot` for search, and `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`, and `Amazonbot` for training.

It also looks for a `Content-Signal` line, which tells AI systems how they may use the content. The line sits inside a `User-agent` group and sets `search`, `ai-input`, and `ai-train` to `yes` or `no`:

```text
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
```

The line is required, because the scanner scores it. The three values are the site owner's decision, and the toolkit does not choose them. Once the owner has decided, record the values under `contentSignals.expected` in the config. The verifier then fails when `robots.txt` says something else.

Some hosts add these lines when they serve `robots.txt`, so the built file never contains them. Set `liveOnly: true` on the check in that case, and it is judged against the running site.

### Markdown Content Negotiation

Some AI crawlers send `Accept: text/markdown` to request a Markdown version of a page rather than HTML. Responding correctly requires server-side logic that detects the header and returns Markdown for the same URL. The response must use `Content-Type: text/markdown`, and the same URL must still return HTML to a browser. An `x-markdown-tokens` header with the token count is optional.

The scanner counts this check toward its score, and a site cannot reach the scanner's "Agent-Readable" level without it. llms.txt does not satisfy it. The template therefore marks the check required.

A static site cannot answer the header by itself. Use a host feature that converts pages to Markdown on request, or a Cloudflare Worker in front of the static Astro output. The Worker inspects the `Accept` header and returns a pre-built `.md` file with `Content-Type: text/markdown; charset=utf-8`. Pre-build the Markdown files during the Astro build step.

### Publish Only What the Site Offers

The remaining items on the scanner's list each describe something a site runs. Publish one when the description is true for the site:

| Item | Where it lives | Publish it when |
| --- | --- | --- |
| DNS for AI Discovery | SVCB or HTTPS records under `_agents`, such as `_index._agents.example.com` | The site runs an agent endpoint for the records to point to. |
| Web Bot Auth | `/.well-known/http-message-signatures-directory` | The site sends signed bot requests to other sites. A site that only serves pages does not need it. |
| API Catalog | `/.well-known/api-catalog` | The site has a public API. |
| OAuth discovery | `/.well-known/openid-configuration` or `/.well-known/oauth-authorization-server` | Agents can sign in. |
| OAuth Protected Resource | `/.well-known/oauth-protected-resource` | The site has an API that needs a sign-in. |
| Auth.md | `/auth.md` | Agents can register with the site. |
| MCP Server Card | `/.well-known/mcp/server-card.json` | The site runs a Model Context Protocol server. |
| A2A Agent Card | `/.well-known/agent-card.json` | The site runs an agent that other agents can call. |
| Agent Skills | `/.well-known/agent-skills/index.json` | The site has written instructions for agents. Each entry carries a SHA-256 digest of its file, so recalculate the digest whenever the file changes. |
| WebMCP | A page script that registers tools, or `toolname` attributes on a form | A page offers a form or action an agent may use. |
| ARD manifest | `/.well-known/ai-catalog.json` | The site publishes at least one of the items above and wants one list of them. |
| Personal Agent Protocol | `/.well-known/poppy.json` | The organization takes part in the protocol. The scanner reports it without scoring it. |
| x402, MPP, UCP, ACP | A paid route that answers HTTP 402, `/openapi.json` with payment details, `/.well-known/ucp`, `/.well-known/acp.json` | The site sells to agents. The scanner reports these without scoring them. |

A discovery file that describes something the site does not run misleads every agent that reads it. Leave the file out and write the reason in the config. A low scanner score caused only by items that do not apply is not a defect.

The scanner awards levels in order, as read on 2026-11-10. Level 1 needs two of `robots.txt`, a sitemap, and Link headers. Level 2 adds AI crawler rules and Content Signals. Level 3 adds Markdown negotiation. Level 4 adds one of an MCP Server Card, an A2A Agent Card, Agent Skills, or an API Catalog. Level 5 adds two of three: Web Bot Auth, "all integrations", and sign-in metadata (OAuth or Auth.md). The scanner's page does not define "all integrations".

### Verify Agent Discovery Signals

Run [`scripts/verify-aeo.mjs`](scripts/verify-aeo.mjs) against the built candidate to confirm llms.txt and the Link headers are in place before staging:

```bash
node scripts/verify-aeo.mjs --dir=dist --site=https://www.example.com
```

Add `--live` to also check response headers on the deployed staging URL. The script writes a machine-readable JSON report and exits with a non-zero code when signals are missing or malformed.

Run [`scripts/verify-agent-readiness.mjs`](scripts/verify-agent-readiness.mjs) for every release to check the site against the scanner's whole list. Copy [`templates/agent-readiness.config.mjs`](templates/agent-readiness.config.mjs) into the project first and give every check a status:

- `required`: the site must publish it, and it must be valid.
- `optional`: the site may leave it out. If it is published, it must be valid.
- `not-applicable`: the site does not offer it. The config must give a written reason, and the verifier fails if it finds the item published anyway. DNS records and paid routes can only be looked for with `--live`, and a paid route only at the addresses the config lists.

```bash
node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs
node scripts/verify-agent-readiness.mjs --config=agent-readiness.config.mjs --live --live-url=https://staging.example.com
```

The first command reads the built output. Markdown negotiation, DNS records, and paid routes need a running site. Without `--live` they are reported as "not checked" unless the config marks them not-applicable, and the run can still pass. The second command also asks the staging site. It checks the served files the same way and fails when something in the build is missing from staging. It sends at most the number of requests the config allows, and fails any check it could not finish.

The verifier never sends the site to the scanner. The DNS check asks a public resolver for the site's host name, and every other request goes to the site itself.

| Scanner check | Verified by |
| --- | --- |
| robots.txt | `verify-sitemap.mjs` for the file and its sitemap line, and `verify-site-health.mjs` for the `User-agent` line. The agent readiness verifier runs `verify-sitemap.mjs` and reports its result. |
| Sitemap | `verify-sitemap.mjs`, run by the agent readiness verifier. |
| Link headers | `verify-aeo.mjs` for the built `_headers` file, run by the agent readiness verifier. The agent readiness verifier adds two rules of its own. An entry that points to `llms.txt` fails when the site has no `llms.txt`, and the entry is not expected when the config marks `llms.txt` optional and the site has none. With `--live`, it reads the home page response itself and fails when a built entry is missing from it. |
| llms.txt | `verify-aeo.mjs`, run by the agent readiness verifier. The scanner leaves this check off unless it is selected. |
| DNS for AI Discovery, Markdown negotiation, x402 | `verify-agent-readiness.mjs` with `--live`. |
| AI bot rules, Content Signals | `verify-agent-readiness.mjs`, from the built `robots.txt` and, with `--live`, the served one. |
| Web Bot Auth, API Catalog, OAuth discovery, OAuth Protected Resource, Auth.md, MCP Server Card, A2A Agent Card, Agent Skills, ARD manifest, Personal Agent Protocol, MPP, UCP, ACP | `verify-agent-readiness.mjs`, from the built file and, with `--live`, the served one. |
| WebMCP | `verify-agent-readiness.mjs`, by reading the built pages and scripts. The scanner loads the page in a browser, so this is an approximation. |

The verifier also checks `llms-full.txt` when a site publishes one. The scanner documents that file without listing it as a check.

The scanner's pages do not state everything. They do not say whether DNS for AI Discovery and the ARD manifest count toward the score. They do not say which checks belong to its "Content Site" and "API / Application" presets, what exactly makes the Link header check pass, which DNS names it looks up, or which address it requests for x402. The verifier therefore takes DNS names and paid routes from the config. Where the scanner's guidance lists a field without calling it required, the verifier reports a note instead of a failure.

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
- No verify-aeo.mjs blockers are reported. Triage its warnings. A missing llms.txt or Link entry is one of them, and it blocks release through `verify-agent-readiness.mjs` when the config marks that check required.
- `agent-readiness.config.mjs` gives every scanner check a status, and each not-applicable check has a reason that is true for this site.
- `verify-agent-readiness.mjs` reports no blockers against the built output, and none with `--live` against staging. A check reported as "not checked" has not passed.

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
- The check list at isitagentready.com. Cloudflare adds checks and changes paths as the standards move. Compare the list with the catalogue in `scripts/lib/agent-readiness.mjs` and add any new check there, in the template, and in the test.
- Agent tool discovery standards (the MCP Server Card at `/.well-known/mcp/server-card.json`, the A2A Agent Card, and Agent Skills). These apply only to sites that run a server, an agent, or published skills, and the specifications are still drafts. Review quarterly if any GovSoft property adds an API.
- DNS for AI Discovery (DNS-AID). An early-stage approach that publishes agent endpoints in DNS. Skip it for sites with no agent endpoint and re-evaluate quarterly.
- Commerce agent protocols (x402, MPP, UCP, ACP). Skip for informational sites; re-evaluate if a site adds commerce functionality.

When a material change in standards is identified, update `ANSWER-ENGINE-OPTIMIZATION.md`, `verify-aeo.mjs` or `verify-agent-readiness.mjs` if the verification logic needs updating, and the templates if a format changes. Use a descriptive commit message referencing the source of the change.

The Go for Launch toolkit itself must be kept current. When agent discovery or AEO requirements change, open a pull request against the `main` branch of the `govsoftusa/go-for-launch` repository with a description of what changed and why. Do not defer updates indefinitely; a toolkit that lags real-world requirements causes compounding remediation work on downstream sites.

## Sources

- [HubSpot, FAQs for AEO](https://blog.hubspot.com/marketing/faqs-for-aeo)
- [Google Search Central, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central, General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Search Central, Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Google Search Central, Q&A structured data](https://developers.google.com/search/docs/appearance/structured-data/qapage)
- [llmstxt.org, The llms.txt specification](https://llmstxt.org)
- [IETF RFC 8288, Web Linking](https://www.rfc-editor.org/rfc/rfc8288) (the standard governing HTTP Link headers)
- [Cloudflare, Is It Agent Ready](https://isitagentready.com/) (the scanner and its per-check guidance, read 2026-11-10)
- [Cloudflare blog, agent readiness](https://blog.cloudflare.com/agent-readiness/)
- [IETF RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [Content Signals](https://contentsignals.org/)
- [IETF RFC 9727, api-catalog](https://www.rfc-editor.org/rfc/rfc9727)
- [IETF RFC 8414, OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414)
- [IETF RFC 9728, OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728)
