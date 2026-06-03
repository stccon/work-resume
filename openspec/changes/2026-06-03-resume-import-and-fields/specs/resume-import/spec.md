## MODIFIED Requirements

### Requirement: 导入 PDF 简历时不再提取或应用原 PDF 视觉主题

系统 SHALL 在用户导入 PDF 简历时，**不**调用 `extractPdfTheme`、**不**保存导入主题、**不**自动应用该主题为当前主题。导入完成后，用户的"当前视觉主题"保持不变（仍是用户先前选中的内置主题）。

#### Scenario: 导入 PDF 后主题保持不变
- **WHEN** 用户点击"导入 PDF 简历"并选择一份带红色配色、自定义字体的 PDF
- **THEN** 系统提取头像（如有）和内容字段
- **AND** 当前视觉主题保持为用户上次选中的内置主题
- **AND** `VisualThemePicker` 中不出现"导入主题"分组（用户主题切换界面不被污染）

#### Scenario: 用户切换主题不受影响
- **WHEN** 用户在导入 PDF 之后打开 `VisualThemePicker`
- **THEN** 用户仍能选择任一内置主题（14+ 主题不受影响）
- **AND** 主题选择器行为与导入前完全一致

### Requirement: 导入 PDF 简历按钮位于左侧栏

系统 SHALL 在左侧栏"创建简历"按钮正下方显示"导入 PDF 简历"按钮。点击该按钮弹出文件选择器；用户也可将 PDF 文件拖拽到侧栏触发导入。

#### Scenario: 通过左侧栏按钮导入
- **WHEN** 用户在左侧栏点击"导入 PDF 简历"
- **THEN** 系统弹出文件选择器
- **AND** 用户选择 PDF 后，系统开始解析并创建新简历

#### Scenario: 通过拖拽到左侧栏导入
- **WHEN** 用户将一个 PDF 文件拖拽到左侧栏
- **THEN** 系统开始解析并创建新简历

#### Scenario: 中间对话区无导入按钮
- **WHEN** 用户已创建或导入至少一份简历
- **THEN** 中间对话区顶部**不**显示独立的 FileUpload 块
- **AND** 顶部 header 区域也**不**显示 FileUpload 块

#### Scenario: ChatInput 仍可拖入 PDF（保留行为）
- **WHEN** 用户将 PDF 拖拽到底部 ChatInput 区域
- **THEN** 系统开始解析并创建新简历（与之前行为一致）

### Requirement: 导入内容字段符合业界顶尖标准

系统 SHALL 在导入 PDF 简历时，提取以下业界标准字段（LinkedIn / Resume.io / 超级简历 共识）：

- **personal**: name, title, email, phone, location, linkedin, github
- **summary**: summary
- **highlights**: highlights（个人优势/核心竞争力）
- **skills**: skills, languages, frameworks, databases, cloud
- **experience**（每条 entry）: company, position, location, startDate, endDate, achievements, techStack, teamSize, responsibilities
- **projects**（独立 section，每条 entry）: name, role, startDate, endDate, description, techStack, link, highlights
- **education**（每条 entry）: school, major, degree, startDate, endDate, gpa, honors, coursework, location
- **certifications**: certifications
- **awards**: awards

#### Scenario: 导入包含项目经历的 PDF
- **WHEN** 用户导入一份 PDF，其中"项目经历"是独立 section
- **THEN** 系统正确识别并切分出多个项目条目
- **AND** 每个项目包含 name、role、date、description、techStack 等字段
- **AND** 数据以 `entryN_xxx` 扁平结构存储到 `sections.projects`

#### Scenario: 导入包含个人优势的 PDF
- **WHEN** 用户导入一份 PDF，其中"个人优势"或"核心竞争力"是 section
- **THEN** 系统将该段文本提取到 `sections.highlights.highlights`

#### Scenario: 导入教育经历包含 GPA
- **WHEN** 用户导入的 PDF 教育段中包含 "GPA: 3.8/4.0" 或 "均绩：3.8"
- **THEN** 系统提取 GPA 到对应 education entry

#### Scenario: 导入工作经历包含工作地点
- **WHEN** 用户导入的 PDF 工作段中包含 "字节跳动 · 北京" 或 "工作地:上海"
- **THEN** 系统提取 location 到对应 experience entry

### Requirement: 头像提取（保留行为）

系统 SHALL 在导入 PDF 简历时，提取 PDF 中的证件照（如有）作为用户头像。

#### Scenario: PDF 中包含头像
- **WHEN** 用户导入的 PDF 包含一张正面证件照
- **THEN** 系统提取该图片
- **AND** 设置为用户的 `userAvatar`
- **AND** 启用头像显示

## REMOVED Requirements

### Requirement: 导入 PDF 简历时自动复刻原 PDF 视觉主题
**Reason**: 视觉主题复刻效果差（实测 ~50% 复刻度），与系统精心调优的内置主题冲突，维护成本高。用户更倾向于使用系统内置主题。

**Migration**: 用户可在 `VisualThemePicker` 中手动选择任一内置主题。视觉主题提取的基础设施（`pdf-theme-extractor.ts`、`imported-themes.ts`）保留备未来扩展。
