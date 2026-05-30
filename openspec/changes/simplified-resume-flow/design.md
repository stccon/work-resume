## Context

当前简历助手要求用户在对话前先选择内容模板（通用/技术/管理），且 AI 全程沉默等用户先开口。这两个问题对小白用户尤其不友好。同时，生成的简历数据更新后，`conversationContext` 未同步刷新，导致后续对话 AI 看不到最新状态。

本设计解决三个问题：模板归一化、AI 首轮主动对话、context 热刷新。

## Goals / Non-Goals

**Goals:**
- 用户打开应用即可对话，无需做任何选择，AI 主动问候引导
- 统一模板 JSON 覆盖所有简历字段，AI 在对话中自行推断
- 每次 AI 生成简历数据后，自动刷新 context 让下一轮对话感知最新状态
- 新建对话同样触发 AI 首轮消息
- 保留多模板 React 组件渲染能力（视觉模板仍可切换）

**Non-Goals:**
- 不改变 PDF 导出逻辑
- 不改变用户数据持久化方案
- 不引入新的第三方依赖
- 不改变多用户架构（`userdata/{user}/` 保持不变）
- 不删除技术/管理模板的 React 视觉组件（仅移除 JSON 模板选择入口）

## Decisions

### 1. 模板归一化策略

将 `general.json` 作为 unified template，合并三个模板的所有字段。AI 在 system prompt 中被告知所有可用字段，根据对话自行判断填写哪些。

```
templates/
├── general.json          ← 合并后的 unified template（主模板）
├── technical.json        ← 删除（字段已合并到 general.json）
├── management.json       ← 删除（字段已合并到 general.json）
└── technical_resume.json ← 示例数据，保留或删除
```

合并后的统一模板字段包含：
- personal: `name, email, phone, title, github`（选填）
- summary: `summary`
- skills: `languages, frameworks, databases, cloud`（等通用字段，AI 自行决定粒度）
- experience: `company, position, startDate, endDate, achievements, techStack, projects, teamSize, responsibilities`
- education: `school, major, degree, gradYear`
- certifications（选填）

**为什么不是给 AI 全部三个模板让它在回复中选一个？** 三个模板有大量重复字段，让 AI 判断"用什么模板"反而增加了推理不确定性。统一到一个模板更简单，对 AI 来说只是"有些字段可选填"。

### 2. AI 首轮消息——拆分流式逻辑

核心变更：将 `handleSend` 中的"追加用户气泡 + 调 API + 流式渲染"拆分为两个函数：

```
handleSend(text)         = showUserBubble(text) + streamResponse(text)
sendFirstMessage(prompt) = streamResponse(prompt)       // 不显示用户气泡
```

`streamResponse` 封装当前的流式监听、AI 调用、chunk 处理、done 回调逻辑，与当前保持一致。

首轮消息的 prompt 有三种形态：

| 场景 | prompt 内容 |
|---|---|
| 无 profile | "这是你和用户的第一次对话。请主动打招呼、询问名字，自然地开始收集简历信息。不要输出 JSON。" |
| 已有 profile | "用户已有以下信息：{profile}。请用名字称呼他，问候他，询问是否需要继续完善。" |
| 切模板/新对话 | 同上，根据 profile 是否存在选择对应 prompt |

### 3. 首消息的 IPC 处理

当前 `sendPrompt` 每次在 `conversationContext` 后拼接 `用户消息: {text}`。首消息不需要这个前缀。

方案：在 `sendPrompt` 加一个 `asFirstMessage` 参数。为 `true` 时，发送的文本为：
```
{conversationContext}

{firstMessagePrompt}
```
而不是：
```
{conversationContext}

用户消息: {text}
```

这样 AI 看到的是「系统背景 + 开场指令」，而非「系统背景 + 用户说了xxx」。

### 4. Context 热刷新时机

在 `tryDetectResumeJSON` 成功检测到简历 JSON 并保存 profile 后，立即刷新 `conversationContext`：

```
AI 回复 → tryDetectResumeJSON(content) 检测到 JSON
    → saveProfile(currentUser, finalJson)        ← 已有
    → buildResumeContext(finalJson, ...)          ← 用最新数据重建 context
    → setChatContext(newContext)                  ← 新增
```

### 5. 左侧边栏精简

移除模板列表 `templates.map(...)` 部分。只保留：
- "保存的简历" 列表（已有）
- "设置" 按钮（已有）

同时删除 `templates` prop、`activeTemplate` state、`handleSelectTemplate` 等相关逻辑。

### 6. 视觉模板（React 组件层）保留

`src/templates/GeneralResume.tsx`、`TechnicalResume.tsx`、`ManagementResume.tsx` 这些 React 组件**不删除**。它们只是纯粹的 PDF 视觉渲染组件。

未来如果用户想切换"样式模板"（布局/配色风格），可以通过 `preferences.json` 选择用哪个 React 组件渲染。当前默认使用 GeneralResume。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 统一模板字段太多，AI 不知道该问哪些 | system prompt 明确要求"根据对话内容推断，不要逐字段机械提问" |
| 首消息增加一次 API 调用延迟 | 流式渲染让等待感可接受；首消息 prompt 很短（<200 token），耗时可忽略 |
| 已有用户数据在 general.json 合并后部分字段名称变了（如 skills.languages → skills.skills） | 现有 `ResumePreview.tsx` 和 `ResumeData` 类型已经是通用的 `Record<string, Record<string, string>>`，字段名变更不影响渲染 |
| 删除 technical/management JSON 后，已有保存的简历引用 `template: "technical"` 无法渲染 | `tryDetectResumeJSON` 检测到模板名时，统一映射为 `"general"`；或保留旧 JSON 文件但不在 UI 中展示 |
