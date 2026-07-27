export default {
  rounds: 6,
  variants: ["unique", "clean"],
  initialDelayMs: 60_000,
  intervalMs: 5_000,
  requestTimeoutMs: 30_000,
  report: "artifacts/route-convergence-report.json",
  targets: [
    {
      name: "protected candidate",
      url: "https://candidate.example.com/",
      expectedHostname: "candidate.example.com",
      expectedRelease: "reviewed-candidate-id",
      requiredBodyMarkers: ["Example publication"],
      forbiddenBodyMarkers: ["wp-content"],
      robotsMode: "protected",
      edgeCacheMode: "no-store",
    },
    {
      name: "public canary",
      url: "https://www.example.com/",
      expectedHostname: "www.example.com",
      expectedRelease: "reviewed-candidate-id",
      requiredBodyMarkers: ["Example publication"],
      forbiddenBodyMarkers: ["wp-content"],
      robotsMode: "public",
      edgeCacheMode: "public",
      globalPing: {
        locations: [
          { country: "US", limit: 1 },
          { country: "GB", limit: 1 },
          { country: "JP", limit: 1 },
        ],
      },
    },
  ],
};
