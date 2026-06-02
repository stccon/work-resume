"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const url = require("url");
const pdf = require("./pdf-CmJE_qix.js");
pdf.GlobalWorkerOptions.workerSrc = url.pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js")
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
  await doc.destroy();
  return {
    pageCount: doc.numPages,
    pageWidth,
    pageHeight,
    items: allItems,
    fonts: Array.from(fontsSet),
    fontSizes: Array.from(fontSizesSet).sort((a, b) => a - b)
  };
}
exports.extractPdfStyle = extractPdfStyle;
