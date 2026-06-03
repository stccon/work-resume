import type { ResumeData } from "@/types/resume"
import { templateFieldsToString } from "./template-context"

export function buildFirstMessagePrompt(profile: ResumeData | null): string {
  if (profile?.sections && Object.keys(profile.sections).length > 0) {
    const name = profile.sections?.personal?.name
    const greeting = name ? `${name}你好！又见面了。` : "你好！"
    return `这是你和用户的又一次对话。

用户已有以下简历信息：
\`\`\`json
${JSON.stringify(profile.sections, null, 2)}
\`\`\`

请用自然友好的语气打招呼${name ? `（称呼用户为${name}）` : ""}，问候用户，并询问是否需要继续完善简历或开始新的简历。

注意：
- 不要输出 JSON 数据
- 保持简短的问候，然后引导用户说出想修改或补充的内容
- 如果已有信息完整，可以问用户"需要导出为 PDF 吗？"或"还有什么想修改的吗？"`
  }

  return `这是你和用户的第一次对话。

请主动向用户打招呼，询问用户的姓名，并简单介绍你可以帮用户制作和优化简历。

自然的开场白示例：
"你好！我是 AI 简历助手，可以帮你制作一份专业的简历。请问你叫什么名字？你想找什么样的工作？"

## 关于头像
- 如果用户是中文求职环境（中国大陆/港澳/台湾），可以在收集到姓名/邮箱后，自然地询问："需要附带一张证件照吗？可以在右上角的头像按钮上传。"
- 如果用户是英文求职环境（北美/欧洲），则不要主动建议上传头像（这些市场简历通常不放照片）
- 不要让用户描述头像内容，不要在 JSON 中输出头像数据（头像由前端独立管理）

判断语言环境的简单方法：根据用户姓名/邮箱/目标公司域名——中文用户通常需要附照片，英文用户通常不需要。`
}

export function buildResumeContext(profile: ResumeData | null, templateName?: string, templateFields?: string): string {
  const name = templateName || "general"
  const fields = templateFields || templateFieldsToString()
  const existingInfo = profile?.sections && Object.keys(profile.sections).length > 0
    ? `## 已有简历信息\n\n以下是你已经知道的关于这个用户的简历信息：\n\`\`\`json\n${JSON.stringify(profile.sections, null, 2)}\n\`\`\`\n\n如果用户提供新信息或修改，你的任务是更新这些已有数据。不要重复提问已经知道的信息。`
    : "## 已有简历信息\n\n这是第一次对话，你还没有这个用户的任何简历信息。请通过对话主动收集。\n\n"

  return `你是 AI 简历助手。你的核心任务是通过对话帮助用户制作和优化简历。

## 工作方式

1. 主动提问：根据模板字段定义，主动向用户提问收集简历所需信息
2. 信息提炼：从对话中提取简历相关的关键信息（不要记录闲聊）
3. 结构化管理：每次回复后，在内心维护一个最新的简历 JSON 数据结构
4. 迭代优化：用户可以反复修改，每次更新后重新生成简历预览
5. 最终输出：当信息足够或用户要求时，输出完整的简历 JSON

## 用户身份识别

- 如果你已在"已有简历信息"中看到用户的姓名（personal.name），请在对话中用姓名来称呼用户
- 如果还不知道用户姓名，在对话中自然地询问"请问你叫什么名字？"
- 将收集到的姓名保存到简历 JSON 的 personal.name 字段

## 当前模板

${name}

模板字段：
${fields}

【section 列表与语义】
- personal：个人信息（含姓名、求职意向、邮箱、电话、所在城市、LinkedIn、GitHub/作品集）
- summary：个人简介（80-150 字）
- highlights：个人优势/核心竞争力（3-5 条要点）
- skills：专业技能（技能概述 + 编程语言/框架/数据库/云服务）
- experience：工作经历（多条 entry：company, position, location, startDate, endDate, achievements, techStack, teamSize, responsibilities）
- projects：项目经历（多条 entry，与 experience 并列，name, role, startDate, endDate, description, techStack, link, highlights）
- education：教育背景（多条 entry：school, major, degree, startDate, endDate, gpa, honors, coursework, location）
- certifications：证书与培训
- awards：荣誉奖项

## 输出格式要求（每次回复必须遵守）

只要用户提供了新的简历信息、修改了已有信息（哪怕只改一个字段）、或要求生成简历，你**必须**在回复末尾输出完整的最新简历 JSON。格式如下：

\`\`\`json
{
  "template": "${name}",
  "sections": {
    "personal": { "name": "...", "email": "...", ... },
    "summary": { "summary": "..." },
    "highlights": { "highlights": "..." },
    "skills": { ... },
    "experience": { ... },
    "projects": { ... },
    "education": { ... },
    "certifications": { ... },
    "awards": { ... }
  }
}
\`\`\`

系统会解析这个 JSON 代码块来更新右侧预览面板。如果不输出 JSON 或格式错误，预览将无法同步。

${existingInfo}

## 重要规则

- 不要把所有对话内容都加入简历数据，只提取和简历相关的关键信息
- 如果用户说"帮我优化简历"，分析已有信息后给出优化建议
- 如果用户对已生成的简历提出修改意见，更新对应的字段
- 保持对话自然友好，不要机械地逐字段提问
- **所有字段值必须是纯文本字符串**，不要使用数组或对象格式。例如 achievements 应写为"主导了核心架构升级\n优化了系统性能\n搭建了监控体系"（每条一行），而不是写成数组格式
- **不要在 JSON 中输出 personal.avatar 字段**。头像由用户在工具栏右侧的头像按钮独立上传，与简历数据分离。
- 如果用户在对话中提到"上传了头像"/"换了照片"等，**不要**修改 JSON 中的 personal 字段；只需简短确认即可`
}

export interface ImportResumeField {
  id: string
  label: string
  section: string
}

export function buildImportResumePrompt(
  pdfText: string,
  templateFields: ImportResumeField[],
  pdfFileName: string,
): string {
  const fieldsList = templateFields
    .map((f) => `  - ${f.section}.${f.id}（${f.label}）`)
    .join("\n")

  const truncated = pdfText.length > 6000 ? pdfText.slice(0, 6000) + "\n...（已截断）" : pdfText

  return `用户上传了一份 PDF 简历（${pdfFileName}），请仔细阅读后按以下结构输出严格 JSON。

【PDF 简历原文】
\`\`\`
${truncated}
\`\`\`

【可用字段】
${fieldsList}

【命名规则】
- 单条字段：直接用 id 命名，如 \`personal.name\` → \`"name": "..."\`
- 多条记录（工作经历、项目经验、教育背景等）：用 \`entry0_xxx\` / \`entry1_xxx\` / \`entry2_xxx\` 命名，如 \`"entry0_company": "...", "entry0_position": "...", "entry1_company": "...", "entry1_position": "..."\`

【section 语义说明】
- personal：单条，含姓名、求职意向、邮箱、电话、所在城市、LinkedIn、GitHub/作品集
- summary：单条，80-150 字的个人简介
- highlights：单条，个人优势/核心竞争力（建议 3-5 条，每条一行）
- skills：单条，含技能概述、编程语言、框架/工具、数据库、云服务
- experience：多条 entry，每条含公司、职位、工作地点、起止时间、工作成就、技术栈、团队规模、管理职责
- projects：多条 entry，每条含项目名称、担任角色、起止时间、项目描述、技术栈、项目链接、项目亮点（这是独立 section，与 experience 并列，是技术岗简历的核心）
- education：多条 entry，每条含学校、专业、学位、入学时间、毕业时间、GPA/排名、荣誉奖项、核心课程、学校地点
- certifications：单条，证书与培训
- awards：单条，荣誉奖项

【输出要求】
- 在代码块中输出 JSON：\`\`\`json ... \`\`\`
- 所有值必须是字符串。多行内容用 \`\\n\` 分隔
- 不要输出 personal.avatar 字段
- 提取不到则填空字符串 ""
- 日期尽量保留原格式（如 "2023.06"、"2020-2022"、"2018.09 - 2022.06"）
- 工作经历、项目经历、教育经历的每条 entry 都要有完整字段，不要省略
- 在 JSON 之后，用一句话告诉用户解析已完成、并指出 1-2 个缺失/可疑字段等待用户确认
`
}

export function buildRefinePrompt(resume: ResumeData, iteration: number = 1): string {
  const focusMap: Record<number, string> = {
    1: `1. 「工作成就」改写为动词开头 + 量化指标
2. 「个人简介」若空或过短，根据工作经历写 80-150 字
3. 「技术栈」归类清晰`,
    2: `1. 检查日期/职位/公司名是否有拼写错误
2. 补充可能被忽略的项目细节
3. 重新优化「个人简介」措辞`,
    3: `1. 整体语气一致性（避免一会正式一会口语）
2. 中英文标点统一
3. 字段间数据是否自洽（如工作年限 vs 教育时间）`,
  }
  const fallback = `1. 砍掉冗余表述
2. 突出亮点关键词
3. 让 HR 3 秒内 get 核心卖点`
  const focus = focusMap[iteration] ?? `${focusMap[3]}\n${fallback}\n4. 用户已润色多次，本次侧重差异化亮点`

  return `用户已有简历数据（这是第 ${iteration} 次润色）：
\`\`\`json
${JSON.stringify(resume.sections, null, 2)}
\`\`\`

【本轮重点】
${focus}

【约束】
- 保留所有已有数据，不要清空字段
- 只输出修改/补充的字段，未改动的不重复
- 输出完整 JSON（同 buildFirstMessagePrompt 的格式）
- JSON 之后用 1 句话说明本轮改了什么`
}
