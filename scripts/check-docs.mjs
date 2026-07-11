import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules"]);

function collectMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectMarkdown(path);
    }
    return extname(entry.name) === ".md" ? [path] : [];
  });
}

const failures = [];
const markdownFiles = collectMarkdown(root);

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  const fences = content.match(/^```/gm)?.length ?? 0;

  if (fences % 2 !== 0) {
    failures.push(`${file}: unbalanced fenced code blocks`);
  }

  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const destination = match[1].trim();
    if (
      !destination ||
      destination.startsWith("#") ||
      destination.startsWith("http://") ||
      destination.startsWith("https://") ||
      destination.startsWith("mailto:")
    ) {
      continue;
    }

    const relativePath = decodeURIComponent(destination.split("#", 1)[0]);
    const target = resolve(dirname(file), relativePath);
    if (!existsSync(target)) {
      failures.push(`${file}: missing linked file ${destination}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed for ${markdownFiles.length} Markdown files.`);
}

