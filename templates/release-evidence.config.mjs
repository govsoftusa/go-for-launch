export default {
  candidate: "reviewed-candidate-id",
  report: "artifacts/release-evidence-manifest.json",
  sources: [
    {
      name: "application runtime",
      repo: ".",
      revision: "reviewed-application-revision",
      paths: [
        "astro.config.mjs",
        "package-lock.json",
        "public",
        "src",
        "wrangler.jsonc",
      ],
    },
  ],
  toolkits: [
    {
      name: "Go for Launch",
      repo: "../go-for-launch",
      revision: "reviewed-toolkit-revision",
    },
  ],
  artifacts: [
    {
      name: "rendered candidate",
      path: "artifacts/release-output",
      format: "directory",
    },
    {
      name: "candidate snapshot",
      path: "artifacts/release-output/snapshot-manifest.json",
      assertions: [
        { pointer: "/candidate", equalsConfig: "candidate" },
        { pointer: "/failures", lengthEquals: 0 },
        { pointer: "/sitemapRoutes", lengthMinimum: 1 },
      ],
    },
    {
      name: "PageSpeed",
      path: "artifacts/pagespeed-report.json",
      assertions: [
        { pointer: "/status", equals: "passed" },
        { pointer: "/expectedCandidate", equalsConfig: "candidate" },
        { pointer: "/rounds", minimum: 1 },
      ],
    },
  ],
};
