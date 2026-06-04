import { spawn, ChildProcess } from "child_process"
import { app, BrowserWindow } from "electron"
import fs from "fs"
import path from "path"
import { log } from "./logger"

let serverProcess: ChildProcess | null = null
let serverUrl: string | null = null
let client: any = null
let sessionId: string | null = null
let currentModel = "big-pickle"

function getBinaryPath(): string {
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode"

  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, "opencode-ai", "bin", binaryName)
    if (fs.existsSync(p)) return p
    console.warn("Bundled opencode binary not found at", p, "falling back to PATH")
  }

  const devPath = path.join(__dirname, "..", "node_modules", "opencode-ai", "bin", binaryName)
  if (fs.existsSync(devPath)) return devPath

  const cwdPath = path.join(process.cwd(), "node_modules", "opencode-ai", "bin", binaryName)
  if (fs.existsSync(cwdPath)) return cwdPath

  return binaryName
}

export function getServerUrl(): string | null {
  return serverUrl
}

export function isConnected(): boolean {
  return serverUrl !== null
}

const LISTEN_RE = /opencode server listening on\s+(https?:\/\/[^\s]+)/

function spawnServer(): Promise<string> {
  const cmd = getBinaryPath()
  log("server", "spawning:", cmd, "serve")

  serverProcess = spawn(cmd, ["serve"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: process.env,
  })
  const proc = serverProcess

  return new Promise((resolve, reject) => {
    let output = ""
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill()
        reject(new Error(`启动超时（20秒）\n${output.slice(-500)}`))
      }
    }, 20000)

    function onData(data: Buffer) {
      output += data.toString()
      const m = LISTEN_RE.exec(output)
      if (m && !resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve(m[1].replace(/\/+$/, ""))
      }
    }

    proc.stdout?.on("data", onData)
    proc.stderr?.on("data", onData)

    proc.on("error", (err) => {
      if (!resolved) {
        clearTimeout(timeout)
        reject(err)
      }
    })

    proc.on("exit", (code) => {
      if (!resolved) {
        clearTimeout(timeout)
        reject(new Error(`进程已退出 (code ${code})\n${output.slice(-500)}`))
      }
    })
  })
}

export async function startOpencode(): Promise<void> {
  if (serverProcess) return

  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = await spawnServer()
      serverUrl = url
      log("server", "opencode server ready at", serverUrl)
      return
    } catch (err: any) {
      log("server", `attempt ${attempt}/${maxAttempts} failed:`, err.message || err)
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000))
      } else {
        serverUrl = null
        serverProcess = null
        throw err
      }
    }
  }
}

export async function retryOpencode(): Promise<boolean> {
  serverUrl = null
  serverProcess = null
  client = null
  sessionId = null
  try {
    await startOpencode()
    return true
  } catch {
    return false
  }
}

let sessionLock: Promise<void> | null = null
const resumeSessions = new Map<string, string>()
let currentResumeId: string | null = null

async function getClient() {
  if (client) return client
  if (!serverUrl) throw new Error("Opencode 未连接")
  const sdk = await import("@opencode-ai/sdk")
  client = sdk.createOpencodeClient({ baseUrl: serverUrl })
  return client
}

async function ensureSession(): Promise<string> {
  if (sessionId) return sessionId

  if (sessionLock) {
    await sessionLock
    if (sessionId) return sessionId
  }

  sessionLock = (async () => {
    const c = await getClient()
    const session = await Promise.race([
      c.session.create(),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("会话创建超时")), 15000)
      ),
    ])
    if (session.error) throw new Error(JSON.stringify(session.error))
    sessionId = session.data?.id
    if (!sessionId) throw new Error("会话 ID 为空")
  })()

  await sessionLock
  return sessionId!
}

async function streamFromGlobalEvents(
  sid: string,
  win: BrowserWindow,
  signal: AbortSignal
) {
  if (!serverUrl) return
  try {
    const res = await fetch(`${serverUrl}/global/event`, { signal })
    if (!res.ok || !res.body) return

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += decoder.decode(value, { stream: true })
      const lines = buf.split("\n")
      buf = lines.pop() || ""

      let eventType = ""
      for (const line of lines) {
        const t = line.trim()
        if (t.startsWith("event:")) {
          eventType = t.slice(6).trim()
        } else if (t.startsWith("data:")) {
          const jsonStr = t.slice(5).trim()
          try {
            const data = JSON.parse(jsonStr)
            // raw SSE data: { directory, payload: Event }
            const payload = data?.payload
            if (!payload?.properties) { eventType = ""; continue }

            const props = payload.properties
            const sessionMatch = props.sessionID || props?.part?.sessionID || ""
            if (sessionMatch !== sid) { eventType = ""; continue }

            const pType = payload.type || eventType

            const text = props.delta || props.text || props?.part?.text || ""
            if (!text) { eventType = ""; continue }

            log("sse", `event pType=${pType} field=${props.field || "?"} textLen=${text.length}`)
          } catch { /* json parse */ }
          eventType = ""
        }
      }
    }
  } catch {
    // stream aborted or closed
  }
}

export interface PolishFieldCall {
  system: string
  userText: string
  fallbackValue: string
}

export const POLISH_TIMEOUT_MS = 30_000

export async function polishField(
  call: PolishFieldCall,
  abortSignal?: AbortSignal
): Promise<{ content: string }> {
  const { cleanPolishResponse } = await import("../src/adapter/polish")
  const c = await getClient()

  let createdId: string | null = null
  let aborted = false

  const onAbort = () => { aborted = true }
  if (abortSignal) {
    if (abortSignal.aborted) aborted = true
    else abortSignal.addEventListener("abort", onAbort, { once: true })
  }

  try {
    const createResult = await Promise.race([
      c.session.create(),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("会话创建超时")), 15000)
      ),
    ])
    if (createResult.error) throw new Error(JSON.stringify(createResult.error))
    createdId = createResult.data?.id
    if (!createdId) throw new Error("会话 ID 为空")
    if (aborted) throw new Error("Polish cancelled")

    const result = await Promise.race([
      c.session.prompt({
        path: { id: createdId },
        body: {
          system: call.system,
          parts: [{ type: "text", text: call.userText }],
          model: { providerID: "opencode", modelID: currentModel },
        },
      }),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error(`AI 响应超时（${POLISH_TIMEOUT_MS / 1000}秒）`)), POLISH_TIMEOUT_MS)
      ),
    ])

    if (aborted) throw new Error("Polish cancelled")
    if (result.error) {
      const errorMsg = JSON.stringify(result.error)
      const isQuotaError = QUOTA_ERROR_PATTERNS.some((p) => p.test(errorMsg))
      if (isQuotaError) throw new Error("TOKEN_QUOTA_EXCEEDED: token 配额不足，请充值后重试")
      throw new Error(errorMsg)
    }

    const parts = result.data?.parts || []
    const raw = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("")
    const content = cleanPolishResponse(raw)
    log("polish-field", `userLen=${call.userText.length} outLen=${content.length}`)
    return { content: content || call.fallbackValue }
  } finally {
    if (abortSignal) abortSignal.removeEventListener("abort", onAbort)
    if (createdId) {
      c.session.delete({ path: { id: createdId } }).catch((e: any) => {
        log("polish-field", `temp session delete failed: ${e?.message || e}`)
      })
    }
  }
}

let conversationContext = ""

export function setConversationContext(ctx: string) {
  conversationContext = ctx
}

export function clearConversationContext() {
  conversationContext = ""
}

export function switchResume(resumeId: string): void {
  if (currentResumeId && sessionId) {
    resumeSessions.set(currentResumeId, sessionId)
  }

  if (resumeSessions.has(resumeId)) {
    sessionId = resumeSessions.get(resumeId)!
    sessionLock = null
  } else {
    sessionId = null
    sessionLock = null
  }

  currentResumeId = resumeId
}

export function removeResumeSession(resumeId: string) {
  resumeSessions.delete(resumeId)
}

export async function sendPrompt(
  text: string,
  win?: BrowserWindow | null,
  asFirstMessage = false
): Promise<{ content: string }> {
  const c = await getClient()
  const sid = await ensureSession()

  if (currentResumeId && !resumeSessions.has(currentResumeId)) {
    resumeSessions.set(currentResumeId, sid)
  }

  const abortController = new AbortController()

  if (win) {
    streamFromGlobalEvents(sid, win, abortController.signal)
  }

  const prefix = asFirstMessage ? "" : "用户消息: "
  const fullText = conversationContext
    ? `${conversationContext}\n\n${prefix}${text}`
    : text

  log("prompt", `fullText len=${fullText.length} text=${text.slice(0, 100)}`)
  try {
    const result = await Promise.race([
      c.session.prompt({
        path: { id: sid },
        body: {
          parts: [{ type: "text", text: fullText }],
          model: { providerID: "opencode", modelID: currentModel },
        },
      }),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("AI 响应超时（60秒）")), 60000)
      ),
    ])

    if (result.error) {
      const errorMsg = JSON.stringify(result.error)
      const isQuotaError = QUOTA_ERROR_PATTERNS.some(pattern => pattern.test(errorMsg))
      if (isQuotaError) {
        throw new Error("TOKEN_QUOTA_EXCEEDED: token 配额不足，请充值后重试")
      }
      throw new Error(errorMsg)
    }

    const parts = result.data?.parts || []
    const content = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("")

    log("prompt-result", `parts=${parts.length} contentLen=${content.length}`)

    if (win) {
      win.webContents.send("chat:chunk", { type: "done", content })
    }
    return { content: content || "(空回复)", thinking: "" }
  } finally {
    abortController.abort()
  }
}

export function setModel(model: string) {
  currentModel = model
}

export function getCurrentModel() {
  return currentModel
}

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

export async function getModels(): Promise<string[]> {
  try {
    const c = await getClient()
    const result = await c.config.providers()
    const providers = result.data?.providers || []
    const opencodeProvider = providers.find((p: any) => p.id === "opencode")
    if (!opencodeProvider) return ["big-pickle"]

    return Object.entries(opencodeProvider.models)
      .filter(([_, m]: [string, any]) => {
        const cost = m.cost || { input: 0, output: 0 }
        return cost.input === 0 && cost.output === 0
      })
      .map(([id]: [string, any]) => id)
  } catch (err) {
    console.warn("Failed to fetch models, using fallback:", err)
    return ["big-pickle"]
  }
}

export async function stopOpencode() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  serverUrl = null
  client = null
  sessionId = null
}
