"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const pdf = require("./pdf-0gLcVgOr.js");
pdf.GlobalWorkerOptions.workerSrc = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
const MIN_AVATAR_WIDTH = 100;
const MIN_AVATAR_HEIGHT = 100;
async function extractPdfImagesMeta(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdf.getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise;
  const results = [];
  const maxPage = Math.min(doc.numPages, 2);
  for (let i = 1; i <= maxPage; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const opList = await page.getOperatorList();
    const seenNames = /* @__PURE__ */ new Set();
    let cursorY = 0;
    for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
      const fn = opList.fnArray[opIdx];
      const args = opList.argsArray[opIdx];
      if (fn === 10 && (args == null ? void 0 : args.length) === 6) {
        args[4];
        cursorY = args[5];
      }
      if (fn === 85 && (args == null ? void 0 : args[0])) {
        const name = args[0];
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        const commonObjs = page.commonObjs;
        if (!commonObjs) continue;
        try {
          const obj = await commonObjs.get(name);
          if (!obj || obj.kind !== "image") continue;
          const w = obj.width || 0;
          const h = obj.height || 0;
          if (w < MIN_AVATAR_WIDTH || h < MIN_AVATAR_HEIGHT) continue;
          const inTopHalf = cursorY > viewport.height * 0.5;
          const isFirstPage = i === 1;
          if (!isFirstPage && !inTopHalf) continue;
          results.push({ name, width: w, height: h, pageIndex: i - 1, inTopHalf });
        } catch {
          continue;
        }
      }
    }
  }
  await doc.destroy();
  return results;
}
async function extractPdfImagePayload(filePath, imageName, pageIndex) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdf.getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise;
  if (pageIndex + 1 > doc.numPages) {
    await doc.destroy();
    return null;
  }
  const page = await doc.getPage(pageIndex + 1);
  const commonObjs = page.commonObjs;
  if (!commonObjs) {
    await doc.destroy();
    return null;
  }
  try {
    const obj = await commonObjs.get(imageName);
    if (!obj || obj.kind !== "image") {
      await doc.destroy();
      return null;
    }
    const w = obj.width || 0;
    const h = obj.height || 0;
    const rgb = obj.data;
    const smask = obj.smask;
    if (!rgb || !Buffer.isBuffer(rgb) && !(rgb instanceof Uint8Array)) {
      await doc.destroy();
      return null;
    }
    const rgbBuf = Buffer.isBuffer(rgb) ? rgb : Buffer.from(rgb);
    const smaskBuf = smask ? Buffer.isBuffer(smask) ? smask : Buffer.from(smask) : null;
    await doc.destroy();
    return {
      width: w,
      height: h,
      hasAlpha: !!smaskBuf,
      rgbBase64: rgbBuf.toString("base64"),
      smaskBase64: smaskBuf ? smaskBuf.toString("base64") : null
    };
  } catch {
    await doc.destroy();
    return null;
  }
}
async function extractPdfAvatarMeta(filePath) {
  const metas = await extractPdfImagesMeta(filePath);
  if (metas.length === 0) return null;
  const sorted = [...metas].sort((a, b) => b.width * b.height - a.width * a.height);
  return sorted[0];
}
async function extractPdfAvatarPayload(filePath) {
  const meta = await extractPdfAvatarMeta(filePath);
  if (!meta) return null;
  return await extractPdfImagePayload(filePath, meta.name, meta.pageIndex);
}
exports.extractPdfAvatarMeta = extractPdfAvatarMeta;
exports.extractPdfAvatarPayload = extractPdfAvatarPayload;
exports.extractPdfImagePayload = extractPdfImagePayload;
exports.extractPdfImagesMeta = extractPdfImagesMeta;
