## ADDED Requirements

### Requirement: 实时获取免费模型列表
系统 SHALL 通过 opencode SDK 的 `client.config.providers()` 接口获取所有可用模型，并筛选出免费模型（input/output cost 均为 0）展示给用户。

#### 场景: 获取免费模型列表
- **WHEN** 应用启动后或用户打开设置面板
- **THEN** 系统调用 `config.providers()` 获取模型列表，筛选 `provider.id === "opencode"` 且 `cost.input === 0 && cost.output === 0` 的模型

#### 场景: API 失败时提供 fallback
- **WHEN** `config.providers()` 调用失败（服务未就绪、网络错误等）
- **THEN** 系统返回 fallback 列表 `["big-pickle"]`，确保模型选择器可用

### Requirement: 模型列表不含付费模型
模型列表 SHALL 仅展示免费模型，不展示需付费的模型。

#### 场景: 列表不含付费模型
- **WHEN** `config.providers()` 返回包含付费模型的数据
- **THEN** 仅 `cost.input === 0` 且 `cost.output === 0` 的模型出现在列表中

### Requirement: 移除硬编码模型列表
前端 SHALL 不再硬编码模型列表，改为从主进程动态获取。

#### 场景: 前端动态获取
- **WHEN** 前端组件初始化
- **THEN** 调用 `window.electronAPI.getModels()` 获取模型列表，而非使用硬编码数组
