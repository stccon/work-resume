## Context

### 现状

`themes/` 下 14 个视觉主题分两代：

- **v1（6 个）** — `elegant-blue` / `graphite` / `emerald-sidebar` / `amber-header` / `basalt` / `glacier`，schema 极简（`layout` + `headerStyle` + `decorationStyle` + `colors` + `fonts` + `avatar`），组合自由度低但视觉上"标准"，不丑但离顶尖有距离
- **v2（8 个）** — `v2-modern-pro` / `v2-editorial` / `v2-executive-sidebar` / `v2-tech-blueprint` / `v2-academic-serif` / `v2-warm-earth` / `v2-typst-monospace` / `v2-minimal-mono`，schema 复杂（多了 `v2Config` 子结构：`headerVariant` / `sectionTitleRule` / `bulletStyle` / `tagStyle`），单个主题内表达力强，但 v2 之间已经出现"啥都能配"的过载

`src/lib/resume-renderer.ts`（899 行）现在的状态：

```
renderResumeCSS() {
  baseCSS = v1 通用 CSS（v1 / v2 主题都共用这段）
  avatarCSS = 6 placement × 3 size × 3 shape × 4 border 组合
  if (theme.series === "v2" && v2) {
    v2CSS = renderV2CSS()  // 又是一大段 v2 专属
  }
  return baseCSS + avatarCSS + v2CSS
}

renderResumeBody() {
  if (isV2) { ... } else { ... }  // 二元分支
  if (showAvatar) {
    // 6 种 placement 各自的 header 拼装
  } else {
    // 无头像时的 fallback header
  }
  // 两栏 / 单栏的 layout 分支
}
```

renderer 已经长出 5 个 if/else 维度（v1/v2 × 有头像/无头像 × 单栏/双栏 × sidebar-top/其他 × split/magazine/minimal 头部）。每加一个枚举就要在 3 个地方改。

### 触发点

需求 4 指出：

> 目前，项目总的视觉模板，还不是很好看，与业界顶尖视觉模板存在差距。
> 有头像的视觉模板和没有头像的视觉模板公用一套模板，容易导致模板兼容不好，因为有头像的模板和无头像的模板实际上是两套不同的体系

这暴露的不是"模板数量不够"，而是**单一 schema 表达两套设计语言的根问题**。

### 探索结论

经过探索模式 5 轮对话，与用户（Java 程序员）锁定以下方向：

1. **美学路线**（不是市场路线）—— 对标 Habaneraa / Overleaf / Linear changelog / Kinfolk，不追求模板数量
2. **4 个主题，"在精不在多"** — 每个都是 Habaneraa 级别
3. **职责单一** — 主题要么永远有头像、要么永远无头像，不允许"可选"
4. **Template ↔ Theme 解耦** — Template = 字段定义；Theme = 视觉 + sectionOrder + hasAvatar
5. **sectionOrder 挂在 theme** — 因为 template 当前不可切换，挂在 theme 上最符合用户心智
6. **渲染器从 JSON 拼 CSS 保留** — 不重写为 React 组件，但补齐 baseline / tabular-nums / page-break 三个原语
7. **旧 14 主题全归档** — 移到 `themes/_archived_v1_v2/`，渲染器对应代码删除
8. **V3 主题：Onyx / Linear / Editorial / Mono** — 4 个按"结构轴"（头像 / 栏数 / 字体）挑选，不按"市场细分"

V3 Linear 的完整设计稿（type system、color system、spacing、section 装饰、bullet、tag、JSON、ASCII 模拟图）已在探索阶段确认通过，作为 V3 主题的"参考实现"先落地。

## Goals / Non-Goals

### Goals

- **V3 设计系统宪法**：8 条强制约束，所有 V3 主题必须遵守
- **4 个 V3 主题**：每个都是单一设计语言的完整作品
- **渲染器底座升级**：`page-break-inside: avoid` / `tabular-nums` / baseline grid 4/8px / monogram 占位
- **sectionOrder 字段**：theme 声明的 section 顺序覆盖 template 默认
- **hasAvatar 二元**：渲染器不处理"主题有 avatar 但用户没传"的中间态
- **旧 14 主题归档**：保留 JSON 备份，渲染器代码路径删除
- **V3 主题的可发现性**：VisualThemePicker 改为 4 个 V3 主题扁平展示
- **保留现有用户数据**：已存简历的 `template: "general"` 不变；切换 V3 主题时不影响 `resumeData` 持久化层

### Non-Goals

- ❌ **用户上传主题** — 旧的 `themes/imported-*.json` 路径保留（不破坏现有导入流程），但本次不扩展
- ❌ **主题 marketplace / 主题内变体** — 4 个就是 4 个，不做"v3-onyx-warm" / "v3-onyx-cool" 这种子变体
- ❌ **用户自定义主题** — 不做"颜色拾取器"、"字体选择器"
- ❌ **多头像 / 大头像 / 头像滤镜** — 头像 policy 由 theme 固定
- ❌ **重写 renderer 为 React 组件** — JSON → CSS string 路径保留
- ❌ **Web font 嵌入 PDF** — V3 字体栈用 system fallback；字体子集化嵌入是后续 scope
- ❌ **修改 template** — `templates/general.json` 字段定义保持不变；sectionOrder 由 theme 决定
- ❌ **修改 PDF 导出管线** — electron 端 `printToPDF` 沿用，data-* 对 print 透明
- ❌ **修改字段级编辑（inline-field-edit-and-polish）** — EditableResumePreview 的 data-* 标记对 V3 透明，无需调整

## Decisions

### 决策 1：V3 设计系统宪法（8 条不可违反的约束）

```
1. 类型系统
   - 单一 type family（sans / serif / mono）
   - Modular scale 1.25 / 1.333（二选一，主题声明）
   - 全文字号严格 5-6 档（name / title / sectionTitle / body / entryTitle / entryDate）
   - 行高 1.3-1.75，按字号动态
   - letter-spacing 仅 section title 用 0.16-0.20em uppercase

2. 颜色系统
   - 1 primary + 1 accent（accent 可等于 primary）
   - 1 中性色阶：bg / surface / border / muted / text（5 档）
   - 总计 7 个颜色 token，不再多

3. 间距系统
   - Baseline grid：4px 或 8px
   - 所有 spacing 必须是 baseline 整数倍
   - sectionGap / entryGap / pagePadding 各 1 个值

4. 排版密度（每个主题选 1 档）
   - dense:    entryGap 8-10px, pagePadding 32-40px
   - normal:   entryGap 12-14px, pagePadding 40-48px
   - spacious: entryGap 16-20px, pagePadding 56-64px

5. 头像（仅 hasAvatar=true 主题）
   - 1 placement / 1 size / 1 shape / 1 border（固定，不留选项）
   - 缺失时 monogram 占位（主题 primary 背景 + 姓名首字母）

6. Section 标题
   - 1 种装饰规则（short-line / full-line / double-line / boxed / none）
   - 1 种字母处理（uppercase + tracking / normal / italic）
   - 1 种字重（500-700 区间）

7. 列表 / Tag
   - 1 种 bullet（• / — / › / ▪ / none）
   - 1 种 tag style（pill / flat / underline）

8. 打印感知
   - entry 级 page-break-inside: avoid
   - 数字统一 tabular-nums
   - 中英文之间自动 0.05em 空隙（han-latin spacing）
```

**为什么**：Habaneraa 看起来"简单"的本质是"背后严苛约束"。当前 14 主题"啥都支持"是反例。

### 决策 2：4 个 V3 主题（按"结构轴"挑选）

| 主题 | 头像 | 栏数 | 字体 | 密度 | 对标 |
|---|---|---|---|---|---|
| `v3-onyx` | 有 | 双栏 sidebar | sans-serif | spacious | Habaneraa Sidebar / Resume.io Meridian |
| `v3-linear` | 无 | 单栏 | sans-serif | dense | Linear changelog / Vercel docs |
| `v3-editorial` | 无 | 单栏 | serif | spacious | Kinfolk / Monocle / NYT Mag |
| `v3-mono` | 无 | 单栏 | monospace | dense | Vercel docs / SBT / sbt-typescript |

```
        有头像          无头像
        ─────          ─────
单栏  │   -        │  v3-linear
      │            │  v3-editorial
      │            │  v3-mono
      │
双栏  │  v3-onyx   │     -
```

**为什么是 4 个而不是 3/5/6**：
- 3 个太少，无法覆盖"有头像 vs 无头像"、"serif vs sans vs mono"两个核心结构轴
- 5+ 走入"市场细分"陷阱（用户明确反对）
- 4 个 = "2 个无头像结构变体"（serif + mono 与 sans 共存） + "1 个无头像克制基准"（Linear） + "1 个有头像双栏"（Onyx）

**为什么是这 4 个具体名字**：
- **Onyx** — 经典黑+高对比，对应 Habaneraa "Executif" 系列的视觉记忆
- **Linear** — 直接对标 Linear changelog 工程师审美
- **Editorial** — 对应 Kinfolk / Monocle 杂志视觉
- **Mono** — 对应 Vercel docs / SBT 等宽排版

### 决策 3：hasAvatar 二元化

**选择**：每个 V3 主题的 `hasAvatar` 字段是 `boolean` 必填，不再可选。`avatar` 子配置也仅在 `hasAvatar=true` 时存在。

**为什么**：
- 需求 4 原话："一个主题让他职责单一，别让他既能有头像也能没有头像，这样反而搞得这个主题四不像"
- 渲染器不再有"无头像 fallback"分支
- 切换主题时头像 policy 透明——`v3-onyx` 永远有头像位（缺失用 monogram），`v3-linear` 永远没头像位

**对 ResumeNamePill 的影响**：
- `hasAvatar=true` 主题：开关可切换"显示头像" / "不显示头像（monogram 占位）"两种状态
- `hasAvatar=false` 主题：开关被禁用 / 隐藏（不能上传头像，UI 不显示）

### 决策 4：sectionOrder 挂在 theme

**选择**：每个 V3 主题声明 `sectionOrder: string[]`，覆盖 template 的 sections 默认顺序。

**为什么**：
- Template 当前不可切换（只有 `general.json`），挂在 theme 上让用户切换主题时直接看到"章节顺序变了"，符合心智
- Theme 决定信息架构：双栏主题通常 personal/summary 在 sidebar，experience/education 在 main；编辑式主题通常 summary 在最前；技术主题通常 skills 在 experience 之前
- 未来如要扩展多 template，template 可以声明"覆盖 order"，但当前不需要

**默认值**：`v3-linear` 顺序为 `["personal", "summary", "experience", "projects", "skills", "education", "awards", "certifications"]`（工程师视角：经历和项目在技能之前）

### 决策 5：monogram 占位方案（4 选 1）

**选择**：monogram 圆形 + 主题 primary 背景 + 白色/对比色文字 + 姓名首字母。

```
        ┌────────┐
        │   张   │   ← 中文：取姓氏（第一个字）
        │        │   ← 英文：取 first name + last name 首字母
        └────────┘      缺失姓名：用 "?" 占位
```

**为什么是方案 1（monogram）而不是其他**：
- 方案 2（silhouette）：太普通，没个性
- 方案 3（几何色块）：看起来像 bug
- 方案 4（渐变 + 缩写）：实现复杂，与 V3 克制气质不符

**中文姓名首字母规则**：中文姓名取**姓氏**（第一个字）；英文姓名取 first name + last name 首字母大写（"Zhang Ming" → "ZM"）；姓名缺失用 `?`。

### 决策 6：渲染器升级 3 项（Phase 0 硬前置）

**选择**：在 Phase 0 阶段，渲染器新增 3 个 CSS 能力：

1. **`page-break-inside: avoid` 在 entry 级生效**
   - `@media print { .resume-entry { page-break-inside: avoid; break-inside: avoid; } }`
   - PDF 导出时一条工作经历/项目不会跨页断开

2. **`font-variant-numeric: tabular-nums` 应用于所有日期/数字文本**
   - 在 `.resume-entry-date`、`.resume-contact span`、`body` 通用选择器上
   - 中文"2022.03 — 现在"、英文"Mar 2022 - Present" 数字等宽对齐

3. **Baseline grid 4/8px 强制**
   - 所有 spacing token（`pagePadding` / `sectionGap` / `entryGap`）必须是 baseline 整数倍
   - 启动时 `assertBaselineMultiple(value, baseline)` 检查；不符合则 `console.warn`（开发模式）
   - V3 主题默认 baseline=4px（如需 8px 在主题 JSON 中显式声明）

**为什么这 3 项是 V3 视觉品质的硬性前置**：
- 没有 `page-break-inside: avoid`，PDF 导出时一条工作经历会跨页断开，视觉断裂
- 没有 `tabular-nums`，日期"2022.03 — 2024.06"和"2024.07 — 现在"两个右对齐文本数字宽度不一致，看起来"业余"
- 没有 baseline grid，4 个主题之间的间距风格无法对齐，看起来"凑合"

### 决策 7：旧 14 主题归档路径

**选择**：
- 14 个 v1/v2 JSON 文件移到 `themes/_archived_v1_v2/` 子目录
- `themes/index.ts` 不再 `import` 它们
- 渲染器中 v1 baseCSS 拼装逻辑和 `renderV2CSS()` 函数删除
- `VisualTheme` 类型中 `ThemeSeries` / `ThemeFamily` / `ThemeLanguage` / `sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"` / `decorationStyle` / `headerStyle: "centered" | "left" | "colored-bar"` / `v2Config.*` 字段全部移除
- `VisualThemePicker` 改为 4 个 V3 主题扁平展示，删除 v1/v2 标签和 PRO 标签

**回滚路径**：归档文件仍在仓库中，如需回滚只需在 `themes/index.ts` 重新 `import`。

### 决策 8：字体策略（system stack，不引入 web font）

**选择**：V3 主题字体栈使用 system fallback，不引入 web font 依赖。

```
sans:  'Inter', -apple-system, 'SF Pro Display', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif
serif: 'Playfair Display', 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', Georgia, 'Times New Roman', serif
mono:  ui-monospace, 'JetBrains Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace
```

**为什么**：
- V3 主题在 PDF 导出时需要字体子集化嵌入才能正确显示（Inter 字体未授权嵌入可能侵权）
- 引入 web font 触发 PDF 字体渲染问题（Electron printToPDF 对自定义字体的支持不完善）
- system fallback 在 Mac / Windows / Linux 都有合理替代：Mac 用 SF Pro、Windows 用 Segoe UI、Linux 用 Noto Sans

**后续 scope**：如要支持"用户可选 web font"，需要单独 change proposal（包含字体加载、PDF 嵌入、跨平台一致性等）。

### 决策 9：实施顺序

```
Phase 0: 渲染器底座 (硬前置)
  - VisualTheme 类型重构
  - resume-renderer.ts 拆 v1/v2 路径、加 V3 路径
  - baseline grid 校验
  - tabular-nums / page-break CSS
  - monogram 渲染
  - sectionOrder 字段注入
  - 旧 14 主题归档

Phase 1: V3 Linear (参考实现, 无头像最简)
  - themes/v3-linear.json
  - 验证 4 项渲染器改动落地

Phase 2: V3 Onyx (门面作品, 有头像双栏)
  - themes/v3-onyx.json
  - 验证 monogram + 双栏

Phase 3: V3 Editorial
  - themes/v3-editorial.json

Phase 4: V3 Mono
  - themes/v3-mono.json
```

**为什么 Linear 先于 Onyx**：
- Linear 单栏 + 无头像 = 最少干扰项
- 验证渲染器 4 项改动（baseline / tabular-nums / page-break / monogram）只需承担"无头像"这一半的复杂度
- 跑通 Linear 后，Onyx 只是"加双栏 + 加 monogram"的增量，调试范围更小

## Risks / Trade-offs

**[Risk] 旧 v2 用户感知到"主题消失"**
→ 缓解：
- 归档文件保留（`themes/_archived_v1_v2/`），不删除
- 首次切换到 V3 时 Toast 提示"V3 已上线，14 个旧主题归档，文件保留在 themes/_archived_v1_v2/"
- changelog 记录

**[Risk] 4 个 V3 主题的视觉品质参差**
→ 缓解：
- 每个主题独立设计 + 独立交付（Phase 1-4 顺序）
- Phase 1 完成后用户 review 通过再继续
- 每个主题的完成标准："用户看了觉得是 Habaneraa 级别"，不是"4 个主题互相匹配"

**[Risk] Inter / Playfair Display 字体在用户机器上没装**
→ 缓解：字体栈 system fallback（已在决策 8 中说明）；首屏 200ms 内 system 字体生效，视觉无白屏

**[Risk] baseline grid 在 PDF 渲染时与屏幕有亚像素差异**
→ 缓解：4px 倍数在 96dpi 屏幕上是 4px 整数像素；在 72dpi PDF 上是 3px（4×72/96=3）。Visual diff 测一遍，PDF 看起来 OK 就过；如错位明显，调 baseline 到 8px 重测

**[Risk] monogram 在缺失姓名时退化为"?"字符**
→ 缓解：`?` 用 muted 色 + 稍小字号，不抢主区视觉

**[Risk] sectionOrder 切换后，inline-field-edit 状态机可能错乱**
→ 缓解：`EditableResumePreview` 的 `useEffect` 依赖里有 `JSON.stringify(data.sections)`，sections 内容变化时 `activeLocator` 会被清空。sectionOrder 变化时 sections 顺序变化 → 触发清空；具体行为在 Phase 0 验证

**[Trade-off] 不引入 web font = 4 个 V3 主题的字体气质"受限于系统"**
→ 接受：system fallback 在 Mac（SF Pro）/ Windows（Segoe UI）/ Linux（Noto Sans）都是现代无衬线字体，气质差异在可接受范围。如要支持 web font，是单独 scope

**[Trade-off] V3 主题"职责单一" = 用户切换 Onyx → Linear 时头像完全消失**
→ 接受：这是设计决策，符合需求 4 明确诉求。用户在 Linear 上想有头像，需要切换到 Onyx

## Open Questions

无（决策 1-9 已覆盖所有关键设计点；具体 V3 主题的字号表、颜色表、JSON 细节在 tasks.md Phase 1-4 中实现，第一稿 V3 Linear 设计稿已在探索阶段与用户确认通过）
