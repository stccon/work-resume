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

### Requirement: AI 主动识别用户身份
系统 SHALL 在对话开始时主动识别当前为谁制作简历，并加载对应的用户数据。

#### Scenario: 首次使用
- **WHEN** 用户首次打开应用且 userdata/ 目录为空
- **THEN** AI 主动提问"你想帮谁做简历？"，用户回答后创建对应用户目录

#### Scenario: 已有用户
- **WHEN** userdata/ 目录存在已有用户
- **THEN** AI 列出已有用户让用户选择确认，或切换到新用户

#### Scenario: 帮别人做简历
- **WHEN** 用户回答"帮李四做"
- **THEN** 系统创建/切换到 userdata/李四/ 目录，后续对话基于李四的数据

### Requirement: 对话信息持久化
系统 SHALL 在每次对话中将提炼后的简历关键信息保存到用户数据目录，下次对话可自动加载。

#### Scenario: 对话结束保存
- **WHEN** AI 确认信息已足够或用户主动结束
- **THEN** LLM 从对话中提炼结构化简历信息，合并更新到 userdata/{user}/profile.json

#### Scenario: 下次对话加载
- **WHEN** 用户开始新对话（已有 profile.json）
- **THEN** 系统将 profile.json 的结构化摘要加入 AI 上下文，AI 基于已有信息继续

#### Scenario: 不保存无关对话
- **WHEN** 用户闲聊（非简历相关内容）
- **THEN** 系统不将其写入 profile.json，仅保留在对话记录中

### Requirement: 迭代对话循环
系统 SHALL 支持多次迭代优化：生成简历后用户可继续提出修改，AI 据此更新简历。

#### Scenario: 用户要求修改
- **WHEN** 简历已生成但用户要求修改
- **THEN** AI 根据用户反馈调整对应字段，重新生成简历预览

#### Scenario: 反复优化
- **WHEN** 用户多次提出修改意见
- **THEN** 系统保持对话上下文，每次迭代更新简历并持久化到 profile.json
