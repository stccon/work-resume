"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const url = require("url");
const pdf = require("./pdf-CmJE_qix.js");
const pdfExtractor = require("./pdf-extractor-DisjcOd6.js");
pdf.GlobalWorkerOptions.workerSrc = url.pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs")
).toString();
const CONFIDENCE_FONTS = 0.25;
const CONFIDENCE_FONT_SIZES = 0.2;
const CONFIDENCE_COLORS = 0.2;
const CONFIDENCE_LAYOUT = 0.15;
const CONFIDENCE_DECORATION = 0.1;
const CONFIDENCE_SECTION_TITLES = 0.1;
async function extractPdfTheme(filePath) {
  const style = await pdfExtractor.extractPdfStyle(filePath);
  const colors = await detectColors(filePath);
  const fonts = detectFonts(style);
  const typography = detectTypography(style);
  const layout = detectLayout(style);
  const decoration = detectDecoration(style);
  const sectionStyle = inferSectionStyle(decoration, layout);
  const sectionSizes = deriveSectionTitleSize(style, typography);
  const finalTypography = { ...typography, sectionTitleFontSize: sectionSizes };
  const confidence = computeConfidence({
    hasFonts: !!fonts.heading,
    hasFontSizes: style.fontSizes.length > 0,
    hasColors: colors._hasColors,
    hasLayout: layout._hasLayout,
    hasDecoration: decoration._hasDecoration,
    hasSectionTitles: sectionSizes._hasSectionTitles
  });
  const baseName = path.basename(filePath, path.extname(filePath)).replace(/[^\w\u4e00-\u9fa5\-]/g, "-").slice(0, 40);
  const hash = shortHash(JSON.stringify({
    fonts: style.fonts.slice(0, 5),
    sizes: style.fontSizes.slice(0, 8),
    colors: Object.values(colors).filter((_, i) => i < 8)
  }));
  return {
    name: `imported-${hash}`,
    label: `导入: ${baseName}`,
    description: `复刻自 ${path.basename(filePath)}，复刻度 ${Math.round(confidence * 100)}%`,
    layout: layout.layout,
    headerStyle: layout.headerStyle,
    sectionStyle,
    decorationStyle: decoration.style,
    colors: stripMeta(colors),
    fonts,
    typography: stripMeta(finalTypography),
    spacing: { pagePadding: "40px", sectionGap: "20px", entryGap: "10px" },
    borderRadius: "6px",
    sidebarWidth: "35%",
    isImported: true,
    importedFrom: path.basename(filePath),
    confidence,
    detectedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function detectColors(filePath, style) {
  var _a, _b, _c, _d;
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdf.getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise;
    const maxPage = Math.min(doc.numPages, 3);
    const colorCount = /* @__PURE__ */ new Map();
    let currentFill = null;
    for (let i = 1; i <= maxPage; i++) {
      const page = await doc.getPage(i);
      const opList = await page.getOperatorList();
      for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
        const fn = opList.fnArray[opIdx];
        const args = opList.argsArray[opIdx];
        if (fn === 19 || fn === 20) continue;
        if (fn === 21 && Array.isArray(args) && args.length === 1 && Array.isArray(args[0])) {
          currentFill = args[0];
        } else if (fn === 22 && Array.isArray(args) && args.length === 1 && Array.isArray(args[0])) {
          currentFill = args[0];
        } else if ((fn === 23 || fn === 24) && Array.isArray(args)) {
          currentFill = args;
        }
        if (currentFill && (fn === 28 || fn === 29 || fn === 31)) {
          const hex = rgbToHex(currentFill);
          if (hex) {
            colorCount.set(hex, (colorCount.get(hex) || 0) + 1);
          }
        }
      }
    }
    if (colorCount.size === 0) {
      return defaultColors();
    }
    const sorted = Array.from(colorCount.entries()).filter(([hex]) => !isNearWhite(hex) || colorCount.size < 3).sort((a, b) => b[1] - a[1]);
    const sortedAll = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1]);
    const mostFrequent = ((_a = sortedAll[0]) == null ? void 0 : _a[0]) ?? "#000000";
    const second = ((_b = sorted[1]) == null ? void 0 : _b[0]) ?? mostFrequent;
    const third = ((_c = sorted[2]) == null ? void 0 : _c[0]) ?? second;
    const fourth = ((_d = sorted[3]) == null ? void 0 : _d[0]) ?? third;
    const background = pickBackground(colorCount, mostFrequent);
    const text = pickText(colorCount, background);
    const primary = pickAccent(sorted, text, background);
    const primaryLight = mixColors(primary, background, 0.85);
    const border = fourth;
    const accent = primary;
    const divider = mixColors(text, background, 0.7);
    return {
      ...defaultColors(),
      text: text ?? "#1f2937",
      textMuted: mixColors(text ?? "#1f2937", background ?? "#ffffff", 0.4),
      primary: primary ?? "#1a56db",
      primaryLight,
      background: background ?? "#ffffff",
      border: border ?? "#e5e7eb",
      accent: accent ?? "#1a56db",
      divider,
      _hasColors: true
    };
  } catch {
    return defaultColors();
  }
}
function defaultColors() {
  return {
    text: "#1f2937",
    textMuted: "#6b7280",
    primary: "#1a56db",
    primaryLight: "#e8effd",
    background: "#ffffff",
    border: "#e5e7eb",
    accent: "#1a56db",
    divider: "#d1d5db",
    sidebarBg: "#f9fafb",
    sidebarText: "#1f2937",
    headerBg: "#1a56db",
    headerText: "#ffffff",
    sectionBg: "#f3f4f6",
    _hasColors: false
  };
}
function isNearWhite(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r > 248 && g > 248 && b > 248;
}
function isNearBlack(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r < 30 && g < 30 && b < 30;
}
function rgbToHex(c) {
  if (!Array.isArray(c) || c.length < 3) return null;
  if (c.length === 1) {
    const v = Math.round(c[0] * 255);
    return `#${[v, v, v].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  if (c.length >= 3) {
    const r = Math.round(Math.min(1, Math.max(0, c[0])) * 255);
    const g = Math.round(Math.min(1, Math.max(0, c[1])) * 255);
    const b = Math.round(Math.min(1, Math.max(0, c[2])) * 255);
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}
function pickBackground(count, mostFrequent) {
  if (isNearWhite(mostFrequent) || isNearBlack(mostFrequent)) {
    return mostFrequent;
  }
  for (const [hex] of count) {
    if (isNearWhite(hex)) return hex;
  }
  return "#ffffff";
}
function pickText(count, background) {
  for (const [hex] of count) {
    if (isNearBlack(hex) && hex !== background) return hex;
  }
  if (isNearBlack(background)) {
    for (const [hex] of count) {
      if (!isNearBlack(hex)) return hex;
    }
  }
  return null;
}
function pickAccent(sorted, text, background) {
  for (const [hex] of sorted) {
    if (hex === text || hex === background) continue;
    if (isNearWhite(hex) || isNearBlack(hex)) continue;
    return hex;
  }
  return null;
}
function mixColors(a, b, ratio) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar * (1 - ratio) + br * ratio);
  const g = Math.round(ag * (1 - ratio) + bg * ratio);
  const bl = Math.round(ab * (1 - ratio) + bb * ratio);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function detectFonts(style) {
  var _a, _b, _c;
  const fontCounts = /* @__PURE__ */ new Map();
  for (const item of style.items) {
    if (!item.fontName) continue;
    const clean = cleanFontName(item.fontName);
    if (!clean) continue;
    const weight = item.fontSize * (item.width || item.text.length || 1);
    fontCounts.set(clean, (fontCounts.get(clean) || 0) + weight);
  }
  const sorted = Array.from(fontCounts.entries()).sort((a, b) => b[1] - a[1]);
  const heading = ((_a = sorted[0]) == null ? void 0 : _a[0]) ?? "system-ui";
  const body = ((_b = sorted[1]) == null ? void 0 : _b[0]) ?? ((_c = sorted[0]) == null ? void 0 : _c[0]) ?? "system-ui";
  return { heading, body, mono: "ui-monospace" };
}
function cleanFontName(raw) {
  if (!raw) return "";
  const noSubset = raw.replace(/^[A-Z]{6}\+/, "");
  const noType = noSubset.replace(/-(Bold|Italic|Regular|Medium|Light|Heavy|Black)$/i, "");
  return noType.trim();
}
function detectTypography(style) {
  const sizes = style.fontSizes.filter((s) => s > 0).sort((a, b) => b - a);
  if (sizes.length === 0) {
    return {
      nameFontSize: "24px",
      titleFontSize: "14px",
      sectionTitleFontSize: "13px",
      bodyFontSize: "11px",
      lineHeight: "1.6"
    };
  }
  const name = sizes[0] ?? 24;
  const second = sizes[1] ?? sizes[0] ?? 14;
  const mid = sizes[Math.floor(sizes.length / 2)] ?? 12;
  const body = mid;
  return {
    nameFontSize: `${Math.max(18, Math.min(36, roundToHalf(name)))}px`,
    titleFontSize: `${Math.max(11, Math.min(20, roundToHalf(second)))}px`,
    sectionTitleFontSize: `${Math.max(11, Math.min(18, roundToHalf(second)))}px`,
    bodyFontSize: `${Math.max(9, Math.min(14, roundToHalf(body)))}px`,
    lineHeight: "1.6"
  };
}
function deriveSectionTitleSize(style, base) {
  const items = style.items;
  if (items.length === 0) return { ...base, _hasSectionTitles: false };
  const firstPageItems = items.filter((it) => it.pageIndex === 0);
  if (firstPageItems.length < 5) return { ...base, _hasSectionTitles: false };
  const sizes = firstPageItems.map((it) => it.fontSize).filter((s) => s > 0);
  if (sizes.length === 0) return { ...base, _hasSectionTitles: false };
  const median = pickMedian(sizes);
  const larger = sizes.filter((s) => s > median * 1.2 && s < median * 2.5);
  if (larger.length === 0) return { ...base, _hasSectionTitles: false };
  const sectionSize = larger.sort((a, b) => b - a)[Math.floor(larger.length / 2)] ?? median * 1.3;
  return {
    ...base,
    sectionTitleFontSize: `${Math.max(11, Math.min(18, roundToHalf(sectionSize)))}px`,
    _hasSectionTitles: true
  };
}
function pickMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function roundToHalf(n) {
  return Math.round(n * 2) / 2;
}
function detectLayout(style) {
  const firstPage = style.items.filter((it) => it.pageIndex === 0);
  if (firstPage.length < 5) return { layout: "single-column", headerStyle: "left", _hasLayout: false };
  const pageWidth = style.pageWidth || 612;
  const xs = firstPage.map((it) => it.x).filter((x) => x > 0);
  if (xs.length === 0) return { layout: "single-column", headerStyle: "left", _hasLayout: false };
  const leftGroup = xs.filter((x) => x < pageWidth * 0.45);
  const rightGroup = xs.filter((x) => x > pageWidth * 0.55);
  if (leftGroup.length > 5 && rightGroup.length > 5) {
    const isTwoCol = leftGroup.length + rightGroup.length > firstPage.length * 0.5;
    if (isTwoCol) {
      return { layout: "two-column", headerStyle: "left", _hasLayout: true };
    }
  }
  const firstItems = firstPage.slice(0, 3);
  const allCentered = firstItems.every((it, i) => {
    if (i === 0) return true;
    return Math.abs(it.x - firstItems[0].x) < 50;
  });
  const headerStyle = allCentered ? "centered" : "left";
  return { layout: "single-column", headerStyle, _hasLayout: true };
}
function detectDecoration(style) {
  if (style.items.length === 0) return { style: "line", _hasDecoration: false };
  const firstPage = style.items.filter((it) => it.pageIndex === 0);
  if (firstPage.length < 3) return { style: "line", _hasDecoration: false };
  const xs = firstPage.map((it) => it.x);
  const stddev = standardDeviation(xs);
  if (stddev > 100) return { style: "line", _hasDecoration: true };
  return { style: "line", _hasDecoration: true };
}
function standardDeviation(arr) {
  const n = arr.length;
  if (n === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}
function inferSectionStyle(deco, layout, style) {
  if (layout.layout === "two-column") return "card";
  if (deco.style === "dot") return "minimal";
  return "underlined";
}
function computeConfidence(m) {
  let s = 0;
  if (m.hasFonts) s += CONFIDENCE_FONTS;
  if (m.hasFontSizes) s += CONFIDENCE_FONT_SIZES;
  if (m.hasColors) s += CONFIDENCE_COLORS;
  if (m.hasLayout) s += CONFIDENCE_LAYOUT;
  if (m.hasDecoration) s += CONFIDENCE_DECORATION;
  if (m.hasSectionTitles) s += CONFIDENCE_SECTION_TITLES;
  return Math.min(1, s);
}
function shortHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).slice(0, 8);
}
function stripMeta(obj) {
  const copy = { ...obj };
  for (const k of Object.keys(copy)) {
    if (k.startsWith("_")) delete copy[k];
  }
  return copy;
}
exports.extractPdfTheme = extractPdfTheme;
