export default {
  outputDirectory: "dist",
  output: "artifacts/content-quality-report.json",
  contentSelector: "main",
  requireRouteRule: true,
  requireReview: true,
  reviewFile: "templates/content-quality.reviews.json",
  maximumReviewAgeDays: 180,
  maximumSentenceWords: 34,
  maximumParagraphWords: 110,
  minimumReadingEase: 42,
  readingEaseSeverity: "error",
  maximumRepeatedOpenings: 3,
  phraseSeverity: "error",
  additionalPhrases: [],
  requiredReviewFields: ["approachable", "humanTone", "clearPurpose", "evidenceAware", "readAloud", "routeSpecific"],
  crossPageSimilarity: {
    enabled: true,
    severity: "error",
    shingleSize: 2,
    openingWords: 80,
    closingWords: 80,
    minimumComparableWords: 30,
    maximumOpeningSimilarity: 0.62,
    maximumClosingSimilarity: 0.62,
    maximumFullSimilarity: 0.78,
    compareWithinFamilies: false,
    excludedRoutePairs: []
  },
  routeRules: [
    {
      patterns: ["/", "/services/**"],
      contentFamily: "public-overview",
      audience: "People evaluating the organization and its services",
      primaryTask: "Understand the offer, requirements, evidence, and next action",
      minimumReadingEase: 45
    },
    {
      patterns: ["/guides/**", "/articles/**"],
      contentFamily: "editorial-guidance",
      audience: "Practitioners looking for accurate implementation guidance",
      primaryTask: "Understand the method and apply it without hidden assumptions",
      minimumReadingEase: 38
    }
  ]
};
