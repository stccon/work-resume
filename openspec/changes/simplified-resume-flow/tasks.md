## 1. 模板归一化

- [x] 1.1 合并 general.json：将 technical.json 和 management.json 的额外字段合并到 general.json 中，形成 unified template
- [x] 1.2 删除 templates/technical.json 和 templates/management.json（或移入备份目录）
- [x] 1.3 更新 `src/adapter/template-context.ts`：`templateFieldsToString` 不再需要 template 参数，默认使用 unified template 字段

## 2. 拆分流式响应逻辑

- [x] 2.1 在 `App.tsx` 中从 `handleSend` 提取 `streamResponse()`：封装流式监听、AI 调用、chunk 处理、done 回调，不涉及用户气泡渲染
- [x] 2.2 修改 `handleSend` 为调用 `showUserBubble(text)` + `streamResponse(text)`
- [x] 2.3 新增 `sendFirstMessage(prompt)`：直接调用 `streamResponse(prompt)`，无用户气泡

## 3. 首消息 IPC 通道

- [x] 3.1 修改 `electron/opencode.ts` 的 `sendPrompt`：增加 `asFirstMessage` 参数，为 true 时不拼 "用户消息:" 前缀
- [x] 3.2 在 `electron/ipc.ts` 新增 `chat:send-first-message` handler：调用 `sendPrompt(prompt, win, true)`
- [x] 3.3 在 `electron/preload.ts` 暴露 `sendFirstMessage` API

## 4. 构建首消息 prompt

- [x] 4.1 在 `src/adapter/distillation.ts` 新增 `buildFirstMessagePrompt(userProfile, templateName)`
- [x] 4.2 更新 `buildResumeContext`：移除对 template 参数的硬依赖，默认使用 unified template 字段

## 5. 触发首消息

- [ ] 5.1 在应用启动、`discoverUsers()` + `initChatContext()` 完成后，调用 `sendFirstMessage()`，根据 profile 有无选择对应 prompt
- [ ] 5.2 在 `handleSelectTemplate` 中，`initChatContext` 后触发 `sendFirstMessage()`
- [ ] 5.3 修改 `handleNewChat`：清空消息后，根据当前 profile 和模板状态触发 `sendFirstMessage()`

## 6. Context 热刷新

- [ ] 6.1 在 `App.tsx` 的 `done` chunk 处理中，`tryDetectResumeJSON` 成功后：
  - 调用 `buildResumeContext` 用最新 `sections` 重建 context
  - 调用 `window.electronAPI.setChatContext(newContext)` 刷新
- [ ] 6.2 确保刷新 context 在保存 profile 之后执行，顺序为：saveProfile → buildContext → setChatContext

## 7. 左侧边栏精简

- [ ] 7.1 移除 `Sidebar.tsx` 中的模板列表渲染（templates map 部分）
- [ ] 7.2 移除 `App.tsx` 中的 `templates` state、`activeTemplate` state、`handleSelectTemplate` 函数
- [ ] 7.3 移除 `App.tsx` 中的 `handleImportJSON` 和对应 UI（导入 JSON 按钮）
- [ ] 7.4 更新 `WelcomeGuide.tsx`：移除"选择模板"步骤，第一步改为"和 AI 对话"

## 8. 更新模板兼容性

- [ ] 8.1 在 `tryDetectResumeJSON` 中处理旧数据兼容：如果检测到的 template 是 "technical" 或 "management"，自动映射为 "general"
- [ ] 8.2 更新 `ResumePreview.tsx` 确保 unified template 的所有字段都能正确渲染

## 9. 测试

- [ ] 9.1 添加 `buildFirstMessagePrompt` 的单元测试：验证有/无 profile 时输出不同的 prompt
- [ ] 9.2 更新 `template.test.ts`：适配 unified template 的单模板结构
- [ ] 9.3 手动验证完整流程：启动 → AI 问候 → 对话 → 生成简历 → 继续对话修改 → 预览更新
