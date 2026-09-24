export default {
  outputDirectory: "dist",
  report: "artifacts/interface-quality-report.json",
  progressEvery: 1_000,
  screenshotDirectory: "artifacts/interface-quality",
  screenshots: "all",
  routeConcurrency: 1,
  coverageMode: "every-route",
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
  differentiationScope: "all-pairs",
  failOnWarnings: false,
  network: {
    externalRequests: "block",
    maximumCompletedExternalRequests: 0
  },
  header: {
    selector: "[data-site-header]",
    maximumViewportHeightRatio: 0.2
  },
  headings: {
    selector: "h1, h2, h3",
    minimumLastLineCharacters: 2,
    maximumHeroLines: 4
  },
  breadcrumbs: {
    selector: '[data-breadcrumbs], nav[aria-label="Breadcrumb"]',
    listSelector: "ol",
    itemSelector: ":scope > li",
    labelSelector: "[data-breadcrumb-label]",
    separatorSelector: "[data-breadcrumb-separator]",
    maximumRows: 2,
    maximumRowsByViewport: {
      mobile: 2,
      minimum: 2
    },
    maximumItemLines: 1,
    alignmentTolerance: 3,
    requireCurrentPage: true
  },
  controls: {
    selector: 'a[href], button, summary, input:not([type="hidden"]), textarea, select',
    overlap: {
      ignoreSelectors: []
    },
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
        maximumViewportHeightRatioByViewport: {
          expanded: 0.7,
          "compact-desktop": 0.75,
          tablet: 0.8,
          mobile: 0.85,
          minimum: 0.9
        },
        maximumHeadingLines: 4,
        nextContentSelector: "[data-after-hero]",
        minimumNextContentPixels: 24
      },
      regions: [
        {
          name: "Primary content panel",
          selector: "[data-primary-panel]",
          maximumViewportHeightRatio: 0.8,
          maximumInternalEmptyBandRatio: 0.2,
          maximumLeadingWhitespaceRatio: 0.18,
          maximumTrailingWhitespaceRatio: 0.18
        }
      ],
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
