import fs from "fs"
import path from "path"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"

GlobalWorkerOptions.workerSrc = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js")

export interface ExtractedTextItem {
  text: string
  fontName: string
  fontSize: number
  x: number
  y: number
  width: number
  height: number
  pageIndex: number
}

export interface ExtractedStyleInfo {
  pageCount: number
  pageWidth: number
  pageHeight: number
  items: ExtractedTextItem[]
  fonts: string[]
  fontSizes: number[]
}

export async function extractPdfStyle(filePath: string): Promise<ExtractedStyleInfo> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const doc = await getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise

  const allItems: ExtractedTextItem[] = []
  const fontsSet = new Set<string>()
  const fontSizesSet = new Set<number>()
  let pageWidth = 0
  let pageHeight = 0

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    pageWidth = viewport.width
    pageHeight = viewport.height

    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!("str" in item)) continue
      const textItem = item as any
      const fontName = textItem.fontName || ""
      const fontSize = textItem.fontSize || 0
      const transform = textItem.transform || [1, 0, 0, 1, 0, 0]

      fontsSet.add(fontName)
      if (fontSize > 0) fontSizesSet.add(Math.round(fontSize * 10) / 10)

      allItems.push({
        text: textItem.str,
        fontName,
        fontSize,
        x: transform[4],
        y: transform[5],
        width: textItem.width || 0,
        height: fontSize || 0,
        pageIndex: i - 1,
      })
    }
  }

  await doc.destroy()

  return {
    pageCount: doc.numPages,
    pageWidth,
    pageHeight,
    items: allItems,
    fonts: Array.from(fontsSet),
    fontSizes: Array.from(fontSizesSet).sort((a, b) => a - b),
  }
}
