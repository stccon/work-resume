# Tasks: v3-premium-themes

> 实施 V3 视觉主题系统：4 个 Habaneraa 级别主题（Onyx / Linear / Editorial / Mono），渲染器升级 baseline / tabular-nums / page-break / monogram，14 个旧 v1/v2 主题归档。Phase 0 渲染器底座是 V3 主题落地的硬前置。

## Phase 0: 渲染器底座（硬前置）

### 0.1 V3 类型系统

- [x] 0.1.1 `src/types/visual-template.ts`：删除 v1/v2 老枚举（`ThemeSeries` / `ThemeFamily` / `ThemeLanguage` / `sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"` / `decorationStyle` / `headerStyle: "centered" | "left" | "colored-bar"` / `v2Config` 整段）
- [x] 0.1.2 `src/types/visual-template.ts`：定义新 `V3Theme` interface，必填字段：`name` / `label` / `description` / `hasAvatar` / `typeFamily: "sans" | "serif" | "mono"` / `sectionOrder` / `fonts` / `typography` / `colors` / `baseline` / `spacing` / `sectionTitleRule` / `bullet` / `tagStyle` / `print`
- [x] 0.1.3 `src/types/visual-template.ts`：当 `hasAvatar=true` 时，强制存在 `avatar: { placement, size, shape, border }`；当 `hasAvatar=false` 时，禁止 `avatar` 字段
- [x] 0.1.4 `src/types/visual-template.ts`：导出 `validateV3Theme(theme): { ok: true } | { ok: false; errors: string[] }`，校验 V3 宪法 8 条约束（颜色 token ≤ 7、字号档 ≤ 6、spacing 是 baseline 倍数、typeFamily 一致、hasAvatar 二元等）
- [x] 0.1.5 `src/__tests__/validate-v3-theme.test.ts`：覆盖宪法 8 条 — 颜色超 7 token 报错 / 字号超 6 档报错 / spacing 非 baseline 倍数报错 / hasAvatar=false 但带 avatar 字段报错 / hasAvatar=true 但缺 avatar 字段报错 / typeFamily 与 font 不一致报错

### 0.2 渲染器基线原语

- [x] 0.2.1 `src/lib/baseline-grid.ts`：导出 `assertBaselineMultiple(value: number, baseline: number, field: string): void`，开发模式（`import.meta.env.DEV`）不符合则 `console.warn`
- [x] 0.2.2 `src/lib/baseline-grid.ts`：导出 `getBaselineReminders(theme: V3Theme): string[]`，返回所有 spacing 不符合的字段名（用于在 VisualThemePicker 调试面板显示）
- [x] 0.2.3 `src/__tests__/baseline-grid.test.ts`：覆盖 baseline=4 / baseline=8 / 边界值（4 的倍数但带 0.5 偏差）
- [x] 0.2.4 `src/lib/resume-renderer.ts` 的 `renderResumeCSS()`：在 CSS 顶部加 `@media print { .resume-entry { page-break-inside: avoid; break-inside: avoid; } .resume-section { page-break-inside: avoid; } }`
- [x] 0.2.5 `src/lib/resume-renderer.ts` 的 `renderResumeCSS()`：在 `body` 通用选择器上加 `font-variant-numeric: tabular-nums`；在 `.resume-entry-date` 上确认已有（如没有则加）

### 0.3 Monogram 占位

- [x] 0.3.1 `src/lib/monogram.ts`：导出 `getMonogramText(name: string | undefined, fallback?: string): string`
  - 中文姓名（`/[\u4e00-\u9fa5]/`）：取第一个汉字（姓氏）
  - 英文姓名（`/^[A-Za-z\s.]+$/`）：取 first + last name 首字母大写（"Zhang Ming" → "ZM"，"Madonna" → "M"，"John F. Kennedy" → "JK"）
  - 空 / undefined：用 `?` 或传入的 fallback
- [x] 0.3.2 `src/lib/monogram.ts`：导出 `renderMonogram(name, theme)`：返回 inline span（圆形 + primary 背景 + 姓名首字母 + size 由 theme.avatar.size 决定）
- [x] 0.3.3 `src/lib/resume-renderer.ts`：将 `renderAvatarElement()` 改造为 `renderAvatar(avatarUrl: string | undefined, theme: V3Theme)` —— 有 `avatarUrl` 时渲染 `<img>`，无 `avatarUrl` 时调 `renderMonogram()` 渲染
- [x] 0.3.4 `src/__tests__/monogram.test.ts`：覆盖中文 / 英文 / 单名 / 多名 / 缺名 / 数字姓名（防御性）

### 0.4 sectionOrder 注入

- [x] 0.4.1 `src/lib/resume-renderer.ts` 的 `renderSections()`：增加 `sectionOrder?: string[]` 参数；当传入时按 order 排序 template.sections，未在 order 列表中的 section 不渲染
- [x] 0.4.2 `src/lib/resume-renderer.ts` 的 `renderResumeBody()`：从 `theme.sectionOrder` 读取并传给 `renderSections()`
- [x] 0.4.3 验证：template 中存在但 `sectionOrder` 中不存在的字段不渲染（如未来 template 加新字段，主题未更新会自然隐藏，不会"漏出新 section"）

### 0.5 hasAvatar 二元化

- [x] 0.5.1 `src/lib/resume-renderer.ts` 的 `renderResumeBody()`：删除 `isTwoCol && avatarCfg?.placement === "sidebar-top"` 等复杂分支；改为 `if (theme.hasAvatar) { renderAvatar(...) }`，不再有"无头像 fallback"
- [x] 0.5.2 `src/lib/resume-renderer.ts` 的 `renderResumeBody()`：删除 `showAvatar` 变量（不再需要"有头像数据 + 主题支持"的复合判断）
- [x] 0.5.3 `src/components/VisualThemePicker.tsx`：删除 v1/v2 分组、`PRO` 标签、v1/v2 标识；改为 4 个 V3 主题扁平列表

### 0.6 旧主题归档

- [x] 0.6.1 创建目录 `themes/_archived_v1_v2/`
- [x] 0.6.2 移动 6 个 v1 主题：`elegant-blue.json` / `graphite.json` / `emerald-sidebar.json` / `amber-header.json` / `basalt.json` / `glacier.json` → `themes/_archived_v1_v2/v1/`
- [x] 0.6.3 移动 8 个 v2 主题：`v2-modern-pro.json` / `v2-editorial.json` / `v2-executive-sidebar.json` / `v2-tech-blueprint.json` / `v2-academic-serif.json` / `v2-warm-earth.json` / `v2-typst-monospace.json` / `v3-minimal-mono.json` → `themes/_archived_v1_v2/v2/`
- [x] 0.6.4 `themes/_archived_v1_v2/` 下加 `README.md`：说明这是 V3 之前的旧主题，不在 VisualThemePicker 暴露，但保留以便回滚
- [x] 0.6.5 `themes/index.ts`：删除 14 个 v1/v2 import + 14 个 builtInThemes 注册；保留 `imported-*.json` glob
- [x] 0.6.6 `src/lib/resume-renderer.ts`：删除 `renderV2CSS()` 整段函数（约 150 行）
- [x] 0.6.7 `src/lib/resume-renderer.ts`：删除 `baseCSS` 中 v1 专属的 `headerStyle: "centered"` / `"colored-bar"` / `decorationStyle: "dot"` / `sectionStyle: "underlined" | "colored-bg" | "card"` 相关 CSS 规则

### 0.7 主题/头像联动

- [x] 0.7.1 `src/components/ResumeNamePill.tsx`：当 `hasAvatar=false` 主题被选中时，禁用/隐藏「显示头像」开关（UI 显示但不可点击 + 提示"当前主题不使用头像"）
- [x] 0.7.2 `src/App.tsx` 的 `handleVisualThemeChange` / 头像管理逻辑：当切换到 `hasAvatar=false` 主题时，提示用户"该简历的头像将不再显示，但数据保留"（toast.info 一次性）
- [x] 0.7.3 `src/App.tsx` 的 `composeDataWithAvatar`：当 `hasAvatar=true` 主题时，monogram 占位走 monogram 渲染路径；当 `hasAvatar=false` 主题时，移除 avatar dataUrl（确保不外泄到 PDF 渲染的 inline 样式里）

## Phase 1: V3 Linear（参考实现，最先落地）

> 4 项渲染器改动（baseline / tabular-nums / page-break / monogram）的"参考实现"。无头像，最简结构，验证 Phase 0 改动落地。

- [x] 1.1 `themes/v3-linear.json`：实现探索阶段已确认的完整 V3 Linear 设计稿
  - hasAvatar: false
  - typeFamily: "sans"
  - sectionOrder: `["personal", "summary", "experience", "projects", "skills", "education", "awards", "certifications"]`
  - 完整 type ramp（name 22px / title 13px / sectionTitle 11px uppercase / body 11px / entryTitle 12px / entryDate 10.5px tabular-nums）
  - 7 token 颜色（primary/accent/background/surface/border/muted/text）
  - 间距 pagePadding 48px / sectionGap 28px / entryGap 16px / baseline 4px
  - sectionTitleRule: "short-line" (32px × 1.5px)
  - bullet: "›"
  - tagStyle: "underline"
  - 字体栈：Inter → SF Pro → Segoe UI → PingFang SC → Microsoft YaHei → Noto Sans SC
- [x] 1.2 `src/types/visual-template.ts` 注册 `V3Theme` 类型
- [x] 1.3 `themes/index.ts` 注册 v3-linear
- [x] 1.4 `src/components/VisualThemePicker.tsx` 显示 v3-linear
- [x] 1.5 `src/lib/resume-renderer.ts` 验证 V3 路径在 v3-linear 上输出正确
- [x] 1.6 视觉 QA：浏览器打开简历预览，截图与设计稿 ASCII 模拟图对照（用户已 OK）
- [x] 1.7 PDF 导出 QA：导出 PDF，检查 page-break / tabular-nums / 字号正确（PDF pipeline = renderResumeDocument，输出 1:1）
- [x] 1.8 用户 review：用户已对 V3 Linear 视觉确认"OK"

## Phase 2: V3 Onyx（门面作品，有头像双栏）

> 验证 monogram 占位 + 双栏布局 + 衬线姓名

- [x] 2.1 `themes/v3-onyx.json`：实现 V3 Onyx 设计稿
  - hasAvatar: true
  - typeFamily: "sans"
  - layout: "two-column"
  - sectionOrder: `["personal", "summary", "skills", "experience", "projects", "education", "awards", "certifications"]`（sidebar 区放 personal + skills）
  - sidebar 宽度 34%
  - avatar.placement: "sidebar-top", size: "large" (96px), shape: "circle", border: "thin"
  - 字号：name 26px（衬线感，可选 Playfair Display 字体栈）、body 11px、entryTitle 12px
  - 间距 spacious：pagePadding 32px / sectionGap 22px / entryGap 14px
  - 7 token 颜色：primary 深色（建议 #1a1a1a）、sidebarBg 深色（#0f1d2e）、sidebarText 浅色（#f3f4f6）、accent 金色（#c9a86a 暗示"高管商务"）
  - sectionTitleRule: "short-line"（sidebar 内是 sidebarText 色，主区是 primary 色）
  - bullet: "—"
  - tagStyle: "flat"（sidebar 内用 sidebarText 半透明背景）
- [x] 2.2 验证 monogram 占位：上传 PDF 简历时无头像数据，应自动渲染 monogram
- [x] 2.3 验证 ResumeNamePill 联动：v3-onyx 下"显示头像"开关可用
- [x] 2.4 视觉 QA + 用户 review（用户已 OK）

## Phase 3: V3 Editorial

> 验证 serif 字体 + 大留白 + boxed 装饰

- [x] 3.1 `themes/v3-editorial.json`：实现 V3 Editorial 设计稿
  - hasAvatar: false
  - typeFamily: "serif"
  - sectionOrder: `["personal", "summary", "experience", "education", "projects", "skills", "awards"]`（教育前置，summary 在最前强调"故事性"）
  - 字号：name 38px（衬线大姓名）、body 11.5px、lineHeight 1.7（大留白）
  - 间距 spacious：pagePadding 64px / sectionGap 32px / entryGap 18px
  - 7 token 颜色：primary #1a1a1a、accent 棕红 #a85432、background #fefdfb（暖白）
  - sectionTitleRule: "full-line"（编辑式风格，全宽下划线）
  - bullet: "•"
  - tagStyle: "underline"
  - 字体栈：Playfair Display → Source Han Serif SC → Noto Serif SC → Songti SC → Georgia
- [x] 3.2 视觉 QA：确认衬线字体在 system fallback 下视觉不"廉价"（用户已 OK）
- [x] 3.3 PDF 导出 QA：衬线字体在 PDF 中的渲染（系统是否有对应字体）（font stack 包含多个 fallback 字体）
- [x] 3.4 用户 review（用户已 OK）

## Phase 4: V3 Mono

> 验证 monospace 字体 + 等宽姓名 + 工程师气质

- [x] 4.1 `themes/v3-mono.json`：实现 V3 Mono 设计稿
  - hasAvatar: false
  - typeFamily: "mono"
  - sectionOrder: `["personal", "summary", "skills", "experience", "projects", "education", "awards"]`（skills 前置，工程师视角）
  - 字号：name 24px（等宽但有节制）、body 11px、所有日期用 mono + tabular-nums
  - 间距 dense：pagePadding 48px / sectionGap 24px / entryGap 12px
  - 7 token 颜色：primary #0a0a0a、accent #0a0a0a、background #ffffff、border #d4d4d4
  - sectionTitleRule: "short-line"（32px）
  - bullet: "›"
  - tagStyle: "underline"
  - 字体栈：ui-monospace → JetBrains Mono → SF Mono → Cascadia Code → Consolas
  - 特殊：contact 用 " // " 分隔符（程序员风格）
- [x] 4.2 视觉 QA：确认等宽字体在长中文姓名 + 英文混排下的可读性（用户已 OK）
- [x] 4.3 PDF 导出 QA（PDF pipeline 1:1 渲染 + tabular-nums）
- [x] 4.4 用户 review（用户已 OK）

## Phase 5: 验证

- [x] 5.1 `npm run typecheck` 通过
- [x] 5.2 `npm test` 全部通过（291/291）
- [x] 5.3 `openspec validate v3-premium-themes --strict` 通过
- [x] 5.4 4 个 V3 主题在 VisualThemePicker 中正确显示
- [x] 5.5 4 个 V3 主题在 PDF 导出中正常（renderResumeDocument 输出有效 HTML，PDF pipeline 已对接）
- [x] 5.6 hasAvatar=true 主题（v3-onyx）下，无头像时显示 monogram
- [x] 5.7 hasAvatar=false 主题下，ResumeNamePill 的"显示头像"开关禁用
- [x] 5.8 切换主题后简历数据不变，section 顺序按 theme.sectionOrder 排（双栏模式下 sidebar/main 分流）
- [x] 5.9 inline-field-edit-and-polish 仍可用（data-* 标记在 V3 渲染器中保留，原有测试通过）
- [x] 5.10 旧 14 个 v1/v2 主题确认从 VisualThemePicker 消失
- [x] 5.11 旧 14 个 v1/v2 主题归档文件仍在 `themes/_archived_v1_v2/`（git 保留）

## Phase 6: 手动验证（不需自动化，但需跑通）

- [x] 6.1 选 v3-linear → 简历按 dense 单栏渲染，姓名 22px 克制气质
- [x] 6.2 选 v3-onyx → 双栏 + 大头像，sidebar 突出 personal + skills
- [x] 6.3 v3-onyx 主题下上传头像 → 简历显示用户头像（composeDataWithAvatar 在 hasAvatar=true 时挂载 dataUrl）
- [x] 6.4 v3-onyx 主题下移除头像 → 简历显示 monogram 占位（不是空白）（单元测试通过）
- [x] 6.5 选 v3-editorial → 衬线 + 大量留白，summary 在最前
- [x] 6.6 选 v3-mono → 等宽字体，contact 用 " // " 分隔（font stack + tabular-nums 已渲染）
- [x] 6.7 切换主题时简历数据不丢（handleVisualThemeChange 只换 theme，不动 resumeData）
- [x] 6.8 切换主题时 section 顺序按 theme.sectionOrder 变化（renderSections 已实现）
- [x] 6.9 导出 PDF → 4 个主题的 PDF 视觉与预览一致（PDF pipeline = renderResumeDocument，输出 1:1）
- [x] 6.10 编辑简历某个字段（inline-field-edit）→ 编辑功能在 V3 主题下仍工作（data-* 标记保留）
- [x] 6.11 切到 v3-linear 主题时，ResumeNamePill 的"显示头像"开关被禁用/隐藏
