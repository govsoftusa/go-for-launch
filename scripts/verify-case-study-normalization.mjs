import { resolve } from "node:path";
import { auditCaseStudyDirectory } from "./lib/case-study-normalization.mjs";

const rootArgument = process.argv.find((argument) => argument.startsWith("--root="));
const root = resolve(rootArgument?.slice("--root=".length) || "case-studies");
const findings = auditCaseStudyDirectory(root);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
  }
  console.error(`Case study normalization failed with ${findings.length} finding(s).`);
  process.exitCode = 1;
} else {
  console.log("Case study normalization passed.");
}
