export default {
  outputDirectory: "dist",
  site: "https://www.example.gov",
  output: "artifacts/semantic-seo-report.json",
  failOnWarnings: false,
  requirePageRule: true,
  contentSelectors: ["article", "main"],
  title: {
    minimumCharacters: 30,
    maximumCharacters: 60,
    minimumWords: 4,
    minimumH1Overlap: 2,
    minimumContentOverlap: 3,
    maximumRepeatedWord: 2,
    ignoredTerms: ["Example Agency"]
  },
  pageRules: [
    {
      pattern: "/",
      minimumWords: 120,
      titleTerms: ["public information", "government services"],
      minimumTitleTerms: 1,
      contentTerms: ["public", "services", "government"],
      minimumContentTerms: 2
    },
    {
      patterns: ["/articles/**", "/publications/**"],
      minimumWords: 500,
      titleTerms: ["replace with reviewed topic terms"],
      contentTerms: ["replace with reviewed purpose terms"],
      requireCitations: true
    }
  ],
  citations: {
    routePatterns: ["/articles/**", "/publications/**"],
    requireOnMatchedRoutes: true,
    checkExternal: true,
    timeoutMs: 8000,
    concurrency: 6,
    requireReviews: true,
    maximumReviewAgeDays: 365,
    minimumContextSourceOverlap: 2,
    lowOverlapSeverity: "warning",
    ignoredUrls: [],
    sourceSnapshots: [],
    reviews: [
      {
        route: "/articles/example/",
        url: "https://www.example.gov/source/",
        claimTerms: ["reviewed claim language"],
        sourceTerms: ["supporting source language"],
        reviewer: "Reviewer name",
        reviewedAt: "2026-01-01",
        note: "Explain what the source supports and any limitation."
      }
    ]
  }
};
