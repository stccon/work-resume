import type { ExtractedLine, ExtractedLayout } from "./pdf-extractor"
import { KNOWN_SECTION_TITLES } from "./pdf-extractor"

export interface ParsedExperience {
  company?: string
  position?: string
  location?: string
  startDate?: string
  endDate?: string
  achievements?: string
  techStack?: string
  projects?: string
  teamSize?: string
  responsibilities?: string
}

export interface ParsedProject {
  name?: string
  role?: string
  startDate?: string
  endDate?: string
  description?: string
  techStack?: string
  link?: string
  highlights?: string
}

export interface ParsedEducation {
  school?: string
  major?: string
  degree?: string
  startDate?: string
  endDate?: string
  gpa?: string
  honors?: string
  coursework?: string
  location?: string
}

export interface ParsedResume {
  name: string
  email: string
  phone: string
  location?: string
  title?: string
  github?: string
  linkedin?: string
  website?: string
  summary?: string
  highlights?: string
  skills: string[]
  languages?: string
  frameworks?: string
  databases?: string
  cloud?: string
  experience: ParsedExperience[]
  projects: ParsedProject[]
  education: ParsedEducation[]
  certifications?: string
  awards?: string
  publications?: string
}

export type SectionId =
  | "personal"
  | "summary"
  | "highlights"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "internship"
  | "certifications"
  | "awards"
  | "publications"
  | "other"

export interface Section {
  id: SectionId
  lines: ExtractedLine[]
}

const SECTION_PATTERNS: Record<Exclude<SectionId, "personal">, RegExp[]> = {
  highlights: [
    /^[\s【\[]?(个人|自我|核心|关键|主要|突出)(优势|亮点|核心竞争力|特长|能力|卖点)[\s】\]]?$/i,
    /^[\s【\[]?(核心|关键)?竞争力[\s】\]]?$/i,
    /^[\s【\[]?(自我|个人)(评价|陈述|介绍)[\s】\]]?$/i,
    /^KEY\s+STRENGTHS?$/i,
    /^HIGHLIGHTS?$/i,
    /^CORE\s+COMPETENCIES$/i,
    /^STRENGTHS?$/i,
    /^个人优势$/,
    /^核心竞争力$/,
    /^个人特长$/,
    /^自我评价$/,
    /^个人评价$/,
  ],
  summary: [
    /^[\s【\[]?个人?(简介|介绍|陈述)[\s】\]]?$/i,
    /^SUMMARY$/i,
    /^ABOUT(\s+ME)?$/i,
    /^PROFILE$/i,
    /^OBJECTIVE$/i,
    /^职业目标$/,
    /^自我介绍$/,
  ],
  experience: [
    /^[\s【\[]?(工作|职业|从业)(经历|经验|概要|历史)?[\s】\]]?$/i,
    /^EXPERIENCE$/i,
    /^WORK(\s+EXPERIENCE)?$/i,
    /^PROFESSIONAL(\s+EXPERIENCE)?$/i,
    /^EMPLOYMENT(\s+HISTORY)?$/i,
    /^CAREER(\s+HISTORY)?$/i,
  ],
  internship: [
    /^[\s【\[]?(实习|实践)(经历|经验)?[\s】\]]?$/i,
    /^INTERNSHIPS?(\s+EXPERIENCE)?$/i,
  ],
  education: [
    /^[\s【\[]?教育(背景|经历|情况|简历|信息)?[\s】\]]?$/i,
    /^EDUCATION(AL)?(\s+BACKGROUND)?$/i,
    /^ACADEMIC(\s+BACKGROUND)?$/i,
    /^学历$/,
  ],
  skills: [
    /^[\s【\[]?(专业|技术|核心|关键|主要)?(技能|能力|专长|栈|工具|素养)[\s】\]]?$/i,
    /^SKILLS?$/i,
    /^TECHNICAL(\s+SKILLS?)?$/i,
    /^EXPERTISE$/i,
    /^PROFICIENCIES$/i,
    /^技术栈$/,
  ],
  projects: [
    /^[\s【\[]?(项目|个人|相关|关键|主要|代表)(经验|经历|展示|实践|案例)[\s】\]]?$/i,
    /^PROJECTS?$/i,
    /^PERSONAL(\s+PROJECTS?)?$/i,
    /^KEY(\s+PROJECTS?)?$/i,
    /^PROJECT(\s+EXPERIENCE)?$/i,
    /^项目作品$/,
  ],
  certifications: [
    /^[\s【\[]?(证书|资格|资质|执照|培训|认证)(与培训)?[\s】\]]?$/i,
    /^CERTIFICATIONS?$/i,
    /^LICENSES?(\s+(&|AND)\s+CERTIFICATIONS?)?$/i,
    /^PROFESSIONAL(\s+DEVELOPMENT)?$/i,
  ],
  awards: [
    /^(获奖|荣誉|奖项|奖励|成就)(经历|情况|记录|列表)?$/i,
    /^AWARDS?$/i,
    /^HONORS?(?:\s*&\s*AWARDS?)?$/i,
    /^ACHIEVEMENTS?$/i,
    /^个人荣誉$/,
  ],
  publications: [
    /^[\s【\[]?(发表|出版|论文|刊物|研究成果|著作)[\s】\]]?$/i,
    /^PUBLICATIONS?$/i,
    /^RESEARCH(\s+EXPERIENCE)?$/i,
    /^PAPERS?$/i,
  ],
  other: [],
}

export function matchSectionHeader(text: string): SectionId | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.length > 30) return null
  const normalized = trimmed.replace(/\s+/g, "")
  for (const [id, patterns] of Object.entries(SECTION_PATTERNS) as [SectionId, RegExp[]][]) {
    if (id === "other") continue
    for (const re of patterns) {
      if (re.test(trimmed) || re.test(normalized)) return id
    }
  }
  return null
}

export function detectSections(lines: ExtractedLine[]): Section[] {
  const sections: Section[] = []
  let current: Section = { id: "personal", lines: [] }
  for (const line of lines) {
    const headerId = matchSectionHeader(line.text)
    if (headerId) {
      if (current.lines.length > 0 || current.id !== "personal") sections.push(current)
      current = { id: headerId, lines: [line] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.length > 0 || current.id !== "personal") sections.push(current)
  return sections
}

export const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
export const PHONE_CN_RE = /(?:(?:\+|00)?86[-\s]?)?1[3-9]\d{9}/g
export const PHONE_INTL_RE = /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g
export const GITHUB_RE = /github\.com\/([\w-]+)/i
export const LINKEDIN_RE = /linkedin\.com\/in\/([\w-]+)/i
export const BEHANCE_RE = /behance\.net\/([\w-]+)/i
export const URL_RE = /https?:\/\/[\w.-]+/g

const DATE_TOKEN =
  "(?:(?:19|20)\\d{2}(?:[\\.\\-\\/.年]\\s*(?:1[0-2]|0?[1-9])月?)?|至今|现在|present|current|now)"
export const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*[-–—~至到]\\s*(${DATE_TOKEN})`,
  "gi",
)
export const SINGLE_DATE_RE = new RegExp(`(${DATE_TOKEN})`, "gi")

const LOCATION_PATTERNS = [
  /(?:工作地|工作地点|地点|address)\s*[：:=]?\s*([\u4e00-\u9fa5A-Za-z\s·,，]+?)(?:\n|$)/i,
  /·\s*([\u4e00-\u9fa5A-Za-z\s]+(?:市|省|区|州|县))/,
  /\s[\|·]\s*([\u4e00-\u9fa5A-Za-z]+(?:市|省|区|州|县|Remote|remote|on\s*site))/,
]

const GPA_RE = /(?:GPA|平均学分绩点|均绩|绩点)\s*[：:=]?\s*([0-9./]+(?:\s*\/\s*[0-9.]+)?(?:\s*\(?前?\s*\d+%\)?)?)/i

export function extractEmails(text: string): string[] {
  return Array.from(new Set(text.match(EMAIL_RE) || []))
}

export function extractPhones(text: string): string[] {
  const cn = text.match(PHONE_CN_RE) || []
  const intl = (text.match(PHONE_INTL_RE) || []).filter((p) => p.replace(/\D/g, "").length >= 7)
  const merged = [...cn, ...intl]
  return Array.from(new Set(merged))
}

export function extractGithub(text: string): string | undefined {
  return text.match(GITHUB_RE)?.[1]
}

export function extractLinkedin(text: string): string | undefined {
  return text.match(LINKEDIN_RE)?.[1]
}

export function extractWebsite(text: string): string | undefined {
  const urls = text.match(URL_RE) || []
  const filtered = urls.filter((u) => !/github\.com|linkedin\.com|behance\.net/i.test(u))
  return filtered[0]
}

export function extractDateRanges(text: string): string[] {
  return Array.from(new Set(text.match(DATE_RANGE_RE) || []))
}

export function isLikelyName(line: ExtractedLine): boolean {
  if (line.pageIndex !== 0) return false
  if (line.y < 200) return false
  const t = line.text.trim()
  if (t.length < 2 || t.length > 20) return false
  if (EMAIL_RE.test(t) || PHONE_CN_RE.test(t) || URL_RE.test(t)) {
    EMAIL_RE.lastIndex = 0
    PHONE_CN_RE.lastIndex = 0
    URL_RE.lastIndex = 0
    return false
  }
  EMAIL_RE.lastIndex = 0
  PHONE_CN_RE.lastIndex = 0
  URL_RE.lastIndex = 0
  if (/^(摘要|简介|教育|工作|技能|项目|证书|个人|获奖|荣誉|奖项|奖励|成就|优势|亮点|特长)/i.test(t)) return false
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(t)) return true
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(t)) return true
  if (line.isBold || line.fontSize >= 14) return true
  return false
}

export function isHeaderLine(line: ExtractedLine, degraded: boolean = false): boolean {
  const hasDate = DATE_RANGE_RE.test(line.text)
  DATE_RANGE_RE.lastIndex = 0
  if (hasDate) return false
  if (line.isBold) return true
  if (line.fontSize >= 12) return true
  if (!degraded) return false
  const normalized = line.text.replace(/\s+/g, "")
  if (KNOWN_SECTION_TITLES.has(normalized)) return true
  if (line.isShortLine && line.isCommonFont === false) return true
  if (
    line.isShortLine &&
    typeof line.yGapBefore === "number" &&
    line.yGapBefore >= Y_GAP_HEADER_THRESHOLD
  ) {
    return true
  }
  return false
}

export function computeMedianGap(lines: ExtractedLine[]): number {
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]
    const cur = lines[i]
    if (cur.pageIndex !== prev.pageIndex) continue
    const gap = Math.abs(cur.y - prev.y)
    if (gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return 0
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

const Y_GAP_HEADER_THRESHOLD = 20

export function splitByBlocks(
  lines: ExtractedLine[],
  degraded: boolean = false,
  medianGap: number = 0,
): ExtractedLine[][] {
  const blocks: ExtractedLine[][] = []
  let current: ExtractedLine[] = []
  for (const line of lines) {
    const header = isHeaderLine(line, degraded)
    const yGapBreak =
      degraded &&
      medianGap > 0 &&
      typeof line.yGapBefore === "number" &&
      line.yGapBefore > medianGap * 1.6
    if (header && current.length === 0) {
      current.push(line)
      continue
    }
    if (header || yGapBreak) {
      const hasDate = current.some((l) => DATE_RANGE_RE.test(l.text) || SINGLE_DATE_RE.test(l.text))
      DATE_RANGE_RE.lastIndex = 0
      SINGLE_DATE_RE.lastIndex = 0
      if (hasDate || (degraded && current.length > 0)) {
        if (current.length > 0) blocks.push(current)
        current = [line]
      } else {
        current.push(line)
      }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) blocks.push(current)
  return blocks
}

export function findBlockHeaderLine(
  block: ExtractedLine[],
  degraded: boolean = false,
): ExtractedLine | undefined {
  if (block.length === 0) return undefined
  const byBold = block.find((l) => l.isBold)
  if (byBold) return byBold
  if (degraded) {
    const byRareFont = block.find((l) => l.isCommonFont === false && l.isShortLine)
    if (byRareFont) return byRareFont
    const byKnownTitle = block.find((l) => KNOWN_SECTION_TITLES.has(l.text.replace(/\s+/g, "")))
    if (byKnownTitle) return byKnownTitle
  }
  return block[0]
}

function extractLocation(text: string): string | undefined {
  for (const re of LOCATION_PATTERNS) {
    const m = re.exec(text)
    if (m && m[1]) {
      const loc = m[1].trim()
      if (loc.length > 1 && loc.length < 30) return loc
    }
  }
  return undefined
}

function parseExperienceBlock(block: ExtractedLine[], degraded: boolean = false): ParsedExperience {
  const text = block.map((l) => l.text).join(" | ")
  const result: ParsedExperience = {}
  const rangeRe = new RegExp(DATE_RANGE_RE.source, "i")
  const range = rangeRe.exec(text)
  if (range) {
    result.startDate = range[1]
    result.endDate = range[2]
  }
  const headerLine = findBlockHeaderLine(block, degraded)
  let headerTextForLocation = ""
  if (headerLine) {
    const headerText = headerLine.text
    headerTextForLocation = headerText
    const dashSplit = headerText.split(/\s*[–—\-|·]\s*/)
    if (dashSplit.length >= 3) {
      const middleIdx = 1
      const middle = dashSplit[middleIdx]
      if (/^[\u4e00-\u9fa5]{2,3}$/.test(middle) || /(?:市|省|区|州|县|Remote|remote)/i.test(middle)) {
        result.company = dashSplit.slice(0, middleIdx).join(" - ").trim()
        result.location = middle.trim()
        result.position = dashSplit.slice(middleIdx + 1).join(" - ").trim()
      } else {
        result.company = dashSplit[0].trim()
        result.position = dashSplit.slice(1).join(" - ").trim()
      }
    } else if (dashSplit.length === 2) {
      result.company = dashSplit[0].trim()
      result.position = dashSplit[1].trim()
    } else {
      const atSplit = headerText.split(/\s+(?:at|@|@)\s+/i)
      if (atSplit.length >= 2) {
        result.position = atSplit[0].trim()
        result.company = atSplit[1].trim()
      } else {
        const headerIdx = block.indexOf(headerLine)
        const next = block[headerIdx + 1]
        if (next && (next.isBold || next.fontSize >= 12 || (degraded && next.isShortLine && next.isCommonFont === false))) {
          const nextHasDate = DATE_RANGE_RE.test(next.text)
          DATE_RANGE_RE.lastIndex = 0
          if (!nextHasDate && !/^\d{4}/.test(next.text)) {
            result.company = headerText.trim()
            result.position = next.text.trim()
            headerTextForLocation = `${result.company} - ${result.position}`
          } else {
            result.company = headerText.trim()
          }
        } else {
          result.company = headerText.trim()
        }
      }
    }
  }
  const blockText = block.map((l) => l.text).join("\n")
  if (!result.location) {
    const loc = extractLocation(blockText)
    if (loc) result.location = loc
  }
  const detailLines = block
    .filter((l) => l !== headerLine)
    .map((l) => l.text)
    .join("\n")
  if (detailLines) {
    result.achievements = detailLines
  }
  const techMatch = blockText.match(/(?:技术栈|tech\s*stack|technologies?|技术)\s*[：:]\s*([^\n|]+)/i)
  if (techMatch) result.techStack = techMatch[1].trim()
  const teamMatch = blockText.match(/(?:团队规模|team\s*size|团队)\s*[：:=]?\s*([0-9+~\-人\s]+)/i)
  if (teamMatch) result.teamSize = teamMatch[1].trim()
  return result
}

function parseProjectBlock(block: ExtractedLine[], degraded: boolean = false): ParsedProject {
  const text = block.map((l) => l.text).join(" | ")
  const result: ParsedProject = {}
  const rangeRe = new RegExp(DATE_RANGE_RE.source, "i")
  const range = rangeRe.exec(text)
  if (range) {
    result.startDate = range[1]
    result.endDate = range[2]
  }
  const headerLine = findBlockHeaderLine(block, degraded)
  if (headerLine) {
    const headerText = headerLine.text
    const dashSplit = headerText.split(/\s*[–—\-|·]\s*/)
    if (dashSplit.length >= 2) {
      result.name = dashSplit[0].trim()
      result.role = dashSplit.slice(1).join(" - ").trim()
    } else {
      const atSplit = headerText.split(/\s+(?:at|@|@)\s+/i)
      if (atSplit.length >= 2) {
        result.name = atSplit[1].trim()
        result.role = atSplit[0].trim()
      } else {
        result.name = headerText.trim()
        const headerIdx = block.indexOf(headerLine)
        const next = block[headerIdx + 1]
        if (next && (next.isBold || next.fontSize >= 12 || (degraded && next.isShortLine && next.isCommonFont === false))) {
          const nextHasDate = DATE_RANGE_RE.test(next.text)
          DATE_RANGE_RE.lastIndex = 0
          if (!nextHasDate && !/^\d{4}/.test(next.text)) {
            result.role = next.text.trim()
          }
        }
      }
    }
  }
  const blockText = block.map((l) => l.text).join("\n")
  const linkMatch = blockText.match(/(?:链接|link|github|demo|url)\s*[：:=]?\s*(https?:\/\/\S+)/i)
  if (linkMatch) result.link = linkMatch[1].trim()
  const techMatch = blockText.match(/(?:技术栈|tech\s*stack|technologies?|技术)\s*[：:]\s*([^\n|]+)/i)
  if (techMatch) result.techStack = techMatch[1].trim()
  const detailLines = block
    .filter((l) => l !== headerLine && (!result.role || l.text.trim() !== result.role))
    .map((l) => l.text)
    .join("\n")
  if (detailLines) {
    result.description = detailLines
  }
  return result
}

function parseEducationBlock(block: ExtractedLine[], degraded: boolean = false): ParsedEducation {
  const text = block.map((l) => l.text).join(" | ")
  const result: ParsedEducation = {}
  const rangeRe = new RegExp(DATE_RANGE_RE.source, "i")
  const range = rangeRe.exec(text)
  if (range) {
    result.startDate = range[1]
    result.endDate = range[2]
  }
  const headerLine = findBlockHeaderLine(block, degraded)
  if (!headerLine) return result
  let headerText = headerLine.text

  headerText = headerText.replace(/\s*(?:19|20)\d{2}(?:\s*[-–—~至到]\s*(?:19|20)\d{2})?$/, "")

  const degreeKeywords = /(本科|硕士|博士|学士|研究生|大专|MBA|EMBA|PhD|MS|MSc|MA|BA|BS|BSc|MEng|BEng)/i
  const degreeMatchGlobal = text.match(degreeKeywords)
  if (degreeMatchGlobal) {
    result.degree = degreeMatchGlobal[0]
    headerText = headerText.replace(degreeKeywords, "").trim()
  }

  let parts: string[] = []
  for (const sep of [/\s*[–—\-|·]\s*/, /\s*,\s*/]) {
    const split = headerText
      .split(sep)
      .map((s) => s.trim())
      .filter((s) => s)
    if (split.length >= 2) {
      parts = split
      break
    }
  }
  if (parts.length === 0) {
    const words = headerText.split(/\s+/).filter((s) => s)
    if (words.length === 2) {
      parts = words
    } else if (words.length >= 3) {
      parts = [words[0], words.slice(1).join(" ")]
    } else if (words.length === 1) {
      parts = [words[0]]
    }
  }
  if (parts.length >= 1) result.school = parts[0]
  if (parts.length >= 2) result.major = parts[1]
  if (parts.length >= 3) {
    const last = parts[parts.length - 1].trim()
    if (/(?:市|省|区|州|县)/.test(last)) {
      result.location = last
    }
  }

  if (!range) {
    const yearMatches = text.match(/(19|20)\d{2}/g)
    if (yearMatches && yearMatches.length > 0) {
      result.endDate = yearMatches[yearMatches.length - 1]
    }
  }

  const gpaMatch = text.match(GPA_RE)
  if (gpaMatch) result.gpa = gpaMatch[1].trim()

  const honorsMatch = text.match(/(?:荣誉|所获荣誉|获奖)(?:情况|经历)?[：:]?\s*([^\n]+?)(?=\n|$|主修|核心|课程)/i)
  if (honorsMatch) result.honors = honorsMatch[1].trim()

  const courseworkMatch = text.match(/(?:主修课程|核心课程|相关课程|课程)(?:情况)?[：:]?\s*([^\n]+?)(?=\n|$|荣誉|获奖)/i)
  if (courseworkMatch) result.coursework = courseworkMatch[1].trim()

  if (!result.location) {
    const loc = extractLocation(text)
    if (loc) result.location = loc
  }
  return result
}

function parseSkillLines(lines: ExtractedLine[]): string[] {
  const skills: string[] = []
  for (const line of lines) {
    const parts = line.text
      .split(/[,，;；、·]|\s{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.length < 30)
    skills.push(...parts)
  }
  return Array.from(new Set(skills))
}

function parseHighlightsLines(lines: ExtractedLine[]): string {
  return lines.map((l) => l.text).join("\n").trim()
}

function parseAwardsLines(lines: ExtractedLine[]): string {
  return lines.map((l) => l.text).join("\n").trim()
}

export function parseResumeFromLayout(layout: ExtractedLayout): ParsedResume {
  const allLines = layout.pages.flat()
  const sections = detectSections(allLines)
  const result: ParsedResume = {
    name: "",
    email: "",
    phone: "",
    skills: [],
    experience: [],
    projects: [],
    education: [],
  }

  const degraded = layout.degraded === true
  const medianGap = computeMedianGap(allLines)

  const sourceLines = layout.rawLines && layout.rawLines.length > 0 ? layout.rawLines : allLines
  const headerLines = sourceLines.filter((l) => l.pageIndex === 0).slice(0, 12)
  const headerText = headerLines.map((l) => l.text).join(" ")

  const nameLine = headerLines.find(isLikelyName)
  if (nameLine) result.name = nameLine.text.trim()

  const emails = extractEmails(headerText)
  if (emails.length > 0) result.email = emails[0]

  const phones = extractPhones(headerText)
  if (phones.length > 0) result.phone = phones[0]

  const gh = extractGithub(headerText)
  if (gh) result.github = gh
  const li = extractLinkedin(headerText)
  if (li) result.linkedin = li
  const web = extractWebsite(headerText)
  if (web) result.website = web

  for (const sec of sections) {
    if (sec.id === "personal") continue
    const contentLines = sec.lines.filter((l) => matchSectionHeader(l.text) === null)
    if (sec.id === "summary") {
      result.summary = contentLines.map((l) => l.text).join(" ").trim()
    } else if (sec.id === "highlights") {
      result.highlights = parseHighlightsLines(contentLines)
    } else if (sec.id === "skills") {
      result.skills = parseSkillLines(contentLines)
    } else if (sec.id === "experience" || sec.id === "internship") {
      const blocks = splitByBlocks(contentLines, degraded, medianGap)
      for (const block of blocks) {
        const exp = parseExperienceBlock(block, degraded)
        if (Object.keys(exp).length > 0) result.experience.push(exp)
      }
    } else if (sec.id === "projects") {
      const blocks = splitByBlocks(contentLines, degraded, medianGap)
      for (const block of blocks) {
        const proj = parseProjectBlock(block, degraded)
        if (Object.keys(proj).length > 0) result.projects.push(proj)
      }
    } else if (sec.id === "education") {
      const blocks = splitByBlocks(contentLines, degraded, medianGap)
      for (const block of blocks) {
        const edu = parseEducationBlock(block, degraded)
        if (Object.keys(edu).length > 0) result.education.push(edu)
      }
    } else if (sec.id === "certifications") {
      result.certifications = contentLines.map((l) => l.text).join(" ").trim()
    } else if (sec.id === "awards") {
      result.awards = parseAwardsLines(contentLines)
    } else if (sec.id === "publications") {
      result.publications = contentLines.map((l) => l.text).join(" ").trim()
    }
  }

  if (!result.name && allLines.length > 0) {
    const top = allLines.find((l) => l.pageIndex === 0)
    if (top) result.name = top.text.trim().split(/\s+/)[0] || ""
  }

  return result
}

export function parseResumeFile(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (ext === "txt") {
    return require("fs").readFileSync(filePath, "utf-8")
  }
  throw new Error(`不支持的文件格式: ${ext}（PDF 请使用 parseResumePdf）`)
}

export async function parseResumePdf(filePath: string): Promise<ParsedResume> {
  const { extractPdfLayout } = await import("./pdf-extractor")
  const layout = await extractPdfLayout(filePath)
  return parseResumeFromLayout(layout)
}
