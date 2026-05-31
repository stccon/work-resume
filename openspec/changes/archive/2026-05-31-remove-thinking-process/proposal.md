## Why

当前聊天界面中展示 LLM 思考过程对用户价值有限，反而增加界面噪音。普通用户不需要看到 AI 的推理链，只关心最终回答。移除思考过程可简化界面、减少认知负担。

## What Changes

- 移除 `ChatMessage` 组件中的思考过程展示区域（折叠按钮 + 内容区）
- 移除 `App.tsx` 中 `streamingThinking` 状态和相关逻辑
- 停止后端从 SSE 流中提取 thinking 内容的代码
- 清理相关的类型定义和 IPC 数据结构

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `ai-chat`: 移除"AI 展示思考过程"需求及相关场景

## Impact

- `src/components/ChatMessage.tsx` — 移除 thinking 渲染
- `src/App.tsx` — 移除 streamingThinking 状态
- `electron/opencode.ts` — 移除 thinking 提取逻辑
- `src/env.d.ts` — 清理 `SendMessageResult.thinking` 和 `ChatChunk`
- `electron/preload.ts` — 清理 thinking 相关类型
- `src/adapter/ChatAdapter.ts` — 清理 `StreamCallbacks.onThinking`
