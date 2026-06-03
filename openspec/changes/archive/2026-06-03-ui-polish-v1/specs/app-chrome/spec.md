## ADDED Requirements

### Requirement: 简历主题样式不得逃逸到应用 UI

系统 SHALL 确保简历视觉主题（字体、颜色、间距等）只作用于简历预览/导出区域，不影响应用其他 UI（侧边栏、顶栏、对话区、设置对话框等）。

#### Scenario: 切换主题不改变应用字体
- **WHEN** 用户在顶栏选择一个不同的视觉主题
- **THEN** 应用的左侧侧边栏文本、顶栏文本、对话区字体保持系统默认；只有右侧简历预览的字体变化

#### Scenario: 切换主题不改变应用其他视觉
- **WHEN** 用户切换主题
- **THEN** 应用其他区域的 margin/padding/box-sizing 不会被主题的 `* { ... }` 规则影响

#### Scenario: PDF 导出不受影响
- **WHEN** 用户从某主题状态下导出 PDF
- **THEN** 导出的 PDF 字体/排版与该主题在预览中显示的一致

### Requirement: 隐藏 Electron 默认菜单栏

系统 SHALL 在 Windows 和 Linux 平台不显示 Electron 的默认 File/Edit/View/Window/Help 菜单。

#### Scenario: 主窗口顶部无菜单
- **WHEN** 用户启动应用并查看主窗口
- **THEN** 窗口顶部不显示任何菜单条；按 Alt 键也不会唤出菜单

#### Scenario: 应用功能不依赖菜单
- **WHEN** 菜单被隐藏后
- **THEN** 用户仍可通过 UI 按钮完成所有操作（创建简历、导入、导出、设置、模型切换等）

### Requirement: 版本号显示于设置对话框

系统 SHALL 在设置对话框中展示当前应用版本号，版本号来源于 `app.getVersion()` 而非硬编码。

#### Scenario: 打开设置看到版本号
- **WHEN** 用户打开设置对话框并滚到底部（或专门的"关于"段）
- **THEN** 看到形如 `版本 1.0.0` 的标识

#### Scenario: package.json 版本变化自动反映
- **WHEN** 项目升级到 1.1.0 并重新打包
- **THEN** 设置中显示 `版本 1.1.0`，无需修改 React 代码

### Requirement: 设置对话框不再展示 API Key 字段

系统 SHALL 从设置对话框中移除 API Key 输入字段及相关 UI 元素。

#### Scenario: 设置打开无 API Key 输入
- **WHEN** 用户打开设置对话框
- **THEN** 不出现 "API Key" 标签、密码输入框、提示文字

#### Scenario: 无残留状态
- **WHEN** 检查 SettingsDialog 组件源码
- **THEN** 不存在 `apiKey` state、`setApiKey` setter、`Key` 图标 import

### Requirement: popover 设计 token 完整

系统 SHALL 在 CSS 变量和 Tailwind 配置中提供 `popover` 与 `popover-foreground` 颜色 token，使 `bg-popover` 等 utility class 在亮/暗模式下都能正确渲染。

#### Scenario: 视觉模板下拉框背景不透明
- **WHEN** 用户点击右上角"视觉模板"按钮，下拉框展开
- **THEN** 下拉框背景为不透明的浅色（亮模式）或深色（暗模式），无法看到背后内容

#### Scenario: 头像 popover 背景不透明
- **WHEN** 用户点击头像入口（含未来重构后的 ResumeNamePill）展开 popover
- **THEN** popover 背景不透明

#### Scenario: 暗模式下 popover 文本可读
- **WHEN** 应用切换到暗模式且 popover 展开
- **THEN** popover 内的文本颜色（来自 `--popover-foreground`）与背景对比度足够，文字清晰可读

### Requirement: 对话输入框视觉权重

系统 SHALL 在 ChatInput 组件中将 textarea 的初始可见行数从 1 改为 2，保持 auto-grow 上限不变。

#### Scenario: 空闲状态显示 2 行高度
- **WHEN** 用户进入对话页面且未输入任何文本
- **THEN** textarea 默认展示 2 行可见区域

#### Scenario: 多行输入仍按内容自适应
- **WHEN** 用户输入超过 2 行的内容
- **THEN** textarea 高度按 scrollHeight 增长，最高到 200px（现有上限不变）

#### Scenario: 单行输入不被压缩
- **WHEN** 用户只输入一行短文本
- **THEN** textarea 高度仍维持 2 行（不会因内容少而变 1 行）
