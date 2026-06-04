## Why

当前简历交互有两个明显痛点：

1. **没有手动改单个字段的方法**——用户想把"张三"改成"李四"，必须在聊天里说一句话，让 AI 重新生成整份 JSON 并替换 `resumeData`。一次小修改的代价是一整轮 AI 调用 + 大量 token，且 AI 偶尔会"顺手"改其他字段。
2. **AI 润色粒度太大**——现有「AI 润色」按钮把整份简历喂给 AI，无法只润色某一句话或某一段工作经历。而且这个按钮只在 PDF 导入流程里出现，普通用户基本看不到。

需求 3 明确提出两个能力：点击字段直接修改、鼠标移到简历上显示 AI 润色按钮。本变更**已经实现了底层管线**（stateless AI 调用、data-* 定位、邻居上下文）后，发现第一版 hover 浮出 ✎/✨ 的 UX 存在两个问题：

- 浮层按钮位置离字段远（特别是多行字段，浮层固定在右上角），鼠标需要"先离开字段才能点按钮"，体验割裂；
- 润色结果静默替换后只有 6 秒的 Toast 撤销窗口，用户没有机会对比"改了什么"、没有机会在采纳前微调、也没有机会给 AI 一个方向性 prompt（"再简短一点"、"突出量化"）。

这次 v2 改造把交互重塑为「**点击字段 → 中央模态框**」，把"看上下文 → 编辑 → 给偏好 → 润色 → diff 对比 → 采纳/拒绝"全部塞进同一个聚焦窗口；prompt 输入框始终可见，让用户**主动**告诉 AI 方向，而不是被动接受。

## What Changes

- **点击字段直接打开 `FieldEditorDialog` 模态框**：点击 `data-section`/`data-field` 节点触发，居中显示。模态框内含"原文参考"和"当前内容（可编辑）"两个并排面板。点击空白 / Esc / ✕ 关闭模态框（不保存）。
- **模态框内始终可见「给 AI 的额外偏好」输入框**：placeholder 为「可选：更简洁、突出量化、英文翻译…」。空值时 AI 仍按默认规则润色；非空时拼到 user prompt 后发送给 AI。
- **模态框内 `[✨ AI 润色]` 按钮**：触发后右侧面板进入 spinner loading，调 `ai:polish-field` IPC，响应到达后切换到"diff 状态"——左面板保持原文（标红删除的词）、右面板高亮新增/修改的词（绿底），三个动作按钮 `[✓ 采纳] [↻ 重新润色] [✕ 拒绝]`。
- **采纳 / 保存路径合并**：手动点 `[保存]` = 直接把右面板值写入字段；点 `[✓ 采纳]` = 同样把右面板值写入字段（只是来源是 AI 润色），后续都走 `updateResume` + `setChatContext` 同步。
- **删除 v1 的 hover 浮出 ✎/✨ 按钮**：hover 字段仅显示轻微背景高亮 + cursor:text 提示可点击。
- **删除 v1 的 Toast 撤销窗口**：diff 视图本身的「拒绝」按钮即覆盖了「保留原文」语义，冗余。
- **保留现有「整份 AI 润色」按钮不动**：仍只在 PDF 导入流程后可见，不与字段级润色共享状态。
- **保留 v1 全部底层实现**：`polishField` stateless IPC、data-* 标记、neighbor context、AbortController 取消、payload 清理、临时 session，全部复用。

## Capabilities

### New Capabilities
- `resume-inline-edit`: 简历预览区中通过点击字段打开模态框进行编辑的能力，包含字段定位、模态框渲染、手动保存、上下文同步
- `resume-field-polish`: 在模态框内对单个字段调用 AI 润色（含可选 prompt），生成 side-by-side diff 并支持采纳/拒绝/重新润色的能力

### Modified Capabilities
- 无（现有 `openspec/specs/` 下的 capabilities 不涉及字段级编辑或字段级润色，且本次保留旧的整份润色行为）

## Impact

**新增代码**
- `src/components/FieldEditorDialog.tsx`：中央模态框组件，含三态状态机（editing / polishing / diff），并排双面板、额外偏好输入、动作按钮
- `src/lib/text-diff.ts`：纯函数，hybrid word/char 级 LCS diff（ASCII 词级、CJK 字符级），返回 `Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }>`
- `src/__tests__/text-diff.test.ts`：diff 单元测试
- 更新 `src/__tests__/polish.test.ts` 和 `field-context.test.ts`：覆盖 `extraPrompt` payload 字段

**修改代码**
- `src/components/EditableResumePreview.tsx`：删掉 hover 浮出 ✎/✨ 按钮、删掉 inline editor、删掉 loading 覆盖层、删掉 pending undo 状态机；改为 click 委托打开 `FieldEditorDialog`；hover 时仅做 cursor + 背景高亮
- `src/types/inline-edit.ts`：`PolishFieldPayload` 增加 `extraPrompt?: string`
- `src/lib/field-context.ts`：`buildPolishPayload` 接受 `extraPrompt` 参数并填入 payload
- `src/adapter/polish.ts`：`buildPolishUserPrompt` 拼接 `用户额外要求：${extraPrompt}` 到 user prompt；`POLISH_SYSTEM_PROMPT` 增加一条「如果用户给出额外要求则优先满足」规则
- `src/components/Toast.tsx`：移除不再使用的 `action` 按钮渲染（保留类型定义以便未来复用）

**不修改**
- 任何 electron 端文件（`opencode.ts` / `ipc.ts` / `preload.ts` 全部沿用 v1 实现）
- `src/lib/resume-renderer.ts`（v1 的 data-* 标记已经覆盖所有 leaf field，无需调整）
- `src/lib/field-locator.ts`（`getFieldFromElement` / `patchField` / `readField` 沿用）
- `src/App.tsx` 中 `handleResumeChange`（模态框提交后照旧调用 onChange → App 层处理持久化 + 上下文同步）
- 现有「整份 AI 润色」按钮 `handleRefineResume`
- 视觉主题系统

**外部依赖**
- 无新增依赖；复用 v1 已安装的 `@opencode-ai/sdk` 和 `lucide-react`

**风险**
- **diff 在长中文文本上视觉杂乱**：通过 200 字符阈值降级为"全文已修改"徽标缓解
- **模态框内 textarea 自动撑高 + diff 渲染性能**：使用 `auto-grow` 仅在 editing 态；diff 态锁定高度 + 虚拟 scroll
- **用户打开字段 A 模态框后点字段 B**：自动关闭 A 打开 B（不允许同时开两个）
- **AI 偏好 prompt 与系统 prompt 冲突**：系统 prompt 中的"只输出新文本"优先级最高，extraPrompt 只影响润色方向，不放宽格式约束
