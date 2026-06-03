## Context

UI 打磨涉及六个独立的小问题，每个改动面都不大，但需要分别处理：

```
┌──────────────────────────────────────────────────────────────────┐
│  问题分类                                                         │
├──────────────────────────────────────────────────────────────────┤
│  1. 架构层 bug：CSS 作用域逃逸（最高优先级）                       │
│     - resume-renderer.ts 注入的 <style> 用 body 选择器             │
│     - 切主题时全 App 字体变                                        │
│                                                                  │
│  2. 设计 token 缺失：popover 颜色未定义                            │
│     - 项目像是 shadcn/ui 起的盘子，但 popover token 漏掉          │
│     - 导致两处 bg-popover 透明                                    │
│                                                                  │
│  3. Electron 原生 shell：未调用 setApplicationMenu                │
│  4. SettingsDialog：API Key 是占位 UI（无实现）                   │
│  5. SettingsDialog：缺关于段/版本号                                │
│  6. ChatInput：textarea 初始 rows=1，视觉权重弱                   │
└──────────────────────────────────────────────────────────────────┘
```

**当前 CSS 注入路径**：

```
ResumePreview.tsx:19
    ↓
  <style>{ renderResumeCSS(visualTheme) }</style>
    ↓
  注入到 React 子树（即 document body 内）
    ↓
  无作用域 → body 选择器命中全局 body
    ↓
  整个 App 字体跟着 theme.fonts.body 变
```

**当前 popover 透明路径**：

```
VisualThemePicker.tsx:91, AvatarUploader.tsx:68
    ↓
  className="bg-popover"
    ↓
  Tailwind 查找 colors.popover
    ↓
  tailwind.config.ts 没注册 → 生成空 background-color
    ↓
  下拉透明
```

## Goals / Non-Goals

**Goals:**

- 切换简历视觉主题时，**只**有右侧预览区变化，左侧侧边栏、顶栏、对话区字体保持不变
- 顶部窗口栏不再显示 File/Edit/View/Window/Help（Windows/Linux 下）
- 用户能在设置中看到当前版本号（来源于 `app.getVersion()`）
- 视觉模板下拉、头像下拉打开时背景不透明
- 设置对话框不再展示无实现的 API Key 字段
- 对话输入框视觉上"够用"，但不喧宾夺主

**Non-Goals:**

- 不引入 iframe / shadow DOM 隔离方案（决策 1 说明）
- 不处理 macOS 系统菜单（macOS 下应用菜单是 OS 级别约定，本次不动）
- 不做"检查更新" / "关于作者" / 等扩展功能（仅版本号）
- 不重写 SettingsDialog 整体布局（仅删 + 加段）
- 不做主题对比视图（多预览同屏，与本次 CSS scope 不冲突；如未来需要再加唯一前缀）

## Decisions

### 决策 1：CSS 作用域用前缀而非物理隔离

**选择**：保留 `<style>` 注入方式，改写 CSS 让所有规则前缀化到根容器 class。

**变更点**：

```css
/* 改前（resume-renderer.ts:13-14） */
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:${f.body}; font-size:${t.bodyFontSize}; color:${c.text}; ... }

/* 改后 */
.resume-document, .resume-two-column { font-family:${f.body}; font-size:${t.bodyFontSize}; color:${c.text}; ... }
.resume-document *, .resume-two-column * { margin:0; padding:0; box-sizing:border-box; }
```

**为什么不用 iframe / shadow DOM**：

| 方案     | 工作量 | 隔离强度 | 副作用                       |
|----------|--------|----------|------------------------------|
| 前缀化   | 低     | 中       | 偶尔需要维护选择器一致性     |
| iframe   | 高     | 高       | 滚动/字体加载/调试都要重写   |
| shadow   | 高     | 高       | 全局变量/字体回退需重新设计  |

当前只需"不要污染外面"，前缀化已足够。

**对 PDF 导出的影响**：`renderResumeDocument` 拼出完整 HTML 文档（含 `<html><body>`），body 是真的 body。改造后 body 选择器消失，但 `<body>` 里嵌的是 `<div class="resume-document">` 或 `<div class="resume-two-column">`，新选择器照样命中——继承机制让所有内容字体仍然正确。

**风险**：通用样式重置（`* { margin:0 }`）现在限定在简历根容器内。如果未来有人把渲染出的 HTML 挂在不规范的容器里，需要确保外层有这两个 class 之一——目前两条路径（React preview / PDF export）都满足。

### 决策 2：补 popover token 而非替换为 bg-card

**选择**：在 `styles/index.css` 和 `tailwind.config.ts` 中补齐 `popover` 设计 token。

**为什么不直接替换为 `bg-card`**：

- 项目 CSS 变量命名 (`--background` / `--foreground` / `--card` / `--accent` ...) 与 tailwind config 写法 (`hsl(var(--xxx))`) 都是 shadcn/ui 规范的复刻
- 项目大概率是从 shadcn 起的盘子，作者迁移时漏抄了 popover
- 补 token 比替换更符合代码已有设计意图，未来加 Tooltip/ContextMenu 时直接可用
- 改动量只比替换多 3-4 行

**具体值**：

```css
/* :root */
--popover: 0 0% 100%;                  /* 与 --card 同色，纯白 */
--popover-foreground: 240 10% 3.9%;    /* 与 --foreground 同色 */

/* .dark */
--popover: 240 6% 10%;                 /* 与 --card 同色，深灰 */
--popover-foreground: 0 0% 98%;
```

tailwind.config.ts：

```ts
popover: {
  DEFAULT: "hsl(var(--popover))",
  foreground: "hsl(var(--popover-foreground))",
}
```

### 决策 3：版本号放 Settings 的"关于"段（仅一处）

**选择**：在 `SettingsDialog` 末尾增加"关于"段，显示版本号。**不**同时加 sidebar 底部。

**为什么放 Settings**：

- 业内主流模式（VSCode/Cursor/Figma/Linear 都在 Settings 下）
- 用户对桌面 App 的直觉位置
- 不占用日常使用界面的视觉空间
- 与"只显示版本号"的极简语气吻合

**不放 sidebar 底部的原因**：当前 sidebar 尚未规划底部区域，加一行小字反而引入新的视觉元素。后续如需要"用户随手能看版本号"再单独加。

**版本号来源**：通过 IPC 暴露 `app.getVersion()`，避免硬编码到 React 代码（package.json bump 后无需改 React）。

### 决策 4：API Key 字段直接删除而非隐藏

**选择**：从 `SettingsDialog.tsx` 完全删除 API Key 块和 `apiKey` state。

**理由**：

- 当前的 `apiKey` 只有 setter（`setApiKey`），没有任何持久化或传递给 opencode 的逻辑——是占位 UI
- 留着代码混淆未来维护者
- 用户需求文档明确"暂时不用支持"，不是"隐藏"

**风险**：未来如果要加回来，需要重新设计——但当前的实现也没法直接复用（没有持久化）。

### 决策 5：ChatInput 只调初始行数

**选择**：`rows={1}` → `rows={2}`。保持其他不变。

**为什么不动 font-size / padding**：

- 用户说"稍微调大一点"——倾向最轻档位
- font-size 增加会影响整个对话区的视觉一致性
- padding 增加会让按钮看起来更孤立
- 单改 rows 是最直接的"视觉权重↑"，且自动布局都不需要重算

**对 auto-grow 的影响**：现有逻辑 `el.style.height = Math.min(el.scrollHeight, 200) + "px"`——只影响 max 上限。初始 rows=2 起步，仍按内容自适应到 200px 上限，无冲突。

### 决策 6：菜单隐藏只动 main 进程

**选择**：在 `electron/main.ts` 顶部 `import { Menu }`，并在 `app.whenReady` 后 / `createWindow` 前调用 `Menu.setApplicationMenu(null)`。

**为什么不改 BrowserWindow 选项**：`autoHideMenuBar` 只是默认隐藏，按 Alt 还会出现；`setApplicationMenu(null)` 是彻底移除。

**macOS 影响**：macOS 上应用必有顶部菜单（OS 级），即使设置为 null 也会显示一个最小默认菜单。本次范围内不专门处理 macOS。

## Risks / Trade-offs

**[R1] CSS 前缀化遗漏**：`resume-renderer.ts` 中可能还存在其他不带 `.resume-` 前缀的全局选择器（如 `@media print { body { ... } }`）。
→ **缓解**：grep 一遍 `^body|^\*|^html` 模式，确保都加上前缀。

**[R2] popover 颜色与 card 重复**：补的 token 在亮/暗两模式下值都和 card 一样——意义在哪？
→ **接受**：设计 token 的价值在"语义分离"而非"色值不同"。未来如要让弹层有独立色阶（比如半透明、背景模糊），只需改 `--popover`，不影响 card 用户。

**[R3] 删除 API Key 状态可能影响其他文件**：grep 确认没有外部引用 `apiKey` / `setApiKey` 才能放心删。
→ **缓解**：实施时先 grep 验证。

**[R4] Windows 下隐藏菜单后快捷键丢失**：默认菜单提供 Cmd/Ctrl+W 关闭、F11 全屏等快捷键。设为 null 后这些功能消失。
→ **缓解**：当前应用主要操作通过 UI 按钮触发，未依赖菜单快捷键。如未来需要某个快捷键，可在 `BrowserWindow` 上 `globalShortcut` 注册或 `before-input-event` 监听。

**[R5] 输入框 rows=2 在小窗口下可能挤压**：900px 最小宽度 + 600px 最小高度的情况下，多 1 行 ≈ 多 20px，影响可忽略。

## Open Questions

- 关于段除了版本号，是否要顺便加一行"项目名 + 作者"？倾向**不加**，保持"只显示版本号"的极简语气。
- popover 暗色模式色值是否需要更亮以与背景拉开层次？当前与 card 一致，实施后视觉验证再决定。
