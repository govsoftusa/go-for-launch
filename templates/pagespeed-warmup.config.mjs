export default {
  attempts: 2,
  requestTimeoutMs: 30_000,
  intervalMs: 250,
  report: "artifacts/pagespeed-warmup-report.json",
  targets: [
    {
      name: "protected candidate home",
      url: "https://candidate.example.com/?release-candidate=reviewed-candidate-id",
      expectedHostname: "candidate.example.com",
      expectedStatus: 200,
      expectedRelease: "reviewed-candidate-id",
      releaseHeader: "x-release-candidate",
      requiredBodyMarkers: ["Example publication"],
      forbiddenBodyMarkers: ["legacy application"],
      cache: {
        header: "x-document-cache",
        hitValues: ["HIT"],
      },
    },
  ],
};
