import { describe, it, expect } from "vitest"
import v3Editorial from "../../themes/v3-editorial.json"
import { validateV3Theme } from "@/types/visual-template"

describe("v3-editorial.json", () => {
  it("通过 V3 宪法校验", () => {
    const result = validateV3Theme(v3Editorial)
    expect(result.ok, result.errors.join("\n")).toBe(true)
  })

  it("typeFamily=serif + fonts.body 含 serif", () => {
    const e = v3Editorial as any
    expect(e.typeFamily).toBe("serif")
    const body = e.fonts.body.toLowerCase()
    expect(body).toContain("serif")
    expect(body).not.toContain("sans-serif")
  })

  it("hasAvatar=false（无头像）", () => {
    expect((v3Editorial as any).hasAvatar).toBe(false)
  })

  it("暖白底色 + 棕红 accent", () => {
    const c = (v3Editorial as any).colors
    expect(c.background).toBe("#fefdfb")
    expect(c.accent).toBe("#a85432")
  })

  it("name 字号 38px（大姓名）", () => {
    expect((v3Editorial as any).typography.name.size).toBe("38px")
  })

  it("sectionOrder 把 education 排前面（学术叙事）", () => {
    const order = (v3Editorial as any).sectionOrder as string[]
    expect(order.indexOf("education")).toBeLessThan(order.indexOf("skills"))
  })

  it("spacing 全部 baseline=4 整数倍", () => {
    const s = (v3Editorial as any).spacing
    expect(parseInt(s.pagePadding) % 4).toBe(0)
    expect(parseInt(s.sectionGap) % 4).toBe(0)
    expect(parseInt(s.entryGap) % 4).toBe(0)
    expect(parseInt(s.pagePadding)).toBe(64)
    expect(parseInt(s.sectionGap)).toBe(32)
  })

  it("sectionTitleRule=full-line (杂志风)", () => {
    expect((v3Editorial as any).sectionTitleRule).toBe("full-line")
  })

  it("bullet=• 字符", () => {
    expect((v3Editorial as any).bullet).toBe("•")
  })
})
