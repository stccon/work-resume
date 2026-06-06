## ADDED Requirements

### Requirement: V3 设计系统宪法（8 条强制约束）

系统 SHALL 为所有 V3 视觉主题强制执行 8 条设计约束：

1. **类型系统** — 单一 type family（`"sans"` / `"serif"` / `"mono"`）；字号严格 5-6 档（name / title / sectionTitle / body / entryTitle / entryDate + 可选 tag）；行高 1.3-1.75；letter-spacing 仅 section title 用 0.16-0.20em uppercase
2. **颜色系统** — 7 个颜色 token（primary / accent / background / surface / border / muted / text），不得超出
3. **间距系统** — baseline grid 4px 或 8px；所有 spacing（pagePadding / sectionGap / entryGap）必须是 baseline 整数倍
4. **排版密度** — 主题声明 1 档（dense / normal / spacious），entryGap / pagePadding 落入对应区间
5. **头像职责** — 主题 `hasAvatar` 字段为 `boolean` 必填；当 `hasAvatar=true` 时强制存在 `avatar: { placement, size, shape, border }`；当 `hasAvatar=false` 时禁止 `avatar` 字段存在
6. **Section 标题** — 1 种装饰规则（`"short-line"` / `"full-line"` / `"double-line"` / `"boxed"` / `"none"`）+ 1 种字母处理 + 1 种字重（500-700）
7. **列表 / Tag** — 1 种 bullet（`"•"` / `"—"` / `"›"` / `"▪"` / `"none"`）+ 1 种 tag style（`"pill"` / `"flat"` / `"underline"`）
8. **打印感知** — entry 级 `page-break-inside: avoid`；日期/数字 `tabular-nums`；中英文之间 0.05em 空隙

#### Scenario: V3 主题 JSON 通过宪法校验

- **WHEN** 一个 V3 主题 JSON 通过 `validateV3Theme(theme)` 函数
- **THEN** 返回 `{ ok: true }`，且该主题可被注册到 VisualThemePicker

#### Scenario: 颜色 token 超 7 报错

- **WHEN** 主题 JSON 包含超过 7 个颜色 token（如新增 `headerBg` / `linkColor` 等）
- **THEN** `validateV3Theme` 返回 `{ ok: false, errors: ["颜色 token 数量超 7：实际 8"] }`，主题不被注册

#### Scenario: spacing 非 baseline 倍数告警

- **WHEN** 主题 `pagePadding: "50px"` 在 `baseline: 4` 时
- **THEN** `assertBaselineMultiple(50, 4, "pagePadding")` 在 dev 模式 `console.warn`；release 模式静默通过（避免阻塞生产加载）

#### Scenario: hasAvatar 与 avatar 字段不一致

- **WHEN** 主题 `hasAvatar: false` 但 JSON 仍含 `avatar` 字段
- **THEN** `validateV3Theme` 返回 `{ ok: false, errors: ["hasAvatar=false 时不应有 avatar 字段"] }`

#### Scenario: hasAvatar=true 缺失 avatar 字段

- **WHEN** 主题 `hasAvatar: true` 但 JSON 不含 `avatar` 字段
- **THEN** `validateV3Theme` 返回 `{ ok: false, errors: ["hasAvatar=true 时必须有 avatar 字段"] }`

#### Scenario: typeFamily 与字体不一致

- **WHEN** 主题声明 `typeFamily: "serif"` 但 `fonts.body` 用了 sans-serif 字体栈
- **THEN** `validateV3Theme` 返回 `{ ok: false, errors: ["typeFamily=serif 与 fonts.body 不一致"] }`（轻量校验，只检查字面包含 "mono" / "sans-serif" / "serif" 关键词）

### Requirement: 4 个 V3 主题存在

系统 SHALL 在 `themes/` 目录下提供 4 个 V3 主题 JSON：`v3-onyx` / `v3-linear` / `v3-editorial` / `v3-mono`。每个主题 SHALL 通过 V3 设计系统宪法校验。

| 主题 | 头像 | 栏数 | 字体 | 密度 | 对标 |
|---|---|---|---|---|---|
| `v3-onyx` | 有 | 双栏 sidebar | sans-serif | spacious | Habaneraa Sidebar |
| `v3-linear` | 无 | 单栏 | sans-serif | dense | Linear changelog |
| `v3-editorial` | 无 | 单栏 | serif | spacious | Kinfolk / Monocle |
| `v3-mono` | 无 | 单栏 | monospace | dense | Vercel docs / SBT |

#### Scenario: V3 主题在 VisualThemePicker 展示

- **WHEN** 应用启动加载所有视觉主题
- **THEN** VisualThemePicker 显示 4 个 V3 主题，按 `v3-linear` / `v3-onyx` / `v3-editorial` / `v3-mono` 顺序，扁平展示（无分组）
- **AND** 不显示任何 v1/v2/PRO 标签

#### Scenario: 主题数量固定为 4

- **WHEN** 第三方通过 `imported-*.json` 导入用户上传主题
- **THEN** 4 个 V3 主题 + 导入主题总数 = 4 + N；导入主题按字母顺序排在 V3 主题之后

### Requirement: hasAvatar 二元化

系统 SHALL 将每个 V3 主题的 `hasAvatar` 字段视为 `boolean` 必填，不再支持"主题有 avatar 配置但用户没传"的中间态。

#### Scenario: hasAvatar=true 主题永远保留头像位

- **WHEN** 当前主题 `hasAvatar=true`（如 `v3-onyx`）
- **THEN** 简历预览区在 header 或 sidebar 永远渲染头像 DOM 节点
- **AND** 当用户提供 `avatar` dataUrl 时，渲染 `<img>`
- **AND** 当用户未提供 avatar dataUrl 时，渲染 monogram 占位

#### Scenario: hasAvatar=false 主题不渲染头像

- **WHEN** 当前主题 `hasAvatar=false`（如 `v3-linear` / `v3-editorial` / `v3-mono`）
- **THEN** 简历预览区 header / sidebar 永远不渲染头像 DOM 节点
- **AND** ResumeNamePill 的「显示头像」开关被禁用 / 隐藏（避免用户上传后无处显示）

#### Scenario: 切换主题时 monogram 与真实头像正确切换

- **WHEN** 用户从 `v3-onyx` 切换到 `v3-linear`（无论切换顺序）
- **THEN** 头像 DOM 节点消失；ResumeNamePill 开关禁用
- **AND** 用户的 avatar dataUrl 仍在 electron-store 中保留（不删除）
- **WHEN** 用户从 `v3-linear` 切回 `v3-onyx`
- **THEN** 头像 DOM 节点重新出现，显示之前的头像或 monogram

### Requirement: sectionOrder 字段注入渲染

系统 SHALL 在 `V3Theme` 接口中提供 `sectionOrder: string[]` 字段，渲染器 SHALL 按该数组顺序渲染 template 的 sections。`sectionOrder` 中未列出的 section SHALL NOT 渲染。

#### Scenario: theme.sectionOrder 覆盖 template 默认顺序

- **WHEN** `v3-linear` 主题声明 `sectionOrder: ["personal", "summary", "experience", "projects", "skills", "education"]`
- **THEN** 简历按 personal → summary → experience → projects → skills → education 顺序渲染
- **AND** template 默认顺序被覆盖

#### Scenario: 主题未列出的 section 不渲染

- **WHEN** `v3-editorial` 主题 `sectionOrder` 数组不包含 `"certifications"`
- **THEN** 简历中不显示「证书与培训」section，即使 template 中存在该 section 定义

#### Scenario: sectionOrder 与数据无关

- **WHEN** 用户切换 `v3-linear` ↔ `v3-editorial`
- **THEN** 简历数据（`ResumeData.sections`）不变；仅渲染顺序变化
- **AND** `electron-store` 持久化内容不变

### Requirement: Monogram 占位

系统 SHALL 在 `hasAvatar=true` 主题下，当用户未提供 avatar dataUrl 时，自动渲染 monogram 占位（圆形 + 主题 primary 背景 + 白色/对比色文字 + 姓名首字母）。

#### Scenario: 中文姓名取姓氏

- **WHEN** 简历 `personal.name = "张明"` 且无 avatar dataUrl
- **THEN** monogram 显示圆形 + primary 色背景 + 白色 "张" 字

#### Scenario: 英文姓名取首字母

- **WHEN** 简历 `personal.name = "Zhang Ming"` 且无 avatar dataUrl
- **THEN** monogram 显示 "ZM"（first + last name 首字母大写）

#### Scenario: 单英文名取单个首字母

- **WHEN** 简历 `personal.name = "Madonna"` 且无 avatar dataUrl
- **THEN** monogram 显示 "M"

#### Scenario: 姓名缺失

- **WHEN** 简历 `personal.name` 为空 / undefined 且无 avatar dataUrl
- **THEN** monogram 显示 "?"（muted 色 + 略小字号）

#### Scenario: monogram 形状与主题一致

- **WHEN** 主题 `avatar.shape: "circle"` / `"rounded"` / `"square"`
- **THEN** monogram 用对应形状（border-radius 50% / 8px / 0）渲染

#### Scenario: monogram 尺寸与主题一致

- **WHEN** 主题 `avatar.size: "small"` (40px) / `"medium"` (64px) / `"large"` (96px)
- **THEN** monogram 用对应直径渲染，文字字号按比例（small 14px / medium 22px / large 32px）

### Requirement: 渲染器排版原语升级

系统 SHALL 在 `src/lib/resume-renderer.ts` 中实现 3 个排版原语（Phase 0 硬前置）：

1. **page-break-inside: avoid** 在 `@media print` 中作用于 `.resume-entry` 和 `.resume-section`
2. **font-variant-numeric: tabular-nums** 在 `body` 和所有日期文本选择器中
3. **Baseline grid 4/8px** — `assertBaselineMultiple()` 校验函数在 dev 模式告警

#### Scenario: PDF 导出 entry 不跨页

- **WHEN** 用户在浏览器预览中看到 entry 完整显示
- **AND** 用户导出 PDF
- **THEN** PDF 中 entry 不会被 page-break 切割到两页（除非 entry 高度超过一整页 A4 高度）

#### Scenario: 日期数字等宽对齐

- **WHEN** 简历中两条 entry 的 date 分别为 "2022.03 — 2024.06" 和 "2024.07 — 现在"
- **THEN** 两个 date 在右对齐时，数字字符宽度一致（"2022" / "2024" 等宽）

#### Scenario: spacing 非 baseline 倍数告警

- **WHEN** 主题声明 `pagePadding: "50px"` 且 `baseline: 4`
- **THEN** 启动时 dev 模式 console 输出 `⚠️ pagePadding: 50px 不是 baseline=4 的整数倍（期望 4 的倍数：48 / 52）`
- **AND** release 模式不告警，不阻塞

### Requirement: 旧 14 主题归档

系统 SHALL 将 6 个 v1 主题（`elegant-blue` / `graphite` / `emerald-sidebar` / `amber-header` / `basalt` / `glacier`）和 8 个 v2 主题（`v2-modern-pro` / `v2-editorial` / `v2-executive-sidebar` / `v2-tech-blueprint` / `v2-academic-serif` / `v2-warm-earth` / `v2-typst-monospace` / `v2-minimal-mono`）从 VisualThemePicker 移除，移至 `themes/_archived_v1_v2/` 子目录。

#### Scenario: 旧主题不在 VisualThemePicker 显示

- **WHEN** 应用启动
- **THEN** VisualThemePicker 仅显示 4 个 V3 主题 + 任何 `imported-*.json` 用户导入主题
- **AND** 14 个 v1/v2 主题不在显示列表中

#### Scenario: 旧主题归档文件保留

- **WHEN** 用户查看 `themes/_archived_v1_v2/` 目录
- **THEN** 14 个 JSON 文件按 `v1/` / `v2/` 子目录归类存在
- **AND** `themes/_archived_v1_v2/README.md` 解释归档目的与回滚方法

#### Scenario: 旧主题 JSON 通过 git 可恢复

- **WHEN** 需要回滚到 v1/v2 主题
- **THEN** 从 `themes/_archived_v1_v2/` 复制对应 JSON 到 `themes/` 根目录
- **AND** 重新在 `themes/index.ts` 中 `import` 并注册
- **AND** 重启应用后旧主题重新出现在 VisualThemePicker

#### Scenario: 旧主题相关代码从渲染器删除

- **WHEN** 编译 `src/lib/resume-renderer.ts`
- **THEN** 不存在 `renderV2CSS()` 函数（v2 路径已删除）
- **AND** 不存在 v1 baseCSS 的 `headerStyle: "colored-bar"` / `decorationStyle: "dot"` / `sectionStyle: "underlined" | "colored-bg" | "card"` 相关 CSS 规则

### Requirement: ResumeNamePill 与 hasAvatar 联动

系统 SHALL 在 `ResumeNamePill` 组件中根据当前主题的 `hasAvatar` 字段决定「显示头像」开关的可用性。

#### Scenario: hasAvatar=true 主题下开关可用

- **WHEN** 当前主题 `hasAvatar=true`（如 `v3-onyx`）且该简历有 avatar
- **THEN** ResumeNamePill popover 内显示「显示头像」开关，可切换 enabled 状态
- **AND** 切换时控制简历区显示真实头像 / monogram 占位

#### Scenario: hasAvatar=false 主题下开关禁用

- **WHEN** 当前主题 `hasAvatar=false`（如 `v3-linear`）
- **THEN** ResumeNamePill popover 内「显示头像」开关**隐藏**（不显示该行）
- **OR** 开关 disabled 不可点击，并显示提示文字"当前主题不使用头像"

#### Scenario: 切换主题时提示用户

- **WHEN** 用户从 `v3-onyx`（有头像）切换到 `v3-linear`（无头像）
- **THEN** toast.info 一次性提示"该简历的头像将不再显示，但数据保留"（避免用户困惑"头像去哪了"）

### Requirement: V3 主题不破坏现有数据流

系统 SHALL 确保 V3 主题的切换不影响 `ResumeData` 持久化、`updateResume` IPC、`setChatContext` 调用、字段级编辑（inline-field-edit-and-polish）、PDF 导出等现有数据流。

#### Scenario: 切换 V3 主题不影响简历数据

- **WHEN** 用户切换 `v3-linear` → `v3-onyx` → `v3-editorial`
- **THEN** `ResumeData.sections` 内容不变
- **AND** `electron-store` 持久化内容不变
- **AND** chat 上下文（`setChatContext` 调用）不变

#### Scenario: V3 主题下字段级编辑仍工作

- **WHEN** 当前主题为任意 V3 主题，用户点击 `personal.name` 字段
- **THEN** `FieldEditorDialog` 模态框正常打开（与 V3 主题无关）
- **AND** inline-field-edit-and-polish 的所有能力（手动编辑、AI 润色、diff、采纳/拒绝）仍可用

#### Scenario: V3 主题下 PDF 导出正常

- **WHEN** 用户在任意 V3 主题下导出 PDF
- **THEN** PDF 视觉与浏览器预览一致
- **AND** PDF 中 entry 不跨页断开（`page-break-inside: avoid` 生效）
- **AND** PDF 中日期数字等宽（`tabular-nums` 生效）
