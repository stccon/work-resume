## Why

当前头像（base64 dataURL，可达数十至上百 KB）有两个真实风险：

1. **AI token 浪费**：`buildFirstMessagePrompt` / `buildResumeContext` / `buildRefinePrompt` 三处都将 `sections` 整体 JSON 序列化后塞进 prompt。AI 输出 JSON 时虽被告知"不要输出 avatar 字段"，但模型不一定听话；一旦回流到 `resumeData.sections.personal.avatar`，下次对话即会把 base64 当作上下文喂回 AI，烧光 token 配额。
2. **多简历共享头像**：当前头像存于 localStorage 单一 key `user-avatar`，所有简历共用一张。用户切换简历时头像不会跟着变，体验上像"系统级头像"而非"简历的头像"。

同时，"上传头像" 按钮目前位于工具栏最右，距离"简历名"较远，用户难以感知它和当前简历的归属关系。

## What Changes

- **AI 上下文剥离头像**：在 `distillation.ts` 的三个 prompt 构造函数中，stringify `sections` 前主动 `delete personal.avatar`；同时在 `tryDetectResumeJSON` 中也 strip 一次，保证 `resumeData` 永远不含 avatar 字段。
- **头像按简历存储**：废弃单一 localStorage key，改为以 `resumeId` 为键的映射存储。读写均通过统一接口，与简历的 CRUD 生命周期绑定（删简历时一起删头像）。
- **存储介质改为 electron-store**：现有头像存 localStorage，多简历 + base64 容易触发 5-10MB 配额限制。改为 electron-store 后无配额顾虑，且与 `SavedResume` 数据存储一致。
- **历史头像迁移**：首次启动检测到旧 localStorage key 时，将其迁移到"上次活跃简历"的 avatar 槽位，然后清除旧 key。
- **头像 UI 合并到简历名胶囊**：删除 header 工具栏右侧独立的 `<AvatarUploader>`，将其能力（上传/换/移除/启用开关）合并到"简历名"胶囊里。点击胶囊 = 展开头像菜单。
- **VisualThemePicker 解耦头像开关**：从 `VisualThemePicker` 中移除头像启用开关（`avatarEnabled` / `onAvatarEnabledChange` props），由新的"简历名 + 头像"组件统一管理。

## Capabilities

### New Capabilities
- `resume-avatar`: 头像生命周期的完整规则——存储位置（per-resume）、迁移路径、与 AI 上下文的隔离、UI 入口位置。

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

**代码改动**

- `src/adapter/distillation.ts`：三个 prompt 函数加 avatar stripping helper
- `src/App.tsx`：
  - `tryDetectResumeJSON` 中 strip avatar
  - `composeDataWithAvatar` 改为按 `resumeId` 查找头像
  - 删除 `<AvatarUploader>` 顶栏渲染、`userAvatar` / `avatarEnabled` 的单值 state
  - 新增"头像 + 简历名"合并组件的接入
  - 启动时迁移逻辑（旧 localStorage → 新 store）
  - PDF 导入流程中 `setUserAvatar` 改为 `setAvatarFor(resumeId, dataUrl)`
- `src/components/AvatarUploader.tsx`：拆分为可被简历名胶囊复用的 UI（或重写为新组件 `ResumeNamePill`）
- `src/components/VisualThemePicker.tsx`：移除 avatar 相关 props 与底部启用开关 UI
- `electron/ipc.ts`：新增 IPC handler `avatar:get/set/remove`，通过 electron-store 持久化
- `electron/preload.ts`：暴露新的 avatar API
- 删除：`AVATAR_STORAGE_KEY` / `AVATAR_ENABLED_KEY` 这两个常量（迁移完成后）

**测试**

- 新增 `src/__tests__/distillation.test.ts` 用例：avatar 字段被 strip
- 新增 `electron/__tests__/avatar-store.test.ts`（如需）

**用户感知**

- 首次启动后老头像会自动绑定到上次活跃简历（无需操作）
- 上传按钮位置变化，需要一次性的视觉重新发现
- 不同简历切换时头像跟着切换
