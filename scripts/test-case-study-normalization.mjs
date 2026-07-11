import assert from "node:assert/strict";
import { auditCaseStudy, REVIEW_MARKER } from "./lib/case-study-normalization.mjs";

function document(body = "A representative Astro site used https://www.example.com and the Cloudflare documentation at https://developers.cloudflare.com/workers/.") {
  return `# Generic Technical Incident\n\n${REVIEW_MARKER}\n\n${body}\n`;
}

function rulesFor(content, fileName = "generic-technical-incident.md") {
  return new Set(auditCaseStudy({ content, fileName }).map((finding) => finding.rule));
}

assert.deepEqual([...rulesFor(document())], []);
assert(rulesFor("# Missing Review\n\nNo marker.\n").has("review-marker"));
assert(rulesFor(document("Contact person@example-client.com.")).has("email-address"));
assert(rulesFor(document("The live site was https://client-project.com.")).has("public-host"));
assert(rulesFor(document("The checkout was /Users/person/Dev/client-project.")).has("personal-path"));
assert(rulesFor(document("Deployment 2f1c8f32-3e79-4a7d-9ed3-c27c11a741ea was tested.")).has("uuid"));
assert(rulesFor(document("Asset hash a681654095caeef08db3c34a030b3bea was tested.")).has("long-identifier"));
assert(rulesFor(document("Human reviewer: A Named Person")).has("person-name"));
assert(!rulesFor(document("Human reviewer: Project owner")).has("person-name"));
assert(rulesFor(document("Worker name: client-production-worker")).has("infrastructure-metadata"));
assert(rulesFor(document(), "Client Project.md").has("generic-filename"));
assert(rulesFor(document("Open https://example.com/?access_token=private-value.")).has("token-bearing-url"));

console.log("Case study normalization verifier fixtures passed.");
