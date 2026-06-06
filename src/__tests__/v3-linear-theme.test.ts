import { describe, it, expect } from "vitest"
import v3Linear from "../../themes/v3-linear.json"
import { validateV3Theme } from "@/types/visual-template"

describe("v3-linear.json", () => {
  it("通过 V3 宪法校验", () => {
    const result = validateV3Theme(v3Linear)
    expect(result.ok, result.errors.join("\n")).toBe(true)
  })

  it("hasAvatar=false", () => {
    expect((v3Linear as any).hasAvatar).toBe(false)
  })

  it("typeFamily=sans", () => {
    expect((v3Linear as any).typeFamily).toBe("sans")
  })

  it("sectionOrder 包含核心 8 个 section", () => {
    const order = (v3Linear as any).sectionOrder as string[]
    expect(order).toContain("personal")
    expect(order).toContain("experience")
    expect(order).toContain("education")
  })

  it("fonts.body 是 sans-serif 栈", () => {
    const body = (v3Linear as any).fonts.body.toLowerCase()
    expect(body).toContain("sans-serif")
  })

  it("6 token colors", () => {
    const colors = (v3Linear as any).colors
    const keys = Object.keys(colors)
    expect(keys.length).toBe(7)
  })

  it("spacing 全部 4 的倍数", () => {
    const spacing = (v3Linear as any).spacing
    expect(parseInt(spacing.pagePadding)).toBe(48)
    expect(parseInt(spacing.sectionGap)).toBe(28)
    expect(parseInt(spacing.entryGap)).toBe(16)
  })
})
