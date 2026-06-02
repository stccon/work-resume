import { describe, it, expect } from "vitest"
import {
  isBoldFont,
  reconstructLines,
  detectColumnBreaks,
  assignColumn,
  reconstructLinesPerPage,
  type ExtractedTextItem,
  type ExtractedLine,
} from "../pdf-extractor"

const mk = (
  text: string,
  x: number,
  y: number,
  opts: Partial<{ fontSize: number; fontName: string; width: number; pageIndex: number }> = {},
): ExtractedTextItem => ({
  text,
  fontName: opts.fontName ?? "Helvetica",
  fontSize: opts.fontSize ?? 10,
  x,
  y,
  width: opts.width ?? text.length * 5,
  height: opts.fontSize ?? 10,
  pageIndex: opts.pageIndex ?? 0,
})

describe("isBoldFont", () => {
  it("detects bold by keyword", () => {
    expect(isBoldFont("Helvetica-Bold")).toBe(true)
    expect(isBoldFont("Arial Bold")).toBe(true)
    expect(isBoldFont("PingFangSC-Black")).toBe(true)
    expect(isBoldFont("Roboto-BoldItalic")).toBe(true)
    expect(isBoldFont("SourceHanSans-Bold")).toBe(true)
  })
  it("rejects regular fonts", () => {
    expect(isBoldFont("Helvetica")).toBe(false)
    expect(isBoldFont("Arial")).toBe(false)
    expect(isBoldFont("PingFangSC-Regular")).toBe(false)
    expect(isBoldFont("")).toBe(false)
  })
})

describe("reconstructLines", () => {
  it("groups items on the same y into a line", () => {
    const items = [
      mk("张", 10, 100, { fontSize: 12 }),
      mk("三", 25, 100, { fontSize: 12 }),
      mk(" | ", 40, 100, { fontSize: 12 }),
      mk("13800138000", 60, 100, { fontSize: 12 }),
    ]
    const lines = reconstructLines(items)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe("张 三 | 13800138000")
    expect(lines[0].x).toBe(10)
    expect(lines[0].y).toBe(100)
    expect(lines[0].fontSize).toBe(12)
  })

  it("splits items at different y into separate lines", () => {
    const items = [
      mk("张三", 10, 200, { fontSize: 16 }),
      mk("13800138000", 10, 180, { fontSize: 10 }),
    ]
    const lines = reconstructLines(items)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe("张三")
    expect(lines[1].text).toBe("13800138000")
    expect(lines[0].y).toBeGreaterThan(lines[1].y)
  })

  it("respects y-tolerance", () => {
    const items = [
      mk("第一行前半", 10, 100),
      mk("第一行后半", 60, 101),
      mk("第二行", 10, 90),
    ]
    const lines = reconstructLines(items, 2)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toContain("第一行")
    expect(lines[1].text).toBe("第二行")
  })

  it("returns empty for empty input", () => {
    expect(reconstructLines([])).toEqual([])
  })

  it("marks lines as bold when any item is bold", () => {
    const items = [
      mk("Bold", 10, 100, { fontName: "Arial-Bold", fontSize: 14 }),
      mk(" text", 50, 100),
    ]
    const lines = reconstructLines(items)
    expect(lines[0].isBold).toBe(true)
    expect(lines[0].fontSize).toBe(14)
  })

  it("handles multi-page items in order", () => {
    const items = [
      mk("page1 line", 10, 100, { pageIndex: 0 }),
      mk("page2 line", 10, 100, { pageIndex: 1 }),
    ]
    const lines = reconstructLines(items)
    expect(lines).toHaveLength(2)
    expect(lines[0].pageIndex).toBe(0)
    expect(lines[1].pageIndex).toBe(1)
  })
})

describe("detectColumnBreaks", () => {
  it("returns empty for too few lines", () => {
    const items = [mk("a", 10, 100), mk("b", 12, 90)]
    const lines = reconstructLines(items)
    expect(detectColumnBreaks(lines)).toEqual([])
  })

  it("detects two-column layout with a clear gap", () => {
    const lines: ExtractedLine[] = []
    for (let i = 0; i < 10; i++) {
      lines.push({
        text: `L${i}`,
        x: 30,
        y: 200 - i * 15,
        fontSize: 10,
        fontName: "Arial",
        isBold: false,
        pageIndex: 0,
      })
    }
    for (let i = 0; i < 10; i++) {
      lines.push({
        text: `R${i}`,
        x: 280,
        y: 200 - i * 15,
        fontSize: 10,
        fontName: "Arial",
        isBold: false,
        pageIndex: 0,
      })
    }
    const breaks = detectColumnBreaks(lines, 0.04, 4)
    expect(breaks.length).toBeGreaterThan(0)
    expect(breaks[0]).toBeGreaterThan(100)
    expect(breaks[0]).toBeLessThan(200)
  })

  it("returns empty for single-column layout", () => {
    const lines: ExtractedLine[] = []
    for (let i = 0; i < 10; i++) {
      lines.push({
        text: `L${i}`,
        x: 30 + (i % 2) * 5,
        y: 200 - i * 15,
        fontSize: 10,
        fontName: "Arial",
        isBold: false,
        pageIndex: 0,
      })
    }
    expect(detectColumnBreaks(lines, 0.04, 4)).toEqual([])
  })
})

describe("assignColumn", () => {
  const ln = (text: string, x: number, y: number): ExtractedLine => ({
    text,
    x,
    y,
    fontSize: 10,
    fontName: "Arial",
    isBold: false,
    pageIndex: 0,
  })
  it("returns single bucket when no breaks", () => {
    const lines = [ln("a", 10, 100), ln("b", 20, 90)]
    expect(assignColumn(lines, [])).toHaveLength(1)
  })
  it("splits into two columns by break position", () => {
    const lines = [ln("L1", 10, 100), ln("L2", 10, 80), ln("R1", 200, 100), ln("R2", 200, 80)]
    const cols = assignColumn(lines, [150])
    expect(cols).toHaveLength(2)
    expect(cols[0].map((l) => l.text)).toEqual(["L1", "L2"])
    expect(cols[1].map((l) => l.text)).toEqual(["R1", "R2"])
  })
})

describe("reconstructLinesPerPage", () => {
  it("returns one entry per page, each sorted by y desc", () => {
    const items = [
      mk("B", 10, 90, { pageIndex: 0 }),
      mk("A", 10, 100, { pageIndex: 0 }),
      mk("P2", 10, 100, { pageIndex: 1 }),
    ]
    const pages = reconstructLinesPerPage(items)
    expect(pages).toHaveLength(2)
    expect(pages[0][0].text).toBe("A")
    expect(pages[0][1].text).toBe("B")
    expect(pages[1][0].text).toBe("P2")
  })

  it("reorders two-column page: left col top-to-bottom, then right col", () => {
    const items: ExtractedTextItem[] = []
    for (let i = 0; i < 5; i++) {
      items.push(mk(`L${i}`, 30, 200 - i * 20, { pageIndex: 0 }))
    }
    for (let i = 0; i < 5; i++) {
      items.push(mk(`R${i}`, 280, 200 - i * 20, { pageIndex: 0 }))
    }
    const pages = reconstructLinesPerPage(items, 2)
    const texts = pages[0].map((l) => l.text)
    const firstRight = texts.findIndex((t) => t.startsWith("R"))
    expect(firstRight).toBe(5)
    expect(texts[0]).toBe("L0")
    expect(texts[4]).toBe("L4")
    expect(texts[5]).toBe("R0")
  })
})
