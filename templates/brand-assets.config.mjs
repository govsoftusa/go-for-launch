export default {
  brandGuide: {
    file: "../brand/brand-guide.pdf",
    sha256: "REPLACE_WITH_REVIEWED_BRAND_GUIDE_SHA256"
  },
  assets: [
    {
      id: "primary-full-color-light",
      file: "../public/brand/primary-full-color.svg",
      sha256: "REPLACE_WITH_APPROVED_ASSET_SHA256",
      variant: "Primary Full Color",
      allowedSurfaces: ["light"],
      minimumClearSpaceRatio: 0.25,
      minimumRenderedWidth: 120
    },
    {
      id: "logomark-white-dark",
      file: "../public/brand/logomark-white.svg",
      sha256: "REPLACE_WITH_APPROVED_ASSET_SHA256",
      variant: "Logomark White",
      allowedSurfaces: ["dark", "photographic-dark"],
      minimumClearSpaceRatio: 0.25,
      minimumRenderedWidth: 32
    }
  ],
  usages: [
    {
      context: "Social card light text panel",
      assetId: "primary-full-color-light",
      surface: "light",
      renderedWidth: 232,
      renderedHeight: 60,
      clearSpace: { top: 46, right: 488, bottom: 28, left: 58 }
    },
    {
      context: "Social card dark fallback panel",
      assetId: "logomark-white-dark",
      surface: "dark",
      renderedWidth: 198,
      renderedHeight: 220,
      clearSpace: { top: 132, right: 111, bottom: 278, left: 111 }
    }
  ]
};
