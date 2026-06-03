## 1. 后端存储层（electron-store + IPC）

- [x] 1.1 在 `electron/ipc.ts` 新增 `getAvatars()` / `saveAvatars()` helper，封装对 `store.get("avatars", {})` 的读写
- [x] 1.2 新增 IPC handler `avatar:get`（按 resumeId 返回 `{ dataUrl, enabled } | null`）
- [x] 1.3 新增 IPC handler `avatar:set`（写入指定 resumeId 的 `{ dataUrl, enabled }`）
- [x] 1.4 新增 IPC handler `avatar:remove`（删除指定 resumeId 的整条记录）
- [x] 1.5 新增 IPC handler `avatar:migrate-from-legacy`（接收旧 dataUrl/enabled 和目标 resumeId，写入后返回成功标志）
- [x] 1.6 修改 `resume:delete` handler 在删除简历时同步清理 `avatars[id]`
- [x] 1.7 在 `electron/preload.ts` 暴露 `getAvatar` / `setAvatar` / `removeAvatar` / `migrateAvatarFromLegacy` 给渲染进程
- [x] 1.8 更新 `src/env.d.ts` 中 `electronAPI` 类型声明，添加新接口

## 2. AI 上下文剥离（distillation.ts）

- [x] 2.1 在 `src/adapter/distillation.ts` 顶部新增 helper `stripAvatar(sections: Record<string, any>): Record<string, any>`，深拷贝并 `delete personal.avatar`
- [x] 2.2 修改 `buildFirstMessagePrompt`：在 `JSON.stringify(profile.sections, ...)` 前调用 `stripAvatar`
- [x] 2.3 修改 `buildResumeContext`：同上
- [x] 2.4 修改 `buildRefinePrompt`：同上
- [x] 2.5 在 `src/__tests__/distillation.test.ts` 新增用例：
  - `buildResumeContext` 输入含 avatar 的 sections，输出 prompt 不含 base64 字串
  - `buildRefinePrompt` 同上
  - `buildFirstMessagePrompt` 同上
  - `stripAvatar` 不修改原对象（纯函数）

## 3. 解析层入口剥离（App.tsx）

- [x] 3.1 修改 `tryDetectResumeJSON`：解析成功后 `delete parsed.sections.personal?.avatar`（在 `flattenSectionValues` 之前/之后均可，无副作用）
- [ ] 3.2 新增测试或人工验证：构造一段 AI reply 含 `personal.avatar` 字段，断言 detected 不含该字段（人工验证）

## 4. App 状态重构（per-resume 头像）

- [x] 4.1 删除 `AVATAR_STORAGE_KEY` / `AVATAR_ENABLED_KEY` 常量（保留到迁移完成后删；先用注释标记 deprecated）
- [x] 4.2 删除 `userAvatar` / `avatarEnabled` 这两个单值 state，及其 localStorage 同步 useEffect
- [x] 4.3 新增 state：`avatars: Record<string, { dataUrl: string; enabled: boolean }>`，初始为 `{}`
- [x] 4.4 init 阶段调用 `window.electronAPI.getAvatar(...)` 或批量加载所有头像（按数量决定批量与否）
- [x] 4.5 修改 `composeDataWithAvatar` 签名：从 `(data, userAvatar, userEnabled, theme)` 改为 `(data, avatarEntry, theme)`，其中 `avatarEntry: { dataUrl, enabled } | null`
- [x] 4.6 修改 `composedResumeData` useMemo：按当前 `activeResumeId` 从 `avatars` 取头像 entry
- [x] 4.7 新增 helper `setAvatarFor(resumeId, dataUrl)` / `removeAvatarFor(resumeId)` / `setAvatarEnabledFor(resumeId, enabled)`，内部更新 state + 调用 IPC

## 5. PDF 导入流程适配

- [x] 5.1 修改 `handleImportPdfResume`：将原 `setUserAvatar(dataUrl)` + 写 localStorage 的代码替换为 `setAvatarFor(entry.id, dataUrl)`
- [ ] 5.2 验证：导入一份带照片的 PDF，预览中显示头像，切换到其他简历后再切回，头像保持（人工验证）

## 6. 历史数据迁移逻辑

- [x] 6.1 在 App.tsx init 中（`Promise.all` 后、`selectResume` 前）检测 `localStorage.getItem("user-avatar")`
- [x] 6.2 若存在且 `getLastActiveResume()` 返回有效 id 且该 id 在 list 中：
  - 调用 `window.electronAPI.migrateAvatarFromLegacy(lastId, dataUrl, enabled)`
  - 成功后 `localStorage.removeItem("user-avatar")` 和 `localStorage.removeItem("user-avatar-enabled")`
  - 更新本地 `avatars` state
- [x] 6.3 若没有任何简历：保留 localStorage 不动，下次创建首份简历时再触发迁移
- [x] 6.4 在 `handleCreateResume` 和 `handleImportPdfResume` 开头加上"如果还有旧 localStorage 数据，迁移到新简历"的兜底逻辑
- [x] 6.5 一次性清理：迁移时扫描所有 `SavedResume.data.sections.personal.avatar`，删除该字段并调用 `resume:update` 回写

## 7. UI 重构：ResumeNamePill 组件

- [x] 7.1 新建 `src/components/ResumeNamePill.tsx`，承载：
  - props: `title`, `avatar` (dataUrl | null), `avatarEnabled`, `onUpload(file)`, `onRemove()`, `onToggleEnabled(enabled)`
  - 视觉：小头像或占位 + 标题 + 下拉箭头
  - popover：放大头像预览 + 上传按钮 + 移除按钮 + 启用开关
- [x] 7.2 复用 `AvatarUploader` 中的文件校验逻辑（类型/大小），可以提取到 `src/lib/avatar-utils.ts`
- [x] 7.3 在 App.tsx header 删除独立的 `<AvatarUploader>` 节点
- [x] 7.4 在 App.tsx header 用 `<ResumeNamePill>` 替换原 `activeResume.title` 胶囊渲染
- [x] 7.5 标记 `src/components/AvatarUploader.tsx` 为 deprecated（如完全无引用则直接删除）

## 8. VisualThemePicker 收缩

- [x] 8.1 从 `VisualThemePickerProps` 删除 `avatarEnabled` / `onAvatarEnabledChange` / `hasAvatar`
- [x] 8.2 删除组件底部"显示头像"开关 UI 块（line ~152-176）
- [x] 8.3 修改 App.tsx 中 `<VisualThemePicker>` 调用，移除对应 props
- [x] 8.4 验证：切换主题不影响头像 enabled 状态

## 9. 集成验证

- [x] 9.1 手动场景：创建简历 A → 上传头像 X → 创建简历 B → 上传头像 Y → 切换 A，看到 X；切换 B，看到 Y
- [x] 9.2 手动场景：删除简历 A → electron-store 中 `avatars["A 的 id"]` 不再存在
- [x] 9.3 手动场景：模拟老用户（localStorage 有 `user-avatar`）+ 至少一份简历 → 首启后头像出现在上次活跃简历上，localStorage 已清空
- [x] 9.4 手动场景：导入 PDF（带照片）→ 预览有头像 → 切换其他简历再切回 → 头像仍在
- [x] 9.5 单元测试：`npm run test` 通过
- [x] 9.6 类型检查：`npm run typecheck` 通过
- [x] 9.7 检查 AI prompt（添加 debug 日志或手动构造）：确认 sections 中 avatar 字段已被剥离
