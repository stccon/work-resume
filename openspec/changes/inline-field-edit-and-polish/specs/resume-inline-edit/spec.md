## ADDED Requirements

### Requirement: 点击字段直接打开编辑模态框

系统 SHALL 在用户**点击**简历预览区任一可编辑 leaf field 时，弹出一个居中模态框 `FieldEditorDialog`，用于查看上下文、编辑、调用 AI 润色并对比 diff。模态框 SHALL 替代 v1 的"hover 浮出 ✎ 按钮 + inline editor"流程。

#### Scenario: 点击单行字段
- **WHEN** 用户点击 `personal.name` 字段
- **THEN** 模态框打开，标题显示"编辑：姓名"，左面板显示原文"张三"（参考，read-only），右面板显示当前值（可编辑）

#### Scenario: 点击多行字段
- **WHEN** 用户点击 `experience.entry0_achievements` 字段
- **WHEN** 模态框打开，标题显示"编辑：工作成就"，左面板显示原文（保留换行），右面板显示当前文本在可编辑 textarea 中（自动撑高高度）

#### Scenario: 点击多 entry section 内字段
- **WHEN** 用户点击 `experience` 第二条工作经历的字段
- **THEN** 模态框显示该 entry 的上下文（公司、职位），且任何修改只影响 `entry1_*` 字段

#### Scenario: 点击非 leaf 节点不打开模态框
- **WHEN** 用户点击 section 标题、自动派生的"日期范围"、头像区域、或纯装饰元素
- **THEN** 不打开模态框

#### Scenario: hover 字段有视觉提示
- **WHEN** 用户鼠标 hover 任一可编辑 leaf field
- **THEN** 字段显示轻微背景高亮（`bg-zinc-100/40` 等），cursor 变为 `cursor-text`，可点击的提示生效

### Requirement: 模态框内始终可手动编辑并保存

系统 SHALL 在 `FieldEditorDialog` 打开时（任何状态下），右面板的可编辑控件 SHALL 接受用户键盘输入、鼠标粘贴、文本选择操作。点击 `[保存]` SHALL 将右面板的当前值写入字段。

#### Scenario: 手动编辑 + 保存
- **WHEN** 用户在右面板把"张三"改成"李四"，点击 `[保存]`
- **THEN** 模态框关闭，字段值更新为"李四"，`updateResume` + `setChatContext` 同步触发

#### Scenario: 编辑中按 Esc 取消
- **WHEN** 用户在右面板修改了内容但未保存，按 Esc
- **THEN** 模态框关闭，字段值保持原值不变

#### Scenario: 点击遮罩 / ✕ 关闭
- **WHEN** 用户点击模态框遮罩或右上角 ✕
- **THEN** 模态框关闭，未点击 `[保存]` 的修改被丢弃

#### Scenario: 空字段保存
- **WHEN** 用户清空右面板文本（变空字符串）并点 `[保存]`
- **THEN** 字段值更新为空字符串（从 `ResumeData` 中删除该 key 的内容，但 key 仍可能存在）

### Requirement: 模态框互斥

系统 SHALL 保证同一时刻只打开一个 `FieldEditorDialog`。当用户已打开 A 字段的模态框时点击 B 字段，B 字段的模态框 SHALL 替换 A 的模态框（A 自动关闭且其未保存修改被丢弃）。

#### Scenario: 已开 A 时点击 B
- **WHEN** 用户打开 A 字段模态框，未保存修改，转而点击 B 字段
- **THEN** A 模态框关闭（修改丢弃），B 模态框打开（editing 态，B 当前值填入右面板）

### Requirement: 字段提交后定位到 resumeData

系统 SHALL 通过 `data-section` / `data-entry` / `data-field` 三件套定位到 `ResumeData.sections` 中的具体字段，使用 immutable update 模式更新。

#### Scenario: 单 entry section 字段更新
- **WHEN** 用户在模态框内保存 `personal.name` 的新值"李四"
- **THEN** `resumeData.sections.personal.name = "李四"`，其他字段不变

#### Scenario: 多 entry section 字段更新
- **WHEN** 用户在模态框内保存 `experience` 第二条 entry（`data-entry="1"`）的 `position` 字段新值
- **THEN** `resumeData.sections.experience.entry1_position` 更新，entry0 的字段及 entry1 的其他字段不变

#### Scenario: data-entry 反映原始数据 index
- **WHEN** 多 entry section 中 entry0 已被删除，剩 entry1 和 entry3 可见（visual 上是第一条、第二条）
- **THEN** 用户编辑 visual 第一条字段时，`data-entry="1"`，更新作用于 `entry1_*` 不会错误写到 `entry0_*`

### Requirement: 提交后同步持久化与 chat 上下文

系统 SHALL 在每次字段提交成功后，依次执行：
1. `setResumeData(patched)` 更新内存状态
2. `electronAPI.updateResume(id, patched, template)` 持久化到 store
3. `electronAPI.setChatContext(buildResumeContext(patched, templateName))` 同步聊天上下文

第 3 步失败 SHALL NOT 阻塞前两步，但 SHALL 写入日志。

#### Scenario: 持久化失败处理
- **WHEN** `updateResume` IPC 调用失败
- **THEN** 字段值已在内存中更新，toast 看到"保存失败"提示，日志记录错误

#### Scenario: chat 上下文同步失败不阻塞
- **WHEN** `setChatContext` 调用抛错
- **THEN** 字段仍显示新值且数据已持久化，仅 console / 日志记录错误，不打断用户

### Requirement: 不允许编辑头像字段

系统 SHALL NOT 让 `personal.avatar` 字段出现任何可点击的 hover 提示，也不允许通过模态框编辑头像数据。头像编辑入口保持现有的"头像胶囊"（`ResumeNamePill`）。

#### Scenario: hover 头像区域无视觉提示
- **WHEN** 用户鼠标移到简历预览区中的头像
- **THEN** 头像无背景高亮，cursor 不变化，点击不打开模态框
