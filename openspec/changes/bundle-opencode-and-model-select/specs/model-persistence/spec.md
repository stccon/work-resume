## ADDED Requirements

### Requirement: 模型选择跨重启持久化
系统 SHALL 将用户选择的模型持久化到本地存储，应用重启后自动恢复。

#### 场景: 选择后持久化
- **WHEN** 用户在设置中选择一个新模型
- **THEN** 系统将选择写入 `electron-store`，key 为 `"currentModel"`

#### 场景: 启动时恢复
- **WHEN** 应用启动并初始化 opencode 服务
- **THEN** 系统从 `electron-store` 读取 `"currentModel"`，若存在则设置为当前模型

#### 场景: 持久化模型不可用
- **WHEN** 启动时恢复的模型不在当前可用免费模型列表中
- **THEN** 系统自动回退到默认模型 `"big-pickle"`
