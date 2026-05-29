import { spawn, ChildProcess } from "child_process"

let serverProcess: ChildProcess | null = null
let serverUrl: string | null = null
let currentSessionId: string | null = null

export function isMockMode() {
  return false
}

export async function startOpencode(): Promise<void> {
  if (serverProcess) return

  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "opencode.cmd" : "opencode"

    serverProcess = spawn(cmd, ["serve"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: process.env,
    })

    let found = false
    let output = ""

    const timeout = setTimeout(() => {
      if (!found) {
        serverProcess?.kill()
        serverProcess = null
        reject(new Error(`opencode serve 启动超时（20秒）\n${output.slice(-500)}`))
      }
    }, 20000)

    function onData(data: Buffer) {
      const text = data.toString()
      output += text
      const m = text.match(/opencode server listening on\s+(https?:\/\/[^\s]+)/)
      if (m && !found) {
        found = true
        serverUrl = m[1].replace(/\/+$/, "")
        clearTimeout(timeout)
        console.log("Opencode server ready at", serverUrl)
        resolve()
      }
    }

    serverProcess.stdout?.on("data", onData)
    serverProcess.stderr?.on("data", onData)

    serverProcess.on("error", (err) => {
      if (!found) {
        clearTimeout(timeout)
        serverProcess = null
        reject(err)
      }
    })

    serverProcess.on("exit", (code) => {
      if (!found) {
        clearTimeout(timeout)
        serverProcess = null
        reject(new Error(`opencode serve 已退出 (code ${code})\n${output.slice(-500)}`))
      }
    })
  })
}

async function createSession(): Promise<string> {
  if (!serverUrl) throw new Error("opencode 未启动")
  const res = await fetch(`${serverUrl}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    throw new Error(`创建会话失败: ${res.status} ${await res.text()}`)
  }
  const data: any = await res.json()
  if (!data.id) throw new Error("创建会话返回无 ID")
  return data.id
}

async function sendPromptToSession(sessionId: string, text: string): Promise<string> {
  if (!serverUrl) throw new Error("opencode 未启动")
  const res = await fetch(`${serverUrl}/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parts: [{ type: "text", text }],
      model: { providerID: "opencode", modelID: "big-pickle" },
    }),
  })
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${await res.text()}`)
  }
  const result: any = await res.json()
  const parts = result.parts || result.data?.parts || []
  return parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("")
}

export async function sendPrompt(text: string): Promise<string> {
  if (!serverUrl) throw new Error("opencode 未连接，请等待启动完成")
  const sid = currentSessionId || await createSession()
  currentSessionId = sid
  return await sendPromptToSession(sid, text)
}

export function setModel(_model: string) {}

export function getModels() {
  return ["qwen3.6", "big-pickle"]
}

export async function stopOpencode() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  serverUrl = null
  currentSessionId = null
}
