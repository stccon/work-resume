## Why

当前 14 个视觉主题（6 个 v1 + 8 个 v2）与业界顶尖的简历视觉（Habaneraa Sidebar、Overleaf Academic CV、Linear changelog、Kinfolk / Monocle Editorial）仍有明显差距，主要表现在三个层面：

1. **设计约束不严** — 14 个主题都基于"枚举组合"思路，把 `placement` × `decorationStyle` × `bulletStyle` × `tagStyle` × `avatar` 等自由枚举塞进一个 JSON schema。组合空间看起来丰富，但实际效果是"啥都支持、啥都不极致"——一个主题里能同时出现 `underlined` section 标题、`•` bullet、`pill` tag、`top-right` 头像，视觉信号互相打架。
2. **有头像 vs 无头像两套设计语言硬塞同一 schema** — 需求 4 明确指出"有头像的视觉模板和没有头像的视觉模板公用一套模板，容易导致模板兼容不好，因为有头像的模板和无头像的模板实际上是两套不同的体系"。当前 `VisualTheme` 类型的 `avatar` 字段是可选的，渲染器到处是 `if (showAvatar)` 分支，结果是每个主题都不纯粹——既能显示头像、又要兼顾无头像时的排版空洞。
3. **渲染器缺少排版级原语** — 14 个主题都缺 `page-break-inside`（PDF 导出时 entry 跨页断开）、`tabular-nums`（日期/数字不等宽）、baseline grid 强制（间距随手写 18/24/32，对齐不到 4px 网格）。这三件事是 Habaneraa 级别视觉的硬性前置。

视觉主题是产品最显眼的"门面"——简历做得再准，主题丑就没人愿意导出。这次变更的目标是**用 4 个 Habaneraa 级别的 V3 主题替换 14 个现状主题**，而不是再加更多主题。

## What Changes

- **引入 V3 设计系统宪法**：8 条强制约束（type system 5-6 档字号、颜色 7 token、间距 4/8px baseline、section 装饰 1 种、bullet 1 种、tag 1 种、print 原语、hasAvatar 二元）。每个 V3 主题都必须自洽且克制，违反任一条的主题无法落地。
- **4 个 V3 主题**：
  - `v3-onyx` — 双栏 + 有头像，Habaneraa Sidebar 直接对标
  - `v3-linear` — 单栏 + 无头像，Linear changelog / Vercel docs 工程师风格
  - `v3-editorial` — 单栏 + 无头像 + 衬线，Kinfolk / Monocle 编辑风格
  - `v3-mono` — 单栏 + 无头像 + 等宽，Vercel docs / SBT 极客风格
- **渲染器升级（Phase 0 硬前置）**：
  - `page-break-inside: avoid` 在 entry 级生效（PDF 导出不再跨页断 entry）
  - `font-variant-numeric: tabular-nums` 在所有日期/数字文本生效
  - baseline grid 4/8px 强制——所有 spacing token 必须是 baseline 倍数，否则构建期告警
  - monogram 占位渲染器——`hasAvatar=true` 且无头像时，用主题 primary 背景 + 姓名首字母的圆形 monogram
  - `sectionOrder` 字段注入渲染——主题声明的顺序覆盖 template 默认顺序
  - `hasAvatar` 二元化——渲染器不再处理"主题有 avatar 配置但用户没传"的中间态
- **归档 14 个旧主题**：
  - 6 个 v1 主题（elegant-blue / graphite / emerald-sidebar / amber-header / basalt / glacier）和 8 个 v2 主题（v2-modern-pro / v2-editorial / v2-executive-sidebar / v2-tech-blueprint / v2-academic-serif / v2-warm-earth / v2-typst-monospace / v2-minimal-mono）全部移到 `themes/_archived_v1_v2/`
  - 渲染器中 v1/v2 双套 CSS 路径（`baseCSS` + `renderV2CSS`）合并为单套 V3 路径
  - `VisualTheme` 类型里 v1/v2 遗留字段（`sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"`、`decorationStyle`、`headerStyle: "centered" | "left" | "colored-bar"`、`v2Config.*`）全部移除
  - `VisualThemePicker` 从 "v1/v2 分组" 改为 4 个 V3 主题扁平展示

## Capabilities

### New Capabilities
- `visual-template-v3`：4 个 V3 视觉主题 + V3 设计系统宪法 + 渲染器排版原语升级

### Modified Capabilities
- 无（现有 `openspec/specs/` 下没有任何 capability 涉及视觉主题的具体 schema 或行为；旧 14 个主题未曾在 spec 中规范化，因此本次只新增 V3 spec，不修改旧 spec）

## Impact

**新增代码**
- `themes/v3-linear.json`、`themes/v3-onyx.json`、`themes/v3-editorial.json`、`themes/v3-mono.json`：4 个 V3 主题 JSON
- `src/lib/monogram.ts`：monogram 占位生成（姓名 → 首字母 / 汉字 → 姓氏，圆形 SVG 或 CSS 渲染）
- `src/lib/baseline-grid.ts`：构建期 baseline 倍数校验函数 `assertBaselineMultiple(value, baseline)`，开发模式 console.warn
- `src/types/visual-template.ts`：V3 新增 `V3Theme` interface + V3 8 字段约束的 Zod 风格校验函数 `validateV3Theme(theme)`
- `src/__tests__/baseline-grid.test.ts`、`src/__tests__/monogram.test.ts`、`src/__tests__/validate-v3-theme.test.ts`

**修改代码**
- `src/types/visual-template.ts`：`VisualTheme` 类型重构为 V3 schema（移除 `series` / `family` / `sectionStyle` 老枚举 / `decorationStyle` / `v2Config` / 老 `avatar` 顶层字段）
- `src/lib/resume-renderer.ts`：
  - `renderResumeCSS()` 改为读 V3 主题 + 注入 baseline / tabular-nums / page-break / monogram 相关 CSS
  - `renderResumeBody()` 增加 `sectionOrder` 处理、按 `theme.hasAvatar` 二元决定是否渲染 avatar 块（不再有"无头像 fallback"分支）
  - 删除 `renderV2CSS()` 函数（v2 路径归档）
  - `renderAvatarElement()` 改为调 monogram 生成（当无 `dataUrl` 时）
- `src/components/VisualThemePicker.tsx`：分组从 "v1/v2" 改为 4 个 V3 主题扁平展示，移除所有 v1/v2 相关 badge
- `themes/index.ts`：注册改为 4 个 V3 主题，`imported-*.json` 路径继续保留
- `src/components/ResumeNamePill.tsx` 和 `App.tsx`：头像启用开关逻辑简化为——`hasAvatar=true` 主题下，关闭开关时简历区显示 monogram 占位（而不是完全不显示头像位）；`hasAvatar=false` 主题下，开关被禁用/隐藏

**删除代码**
- `themes/elegant-blue.json` 等 14 个 v1/v2 JSON 文件（移到 `themes/_archived_v1_v2/`）
- `src/lib/resume-renderer.ts` 中的 v1 baseCSS 拼装逻辑和 `renderV2CSS()` 整段函数
- `src/types/visual-template.ts` 中 `ThemeSeries` / `ThemeFamily` / `ThemeLanguage` 老枚举
- `src/components/VisualThemePicker.tsx` 中 v1/v2 标签、PRO 标签（V3 不分 v1/v2）

**不修改**
- 任何 electron 端文件（`opencode.ts` / `ipc.ts` / `preload.ts` 全部沿用，渲染器接口签名不变）
- `src/components/EditableResumePreview.tsx`（data-* 标记对 V3 透明，事件委托无需改）
- `src/components/ResumePreview.tsx`
- `src/lib/field-locator.ts` / `src/lib/field-context.ts` / `src/lib/text-diff.ts`
- `src/App.tsx` 中 `handleResumeChange` / `handleVisualThemeChange` / `handleExportPDF`（theme 切换 API 表面不变）
- PDF 导出管线（`electron` 端 `printToPDF`，data-* 对 print 透明）
- 模板（`templates/general.json`）的字段定义——template 退化为"字段定义源"，sectionOrder 由 theme 决定
- `src/components/ResumeNamePill.tsx` 中的头像上传/移除/启用开关 UI（只动"开关与 hasAvatar 主题的联动"逻辑，不动 UI 形态）

**外部依赖**
- 无新增依赖（Inter / Playfair Display / JetBrains Mono 等 web font 通过 `@import` 引入或 system fallback，不新增 npm 包）
- `tailwind.config.ts` 不变（V3 主题完全用 inline style，不依赖 Tailwind utility class）

**风险**
- **旧 v2 用户感知到"主题消失"** — 通过 changelog/Toast 提示"V3 已上线，旧主题归档到设置-高级"；归档文件保留以便回滚
- **Inter / Playfair Display 字体在用户机器上没装** — 字体栈用 system fallback（`-apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei'` 等），首屏不依赖网络字体；如果引入 web font，PDF 导出需要把字体子集化嵌入（Phase 0 不做，留到后续）
- **baseline grid 在 PDF 渲染时与屏幕有亚像素差异** — 4px 倍数在 96dpi 屏幕和 72dpi PDF 上有 1.33x 比例，PDF 实际行高可能不是整数像素。视觉误差 ≤ 0.5px 即可接受；如出现明显错位，调整 baseline 到 8px 或 6px 重测
- **4 个主题的视觉品质难以完全对齐"顶尖"** — 每个主题独立设计、互不对齐参考系，最终品质由人眼判断；交付标准是"单个主题看起来 Habaneraa 级别"，而不是"4 个主题之间互相匹配"
- **monogram 在中文姓名上的"首字母"语义模糊** — 约定：中文姓名取**姓氏**（第一个字），英文姓名取**首字母大写**（"Zhang Ming" → "ZM"）；如姓名缺失则用 `?` 占位
