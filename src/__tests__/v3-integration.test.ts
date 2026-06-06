import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import v3Linear from "../../themes/v3-linear.json"
import v3Onyx from "../../themes/v3-onyx.json"
import v3Editorial from "../../themes/v3-editorial.json"
import v3Mono from "../../themes/v3-mono.json"
import generalTemplate from "../../templates/general.json"
import type { V3Theme } from "@/types/visual-template"
import type { ResumeData } from "@/types/resume"
import { renderResumeDocument } from "@/lib/resume-renderer"

const baseData: ResumeData = {
  schemaVersion: 3,
  template: "general",
  sections: {
    personal: { name: "张", title: "工程师", email: "a@b.com" },
    summary: { summary: "summary" },
    experience: {
      entry0_company: "A", entry0_position: "B",
      entry0_startDate: "2020-01", entry0_endDate: "2024-12",
      entry0_detail: "x",
    },
    skills: { skills: "Rust" },
    education: {
      entry0_school: "S", entry0_major: "M", entry0_degree: "PhD",
      entry0_startDate: "2010-09", entry0_endDate: "2014-07",
    },
  },
} as any

describe("Phase 5.4: 4 V3 主题在 VisualThemePicker 中", () => {
  it("themes/index.ts 至少 4 个 V3 主题注册", async () => {
    const { getAllVisualThemes } = await import("../../themes")
    const all = getAllVisualThemes()
    const names = all.map((t) => t.name)
    expect(names).toContain("v3-linear")
    expect(names).toContain("v3-onyx")
    expect(names).toContain("v3-editorial")
    expect(names).toContain("v3-mono")
  })
})

describe("Phase 5.6: v3-onyx (hasAvatar=true) 无头像时 monogram 占位", () => {
  it("renderResumeDocument v3-onyx 时, body 含 monogram span", () => {
    const html = renderResumeDocument(baseData, generalTemplate as any, v3Onyx as V3Theme, "t")
    const body = html.match(/<body>([\s\S]*)<\/body>/)![1]
    expect(body).toMatch(/resume-monogram/)
    expect(body).not.toContain("<img")
  })
})

describe("Phase 5.7: hasAvatar=false 主题下 toggle 禁用", () => {
  it("v3-linear 主题被切换时, ResumeNamePill 禁用 toggle", () => {
    const pillSource = readFileSync(resolve(__dirname, "../components/ResumeNamePill.tsx"), "utf-8")
    expect(pillSource).toContain("themeHasAvatar")
    expect(pillSource).toContain("disabled={!themeHasAvatar}")
  })
})

describe("Phase 5.8: section 顺序按 theme.sectionOrder", () => {
  it("v3-linear order: personal → summary → experience → skills", () => {
    const html = renderResumeDocument(baseData, generalTemplate as any, v3Linear as V3Theme, "t")
    const order = (v3Linear as any).sectionOrder as string[]
    expect(order.indexOf("personal")).toBeLessThan(order.indexOf("summary"))
    expect(order.indexOf("summary")).toBeLessThan(order.indexOf("experience"))
    expect(order.indexOf("experience")).toBeLessThan(order.indexOf("skills"))
    const positions = {
      personal: html.indexOf("个人信息"),
      summary: html.indexOf("个人简介"),
      experience: html.indexOf("工作经历"),
      skills: html.indexOf("专业技能"),
    }
    expect(positions.personal).toBeLessThan(positions.summary)
    expect(positions.summary).toBeLessThan(positions.experience)
    expect(positions.experience).toBeLessThan(positions.skills)
  })

  it("v3-onyx order: sidebar=personal+skills, main=summary+experience+education", () => {
    const html = renderResumeDocument(baseData, generalTemplate as any, v3Onyx as V3Theme, "t")
    const sidebarMatch = html.match(/<div class="resume-sidebar[^"]*">([\s\S]*?)<\/div>\s*<div[^>]*class="resume-main/)
    const mainMatch = html.match(/<div[^>]*class="resume-main[\s\S]*?">([\s\S]*)$/)
    expect(sidebarMatch).toBeTruthy()
    expect(mainMatch).toBeTruthy()
    const sidebar = sidebarMatch![1]
    const main = mainMatch![1].replace(/<\/body>[\s\S]*$/, "")

    expect(sidebar).toContain("个人信息")
    expect(sidebar).toContain("专业技能")
    expect(sidebar.indexOf("个人信息")).toBeLessThan(sidebar.indexOf("专业技能"))

    expect(main).toContain("个人简介")
    expect(main).toContain("工作经历")
    expect(main.indexOf("个人简介")).toBeLessThan(main.indexOf("工作经历"))
  })

  it("v3-editorial order: education 排在 skills 前", () => {
    const html = renderResumeDocument(baseData, generalTemplate as any, v3Editorial as V3Theme, "t")
    expect(html.indexOf("教育背景")).toBeLessThan(html.indexOf("专业技能"))
  })

  it("v3-mono order: skills 排在 experience 前", () => {
    const html = renderResumeDocument(baseData, generalTemplate as any, v3Mono as V3Theme, "t")
    expect(html.indexOf("专业技能")).toBeLessThan(html.indexOf("工作经历"))
  })
})

describe("Phase 5.10: 旧 v1/v2 主题从 VisualThemePicker 消失", () => {
  it("themes/index.ts 不引用 v1/v2 主题名", () => {
    const source = readFileSync(resolve(__dirname, "../../themes/index.ts"), "utf-8")
    const oldThemeNames = [
      "elegant-blue", "graphite", "emerald-sidebar", "amber-header",
      "basalt", "glacier",
      "v2-modern-pro", "v2-editorial", "v2-executive-sidebar",
      "v2-tech-blueprint", "v2-academic-serif", "v2-warm-earth",
      "v2-typst-monospace", "v2-minimal-mono",
    ]
    for (const name of oldThemeNames) {
      expect(source).not.toContain(name)
    }
  })

  it("getAllVisualThemes() 不含任何 v1/v2 主题", async () => {
    const { getAllVisualThemes } = await import("../../themes")
    const all = getAllVisualThemes()
    const oldThemeNames = [
      "elegant-blue", "graphite", "emerald-sidebar", "amber-header",
      "basalt", "glacier",
      "v2-modern-pro", "v2-editorial", "v2-executive-sidebar",
      "v2-tech-blueprint", "v2-academic-serif", "v2-warm-earth",
      "v2-typst-monospace", "v2-minimal-mono",
    ]
    for (const name of oldThemeNames) {
      expect(all.find((t) => t.name === name)).toBeUndefined()
    }
  })
})

describe("Phase 5.11: 旧 v1/v2 主题归档文件仍在 themes/_archived_v1_v2/", () => {
  it("v1 主题归档文件存在", () => {
    const v1 = ["elegant-blue", "graphite", "emerald-sidebar", "amber-header", "basalt", "glacier"]
    for (const name of v1) {
      expect(existsSync(resolve(__dirname, `../../themes/_archived_v1_v2/v1/${name}.json`))).toBe(true)
    }
  })
  it("v2 主题归档文件存在", () => {
    const v2 = ["v2-modern-pro", "v2-editorial", "v2-executive-sidebar", "v2-tech-blueprint", "v2-academic-serif", "v2-warm-earth", "v2-typst-monospace", "v2-minimal-mono"]
    for (const name of v2) {
      expect(existsSync(resolve(__dirname, `../../themes/_archived_v1_v2/v2/${name}.json`))).toBe(true)
    }
  })
  it("README.md 存在", () => {
    expect(existsSync(resolve(__dirname, "../../themes/_archived_v1_v2/README.md"))).toBe(true)
  })
})

describe("Phase 5.9: 4 V3 主题都能成功渲染（PDF 等同 HTML 渲染）", () => {
  it("4 主题都返回有效 HTML", () => {
    for (const theme of [v3Linear, v3Onyx, v3Editorial, v3Mono] as V3Theme[]) {
      const html = renderResumeDocument(baseData, generalTemplate as any, theme, "t")
      expect(html).toMatch(/^<!DOCTYPE html>/)
      expect(html).toContain("<style>")
      expect(html).toContain("</html>")
    }
  })
})
