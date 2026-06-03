"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const url = require("url");
const pdf = require("./pdf-CmJE_qix.js");
pdf.GlobalWorkerOptions.workerSrc = url.pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs")
).toString();
async function extractPdfStyle(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdf.getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise;
  const allItems = [];
  const fontsSet = /* @__PURE__ */ new Set();
  const fontSizesSet = /* @__PURE__ */ new Set();
  let pageWidth = 0;
  let pageHeight = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pageWidth = viewport.width;
    pageHeight = viewport.height;
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item;
      const fontName = textItem.fontName || "";
      const fontSize = textItem.fontSize || 0;
      const transform = textItem.transform || [1, 0, 0, 1, 0, 0];
      fontsSet.add(fontName);
      if (fontSize > 0) fontSizesSet.add(Math.round(fontSize * 10) / 10);
      allItems.push({
        text: textItem.str,
        fontName,
        fontSize,
        x: transform[4],
        y: transform[5],
        width: textItem.width || 0,
        height: fontSize || 0,
        pageIndex: i - 1
      });
    }
  }
  const fontFrequency = {};
  for (const it of allItems) {
    if (!it.text) continue;
    fontFrequency[it.fontName] = (fontFrequency[it.fontName] || 0) + it.text.length;
  }
  let commonFontName = "";
  let maxCount = 0;
  for (const [name, count] of Object.entries(fontFrequency)) {
    if (count > maxCount) {
      maxCount = count;
      commonFontName = name;
    }
  }
  const allFontSizeZero = allItems.length > 0 && allItems.every((i) => i.fontSize === 0);
  const allFontsAnonymous = allItems.length > 0 && allItems.every((i) => /^g_d\d+_f\d+$/.test(i.fontName));
  const degraded = allFontSizeZero || allFontsAnonymous;
  return {
    pageCount: doc.numPages,
    pageWidth,
    pageHeight,
    items: allItems,
    fonts: Array.from(fontsSet),
    fontSizes: Array.from(fontSizesSet).sort((a, b) => a - b),
    degraded,
    fontFrequency,
    commonFontName
  };
}
function isBoldFont(fontName) {
  if (!fontName) return false;
  return /bold|black|heavy|-b-|\.bd/i.test(fontName);
}
const KNOWN_SECTION_TITLES = /* @__PURE__ */ new Set([
  "教育经历",
  "教育背景",
  "教育情况",
  "教育信息",
  "学历",
  "工作经历",
  "工作经验",
  "工作概要",
  "工作历史",
  "从业经历",
  "项目经历",
  "项目经验",
  "项目实践",
  "代表项目",
  "个人项目",
  "专业技能",
  "技能",
  "技术栈",
  "核心能力",
  "个人简介",
  "自我介绍",
  "个人优势",
  "核心竞争力",
  "个人特长",
  "自我评价",
  "证书",
  "资格证书",
  "认证",
  "获奖经历",
  "荣誉奖项",
  "奖项",
  "实习经历",
  "实习经验",
  "Education",
  "Work Experience",
  "Experience",
  "Projects",
  "Skills",
  "Summary",
  "Highlights",
  "Certifications",
  "Awards",
  "Honors",
  "Internship"
]);
const Y_TOLERANCE = 2;
const X_GAP_THRESHOLD = 40;
const COLUMN_MIN_GAP_ABS = 40;
const COLUMN_MIN_GAP_RATIO = 0.1;
function reconstructLines(items, yTolerance = Y_TOLERANCE, xGapThreshold = X_GAP_THRESHOLD, commonFontName) {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
    if (Math.abs(a.y - b.y) > yTolerance) return b.y - a.y;
    return a.x - b.x;
  });
  const yGroups = [];
  let currentGroup = [];
  let currentY = sorted[0].y;
  let currentPage = sorted[0].pageIndex;
  for (const item of sorted) {
    const sameY = item.pageIndex === currentPage && Math.abs(item.y - currentY) <= yTolerance;
    if (!sameY) {
      if (currentGroup.length > 0) yGroups.push(currentGroup);
      currentGroup = [];
      currentY = item.y;
      currentPage = item.pageIndex;
    }
    currentGroup.push(item);
  }
  if (currentGroup.length > 0) yGroups.push(currentGroup);
  const lines = [];
  for (const group of yGroups) {
    const sortedGroup = [...group].sort((a, b) => a.x - b.x);
    const clusters = [[sortedGroup[0]]];
    for (let i = 1; i < sortedGroup.length; i++) {
      const it = sortedGroup[i];
      const last = clusters[clusters.length - 1];
      const lastItem = last[last.length - 1];
      const prevEnd = lastItem.x + (lastItem.width || 0);
      if (it.x - prevEnd > xGapThreshold) {
        clusters.push([it]);
      } else {
        last.push(it);
      }
    }
    for (const cluster of clusters) {
      const text = cluster.map(
        (it, i) => i > 0 && it.x - cluster[i - 1].x > (cluster[i - 1].width || 4) * 1.2 ? " " + it.text : it.text
      ).join("").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const maxFontSize = cluster.reduce((m, it) => Math.max(m, it.fontSize), 0);
      const anyBold = cluster.some((it) => isBoldFont(it.fontName));
      const primaryFontName = cluster[0].fontName;
      const isCommonFont = commonFontName ? primaryFontName === commonFontName : void 0;
      const isShortLine = text.length <= 12 && !/[。！？，、；：.!?;:,]$/.test(text);
      lines.push({
        text,
        x: cluster[0].x,
        y: cluster[0].y,
        fontSize: maxFontSize,
        fontName: primaryFontName,
        isBold: anyBold,
        pageIndex: cluster[0].pageIndex,
        isCommonFont,
        isShortLine
      });
    }
  }
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const cur = lines[i];
    if (cur.pageIndex === prev.pageIndex) {
      cur.yGapBefore = Math.abs(cur.y - prev.y);
    } else {
      cur.yGapBefore = 0;
    }
  }
  if (lines.length > 0) lines[0].yGapBefore = 0;
  return lines;
}
function detectColumnBreaks(lines, minGapRatio = COLUMN_MIN_GAP_RATIO, minCount = 4) {
  if (lines.length < minCount * 2) return [];
  const xs = lines.map((l) => l.x).sort((a, b) => a - b);
  const maxX = xs[xs.length - 1];
  const minX = xs[0];
  const span = maxX - minX;
  if (span <= 0) return [];
  const minGap = Math.max(span * minGapRatio, COLUMN_MIN_GAP_ABS);
  const gaps = [];
  for (let i = 1; i < xs.length; i++) {
    const w = xs[i] - xs[i - 1];
    if (w >= minGap) {
      gaps.push({
        x: (xs[i - 1] + xs[i]) / 2,
        width: w,
        leftCount: i,
        rightCount: xs.length - i
      });
    }
  }
  const valid = gaps.filter((g) => g.leftCount >= minCount && g.rightCount >= minCount);
  if (valid.length === 0) return [];
  valid.sort((a, b) => b.width - a.width);
  const breaks = [];
  for (const g of valid) {
    if (breaks.every((b) => Math.abs(b - g.x) > minGap * 0.5)) {
      breaks.push(g.x);
    }
    if (breaks.length >= 2) break;
  }
  breaks.sort((a, b) => a - b);
  return breaks;
}
function assignColumn(lines, breaks) {
  if (breaks.length === 0) return [lines];
  const columns = breaks.map(() => []).concat([[]]);
  for (const line of lines) {
    let placed = false;
    for (let i = 0; i < breaks.length; i++) {
      if (line.x < breaks[i]) {
        columns[i].push(line);
        placed = true;
        break;
      }
    }
    if (!placed) columns[columns.length - 1].push(line);
  }
  return columns.filter((c) => c.length > 0);
}
function reconstructLinesPerPage(items, yTolerance = Y_TOLERANCE, commonFontName) {
  const pageMap = /* @__PURE__ */ new Map();
  for (const item of items) {
    const arr = pageMap.get(item.pageIndex) || [];
    arr.push(item);
    pageMap.set(item.pageIndex, arr);
  }
  const pages = [];
  const pageIndices = Array.from(pageMap.keys()).sort((a, b) => a - b);
  for (const idx of pageIndices) {
    const pageItems = pageMap.get(idx) || [];
    const lines = reconstructLines(pageItems, yTolerance, X_GAP_THRESHOLD, commonFontName);
    const breaks = detectColumnBreaks(lines);
    if (breaks.length > 0) {
      const columns = assignColumn(lines, breaks);
      const ordered = [];
      for (const col of columns) {
        const colSorted = [...col].sort((a, b) => b.y - a.y);
        ordered.push(...colSorted);
      }
      pages.push(ordered);
    } else {
      const sorted = [...lines].sort((a, b) => b.y - a.y);
      pages.push(sorted);
    }
  }
  return pages;
}
async function extractPdfLayout(filePath) {
  const style = await extractPdfStyle(filePath);
  const pages = reconstructLinesPerPage(style.items, Y_TOLERANCE, style.commonFontName);
  const allLines = pages.flat();
  const breaks = detectColumnBreaks(allLines);
  const rawLines = reconstructLines(style.items, Y_TOLERANCE, X_GAP_THRESHOLD, style.commonFontName);
  return {
    pages,
    pageCount: style.pageCount,
    pageWidth: style.pageWidth,
    pageHeight: style.pageHeight,
    columnBreaks: breaks.length > 0 ? breaks : void 0,
    degraded: style.degraded,
    commonFontName: style.commonFontName,
    rawLines
  };
}
exports.KNOWN_SECTION_TITLES = KNOWN_SECTION_TITLES;
exports.assignColumn = assignColumn;
exports.detectColumnBreaks = detectColumnBreaks;
exports.extractPdfLayout = extractPdfLayout;
exports.extractPdfStyle = extractPdfStyle;
exports.isBoldFont = isBoldFont;
exports.reconstructLines = reconstructLines;
exports.reconstructLinesPerPage = reconstructLinesPerPage;
