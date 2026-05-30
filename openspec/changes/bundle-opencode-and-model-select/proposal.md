## Why

当前应用依赖用户自行安装 opencode CLI（全局 npm 包）才能启动 AI 对话，且模型列表硬编码为 `["qwen3.6", "big-pickle"]`，用户选择的模型实际未生效（`setModel` 为空函数）。这违背了"小白用户打开即用"的设计目标，也无法利用 opencode 生态中不断新增的免费模型。

## What Changes

- **打包 opencode CLI 二进制**: 通过 npm 依赖 `opencode-ai` 包并在 electron-builder 中 `extraResources` 分发，应用自包含原生二进制，用户无需额外安装
- **动态获取免费模型列表**: `getModels()` 改为调用 `client.config.providers()` 实时获取 opencode 服务器上所有免费模型（cost 为 0），不再硬编码
- **模型选择实际生效**: `setModel()` 改为实际存储并影响 `sendPrompt()` 的 `modelID` 参数，持久化到 `electron-store`
- **模型列表 UI 适配**: 前端从 IPC 动态获取模型列表，移除硬编码

## Capabilities

### New Capabilities
- `opencode-bundling`: 将 opencode CLI 原生二进制打包进 Electron 应用，实现自包含分发
- `model-discovery`: 动态发现 opencode 服务器上的可用免费模型，实时更新模型列表
- `model-persistence`: 用户选择的模型跨重启持久化

### Modified Capabilities
- `model-management`: 模型切换从"UI 选择 + 不生效"变为"UI 选择 + 实际生效 + 持久化"

## Impact

- 新增依赖 `opencode-ai`（原生二进制，~40MB）
- 修改 `electron-builder.yml` 添加工件分发
- 修改 `electron/opencode.ts`（核心逻辑）、`electron/ipc.ts`（持久化）、`src/App.tsx`（动态加载）
- 不影响 `electron/preload.ts`、`src/adapter/`、`src/env.d.ts`
- 生产包体积增加约 40MB（opencode 二进制）
