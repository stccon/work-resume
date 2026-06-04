## Context

v1 探索阶段（已落地）确认了底层事实：

1. `@opencode-ai/sdk` 没有真正 stateless 的 API，但 `session.prompt` 的 body 支持 per-call `system` 字段
2. `session.create` / `session.delete` 在本地 opencode server 上很便宜
3. 可以构造"假 stateless"调用：临时 session → prompt with inline system → fire-and-forget delete

v1 也落地了：stateless `polishField` IPC、`data-*` 字段定位、neighbor context payload、AbortController 取消。但 v1 的交互（hover 浮出 ✎/✨ + inline editor + 6s Toast 撤销）在用户测试后被反馈为：

- **浮层按钮位置离字段远**——多行字段的 ✎ 浮在右上角，鼠标要"先离开字段"才能点按钮，体验割裂
- **润色结果无 diff**——6s 撤销窗内用户没机会看清"改了什么"，也没机会在采纳前微调
- **无法给 AI 方向**——固定 system prompt，用户不能表达"再简洁一点"或"突出量化"

v2 重新设计交互：**点击字段 → 中央模态框**，把"看上下文 → 编辑 → 给偏好 → 润色 → diff 对比 → 采纳/拒绝"全部塞进同一聚焦窗口。底层实现（IPC、payload、neighbor context、临时 session）完全沿用 v1。

## Goals / Non-Goals

**Goals:**

- 用户点击简历预览区任一可编辑 leaf field，弹出居中模态框
- 模态框内可：直接编辑并保存 / 调用 AI 润色（含可选偏好 prompt）/ 看到 side-by-side diff / 采纳或拒绝 / 重新润色
- AI 润色调用与现有 chat 流完全隔离（v1 已实现）
- 手动保存或采纳后，自动同步 `resumeData` 持久化 + chat 上下文（v1 已实现）
- 底层渲染器 data-* 标记、neighbor context、临时 session、AbortController 全部沿用

**Non-Goals:**

- ❌ Entry 级 / Section 级的 AI 润色（v3 再考虑）
- ❌ 单 bullet、单 tag 的细粒度编辑（v3 再考虑）
- ❌ 全局 Ctrl+Z 撤销栈
- ❌ 在模态框内编辑多个字段（一次模态框只处理一个字段）
- ❌ 修改现有「整份 AI 润色」按钮
- ❌ 重写 `renderResumeBody` 为 React 组件树
- ❌ 模态框嵌套（不允许模态框内再开模态框）

## Decisions

### 决策 1：AI 调用走"临时 session"，不复用 chat 通道

**选择**（沿用 v1）：每次 `polishField` 调用都新建一个独立 opencode session，发送一次 prompt（带 inline `system`），然后 fire-and-forget 删除。

**为什么**：
- SDK 不支持真正 stateless prompt
- 复用 `sendPrompt` 会同时踩三个雷：上下文污染、chat session 历史污染、UI 信号干扰
- 临时 session 在本地 opencode server 上延迟 < 50ms

### 决策 2：渲染器加 `data-*` 标记，事件委托定位字段

**选择**（沿用 v1）：在 `renderResumeBody` 输出的每个 leaf field DOM 节点上加 `data-section` / `data-entry` / `data-field` 三件套。`EditableResumePreview` 在外层 div 上挂 `click` 事件委托。

**为什么**：
- 改动面最小
- PDF 导出路径无需修改：`data-*` 对 `printToPDF` 完全透明
- 不需要重写 React 树

### 决策 3：用中央模态框替代 hover 浮出按钮 + inline editor + Toast 撤销

**选择**：用户**点击**字段（而非 hover 浮按钮）打开 `FieldEditorDialog` 居中模态框。模态框内含三态状态机：

- `editing`（初始）：左面板原文（参考，read-only）、右面板当前值（可编辑 textarea）、底部「给 AI 的额外偏好」输入框、动作按钮 `[✨ AI 润色] [保存] [取消]`
- `polishing`（loading）：右面板显示 spinner + "AI 思考中…"，所有按钮 disabled
- `diff`（润色完成）：左面板原文（删除词红色 strikethrough）、右面板润色结果（新增词绿底，可继续微调）、动作按钮 `[✓ 采纳] [↻ 重新润色] [✕ 拒绝]`

**为什么**：
- 解决"浮层按钮离字段远"——整字段就是触发区，无需精确瞄准小按钮
- 解决"无 diff"——左右并排 + 高亮差异，用户能看清改了什么
- 解决"无法给方向"——额外偏好输入框始终可见
- 模态框聚焦——Esc/✕/点遮罩关闭 = 主动放弃，不会"误点"；手动按 `[保存]` 或 `[✓ 采纳]` 才会写回字段
- 模态框的状态机清晰：editing ↔ polishing → diff → (采纳/拒绝/重新润色) → editing 或 关闭
- 比 v1 减少一个 UI 表面（没有 hover 浮层），更可预测

**备选**：
- (a) Side popover 锚定字段 → 排除（two-column 布局下定位难，diff 横向空间小）
- (b) 底部 drawer → 排除（移动端不友好）
- (c) 原地 inline 展开 → 排除（diff 难排版，撑高简历破坏 PDF）

### 决策 4：润色 payload 增加 `extraPrompt`

**选择**：`PolishFieldPayload` 新增 `extraPrompt?: string`。`buildPolishUserPrompt` 在 user prompt 末尾追加 `用户额外要求：${extraPrompt}`（仅当非空）。`POLISH_SYSTEM_PROMPT` 增加一条规则：「如果用户给出额外要求（如'更简洁'、'突出量化'），优先满足，但不要放宽'只输出新文本'的格式约束」。

**为什么**：
- 让用户**主动**告诉 AI 方向，比"AI 自由发挥"接受度更高
- extraPrompt 是可选的（空值时 v1 行为不变），向后兼容
- 仍走 v1 的临时 session 路径，electron 端零改动

### 决策 5：采纳 / 保存合并为同一条写回路径

**选择**：`[保存]` 和 `[✓ 采纳]` 最终都走 `onChange(patchField(data, locator, rightPaneValue))`。区别只在来源：
- `[保存]` 直接用用户编辑的右面板值
- `[✓ 采纳]` 用 AI 润色结果（可能已被用户在 diff 态手动调整过）

**为什么**：
- App 层的 `handleResumeChange` 已经是通用 patch 入口（v1 实现）
- 不需要在 App 层区分"手动保存"和"采纳"，减少分支
- Toast 撤销窗口被删除后，采纳就是写回——和手动保存语义对齐

### 决策 6：删除 Toast 撤销窗口

**选择**：v1 的「已润色 [撤销]」Toast 撤销窗口被完全删除。`PendingUndo` 类型保留定义（不再使用），`Toast.action` 渲染移除但类型保留（未来可复用）。

**为什么**：
- diff 视图本身就是 accept/reject 流程，比 6s 撤销窗更明确
- 减少 UI 表面（不再需要在 EditableResumePreview 管理 pendingUndo 状态机）
- 撤销需求被 `[✕ 拒绝]` 覆盖（拒绝后右面板回到原文，模态框回到 editing 态）

### 决策 7：Side-by-side diff 用 hybrid word/char LCS

**选择**：新增 `src/lib/text-diff.ts`，纯函数实现 hybrid diff：
- 文本先按"语言 run"切分——连续 ASCII 字母数字 / 标点作为一个 run（按词切分），连续 CJK 字符作为一个 run（按字符切分）
- 每个 run 内部做对应粒度的 token 切分
- 对 token 数组做 LCS-based diff（O(n·m)）
- 输出 `Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }>`
- 长文本（任一原文 > 200 字符）降级：跳过 diff，渲染「原文已整体修改」徽标，diff 区域直接显示润色后文本

**为什么**：
- 词级 diff 对英文/技术栈友好；字符级 diff 对中文友好——hybrid 兼顾两者
- 纯函数、易测试
- LCS 足够短文本性能 (< 500 chars 远低于 1ms)
- 200 字符降级避免长篇长文 diff 视觉噪声（中文段落 diff 容易一片绿底）

### 决策 8：模态框互斥（同一时刻只能开一个）

**选择**：`EditableResumePreview` 维护 `activeLocator` 单槽。点击新字段 → 替换 `activeLocator`，打开新模态框，旧模态框自动关闭。

**为什么**：
- 避免多模态框堆叠的视觉混乱
- 状态管理简单：单槽 + key prop 触发 React 重建
- 符合用户对"焦点窗口"的心智模型

## Risks / Trade-offs

**[Risk] diff 在长中文文本上视觉杂乱**  
→ 缓解：200 字符阈值降级为"全文已修改"徽标，diff 区域直接显示润色后文本。

**[Risk] 模态框内 textarea 自动撑高 + diff 渲染性能**  
→ 缓解：editing 态用 `auto-grow`（CSS `field-sizing: content` 或手动监听 input）；diff 态锁定高度，内部 scroll。

**[Risk] AI 偏好 prompt 与系统 prompt 冲突**  
→ 缓解：系统 prompt 中的"只输出新文本"优先级最高；extraPrompt 只影响润色方向（专业度、量化、风格），不要求 AI 输出额外说明。

**[Risk] 用户编辑后关掉模态框（未点保存）以为已生效**  
→ 缓解：模态框标题右侧显示「未保存」提示（输入后变「有未保存的修改」），关闭时给二次确认（仅当有修改时）。

**[Trade-off] 删除 Toast 撤销 = 失去「点采纳后突然后悔」的兜底**  
→ 接受：采纳前有 diff 阶段，用户已经看清楚；采纳后如后悔，只能用 `[保存]` 模式再打开字段手动改回。撤销栈是 v3 范围。

**[Trade-off] extraPrompt 不持久化（模态框关闭后清空）**  
→ 接受：v2 不维护 per-field prompt 历史，避免 UI 复杂度。per-field prompt 是 v3 范围。

## Open Questions

无（决策 1-8 已覆盖 v2 所有关键设计点；其余实现细节在 tasks.md 中分解）。
