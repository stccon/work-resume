# Tasks: inline-field-edit-and-polish (v2 — dialog-based)

> 实施 v2 改造：把 v1 的"hover 浮出 ✎/✨ + inline editor + Toast 撤销"重塑为"点击字段 → 中央模态框 + diff 视图 + 偏好 prompt"。v1 的底层实现（stateless IPC、data-* 标记、neighbor context、AbortController）全部沿用，不重新实现。

## 1. 底层库函数（沿用 v1，v2 仅扩展 payload）

- [ ] 1.1 在 `src/types/inline-edit.ts` 的 `PolishFieldPayload` 增加 `extraPrompt?: string`
- [ ] 1.2 `src/lib/field-context.ts` 的 `buildPolishPayload` 接受 `extraPrompt` 参数并填入 payload
- [ ] 1.3 `src/adapter/polish.ts` 的 `buildPolishUserPrompt` 拼接 `用户额外要求：${extraPrompt}` 到 user prompt（仅非空时）
- [ ] 1.4 `src/adapter/polish.ts` 的 `POLISH_SYSTEM_PROMPT` 增加一条规则：「如果用户给出额外要求，优先满足，但不放宽"只输出新文本"的格式约束」
- [ ] 1.5 单元测试更新 `src/__tests__/polish.test.ts`：覆盖 `extraPrompt` 拼接行为
- [ ] 1.6 单元测试更新 `src/__tests__/field-context.test.ts`：覆盖 `buildPolishPayload({extraPrompt})` 行为

## 2. text-diff 工具

- [ ] 2.1 新增 `src/lib/text-diff.ts`：
  - 导出 `tokenize(text: string): string[]`：按 hybrid 规则切分 token
    - 连续 ASCII 字母/数字/下划线 = 1 token
    - 连续 ASCII 标点 = 1 token
    - 单个空白 = 1 token
    - 单个 CJK 字符 = 1 token
  - 导出 `diffTokens(a: string[], b: string[]): Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }>`：LCS-based diff
  - 导出 `diffText(a: string, b: string)`：组合 `tokenize + diffTokens`，并合并连续相同 type 的片段
  - 导出 `DIFF_MAX_LENGTH = 200` 阈值
- [ ] 2.2 `src/__tests__/text-diff.test.ts`：
  - 英文短句 diff
  - 中文短句 diff
  - 混合 CJK + 英文 diff
  - 空字符串 diff
  - 相同字符串 diff
  - 全替换 / 全删除 / 全新增
  - 长文本（> 200 字符）不调用 diff，调用方应自行判断（导出常量供调用方使用）

## 3. FieldEditorDialog 组件

- [ ] 3.1 新增 `src/components/FieldEditorDialog.tsx`：
  - Props: `{ open, locator, data, template, targetRole, onClose, onCommit }`
  - 三态状态机 `state: 'editing' | 'polishing' | 'diff'`
  - 居中模态框 + 遮罩；Esc / 遮罩点击 / ✕ 关闭（带"未保存"二次确认）
  - 标题栏：字段名 + 上下文（sectionLabel · entryNeighbors?）
  - 主体：左右并排双面板（`grid grid-cols-2`），左原文（read-only）、右可编辑 textarea
  - 偏好输入框：「给 AI 的额外偏好（可选）」始终可见
  - 动作按钮按 state 切换
- [ ] 3.2 editing 态：
  - 动作栏：`[✨ AI 润色] [保存] [取消]`
  - 右面板 `<textarea>`，auto-grow 高度
  - 偏好输入框可聚焦
- [ ] 3.3 polishing 态：
  - 右面板替换为 spinner + "AI 思考中…" 文字
  - 所有按钮 disabled
  - Esc / ✕ 可调用 `onCancelPolish` 取消 in-flight 请求
- [ ] 3.4 diff 态：
  - 左面板渲染原文（删除词红色 strikethrough，来自 `diffText(originalValue, polishedValue)` 中 type='removed' 的片段）
  - 右面板渲染润色结果（新增词绿底），仍可编辑（用 textarea 覆盖在渲染层之上）
  - 长文本（任一 > 200 字符）降级：左面板原文无高亮，右面板直接显示润色后文本
  - 动作栏：`[✓ 采纳] [↻ 重新润色] [✕ 拒绝]`
  - 偏好输入框可编辑（用户可改后点 [↻ 重新润色]）
- [ ] 3.5 采纳 / 保存调用 `onCommit(newValue)`，由父组件负责 patchField + onChange
- [ ] 3.6 重新润色：调 `electronAPI.polishField`，payload 用当前偏好 + 当前右面板值（不是原文），响应后回到 diff 态
- [ ] 3.7 拒绝：state → editing，右面板恢复为 `originalValue`（来自 `data`）
- [ ] 3.8 错误处理：catch 后回到 editing 态，toast 错误，字段值不变

## 4. EditableResumePreview 重构

- [ ] 4.1 删除 v1 的 hover 浮层 ✎/✨ 按钮
- [ ] 4.2 删除 v1 的 inline editor（absolutely-positioned textarea）
- [ ] 4.3 删除 v1 的 loading 覆盖层
- [ ] 4.4 删除 v1 的 `pendingUndo` 状态机 + 撤销窗口超时 effect
- [ ] 4.5 删除 v1 的 `activeRequestIdRef` polish cancel
- [ ] 4.6 保留 click 事件委托：点击 `data-section`/`data-field` 节点 → 设置 `activeLocator` → 打开 `FieldEditorDialog`
- [ ] 4.7 hover 字段时仅添加 className（`bg-zinc-100/40 dark:bg-zinc-800/40`）作为视觉提示
- [ ] 4.8 hover 字段时 cursor 变 `cursor-text`
- [ ] 4.9 维护 `activeLocator` 单槽：点击新字段 → 替换 activeLocator → 模态框重新打开
- [ ] 4.10 data 变化（resume 切换）时清空 `activeLocator`
- [ ] 4.11 `onChange` 透传给 `FieldEditorDialog` 的 `onCommit` → 调 `patchField` + 父组件 `onChange`

## 5. Toast 清理

- [ ] 5.1 `src/components/Toast.tsx`：移除 `action` 按钮的渲染逻辑（保留 `action` 字段在 ToastData 类型定义中，以便未来复用）

## 6. 验证

- [ ] 6.1 `npm run typecheck` 通过
- [ ] 6.2 `npm test` 全部通过
- [ ] 6.3 `openspec validate inline-field-edit-and-polish --strict` 通过

## 7. 手动验证（不需自动化，但需跑通）

- [ ] 7.1 点击 personal.name → 模态框打开，编辑保存 → 字段更新
- [ ] 7.2 点击 summary → 润色 → diff 展示 → 采纳 → 字段更新
- [ ] 7.3 模态框内修改偏好 → 重新润色 → 偏好生效
- [ ] 7.4 模态框按 Esc → 关闭，原值不变
- [ ] 7.5 模态框点遮罩 → 关闭
- [ ] 7.6 已开 A 模态框点 B → 切换到 B，A 关闭
- [ ] 7.7 切换简历 → 模态框关闭
- [ ] 7.8 头像不显示 hover 提示
- [ ] 7.9 导出 PDF 仍正常（data-* 不影响视觉）
- [ ] 7.10 整份 AI 润色按钮行为不变
