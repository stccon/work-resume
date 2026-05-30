## Why

当前简历助手虽然骨架完整，但对小白用户的第一体验不够友好：打开应用后只看到三个静态按钮"我想找份前端工作"等，AI 全程沉默等用户先开口。用户（尤其是小白）不知道从何开始。同时，三个内容模板（通用/技术/管理）的字段差异极小，让用户选择模板反而增加了决策负担。

## What Changes

- **AI 主动发起首轮对话**：应用启动/新建对话时，AI 自动发送第一条问候消息，根据是否有已有数据决定打招呼方式（有姓名→称呼名字问候；无姓名→询问姓名并引导）
- **模板归一化**：合并三个模板为一个 unified template，包含所有字段；AI 在对话中自行推断需要填写哪些字段
- **左侧边栏精简**：移除模板列表，只保留已保存简历和设置
- **对话上下文热刷新**：每次 AI 生成简历数据后，自动刷新 `conversationContext`，让后续对话看到最新数据
- **引导文案更新**：更新欢迎引导步骤，去掉"选择模板"

## Capabilities

### New Capabilities
- `ai-first-message`: AI 主动发起首轮对话的能力，包含用户身份感知（有 profile 称呼名字、无 profile 询问名称）、模板感知（根据模板内容开场）、对话时机控制（启动/新对话/切模板时触发）

### Modified Capabilities
- `resume-templates`: 需求变更——从多模板选择改为单模板统一管理，保留模板 JSON 扩展结构
- `resume-generation`: 需求变更——移除模板选择步骤，默认使用 unified template；`conversationContext` 需在每次简历更新后热刷新
- `ai-chat`: 需求变更——增加 AI 主动发消息机制（非用户触发），同时修复 context 随 profile 更新而刷新的问题

## Impact

- 删除 `templates/technical.json` 和 `templates/management.json`（保留备份）
- 更新 `templates/general.json` 合并所有字段
- `src/App.tsx`：移除模板选择相关 state/逻辑，新增 `sendFirstMessage()` 和 `streamResponse()` 拆分
- `src/components/Sidebar.tsx`：移除模板列表
- `src/adapter/distillation.ts`：新增 `buildFirstMessagePrompt()`
- `electron/opencode.ts`：支持首消息模式，避免重复拼接"用户消息:"前缀
- `electron/preload.ts` + `electron/ipc.ts`：新增首消息 IPC 通道
- 欢迎引导页去掉"选择模板"步骤
