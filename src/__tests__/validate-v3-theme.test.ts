import { describe, it, expect } from "vitest"
import { validateV3Theme, type V3Theme } from "@/types/visual-template"

const baseV3: V3Theme = {
  name: "test",
  label: "Test",
  description: "Test theme",
  hasAvatar: false,
  typeFamily: "sans",
  sectionOrder: ["personal", "summary"],
  fonts: {
    heading: "Inter, sans-serif",
    body: "Inter, sans-serif",
    mono: "ui-monospace",
  },
  typography: {
    name: { size: "22px", weight: 600, lineHeight: "1.3" },
    title: { size: "13px", weight: 500, lineHeight: "1.5" },
    sectionTitle: { size: "11px", weight: 600, lineHeight: "1.4", letterSpacing: "0.18em", transform: "uppercase" },
    body: { size: "11px", weight: 400, lineHeight: "1.55" },
    entryTitle: { size: "12px", weight: 600, lineHeight: "1.4" },
    entryDate: { size: "10.5px", weight: 500, lineHeight: "1.4", tabularNums: true },
  },
  colors: {
    primary: "#000",
    accent: "#000",
    background: "#fff",
    surface: "#fafafa",
    border: "#e5e5e5",
    muted: "#737373",
    text: "#000",
  },
  baseline: 4,
  spacing: { pagePadding: "48px", sectionGap: "28px", entryGap: "16px" },
  density: "dense",
  sectionTitleRule: "short-line",
  bullet: "›",
  tagStyle: "underline",
  print: { pageBreakInsideEntry: true, pageBreakInsideSection: false, tabularNums: true, hanLatinSpacing: "0.05em" },
}

describe("validateV3Theme", () => {
  it("通过合法的 V3 主题", () => {
    const result = validateV3Theme(baseV3)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("拒绝非对象", () => {
    expect(validateV3Theme(null).ok).toBe(false)
    expect(validateV3Theme("string").ok).toBe(false)
    expect(validateV3Theme(42).ok).toBe(false)
  })

  it("颜色 token 超过 7 报错", () => {
    const theme = {
      ...baseV3,
      colors: {
        ...baseV3.colors,
        headerBg: "#fff",
        linkColor: "#00f",
      },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("colors token 过多"))).toBe(true)
  })

  it("字号档超过 6 报错", () => {
    const theme = {
      ...baseV3,
      typography: {
        ...baseV3.typography,
        caption: { size: "9px", weight: 400, lineHeight: "1.4" },
        micro: { size: "8px", weight: 400, lineHeight: "1.3" },
        tag: { size: "10px", weight: 500, lineHeight: "1.5" },
      },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("typography 档位过多"))).toBe(true)
  })

  it("spacing 非 baseline 倍数报错", () => {
    const theme = {
      ...baseV3,
      spacing: { pagePadding: "50px", sectionGap: "28px", entryGap: "16px" },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("pagePadding"))).toBe(true)
  })

  it("baseline=8 时 32px 通过", () => {
    const theme = {
      ...baseV3,
      baseline: 8 as const,
      spacing: { pagePadding: "32px", sectionGap: "24px", entryGap: "16px" },
    }
    expect(validateV3Theme(theme).ok).toBe(true)
  })

  it("baseline=8 时 28px 报错", () => {
    const theme = {
      ...baseV3,
      baseline: 8 as const,
      spacing: { pagePadding: "32px", sectionGap: "28px", entryGap: "16px" },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("sectionGap"))).toBe(true)
  })

  it("hasAvatar=false 带 avatar 字段报错", () => {
    const theme = {
      ...baseV3,
      hasAvatar: false,
      avatar: { placement: "top-right" as const, size: "medium" as const, shape: "circle" as const, border: "thin" as const },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("hasAvatar=false"))).toBe(true)
  })

  it("hasAvatar=true 缺 avatar 字段报错", () => {
    const theme = {
      ...baseV3,
      hasAvatar: true,
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("hasAvatar=true"))).toBe(true)
  })

  it("hasAvatar=true 带 avatar 字段通过", () => {
    const theme = {
      ...baseV3,
      hasAvatar: true,
      avatar: { placement: "sidebar-top" as const, size: "large" as const, shape: "circle" as const, border: "thin" as const },
      layout: "two-column" as const,
      sidebarWidth: "34%",
    }
    expect(validateV3Theme(theme).ok).toBe(true)
  })

  it("typeFamily=mono 但 body 不含 mono 报错", () => {
    const theme = {
      ...baseV3,
      typeFamily: "mono" as const,
      fonts: {
        heading: "Inter, sans-serif",
        body: "Inter, sans-serif",
        mono: "ui-monospace",
      },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("typeFamily=mono"))).toBe(true)
  })

  it("typeFamily=serif 但 body 不含 serif 报错", () => {
    const theme = {
      ...baseV3,
      typeFamily: "serif" as const,
      fonts: {
        heading: "Inter, sans-serif",
        body: "Inter, sans-serif",
        mono: "ui-monospace",
      },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("typeFamily=serif"))).toBe(true)
  })

  it("typeFamily=sans 但 body 用 serif 报错", () => {
    const theme = {
      ...baseV3,
      typeFamily: "sans" as const,
      fonts: {
        heading: "Inter, serif",
        body: "Georgia, serif",
        mono: "ui-monospace",
      },
    }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("typeFamily=sans"))).toBe(true)
  })

  it("sectionOrder 空数组报错", () => {
    const theme = { ...baseV3, sectionOrder: [] }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("sectionOrder"))).toBe(true)
  })

  it("baseline 不是 4/8 报错", () => {
    const theme = { ...baseV3, baseline: 6 as never }
    const result = validateV3Theme(theme)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes("baseline"))).toBe(true)
  })
})
