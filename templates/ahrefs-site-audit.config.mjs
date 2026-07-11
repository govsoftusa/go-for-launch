export default {
  output: "artifacts/ahrefs-site-audit-report.json",
  required: false,
  projectId: process.env.AHREFS_PROJECT_ID,
  apiKeyEnvironmentVariable: "AHREFS_API_KEY",
  endpoint: "https://api.ahrefs.com/v3/site-audit/issues",
  failOnImportance: ["Error", "Warning"],
  ignoredIssueIds: [],
  ignoredIssueNames: []
};
