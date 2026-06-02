import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
).toString()

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

export interface ExtractedLine {
  text: string
  x: number
  y: number
  fontSize: number
  fontName: string
  isBold: boolean
  pageIndex: number
}

export interface ExtractedLayout {
  pages: ExtractedLine[][]
  pageCount: number
  pageWidth: number
  pageHeight: number
  columnBreaks?: number[]
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

  return {
    pageCount: doc.numPages,
    pageWidth,
    pageHeight,
    items: allItems,
    fonts: Array.from(fontsSet),
    fontSizes: Array.from(fontSizesSet).sort((a, b) => a - b),
  }
}

export function isBoldFont(fontName: string): boolean {
  if (!fontName) return false
  return /bold|black|heavy|-b-|\.bd/i.test(fontName)
}

const Y_TOLERANCE = 2
const X_GAP_THRESHOLD = 40
const COLUMN_MIN_GAP_ABS = 40
const COLUMN_MIN_GAP_RATIO = 0.1

export function reconstructLines(
  items: ExtractedTextItem[],
  yTolerance: number = Y_TOLERANCE,
  xGapThreshold: number = X_GAP_THRESHOLD,
): ExtractedLine[] {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    if (Math.abs(a.y - b.y) > yTolerance) return b.y - a.y
    return a.x - b.x
  })
  const yGroups: ExtractedTextItem[][] = []
  let currentGroup: ExtractedTextItem[] = []
  let currentY = sorted[0].y
  let currentPage = sorted[0].pageIndex
  for (const item of sorted) {
    const sameY =
      item.pageIndex === currentPage && Math.abs(item.y - currentY) <= yTolerance
    if (!sameY) {
      if (currentGroup.length > 0) yGroups.push(currentGroup)
      currentGroup = []
      currentY = item.y
      currentPage = item.pageIndex
    }
    currentGroup.push(item)
  }
  if (currentGroup.length > 0) yGroups.push(currentGroup)

  const lines: ExtractedLine[] = []
  for (const group of yGroups) {
    const sortedGroup = [...group].sort((a, b) => a.x - b.x)
    const clusters: ExtractedTextItem[][] = [[sortedGroup[0]]]
    for (let i = 1; i < sortedGroup.length; i++) {
      const it = sortedGroup[i]
      const last = clusters[clusters.length - 1]
      const lastItem = last[last.length - 1]
      const prevEnd = lastItem.x + (lastItem.width || 0)
      if (it.x - prevEnd > xGapThreshold) {
        clusters.push([it])
      } else {
        last.push(it)
      }
    }
    for (const cluster of clusters) {
      const text = cluster
        .map((it, i) =>
          i > 0 && it.x - cluster[i - 1].x > (cluster[i - 1].width || 4) * 1.2 ? " " + it.text : it.text,
        )
        .join("")
        .replace(/\s+/g, " ")
        .trim()
      if (!text) continue
      const maxFontSize = cluster.reduce((m, it) => Math.max(m, it.fontSize), 0)
      const anyBold = cluster.some((it) => isBoldFont(it.fontName))
      lines.push({
        text,
        x: cluster[0].x,
        y: cluster[0].y,
        fontSize: maxFontSize,
        fontName: cluster[0].fontName,
        isBold: anyBold,
        pageIndex: cluster[0].pageIndex,
      })
    }
  }
  return lines
}

export function detectColumnBreaks(
  lines: ExtractedLine[],
  minGapRatio: number = COLUMN_MIN_GAP_RATIO,
  minCount: number = 4,
): number[] {
  if (lines.length < minCount * 2) return []
  const xs = lines.map((l) => l.x).sort((a, b) => a - b)
  const maxX = xs[xs.length - 1]
  const minX = xs[0]
  const span = maxX - minX
  if (span <= 0) return []
  const minGap = Math.max(span * minGapRatio, COLUMN_MIN_GAP_ABS)
  const gaps: { x: number; width: number; leftCount: number; rightCount: number }[] = []
  for (let i = 1; i < xs.length; i++) {
    const w = xs[i] - xs[i - 1]
    if (w >= minGap) {
      gaps.push({
        x: (xs[i - 1] + xs[i]) / 2,
        width: w,
        leftCount: i,
        rightCount: xs.length - i,
      })
    }
  }
  const valid = gaps.filter((g) => g.leftCount >= minCount && g.rightCount >= minCount)
  if (valid.length === 0) return []
  valid.sort((a, b) => b.width - a.width)
  const breaks: number[] = []
  for (const g of valid) {
    if (breaks.every((b) => Math.abs(b - g.x) > minGap * 0.5)) {
      breaks.push(g.x)
    }
    if (breaks.length >= 2) break
  }
  breaks.sort((a, b) => a - b)
  return breaks
}

export function assignColumn(lines: ExtractedLine[], breaks: number[]): ExtractedLine[][] {
  if (breaks.length === 0) return [lines]
  const columns: ExtractedLine[][] = breaks.map(() => []).concat([[]])
  for (const line of lines) {
    let placed = false
    for (let i = 0; i < breaks.length; i++) {
      if (line.x < breaks[i]) {
        columns[i].push(line)
        placed = true
        break
      }
    }
    if (!placed) columns[columns.length - 1].push(line)
  }
  return columns.filter((c) => c.length > 0)
}

export function reconstructLinesPerPage(
  items: ExtractedTextItem[],
  yTolerance: number = Y_TOLERANCE,
): ExtractedLine[][] {
  const pageMap = new Map<number, ExtractedTextItem[]>()
  for (const item of items) {
    const arr = pageMap.get(item.pageIndex) || []
    arr.push(item)
    pageMap.set(item.pageIndex, arr)
  }
  const pages: ExtractedLine[][] = []
  const pageIndices = Array.from(pageMap.keys()).sort((a, b) => a - b)
  for (const idx of pageIndices) {
    const pageItems = pageMap.get(idx) || []
    const lines = reconstructLines(pageItems, yTolerance)
    const breaks = detectColumnBreaks(lines)
    if (breaks.length > 0) {
      const columns = assignColumn(lines, breaks)
      const ordered: ExtractedLine[] = []
      for (const col of columns) {
        const colSorted = [...col].sort((a, b) => b.y - a.y)
        ordered.push(...colSorted)
      }
      pages.push(ordered)
    } else {
      const sorted = [...lines].sort((a, b) => b.y - a.y)
      pages.push(sorted)
    }
  }
  return pages
}

export async function extractPdfLayout(filePath: string): Promise<ExtractedLayout> {
  const style = await extractPdfStyle(filePath)
  const pages = reconstructLinesPerPage(style.items)
  const allLines = pages.flat()
  const breaks = detectColumnBreaks(allLines)
  return {
    pages,
    pageCount: style.pageCount,
    pageWidth: style.pageWidth,
    pageHeight: style.pageHeight,
    columnBreaks: breaks.length > 0 ? breaks : undefined,
  }
}
