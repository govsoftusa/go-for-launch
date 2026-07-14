export default {
  outputDirectory: "dist",
  site: "https://www.example.gov",
  output: "artifacts/site-health-report.json",
  trailingSlash: "always",
  sitemapUrl: "https://www.example.gov/sitemap.xml",
  maximumImageBytes: 100_000,
  maximumTitleLength: 60,
  minimumDescriptionLength: 110,
  maximumDescriptionLength: 155,
  requireIncomingLinks: true,
  requireUniqueTitles: true,
  requireUniqueDescriptions: true,
  requireRobots: true,
  orphanAllowlist: [],
  largeImageAllowlist: [],
  redirectRoutes: []
};
