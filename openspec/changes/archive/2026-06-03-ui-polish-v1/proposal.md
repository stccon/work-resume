## Why

1.0.0 版本积累了一组与功能无关、但影响日常使用质量的问题，需要集中清理。这些问题都不大，但合在一起明显拉低观感和体感：

- 主题切换会让整个应用的字体一起变（CSS 作用域泄漏）
- Electron 默认的 File/Edit/View/Window/Help 菜单与应用风格不符
- 设置里的 API Key 字段当前无对应实现（误导用户）
- 视觉模板下拉框背景透明能看穿后方内容（`bg-popover` token 未定义）
- 对话输入框视觉权重偏弱
- 缺少版本号显示，用户无法快速判断当前版本

## What Changes

- **修复主题字体泄漏**（架构 bug）：把 `resume-renderer.ts` 中 `body { ... }` 改成作用于 `.resume-document` / `.resume-two-column` 根容器，把 `*` 通配符限定在该作用域内。
- **隐藏原生菜单栏**：在 `electron/main.ts` 中调用 `Menu.setApplicationMenu(null)`。
- **版本号入口**：在 `SettingsDialog` 中新增 "关于" 段，显示 `app.getVersion()`。
- **删除设置中的 API Key 字段**：移除 SettingsDialog 中的整块 API Key UI 和相关 state。
- **补齐 `popover` 设计 token**：在 `styles/index.css` 添加 `--popover` 和 `--popover-foreground` CSS 变量；在 `tailwind.config.ts` 注册 `popover` 颜色——使现有 `bg-popover` 立刻生效。
- **对话框输入区增重**：`ChatInput` 初始行数从 1 改为 2，保持现有 auto-grow 行为。

## Capabilities

### New Capabilities
- `app-chrome`: 应用外壳层规则——原生菜单、版本号显示、设置对话框内容、设计 token 完整性。

### Modified Capabilities
<!-- 无现有 spec 需要修改（resume-import 与本变更范围不重叠） -->

## Impact

**代码改动**

- `electron/main.ts`：导入 `Menu`，在 `createWindow` 前调用 `Menu.setApplicationMenu(null)`
- `electron/ipc.ts` 和 `electron/preload.ts`：暴露 `app:get-version` IPC
- `src/env.d.ts`：补充 `electronAPI.getVersion()` 类型
- `src/components/SettingsDialog.tsx`：
  - 删除 API Key 块（`apiKey` state、`Key` icon import、整段 JSX）
  - 新增 "关于" 段（版本号、可选的项目名）
- `src/styles/index.css`：新增 `--popover` 和 `--popover-foreground` CSS 变量（亮/暗模式）
- `src/tailwind.config.ts`：在 `theme.extend.colors` 中注册 `popover`
- `src/components/ChatInput.tsx`：textarea `rows={1}` → `rows={2}`
- `src/lib/resume-renderer.ts`：
  - `body { ... }` 改为 `.resume-document, .resume-two-column { ... }`
  - `* { ... }` 改为 `.resume-document *, .resume-two-column * { ... }`
  - 二栏路径（renderResumeBody 内）保持现有外层 class 不变

**测试**

- 手动验证主题切换不影响应用 UI 字体
- 手动验证菜单栏消失
- 手动验证设置对话框里看到版本号
- 手动验证下拉框背景不再透明
- `npm run typecheck` 通过

**用户感知**

- 顶部菜单条消失（macOS 下系统菜单不受影响，仍正常显示）
- 切换主题视觉更聚焦（不会"全屏变样"）
- 视觉模板/头像下拉不再透明
- 对话输入框看起来更"够用"
- 设置里能看到版本号
