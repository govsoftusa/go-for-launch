import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { chromium, webkit } from "@playwright/test";
import { readIndexablePages } from "./lib/html.mjs";
import { cleanArtifactName, fingerprintDifferences } from "./lib/interface-quality.mjs";

const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...parts] = argument.replace(/^--/, "").split("=");
  return [key, parts.join("=")];
}));

const configPath = resolve(options.config || "interface-quality.config.mjs");
let config;
try {
  config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
} catch (error) {
  console.error(`Unable to load interface quality configuration at ${configPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const root = resolve(config.outputDirectory || "dist");
const reportPath = resolve(config.report || "artifacts/interface-quality-report.json");
const screenshotDirectory = resolve(config.screenshotDirectory || "artifacts/interface-quality");
const routeRules = config.routes || [];
const viewports = config.viewports || [
  { name: "expanded", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "minimum", width: 320, height: 720 }
];
const engines = config.browsers || ["chromium", "webkit"];
const browserTypes = { chromium, webkit };
const differentiationBrowsers = new Set(config.differentiationBrowsers || ["chromium"]);
const differentiationViewports = new Set(config.differentiationViewports || ["expanded", "mobile"]);
const minimumDistinctiveDimensions = config.minimumDistinctiveDimensions ?? 2;
const overlapTolerance = config.overlapTolerance ?? 1;
const overflowTolerance = config.overflowTolerance ?? 1;
const screenshotMode = config.screenshots || "failures";
const failOnWarnings = config.failOnWarnings ?? false;
const controlSelector = config.controls?.selector || 'a[href], button, summary, input:not([type="hidden"]), textarea, select';
const targetSize = {
  enabled: config.controls?.targetSize?.enabled ?? true,
  minimumWidth: config.controls?.targetSize?.minimumWidth ?? 24,
  minimumHeight: config.controls?.targetSize?.minimumHeight ?? 24,
  severity: config.controls?.targetSize?.severity || "warning",
  ignoreSelectors: config.controls?.targetSize?.ignoreSelectors || []
};

const findings = [];
const records = [];
const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function addFinding(severity, code, message, details = {}) {
  findings.push({ severity, code, message, ...details });
}

function routePath(rule) {
  return rule.path || rule.route;
}

function normalizedSelectorList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

if (!Array.isArray(routeRules) || routeRules.length === 0) {
  throw new Error("Interface quality configuration must declare at least one route.");
}
if (!Number.isInteger(minimumDistinctiveDimensions) || minimumDistinctiveDimensions < 1 || minimumDistinctiveDimensions > 5) {
  throw new Error("minimumDistinctiveDimensions must be an integer from 1 through 5.");
}
if (!["error", "warning"].includes(targetSize.severity)) {
  throw new Error("The target-size severity must be error or warning.");
}
if (!["all", "failures", "none"].includes(screenshotMode)) {
  throw new Error("screenshots must be all, failures, or none.");
}

const configuredPaths = new Set();
for (const rule of routeRules) {
  const path = routePath(rule);
  if (!path || !path.startsWith("/")) addFinding("error", "route-path-invalid", "Every route contract needs an absolute path.", { route: path || "" });
  if (configuredPaths.has(path)) addFinding("error", "route-duplicate", `The route ${path} appears more than once.`, { route: path });
  configuredPaths.add(path);
  for (const field of ["family", "archetype", "purpose", "contentRhythm", "visualIdentity"]) {
    if (!String(rule[field] || "").trim()) addFinding("error", `route-${field}-missing`, `${path} does not define ${field}.`, { route: path });
  }
  if (normalizedSelectorList(rule.distinctiveSelectors).length === 0) {
    addFinding("error", "distinctive-selector-missing", `${path} does not declare a distinctive selector.`, { route: path });
  }
}

for (let firstIndex = 0; firstIndex < routeRules.length; firstIndex += 1) {
  const first = routeRules[firstIndex];
  for (let secondIndex = firstIndex + 1; secondIndex < routeRules.length; secondIndex += 1) {
    const second = routeRules[secondIndex];
    if (first.family !== second.family && first.archetype === second.archetype) {
      addFinding("error", "archetype-reused-across-families", `${routePath(first)} and ${routePath(second)} use the same archetype across different route families.`, {
        route: routePath(first),
        relatedRoute: routePath(second),
        archetype: first.archetype
      });
    }
  }
}

const indexablePages = await readIndexablePages(root);
if (config.requireIndexableCoverage ?? true) {
  for (const page of indexablePages) {
    if (!configuredPaths.has(page.route) && !(config.exemptRoutes || []).includes(page.route)) {
      addFinding("error", "indexable-route-uncovered", `${page.route} is indexable but has no interface quality route contract.`, { route: page.route });
    }
  }
}

async function fileForRequest(requestPath) {
  let pathname = decodeURIComponent(new URL(requestPath, "http://localhost").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  let path = resolve(root, `.${pathname}`);
  if (!path.startsWith(`${root}${sep}`) && path !== root) return null;
  try {
    if ((await stat(path)).isFile()) return path;
  } catch {}
  if (!extname(pathname)) {
    path = resolve(root, `.${pathname}/index.html`);
    try {
      if ((await stat(path)).isFile()) return path;
    } catch {}
  }
  return null;
}

const server = createServer(async (request, response) => {
  const path = await fileForRequest(request.url || "/");
  if (!path) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": contentTypes.get(extname(path)) || "application/octet-stream" });
  response.end(await readFile(path));
});

await new Promise((resolveListening) => server.listen(0, "127.0.0.1", resolveListening));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  if (screenshotMode !== "none") await mkdir(screenshotDirectory, { recursive: true });
  for (const engine of engines) {
    const browserType = browserTypes[engine];
    if (!browserType) throw new Error(`Unsupported browser engine: ${engine}`);
    const browser = await browserType.launch();
    try {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        try {
          for (const rule of routeRules) {
            const route = routePath(rule);
            const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
            if (!response || response.status() !== 200) {
              addFinding("error", "route-render-failed", `${engine}/${viewport.name}${route} did not return HTTP 200.`, { engine, viewport: viewport.name, route });
              continue;
            }

            const measurement = await page.evaluate(({ rule, controlSelector, targetSize, overlapTolerance, overflowTolerance, headerContract }) => {
              const viewportWidth = document.documentElement.clientWidth;
              const viewportHeight = window.innerHeight;
              const rectValue = (rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom });
              const label = (element) => element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName.toLowerCase();
              const visible = (element) => {
                const closedDetails = element.closest("details:not([open])");
                if (closedDetails) {
                  const summary = closedDetails.querySelector(":scope > summary");
                  if (!summary || (element !== summary && !summary.contains(element))) return false;
                }
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const nativeVisible = typeof element.checkVisibility !== "function" || element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
                return nativeVisible && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
              };
              const controls = [...document.querySelectorAll(controlSelector)].filter(visible).map((element) => {
                const style = getComputedStyle(element);
                return {
                  element,
                  label: label(element),
                  rect: rectValue(element.getBoundingClientRect()),
                  fragments: [...element.getClientRects()].map(rectValue),
                  display: style.display,
                  overflowX: style.overflowX,
                  overflowY: style.overflowY,
                  clippedX: element.scrollWidth > element.clientWidth + overflowTolerance,
                  clippedY: element.scrollHeight > element.clientHeight + overflowTolerance,
                  ignoredTargetSize: targetSize.ignoreSelectors.some((selector) => element.matches(selector))
                };
              });
              const issues = [];
              const warn = [];
              const overlaps = (first, second) => first.fragments.some((firstFragment) => second.fragments.some((secondFragment) => {
                const overlapX = Math.min(firstFragment.right, secondFragment.right) - Math.max(firstFragment.left, secondFragment.left);
                const overlapY = Math.min(firstFragment.bottom, secondFragment.bottom) - Math.max(firstFragment.top, secondFragment.top);
                return overlapX > overlapTolerance && overlapY > overlapTolerance;
              }));

              const horizontalOverflow = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - viewportWidth;
              if (horizontalOverflow > overflowTolerance) issues.push({ code: "horizontal-overflow", message: `Document exceeds the viewport by ${Math.round(horizontalOverflow)} pixels.` });

              for (const control of controls) {
                if (control.fragments.some((fragment) => fragment.left < -overflowTolerance || fragment.right > viewportWidth + overflowTolerance)) {
                  issues.push({ code: "control-outside-viewport", message: `${control.label} leaves the horizontal viewport.` });
                }
                if (control.display !== "inline" && ((control.clippedX && ["hidden", "clip"].includes(control.overflowX)) || (control.clippedY && ["hidden", "clip"].includes(control.overflowY)))) {
                  issues.push({ code: "control-clipped", message: `${control.label} clips its rendered content.` });
                }
                if (targetSize.enabled && control.display !== "inline" && !control.ignoredTargetSize && (control.rect.width < targetSize.minimumWidth || control.rect.height < targetSize.minimumHeight)) {
                  const targetIssue = { code: "target-size-small", message: `${control.label} measures ${Math.round(control.rect.width)} by ${Math.round(control.rect.height)} pixels.` };
                  (targetSize.severity === "error" ? issues : warn).push(targetIssue);
                }
              }

              for (let firstIndex = 0; firstIndex < controls.length; firstIndex += 1) {
                const first = controls[firstIndex];
                for (let secondIndex = firstIndex + 1; secondIndex < controls.length; secondIndex += 1) {
                  const second = controls[secondIndex];
                  if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
                  if (overlaps(first, second)) issues.push({ code: "controls-overlap", message: `${first.label} overlaps ${second.label}.` });
                }
              }

              const archetypeRoots = [...document.querySelectorAll("[data-page-archetype]")].filter(visible);
              if (archetypeRoots.length !== 1) {
                issues.push({ code: "archetype-marker-count", message: `Expected one visible data-page-archetype marker, found ${archetypeRoots.length}.` });
              } else if (archetypeRoots[0].getAttribute("data-page-archetype") !== rule.archetype) {
                issues.push({ code: "archetype-marker-mismatch", message: `Rendered archetype ${archetypeRoots[0].getAttribute("data-page-archetype")} does not match ${rule.archetype}.` });
              }

              for (const selector of [...(rule.requiredSelectors || []), ...(rule.distinctiveSelectors || [])]) {
                const elements = [...document.querySelectorAll(selector)].filter(visible);
                if (elements.length === 0) issues.push({ code: "required-selector-missing", message: `No visible element matches ${selector}.` });
              }

              if (rule.hero) {
                const hero = document.querySelector(rule.hero.selector);
                if (!hero || !visible(hero)) {
                  issues.push({ code: "hero-missing", message: `No visible hero matches ${rule.hero.selector}.` });
                } else {
                  const heroRect = hero.getBoundingClientRect();
                  const ratio = heroRect.height / viewportHeight;
                  if (Number.isFinite(rule.hero.maximumViewportHeightRatio) && ratio > rule.hero.maximumViewportHeightRatio) {
                    issues.push({ code: "hero-too-tall", message: `Hero uses ${(ratio * 100).toFixed(1)}% of the viewport height, maximum is ${(rule.hero.maximumViewportHeightRatio * 100).toFixed(1)}%.` });
                  }
                  if (rule.hero.nextContentSelector && Number.isFinite(rule.hero.minimumNextContentPixels)) {
                    const next = document.querySelector(rule.hero.nextContentSelector);
                    if (!next || !visible(next)) {
                      issues.push({ code: "next-content-missing", message: `No visible next-content region matches ${rule.hero.nextContentSelector}.` });
                    } else {
                      const nextRect = next.getBoundingClientRect();
                      const visiblePixels = Math.max(0, Math.min(viewportHeight, nextRect.bottom) - Math.max(0, nextRect.top));
                      if (visiblePixels < rule.hero.minimumNextContentPixels) {
                        issues.push({ code: "next-content-below-fold", message: `Only ${Math.round(visiblePixels)} pixels of the next content region are visible, minimum is ${rule.hero.minimumNextContentPixels}.` });
                      }
                    }
                  }
                }
              }

              if (headerContract?.selector) {
                const header = document.querySelector(headerContract.selector);
                if (!header || !visible(header)) {
                  issues.push({ code: "site-header-missing", message: `No visible header matches ${headerContract.selector}.` });
                } else if (Number.isFinite(headerContract.maximumViewportHeightRatio)) {
                  const ratio = header.getBoundingClientRect().height / viewportHeight;
                  if (ratio > headerContract.maximumViewportHeightRatio) {
                    issues.push({ code: "site-header-too-tall", message: `Header uses ${(ratio * 100).toFixed(1)}% of the viewport height, maximum is ${(headerContract.maximumViewportHeightRatio * 100).toFixed(1)}%.` });
                  }
                }
              }

              for (const contract of rule.clearance || []) {
                const from = [...document.querySelectorAll(contract.from)].find(visible);
                const to = [...document.querySelectorAll(contract.to)].find(visible);
                if (!from || !to) {
                  issues.push({ code: "clearance-selector-missing", message: `${contract.name || "Clearance rule"} could not find both ${contract.from} and ${contract.to}.` });
                  continue;
                }
                const fromRect = from.getBoundingClientRect();
                const toRect = to.getBoundingClientRect();
                const horizontalIntersection = Math.min(fromRect.right, toRect.right) - Math.max(fromRect.left, toRect.left);
                if (contract.requireHorizontalIntersection !== false && horizontalIntersection <= 0) continue;
                const gap = toRect.top - fromRect.bottom;
                if (gap < contract.minimum) {
                  issues.push({ code: "clearance-too-small", message: `${contract.name || "Clearance rule"} has ${Math.round(gap)} pixels of clearance, minimum is ${contract.minimum}.` });
                }
              }

              const main = document.querySelector("main") || document.body;
              const mainStyle = getComputedStyle(main);
              const children = [...main.children].filter((element) => visible(element)).slice(0, 16);
              const backgroundValues = [main, ...children].map((element) => getComputedStyle(element).backgroundColor).filter((value) => value && value !== "rgba(0, 0, 0, 0)");
              const heading = main.querySelector("h1");
              const headingStyle = heading ? getComputedStyle(heading) : null;
              const fingerprint = {
                structure: children.map((element) => `${element.tagName.toLowerCase()}:${getComputedStyle(element).display}`),
                layout: [
                  `${mainStyle.display}:${mainStyle.gridTemplateColumns}:${mainStyle.flexDirection}`,
                  ...children.map((element) => {
                    const style = getComputedStyle(element);
                    return `${style.display}:${style.gridTemplateColumns}:${style.flexDirection}:${style.position}`;
                  })
                ],
                palette: [...new Set(backgroundValues)].sort(),
                typography: headingStyle ? [headingStyle.fontFamily, headingStyle.fontSize, headingStyle.fontWeight, headingStyle.lineHeight, headingStyle.textAlign] : [],
                media: {
                  images: main.querySelectorAll("img").length,
                  figures: main.querySelectorAll("figure").length,
                  videos: main.querySelectorAll("video").length,
                  forms: main.querySelectorAll("form").length,
                  backgroundImages: [main, ...children].filter((element) => getComputedStyle(element).backgroundImage !== "none").length
                }
              };

              return { issues, warnings: warn, horizontalOverflow, controlCount: controls.length, fingerprint };
            }, {
              rule,
              controlSelector,
              targetSize,
              overlapTolerance,
              overflowTolerance,
              headerContract: config.header || null
            });

            const record = { engine, viewport, route, family: rule.family, archetype: rule.archetype, ...measurement };
            records.push(record);
            for (const issue of measurement.issues) addFinding("error", issue.code, `${engine}/${viewport.name}${route}: ${issue.message}`, { engine, viewport: viewport.name, route });
            for (const warning of measurement.warnings) addFinding("warning", warning.code, `${engine}/${viewport.name}${route}: ${warning.message}`, { engine, viewport: viewport.name, route });

            const shouldCapture = screenshotMode === "all" || (screenshotMode === "failures" && (measurement.issues.length > 0 || measurement.warnings.length > 0));
            if (shouldCapture) {
              await page.screenshot({ path: resolve(screenshotDirectory, `${cleanArtifactName(route)}-${engine}-${cleanArtifactName(viewport.name)}.png`), fullPage: true });
            }
          }
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
}

const differentiation = [];
for (const engine of differentiationBrowsers) {
  for (const viewport of differentiationViewports) {
    const candidates = records.filter((record) => record.engine === engine && record.viewport.name === viewport);
    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      const first = candidates[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const second = candidates[secondIndex];
        if (first.family === second.family) continue;
        const differences = fingerprintDifferences(first.fingerprint, second.fingerprint);
        const item = { engine, viewport, firstRoute: first.route, secondRoute: second.route, firstFamily: first.family, secondFamily: second.family, differences };
        differentiation.push(item);
        if (differences.length < minimumDistinctiveDimensions) {
          addFinding("error", "route-families-too-similar", `${engine}/${viewport} ${first.route} and ${second.route} differ in ${differences.length} measured design dimensions, minimum is ${minimumDistinctiveDimensions}.`, item);
        }
      }
    }
  }
}

const counts = {
  routes: routeRules.length,
  viewports: viewports.length,
  browsers: engines.length,
  checks: records.length,
  errors: findings.filter((item) => item.severity === "error").length,
  warnings: findings.filter((item) => item.severity === "warning").length
};
const report = {
  gate: "interface quality and page differentiation",
  generatedAt: new Date().toISOString(),
  status: counts.errors === 0 && (!failOnWarnings || counts.warnings === 0) ? "passed" : "failed",
  root,
  viewports,
  engines,
  minimumDistinctiveDimensions,
  counts,
  records,
  differentiation,
  findings
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

for (const item of findings) console.error(`${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
console.log(`Interface quality: ${counts.routes} routes, ${counts.checks} browser and viewport checks, ${counts.errors} errors, ${counts.warnings} warnings.`);
console.log(`Report: ${reportPath}`);
if (report.status === "failed") process.exitCode = 1;
