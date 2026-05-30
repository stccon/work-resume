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

---

## 11. 三大目录结构与数据持久化（新架构）

- [x] 11.1 创建 resumes/ 和 userdata/ 目录，调整应用目录依赖
- [x] 11.2 实现 userdata/{user}/profile.json 读写逻辑（主进程 IPC）
- [x] 11.3 实现 userdata/{user}/conversations/{date}.json 对话记录存储
- [x] 11.4 实现 userdata/{user}/preferences.json 用户偏好存储（颜色、字体、布局等）
- [x] 11.5 实现简历导出到 resumes/ 目录（PDF 命名规则：{姓名}_{模板}_{日期}.pdf）
- [x] 11.6 实现 LLM 对话提炼引擎：对话结束 → LLM 合并旧 profile + 新信息 → 新 profile.json

## 12. 迭代优化循环（死循环）

- [x] 12.1 重构对话流程：从线性"收集→生成→结束"改为"收集→生成→反馈→再收集"循环
- [x] 12.2 实现"AI 确认信息足够→生成预览→用户反馈→继续优化"闭环交互
- [x] 12.3 实现简历预览实时更新（每次迭代自动刷新预览）
- [x] 12.4 实现"信息足够"检测逻辑（必填字段完整 + AI 判断是否需要追问）
- [x] 12.5 实现用户主动要求修改/优化的对话分支

## 13. 模板系统分层：React 组件视觉层

- [x] 13.1 安装 @react-pdf/renderer 依赖
- [x] 13.2 设计 React 模板组件接口规范（Props: resumeData + preferences → PDF）
- [x] 13.3 实现通用简历模板 React 组件（GeneralResume.tsx）
- [x] 13.4 实现技术岗位模板 React 组件（TechnicalResume.tsx）
- [x] 13.5 实现管理岗位模板 React 组件（ManagementResume.tsx）
- [x] 13.6 实现模板注册机制：新增模板只需加组件 + 注册到 registry

## 14. PDF 渲染引擎：@react-pdf/renderer

- [x] 14.1 实现 @react-pdf/renderer 在 Electron 渲染进程中的适配
- [x] 14.2 实现核心 PDF 文档组件（pdf-renderer.tsx），组合各模板组件
- [x] 14.3 实现 PDF 实时预览组件（DOM 预览保留 HTML 版 ResumePreview；PDF 渲染用 @react-pdf/renderer）
- [x] 14.4 替换现有 generateHTML() + 浏览器打印为 @react-pdf/renderer 导出（保留 fallback）
- [x] 14.5 保留 HTML 打印为 fallback
- [x] 14.6 注册自定义字体骨架（base.tsx 中预留 Font.register 接口）

## 15. 多用户支持

- [x] 15.1 实现 userdata/ 目录扫描逻辑：列出所有已有用户
- [x] 15.2 实现 AI 主动识别用户身份 Prompt（对话开始自动询问）
- [x] 15.3 实现用户选择/切换 UI（快速切换已有用户）
- [x] 15.4 实现按用户加载/保存数据的路由（IPC 层根据用户标识操作对应目录）
- [x] 15.5 实现阶段1 → 阶段2 平滑迁移：旧 electron-store 数据 → userdata/default/

## 16. PDF 导入样式提取

- [x] 16.1 调研并集成 PDF 视觉元数据提取库（pdfjs-dist 提取字体名、字号、位置坐标）
- [x] 16.2 实现 LLM 风格分析 Prompt：分析 PDF 视觉特征 → 输出结构化风格描述
- [x] 16.3 实现"风格→模板参数"映射引擎（风格描述 → color/font/layout 参数）
- [x] 16.4 实现一键套用提取风格：选定模板 + 自动填入风格参数（AI 回复中检测 style JSON → 自动应用到 preferences.json）
- [x] 16.5 保留用户手动微调风格参数的能力（preferences.json 手动编辑 + 设置面板）
