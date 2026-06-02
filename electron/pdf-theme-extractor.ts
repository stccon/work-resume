import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"
import type { ExtractedTextItem } from "./pdf-extractor"
import { extractPdfStyle } from "./pdf-extractor"

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
).toString()

export interface DetectedColors {
  text: string
  textMuted: string
  primary: string
  primaryLight: string
  background: string
  border: string
  accent: string
  divider: string
  sidebarBg: string
  sidebarText: string
  headerBg: string
  headerText: string
  sectionBg: string
}

export interface DetectedTheme {
  name: string
  label: string
  description: string
  layout: "single-column" | "two-column"
  headerStyle: "centered" | "left" | "colored-bar"
  sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"
  decorationStyle: "line" | "dot" | "none"
  colors: DetectedColors
  fonts: { heading: string; body: string; mono: string }
  typography: {
    nameFontSize: string
    titleFontSize: string
    sectionTitleFontSize: string
    bodyFontSize: string
    lineHeight: string
  }
  spacing: { pagePadding: string; sectionGap: string; entryGap: string }
  borderRadius: string
  sidebarWidth: string
  isImported: true
  importedFrom: string
  confidence: number
  detectedAt: string
}

const CONFIDENCE_FONTS = 0.25
const CONFIDENCE_FONT_SIZES = 0.2
const CONFIDENCE_COLORS = 0.2
const CONFIDENCE_LAYOUT = 0.15
const CONFIDENCE_DECORATION = 0.1
const CONFIDENCE_SECTION_TITLES = 0.1

export async function extractPdfTheme(filePath: string): Promise<DetectedTheme> {
  const style = await extractPdfStyle(filePath)
  const colors = await detectColors(filePath, style)
  const fonts = detectFonts(style)
  const typography = detectTypography(style)
  const layout = detectLayout(style)
  const decoration = detectDecoration(style)
  const sectionStyle = inferSectionStyle(decoration, layout, style)
  const sectionSizes = deriveSectionTitleSize(style, typography)
  const finalTypography = { ...typography, sectionTitleFontSize: sectionSizes }
  const confidence = computeConfidence({
    hasFonts: !!fonts.heading,
    hasFontSizes: style.fontSizes.length > 0,
    hasColors: colors._hasColors,
    hasLayout: layout._hasLayout,
    hasDecoration: decoration._hasDecoration,
    hasSectionTitles: sectionSizes._hasSectionTitles,
  })

  const baseName = path.basename(filePath, path.extname(filePath))
    .replace(/[^\w\u4e00-\u9fa5\-]/g, "-")
    .slice(0, 40)
  const hash = shortHash(JSON.stringify({
    fonts: style.fonts.slice(0, 5),
    sizes: style.fontSizes.slice(0, 8),
    colors: Object.values(colors).filter((_, i) => i < 8),
  }))

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
    detectedAt: new Date().toISOString(),
  }
}

interface RawColorStats {
  text: string
  textMuted: string
  primary: string
  primaryLight: string
  background: string
  border: string
  accent: string
  divider: string
  sidebarBg: string
  sidebarText: string
  headerBg: string
  headerText: string
  sectionBg: string
  _hasColors: boolean
}

async function detectColors(filePath: string, style: any): Promise<RawColorStats> {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath))
    const doc = await getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise
    const maxPage = Math.min(doc.numPages, 3)

    const colorCount = new Map<string, number>()
    let currentFill: number[] | null = null

    for (let i = 1; i <= maxPage; i++) {
      const page = await doc.getPage(i)
      const opList = await page.getOperatorList()
      for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
        const fn = opList.fnArray[opIdx]
        const args = opList.argsArray[opIdx]

        if (fn === 19 /* setFillColorSpace */ || fn === 20 /* setStrokeColorSpace */) continue
        if (fn === 21 /* setFillColor */ && Array.isArray(args) && args.length === 1 && Array.isArray(args[0])) {
          currentFill = args[0]
        } else if (fn === 22 /* setStrokeColor */ && Array.isArray(args) && args.length === 1 && Array.isArray(args[0])) {
          currentFill = args[0]
        } else if ((fn === 23 || fn === 24) && Array.isArray(args)) {
          currentFill = args
        }

        if (currentFill && (fn === 28 /* fill */ || fn === 29 /* stroke */ || fn === 31 /* fillStroke */)) {
          const hex = rgbToHex(currentFill)
          if (hex) {
            colorCount.set(hex, (colorCount.get(hex) || 0) + 1)
          }
        }
      }
    }

    if (colorCount.size === 0) {
      return defaultColors()
    }

    const sorted = Array.from(colorCount.entries())
      .filter(([hex]) => !isNearWhite(hex) || colorCount.size < 3)
      .sort((a, b) => b[1] - a[1])

    const sortedAll = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1])
    const mostFrequent = sortedAll[0]?.[0] ?? "#000000"
    const second = sorted[1]?.[0] ?? mostFrequent
    const third = sorted[2]?.[0] ?? second
    const fourth = sorted[3]?.[0] ?? third

    const background = pickBackground(colorCount, mostFrequent)
    const text = pickText(colorCount, background)
    const primary = pickAccent(sorted, text, background)
    const primaryLight = mixColors(primary, background, 0.85)
    const border = fourth
    const accent = primary
    const divider = mixColors(text, background, 0.7)

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
      _hasColors: true,
    }
  } catch {
    return defaultColors()
  }
}

function defaultColors(): RawColorStats {
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
    _hasColors: false,
  }
}

function isNearWhite(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r > 248 && g > 248 && b > 248
}

function isNearBlack(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r < 30 && g < 30 && b < 30
}

function rgbToHex(c: number[]): string | null {
  if (!Array.isArray(c) || c.length < 3) return null
  if (c.length === 1) {
    const v = Math.round(c[0] * 255)
    return `#${[v, v, v].map((n) => n.toString(16).padStart(2, "0")).join("")}`
  }
  if (c.length >= 3) {
    const r = Math.round(Math.min(1, Math.max(0, c[0])) * 255)
    const g = Math.round(Math.min(1, Math.max(0, c[1])) * 255)
    const b = Math.round(Math.min(1, Math.max(0, c[2])) * 255)
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`
  }
  return null
}

function pickBackground(count: Map<string, number>, mostFrequent: string): string {
  if (isNearWhite(mostFrequent) || isNearBlack(mostFrequent)) {
    return mostFrequent
  }
  for (const [hex] of count) {
    if (isNearWhite(hex)) return hex
  }
  return "#ffffff"
}

function pickText(count: Map<string, number>, background: string): string | null {
  for (const [hex] of count) {
    if (isNearBlack(hex) && hex !== background) return hex
  }
  if (isNearBlack(background)) {
    for (const [hex] of count) {
      if (!isNearBlack(hex)) return hex
    }
  }
  return null
}

function pickAccent(
  sorted: [string, number][],
  text: string | null,
  background: string,
): string | null {
  for (const [hex] of sorted) {
    if (hex === text || hex === background) continue
    if (isNearWhite(hex) || isNearBlack(hex)) continue
    return hex
  }
  return null
}

function mixColors(a: string, b: string, ratio: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar * (1 - ratio) + br * ratio)
  const g = Math.round(ag * (1 - ratio) + bg * ratio)
  const bl = Math.round(ab * (1 - ratio) + bb * ratio)
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

function detectFonts(style: any): { heading: string; body: string; mono: string } {
  const fontCounts = new Map<string, number>()
  for (const item of style.items) {
    if (!item.fontName) continue
    const clean = cleanFontName(item.fontName)
    if (!clean) continue
    const weight = item.fontSize * (item.width || item.text.length || 1)
    fontCounts.set(clean, (fontCounts.get(clean) || 0) + weight)
  }
  const sorted = Array.from(fontCounts.entries()).sort((a, b) => b[1] - a[1])
  const heading = sorted[0]?.[0] ?? "system-ui"
  const body = sorted[1]?.[0] ?? sorted[0]?.[0] ?? "system-ui"
  return { heading, body, mono: "ui-monospace" }
}

function cleanFontName(raw: string): string {
  if (!raw) return ""
  const noSubset = raw.replace(/^[A-Z]{6}\+/, "")
  const noType = noSubset.replace(/-(Bold|Italic|Regular|Medium|Light|Heavy|Black)$/i, "")
  return noType.trim()
}

function detectTypography(style: any): {
  nameFontSize: string
  titleFontSize: string
  sectionTitleFontSize: string
  bodyFontSize: string
  lineHeight: string
  _hasSectionTitles?: boolean
} {
  const sizes = style.fontSizes.filter((s: number) => s > 0).sort((a: number, b: number) => b - a)
  if (sizes.length === 0) {
    return {
      nameFontSize: "24px",
      titleFontSize: "14px",
      sectionTitleFontSize: "13px",
      bodyFontSize: "11px",
      lineHeight: "1.6",
    }
  }
  const name = sizes[0] ?? 24
  const second = sizes[1] ?? sizes[0] ?? 14
  const mid = sizes[Math.floor(sizes.length / 2)] ?? 12
  const body = mid
  return {
    nameFontSize: `${Math.max(18, Math.min(36, roundToHalf(name)))}px`,
    titleFontSize: `${Math.max(11, Math.min(20, roundToHalf(second)))}px`,
    sectionTitleFontSize: `${Math.max(11, Math.min(18, roundToHalf(second)))}px`,
    bodyFontSize: `${Math.max(9, Math.min(14, roundToHalf(body)))}px`,
    lineHeight: "1.6",
  }
}

function deriveSectionTitleSize(style: any, base: any): any {
  const items = style.items as ExtractedTextItem[]
  if (items.length === 0) return { ...base, _hasSectionTitles: false }
  const firstPageItems = items.filter((it) => it.pageIndex === 0)
  if (firstPageItems.length < 5) return { ...base, _hasSectionTitles: false }

  const sizes = firstPageItems.map((it) => it.fontSize).filter((s) => s > 0)
  if (sizes.length === 0) return { ...base, _hasSectionTitles: false }

  const median = pickMedian(sizes)
  const larger = sizes.filter((s) => s > median * 1.2 && s < median * 2.5)
  if (larger.length === 0) return { ...base, _hasSectionTitles: false }

  const sectionSize = larger.sort((a, b) => b - a)[Math.floor(larger.length / 2)] ?? median * 1.3
  return {
    ...base,
    sectionTitleFontSize: `${Math.max(11, Math.min(18, roundToHalf(sectionSize)))}px`,
    _hasSectionTitles: true,
  }
}

function pickMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

interface LayoutResult {
  layout: "single-column" | "two-column"
  headerStyle: "centered" | "left" | "colored-bar"
  _hasLayout: boolean
}

function detectLayout(style: any): LayoutResult {
  const firstPage = style.items.filter((it: ExtractedTextItem) => it.pageIndex === 0)
  if (firstPage.length < 5) return { layout: "single-column", headerStyle: "left", _hasLayout: false }

  const pageWidth = style.pageWidth || 612
  const xs = firstPage.map((it: ExtractedTextItem) => it.x).filter((x: number) => x > 0)
  if (xs.length === 0) return { layout: "single-column", headerStyle: "left", _hasLayout: false }

  const leftGroup = xs.filter((x: number) => x < pageWidth * 0.45)
  const rightGroup = xs.filter((x: number) => x > pageWidth * 0.55)

  if (leftGroup.length > 5 && rightGroup.length > 5) {
    const isTwoCol = leftGroup.length + rightGroup.length > firstPage.length * 0.5
    if (isTwoCol) {
      return { layout: "two-column", headerStyle: "left", _hasLayout: true }
    }
  }

  const firstItems = firstPage.slice(0, 3)
  const allCentered = firstItems.every((it: ExtractedTextItem, i: number) => {
    if (i === 0) return true
    return Math.abs(it.x - firstItems[0].x) < 50
  })
  const headerStyle: "centered" | "left" = allCentered ? "centered" : "left"

  return { layout: "single-column", headerStyle, _hasLayout: true }
}

interface DecorationResult {
  style: "line" | "dot" | "none"
  _hasDecoration: boolean
}

function detectDecoration(style: any): DecorationResult {
  if (style.items.length === 0) return { style: "line", _hasDecoration: false }
  const firstPage = style.items.filter((it: ExtractedTextItem) => it.pageIndex === 0)
  if (firstPage.length < 3) return { style: "line", _hasDecoration: false }

  const xs = firstPage.map((it: ExtractedTextItem) => it.x)
  const stddev = standardDeviation(xs)
  if (stddev > 100) return { style: "line", _hasDecoration: true }
  return { style: "line", _hasDecoration: true }
}

function standardDeviation(arr: number[]): number {
  const n = arr.length
  if (n === 0) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  return Math.sqrt(variance)
}

function inferSectionStyle(
  deco: DecorationResult,
  layout: LayoutResult,
  style: any,
): "underlined" | "colored-bg" | "minimal" | "card" {
  if (layout.layout === "two-column") return "card"
  if (deco.style === "dot") return "minimal"
  return "underlined"
}

function computeConfidence(m: {
  hasFonts: boolean
  hasFontSizes: boolean
  hasColors: boolean
  hasLayout: boolean
  hasDecoration: boolean
  hasSectionTitles: boolean
}): number {
  let s = 0
  if (m.hasFonts) s += CONFIDENCE_FONTS
  if (m.hasFontSizes) s += CONFIDENCE_FONT_SIZES
  if (m.hasColors) s += CONFIDENCE_COLORS
  if (m.hasLayout) s += CONFIDENCE_LAYOUT
  if (m.hasDecoration) s += CONFIDENCE_DECORATION
  if (m.hasSectionTitles) s += CONFIDENCE_SECTION_TITLES
  return Math.min(1, s)
}

function shortHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).slice(0, 8)
}

function stripMeta<T extends Record<string, any>>(obj: T): T {
  const copy = { ...obj }
  for (const k of Object.keys(copy)) {
    if (k.startsWith("_")) delete (copy as any)[k]
  }
  return copy
}
