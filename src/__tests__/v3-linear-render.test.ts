import { describe, it, expect } from "vitest"
import v3Linear from "../../themes/v3-linear.json"
import generalTemplate from "../../templates/general.json"
import type { V3Theme } from "@/types/visual-template"
import type { ResumeData } from "@/types/resume"
import { renderResumeDocument } from "@/lib/resume-renderer"

const baseData: ResumeData = {
  schemaVersion: 3,
  templateId: "general",
  locale: "en",
  sections: {
    personal: {
      name: "Zhang Ming",
      title: "Senior Software Engineer",
      email: "zhangming@example.com",
      phone: "+86 138-0000-0000",
    },
    summary: { summary: "10 years building distributed systems." },
    experience: {
      entry0_company: "Acme",
      entry0_position: "Tech Lead",
      entry0_startDate: "2020-01",
      entry0_endDate: "2024-12",
      entry0_detail: "Built streaming pipeline\nLed 5 engineers",
      entry0_techStack: "TypeScript, Rust, Go",
    },
    education: {
      entry0_school: "Tsinghua",
      entry0_major: "CS",
      entry0_degree: "Bachelor",
      entry0_startDate: "2012-09",
      entry0_endDate: "2016-07",
    },
    skills: { skills: "TypeScript, Rust, Go" },
  },
} as any

describe("V3 Linear renderer output", () => {
  const theme = v3Linear as V3Theme
  const html = renderResumeDocument(baseData, generalTemplate as any, theme, "Resume")

  it("renderResumeHtml 不抛错", () => {
    expect(html).toBeTruthy()
    expect(html).toContain("<html")
  })

  it("不渲染头像 DOM 元素（hasAvatar=false）", () => {
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
    expect(bodyMatch).toBeTruthy()
    const body = bodyMatch![1]
    expect(body).not.toContain("resume-avatar")
    expect(body).not.toContain("resume-monogram")
    expect(body).not.toContain("<img")
  })

  it("包含姓名 + 标题", () => {
    expect(html).toContain("Zhang Ming")
    expect(html).toContain("Senior Software Engineer")
  })

  it("包含 section title + 短横线 ::after 规则", () => {
    expect(html).toContain("resume-section-title")
    expect(html).toContain("::after")
  })

  it("包含 › bullet 字符", () => {
    expect(html).toContain("›")
  })

  it("包含 tabular-nums 全局 + entry-date", () => {
    expect(html).toContain("font-variant-numeric:tabular-nums")
  })

  it("包含 page-break-inside: avoid 打印规则", () => {
    expect(html).toContain("@media print")
    expect(html).toContain("page-break-inside:avoid")
  })

  it("包含 section 顺序中的关键 section（按 V3 Linear order）", () => {
    const order = theme.sectionOrder
    const htmlLower = html.toLowerCase()
    const personalIdx = htmlLower.indexOf("zhang ming")
    const summaryIdx = htmlLower.indexOf("10 years")
    const experienceIdx = htmlLower.indexOf("acme")
    const educationIdx = htmlLower.indexOf("tsinghua")
    expect(personalIdx).toBeLessThan(summaryIdx)
    expect(summaryIdx).toBeLessThan(experienceIdx)
    expect(experienceIdx).toBeLessThan(educationIdx)
    expect(order.indexOf("personal")).toBeLessThan(order.indexOf("summary"))
    expect(order.indexOf("summary")).toBeLessThan(order.indexOf("experience"))
  })

  it("包含 underline tag 样式", () => {
    expect(html).toContain("border-bottom")
  })
})
