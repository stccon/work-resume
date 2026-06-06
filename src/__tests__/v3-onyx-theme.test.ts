import { describe, it, expect } from "vitest"
import v3Onyx from "../../themes/v3-onyx.json"
import { validateV3Theme } from "@/types/visual-template"

describe("v3-onyx.json", () => {
  it("通过 V3 宪法校验", () => {
    const result = validateV3Theme(v3Onyx)
    expect(result.ok, result.errors.join("\n")).toBe(true)
  })

  it("hasAvatar=true + sidebar 布局", () => {
    expect((v3Onyx as any).hasAvatar).toBe(true)
    expect((v3Onyx as any).layout).toBe("two-column")
  })

  it("avatar config 完整 (size=large, shape=circle, border=thin, placement=sidebar-top)", () => {
    const av = (v3Onyx as any).avatar
    expect(av.placement).toBe("sidebar-top")
    expect(av.size).toBe("large")
    expect(av.shape).toBe("circle")
    expect(av.border).toBe("thin")
  })

  it("sidebar 颜色: dark navy + light text", () => {
    const onyx = v3Onyx as any
    expect(onyx.sidebarBg).toBe("#0f1d2e")
    expect(onyx.sidebarText).toBe("#f3f4f6")
  })

  it("accent 是金色", () => {
    expect((v3Onyx as any).colors.accent).toBe("#c9a86a")
  })

  it("sectionOrder 把 personal + skills 排前面（sidebar 区）", () => {
    const order = (v3Onyx as any).sectionOrder as string[]
    const personalIdx = order.indexOf("personal")
    const skillsIdx = order.indexOf("skills")
    const experienceIdx = order.indexOf("experience")
    expect(personalIdx).toBeLessThan(experienceIdx)
    expect(skillsIdx).toBeLessThan(experienceIdx)
  })

  it("baseline=8 + spacious 间距", () => {
    const onyx = v3Onyx as any
    expect(onyx.baseline).toBe(8)
    expect(onyx.density).toBe("spacious")
    expect(parseInt(onyx.spacing.pagePadding)).toBe(32)
    expect(parseInt(onyx.spacing.sectionGap) % 8).toBe(0)
    expect(parseInt(onyx.spacing.entryGap) % 8).toBe(0)
  })

  it("name 字号 26px（衬线感）", () => {
    expect((v3Onyx as any).typography.name.size).toBe("26px")
  })
})
