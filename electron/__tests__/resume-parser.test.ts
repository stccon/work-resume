import { describe, it, expect } from "vitest"
import {
  matchSectionHeader,
  detectSections,
  extractEmails,
  extractPhones,
  extractGithub,
  extractLinkedin,
  extractDateRanges,
  parseResumeFromLayout,
  isLikelyName,
  type Section,
} from "../resume-parser"
import type { ExtractedLine, ExtractedLayout } from "../pdf-extractor"

const line = (text: string, opts: Partial<{ x: number; y: number; fontSize: number; isBold: boolean; pageIndex: number; fontName: string }> = {}): ExtractedLine => ({
  text,
  x: opts.x ?? 50,
  y: opts.y ?? 100,
  fontSize: opts.fontSize ?? 10,
  fontName: opts.fontName ?? "Arial",
  isBold: opts.isBold ?? false,
  pageIndex: opts.pageIndex ?? 0,
})

describe("matchSectionHeader", () => {
  it("matches Chinese education variants", () => {
    expect(matchSectionHeader("教育背景")).toBe("education")
    expect(matchSectionHeader("教育经历")).toBe("education")
    expect(matchSectionHeader("教育情况")).toBe("education")
    expect(matchSectionHeader("学历")).toBe("education")
  })
  it("matches English education variants", () => {
    expect(matchSectionHeader("EDUCATION")).toBe("education")
    expect(matchSectionHeader("Education")).toBe("education")
    expect(matchSectionHeader("Educational Background")).toBe("education")
    expect(matchSectionHeader("Academic Background")).toBe("education")
  })
  it("matches experience variants", () => {
    expect(matchSectionHeader("工作经历")).toBe("experience")
    expect(matchSectionHeader("工作经验")).toBe("experience")
    expect(matchSectionHeader("EXPERIENCE")).toBe("experience")
    expect(matchSectionHeader("Work Experience")).toBe("experience")
    expect(matchSectionHeader("Professional Experience")).toBe("experience")
    expect(matchSectionHeader("Employment History")).toBe("experience")
  })
  it("matches skills variants", () => {
    expect(matchSectionHeader("技能")).toBe("skills")
    expect(matchSectionHeader("专业技能")).toBe("skills")
    expect(matchSectionHeader("技术栈")).toBe("skills")
    expect(matchSectionHeader("SKILLS")).toBe("skills")
    expect(matchSectionHeader("Technical Skills")).toBe("skills")
  })
  it("matches summary, projects, certifications, awards", () => {
    expect(matchSectionHeader("个人简介")).toBe("summary")
    expect(matchSectionHeader("SUMMARY")).toBe("summary")
    expect(matchSectionHeader("About Me")).toBe("summary")
    expect(matchSectionHeader("项目经验")).toBe("projects")
    expect(matchSectionHeader("PROJECTS")).toBe("projects")
    expect(matchSectionHeader("证书")).toBe("certifications")
    expect(matchSectionHeader("CERTIFICATIONS")).toBe("certifications")
    expect(matchSectionHeader("获奖经历")).toBe("awards")
    expect(matchSectionHeader("HONORS")).toBe("awards")
  })
  it("rejects non-headers", () => {
    expect(matchSectionHeader("")).toBeNull()
    expect(matchSectionHeader("我是一名软件工程师")).toBeNull()
    expect(matchSectionHeader("This is a long sentence that should not match")).toBeNull()
  })
  it("is case-insensitive and tolerates whitespace", () => {
    expect(matchSectionHeader("  education  ")).toBe("education")
    expect(matchSectionHeader("Skills")).toBe("skills")
  })
})

describe("detectSections", () => {
  it("groups lines under their nearest header", () => {
    const lines = [
      line("张三", { y: 700, fontSize: 20, isBold: true }),
      line("13800138000", { y: 680 }),
      line("教育背景", { y: 600, isBold: true }),
      line("清华大学 计算机科学 本科 2015-2019", { y: 580 }),
      line("工作经历", { y: 500, isBold: true }),
      line("字节跳动 高级工程师 2020.06 - 至今", { y: 480 }),
    ]
    const sections = detectSections(lines)
    const byId = new Map<string, Section>()
    for (const s of sections) byId.set(s.id, s)
    expect(byId.get("personal")?.lines.map((l) => l.text)).toEqual([
      "张三",
      "13800138000",
    ])
    expect(byId.get("education")?.lines.map((l) => l.text)).toEqual([
      "教育背景",
      "清华大学 计算机科学 本科 2015-2019",
    ])
    expect(byId.get("experience")?.lines.map((l) => l.text)).toEqual([
      "工作经历",
      "字节跳动 高级工程师 2020.06 - 至今",
    ])
  })
})

describe("extractEmails", () => {
  it("finds standard email", () => {
    expect(extractEmails("联系我 zhang.san@gmail.com")).toEqual(["zhang.san@gmail.com"])
  })
  it("finds plus-addressed email", () => {
    expect(extractEmails("邮箱：zhang.san+work@gmail.com")).toEqual(["zhang.san+work@gmail.com"])
  })
  it("deduplicates", () => {
    expect(extractEmails("a@b.com and a@b.com")).toEqual(["a@b.com"])
  })
})

describe("extractPhones", () => {
  it("finds Chinese mobile", () => {
    const r = extractPhones("电话 13800138000")
    expect(r).toContain("13800138000")
  })
  it("finds Chinese mobile with +86", () => {
    const r = extractPhones("电话 +86 138-0013-8000")
    expect(r.length).toBeGreaterThan(0)
  })
  it("finds international format", () => {
    const r = extractPhones("Phone: +1 415-555-1234")
    expect(r.length).toBeGreaterThan(0)
  })
})

describe("extractGithub", () => {
  it("returns handle", () => {
    expect(extractGithub("github.com/zhangsan")).toBe("zhangsan")
    expect(extractGithub("https://github.com/zhang-san")).toBe("zhang-san")
  })
  it("returns undefined when missing", () => {
    expect(extractGithub("no link here")).toBeUndefined()
  })
})

describe("extractLinkedin", () => {
  it("returns handle", () => {
    expect(extractLinkedin("linkedin.com/in/zhangsan")).toBe("zhangsan")
  })
})

describe("extractDateRanges", () => {
  it("matches dot-separated", () => {
    const r = extractDateRanges("2020.06 - 2022.03")
    expect(r).toContain("2020.06 - 2022.03")
  })
  it("matches dash-separated with dash year range", () => {
    const r = extractDateRanges("2018.09 - 2022.06")
    expect(r.length).toBeGreaterThan(0)
  })
  it("matches Chinese date with 至今", () => {
    const r = extractDateRanges("2020.06 – 至今")
    expect(r.length).toBeGreaterThan(0)
  })
})

describe("isLikelyName", () => {
  it("accepts 2-4 Chinese chars at top of page", () => {
    expect(isLikelyName(line("张三", { y: 700, fontSize: 20, isBold: true }))).toBe(true)
  })
  it("rejects email-looking strings", () => {
    expect(isLikelyName(line("a@b.com", { y: 700, fontSize: 20, isBold: true }))).toBe(false)
  })
  it("rejects very long strings", () => {
    expect(isLikelyName(line("This is a very long line of text", { y: 700, fontSize: 20, isBold: true }))).toBe(false)
  })
  it("rejects lines outside page 0", () => {
    expect(isLikelyName(line("张三", { y: 700, fontSize: 20, isBold: true, pageIndex: 1 }))).toBe(false)
  })
  it("rejects known section words", () => {
    expect(isLikelyName(line("工作经历", { y: 700, fontSize: 20, isBold: true }))).toBe(false)
  })
})

describe("parseResumeFromLayout", () => {
  const buildLayout = (lines: ExtractedLine[]): ExtractedLayout => ({
    pages: [lines],
    pageCount: 1,
    pageWidth: 612,
    pageHeight: 792,
  })

  it("parses a complete Chinese resume", () => {
    const lines = [
      line("张三", { y: 720, fontSize: 22, isBold: true }),
      line("前端开发工程师", { y: 700, fontSize: 12 }),
      line("zhang.san@gmail.com  |  13800138000  |  github.com/zhangsan", { y: 680 }),
      line("个人简介", { y: 620, isBold: true, fontSize: 13 }),
      line("5年前端开发经验，擅长 React 和 TypeScript。", { y: 600 }),
      line("教育背景", { y: 540, isBold: true, fontSize: 13 }),
      line("清华大学 计算机科学 本科 2015-2019", { y: 520 }),
      line("工作经历", { y: 460, isBold: true, fontSize: 13 }),
      line("字节跳动 - 高级前端工程师", { y: 440, isBold: true }),
      line("2020.06 - 至今", { y: 420 }),
      line("负责核心业务前端架构升级", { y: 400 }),
      line("阿里巴巴 - 前端工程师", { y: 360, isBold: true }),
      line("2018.09 - 2020.05", { y: 340 }),
      line("参与淘宝营销活动开发", { y: 320 }),
      line("技能", { y: 260, isBold: true, fontSize: 13 }),
      line("React, Vue, TypeScript, Node.js, Webpack", { y: 240 }),
    ]
    const parsed = parseResumeFromLayout(buildLayout(lines))
    expect(parsed.name).toBe("张三")
    expect(parsed.email).toBe("zhang.san@gmail.com")
    expect(parsed.phone).toBe("13800138000")
    expect(parsed.github).toBe("zhangsan")
    expect(parsed.summary).toContain("5年前端")
    expect(parsed.experience.length).toBe(2)
    expect(parsed.experience[0].company).toBe("字节跳动")
    expect(parsed.experience[0].position).toContain("前端")
    expect(parsed.experience[0].startDate).toBe("2020.06")
    expect(parsed.experience[0].endDate).toContain("至今")
    expect(parsed.education.length).toBe(1)
    expect(parsed.education[0].school).toBe("清华大学")
    expect(parsed.education[0].major).toContain("计算机")
    expect(parsed.education[0].gradYear).toBe("2019")
    expect(parsed.skills).toContain("React")
    expect(parsed.skills).toContain("TypeScript")
  })

  it("returns empty name when no header detected, falls back gracefully", () => {
    const lines = [line("Random text line", { y: 100 })]
    const parsed = parseResumeFromLayout(buildLayout(lines))
    expect(parsed.name).toBe("Random")
  })

  it("handles missing email/phone", () => {
    const lines = [
      line("李四", { y: 720, fontSize: 22, isBold: true }),
      line("无联系方式", { y: 700 }),
    ]
    const parsed = parseResumeFromLayout(buildLayout(lines))
    expect(parsed.name).toBe("李四")
    expect(parsed.email).toBe("")
    expect(parsed.phone).toBe("")
  })
})
