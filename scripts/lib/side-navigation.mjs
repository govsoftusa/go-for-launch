import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { load } from "cheerio";

function collectHtmlFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path);
    }
  }

  return files;
}

function routeForFile(root, file) {
  const path = relative(root, file).split(sep).join("/");
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"/index.html".length)}/`;
  return `/${path.slice(0, -".html".length)}`;
}

function normalizeRoute(pathname) {
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function attributeSelector(name, value) {
  return `[${name}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"]`;
}

export function auditSideNavigation(root, { requireNavigation = false } = {}) {
  const directory = resolve(root);
  const files = collectHtmlFiles(directory);
  const pageFiles = new Map(
    files.map((file) => [normalizeRoute(routeForFile(directory, file)), file])
  );
  const destinationDocuments = new Map();
  const findings = [];
  let navigationCount = 0;
  let itemCount = 0;

  for (const file of files) {
    const route = normalizeRoute(routeForFile(directory, file));
    const document = load(readFileSync(file, "utf8"));
    const relativeFile = relative(directory, file).split(sep).join("/");

    document("[data-side-navigation]").each((navigationIndex, navigation) => {
      navigationCount += 1;
      const container = document(navigation);
      const role = container.attr("role");
      if (navigation.tagName !== "nav" && role !== "tablist" && role !== "navigation") {
        findings.push({
          file: relativeFile,
          code: "SIDE_NAV_CONTAINER_SEMANTICS",
          message: `Side navigation ${navigationIndex + 1} must use a nav element or an explicit navigation or tablist role.`
        });
      }

      const items = container.find("[data-side-navigation-item]");
      if (items.length < 2) {
        findings.push({
          file: relativeFile,
          code: "SIDE_NAV_ITEM_COUNT",
          message: `Side navigation ${navigationIndex + 1} must contain at least two marked items.`
        });
      }

      items.each((itemIndex, item) => {
        itemCount += 1;
        const element = document(item);
        const label = (element.attr("aria-label") || element.text()).replace(/\s+/g, " ").trim();
        const href = element.attr("href")?.trim() || "";

        if (item.tagName !== "a") {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_NATIVE_LINK",
            message: `Side navigation item ${itemIndex + 1} must be an anchor so it works without client JavaScript.`
          });
          return;
        }

        if (!label) {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_ACCESSIBLE_NAME",
            message: `Side navigation item ${itemIndex + 1} has no accessible name.`
          });
        }

        if (!href || href === "#" || href.startsWith("javascript:")) {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_DESTINATION",
            message: `Side navigation item ${itemIndex + 1} must have a real destination.`
          });
          return;
        }

        const controls = element.attr("aria-controls");
        if (controls && document(attributeSelector("id", controls)).length !== 1) {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_CONTROL_TARGET",
            message: `Side navigation item ${itemIndex + 1} references missing panel #${controls}.`
          });
        }

        let destination;
        try {
          destination = new URL(href, `https://example.test${route}`);
        } catch {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_DESTINATION",
            message: `Side navigation item ${itemIndex + 1} has an invalid destination.`
          });
          return;
        }

        if (destination.origin !== "https://example.test") return;

        const destinationRoute = normalizeRoute(destination.pathname);
        const destinationFile = pageFiles.get(destinationRoute);
        if (!destinationFile) {
          findings.push({
            file: relativeFile,
            code: "SIDE_NAV_ROUTE_TARGET",
            message: `Side navigation item ${itemIndex + 1} points to missing built route ${destinationRoute}.`
          });
          return;
        }

        if (destination.hash) {
          const id = decodeURIComponent(destination.hash.slice(1));
          let destinationDocument = document;
          if (destinationRoute !== route) {
            destinationDocument = destinationDocuments.get(destinationRoute);
            if (!destinationDocument) {
              destinationDocument = load(readFileSync(destinationFile, "utf8"));
              destinationDocuments.set(destinationRoute, destinationDocument);
            }
          }
          if (!id || destinationDocument(attributeSelector("id", id)).length !== 1) {
            findings.push({
              file: relativeFile,
              code: "SIDE_NAV_HASH_TARGET",
              message: `Side navigation item ${itemIndex + 1} points to missing target ${destination.hash}.`
            });
          }
        }
      });
    });
  }

  if (requireNavigation && navigationCount === 0) {
    findings.push({
      file: ".",
      code: "SIDE_NAV_REQUIRED",
      message: "No data-side-navigation regions were found in the production build."
    });
  }

  return {
    root: directory,
    scanned: { pages: files.length, navigations: navigationCount, items: itemCount },
    findings
  };
}
