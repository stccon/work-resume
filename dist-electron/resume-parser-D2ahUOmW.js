"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const SECTION_PATTERNS = {
  summary: [
    /^[\s【\[]?(个人|自我)?(简介|评价|介绍|陈述)[\s】\]]?$/i,
    /^SUMMARY$/i,
    /^ABOUT(\s+ME)?$/i,
    /^PROFILE$/i,
    /^OBJECTIVE$/i,
    /^职业目标$/,
    /^自我介绍$/
  ],
  experience: [
    /^[\s【\[]?(工作|职业|从业)(经历|经验|概要|历史)?[\s】\]]?$/i,
    /^EXPERIENCE$/i,
    /^WORK(\s+EXPERIENCE)?$/i,
    /^PROFESSIONAL(\s+EXPERIENCE)?$/i,
    /^EMPLOYMENT(\s+HISTORY)?$/i,
    /^CAREER(\s+HISTORY)?$/i
  ],
  education: [
    /^[\s【\[]?教育(背景|经历|情况|简历|信息)?[\s】\]]?$/i,
    /^EDUCATION(AL)?(\s+BACKGROUND)?$/i,
    /^ACADEMIC(\s+BACKGROUND)?$/i,
    /^学历$/
  ],
  skills: [
    /^[\s【\[]?(专业|技术|核心|关键|主要)?(技能|能力|专长|栈|工具|素养)[\s】\]]?$/i,
    /^SKILLS?$/i,
    /^TECHNICAL(\s+SKILLS?)?$/i,
    /^EXPERTISE$/i,
    /^PROFICIENCIES$/i,
    /^技术栈$/
  ],
  projects: [
    /^[\s【\[]?(项目|个人|相关|关键)?(经验|经历|展示)[\s】\]]?$/i,
    /^PROJECTS?$/i,
    /^PERSONAL(\s+PROJECTS?)?$/i,
    /^KEY(\s+PROJECTS?)?$/i,
    /^项目作品$/
  ],
  certifications: [
    /^[\s【\[]?(证书|资格|资质|执照|培训|认证)(与培训)?[\s】\]]?$/i,
    /^CERTIFICATIONS?$/i,
    /^LICENSES?(\s+(&|AND)\s+CERTIFICATIONS?)?$/i,
    /^PROFESSIONAL(\s+DEVELOPMENT)?$/i
  ],
  awards: [
    /^(获奖|荣誉|奖项|奖励|成就)(经历|情况|记录|列表)?$/i,
    /^AWARDS?$/i,
    /^HONORS?(?:\s*&\s*AWARDS?)?$/i,
    /^ACHIEVEMENTS?$/i
  ],
  publications: [
    /^[\s【\[]?(发表|出版|论文|刊物|研究成果)[\s】\]]?$/i,
    /^PUBLICATIONS?$/i,
    /^RESEARCH(\s+EXPERIENCE)?$/i,
    /^PAPERS?$/i
  ],
  other: []
};
function matchSectionHeader(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length > 30) return null;
  for (const [id, patterns] of Object.entries(SECTION_PATTERNS)) {
    if (id === "other") continue;
    for (const re of patterns) {
      if (re.test(trimmed)) return id;
    }
  }
  return null;
}
function detectSections(lines) {
  const sections = [];
  let current = { id: "personal", lines: [] };
  for (const line of lines) {
    const headerId = matchSectionHeader(line.text);
    if (headerId) {
      if (current.lines.length > 0 || current.id !== "personal") sections.push(current);
      current = { id: headerId, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0 || current.id !== "personal") sections.push(current);
  return sections;
}
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_CN_RE = /(?:(?:\+|00)?86[-\s]?)?1[3-9]\d{9}/g;
const PHONE_INTL_RE = /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
const GITHUB_RE = /github\.com\/([\w-]+)/i;
const LINKEDIN_RE = /linkedin\.com\/in\/([\w-]+)/i;
const BEHANCE_RE = /behance\.net\/([\w-]+)/i;
const URL_RE = /https?:\/\/[\w.-]+/g;
const DATE_TOKEN = "(?:(?:19|20)\\d{2}(?:[\\.\\-\\/.年]\\s*(?:1[0-2]|0?[1-9])月?)?|至今|现在|present|current|now)";
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*[-–—~至到]\\s*(${DATE_TOKEN})`,
  "gi"
);
const SINGLE_DATE_RE = new RegExp(`(${DATE_TOKEN})`, "gi");
function extractEmails(text) {
  return Array.from(new Set(text.match(EMAIL_RE) || []));
}
function extractPhones(text) {
  const cn = text.match(PHONE_CN_RE) || [];
  const intl = (text.match(PHONE_INTL_RE) || []).filter((p) => p.replace(/\D/g, "").length >= 7);
  const merged = [...cn, ...intl];
  return Array.from(new Set(merged));
}
function extractGithub(text) {
  var _a;
  return (_a = text.match(GITHUB_RE)) == null ? void 0 : _a[1];
}
function extractLinkedin(text) {
  var _a;
  return (_a = text.match(LINKEDIN_RE)) == null ? void 0 : _a[1];
}
function extractWebsite(text) {
  const urls = text.match(URL_RE) || [];
  const filtered = urls.filter((u) => !/github\.com|linkedin\.com|behance\.net/i.test(u));
  return filtered[0];
}
function extractDateRanges(text) {
  return Array.from(new Set(text.match(DATE_RANGE_RE) || []));
}
function isLikelyName(line) {
  if (line.pageIndex !== 0) return false;
  if (line.y < 200) return false;
  const t = line.text.trim();
  if (t.length < 2 || t.length > 20) return false;
  if (EMAIL_RE.test(t) || PHONE_CN_RE.test(t) || URL_RE.test(t)) {
    EMAIL_RE.lastIndex = 0;
    PHONE_CN_RE.lastIndex = 0;
    URL_RE.lastIndex = 0;
    return false;
  }
  EMAIL_RE.lastIndex = 0;
  PHONE_CN_RE.lastIndex = 0;
  URL_RE.lastIndex = 0;
  if (/^(摘要|简介|教育|工作|技能|项目|证书|个人|获奖|荣誉|奖项|奖励|成就)/i.test(t)) return false;
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(t)) return true;
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(t)) return true;
  if (line.isBold || line.fontSize >= 14) return true;
  return false;
}
function isHeaderLine(line) {
  const hasDate = DATE_RANGE_RE.test(line.text);
  DATE_RANGE_RE.lastIndex = 0;
  if (hasDate) return false;
  if (line.isBold) return true;
  if (line.fontSize >= 12) return true;
  return false;
}
function splitByBlocks(lines) {
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (isHeaderLine(line)) {
      if (current.length > 0) blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}
function parseExperienceBlock(block) {
  const text = block.map((l) => l.text).join(" | ");
  const result = {};
  const rangeRe = new RegExp(DATE_RANGE_RE.source, "i");
  const range = rangeRe.exec(text);
  if (range) {
    result.startDate = range[1];
    result.endDate = range[2];
  }
  const headerLine = block.find((l) => l.isBold) || block[0];
  if (headerLine) {
    const headerText = headerLine.text;
    const dashSplit = headerText.split(/\s*[–—\-|·]\s*/);
    if (dashSplit.length >= 2) {
      result.company = dashSplit[0].trim();
      result.position = dashSplit[1].trim();
    } else {
      const atSplit = headerText.split(/\s+(?:at|@|@)\s+/i);
      if (atSplit.length >= 2) {
        result.position = atSplit[0].trim();
        result.company = atSplit[1].trim();
      } else {
        result.position = headerText.trim();
      }
    }
  }
  const detailLines = block.filter((l) => l !== headerLine).map((l) => l.text).join("\n");
  if (detailLines) {
    result.achievements = detailLines;
  }
  const techMatch = text.match(/(?:技术栈|tech\s*stack|technologies?)[：:]\s*([^\n|]+)/i);
  if (techMatch) result.techStack = techMatch[1].trim();
  return result;
}
function parseEducationBlock(block) {
  const text = block.map((l) => l.text).join(" | ");
  const result = {};
  const headerLine = block.find((l) => l.isBold) || block[0];
  if (!headerLine) return result;
  let headerText = headerLine.text;
  headerText = headerText.replace(/\s*(19|20)\d{2}(?:\s*[-–—~至到]\s*(?:19|20)\d{2})?$/, "");
  const degreeKeywords = /(本科|硕士|博士|学士|研究生|大专|MBA|PhD|MS|MSc|MA|BA|BS|BSc)/i;
  const degreeMatchGlobal = text.match(degreeKeywords);
  if (degreeMatchGlobal) {
    result.degree = degreeMatchGlobal[0];
    headerText = headerText.replace(degreeKeywords, "").trim();
  }
  let parts = [];
  for (const sep of [/\s*[–—\-|·]\s*/, /\s*,\s*/]) {
    const split = headerText.split(sep).map((s) => s.trim()).filter((s) => s);
    if (split.length >= 2) {
      parts = split;
      break;
    }
  }
  if (parts.length === 0) {
    const words = headerText.split(/\s+/).filter((s) => s);
    if (words.length === 2) {
      parts = words;
    } else if (words.length >= 3) {
      parts = [words[0], words.slice(1).join(" ")];
    } else if (words.length === 1) {
      parts = [words[0]];
    }
  }
  if (parts.length >= 1) result.school = parts[0];
  if (parts.length >= 2) result.major = parts[1];
  const yearMatches = text.match(/(19|20)\d{2}/g);
  if (yearMatches && yearMatches.length > 0) {
    result.gradYear = yearMatches[yearMatches.length - 1];
  }
  return result;
}
function parseSkillLines(lines) {
  const skills = [];
  for (const line of lines) {
    const parts = line.text.split(/[,，;；、·]|\s{2,}/).map((p) => p.trim()).filter((p) => p.length > 0 && p.length < 30);
    skills.push(...parts);
  }
  return Array.from(new Set(skills));
}
function parseResumeFromLayout(layout) {
  const allLines = layout.pages.flat();
  const sections = detectSections(allLines);
  const result = {
    name: "",
    email: "",
    phone: "",
    skills: [],
    experience: [],
    education: []
  };
  const headerLines = allLines.filter((l) => l.pageIndex === 0).slice(0, 12);
  const headerText = headerLines.map((l) => l.text).join(" ");
  const nameLine = headerLines.find(isLikelyName);
  if (nameLine) result.name = nameLine.text.trim();
  const emails = extractEmails(headerText);
  if (emails.length > 0) result.email = emails[0];
  const phones = extractPhones(headerText);
  if (phones.length > 0) result.phone = phones[0];
  const gh = extractGithub(headerText);
  if (gh) result.github = gh;
  const li = extractLinkedin(headerText);
  if (li) result.linkedin = li;
  const web = extractWebsite(headerText);
  if (web) result.website = web;
  for (const sec of sections) {
    if (sec.id === "personal") continue;
    const contentLines = sec.lines.filter((l) => matchSectionHeader(l.text) === null);
    if (sec.id === "summary") {
      result.summary = contentLines.map((l) => l.text).join(" ").trim();
    } else if (sec.id === "skills") {
      result.skills = parseSkillLines(contentLines);
    } else if (sec.id === "experience") {
      const blocks = splitByBlocks(contentLines);
      for (const block of blocks) {
        const exp = parseExperienceBlock(block);
        if (Object.keys(exp).length > 0) result.experience.push(exp);
      }
    } else if (sec.id === "education") {
      const blocks = splitByBlocks(contentLines);
      for (const block of blocks) {
        const edu = parseEducationBlock(block);
        if (Object.keys(edu).length > 0) result.education.push(edu);
      }
    } else if (sec.id === "certifications") {
      result.certifications = contentLines.map((l) => l.text).join(" ").trim();
    }
  }
  if (!result.name && allLines.length > 0) {
    const top = allLines.find((l) => l.pageIndex === 0);
    if (top) result.name = top.text.trim().split(/\s+/)[0] || "";
  }
  return result;
}
function parseResumeFile(filePath) {
  var _a;
  const ext = (_a = filePath.split(".").pop()) == null ? void 0 : _a.toLowerCase();
  if (ext === "txt") {
    return require("fs").readFileSync(filePath, "utf-8");
  }
  throw new Error(`不支持的文件格式: ${ext}（PDF 请使用 parseResumePdf）`);
}
async function parseResumePdf(filePath) {
  const { extractPdfLayout } = await Promise.resolve().then(() => require("./pdf-extractor-CreC-WkZ.js"));
  const layout = await extractPdfLayout(filePath);
  return parseResumeFromLayout(layout);
}
exports.BEHANCE_RE = BEHANCE_RE;
exports.DATE_RANGE_RE = DATE_RANGE_RE;
exports.EMAIL_RE = EMAIL_RE;
exports.GITHUB_RE = GITHUB_RE;
exports.LINKEDIN_RE = LINKEDIN_RE;
exports.PHONE_CN_RE = PHONE_CN_RE;
exports.PHONE_INTL_RE = PHONE_INTL_RE;
exports.SINGLE_DATE_RE = SINGLE_DATE_RE;
exports.URL_RE = URL_RE;
exports.detectSections = detectSections;
exports.extractDateRanges = extractDateRanges;
exports.extractEmails = extractEmails;
exports.extractGithub = extractGithub;
exports.extractLinkedin = extractLinkedin;
exports.extractPhones = extractPhones;
exports.extractWebsite = extractWebsite;
exports.isLikelyName = isLikelyName;
exports.matchSectionHeader = matchSectionHeader;
exports.parseResumeFile = parseResumeFile;
exports.parseResumeFromLayout = parseResumeFromLayout;
exports.parseResumePdf = parseResumePdf;
