export default {
  outputDirectory: "dist",
  report: "artifacts/visual-composition-report.json",
  screenshotDirectory: "artifacts/visual-composition",
  network: {
    policy: "block",
    maximumCompletedExternalRequests: 0
  },
  routes: ["/"],
  browsers: ["chromium", "webkit"],
  viewports: [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
    { name: "minimum", width: 320, height: 720 }
  ]
};
