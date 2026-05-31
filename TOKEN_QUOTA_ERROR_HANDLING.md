# Token 配额不足错误处理功能改进

## 概述

当用户 token 额度用完后，系统现在会立即弹出友好的错误提示，而不是让页面一直卡住等待响应超时。

## 修改的文件

### 1. `electron/opencode.ts`

#### 添加的常量 (第 323-334 行)
```typescript
const QUOTA_ERROR_PATTERNS = [
  /insufficient balance/i,
  /insufficient credit/i,
  /quota exceeded/i,
  /quota limit/i,
  /payment required/i,
  /out of tokens/i,
  /balance not enough/i,
  /credit.*not.*available/i,
  /subscription.*expired/i,
  /expired account/i
]
```

这些正则表达式会匹配 opencode API 返回的所有与配额/余额不足相关的错误消息。

#### 改进的 `sendPrompt` 函数 (第 275-290 行)
```typescript
if (result.error) {
  const errorMsg = JSON.stringify(result.error)
  const isQuotaError = QUOTA_ERROR_PATTERNS.some(pattern => pattern.test(errorMsg))
  if (isQuotaError) {
    throw new Error("TOKEN_QUOTA_EXCEEDED: token 配额不足，请充值后重试")
  }
  throw new Error(errorMsg)
}
```

现在系统会在发送错误前检测是否是配额问题，如果是则抛出一个带有特殊标记的错误消息。

### 2. `electron/ipc.ts`

#### 改进的 IPC 处理器 (第 74-91 行)
```typescript
ipcMain.handle("chat:send", async (event, text: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  try {
    const result = await sendPrompt(text, win)
    return { content: result.content, error: null, isQuotaError: false }
  } catch (err: any) {
    console.error("chat:send error:", err)
    const isQuotaError = err.message?.includes('TOKEN_QUOTA_EXCEEDED')
    return {
      content: `（错误）${err.message || String(err)}`,
      error: null,
      isQuotaError
    }
  }
})
```

IPC 处理器现在会捕获错误并标记是否是配额错误，以便渲染进程处理。

### 3. `electron/preload.ts`

#### 更新的类型声明 (第 4-5 行)
```typescript
sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text) as Promise<{ content: string; error: any; isQuotaError: boolean }>,
sendFirstMessage: (prompt: string) => ipcRenderer.invoke("chat:send-first-message", prompt) as Promise<{ content: string; error: any; isQuotaError: boolean }>,
```

preload 脚本现在会传输包含 error 和 isQuotaError 字段的结果。

### 4. `src/env.d.ts`

#### 更新 SendMessageResult 类型 (第 3-5 行)
```typescript
interface SendMessageResult {
  content: string
  error: any
  isQuotaError: boolean
}
```

定义了正确的 TypeScript 接口以支持新的返回结构。

### 5. `src/components/Toast.tsx`

#### 改进的 toast 函数签名 (第 7-17 行)
```typescript
interface ToastData {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function toast(type: ToastType, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) {
  addToastFn?.({ type, message, ...options })
}
```

增强了 toast 组件以支持可选的 duration 和 action 参数。

### 6. `src/App.tsx`

#### 改进的错误处理 (第 254-285 行)
```typescript
try {
  let response: { content: string; error: any; isQuotaError: boolean }
  if (isFirstMessage) {
    response = await window.electronAPI.sendFirstMessage(text)
  } else {
    response = await window.electronAPI.sendMessage(text)
  }

  if (response.isQuotaError) {
    toast("error", "Token 配额不足，请充值后重试", {
      duration: 5000,
      action: {
        label: "去充值",
        onClick: () => {
          window.open("https://opencode.ai", "_blank")
        }
      }
    })
    setStreamingContent("")
    setLoading(false)
  }
} catch (err: any) {
  window.electronAPI.removeChatListeners()
  if (err?.message?.includes('TOKEN_QUOTA_EXCEEDED')) {
    toast("error", "Token 配额不足，请充值后重试", {
      duration: 5000,
      action: {
        label: "去充值",
        onClick: () => {
          window.open("https://opencode.ai", "_blank")
        }
      }
    })
  } else {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `抱歉，出错了：${err}` },
    ])
  }
  setStreamingContent("")
  setLoading(false)
}
```

现在会特殊处理配额错误，显示友好的提示并提供充值按钮。

## 功能特性

1. **自动错误检测**: 检测 opencode API 返回的所有相关错误消息格式
2. **友好展示**: 显示清晰的用户提示而不是技术错误信息
3. **快捷操作**: 提供去充值的快速按钮，直接跳转到充值页面
4. **时长控制**: 错误提示会在 5 秒后自动消失
5. **一致性**: 正常错误和应用错误使用统一的错误展示方式

## 测试建议

1. **配额不足场景**:
   - 找一个免费额度已用完的账号
   - 尝试发送消息
   - 应该立即看到 "Token 配额不足，请充值后重试" 的提示
   - 提示应包含一个 "去充值" 按钮

2. **其他错误场景**:
   - 网络连接错误
   - API 服务故障
   - 其他技术错误
   - 应该显示通用的错误提示

3. **正常功能**:
   - 额度充足时消息应该正常发送
   - 没有错误提示
   - 所有功能正常工作

## 构建和部署

项目已通过类型检查和构建测试：
```bash
npm run typecheck  # 通过
npm run build      # 成功构建
```

可以在开发环境或生产环境中使用这些改进。
