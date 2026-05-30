## Context

Electron 桌面应用当前通过 `spawn("opencode", ["serve"])` 启动 opencode 服务，依赖系统 PATH 上已安装 opencode CLI。模型列表和模型选择功能存在 3 处断裂：

1. `getModels()` 返回硬编码 `["qwen3.6", "big-pickle"]`
2. `setModel()` 是空函数，选择不生效
3. `sendPrompt()` 硬编码 `modelID: "big-pickle"`

同时，用户安装后无法直接使用（需自行装 opencode），与"小白用户打开即用"目标冲突。

## Goals / Non-Goals

**Goals:**
- 应用自包含 opencode CLI 二进制，用户无需额外安装
- 模型列表从 opencode 服务器实时获取免费模型
- 模型选择实际生效并跨重启持久化
- 保持与现有 electron-builder 打包流程兼容

**Non-Goals:**
- 不实现 API Key 接入自定义模型（已有 spec 但本次不处理）
- 不改动 ChatAdapter/OpencodeAdapter 抽象层
- 不改动 SSE 流式逻辑
- 不处理 Linux/Mac 平台的打包差异（`extraResources` 通用）

## Decisions

### 1. 通过 npm 依赖 `opencode-ai` 而非下载二进制
`opencode-ai` 是 opencode 官方 npm 包，安装时自动下载当前平台对应的原生二进制。将其加入 `dependencies` 后，`npm install` 即可获得可执行文件。替代方案：手动下载二进制放在 `resources/` 中，但需要构建脚本维护多平台下载，复杂度高。

### 2. 使用 `extraResources` 而非 `asarUnpack`
`extraResources` 将二进制放在 `resources/` 目录下，不影响 asar 打包体积，路径简单。`asarUnpack` 会解压到 app 目录，路径不直观。

### 3. `getModels()` 动态调用 `client.config.providers()`
SDK 提供原生方法获取完整模型列表，每次调用保持实时性。模型列表变化不频繁，无需缓存。筛选规则：`provider.id === "opencode"` 且 `model.cost.input === 0 && model.cost.output === 0`。

### 4. 持久化由 `ipc.ts` 处理而非 `opencode.ts`
`ipc.ts` 已引入 `electron-store`，写入时 `store.set("currentModel", model)`，启动时读取并调用 `setModel()`。`opencode.ts` 保持纯业务逻辑，不依赖持久化层。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| `opencode-ai` 的 postinstall 在构建环境可能失败 | `getBinaryPath()` 有多层 fallback，最终兜底到 PATH 查找 |
| 免费模型列表频繁变化 | 每次 `getModels()` 实时获取，不缓存 |
| 持久化的模型下次启动时不可用（如模型下线） | 检查可用列表，不在其中则回退 `"big-pickle"` |
| `config.providers()` 在 opencode 未就绪时失败 | `getModels()` 捕获异常，返回 fallback `["big-pickle"]` |
| 生产包体积增加 ~40MB | 原生二进制的正常体积，无可避免 |
