// Agent readiness config for scripts/verify-agent-readiness.mjs.
//
// Every check on https://isitagentready.com/ is listed here. Give each one a
// status:
//
//   required        The site must publish it, and it must be valid.
//   optional        The site may leave it out. If it is published, it must be valid.
//   not-applicable  The site does not offer it. Write the reason. The verifier
//                   fails if it finds the item published anyway. DNS records
//                   and paid routes are only looked for with --live.
//
// The reasons below describe an informational site with no public API, no
// sign-in for agents, and no checkout. Replace each one with the true reason
// for this project, and change the status of anything the site really offers.
//
// Add `liveOnly: true` to a check when the answer exists only on the running
// site, for example Content Signals that the host adds when it serves
// robots.txt. It cannot be set on robotsTxt, sitemap, or llmsTxt, which are
// always read from the built output.

export default {
  site: "https://www.example.com",
  outputDirectory: "dist",
  sitemap: "sitemap.xml",

  // Used with --live. Point this at staging before production.
  liveUrl: "https://staging.example.com",

  // The DNS check asks this resolver for SVCB and HTTPS records. It receives
  // the site's host name and nothing else.
  dnsResolver: "https://cloudflare-dns.com/dns-query",

  // The verifier sends at most this many live requests and fails any check it
  // could not finish.
  maximumLiveRequests: 60,

  report: "artifacts/agent-readiness-report.json",

  checks: {
    // Discoverability
    robotsTxt: { status: "required" },
    sitemap: { status: "required" },
    linkHeaders: { status: "required" },
    dnsAid: {
      status: "not-applicable",
      reason: "The site runs no agent endpoint, so there is nothing to advertise in DNS.",
      // The scanner's guidance gives these two names as examples and does not
      // say which names it looks up. Set `domain` when the records live on the
      // bare domain instead of the www host.
      names: ["_index._agents", "_a2a._agents"]
    },

    // Content
    markdownNegotiation: {
      // Counts toward the scanner's score. Needs a server or edge feature that
      // answers `Accept: text/markdown`, so the project owner decides.
      status: "optional",
      paths: ["/"]
    },
    llmsTxt: { status: "required" },
    llmsFullTxt: { status: "optional" },

    // Bot access control
    aiBotRules: {
      status: "required"
      // mustName: ["GPTBot", "ClaudeBot"]  // crawlers that need their own rules
    },
    contentSignals: {
      // The values are the owner's decision about how AI systems may use the
      // content. Record the decision in `expected` so a changed robots.txt fails.
      status: "optional"
      // expected: { "ai-train": "no", search: "yes", "ai-input": "yes" }
    },
    webBotAuth: {
      status: "not-applicable",
      reason: "The site only serves pages. It sends no signed bot requests to other sites."
    },

    // Protocol discovery
    apiCatalog: {
      status: "not-applicable",
      reason: "The site has no public API to list."
    },
    oauthDiscovery: {
      status: "not-applicable",
      reason: "The site has no sign-in for agents and runs no OAuth server."
    },
    oauthProtectedResource: {
      status: "not-applicable",
      reason: "The site has no protected API."
    },
    authMd: {
      status: "not-applicable",
      reason: "Agents cannot register with this site."
    },
    mcpServerCard: {
      status: "not-applicable",
      reason: "The site runs no MCP server."
    },
    a2aAgentCard: {
      status: "not-applicable",
      reason: "The site runs no agent that other agents can call."
    },
    agentSkills: { status: "optional" },
    webMcp: { status: "optional" },
    ard: { status: "optional" },
    personalAgentProtocol: {
      status: "not-applicable",
      reason: "The site does not take part in the Personal Agent Protocol."
    },

    // Commerce. The scanner reports these and does not score them.
    x402: {
      status: "not-applicable",
      reason: "Nothing on the site is sold per request.",
      paths: []
    },
    mpp: {
      status: "not-applicable",
      reason: "The site takes no payments from agents."
    },
    ucp: {
      status: "not-applicable",
      reason: "The site has no checkout."
    },
    acp: {
      status: "not-applicable",
      reason: "The site has no checkout."
    }
  }
};
