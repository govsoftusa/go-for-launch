import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

export async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(path)));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

export function attributes(tag) {
  const values = new Map();
  const body = tag.replace(/^<\/?[^\s>]+/i, "").replace(/\/?\s*>$/, "");
  for (const match of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    values.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return values;
}

export function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => ({
    raw: match[0],
    attributes: attributes(match[0])
  }));
}

export function hasRel(tag, value) {
  return (tag.attributes.get("rel") || "").toLowerCase().split(/\s+/).includes(value);
}

export function isNoIndex(html) {
  return tags(html, "meta").some((tag) =>
    tag.attributes.get("name")?.toLowerCase() === "robots" &&
    /(?:^|,)\s*noindex\b/i.test(tag.attributes.get("content") || "")
  );
}

export function routeFromHtmlFile(root, file) {
  const name = relative(root, file).split("\\").join("/");
  if (name === "index.html") return "/";
  if (name.endsWith("/index.html")) return `/${name.slice(0, -"index.html".length)}`;
  return `/${name}`;
}

export function textContent(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readIndexablePages(root) {
  const pages = [];
  for (const file of await collectHtmlFiles(root)) {
    const name = relative(root, file).split("\\").join("/");
    if (/^(?:404|500)\.html$/i.test(name)) continue;
    const html = await readFile(file, "utf8");
    if (!isNoIndex(html)) pages.push({ file, name, route: routeFromHtmlFile(root, file), html });
  }
  return pages;
}
