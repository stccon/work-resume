## ADDED Requirements

### Requirement: 解析器识别"退化模式"PDF

系统 SHALL 在 `electron/pdf-extractor.ts` 的 `extractPdfStyle` 输出 `ExtractedStyleInfo` 中新增 `degraded: boolean` 字段。

当且仅当满足以下任一条件时 `degraded === true`：
- 所有非空文本项的 `fontSize === 0`，**或**
- 所有非空文本项的 `fontName` 匹配 `/^g_d\d+_f\d+$/`（Chromium `printToPDF` 生成的匿名字体名格式）

#### Scenario: Electron `printToPDF` 输出的 PDF 被识别为退化模式
- **WHEN** 用户导入 `resumes/黄宇程_通用简历_2026-06-03.pdf`（由本系统通过 `webContents.printToPDF` 生成）
- **THEN** `extractPdfStyle` 返回的 `degraded === true`
- **AND** 不会破坏现有对正常 PDF（非退化）的判定路径

#### Scenario: 正常 PDF 不被识别为退化模式
- **WHEN** 用户导入一份由 Word / Adobe / LaTeX 导出的 PDF（`fontSize` > 0 且 `fontName` 含 "bold" 等）
- **THEN** `degraded === false`
- **AND** 解析器仍走原 `isBold || fontSize >= 12` 路径

### Requirement: 退化模式下用字体频次代替加粗判断

在 `degraded === true` 时，系统 SHALL：
- 统计每个 `fontName` 在文档中出现的总字符数（或文本项数），输出 `fontFrequency: Record<fontName, number>`
- 取频次最高的 `fontName` 作为 `commonFontName`
- 给每条 `ExtractedLine` 标注 `isCommonFont: boolean`（`fontName === commonFontName`）
- 在判定"标题候选"时，`!line.isCommonFont` 等价于原 `line.isBold`

#### Scenario: 退化模式下能区分正文与标题字体
- **WHEN** 一份退化 PDF 中 `g_d0_f1` 出现 200 次（正文），`g_d0_f5` 出现 30 次（标题）
- **THEN** `commonFontName === "g_d0_f1"`
- **AND** `fontName === "g_d0_f5"` 的所有行 `isCommonFont === false`

### Requirement: 退化模式下用 Y 间距突变作为段落边界

在 `degraded === true` 时，系统 SHALL：
- 给每条 `ExtractedLine` 增加 `yGapBefore: number`（与同页前一行的 y 距离，首行为 0）
- `splitByBlocks()` 切分时，若当前行 `yGapBefore > medianGap × 1.6`（`medianGap` 为同页相邻行 y 差的中位数），视为新块起点
- 非退化模式不启用此切分

#### Scenario: 退化模式下能按 Y 间距切出多个 section
- **WHEN** 一份退化 PDF 中"教育经历"与"工作经历"之间的空白是 section 内行距的 2 倍以上
- **THEN** `splitByBlocks()` 切出至少 2 个 block

### Requirement: 已知 section 标题白名单兜底

系统 SHALL 维护 `KNOWN_SECTION_TITLES: Set<string>`，至少包含（中文 + 英文）：
- "教育经历" / "教育背景" / "Education"
- "工作经历" / "工作经验" / "Work Experience" / "Experience"
- "项目经历" / "项目经验" / "Projects"
- "专业技能" / "技能" / "Skills"
- "个人信息" / "Personal Info"
- "个人优势" / "核心竞争力" / "Highlights"
- "自我评价" / "Summary"
- "证书" / "资格证书" / "Certifications"
- "荣誉奖项" / "Awards"

`isHeaderLine()` 在退化模式下，若行文本（去除前后空白）命中白名单，必须返回 `true`。

#### Scenario: 退化模式下白名单命中触发块切分
- **WHEN** 一份退化 PDF 中出现 "工作经历" 一行
- **THEN** `isHeaderLine()` 对该行返回 `true`
- **AND** `splitByBlocks()` 在此处切块（即使该行不是稀有字体、Y 间距未达阈值）

### Requirement: 解析器块内标题行回退顺序

在 `degraded === true` 时，块解析函数（`parseExperienceBlock` / `parseEducationBlock` / `parseProjectsBlock` / `parseHighlightsBlock` / `parseAwardsBlock` 等）寻找"块标题行"时 SHALL 按以下顺序回退：

1. 块内任意 `line.isBold` 的行（原行为）
2. 块内任意 `!line.isCommonFont && line.isShortLine`（≤ 12 字符且无标点结尾）的行
3. 块内任意文本命中 `KNOWN_SECTION_TITLES` 的行
4. `block[0]`（最后兜底，与现状一致）

#### Scenario: 退化模式下仍能为每条经历找到标题行
- **WHEN** 一份退化 PDF 的"工作经历"块内没有 `isBold` 行、没有稀有字体短行
- **THEN** 系统命中白名单（"工作经历"）将其作为块标题
- **AND** 至少能解析出 1 条工作经历 entry

#### Scenario: 退化模式下三段典型内容能解析出非空数组
- **WHEN** 导入 `resumes/黄宇程_通用简历_2026-06-03.pdf`
- **THEN** `parseResumePdf()` 返回结果中：
  - `sections.skills` / `sections.experience` / `sections.education` / `sections.projects` 至少各 1 项
  - `sections.personal.name` 包含 "黄宇程"
  - `sections.personal.email` 匹配 `EMAIL_RE`
  - `sections.personal.phone` 匹配 `PHONE_CN_RE`

### Requirement: 旧逻辑路径完全保留

系统 SHALL 保证：对非退化 PDF（`degraded === false`）的解析行为与本次变更前**完全一致**——所有判定仍基于 `line.isBold || line.fontSize >= 12`，不读取新增的 `fontFrequency` / `isCommonFont` / `yGapBefore` / `isShortLine` 字段。

#### Scenario: 非退化 PDF 走原解析路径
- **WHEN** 导入任意 `degraded === false` 的 PDF
- **THEN** `isHeaderLine()` 的判定结果与变更前完全相同
- **AND** 现有 50+ 单元测试全部通过

### Requirement: 回归测试覆盖自家导出 PDF

`electron/__tests__/exported-pdf-roundtrip.test.ts` SHALL 至少包含 3 个测试用例，分别基于 `resumes/黄宇程_通用简历_2026-05-31.pdf`、`resumes/黄宇程_通用简历_2026-06-01.pdf`、`resumes/黄宇程_通用简历_2026-06-03.pdf`，每份 PDF 断言：
- `sections.personal.name` 非空
- `sections.personal.email` 匹配邮箱正则
- `sections.personal.phone` 匹配国内手机号正则
- `sections.experience.length >= 1`
- `sections.education.length >= 1`
- `sections.skills` 非空

#### Scenario: 06-03 导出 PDF 端到端解析
- **WHEN** 解析 `resumes/黄宇程_通用简历_2026-06-03.pdf`
- **THEN** 上述 6 项断言全部通过
- **AND** 测试运行时间不超过 5 秒

#### Scenario: 补最小单元测试覆盖根因场景
- **WHEN** 构造 `fontSize: 0`、`fontName: "g_d0_f1"`、`g_d0_f5` 的 mock 数据
- **THEN** `pdf-extractor.test.ts` 断言 `degraded === true`、`commonFontName === "g_d0_f1"`
- **AND** `resume-parser.test.ts` 断言 `isHeaderLine()` 在退化模式下对稀有字体短行返回 `true`、对白名单文本返回 `true`、对正文返回 `false`
