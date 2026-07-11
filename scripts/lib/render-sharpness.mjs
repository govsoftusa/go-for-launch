import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const markupExtensions = new Set([".astro", ".html", ".htm"]);
const systemFonts = new Set([
  "arial",
  "blinkmacsystemfont",
  "helvetica",
  "helvetica neue",
  "inherit",
  "initial",
  "monospace",
  "revert",
  "revert-layer",
  "sans-serif",
  "segoe ui",
  "serif",
  "system-ui",
  "unset",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif"
]);

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function normalizedFont(value) {
  return value
    .trim()
    .replace(/\s*!important\s*$/i, "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
}

function isIntentional(selector, body, intentionalSelectors = new Set()) {
  return /::?(before|after)\b/i.test(selector) ||
    intentionalSelectors.has(selector.trim()) ||
    /--render-sharpness-intent\s*:\s*intentional/i.test(body) ||
    /render-sharpness:\s*allow/i.test(body);
}

function isTransient(selector) {
  return /:(active|hover|focus|focus-visible|focus-within)\b/i.test(selector);
}

function isDecorativeTransformSelector(selector) {
  return /(?:\bsvg\b|\bicon\b|bullet|indicator|loader|pagination|progress(?:-bar|-ball)?|spinner|thumbnail|\bthumb\b|\btrack\b)/i.test(selector);
}

function unsafeTransform(value) {
  if (/\bscale(?:X|Y)?\((?!1(?:\.0+)?\b)[^)]+\)/i.test(value)) return true;

  for (const match of value.matchAll(/\btranslate(?:X|Y|3d)?\(([^)]+)\)/gi)) {
    const argumentsList = match[1].split(",").map((part) => part.trim());
    for (const argument of argumentsList) {
      if (/^-?\d+\.\d+px$/i.test(argument)) return true;
      if (/^-?\d*\.?\d+(?:em|rem|vw|vh|vmin|vmax|%)$/i.test(argument)) return true;
    }
  }

  return false;
}

function declaredFontFamilies(source) {
  const families = new Set();
  for (const match of source.matchAll(/@font-face\s*\{([^{}]*)\}/gi)) {
    const family = match[1].match(/font-family\s*:\s*([^;]+);?/i)?.[1];
    if (family) families.add(normalizedFont(family.split(",")[0]));
  }
  return families;
}

export function analyzeCss(source, file = "inline.css", sharedFontFaces = new Set()) {
  const findings = [];
  const fontFaces = new Set([...sharedFontFaces, ...declaredFontFamilies(source)]);
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const intentionalSelectors = new Set(
    [...source.matchAll(rulePattern)]
      .filter((match) => /--render-sharpness-intent\s*:\s*intentional/i.test(match[2]))
      .map((match) => match[1].trim())
  );

  for (const match of source.matchAll(rulePattern)) {
    const selector = match[1].trim();
    const body = match[2];
    const intentional = isIntentional(selector, body, intentionalSelectors);
    const transient = isTransient(selector);
    const ruleLine = lineNumber(source, match.index ?? 0);

    if (!intentional) {
      for (const property of ["backdrop-filter", "-webkit-backdrop-filter"]) {
        const declaration = body.match(new RegExp(`(?:^|;)\\s*${property.replace("-", "\\-")}\\s*:\\s*([^;]+)`, "i"));
        if (declaration && /blur\s*\(/i.test(declaration[1])) {
          findings.push({
            file,
            line: ruleLine,
            code: "content-backdrop-blur",
            selector,
            message: `${property} is applied directly to a content layer. Put blur on a decorative pseudo-element or use an opaque surface.`
          });
        }
      }

      const filter = body.match(/(?:^|;)\s*filter\s*:\s*([^;]+)/i);
      if (filter && /blur\s*\(/i.test(filter[1])) {
        findings.push({
          file,
          line: ruleLine,
          code: "content-filter-blur",
          selector,
          message: "A blur filter is applied directly to a content layer."
        });
      }

      const textShadow = body.match(/(?:^|;)\s*text-shadow\s*:\s*([^;]+)/i);
      if (textShadow && !/^(?:none|inherit|initial|revert|revert-layer|unset)$/i.test(textShadow[1].trim())) {
        findings.push({
          file,
          line: ruleLine,
          code: "blurred-text-shadow",
          selector,
          message: "Text shadow softens glyph edges. Mark it intentional or remove it from ordinary content."
        });
      }

      const transform = body.match(/(?:^|;)\s*transform\s*:\s*([^;]+)/i);
      if (!transient && !isDecorativeTransformSelector(selector) && transform && unsafeTransform(transform[1])) {
        findings.push({
          file,
          line: ruleLine,
          code: "fractional-content-transform",
          selector,
          message: "A persistent fractional transform can rasterize text between device pixels."
        });
      }

      const willChange = body.match(/(?:^|;)\s*will-change\s*:\s*([^;]+)/i);
      if (!transient && willChange && /\b(transform|filter|opacity)\b/i.test(willChange[1])) {
        findings.push({
          file,
          line: ruleLine,
          code: "permanent-compositor-layer",
          selector,
          message: "Permanent will-change can keep text on a rasterized compositor layer."
        });
      }
    }

    const smoothing = body.match(/(?:^|;)\s*-webkit-font-smoothing\s*:\s*([^;]+)/i);
    if (smoothing && smoothing[1].trim().toLowerCase() !== "auto") {
      findings.push({
        file,
        line: ruleLine,
        code: "forced-font-smoothing",
        selector,
        message: "Forced font smoothing can make text look thin or soft. Use the browser default."
      });
    }

    const textRendering = body.match(/(?:^|;)\s*text-rendering\s*:\s*([^;]+)/i);
    if (textRendering && textRendering[1].trim().toLowerCase() !== "auto") {
      findings.push({
        file,
        line: ruleLine,
        code: "forced-text-rendering",
        selector,
        message: "A forced text-rendering mode can vary by browser. Use auto for production UI text."
      });
    }

    if (!selector.startsWith("@font-face")) {
      const family = body.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1];
      if (family && !family.trim().startsWith("var(")) {
        const first = normalizedFont(family.split(",")[0]);
        if (!systemFonts.has(first) && !fontFaces.has(first)) {
          findings.push({
            file,
            line: ruleLine,
            code: "unshipped-font-family",
            selector,
            message: `The first-choice font, ${first}, has no matching font-face declaration in this stylesheet.`
          });
        }
      }
    }
  }

  return findings;
}

function fixRule(selector, body, intentionalSelectors) {
  if (isIntentional(selector, body, intentionalSelectors)) return body;

  let fixed = body
    .replace(/((?:^|;)\s*(?:-webkit-)?backdrop-filter\s*:)\s*[^;]+/gi, "$1 none")
    .replace(/((?:^|;)\s*filter\s*:)\s*[^;]*blur\s*\([^;]+/gi, "$1 none")
    .replace(/((?:^|;)\s*text-shadow\s*:)\s*[^;]+/gi, "$1 none")
    .replace(/((?:^|;)\s*-webkit-font-smoothing\s*:)\s*[^;]+/gi, "$1 auto")
    .replace(/((?:^|;)\s*text-rendering\s*:)\s*[^;]+/gi, "$1 auto");

  if (!isTransient(selector)) {
    fixed = fixed
      .replace(/((?:^|;)\s*will-change\s*:)\s*[^;]+/gi, "$1 auto")
      .replace(/((?:^|;)\s*transform\s*:)\s*([^;]+)/gi, (declaration, prefix, value) =>
        unsafeTransform(value) ? `${prefix} none` : declaration
      );
  }

  return fixed;
}

export function fixCss(source) {
  const intentionalSelectors = new Set(
    [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => /--render-sharpness-intent\s*:\s*intentional/i.test(match[2]))
      .map((match) => match[1].trim())
  );

  return source.replace(/([^{}]+)\{([^{}]*)\}/g, (fullRule, selector, body) => {
    void fullRule;
    return `${selector}{${fixRule(selector.trim(), body, intentionalSelectors)}}`;
  });
}

function parseAttribute(attributes, name) {
  return attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function isPixelAlignedScale(scale) {
  return [0.25, 0.5, 1, 2, 3, 4].some((allowed) => Math.abs(scale - allowed) < 0.0001);
}

export function analyzeMarkup(source, file = "inline.html") {
  const findings = [];

  for (const match of source.matchAll(/<svg\b([^>]*)>/gi)) {
    const attributes = match[1];
    if (/data-render-sharpness\s*=\s*["']allow["']/i.test(attributes)) continue;

    const widthAttribute = parseAttribute(attributes, "width");
    const heightAttribute = parseAttribute(attributes, "height");
    if (widthAttribute === null || heightAttribute === null) continue;

    const width = Number(widthAttribute);
    const height = Number(heightAttribute);
    const viewBox = parseAttribute(attributes, "viewBox")?.trim().split(/\s+/).map(Number);

    if (!Number.isFinite(width) || !Number.isFinite(height) || !viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
      continue;
    }

    const viewWidth = viewBox[2];
    const viewHeight = viewBox[3];
    const scaleX = width / viewWidth;
    const scaleY = height / viewHeight;

    if (Math.abs(scaleX - scaleY) > 0.0001 || !isPixelAlignedScale(scaleX)) {
      findings.push({
        file,
        line: lineNumber(source, match.index ?? 0),
        code: "fractional-inline-svg-scale",
        selector: "svg",
        message: `Inline SVG dimensions ${width} by ${height} fractionally scale a ${viewWidth} by ${viewHeight} viewBox.`
      });
    }
  }

  return findings;
}

function replaceAttribute(attributes, name, value) {
  const pattern = new RegExp(`(\\b${name}\\s*=\\s*["'])[^"']+(["'])`, "i");
  return attributes.replace(pattern, `$1${value}$2`);
}

export function fixMarkup(source) {
  return source.replace(/<svg\b([^>]*)>/gi, (tag, attributes) => {
    if (/data-render-sharpness\s*=\s*["']allow["']/i.test(attributes)) return tag;

    const widthAttribute = parseAttribute(attributes, "width");
    const heightAttribute = parseAttribute(attributes, "height");
    if (widthAttribute === null || heightAttribute === null) return tag;

    const width = Number(widthAttribute);
    const height = Number(heightAttribute);
    const viewBox = parseAttribute(attributes, "viewBox")?.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height) || !viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) return tag;

    const viewWidth = viewBox[2];
    const viewHeight = viewBox[3];
    const scaleX = width / viewWidth;
    const scaleY = height / viewHeight;
    if (Math.abs(scaleX - scaleY) <= 0.0001 && isPixelAlignedScale(scaleX)) return tag;

    let fixed = replaceAttribute(attributes, "width", viewWidth);
    fixed = replaceAttribute(fixed, "height", viewHeight);
    return `<svg${fixed}>`;
  });
}

export function collectSharpnessFiles(root) {
  const absoluteRoot = resolve(root);
  const files = [];

  function visit(path) {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        if (entry === "node_modules" || entry === ".git") continue;
        visit(join(path, entry));
      }
      return;
    }

    const extension = extname(path).toLowerCase();
    if (extension === ".css" || markupExtensions.has(extension)) files.push(path);
  }

  visit(absoluteRoot);
  return files;
}

export function runSharpnessAudit(root, { fix = false } = {}) {
  const files = collectSharpnessFiles(root);
  const fixedFiles = [];

  if (fix) {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const extension = extname(file).toLowerCase();
      const fixed = extension === ".css" ? fixCss(source) : fixMarkup(source);
      if (fixed !== source) {
        writeFileSync(file, fixed);
        fixedFiles.push(file);
      }
    }
  }

  const sharedFontFaces = new Set(
    files
      .filter((file) => extname(file).toLowerCase() === ".css")
      .flatMap((file) => [...declaredFontFamilies(readFileSync(file, "utf8"))])
  );

  const findings = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return extname(file).toLowerCase() === ".css"
      ? analyzeCss(source, file, sharedFontFaces)
      : analyzeMarkup(source, file);
  });

  return {
    gate: "render-sharpness",
    status: findings.length === 0 ? "passed" : "failed",
    blocking: findings.length > 0,
    root: resolve(root),
    scanned: {
      css: files.filter((file) => extname(file).toLowerCase() === ".css").length,
      markup: files.filter((file) => markupExtensions.has(extname(file).toLowerCase())).length
    },
    fixedFiles,
    findings
  };
}
