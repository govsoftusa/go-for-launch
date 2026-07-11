export default {
  outputDirectory: "dist",
  report: "artifacts/interface-quality-report.json",
  screenshotDirectory: "artifacts/interface-quality",
  screenshots: "failures",
  requireIndexableCoverage: true,
  exemptRoutes: [],
  browsers: ["chromium", "webkit"],
  viewports: [
    { name: "expanded", width: 1440, height: 1000 },
    { name: "compact-desktop", width: 1024, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
    { name: "minimum", width: 320, height: 720 }
  ],
  overlapTolerance: 1,
  overflowTolerance: 1,
  minimumDistinctiveDimensions: 2,
  differentiationBrowsers: ["chromium"],
  differentiationViewports: ["expanded", "mobile"],
  failOnWarnings: false,
  header: {
    selector: "[data-site-header]",
    maximumViewportHeightRatio: 0.2
  },
  controls: {
    selector: 'a[href], button, summary, input:not([type="hidden"]), textarea, select',
    targetSize: {
      enabled: true,
      minimumWidth: 24,
      minimumHeight: 24,
      severity: "warning",
      ignoreSelectors: []
    }
  },
  routes: [
    {
      path: "/",
      family: "home",
      archetype: "project-owned-home-archetype",
      purpose: "State the page-specific reader purpose",
      contentRhythm: "Describe the intended section rhythm",
      visualIdentity: "Describe the route family's distinctive visual treatment",
      requiredSelectors: ["main"],
      distinctiveSelectors: ["[data-home-experience]"],
      hero: {
        selector: "[data-page-hero]",
        maximumViewportHeightRatio: 0.78,
        nextContentSelector: "[data-after-hero]",
        minimumNextContentPixels: 24
      },
      clearance: [
        {
          name: "Primary actions above the next bordered region",
          from: "[data-primary-actions]",
          to: "[data-after-actions]",
          minimum: 16,
          requireHorizontalIntersection: true
        }
      ]
    }
  ]
};
