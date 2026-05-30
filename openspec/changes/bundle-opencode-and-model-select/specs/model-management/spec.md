## MODIFIED Requirements

### Requirement: 支持模型切换
系统 SHALL 在界面中提供模型切换功能，展示可用模型列表。可用模型列表 SHALL 从 opencode 服务器动态获取，而非硬编码。

#### 场景: 切换模型
- **WHEN** 用户点击模型切换按钮
- **THEN** 系统展示从服务器获取的免费模型列表供选择，切换后 `setModel()` 实际存储模型，后续对话使用新模型

### Requirement: 模型选择实际生效
系统 SHALL 确保用户选择的模型在后续 AI 对话中真实生效。

#### 场景: 切换后对话使用新模型
- **WHEN** 用户切换到模型 A，然后发送一条消息
- **THEN** `sendPrompt()` 的 `modelID` 参数为模型 A，而非硬编码的 `"big-pickle"`

#### 场景: 发送消息时使用当前模型
- **WHEN** 用户发送消息
- **THEN** `session.prompt()` 调用中的 `model` 字段使用 `currentModel` 变量

## REMOVED Requirements

### Requirement: 默认使用 opencode 免费模型
**Reason**: 行为未移除，但改为从 `client.config.providers()` 动态发现免费模型，不再默认指定具体模型名。`model-management` spec 由 `resume-ai-assistant` 变更迁移至此。
**Migration**: `getModels()` 的默认行为改为动态获取，fallback 为 `["big-pickle"]`。
