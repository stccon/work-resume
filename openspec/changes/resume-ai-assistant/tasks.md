## 1. 项目初始化

- [x] 1.1 初始化 Electron + React + TypeScript 项目结构
- [x] 1.2 配置 Tailwind CSS + Shadcn/ui
- [x] 1.3 配置 Electron 主进程和渲染进程架构
- [x] 1.4 配置开发环境热更新（Vite + Electron）
- [x] 1.5 安装 @opencode-ai/sdk 依赖

## 2. Electron 主进程 + opencode 集成

- [x] 2.1 实现主进程启动 opencode Server（createOpencode）
- [x] 2.2 实现 IPC 通道：渲染进程 ↔ 主进程 opencode 通信
- [x] 2.3 实现 ChatAdapter 抽象接口
- [x] 2.4 实现 OpencodeAdapter（基于 opencode SDK session.prompt）
- [x] 2.5 实现流式响应通过 IPC 推送到渲染进程
- [x] 2.6 实现 API Key 安全存储（electron-store 加密）

## 3. 基础 UI 框架

- [x] 3.1 实现主窗口布局：左侧面板 + 右侧聊天区域
- [x] 3.2 实现左侧面板：模板列表和文件列表
- [x] 3.3 实现右侧聊天区域基础框架
- [x] 3.4 实现消息气泡组件（用户消息 / AI 消息）
- [x] 3.5 实现输入框 + 发送按钮
- [x] 3.6 实现暗色/亮色主题切换

## 4. AI 对话功能

- [x] 4.1 实现 ChatStore 状态管理（zustand）— 使用内联状态管理替代 zustand，App.tsx 的 useState
- [x] 4.2 实现消息流式渲染组件 — ChatMessage + App 中流式更新逻辑
- [x] 4.3 实现思考过程展示组件（可折叠/展开）— ChatMessage 中 thinking + 折叠按钮
- [x] 4.4 实现对话历史管理（新建/清空）— "新建对话"按钮清空 messages
- [x] 4.5 实现加载状态和错误处理 — loading 状态 + error message 展示

## 5. 模板系统

- [x] 5.1 设计模板 JSON Schema（字段定义、类型、必填、顺序）
- [x] 5.2 预置 3 个简历模板（通用/技术/管理风格）
- [x] 5.3 实现模板加载器（自动识别 templates/ 目录）
- [x] 5.4 实现模板预览组件
- [x] 5.5 实现模板选择交互

## 6. 简历生成

- [x] 6.1 实现对话信息 → 结构化简历数据转换
- [x] 6.2 实现简历数据 → 模板填充引擎
- [x] 6.3 实现简历预览组件
- [x] 6.4 实现简历导出 PDF（浏览器打印方式）
- [x] 6.5 实现模板字段完整性校验

## 7. 简历上传优化

- [x] 7.1 实现文件上传组件（拖拽 + 点击选择）
- [x] 7.2 实现 PDF/DOCX 文件解析
- [x] 7.3 实现 AI 简历分析 prompt
- [x] 7.4 实现优化建议展示和逐项应用

## 8. 模型管理

- [x] 8.1 实现模型切换 UI（下拉选择器）
- [x] 8.2 实现模型列表配置（从 opencode 获取可用模型）
- [x] 8.3 实现 API Key 设置界面
- [x] 8.4 实现用户自填 Key 接入自定义模型

## 9. 用户体验打磨

- [x] 9.1 添加欢迎引导页（首次使用引导）
- [x] 9.2 实现对话建议问题（初始化引导提问）
- [x] 9.3 添加 Toast 通知组件
- [x] 9.4 实现全局快捷键（Cmd+N 新建对话，Cmd+, 打开设置）
- [x] 9.5 应用打包配置（electron-builder）

## 10. 测试与发布

- [x] 10.1 编写核心逻辑单元测试（resume-generator.test.ts + template.test.ts，8 tests passing）
- [ ] 10.2 编写 IPC 通信测试
- [ ] 10.3 集成测试：完整对话 → 生成简历流程
- [ ] 10.4 Windows 平台打包验证
- [ ] 10.5 编写用户使用文档
