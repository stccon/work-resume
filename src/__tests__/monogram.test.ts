import { describe, it, expect } from "vitest"
import { getMonogramText, renderMonogram } from "@/lib/monogram"
import type { V3Theme } from "@/types/visual-template"

const baseTheme: V3Theme = {
  name: "test",
  label: "Test",
  description: "Test theme",
  hasAvatar: true,
  typeFamily: "sans",
  sectionOrder: ["personal"],
  fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "ui-monospace" },
  typography: {
    name: { size: "22px", weight: 600, lineHeight: "1.3" },
    title: { size: "13px", weight: 500, lineHeight: "1.5" },
    sectionTitle: { size: "11px", weight: 600, lineHeight: "1.4" },
    body: { size: "11px", weight: 400, lineHeight: "1.55" },
    entryTitle: { size: "12px", weight: 600, lineHeight: "1.4" },
    entryDate: { size: "10.5px", weight: 500, lineHeight: "1.4" },
  },
  colors: {
    primary: "#0a0a0a",
    accent: "#0a0a0a",
    background: "#ffffff",
    surface: "#fafafa",
    border: "#e5e5e5",
    muted: "#737373",
    text: "#0a0a0a",
  },
  baseline: 4,
  spacing: { pagePadding: "48px", sectionGap: "28px", entryGap: "16px" },
  density: "dense",
  sectionTitleRule: "short-line",
  bullet: "›",
  tagStyle: "underline",
  print: { pageBreakInsideEntry: true, pageBreakInsideSection: false, tabularNums: true, hanLatinSpacing: "0.05em" },
  layout: "two-column",
  sidebarWidth: "34%",
  avatar: { placement: "sidebar-top", size: "large", shape: "circle", border: "thin" },
}

describe("getMonogramText", () => {
  it("中文姓名取姓氏（第一个汉字）", () => {
    expect(getMonogramText("张明")).toBe("张")
    expect(getMonogramText("欧阳修")).toBe("欧")
  })

  it("英文姓名取 first + last 首字母", () => {
    expect(getMonogramText("Zhang Ming")).toBe("ZM")
    expect(getMonogramText("John F. Kennedy")).toBe("JK")
  })

  it("单英文名取单个首字母", () => {
    expect(getMonogramText("Madonna")).toBe("M")
  })

  it("缺名返回 fallback", () => {
    expect(getMonogramText(undefined)).toBe("?")
    expect(getMonogramText("")).toBe("?")
    expect(getMonogramText("   ")).toBe("?")
  })

  it("可传入自定义 fallback", () => {
    expect(getMonogramText(undefined, "")).toBe("")
    expect(getMonogramText(undefined, "X")).toBe("X")
  })

  it("trim 后处理", () => {
    expect(getMonogramText("  Zhang Ming  ")).toBe("ZM")
  })

  it("纯数字姓名防御性", () => {
    expect(getMonogramText("2024")).toBe("2024")
  })
})

describe("renderMonogram", () => {
  it("hasAvatar=false 时返回空字符串", () => {
    const theme = { ...baseTheme, hasAvatar: false, avatar: undefined }
    expect(renderMonogram("张三", theme as V3Theme)).toBe("")
  })

  it("返回 inline span 元素（包含姓名）", () => {
    const html = renderMonogram("张明", baseTheme)
    expect(html).toContain("resume-monogram")
    expect(html).toContain("张")
  })

  it("包含 placement / size / shape / border class", () => {
    const html = renderMonogram("ZM", baseTheme)
    expect(html).toContain("placement-sidebar-top")
    expect(html).toContain("size-large")
    expect(html).toContain("shape-circle")
    expect(html).toContain("border-thin")
  })

  it("大尺寸 96px", () => {
    const html = renderMonogram("张", baseTheme)
    expect(html).toContain("width:96px")
    expect(html).toContain("height:96px")
  })

  it("中尺寸 64px", () => {
    const theme: V3Theme = {
      ...baseTheme,
      avatar: { placement: "top-right", size: "medium", shape: "rounded", border: "thick" },
    }
    const html = renderMonogram("张", theme)
    expect(html).toContain("width:64px")
    expect(html).toContain("border-radius:8px")
  })

  it("小尺寸 40px", () => {
    const theme: V3Theme = {
      ...baseTheme,
      avatar: { placement: "top-left", size: "small", shape: "square", border: "none" },
    }
    const html = renderMonogram("Z", theme)
    expect(html).toContain("width:40px")
    expect(html).toContain("border-radius:0")
  })
})
