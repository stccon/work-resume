## 1. OpenSpec 提案

- [x] 1.1 创建 `proposal.md` 描述 Why / What Changes / Capabilities / Impact
- [x] 1.2 创建 `design.md` 描述 Context / Goals / Decisions / Risks
- [x] 1.3 创建 `tasks.md` 描述实施任务清单
- [x] 1.4 创建 `specs/resume-import/spec.md`
- [x] 1.5 创建 `specs/resume-content/spec.md`

## 2. 剥离视觉主题提取（任务 1）

- [ ] 2.1 删除 `src/App.tsx` `handleImportPdfResume` 中 `extractPdfTheme` / `saveImportedTheme` / `setVisualThemes` / `setCurrentVisualTheme(updated)` 块（约 36 行）
- [ ] 2.2 删除 `tryDetectStyleJSON` 的 toast 调用及主题更新逻辑
- [ ] 2.3 保留 `extractPdfAvatarPayload` 调用
- [ ] 2.4 验证：导入 PDF 后主题选择器仍正常工作，仅不再自动应用 PDF 主题

## 3. 导入按钮迁至左侧栏（任务 2）

- [ ] 3.1 修改 `src/components/Sidebar.tsx`：
  - 新增 `onImportPdf: (file: File) => void` prop
  - 在"创建简历"按钮下方新增"导入 PDF 简历"按钮（次要样式）
  - 触发隐藏的 `<input type="file" accept=".pdf">`
  - 侧栏 `onDragOver` / `onDrop` 处理 PDF 拖入
  - 更新空态文案
- [ ] 3.2 修改 `src/App.tsx`：
  - 删除中间区顶部 `<FileUpload>` 渲染
  - `<Sidebar>` 传入 `onImportPdf={handleImportPdfResume}`
- [ ] 3.3 验证：左侧栏点击/拖入均成功，中间区无 FileUpload 块，`ChatInput` 仍可拖入 PDF

## 4. 扩展内容模板（任务 3）

- [ ] 4.1 重写 `templates/general.json`：
  - section 顺序：personal → summary → highlights → skills → experience → projects → education → certifications → awards
  - personal 加 `location`, `linkedin`
  - 新增 `highlights` section（textarea）
  - experience 加 `location`
  - 新增 `projects` section（8 个字段：name, role, startDate, endDate, description, techStack, link, highlights）
  - education 加 `startDate`, `endDate`（替代 `gradYear`）, `gpa`, `honors`, `coursework`, `location`
  - 新增 `awards` section（textarea）
  - 保留 `teamSize`, `responsibilities` 字段
- [ ] 4.2 验证：JSON 通过 `tsc --noEmit`

## 5. 扩展 ParsedResume 数据模型（任务 4）

- [ ] 5.1 新增 `ParsedProject` interface：`name, role, startDate, endDate, description, techStack, link, highlights`
- [ ] 5.2 扩展 `ParsedExperience`：加 `location, industry?`
- [ ] 5.3 扩展 `ParsedEducation`：加 `startDate, endDate, gpa, honors, coursework, location`
- [ ] 5.4 扩展 `ParsedResume`：加 `location, highlights, projects, awards, publications`
- [ ] 5.5 在 `parseResumeFromLayout` 中：把 `extractLinkedin` / `extractWebsite` 写入 `result.linkedin` / `result.website`

## 6. 扩展 matchSectionHeader 正则（任务 5）

- [ ] 6.1 新增识别"个人优势"
- [ ] 6.2 新增识别"自我评价/个人评价"
- [ ] 6.3 增强"项目经验"识别
- [ ] 6.4 新增识别"实习经历"
- [ ] 6.5 增强"荣誉奖项"识别
- [ ] 6.6 增强"论文/出版"识别

## 7. 新增/增强解析函数（任务 6）

- [ ] 7.1 新增 `parseProjectsBlock(block)`：切分项目条目
- [ ] 7.2 新增 `parseHighlightsBlock(contentLines)`：个人优势
- [ ] 7.3 新增 `parseAwardsBlock(contentLines)`：按行切分
- [ ] 7.4 增强 `parseEducationBlock`：提取 GPA / 起止时间 / 荣誉 / 课程 / 学校地点
- [ ] 7.5 增强 `parseExperienceBlock`：提取 location
- [ ] 7.6 在 `parseResumeFromLayout` 主循环中添加 projects / highlights / awards 处理分支

## 8. 扩展 template-mapper.ts（任务 7）

- [ ] 8.1 映射 `projects` 数组为 `entryN_xxx` 扁平结构
- [ ] 8.2 映射 `highlights` 到 `sections.highlights.highlights`
- [ ] 8.3 映射新 personal 字段（`location, linkedin`）
- [ ] 8.4 映射新 education 字段（`startDate, endDate, gpa, honors, coursework, location`）
- [ ] 8.5 映射新 experience 字段（`location`）
- [ ] 8.6 映射 `awards` 到 `sections.awards.awards`

## 9. 更新 resume-renderer.ts 字段标签（任务 8）

- [ ] 9.1 在 `getFieldLabel` 的 `known` 字典中补充新字段中文标签

## 10. 更新 distillation.ts prompt（任务 9）

- [ ] 10.1 `buildImportResumePrompt` 增加对新字段的说明和示例
- [ ] 10.2 `buildResumeContext` 在模板字段说明中体现新 section

## 11. 单元测试（任务 10）

- [ ] 11.1 更新 `electron/__tests__/template-mapper.test.ts`：补充 projects / highlights / 新 education 字段的测试
- [ ] 11.2 新建/更新 `electron/__tests__/resume-parser.test.ts`：section 检测 + 解析测试
- [ ] 11.3 更新 `src/__tests__/distillation.test.ts`：prompt 包含新字段

## 12. 清理与验证（任务 11）

- [ ] 12.1 删除 `themes/imported-1cca47b1.json` 测试数据
- [ ] 12.2 全局搜索 `isImported` / `importedFrom` / `themeResult` 确认无遗漏引用
- [ ] 12.3 运行 `npm run typecheck`：通过
- [ ] 12.4 运行 `npm test`：所有测试通过
- [ ] 12.5 手动验证：导入 1 份 PDF，确认头像被提取、视觉主题不变（用户当前主题保留）、内容字段完整
