## REMOVED Requirements

### Requirement: AI 展示思考过程

**Reason**: 思考过程对普通用户价值有限，移除后界面更简洁，降低认知负担。

**Migration**: 删除 `ChatMessage` 组件中的 thinking 渲染区域，移除 `App.tsx` 中 `streamingThinking` 状态，停止后端提取 thinking 内容。
