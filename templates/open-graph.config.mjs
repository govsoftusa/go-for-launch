export default {
  outputDirectory: "public",
  reviewDirectory: "output/open-graph-review",
  approvalFile: "open-graph-approvals.json",
  stateFile: "open-graph-state.json",
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
    { name: "about", purpose: "Explain the release process when the about page is shared.", lineOne: "A clear process", lineTwo: "for every release." }
  ]
};
