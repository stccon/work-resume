import { describe, it, expect } from "vitest"
import v3Mono from "../../themes/v3-mono.json"
import generalTemplate from "../../templates/general.json"
import type { V3Theme } from "@/types/visual-template"
import type { ResumeData } from "@/types/resume"
import { renderResumeDocument } from "@/lib/resume-renderer"

const baseData: ResumeData = {
  schemaVersion: 3,
  template: "general",
  sections: {
    personal: {
      name: "zhangming",
      title: "backend_swe",
      email: "zhangming@example.com",
    },
    summary: { summary: "compiler/runtime/SRE. 10y." },
    skills: { skills: "Rust, Go, K8s, eBPF, LLVM" },
    experience: {
      entry0_company: "pingcap",
      entry0_position: "staff_eng",
      entry0_startDate: "2020-01",
      entry0_endDate: "2024-12",
      entry0_detail: "TiDB query optimizer",
    },
    education: {
      entry0_school: "SJTU",
      entry0_major: "CS",
      entry0_degree: "BS",
      entry0_startDate: "2010-09",
      entry0_endDate: "2014-07",
    },
  },
} as any

describe("V3 Mono renderer output", () => {
  const theme = v3Mono as V3Theme
  const html = renderResumeDocument(baseData, generalTemplate as any, theme, "zhangming-cv")

  it("renderResumeHtml 不抛错", () => {
    expect(html).toBeTruthy()
  })

  it("等宽字体栈 (JetBrains Mono)", () => {
    expect(html).toContain("JetBrains Mono")
  })

  it("name 24px 等宽", () => {
    expect(html).toContain("font-size:24px")
  })

  it("entry-date 用 mono 字体", () => {
    const entryDate = html.match(/\.resume-entry-date\s*\{[^}]+\}/)
    expect(entryDate).toBeTruthy()
    expect(entryDate![0].toLowerCase()).toContain("mono")
  })

  it("全 tabular-nums", () => {
    expect(html).toContain("font-variant-numeric:tabular-nums")
  })

  it("bullet=›", () => {
    expect(html).toContain("›")
  })

  it("无 sidebar（单栏）", () => {
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
    expect(bodyMatch![1]).not.toContain("resume-two-column")
    expect(bodyMatch![1]).not.toContain("resume-sidebar")
  })

  it("短横线 section title (32px short-line)", () => {
    expect(html).toContain("width:32px")
  })
})
