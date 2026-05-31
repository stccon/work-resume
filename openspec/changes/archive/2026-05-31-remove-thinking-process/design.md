## Context

当前聊天界面在 AI 回复中展示 LLM 的思考过程（可折叠区域）。该功能涉及前端组件渲染、后端 SSE 流解析、IPC 传输和状态管理四个层次。移除后简化约 6 处代码。

## Goals / Non-Goals

**Goals:**
- 移除所有 thinking 相关的前端 UI 渲染
- 移除后端 thinking 数据提取和传输
- 清理相关类型定义

**Non-Goals:**
- 不改动 SSE 流式响应整体架构
- 不改动 opencode SDK 调用方式
- 不引入新的功能或组件

## Decisions

- **直接移除而非隐藏**：通过配置控制显隐会增加复杂度，且用户无此需求
- **保留 `SendMessageResult` 结构中的 `thinking` 字段**：避免破坏 IPC 接口签名和 Electron bridge 类型兼容性 — 设为 `never` 或保留空值均可，选最简单方案
- **不修改预置模板文件**：`general.json` 等模板无关 thinking，无需变动

## Risks / Trade-offs

- [低] 若未来重新需要思考展示，需回滚本次变更 — 影响范围清晰，回滚成本低
