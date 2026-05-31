## 1. Frontend — 移除思考过程 UI

- [x] 1.1 移除 `ChatMessage` 组件中的 thinking 渲染（折叠按钮 + 内容区）
- [x] 1.2 移除 `App.tsx` 中 `streamingThinking` 状态及相关逻辑

## 2. Backend — 移除 thinking 数据提取

- [x] 2.1 移除 `electron/opencode.ts` 中从 SSE 提取 thinking 的代码
- [x] 2.2 清理 `electron/ipc.ts` 和 `electron/preload.ts` 中 thinking 相关类型

## 3. 清理

- [x] 3.1 清理 `src/adapter/ChatAdapter.ts` 中 `StreamCallbacks.onThinking`
- [x] 3.2 编译验证无报错
