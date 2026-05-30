## ADDED Requirements

### Requirement: 应用自包含 opencode CLI 二进制
应用 SHALL 将 opencode CLI 原生二进制打包到分发包中，用户无需额外安装即可启动 AI 对话功能。

#### 场景: 安装后直接使用
- **WHEN** 用户安装并首次启动应用
- **THEN** 应用自动使用内嵌的 opencode 二进制启动服务，无需用户手动安装 opencode

### Requirement: 二进制路径自适应
系统 SHALL 在开发环境和生产环境中使用正确的二进制路径。

#### 场景: 生产环境使用 bundled 二进制
- **WHEN** 应用处于生产模式（`app.isPackaged === true`）
- **THEN** 从 `process.resourcesPath/opencode-ai/bin/{opencode}` 查找并启动二进制

#### 场景: 开发环境使用 node_modules
- **WHEN** 应用处于开发模式（`app.isPackaged === false`）
- **THEN** 从 `node_modules/opencode-ai/bin/{opencode}` 查找并启动二进制

#### 场景: 二进制不存在时优雅降级
- **WHEN** 内嵌二进制路径不存在
- **THEN** 回退到系统 PATH 查找 `opencode` 命令，并显示日志警告
