## Context

当前简历导入流程包含三个串行能力：内容字段提取、视觉主题提取、头像提取。其中视觉主题提取是独立于"内容数据"的尝试——它试图从 PDF 的颜色/字体/布局推导出系统视觉主题的近似值。但实测复刻度仅 50%（如 `themes/imported-1cca47b1.json` 中的样例），且与系统精心调优的内置 14+ 主题冲突。用户在导入时获得的是"差但能用的复刻"，反而丧失了使用系统精心调优主题的机会。

同时，中间对话区是用户与 AI 交流、查看简历预览的核心区域，在中间顶部放置"上传简历"区域会与"当前简历的对话和优化"职责混淆。导入简历本质上是"创建一份新简历"的入口，应与"创建简历"按钮并列在左侧栏。

最后，内容模板（`templates/general.json`）字段严重落后于业界标准。LinkedIn、BeamJobs、Enhancv、超级简历等顶尖简历产品早已将"项目经历"作为独立 section（与工作经历并列），并提供 GPA、个人优势、荣誉奖项、工作地点等关键字段。当前实现的字段缺失导致导入的简历不完整。

## Goals / Non-Goals

**Goals:**
- 导入 PDF 后保留用户当前选中的内置主题，不再自动复刻 PDF 视觉主题
- 导入按钮迁至左侧栏，与"创建简历"并列
- 内容模板按业界顶尖标准（LinkedIn / 超级简历）扩展字段
- PDF 解析器能识别并提取业界标准的所有常见字段
- 用户在 AI 对话中也能像使用旧模板一样使用新模板（语义一致）
- 保留所有现有的视觉主题切换能力、PDF 拖入支持、PDF 解析能力

**Non-Goals:**
- 不删除视觉主题提取的底层基础设施（`pdf-theme-extractor.ts` / `imported-themes.ts`），仅从导入流中剥离调用
- 不改变 AI 对话流、不改变 `ChatInput` 的拖入 PDF 入口
- 不改变 PDF 头像提取能力
- 不改变简历的视觉渲染逻辑（仅补充字段标签）
- 不引入新的第三方依赖
- 不改变持久化方案

## Decisions

### 1. 视觉主题提取从导入流剥离，基础设施保留

**做法**：
- 在 `handleImportPdfResume` 中删除 `Promise.all([extractPdfAvatarPayload, extractPdfTheme])` 块
- 保留 `extractPdfAvatarPayload` 调用（头像属于数据）
- 删除 `saveImportedTheme` / `setVisualThemes` / `setCurrentVisualTheme(updated)` 逻辑
- 删除 `handleAfterDone` 中 `tryDetectStyleJSON` 块的 toast 提示
- 保留 `VisualThemePicker.tsx`、`themes/index.ts`、所有 14+ 内置主题 JSON、`pdf-theme-extractor.ts`、`imported-themes.ts`、`ipc.ts` 的主题 IPC、相关类型定义

**为什么保留基础设施**：未来若需要"复刻用户上传的视觉主题"作为可选能力时，基础设施可直接复用；当前仅在导入流中不调用。

**为什么不删除 `tryDetectStyleJSON` 函数本身**：该函数也可能在其他地方被使用（保留幂等性原则，避免过度删除）。

### 2. 导入按钮迁至左侧栏

**做法**：
- `Sidebar.tsx` 新增 `onImportPdf: (file: File) => void` prop
- 在"创建简历"按钮下方新增"导入 PDF 简历"按钮（次要样式，border + 普通背景）
- 触发隐藏的 `<input type="file" accept=".pdf">`
- 侧栏 `onDragOver` / `onDrop` 处理 PDF 拖入
- 空态文案更新为"还没有简历<br/>点击创建或导入 PDF"
- `App.tsx` 删除中间区顶部 `<FileUpload>` 块
- `ChatInput.tsx` 的 PDF 拖入和 FileUp 按钮保留

**为什么次要样式**：与"创建简历"主操作区分，避免视觉权重混乱。

**为什么保留 ChatInput 的 PDF 入口**：用户已在对话中时，拖入 PDF 到输入框是符合直觉的"我手上有一份简历，给我解析"的动作，与"在左侧栏开启一份新简历"是两个不同的用户意图场景。

### 3. 模板结构按业界顶尖标准重定义

**Section 顺序（资深者视角，LinkedIn / BeamJobs 共识）**：
```
1. personal    (个人信息)
2. summary     (个人简介)
3. highlights  (个人优势)        ← 新增
4. skills      (专业技能)
5. experience  (工作经历)
6. projects    (项目经历)        ← 新增
7. education   (教育背景)
8. certifications (证书)
9. awards      (荣誉奖项)        ← 新增
```

**新增字段（按业界标准）**：
- personal：`location`（所在城市）、`linkedin`
- highlights（整段 textarea）：核心竞争力、特长
- experience：`location`（工作地点）
- projects（独立 section，每条 entry）：
  - `name`（项目名称）、`role`（角色）、`startDate` / `endDate`、`description`、`techStack`、`link`、`highlights`（项目亮点）
- education：`startDate`（入学时间）、`endDate`（毕业时间，替代 `gradYear`）、`gpa`（GPA/排名）、`honors`（荣誉）、`coursework`（核心课程）、`location`（学校地点）
- awards（整段 textarea，按行切分）

**保留字段**：
- experience 的 `teamSize` / `responsibilities`（国内简历常见）
- skills 的 `languages` / `frameworks` / `databases` / `cloud`（程序员简历常见）

**Section id 命名**：使用业界标准英文 id（`highlights`、`projects`、`awards`），section label 用中文。

### 4. PDF 解析器增强

**Section 检测正则扩展**：
- 个人优势：`^(个人|自我|核心)?(优势|亮点|核心竞争力|特长)$`
- 自我评价：`^(自我评价|个人评价|个人陈述|自我介绍)$`
- 项目经验：增强 `^(项目|个人|相关|关键|主要)?(经验|经历|展示)$`
- 实习：`^(实习)(经历|经验)?$`
- 荣誉奖项：增强 `^(获奖|荣誉|奖项|奖励|成就)(经历|情况|记录|列表)?$`

**新增解析函数**：
- `parseProjectsBlock(block)` - 切分项目条目，提取 name/role/date/desc/tech/link
- `parseHighlightsBlock(contentLines)` - 整体作为一段文本
- `parseAwardsBlock(contentLines)` - 按行切分

**增强解析函数**：
- `parseEducationBlock`：
  - GPA：`(?:GPA|平均学分绩点|均绩)[：:]\s*([0-9./]+)`
  - 起止时间：在 entry 头部范围内检测日期范围
  - 荣誉/课程：通过前缀关键词（"荣誉"、"奖学金"、"主修课程"、"核心课程"）识别
- `parseExperienceBlock`：
  - location：通过 "公司 · 北京" 或 "工作地:北京" 模式识别
- `parseResumeFromLayout`：
  - `linkedin` / `website` 落地到 `result.linkedin` / `result.website`

### 5. 渲染器字段标签补充

仅在 `getFieldLabel` 的 `known` 字典中补充：
- `location`（地点）、`gpa`（GPA/成绩）、`honors`（荣誉奖项）、`coursework`（核心课程）、`role`（担任角色）、`link`（项目链接）、`highlights`（项目亮点）、`industry`（行业）

### 6. Prompt 更新

在 `buildImportResumePrompt` 和 `buildResumeContext` 中：
- 列出新增字段供 AI 提取
- 明确说明 `projects` / `highlights` / `awards` 的语义
- 强调字段命名约定（单条 vs `entryN_xxx`）

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| 删除视觉主题自动应用后，导入的主题仍是 PDF 旧主题 | 用户可手动在 `VisualThemePicker` 中切换；保留所有内置主题 |
| 教育字段从 `gradYear` 改为 `endDate` 后，旧数据无法显示 | 项目未上线，无历史数据；新模板 `endDate` 优先显示 |
| `entryN_xxx` 扁平结构在 projects 数量多时 key 冲突 | 渲染器 `groupFieldsByEntry` 已正确处理 `entryN_xxx` 模式（line 489-495） |
| 解析器正则误识别（如"项目"出现在工作内容中） | `matchSectionHeader` 已有 `trimmed.length > 30` 长度限制；新增正则通过测试覆盖 |
| 字段过多导致 AI prompt 过长 | 仅在 `buildImportResumePrompt` 中列出关键字段；`buildResumeContext` 复用模板 JSON |
| 旧主题导入数据残留 | 删除 `themes/imported-1cca47b1.json` 测试文件 |
