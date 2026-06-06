import { describe, it, expect } from "vitest"
import v3Onyx from "../../themes/v3-onyx.json"
import generalTemplate from "../../templates/general.json"
import type { V3Theme } from "@/types/visual-template"
import type { ResumeData } from "@/types/resume"
import { renderResumeDocument } from "@/lib/resume-renderer"

const baseData: ResumeData = {
  schemaVersion: 3,
  template: "general",
  sections: {
    personal: {
      name: "李建国",
      title: "首席技术官",
      email: "jianguo@example.com",
      phone: "+86 138-0000-0000",
    },
    summary: { summary: "15 年互联网技术管理经验，主导过多个亿级用户产品。" },
    skills: { skills: "战略规划、团队管理、分布式架构、产品创新" },
    experience: {
      entry0_company: "字节跳动",
      entry0_position: "VP of Engineering",
      entry0_startDate: "2018-03",
      entry0_endDate: "至今",
      entry0_detail: "主导抖音电商后端架构，团队规模 200+",
      entry0_techStack: "Go, Kubernetes, Kafka",
    },
    education: {
      entry0_school: "清华大学",
      entry0_major: "计算机科学",
      entry0_degree: "硕士",
      entry0_startDate: "2003-09",
      entry0_endDate: "2008-07",
    },
  },
} as any

describe("V3 Onyx renderer output", () => {
  const theme = v3Onyx as V3Theme
  const html = renderResumeDocument(baseData, generalTemplate as any, theme, "李建国-CTO")

  it("renderResumeHtml 不抛错", () => {
    expect(html).toBeTruthy()
    expect(html).toContain("<html")
  })

  it("渲染双栏布局", () => {
    expect(html).toContain("resume-two-column")
    expect(html).toContain("resume-sidebar")
  })

  it("有头像数据时渲染 monogram 或 img 元素", () => {
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
    const body = bodyMatch![1]
    expect(body).toMatch(/(resume-avatar|resume-monogram)/)
  })

  it("包含侧边栏 background navy 色", () => {
    expect(html).toContain("#0f1d2e")
  })

  it("包含金色 accent (#c9a86a)", () => {
    expect(html).toContain("#c9a86a")
  })

  it("包含 — bullet", () => {
    expect(html).toContain("—")
  })

  it("包含 sidebar-tag flat 样式 (background+color)", () => {
    expect(html).toMatch(/resume-sidebar[\s\S]*?resume-tag/)
  })

  it("section 顺序: personal+summary+skills 排在 experience 前", () => {
    const order = theme.sectionOrder
    expect(order.indexOf("personal")).toBeLessThan(order.indexOf("experience"))
    expect(order.indexOf("summary")).toBeLessThan(order.indexOf("experience"))
    expect(order.indexOf("skills")).toBeLessThan(order.indexOf("experience"))
  })

  it("name 用 26px", () => {
    expect(html).toContain("font-size:26px")
  })

  it("pagePadding 32px", () => {
    expect(html).toContain("padding:32px")
  })
})
