## Context

系统当前通过 Electron `webContents.printToPDF` 把 HTML 简历渲染成 PDF。`pdfjs-dist`（v6.0.227）能正确读出所有文字内容（`str` 完整、坐标可用），但 `fontName` 全是 `g_d0_fN` 风格的匿名 ID，`fontSize` 和 `height` 一律为 `0`。

`electron/resume-parser.ts` 当前识别 section 标题和加粗行的全部依据是 `line.isBold || line.fontSize >= 12`：

- `isBold` 来自 `isBoldFont(fontName)`，正则 `/bold|black|heavy|-b-|\.bd/i` 匹配 `g_d0_fN` 永远 false
- `fontSize >= 12` 永远 false（实际是 0）

下游影响：
- `isHeaderLine()` 永远返回 false → `splitByBlocks()` 切不出块
- `parseExperienceBlock()` / `parseEducationBlock()` 在块内 `find((l) => l.isBold)` 失败，回退到 `block[0]`（常常拿到的是上一条的尾部或日期行）
- 整份简历除姓名/邮箱/手机号外，其它字段全空

测试未覆盖该场景：现有 `pdf-extractor.test.ts` / `resume-parser.test.ts` 全部 mock 真实字号（10/12/13/14/22）和 `isBold: true`。

## Goals / Non-Goals

**Goals:**
- 让系统自导出的 PDF 能被解析出完整字段（skills / experience / education / projects）
- 不破坏现有对"正常 PDF"（有真实 fontSize 和字体名）的解析行为
- 不引入网络/LLM 依赖
- 给出可被现有测试体系复用的回归 fixture

**Non-Goals:**
- 不修复导出端（导出端本身正确）
- 不动 UI、不动 IPC、不动 renderer
- 不接 LLM 兜底（已在 `src/adapter/distillation.ts` 预留 dead code，本次不动）
- 不处理分栏、双栏这类高难度排版（仅做单列、典型简历模板的回归）

## Decisions

### 1. 引入"退化模式"概念
- 在 `ExtractedStyleInfo`（`electron/pdf-extractor.ts` 已导出）新增 `degraded: boolean` 字段
- 触发条件：`items.length > 0 && items.every(i => i.fontSize === 0 || i.height === 0)`，或 `items.every(i => /^g_d\d+_f\d+$/.test(i.fontName))`
- 该标志位透传到 `parseResumePdf()` → `parseResumeFromLayout()`

**为什么**：单分支开关，比让每个判定函数都自己探测更可控；旧逻辑完全保留。

**考虑过的替代**：① 直接重构整个 parser 让所有判定不再依赖 fontSize — 工作量太大且会破坏非退化模式的表现；② 在 pdf-extractor 里把所有 `fontSize: 0` 替换成估算值 — 估算不准且有"伪造元数据"的味道。仅在明确知道是退化模式时才启用新启发式。

### 2. 字体频次 = 正文
- 对每个 `fontName` 在 `extractPdfStyle` 内统计出现次数
- 输出 `fontFrequency: Record<fontName, number>` 与 `commonFontName: string`（取频次最高的）
- 在 `ExtractedLine` 上增加 `isCommonFont: boolean`
- 退化模式下 `line.isCommonFont === false` 等价于"非正文"，作为 `isBold` 替代信号

**为什么**：导出 PDF 里通常只有 2~6 个不同 `g_d0_fN`，最大频次 = 正文（宋体/正文字号），次频 = 标题（黑体/加粗）。即使名字是匿名的，频次仍能区分角色。

**为什么不用高度**：所有 item `height === 0`，不可用。

### 3. Y 间距 = 段落边界
- 在 `reconstructLines()` 中给每行增加 `yGapBefore`（与同页前一行 y 坐标的差）
- 在 `parseResumeFromLayout()` 入口处算一次 `medianGap`（同页相邻行 y 差的中位数）
- `splitByBlocks()` 退化模式新增切分条件：`line.yGapBefore > medianGap * 1.6`

**为什么**：Chromium 渲染时，section 之间会有比 section 内更大的垂直空白。median × 倍数是常见的文本分段启发式。

### 4. 已知小节标题白名单
- 新增 `KNOWN_SECTION_TITLES: Set<string>`（"教育经历" / "教育背景" / "工作经历" / "工作经验" / "项目经历" / "项目经验" / "专业技能" / "技能" / "个人信息" / "个人优势" / "核心竞争力" / "自我评价" / "证书" / "荣誉奖项" 等）
- `isHeaderLine()` 退化模式命中白名单直接返回 true

**为什么**：在自家导出的简历中，section 标题文本是稳定且已知的。这是最强的一类信号，命中后无需依赖任何元数据。

### 5. 解析器块内回退策略
- `parseExperienceBlock()` / `parseEducationBlock()` / `parseProjectsBlock()`：原本 `headerLine = block.find((l) => l.isBold) || block[0]`
- 退化模式改写为：`headerLine = block.find((l) => l.isBold) || block.find((l) => !l.isCommonFont && l.isShortLine) || block.find((l) => KNOWN_SECTION_TITLES.has(l.text.trim())) || block[0]`

**为什么**：黑名单回退顺序 = 强信号优先。

### 6. 回归测试策略
- `exported-pdf-roundtrip.test.ts` 直接读 `resumes/*.pdf` 跑 `parseResumePdf()`，断言关键字段非空
- fixture 文件需检查是否已被 git 追踪；如未追踪则说明用户后再决定是否纳入
- 单元测试补 1 个 `fontSize: 0 + 匿名字体名` 用例覆盖根因场景

## Risks / Trade-offs

- **风险 1**：在分栏（左右双栏）布局的简历上 Y 间距启发式会误判。 → 已有 `splitByBlocks()` 现有的 `hasDate` 条件作为前置 gate；白名单命中更优先。非分栏的自家模板（`general/technical/management`）均单列。
- **风险 2**：3 份 fixture PDF 总大小 ~750KB 进 git 增加仓库体积。 → `resumes/` 目录本身就在版本控制下，文件已经在仓库里；只是新增测试引用。
- **风险 3**：字体频次启发式可能在"大量特殊符号"占主体的 PDF 上把符号字体误判为正文。 → 启发式仅在 `degraded === true` 时启用，而退化模式专属"自家导出"场景，对自家模板表现稳定。
- **风险 4**：Y 间距倍数（1.6）需要后续调参。 → 在单元测试里给 1~2 个典型 layout 钉死，避免回归；后续可加 e2e 调参。
- **风险 5**：白名单不覆盖新模板新增的 section 名。 → 暴露为 `KNOWN_SECTION_TITLES` 数组，加新条目零成本。

## Migration Plan

无数据迁移、无接口变更。改动仅在 `electron/` 内部，不影响 IPC、preload、UI。

**回退策略**：单次 revert 即可恢复到当前行为（解析失败但 UI 给出明确提示）。新代码路径与旧代码路径在同一函数内并存。

## Open Questions

- 3 份 `resumes/*.pdf` 是否已被 git 追踪？（已通过 `git ls-files` 之外的目录扫描确认文件存在，但未确认 `.gitignore` 状态）
- 后续是否要扩展到双栏简历？本次不处理，但 `KNOWN_SECTION_TITLES` 已预留接口。
