import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

export const REVIEW_MARKER = "<!-- case-study-normalization-reviewed -->";

const approvedHosts = new Set([
  "developer.apple.com",
  "developers.cloudflare.com",
  "developers.openai.com",
  "docs.astro.build",
  "docs.perplexity.ai",
  "pages.dev",
  "playwright.dev",
  "support.claude.com",
  "webkit.org",
  "www.googleapis.com",
]);

const metadataLabels = [
  "account id",
  "approved review candidate",
  "database id",
  "database name",
  "deployment id",
  "project id",
  "promoted staging candidate",
  "r2 bucket",
  "service account",
  "worker name",
  "zone id",
];

const neutralMetadataValues = /\b(?:configured through|deployment environment|generic|normalized|placeholder|project owner|redacted|representative|role withheld)\b/i;

function lineNumberAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

function addMatches(findings, content, expression, rule, message, predicate = () => true) {
  for (const match of content.matchAll(expression)) {
    if (!predicate(match)) continue;
    findings.push({
      rule,
      line: lineNumberAt(content, match.index ?? 0),
      message,
    });
  }
}

function isApprovedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "example.com" ||
    host.endsWith(".example.com") ||
    approvedHosts.has(host) ||
    [...approvedHosts].some((approved) => host.endsWith(`.${approved}`))
  );
}

function inspectHosts(findings, content) {
  const seen = new Set();
  const urlExpression = /https?:\/\/[^\s<>)\]"'`]+/gi;

  for (const match of content.matchAll(urlExpression)) {
    const raw = match[0].replace(/[.,;:]+$/, "");
    try {
      const url = new URL(raw);
      if (isApprovedHost(url.hostname)) continue;
      const key = `${match.index}:${url.hostname}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        rule: "public-host",
        line: lineNumberAt(content, match.index ?? 0),
        message: `replace nonapproved public host ${url.hostname} with an approved example host`,
      });
    } catch {
      findings.push({
        rule: "public-host",
        line: lineNumberAt(content, match.index ?? 0),
        message: "replace or correct the unparseable public URL",
      });
    }
  }

  const bareHostExpression = /\b(?:[a-z0-9](?:[a-z0-9-]{0,62})\.)+(?:ai|cloud|co|com|dev|gov|io|net|org|site|tech|us)\b/gi;
  for (const match of content.matchAll(bareHostExpression)) {
    const host = match[0].toLowerCase();
    if (isApprovedHost(host)) continue;
    const index = match.index ?? 0;
    const key = `${index}:${host}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      rule: "public-host",
      line: lineNumberAt(content, index),
      message: `replace nonapproved public host ${host} with an approved example host`,
    });
  }
}

export function auditCaseStudy({ content, fileName }) {
  const findings = [];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(fileName)) {
    findings.push({
      rule: "generic-filename",
      line: 1,
      message: "use a lowercase generic kebab-case Markdown filename",
    });
  }

  const lines = content.split("\n");
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
  const markerIndex = lines.findIndex((line) => line.trim() === REVIEW_MARKER);
  if (titleIndex < 0 || markerIndex !== titleIndex + 2 || lines[titleIndex + 1]?.trim() !== "") {
    findings.push({
      rule: "review-marker",
      line: Math.max(1, titleIndex + 1),
      message: `place ${REVIEW_MARKER} immediately after the title and one blank line`,
    });
  }

  addMatches(
    findings,
    content,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "email-address",
    "replace personal or organization email addresses with a neutral description",
  );
  addMatches(
    findings,
    content,
    /(?:\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/g,
    "personal-path",
    "replace personal filesystem paths with repository-relative placeholders",
  );
  addMatches(
    findings,
    content,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    "uuid",
    "remove UUIDs and deployment identifiers",
  );
  addMatches(
    findings,
    content,
    /\b[0-9a-f]{32,}\b/gi,
    "long-identifier",
    "remove long hashes and correlatable infrastructure identifiers",
  );
  addMatches(
    findings,
    content,
    /[?&](?:access_token|api[_-]?key|auth|credential|key|secret|sig|signature|token)=([^\s&#]+)/gi,
    "token-bearing-url",
    "remove token-bearing URL parameters",
  );

  for (const label of metadataLabels) {
    const expression = new RegExp(`^\\s*(?:[-*]\\s*)?${label.replaceAll(" ", "\\s+")}\\s*:\\s*(.+)$`, "gim");
    addMatches(
      findings,
      content,
      expression,
      "infrastructure-metadata",
      `remove or neutralize the ${label} field`,
      (match) => !neutralMetadataValues.test(match[1]),
    );
  }

  addMatches(
    findings,
    content,
    /^\s*(?:[-*]\s*)?human reviewer\s*:\s*(.+)$/gim,
    "person-name",
    "replace the human reviewer name with a neutral role",
    (match) => !neutralMetadataValues.test(match[1]),
  );

  inspectHosts(findings, content);

  return findings;
}

export function auditCaseStudyDirectory(directory) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name) !== ".md") continue;
    const path = join(directory, entry.name);
    const content = readFileSync(path, "utf8");
    for (const finding of auditCaseStudy({ content, fileName: basename(path) })) {
      results.push({
        file: relative(directory, path),
        ...finding,
      });
    }
  }
  return results;
}
