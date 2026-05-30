## ADDED Requirements

### Requirement: AI 主动发起首轮对话
系统 SHALL 在应用启动、新建对话、切换模板时，由 AI 自动发送第一条消息，无需用户先输入。

#### Scenario: 首次启动（无用户数据）
- **WHEN** 用户首次打开应用，且 `userdata/` 目录为空
- **THEN** AI 主动发送问候消息，询问用户姓名，并引导开始制作简历

#### Scenario: 老用户启动（有 profile）
- **WHEN** 用户再次打开应用，且已有 `profile.json` 包含姓名
- **THEN** AI 使用用户姓名打招呼，询问是否需要继续完善或重新开始

#### Scenario: 新建对话
- **WHEN** 用户点击"新建对话"按钮
- **THEN** 系统清空消息列表，AI 根据当前 profile 状态发送相应的首轮消息

### Requirement: 首消息感知用户身份
系统 SHALL 在构建首消息 prompt 时，加载当前用户的 profile 数据决定问候方式。

#### Scenario: 已知用户
- **WHEN** currentUser 非空且 profile 包含 name
- **THEN** 首消息 prompt 包含用户姓名和已有简历摘要，AI 据此称呼用户并询问方向

#### Scenario: 未知用户
- **WHEN** 无 currentUser 或 profile 为空
- **THEN** 首消息 prompt 仅包含模板信息，AI 主动询问用户姓名

### Requirement: 首消息 streamResponse 机制
系统 SHALL 提供 `sendFirstMessage()` 函数，与 `handleSend` 共享流式渲染逻辑但不显示用户消息气泡。

#### Scenario: 首消息流式渲染
- **WHEN** 系统触发首消息
- **THEN** 调用 `streamResponse(prompt)`，AI 回复以流式方式渲染为第一条 assistant 消息，无 preceding user 气泡
