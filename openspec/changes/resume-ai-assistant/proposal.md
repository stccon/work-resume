## Why

小白用户需要一个打开即用的桌面工具，通过跟 AI 对话来生成和优化简历。现有方案要么需要用户自己配置 API Key（门槛高），要么不够专注简历场景。这个产品通过 AI 对话主动采集用户信息，结合预置模板，让不懂技术的用户也能轻松生成专业简历。

## What Changes

新建一个 Electron 桌面应用，包含：

- **AI 对话界面**：左侧目录/模板树，右侧聊天窗口，支持思考过程展示
- **模板驱动的对话引擎**：AI 主动提问采集简历信息，模板字段决定问什么
- **简历生成**：对话信息填充模板，生成可预览/导出的简历
- **简历上传优化**：用户上传已有简历，AI 分析并优化
- **模型管理**：默认使用 opencode SDK 接入免费模型（qwen/big-pickle），支持切换模型和用户自填 API Key
- **opencode SDK 集成**：作为模型网关，不暴露 API Key 给客户端

## Capabilities

### New Capabilities
- `ai-chat`: 核心对话能力，包含流式响应、思考模式展示、对话历史管理
- `resume-templates`: 简历模板系统，包含预置模板、模板字段定义、扩展接口
- `resume-generation`: 基于对话信息生成简历，支持模板选择和自定义调整
- `resume-optimization`: 上传已有简历，AI 进行分析和优化建议
- `model-management`: 模型切换、opencode SDK 接入、用户自填 API Key

### Modified Capabilities

（无，新项目）

## Impact

- 新项目，独立仓库
- 依赖：Electron、React、Tailwind CSS、`@opencode-ai/sdk`
- 开发期需要 opencode 免费模型可用
- 后续需要自建后端代理时，需增加服务端基础设施
