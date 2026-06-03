## Why

当前简历导入流程存在三个用户可感知的问题：

1. **导入 PDF 时错误地复刻了原 PDF 的视觉主题**（颜色、字体、布局），导致复刻效果差（实测 50% 复刻度）且与系统精心调优的内置主题冲突，复刻逻辑复杂、维护成本高。
2. **导入按钮位置不合理**：当前 `<FileUpload>` 组件位于中间对话区顶部，但中间区专注于"当前简历"的对话和预览，导入简历是一个"创建新简历"的入口，应放在左侧栏与"创建简历"并列。
3. **导入内容字段缺失严重**，远未达到业界顶尖简历模板（LinkedIn / Resume.io / Zety / BeamJobs / Enhancv / 超级简历）的标准：
   - 缺失**独立"项目经历" section**（业界共识：项目经历应与工作经历并列，是技术岗简历的核心）
   - 缺失**"个人优势 / 核心竞争力"** 字段
   - 教育经历缺：起止时间、GPA、荣誉奖项、核心课程、学校地点
   - 工作经历缺：工作地点
   - 个人信息缺：所在城市、LinkedIn
   - 缺失"荣誉奖项"独立 section
   - 证书缺：颁发机构、获取时间

## What Changes

- **剥离视觉主题提取**：从 PDF 导入流程中移除 `extractPdfTheme` / `saveImportedTheme` / `setCurrentVisualTheme` 调用链，导入后保留用户当前选中的内置主题。**项目内固有的视觉模板切换系统（`VisualThemePicker`、14+ 内置主题、主题切换、删除等）完全保留**，用户仍可手动选择或切换。
- **导入按钮迁至左侧栏**：在 `Sidebar` 中"创建简历"按钮下方新增"导入 PDF 简历"按钮（次要样式），支持点击选择和拖拽两种交互。中间对话区不再显示 FileUpload 块。`ChatInput` 仍保留 PDF 拖入入口。
- **补全内容模板到业界顶尖标准**：扩展 `templates/general.json`，按 LinkedIn / 超级简历 等顶尖模板的字段结构，新增/完善：
  - personal：`location`, `linkedin`
  - 新增 `highlights`（个人优势）
  - experience：`location`
  - 新增 `projects`（独立多 entry section）
  - education：`startDate`, `endDate`（替代 `gradYear`）, `gpa`, `honors`, `coursework`, `location`
  - certifications：保持
  - 新增 `awards`
- **扩展 PDF 解析能力**：`electron/resume-parser.ts` 增强 `matchSectionHeader` 正则覆盖更多中文 section 标题，新增 `parseProjectsBlock` / `parseHighlightsBlock` / `parseAwardsBlock`，增强 `parseEducationBlock` 提取 GPA/起止时间/荣誉/课程。
- **扩展数据映射**：`electron/template-mapper.ts` 处理新增字段到 `entryN_xxx` 扁平结构。
- **更新渲染器字段标签**：`src/lib/resume-renderer.ts` 的 `getFieldLabel` 补充新字段的中文标签。
- **更新 AI prompt**：`src/adapter/distillation.ts` 的 `buildImportResumePrompt` 和 `buildResumeContext` 加入新字段说明。

## Capabilities

### Modified Capabilities
- `resume-import`：从 PDF 导入简历的完整流程
  - 视觉主题提取从导入流中剥离
  - 导入按钮位置迁移到左侧栏
  - 导入内容字段扩展到业界标准
- `resume-content`：简历内容模板的字段定义
  - 模板结构按业界顶尖标准重定义
  - section 顺序调整为：个人 → 简介 → 优势 → 技能 → 工作 → 项目 → 教育 → 证书 → 奖项

## Impact

- 删除调用：`src/App.tsx` 中 `handleImportPdfResume` 的 `extractPdfTheme` / `saveImportedTheme` / `setCurrentVisualTheme` 块（约 36 行），以及 `handleAfterDone` 中的 `tryDetectStyleJSON` 调用
- 新增导入按钮：`src/components/Sidebar.tsx` 新增"导入 PDF 简历"按钮 + 隐藏 file input + 拖拽支持
- 移除中间 FileUpload：`src/App.tsx` 删除 `<FileUpload>` 渲染
- 模板重写：`templates/general.json` 按新结构重写
- 解析器扩展：`electron/resume-parser.ts` 扩展数据模型、section 正则、新增/增强解析函数
- 映射器扩展：`electron/template-mapper.ts` 映射新字段
- 渲染器更新：`src/lib/resume-renderer.ts` 补充字段标签
- Prompt 更新：`src/adapter/distillation.ts` 加入新字段说明
- 测试更新：`electron/__tests__/template-mapper.test.ts`、新增/更新 `electron/__tests__/resume-parser.test.ts`、`src/__tests__/distillation.test.ts`
- 清理：`themes/imported-1cca47b1.json` 测试数据

**不动**：
- `themes/index.ts`、所有内置主题 JSON（14+ 个）
- `src/components/VisualThemePicker.tsx`（用户手动切换主题的 UI）
- `electron/pdf-theme-extractor.ts`、`electron/imported-themes.ts`（视觉主题提取基础设施，保留备未来）
- `electron/ipc.ts` 主题相关 IPC handler
- `src/types/visual-template.ts`、`src/env.d.ts` 中的视觉主题类型定义
- `ChatInput.tsx` 的 PDF 拖入/上传入口
