## ADDED Requirements

### Requirement: 模态框内提供 AI 润色入口

系统 SHALL 在 `FieldEditorDialog` 的动作栏显示 `[✨ AI 润色]` 按钮。点击后模态框进入 `polishing` 态：右面板显示 spinner + "AI 思考中…"，所有动作按钮 disabled。响应到达后自动切换到 `diff` 态。

#### Scenario: 点击 AI 润色
- **WHEN** 用户在 editing 态点击 `[✨ AI 润色]`
- **THEN** 模态框进入 polishing 态，调 `ai:polish-field` IPC，响应到达后切换到 diff 态

#### Scenario: 偏好 prompt 非空也走同一路径
- **WHEN** 用户在偏好输入框中填写了"更简洁一点"，再点 `[✨ AI 润色]`
- **THEN** payload 中 `extraPrompt = "更简洁一点"`，与 `buildPolishUserPrompt` 拼接后发送给 AI

#### Scenario: 空字段不出现 AI 润色按钮
- **WHEN** 字段当前值为空字符串
- **THEN** 模态框动作栏不显示 `[✨ AI 润色]` 按钮（无内容可润色），仅显示 `[保存]` 和 `[取消]`

#### Scenario: polishing 期间禁止重复触发
- **WHEN** 模态框处于 polishing 态时用户再次点击（任何动作按钮）
- **THEN** 点击无效，UI 不会出现并发请求

### Requirement: AI 润色调用走独立 session 不污染 chat

系统 SHALL 在 `FieldEditorDialog` 触发 `ai:polish-field` 时，沿用 v1 的 stateless 调用路径：新建临时 opencode session → prompt with inline `system` → fire-and-forget delete。该调用 MUST NOT 复用聊天会话或读取全局 `conversationContext`，MUST NOT 触发 `chat:chunk` 事件。

#### Scenario: 调用走独立 session
- **WHEN** 用户在任一字段的模态框内点 `[✨ AI 润色]`
- **THEN** electron 主进程通过 `c.session.create()` 新建临时 session，调用 `c.session.prompt` 时携带 inline `system` 字段，响应返回后调用 `c.session.delete` 清理

#### Scenario: 不影响 chat session
- **WHEN** 用户先在 chat 中聊了 N 轮，再点 `[✨ AI 润色]`
- **THEN** 该简历对应的 chat session（`resumeSessions[resumeId]`）的消息历史不增加润色调用记录；下一次 chat 对话上下文与润色前一致

#### Scenario: 不读取全局 conversationContext
- **WHEN** 当前 `conversationContext` 为 3KB 的 buildResumeContext 内容，用户触发润色
- **THEN** polish 调用的 prompt body 不含该 3KB 内容；只含 polish 所需的最小邻居上下文

### Requirement: 润色 payload 包含必要邻居上下文与偏好

系统 SHALL 在 `polishField` payload 中至少包含以下字段（缺失项为空字符串或 undefined）：

- `targetRole`: 用户求职意向（取自 `personal.title`）
- `sectionId`: 字段所在 section id
- `sectionLabel`: section 显示名（中文，如"工作经历"）
- `fieldLabel`: 字段显示名（如"工作成就"）
- `fieldValue`: 字段当前值
- `entryNeighbors`（仅多 entry section 提供）: 同 entry 的兄弟字段
- `extraPrompt`（v2 新增）: 模态框内偏好输入框的当前值；空字符串 = 用户未填

#### Scenario: 单 entry section 字段 + 无偏好
- **WHEN** 用户在 summary 字段的模态框内点 `[✨ AI 润色]`，偏好框为空
- **THEN** payload 含 `targetRole, sectionId="summary", sectionLabel="个人简介", fieldLabel, fieldValue, extraPrompt="""`，不含 `entryNeighbors`

#### Scenario: 多 entry section 字段 + 有偏好
- **WHEN** 用户在 experience.entry1_achievements 字段的模态框内点 `[✨ AI 润色]`，偏好框为"突出量化"
- **THEN** payload 含 `entryNeighbors`（company/position）+ `extraPrompt="突出量化"`

#### Scenario: 偏好非空时拼接进 user prompt
- **WHEN** `buildPolishUserPrompt` 收到 `extraPrompt="突出量化"`
- **THEN** 输出的 user prompt 末尾追加 `用户额外要求：突出量化`

### Requirement: diff 视图并排展示原文与润色结果

系统 SHALL 在模态框进入 `diff` 态时，渲染左右并排双面板：左面板显示原文（read-only），右面板显示润色结果（可继续微调）。两侧用 hybrid word/char diff 高亮差异——原文中的被删词红色 strikethrough，润色结果中的新增/修改词绿底。

#### Scenario: 短文本 diff 高亮
- **WHEN** 原文 "做了个系统" 润色为 "主导核心交易系统的架构升级与性能优化"
- **THEN** 左面板红色 strikethrough "做了个系统"，右面板对应位置绿底 "主导核心交易系统的架构升级与性能优化"

#### Scenario: 长文本降级
- **WHEN** 原文或润色结果任一长度 > 200 字符
- **THEN** 跳过 diff 计算，左面板显示原文无高亮，右面板直接显示润色后文本，标题旁显示「整体修改」徽标

#### Scenario: diff 态仍可手动调整
- **WHEN** 模态框处于 diff 态时用户在右面板手动修改绿底文本
- **THEN** 修改生效，后续 `[✓ 采纳]` 时使用右面板当前值（不是 AI 原始返回）

### Requirement: diff 态提供采纳 / 重新润色 / 拒绝

系统 SHALL 在 `diff` 态显示三个动作按钮：

- `[✓ 采纳]`：将右面板当前值写入字段（等同"保存"），关闭模态框
- `[↻ 重新润色]`：保持 diff 态，使用最新 `extraPrompt`（用户可能修改了）重新调 `ai:polish-field`，响应到达后回到 diff 态
- `[✕ 拒绝]`：放弃本次润色，模态框回到 `editing` 态，右面板恢复为原始字段值

#### Scenario: 采纳
- **WHEN** 用户在 diff 态点击 `[✓ 采纳]`
- **THEN** 右面板当前值写入字段，模态框关闭，updateResume + setChatContext 同步触发

#### Scenario: 重新润色（偏好已修改）
- **WHEN** 用户在 diff 态修改偏好框为"再短一些"，点 `[↻ 重新润色]`
- **THEN** 模态框进入 polishing 态（新 spinner），新响应到达后回到 diff 态显示新结果

#### Scenario: 拒绝
- **WHEN** 用户在 diff 态点击 `[✕ 拒绝]`
- **THEN** 模态框回到 editing 态，右面板恢复为原始字段值，偏好框保留用户输入（便于调整后再润色）

### Requirement: 润色失败处理

系统 SHALL 在 `polishField` 调用失败（含网络错误、quota 错误、SDK 异常、超时）时：
1. 模态框回到 `editing` 态，右面板恢复为原始字段值
2. 字段持久化值不变
3. 显示错误 toast；若是 quota 错误，复用现有 `TOKEN_QUOTA_EXCEEDED` 处理

#### Scenario: quota 错误
- **WHEN** polish 调用返回 `TOKEN_QUOTA_EXCEEDED`
- **THEN** 模态框回到 editing 态，toast 显示"Token 配额不足，请充值后重试"

#### Scenario: 通用错误
- **WHEN** polish 调用因网络等原因失败
- **THEN** 模态框回到 editing 态，toast 显示错误信息

#### Scenario: 超时
- **WHEN** polish 调用超过 30 秒未返回
- **THEN** 主进程主动 abort，模态框回到 editing 态，toast 提示超时

### Requirement: 润色调用支持取消

系统 SHALL 为每个 in-flight `polishField` 调用维护一个 `AbortController`；当用户切换简历、关闭模态框、或在 polishing 态点 ✕ 时，in-flight 调用 SHALL 被 abort。

#### Scenario: 切换简历取消 in-flight 润色
- **WHEN** 模态框处于 polishing 态，用户切换到另一份简历
- **THEN** in-flight 请求被 abort；切换后的简历 UI 中无模态框、无 loading 残留

#### Scenario: 模态框关闭取消 in-flight
- **WHEN** 模态框处于 polishing 态，用户按 Esc 或点 ✕
- **THEN** in-flight 请求被 abort，模态框关闭，字段值保持原值

### Requirement: 与现有"整份 AI 润色"按钮共存

系统 SHALL 保留现有 `handleRefineResume`/「AI 润色」按钮的行为和可见性条件不变（仅在 PDF 导入流程后显示）。字段级润色 SHALL NOT 影响或借用该按钮的状态（如 `refineCount`、`importedFlowActive`）。

#### Scenario: 整份润色 refineCount 不受字段润色影响
- **WHEN** 用户对 10 个字段分别润色
- **THEN** `refineCount` 保持为 0，不会因字段润色而递增；整份「AI 润色」按钮的 toast 提醒逻辑不被触发
