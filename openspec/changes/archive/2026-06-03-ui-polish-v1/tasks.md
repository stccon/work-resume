## 1. CSS 作用域修复（最高优先级）

- [x] 1.1 在 `src/lib/resume-renderer.ts` 中，将 `body { font-family:...; font-size:...; color:...; line-height:...; background:...; }`（line 14）改为 `.resume-document, .resume-two-column { ... 同字段 ... }`
- [x] 1.2 在同文件中，将 `* { margin:0; padding:0; box-sizing:border-box; }`（line 13）改为 `.resume-document *, .resume-two-column *, .resume-document, .resume-two-column { margin:0; padding:0; box-sizing:border-box; }`
- [x] 1.3 grep 检查文件中是否还有以 `body `、`html `、`^\*` 开头的全局选择器，逐一加上前缀
- [x] 1.4 检查 `@media print` 段内是否有 `body { ... }`，同样加前缀
- [ ] 1.5 手动验证：dev 模式启动 → 切换至少 3 个主题（含 v1 / v2 / 两栏），左侧 sidebar、顶栏、对话区字体保持系统默认
- [ ] 1.6 手动验证：导出 PDF → PDF 字体仍按主题正确显示
- [ ] 1.7 手动验证：切换深色/浅色模式不出问题

## 2. Electron 菜单隐藏

- [x] 2.1 在 `electron/main.ts` 顶部 `import { app, BrowserWindow, Menu } from "electron"`
- [x] 2.2 在 `app.whenReady().then(...)` 中、`createWindow()` 之前一行调用 `Menu.setApplicationMenu(null)`
- [ ] 2.3 手动验证：Windows 启动后窗口顶部无 File/Edit/View 等菜单，按 Alt 不会唤出
- [ ] 2.4 验证 F12 开发者工具切换快捷键仍可用（在 `before-input-event` 中已注册，与菜单无关）

## 3. 版本号显示

- [x] 3.1 在 `electron/ipc.ts` 新增 IPC handler `app:get-version`，返回 `app.getVersion()`
- [x] 3.2 在 `electron/preload.ts` 暴露 `getVersion(): Promise<string>` 给渲染进程
- [x] 3.3 在 `src/env.d.ts` 添加 `getVersion: () => Promise<string>` 到 electronAPI 类型
- [x] 3.4 在 `src/components/SettingsDialog.tsx`：
  - 新增 state `const [version, setVersion] = useState<string>("")`
  - 用 `useEffect` 在 `open` 变为 true 时调用 `window.electronAPI.getVersion().then(setVersion)`
  - 在 dialog 内容末尾增加 "关于" 段，显示 `版本 {version}`
- [ ] 3.5 手动验证：打开设置 → 看到 `版本 1.0.0`
- [ ] 3.6 将 package.json 临时改 1.0.1 → 重启 dev → 设置中显示 1.0.1（验证非硬编码），改回 1.0.0

## 4. 删除 API Key 字段

- [x] 4.1 grep `apiKey` 和 `setApiKey` 在整个 `src/` 下的引用，确认只在 `SettingsDialog.tsx` 内部使用
- [x] 4.2 在 `src/components/SettingsDialog.tsx`：
  - 删除 `const [apiKey, setApiKey] = useState("")` 状态
  - 从 `lucide-react` import 中移除 `Key` 图标
  - 删除整块 API Key UI JSX（含 `<label>`、`<input>`、提示文字）
- [x] 4.3 验证 `npm run typecheck` 无报错
- [ ] 4.4 手动验证：打开设置看不到 API Key 字段，主题切换、模型选择仍正常

## 5. 补齐 popover 设计 token

- [x] 5.1 在 `src/styles/index.css` 的 `:root` 块中新增：
  ```css
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  ```
- [x] 5.2 在 `src/styles/index.css` 的 `.dark` 块中新增：
  ```css
  --popover: 240 6% 10%;
  --popover-foreground: 0 0% 98%;
  ```
- [x] 5.3 在 `tailwind.config.ts` 的 `theme.extend.colors` 中新增：
  ```ts
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  }
  ```
- [ ] 5.4 手动验证：点击右上角"视觉模板"下拉 → 背景不透明
- [ ] 5.5 手动验证：点击头像按钮（如本次未做 avatar 重构）→ 背景不透明
- [ ] 5.6 切换深色模式重复以上验证

## 6. 对话输入框增重

- [x] 6.1 在 `src/components/ChatInput.tsx` 将 `<textarea ... rows={1} ... />` 改为 `rows={2}`
- [ ] 6.2 验证 auto-grow 仍正常：粘贴长文本 → 高度增加到 200px 后出现内部滚动
- [ ] 6.3 验证短文本：输入一行短文本，textarea 仍保持 2 行高度

## 7. 集成验证

- [x] 7.1 `npm run typecheck` 通过
- [x] 7.2 `npm run test` 通过
- [ ] 7.3 启动 dev：切主题 → 应用 UI 字体不变
- [ ] 7.4 启动 dev：顶部无菜单条
- [ ] 7.5 启动 dev：设置中看到版本号
- [ ] 7.6 启动 dev：设置中无 API Key 字段
- [ ] 7.7 启动 dev：视觉模板下拉不透明
- [ ] 7.8 启动 dev：对话输入框看起来更"饱满"
