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
  routeRules: [
    {
      patterns: ["/", "/services/**"],
      audience: "People evaluating the organization and its services",
      primaryTask: "Understand the offer, requirements, evidence, and next action",
      minimumReadingEase: 45
    },
    {
      patterns: ["/guides/**", "/articles/**"],
      audience: "Practitioners looking for accurate implementation guidance",
      primaryTask: "Understand the method and apply it without hidden assumptions",
      minimumReadingEase: 38
    }
  ]
};
