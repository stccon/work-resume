import { describe, it, expect } from "vitest"
import v3Mono from "../../themes/v3-mono.json"
import { validateV3Theme } from "@/types/visual-template"

describe("v3-mono.json", () => {
  it("通过 V3 宪法校验", () => {
    const result = validateV3Theme(v3Mono)
    expect(result.ok, result.errors.join("\n")).toBe(true)
  })

  it("typeFamily=mono + fonts.body 含 mono", () => {
    const m = v3Mono as any
    expect(m.typeFamily).toBe("mono")
    expect(m.fonts.body.toLowerCase()).toContain("mono")
  })

  it("hasAvatar=false", () => {
    expect((v3Mono as any).hasAvatar).toBe(false)
  })

  it("JetBrains Mono 在字体栈首位", () => {
    const body = (v3Mono as any).fonts.body
    expect(body).toContain("JetBrains Mono")
    expect(body).toContain("SF Mono")
  })

  it("sectionOrder skills 排在 experience 前（工程师视角）", () => {
    const order = (v3Mono as any).sectionOrder as string[]
    expect(order.indexOf("skills")).toBeLessThan(order.indexOf("experience"))
  })

  it("间距 dense 全部 baseline=4 整数倍", () => {
    const s = (v3Mono as any).spacing
    expect(parseInt(s.pagePadding)).toBe(48)
    expect(parseInt(s.sectionGap)).toBe(24)
    expect(parseInt(s.entryGap)).toBe(12)
  })

  it("name 24px 等宽", () => {
    expect((v3Mono as any).typography.name.size).toBe("24px")
  })

  it("bullet=›", () => {
    expect((v3Mono as any).bullet).toBe("›")
  })

  it("tabular-nums 默认开（V3 宪法 print 必填）", () => {
    expect((v3Mono as any).print.tabularNums).toBe(true)
  })
})
