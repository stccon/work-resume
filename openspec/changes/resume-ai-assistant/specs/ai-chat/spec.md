## ADDED Requirements

### Requirement: 用户可以和 AI 进行对话
系统 SHALL 提供聊天界面，用户输入文本后 AI 以流式方式返回回复。

#### Scenario: 用户发送消息
- **WHEN** 用户在输入框输入文本并发送
- **THEN** 系统将消息发送给 LLM，并以流式方式逐步显示 AI 回复

### Requirement: AI 展示思考过程
系统 SHALL 在 AI 回复前或回复中展示 LLM 的思考/推理过程，与最终回答分开渲染。

#### Scenario: AI 思考后回复
- **WHEN** AI 正在生成回复
- **THEN** 聊天界面同时显示"思考中"状态和思考内容

#### Scenario: 思考过程可折叠
- **WHEN** 用户点击思考区域
- **THEN** 思考过程可折叠/展开，默认展开

### Requirement: 左侧目录树
系统 SHALL 在主窗口左侧显示目录结构，包含模板列表和用户文件。

#### Scenario: 显示模板列表
- **WHEN** 应用启动
- **THEN** 左侧面板显示预置模板列表

### Requirement: 对话历史管理
系统 SHALL 保存对话历史，支持清空和重新开始。

#### Scenario: 清空对话
- **WHEN** 用户点击"新建对话"
- **THEN** 系统清空当前对话历史并开始新会话
