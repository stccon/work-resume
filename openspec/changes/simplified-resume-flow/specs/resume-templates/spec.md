## MODIFIED Requirements

### Requirement: 系统预置多个简历模板
系统 SHALL 统一使用一个结构化简历模板 JSON，包含所有常见简历字段，不再要求用户选择内容模板。

#### Scenario: 查看预置模板
- **WHEN** 用户打开应用
- **THEN** 系统不使用内容模板选择 UI，AI 基于统一模板的所有字段自行判断填写哪些

### Requirement: 模板定义字段结构
统一模板 SHALL 定义所有可能的简历字段（姓名、工作经历、教育背景、技能、证书等），AI 在对话中根据用户背景自行选择填充。

#### Scenario: 模板驱动对话
- **WHEN** 用户开始对话
- **THEN** 系统将统一模板的全部字段注入 AI 上下文，AI 据此主动收集信息

### Requirement: 模板可扩展
系统 SHALL 保留模板 JSON 的扩展接口，后续可通过修改 `general.json` 增加字段而不影响核心逻辑。

#### Scenario: 新增字段
- **WHEN** 开发者在 `templates/general.json` 添加新 section 或 field
- **THEN** 系统自动将其加入 AI 上下文，无需修改代码

## REMOVED Requirements

### Requirement: 系统预置至少 3 个不同风格的简历模板
**Reason**: 三个内容模板（通用/技术/管理）字段差异极小，合并为一个统一模板能消除用户决策负担

**Migration**: 统一使用 `general.json` 作为主模板；technical.json 和 management.json 的字段已合并到 general.json；React 视觉组件层（`TechnicalResume.tsx`、`ManagementResume.tsx`）保留供后续样式切换使用

### Requirement: 新增模板需同时提供 JSON + React 组件
**Reason**: 内容模板合并后不再需要新增 JSON 模板，未来新增的是视觉样式组件而非内容字段

**Migration**: 新增视觉样式只需注册 React 组件，不需创建 JSON 文件
