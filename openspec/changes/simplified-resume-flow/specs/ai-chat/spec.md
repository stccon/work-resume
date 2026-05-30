## MODIFIED Requirements

### Requirement: AI 主动识别用户身份
系统 SHALL 在对话开始时主动识别当前为谁制作简历，并根据识别结果决定首轮对话的问候方式。

#### Scenario: 首次使用
- **WHEN** 用户首次打开应用且 `userdata/` 目录为空
- **THEN** AI 主动问候并询问用户姓名，同时触发首轮对话

#### Scenario: 已有用户
- **WHEN** `userdata/` 目录存在已有用户
- **THEN** AI 用用户姓名打招呼，并询问是否需要继续完善已有简历

### Requirement: 迭代对话循环
系统 SHALL 在每次迭代中自动刷新 AI 上下文，确保 AI 始终基于最新简历数据进行优化。

#### Scenario: 用户要求修改
- **WHEN** 简历已生成但用户要求修改
- **THEN** AI 根据用户反馈调整对应字段，重新生成简历预览，并刷新 context

#### Scenario: 反复优化
- **WHEN** 用户多次提出修改意见
- **THEN** 系统每次迭代后刷新 context，保持 AI 对最新简历数据的感知

### Requirement: 用户可以和 AI 进行对话
系统 SHALL 在启动/新建对话时由 AI 主动发起第一句对话，无需用户先输入。

#### Scenario: 用户发送消息
- **WHEN** 用户在输入框输入文本并发送
- **THEN** 系统将消息发送给 LLM，并以流式方式逐步显示 AI 回复

#### Scenario: AI 主动发起对话
- **WHEN** 应用启动或新建对话
- **THEN** 系统自动触发 `sendFirstMessage()`，AI 流式输出首条回复

## REMOVED Requirements

### Requirement: 左侧目录树
**Reason**: 模板选择已移除，左侧目录树的模板列表功能不再需要

**Migration**: 左侧边栏精简为只显示"保存的简历"和"设置"

### Requirement: 显示模板列表
**Reason**: 统一模板后无需用户选择模板

**Migration**: 移除左侧面板的模板列表区域
