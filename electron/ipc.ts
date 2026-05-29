import { ipcMain } from "electron"
import { startOpencode, stopOpencode, sendPrompt, setModel, getModels, isMockMode } from "./opencode"

export function setupIPC() {
  ipcMain.handle("chat:send", async (_event, text: string) => {
    try {
      const reply = await sendPrompt(text)
      return reply
    } catch (err: any) {
      console.error("chat:send error:", err)
      return `（错误）${err.message || String(err)}`
    }
  })

  ipcMain.handle("models:list", async () => {
    return getModels()
  })

  ipcMain.handle("models:set", async (_event, model: string) => {
    setModel(model)
  })

  ipcMain.handle("models:current", async () => {
    return "qwen3.6"
  })

  ipcMain.handle("apikey:set", async (_event, provider: string, key: string) => {
    const { safeStorage } = require("electron")
    const Store = require("electron-store")
    const store = new Store({ encryptionKey: "resume-ai-local" })
    store.set(`apikey-${provider}`, key)
  })

  ipcMain.handle("apikey:get", async (_event, provider: string) => {
    const Store = require("electron-store")
    const store = new Store({ encryptionKey: "resume-ai-local" })
    return store.get(`apikey-${provider}`, null)
  })

  ipcMain.handle("apikey:clear", async (_event, provider: string) => {
    const Store = require("electron-store")
    const store = new Store({ encryptionKey: "resume-ai-local" })
    store.delete(`apikey-${provider}`)
  })

  ipcMain.handle("templates:list", async () => {
    const fs = require("fs")
    const path = require("path")
    const templatesDir = path.join(__dirname, "../templates")
    if (!fs.existsSync(templatesDir)) return []
    const files = fs.readdirSync(templatesDir).filter((f: string) => f.endsWith(".json"))
    return files.map((f: string) => {
      const data = JSON.parse(fs.readFileSync(path.join(templatesDir, f), "utf-8"))
      return { name: data.name, label: data.label, description: data.description }
    })
  })

  ipcMain.handle("templates:get", async (_event, name: string) => {
    const fs = require("fs")
    const path = require("path")
    const filePath = path.join(__dirname, "../templates", `${name}.json`)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  })
}

export async function initOpencode() {
  await startOpencode()
  if (isMockMode()) {
    console.log("Running in mock mode (opencode SDK not available)")
  } else {
    console.log("Opencode initialized")
  }
}
