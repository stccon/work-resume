## Context

桌面简历 AI 助手，面向非技术用户。初期通过 opencode SDK 接入免费 LLM，后期可切换自建后端。Electron + React + Tailwind CSS 技术栈，所有逻辑在客户端完成（阶段1）。

## Goals / Non-Goals

**Goals:**
- 开箱即用的桌面应用，无需用户安装配置或填写 API Key
- AI 对话驱动的简历生成流程，展示思考过程
- 模板驱动对话：模板字段决定 AI 提问内容
- 支持上传已有简历进行优化
- 模型可切换，支持用户自填 API Key
- 架构预留抽象层，未来可替换 LLM 后端

**Non-Goals:**
- 不实现协作/多用户功能
- 不实现云端同步（阶段1本地存储）
- 不使用 opencode 的 agent/tool 系统，只当模型网关

## Decisions

### 1. Electron 主进程管理 opencode Server
通过 `@opencode-ai/sdk` 的 `createOpencode()` 在主进程拉起 Server，Render 进程通过 IPC 间接调用，不直接暴露网络端口给用户。

### 2. 对话抽象层隔离 opencode 依赖
```
┌─────────────────────────────────────────────┐
│  UI Layer (Renderer)                         │
│  └─ ChatStore (对话状态管理)                  │
│       └─ ChatAdapter (抽象接口)               │
│            ├─ OpencodeAdapter (阶段1)         │
│            └─ DirectApiAdapter (阶段2)        │
└─────────────────────────────────────────────┘
```
UI 只依赖 ChatAdapter 接口，切换底层实现不改 UI。

### 3. 模板即对话剧本
模板 JSON 定义所有字段及其属性（必填/选填、顺序、追问策略），对话引擎据此决定问什么。LLM 负责「怎么问」和「追问细节」，但不决定大方向。

### 4. 思考模式通过流式事件提取
opencode SDK 的 SSE 流包含多种事件类型，从中提取 LLM 的思考/推理内容，单独渲染在聊天界面中。

### 5. React + Tailwind CSS + Shadcn/ui
React 组件化开发，Tailwind 实现精美界面，Shadcn/ui 提供基础 UI 组件。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| opencode 免费模型停用或限流 | 对话抽象层预留切换能力，可快速切到自己后端 |
| opencode SDK API 变更 | 只使用 session.prompt() 等稳定接口，不依赖内部 API |
| Electron 打包体积过大 | 初期接受，优化阶段再拆减依赖 |
| 小白用户不熟悉"模型切换"概念 | 默认隐藏高级设置，仅暴露"切换模型"按钮 |
