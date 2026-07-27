export default {
  outputDirectory: "public",
  reviewDirectory: "output/open-graph-review",
  approvalFile: "open-graph-approvals.json",
  stateFile: "open-graph-state.json",
  adoptionGate: {
    brandReferenceSha256: "REPLACE WITH SHA-256 OF AUTHORITATIVE BRAND REFERENCE",
    rendererContract: {
      kind: "project-owned",
      name: "REPLACE WITH PROJECT RENDERER NAME",
      version: "1",
      sourceSha256: "REPLACE WITH SHA-256 OF REVIEWED RENDERER SOURCE"
    },
    minimumPrototypeCards: 3,
    prototypeCardNames: ["home", "article-photographic", "article-fallback"],
    requiredCases: [
      "publication-identity",
      "long-headline",
      "source-artwork",
      "typographic-fallback"
    ],
    prototypeCases: [
      { name: "home", cases: ["publication-identity"] },
      { name: "article-photographic", cases: ["source-artwork", "long-headline"] },
      { name: "article-fallback", cases: ["typographic-fallback"] }
    ],
    prototypeOutputDirectory: "output/open-graph-prototype",
    prototypeReviewDirectory: "output/open-graph-prototype-review",
    prototypeStateFile: "open-graph-prototype-state.json",
    prototypeApprovalFile: "open-graph-prototype-approval.json",
    reviewContract: {
      reviewer: "REPLACE WITH REVIEWER",
      reviewedOn: "REPLACE WITH YYYY-MM-DD",
      brandReference: "REPLACE WITH BRAND GUIDE OR DESIGN SYSTEM VERSION",
      realClient: "REPLACE WITH MESSAGING OR SOCIAL CLIENT",
      brandAuthorityApproved: false,
      templateAppropriateApproved: false,
      typographyApproved: false,
      paletteApproved: false,
      imageryApproved: false,
      noUnapprovedSyntheticArtwork: false,
      readabilityApproved: false,
      brandIntegrityApproved: false,
      contactInformationApproved: false
    }
  },
  templateVersion: "1",
  seoContractVersion: "1",
  maximumBytes: 250_000,
  width: 1200,
  height: 630,
  eyebrow: "INDEPENDENT ASTRO WEBSITE TOOLKIT",
  tagline: "Migrate. Maintain. Test. Release.",
  domain: "www.example.com",
  mark: "GFL",
  colors: {
    background: "#07110f",
    accent: "#d6ff70",
    secondary: "#83f3c8"
  },
  typography: {
    sansFamily: "Arial, sans-serif",
    accentFamily: "Georgia, serif",
    eyebrowSize: 18,
    headlineOneSize: 76,
    headlineTwoSize: 74,
    supportingSize: 24,
    destinationSize: 23
  },
  brandRules: {
    approvedColors: ["#07110f", "#d6ff70", "#83f3c8"],
    approvedFontFamilies: ["Arial, sans-serif", "Georgia, serif"],
    minimumSafePadding: 60,
    minimumSupportingTextSize: 18,
    maximumHeadlineTextSize: 84
  },
  contactInformation: {
    required: true,
    value: "www.example.com"
  },
  reviewContract: {
    reviewer: "REPLACE WITH REVIEWER",
    reviewedOn: "2026-01-01",
    brandReference: "REPLACE WITH BRAND GUIDE OR DESIGN SYSTEM VERSION",
    readabilityApproved: false,
    brandIntegrityApproved: false,
    contactInformationApproved: false
  },
  cards: [
    { name: "home", purpose: "Introduce the toolkit when the homepage is shared.", lineOne: "Build better", lineTwo: "Astro websites." },
    { name: "article-photographic", purpose: "Exercise the reviewed photographic layout with a representative long headline.", lineOne: "A representative", lineTwo: "editorial headline." },
    { name: "article-fallback", purpose: "Exercise the designed typographic fallback when suitable source artwork is unavailable.", lineOne: "A clear fallback", lineTwo: "without invented art." }
  ]
};
