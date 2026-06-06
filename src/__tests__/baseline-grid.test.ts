import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { assertBaselineMultiple, getBaselineReminders, checkSpacingOnThemeLoad } from "@/lib/baseline-grid"
import type { V3Theme } from "@/types/visual-template"

const baseTheme: V3Theme = {
  name: "test",
  label: "Test",
  description: "Test theme",
  hasAvatar: false,
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

describe("assertBaselineMultiple", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    ;(import.meta as any).env = { DEV: true }
  })

  afterEach(() => {
    warnSpy.mockRestore()
    ;(import.meta as any).env = { DEV: false }
  })

  it("baseline=4 时 16px 通过且不告警", () => {
    assertBaselineMultiple(16, 4, "entryGap")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("baseline=4 时 50px 告警并建议 48/52", () => {
    assertBaselineMultiple(50, 4, "pagePadding")
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = warnSpy.mock.calls[0][0] as string
    expect(msg).toContain("pagePadding")
    expect(msg).toContain("50")
    expect(msg).toContain("48")
    expect(msg).toContain("52")
  })

  it("baseline=8 时 32px 通过", () => {
    assertBaselineMultiple(32, 8, "pagePadding")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("baseline=8 时 28px 告警", () => {
    assertBaselineMultiple(28, 8, "sectionGap")
    expect(warnSpy).toHaveBeenCalled()
  })

  it("NaN 不告警", () => {
    assertBaselineMultiple(NaN, 4, "weird")
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe("getBaselineReminders", () => {
  it("返回所有不合规 spacing 字段名", () => {
    const theme: V3Theme = {
      ...baseTheme,
      spacing: { pagePadding: "50px", sectionGap: "30px", entryGap: "16px" },
    }
    const reminders = getBaselineReminders(theme)
    expect(reminders).toHaveLength(2)
    expect(reminders[0]).toContain("pagePadding")
    expect(reminders[1]).toContain("sectionGap")
  })

  it("全部合规时返回空数组", () => {
    const reminders = getBaselineReminders(baseTheme)
    expect(reminders).toEqual([])
  })

  it("baseline=8 时 32/24/16 都合规", () => {
    const theme: V3Theme = {
      ...baseTheme,
      baseline: 8,
      spacing: { pagePadding: "32px", sectionGap: "24px", entryGap: "16px" },
    }
    expect(getBaselineReminders(theme)).toEqual([])
  })
})

describe("checkSpacingOnThemeLoad", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it("dev 模式不合规时告警", () => {
    ;(import.meta as any).env = { DEV: true }
    const theme: V3Theme = {
      ...baseTheme,
      spacing: { pagePadding: "50px", sectionGap: "28px", entryGap: "16px" },
    }
    checkSpacingOnThemeLoad(theme)
    expect(warnSpy).toHaveBeenCalled()
    const msg = warnSpy.mock.calls[0][0] as string
    expect(msg).toContain("test")
  })

  it("dev 模式合规时静默", () => {
    ;(import.meta as any).env = { DEV: true }
    checkSpacingOnThemeLoad(baseTheme)
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
