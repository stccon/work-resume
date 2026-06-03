## ADDED Requirements

### Requirement: 头像与简历一对一绑定

系统 SHALL 将每张头像与一份简历（`resumeId`）唯一关联，不同简历不共享头像。

#### Scenario: 切换简历时头像跟随
- **WHEN** 用户从简历 A 切换到简历 B
- **THEN** 预览区显示简历 B 的头像（若 B 无头像则显示无头像形态），简历 A 的头像保留不变

#### Scenario: 删除简历时清理头像
- **WHEN** 用户删除某份简历
- **THEN** 与之关联的头像数据同时被删除，存储中无残留

#### Scenario: 同一份简历多次切换头像
- **WHEN** 用户对简历 A 先上传头像 X，再上传头像 Y
- **THEN** 简历 A 的头像变为 Y，X 被覆盖（不保留历史版本）

### Requirement: AI 上下文不得包含头像字段

系统 SHALL 在向 AI 发送的任何 prompt 中剔除 `personal.avatar` 字段，无论该字段来自 AI 输出还是历史数据。

#### Scenario: AI 输出 JSON 含 avatar 时被拦截
- **WHEN** AI 在 JSON 输出中包含 `sections.personal.avatar` 字段
- **THEN** 解析层在写入 `resumeData` 前删除该字段，且后续 AI 上下文不包含该字段

#### Scenario: 历史落盘数据含 avatar 时不外泄
- **WHEN** 启动时加载的简历 `sections.personal` 中存在 `avatar` 字段
- **THEN** 构造发送给 AI 的 prompt 时该字段被剔除（不出现在 `JSON.stringify` 结果中）

#### Scenario: 三类 prompt 全覆盖
- **WHEN** 系统构造 `buildFirstMessagePrompt`、`buildResumeContext`、`buildRefinePrompt` 中任意一个
- **THEN** 序列化前都对 sections 做 avatar 剥离

### Requirement: 头像数据存储于 electron-store

系统 SHALL 使用 electron-store 持久化头像数据，存储键为 `avatars`，结构为 `{ [resumeId]: { dataUrl: string, enabled: boolean } }`。

#### Scenario: 写入头像
- **WHEN** 用户对某简历上传头像
- **THEN** electron-store 的 `avatars[resumeId]` 被设置为 `{ dataUrl, enabled: true }`，无需关心 localStorage

#### Scenario: 读取头像
- **WHEN** 应用启动或切换简历需要读取头像
- **THEN** 从 electron-store 的 `avatars[resumeId]` 取数据；若不存在则视为无头像

#### Scenario: 移除头像
- **WHEN** 用户主动移除某简历的头像
- **THEN** electron-store 的 `avatars[resumeId]` 整条被删除（不保留 `null` 占位）

### Requirement: 历史头像迁移

系统 SHALL 在首次启动新版本时，自动将 localStorage 的 `user-avatar` / `user-avatar-enabled` 迁移到"上次活跃简历"对应的 avatars 槽位，并清除旧 localStorage 键。

#### Scenario: 存在旧头像且有上次活跃简历
- **WHEN** 启动时 `localStorage["user-avatar"]` 不为空且 `getLastActiveResume()` 返回有效 id
- **THEN** 将 `dataUrl` 写入 `avatars[lastActiveId]`，`enabled` 取自 `localStorage["user-avatar-enabled"]`（默认 true），随后删除两个旧 localStorage 键

#### Scenario: 存在旧头像但无活跃简历
- **WHEN** 启动时 `localStorage["user-avatar"]` 不为空但没有任何简历
- **THEN** 保留 localStorage，等到用户首次创建/导入简历后再迁移到该简历

#### Scenario: 迁移幂等
- **WHEN** 已经完成迁移后再次启动
- **THEN** 不会重复迁移（因为旧 localStorage 键已被删除），不报错

### Requirement: 头像 UI 与简历名合并

系统 SHALL 在顶部 header 提供一个统一的"简历名 + 头像"组件，作为头像管理的唯一入口；不再在工具栏右侧提供独立的头像按钮。

#### Scenario: 显示当前简历的头像和名称
- **WHEN** 用户选中某份简历且该简历有头像
- **THEN** header 中显示一个胶囊，包含：小尺寸头像 + 简历标题 + 下拉指示

#### Scenario: 无头像状态
- **WHEN** 当前简历没有头像
- **THEN** 胶囊显示通用占位图标 + 简历标题，点击仍可进入上传

#### Scenario: 点击展开管理菜单
- **WHEN** 用户点击胶囊
- **THEN** 弹出 popover，包含：放大头像预览（如有）、上传/更换、移除、显示开关

#### Scenario: 头像启用开关位置
- **WHEN** 用户希望切换"是否在简历中显示头像"
- **THEN** 该开关位于胶囊 popover 内，而非视觉主题选择器内

### Requirement: 视觉主题选择器解耦头像

系统 SHALL 从 `VisualThemePicker` 组件移除所有头像相关的 props 和 UI，使其只承担"选择视觉主题"职责。

#### Scenario: 接口收缩
- **WHEN** 调用方使用 VisualThemePicker
- **THEN** 不再需要传入 `avatarEnabled` / `onAvatarEnabledChange` / `hasAvatar`

#### Scenario: 主题切换不影响头像启用状态
- **WHEN** 用户切换视觉主题
- **THEN** 该简历的头像 `enabled` 状态保持不变（不会因主题切换而被重置或受 `theme.avatar.defaultEnabled` 覆盖）

### Requirement: PDF 导入时自动绑定头像到新简历

系统 SHALL 在 PDF 导入流程中，将自动提取的头像写入新创建的简历对应的 avatars 槽位，而非写入全局位置。

#### Scenario: 导入 PDF 提取出头像
- **WHEN** PDF 导入成功且 `extractPdfAvatarPayload` 返回有效图像
- **THEN** 将处理后的 dataURL 写入 `avatars[newResumeId]`，`enabled` 设为 true

#### Scenario: 导入 PDF 未提取出头像
- **WHEN** PDF 导入成功但未能提取头像
- **THEN** `avatars[newResumeId]` 不被创建，胶囊显示无头像形态
