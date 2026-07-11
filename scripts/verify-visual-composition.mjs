import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, webkit } from "@playwright/test";
import { analyzeVisualComposition } from "./lib/visual-composition.mjs";

const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...parts] = argument.replace(/^--/, "").split("=");
  return [key, parts.join("=")];
}));

const configPath = resolve(options.config || "visual-composition.config.mjs");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

let config;
try {
  config = (await import(`${pathToFileURL(configPath).href}?v=${Date.now()}`)).default;
} catch (error) {
  console.error(`Unable to load visual composition configuration at ${configPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const root = resolve(config.outputDirectory || "dist");
const reportPath = resolve(config.report || "artifacts/visual-composition-report.json");
const screenshotDirectory = resolve(config.screenshotDirectory || "artifacts/visual-composition");
const routes = config.routes || [];
const viewports = config.viewports || [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];
const engines = config.browsers || ["chromium", "webkit"];
const browserTypes = { chromium, webkit };

if (routes.length === 0) {
  console.error("Visual composition configuration must declare at least one route.");
  process.exit(1);
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
const records = [];
const failures = [];

function cleanName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home";
}

try {
  await mkdir(screenshotDirectory, { recursive: true });
  for (const engine of engines) {
    const browserType = browserTypes[engine];
    if (!browserType) throw new Error(`Unsupported browser engine: ${engine}`);
    const browser = await browserType.launch();
    try {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        try {
          for (const route of routes) {
            const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
            if (!response || response.status() !== 200) {
              failures.push(`${engine}/${viewport.name}${route}: expected HTTP 200.`);
              continue;
            }
            const artboards = await page.locator("[data-visual-artboard]").evaluateAll((elements) => elements.map((element, index) => {
              const rect = element.getBoundingClientRect();
              const box = (node, fallback) => {
                const nodeRect = node.getBoundingClientRect();
                return { name: node.getAttribute("data-visual-name") || fallback, left: nodeRect.left, top: nodeRect.top, width: nodeRect.width, height: nodeRect.height };
              };
              return {
                name: element.getAttribute("data-visual-name") || `artboard-${index + 1}`,
                artboard: { name: "artboard", left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                labels: [...element.querySelectorAll("[data-visual-label]")].map((node, labelIndex) => box(node, `label-${labelIndex + 1}`)),
                decorations: [...element.querySelectorAll("[data-visual-decoration]")].map((node, decorationIndex) => box(node, `decoration-${decorationIndex + 1}`)),
                thresholds: {
                  minimumHorizontalFill: Number(element.getAttribute("data-min-horizontal-fill") || "0.5"),
                  minimumVerticalFill: Number(element.getAttribute("data-min-vertical-fill") || "0.5"),
                  minimumEdgeInset: Number(element.getAttribute("data-min-edge-inset") || "0"),
                  maximumOverlapArea: Number(element.getAttribute("data-max-overlap-area") || "1")
                }
              };
            }));

            if (artboards.length === 0) {
              failures.push(`${engine}/${viewport.name}${route}: no data-visual-artboard region was found.`);
              continue;
            }

            for (let index = 0; index < artboards.length; index += 1) {
              const item = artboards[index];
              const analysis = analyzeVisualComposition({ ...item, ...item.thresholds });
              const record = { engine, viewport, route, artboard: item.name, ...analysis };
              records.push(record);
              for (const finding of analysis.findings) failures.push(`${engine}/${viewport.name}${route} ${item.name}: ${finding}`);
              const filename = `${cleanName(route)}-${cleanName(item.name)}-${engine}-${cleanName(viewport.name)}.png`;
              await page.locator("[data-visual-artboard]").nth(index).screenshot({ path: resolve(screenshotDirectory, filename) });
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

const report = { status: failures.length === 0 ? "passed" : "failed", root, routes, viewports, engines, records, failures };
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error("Visual composition verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(`Visual composition verification passed: ${records.length} artboard checks across ${engines.length} browser engines.`);
console.log(`Report: ${reportPath}`);
