import { describe, it, expect } from "vitest"
import v3Editorial from "../../themes/v3-editorial.json"
import generalTemplate from "../../templates/general.json"
import type { V3Theme } from "@/types/visual-template"
import type { ResumeData } from "@/types/resume"
import { renderResumeDocument } from "@/lib/resume-renderer"

const baseData: ResumeData = {
  schemaVersion: 3,
  template: "general",
  sections: {
    personal: {
      name: "周明",
      title: "高级内容策略师",
      email: "zhouming@example.com",
    },
    summary: { summary: "8 年内容产品经验，专注长篇叙事与品牌故事。" },
    experience: {
      entry0_company: "单向街",
      entry0_position: "内容总监",
      entry0_startDate: "2019-04",
      entry0_endDate: "至今",
      entry0_detail: "负责品牌叙事与出版合作",
    },
    education: {
      entry0_school: "北京大学",
      entry0_major: "中文系",
      entry0_degree: "硕士",
      entry0_startDate: "2011-09",
      entry0_endDate: "2014-07",
    },
    skills: { skills: "长篇写作、编辑、品牌叙事" },
  },
} as any

describe("V3 Editorial renderer output", () => {
  const theme = v3Editorial as V3Theme
  const html = renderResumeDocument(baseData, generalTemplate as any, theme, "周明-内容策略")

  it("renderResumeHtml 不抛错", () => {
    expect(html).toBeTruthy()
  })

  it("name 38px", () => {
    expect(html).toContain("font-size:38px")
  })

  it("衬线字体栈 (Source Serif Pro)", () => {
    expect(html).toContain("Source Serif Pro")
  })

  it("暖白底色 #fefdfb", () => {
    expect(html).toContain("#fefdfb")
  })

  it("棕红 accent #a85432", () => {
    expect(html).toContain("#a85432")
  })

  it("full-line section title 规则", () => {
    expect(html).toContain("100%")
  })

  it("• bullet 字符", () => {
    expect(html).toContain("•")
  })

  it("无 sidebar / 无头像（单栏无头像）", () => {
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
    const body = bodyMatch![1]
    expect(body).not.toContain("resume-two-column")
    expect(body).not.toContain("resume-sidebar")
    expect(body).not.toContain("<img")
  })

  it("pagePadding 64px", () => {
    expect(html).toContain("padding:64px")
  })
})
