## ADDED Requirements

### Requirement: 默认使用 opencode 免费模型
系统 SHALL 默认通过 opencode SDK 接入免费模型（qwen/big-pickle），用户无需配置即可使用。

#### Scenario: 打开即用
- **WHEN** 用户首次打开应用
- **THEN** 系统自动使用 opencode 免费模型，无需任何配置

### Requirement: 支持模型切换
系统 SHALL 在界面中提供模型切换功能，展示可用模型列表。

#### Scenario: 切换模型
- **WHEN** 用户点击模型切换按钮
- **THEN** 系统展示模型列表供选择，切换后续对话使用新模型

### Requirement: 支持用户自填 API Key
系统 SHALL 允许高级用户输入自己的 API Key 来使用自定义模型，Key 存储在本地且不泄露。

#### Scenario: 填写 API Key
- **WHEN** 用户在设置中输入 API Key 并选择对应模型
- **THEN** 系统使用用户提供的 Key 进行对话

### Requirement: API Key 安全性
系统 SHALL 确保 API Key 仅存储在本地且不通过渲染进程暴露。

#### Scenario: Key 安全存储
- **WHEN** 用户保存 API Key
- **THEN** Key 存储在 Electron 主进程的加密存储中，渲染进程无法直接访问
