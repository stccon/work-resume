## MODIFIED Requirements

### Requirement: 基于对话生成简历
系统 SHALL 根据对话中收集的用户信息，使用统一模板生成完整简历，不再需要用户先选择内容模板。

#### Scenario: 生成简历
- **WHEN** AI 确认信息已足够或用户要求生成
- **THEN** 系统生成简历预览（默认使用 unified template），用户可查看和下载

### Requirement: 迭代生成（非一次性）
系统 SHALL 在每次生成简历后，刷新 `conversationContext` 使 AI 在后续对话中感知最新简历数据。

#### Scenario: 初次生成
- **WHEN** 对话信息满足必填字段要求
- **THEN** 系统生成简历预览，同时将新简历数据同步到 `conversationContext`

#### Scenario: 用户要求修改
- **WHEN** 用户提出修改意见
- **THEN** AI 更新对应字段，重新生成简历预览，并再次刷新 `conversationContext`

#### Scenario: 反复迭代
- **WHEN** 用户多次提出修改
- **THEN** 系统每次修改后刷新 context + 更新预览，AI 始终基于最新数据对话
