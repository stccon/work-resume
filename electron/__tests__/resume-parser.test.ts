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
  isHeaderLine,
  splitByBlocks,
  findBlockHeaderLine,
  computeMedianGap,
  type Section,
} from "../resume-parser"
import type { ExtractedLine, ExtractedLayout } from "../pdf-extractor"

const line = (
  text: string,
  opts: Partial<{
    x: number
    y: number
    fontSize: number
    isBold: boolean
    pageIndex: number
    fontName: string
    isCommonFont: boolean
    yGapBefore: number
    isShortLine: boolean
  }> = {},
): ExtractedLine => ({
  text,
  x: opts.x ?? 50,
  y: opts.y ?? 100,
  fontSize: opts.fontSize ?? 10,
  fontName: opts.fontName ?? "Arial",
  isBold: opts.isBold ?? false,
  pageIndex: opts.pageIndex ?? 0,
  isCommonFont: opts.isCommonFont,
  yGapBefore: opts.yGapBefore,
  isShortLine: opts.isShortLine,
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
  it("matches highlights variants", () => {
    expect(matchSectionHeader("个人优势")).toBe("highlights")
    expect(matchSectionHeader("核心竞争力")).toBe("highlights")
    expect(matchSectionHeader("自我评价")).toBe("highlights")
    expect(matchSectionHeader("KEY STRENGTHS")).toBe("highlights")
    expect(matchSectionHeader("HIGHLIGHTS")).toBe("highlights")
    expect(matchSectionHeader("CORE COMPETENCIES")).toBe("highlights")
  })
  it("matches internship variants", () => {
    expect(matchSectionHeader("实习经历")).toBe("internship")
    expect(matchSectionHeader("实习经验")).toBe("internship")
    expect(matchSectionHeader("INTERNSHIP")).toBe("internship")
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
    expect(parsed.education[0].endDate).toBe("2019")
    expect(parsed.skills).toContain("React")
    expect(parsed.skills).toContain("TypeScript")
  })

  it("parses personal advantages, project experience and education GPA", () => {
    const lines = [
      line("李四", { y: 720, fontSize: 22, isBold: true }),
      line("后端工程师", { y: 700, fontSize: 12 }),
      line("li.si@outlook.com  |  13900139000  |  linkedin.com/in/lisi  |  北京", { y: 680 }),
      line("个人优势", { y: 620, isBold: true, fontSize: 13 }),
      line("8 年后端架构经验", { y: 600 }),
      line("主导过日均 10 亿请求的系统", { y: 580 }),
      line("项目经历", { y: 540, isBold: true, fontSize: 13 }),
      line("电商订单系统重构", { y: 520, isBold: true }),
      line("技术负责人", { y: 510, isBold: true }),
      line("2022.03 - 2023.08", { y: 500 }),
      line("将订单处理性能提升 50%", { y: 480 }),
      line("技术栈：Java, Spring Cloud, Kafka", { y: 460 }),
      line("教育背景", { y: 400, isBold: true, fontSize: 13 }),
      line("北京大学 软件工程 硕士", { y: 380, isBold: true }),
      line("2018.09 - 2021.06", { y: 360 }),
      line("GPA: 3.8/4.0 排名：前 5%", { y: 340 }),
      line("荣誉：国家奖学金、ACM 区域赛金牌", { y: 320 }),
      line("工作经历", { y: 280, isBold: true, fontSize: 13 }),
      line("字节跳动 · 北京 - 高级工程师", { y: 260, isBold: true }),
      line("2021.07 - 至今", { y: 240 }),
      line("主导核心系统重构", { y: 220 }),
      line("技术栈：Go, gRPC, Kubernetes", { y: 200 }),
    ]
    const parsed = parseResumeFromLayout(buildLayout(lines))
    expect(parsed.name).toBe("李四")
    expect(parsed.email).toBe("li.si@outlook.com")
    expect(parsed.phone).toBe("13900139000")
    expect(parsed.linkedin).toBe("lisi")
    expect(parsed.highlights).toContain("8 年后端")
    expect(parsed.highlights).toContain("10 亿请求")
    expect(parsed.projects.length).toBe(1)
    expect(parsed.projects[0].name).toBe("电商订单系统重构")
    expect(parsed.projects[0].role).toBe("技术负责人")
    expect(parsed.projects[0].startDate).toBe("2022.03")
    expect(parsed.projects[0].endDate).toBe("2023.08")
    expect(parsed.projects[0].description).toContain("性能提升 50%")
    expect(parsed.projects[0].techStack).toContain("Spring Cloud")
    expect(parsed.education.length).toBe(1)
    expect(parsed.education[0].school).toBe("北京大学")
    expect(parsed.education[0].major).toContain("软件工程")
    expect(parsed.education[0].startDate).toBe("2018.09")
    expect(parsed.education[0].endDate).toBe("2021.06")
    expect(parsed.education[0].gpa).toContain("3.8")
    expect(parsed.education[0].honors).toContain("国家奖学金")
    expect(parsed.experience.length).toBe(1)
    expect(parsed.experience[0].company).toBe("字节跳动")
    expect(parsed.experience[0].location).toBe("北京")
    expect(parsed.experience[0].position).toContain("高级工程师")
    expect(parsed.experience[0].techStack).toContain("Kubernetes")
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

describe("isHeaderLine (degraded mode)", () => {
  it("preserves original behavior when degraded=false", () => {
    expect(isHeaderLine(line("Foo", { isBold: true }), false)).toBe(true)
    expect(isHeaderLine(line("Foo", { fontSize: 14 }), false)).toBe(true)
    expect(isHeaderLine(line("Foo"), false)).toBe(false)
    expect(isHeaderLine(line("2020.06 - 至今", { isBold: true }), false)).toBe(false)
  })

  it("matches KNOWN_SECTION_TITLES in degraded mode", () => {
    expect(isHeaderLine(line("工作经历"), true)).toBe(true)
    expect(isHeaderLine(line("教育背景"), true)).toBe(true)
    expect(isHeaderLine(line("Education"), true)).toBe(true)
  })

  it("matches rare-font short lines in degraded mode", () => {
    expect(
      isHeaderLine(
        line("字节跳动", { fontName: "g_d0_f5", isShortLine: true, isCommonFont: false }),
        true,
      ),
    ).toBe(true)
  })

  it("rejects common-font short lines in degraded mode (body text)", () => {
    expect(
      isHeaderLine(
        line("这是普通的正文内容", { fontName: "g_d0_f1", isCommonFont: true, isShortLine: true }),
        true,
      ),
    ).toBe(false)
  })

  it("matches lines with large yGapBefore in degraded mode", () => {
    expect(
      isHeaderLine(
        line("字节跳动", { isShortLine: true, yGapBefore: 100 }),
        true,
      ),
    ).toBe(true)
    expect(
      isHeaderLine(
        line("字节跳动", { isShortLine: true, yGapBefore: 5 }),
        true,
      ),
    ).toBe(false)
  })
})

describe("splitByBlocks (degraded mode)", () => {
  it("keeps original behavior when degraded=false", () => {
    const lines = [
      line("字节跳动", { y: 460, isBold: true }),
      line("负责核心业务", { y: 440 }),
      line("阿里巴巴", { y: 360, isBold: true }),
      line("参与淘宝营销", { y: 340 }),
    ]
    const blocks = splitByBlocks(lines, false, 0)
    expect(blocks).toHaveLength(1)
  })

  it("splits on rare-font short line in degraded mode", () => {
    const lines = [
      line("字节跳动", { y: 460, isCommonFont: false, isShortLine: true }),
      line("负责核心业务", { y: 440, isCommonFont: true, isShortLine: false }),
      line("阿里巴巴", { y: 360, isCommonFont: false, isShortLine: true }),
      line("参与淘宝营销", { y: 340, isCommonFont: true, isShortLine: false }),
    ]
    const blocks = splitByBlocks(lines, true, 20)
    expect(blocks).toHaveLength(2)
    expect(blocks[0][0].text).toBe("字节跳动")
    expect(blocks[1][0].text).toBe("阿里巴巴")
  })

  it("splits on Y-gap break in degraded mode", () => {
    const lines = [
      line("字节跳动", { y: 460, isCommonFont: true, isShortLine: true }),
      line("负责核心业务", { y: 440, isCommonFont: true, isShortLine: false }),
      line("阿里巴巴", { y: 360, isCommonFont: true, isShortLine: true, yGapBefore: 50 }),
      line("参与淘宝营销", { y: 340, isCommonFont: true, isShortLine: false }),
    ]
    const blocks = splitByBlocks(lines, true, 20)
    expect(blocks).toHaveLength(2)
  })

  it("does not split in non-degraded mode even with large Y-gap", () => {
    const lines = [
      line("字节跳动", { y: 460, isBold: true }),
      line("负责核心业务", { y: 440 }),
      line("阿里巴巴", { y: 360, isBold: true, yGapBefore: 50 }),
      line("参与淘宝营销", { y: 340 }),
    ]
    const blocks = splitByBlocks(lines, false, 20)
    expect(blocks).toHaveLength(1)
  })
})

describe("findBlockHeaderLine (4-tier fallback)", () => {
  it("returns isBold line first", () => {
    const block = [
      line("普通行"),
      line("加粗行", { isBold: true }),
      line("另一行"),
    ]
    const header = findBlockHeaderLine(block, true)
    expect(header?.text).toBe("加粗行")
  })

  it("falls back to rare-font short line in degraded mode", () => {
    const block = [
      line("普通行1", { isCommonFont: true, isShortLine: false }),
      line("稀有字体", { isCommonFont: false, isShortLine: true }),
      line("另一行", { isCommonFont: true, isShortLine: false }),
    ]
    const header = findBlockHeaderLine(block, true)
    expect(header?.text).toBe("稀有字体")
  })

  it("falls back to KNOWN_SECTION_TITLES in degraded mode", () => {
    const block = [
      line("普通行", { isCommonFont: true, isShortLine: false }),
      line("工作经历", { isCommonFont: true, isShortLine: true }),
    ]
    const header = findBlockHeaderLine(block, true)
    expect(header?.text).toBe("工作经历")
  })

  it("falls back to block[0] when no signal matches", () => {
    const block = [
      line("第一行", { isCommonFont: true, isShortLine: false }),
      line("第二行", { isCommonFont: true, isShortLine: false }),
    ]
    const header = findBlockHeaderLine(block, true)
    expect(header?.text).toBe("第一行")
  })

  it("does not use rare-font fallback when degraded=false", () => {
    const block = [
      line("普通行1", { isCommonFont: true }),
      line("稀有字体", { isCommonFont: false, isShortLine: true }),
    ]
    const header = findBlockHeaderLine(block, false)
    expect(header?.text).toBe("普通行1")
  })
})

describe("computeMedianGap", () => {
  it("returns 0 for less than 2 lines", () => {
    expect(computeMedianGap([])).toBe(0)
    expect(computeMedianGap([line("foo", { y: 100 })])).toBe(0)
  })

  it("returns median y-delta across same-page lines", () => {
    const lines = [
      line("A", { y: 300 }),
      line("B", { y: 280 }),
      line("C", { y: 260 }),
    ]
    expect(computeMedianGap(lines)).toBe(20)
  })

  it("ignores page breaks", () => {
    const lines = [
      line("A", { y: 300, pageIndex: 0 }),
      line("B", { y: 200, pageIndex: 1 }),
      line("C", { y: 180, pageIndex: 1 }),
    ]
    expect(computeMedianGap(lines)).toBe(20)
  })
})

describe("parseResumeFromLayout (degraded mode end-to-end)", () => {
  const buildDegradedLayout = (lines: ExtractedLine[]): ExtractedLayout => ({
    pages: [lines],
    pageCount: 1,
    pageWidth: 612,
    pageHeight: 792,
    degraded: true,
    commonFontName: "g_d0_f1",
  })

  it("parses experience entries using rare-font short line as header", () => {
    const lines = [
      line("黄宇程", { y: 720, isCommonFont: false, isShortLine: true }),
      line("huang@example.com | 13800138000", { y: 700, isCommonFont: true }),
      line("工作经历", { y: 620, isCommonFont: false, isShortLine: true }),
      line("字节跳动 - 高级工程师", { y: 600, isCommonFont: false, isShortLine: true }),
      line("2020.06 - 至今", { y: 580, isCommonFont: true }),
      line("负责核心系统", { y: 560, isCommonFont: true }),
      line("阿里巴巴 - 后端工程师", { y: 480, isCommonFont: false, isShortLine: true }),
      line("2018.09 - 2020.05", { y: 460, isCommonFont: true }),
      line("参与淘宝营销", { y: 440, isCommonFont: true }),
    ]
    const parsed = parseResumeFromLayout(buildDegradedLayout(lines))
    expect(parsed.name).toBe("黄宇程")
    expect(parsed.email).toBe("huang@example.com")
    expect(parsed.phone).toBe("13800138000")
    expect(parsed.experience.length).toBe(2)
    expect(parsed.experience[0].company).toBe("字节跳动")
    expect(parsed.experience[0].position).toContain("高级工程师")
    expect(parsed.experience[1].company).toBe("阿里巴巴")
  })

  it("preserves non-degraded mode behavior", () => {
    const layout: ExtractedLayout = {
      pages: [[
        line("张三", { y: 720, isBold: true }),
        line("zhang.san@gmail.com | 13800138000", { y: 700 }),
        line("工作经历", { y: 620, isBold: true, fontSize: 13 }),
        line("字节跳动 - 高级工程师", { y: 600, isBold: true }),
        line("2020.06 - 至今", { y: 580 }),
      ]],
      pageCount: 1,
      pageWidth: 612,
      pageHeight: 792,
    }
    const parsed = parseResumeFromLayout(layout)
    expect(parsed.experience.length).toBeGreaterThan(0)
  })
})
