import { ipcMain, BrowserWindow, dialog } from "electron"
import { startOpencode, stopOpencode, sendPrompt, setModel, getModels, getCurrentModel, isMockMode } from "./opencode"
import path from "path"
import fs from "fs"

const Store = require("electron-store")
const store = new Store({ encryptionKey: "resume-ai-local" })

interface SavedResume {
  id: string
  title: string
  templateName: string
  templateLabel: string
  createdAt: string
  data: any
}

function getResumes(): SavedResume[] {
  return store.get("resumes", [])
}

function saveResumes(resumes: SavedResume[]) {
  store.set("resumes", resumes)
}

function generateHTML(data: any, template: any): string {
  const sectionsHtml = (template.sections || [])
    .map((section: any) => {
      const sectionData = data.sections?.[section.id]
      if (!sectionData) return ""

      const fieldsHtml = section.fields
        .map((field: any) => {
          const value = sectionData[field.id]
          if (!value) return ""
          const lines = value.split("\n").filter((l: string) => l.trim())
          const formatted = lines.map((l: string) => `<p style="margin:0 0 2px 0">${l}</p>`).join("")
          return `<div style="margin-bottom:6px"><strong>${field.label}:</strong> ${formatted}</div>`
        })
        .filter(Boolean)
        .join("")

      const extraFieldsHtml = Object.entries(sectionData)
        .filter(([k]) => !section.fields.some((f: any) => f.id === k))
        .filter(([, v]) => v)
        .map(([k, v]) => {
          const s = template.sections?.find((s: any) => s.id === section.id)
          const label = s?.fields?.find((f: any) => f.id === k)?.label || k
          return `<div style="margin-bottom:6px"><strong>${label}:</strong> ${v}</div>`
        })
        .join("")

      if (!fieldsHtml && !extraFieldsHtml) return ""

      return `<div style="margin-bottom:24px;page-break-inside:avoid">
        <h2 style="font-size:16px;font-weight:bold;border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:8px;color:#1a1a1a">${section.label}</h2>
        ${fieldsHtml}${extraFieldsHtml}
      </div>`
    })
    .join("")

  const name = data.sections?.personal?.name || "简历"
  const title = data.sections?.personal?.title || ""
  const email = data.sections?.personal?.email || ""
  const phone = data.sections?.personal?.phone || ""

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${name} - 简历</title>
<style>
  body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif; max-width:800px; margin:0 auto; padding:40px; color:#333; font-size:13px; }
  @media print { body { padding:20px; } }
</style></head>
<body>
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:24px;margin:0;color:#1a1a1a">${name}</h1>
    ${title ? `<p style="font-size:15px;color:#666;margin:4px 0 0 0">${title}</p>` : ""}
    <p style="font-size:12px;color:#999;margin:8px 0 0 0">${[email, phone].filter(Boolean).join(" | ")}</p>
  </div>
  ${sectionsHtml}
</body></html>`
}

export function setupIPC() {
  ipcMain.handle("chat:send", async (event, text: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      const result = await sendPrompt(text, win)
      return result
    } catch (err: any) {
      console.error("chat:send error:", err)
      return { content: `（错误）${err.message || String(err)}`, thinking: "" }
    }
  })

  ipcMain.handle("models:list", async () => {
    return getModels()
  })

  ipcMain.handle("models:set", async (_event, model: string) => {
    setModel(model)
    store.set("currentModel", model)
  })

  ipcMain.handle("models:current", async () => {
    return getCurrentModel()
  })

  ipcMain.handle("apikey:set", async (_event, provider: string, key: string) => {
    store.set(`apikey-${provider}`, key)
  })

  ipcMain.handle("apikey:get", async (_event, provider: string) => {
    return store.get(`apikey-${provider}`, null)
  })

  ipcMain.handle("apikey:clear", async (_event, provider: string) => {
    store.delete(`apikey-${provider}`)
  })

  ipcMain.handle("templates:list", async () => {
    const templatesDir = path.join(__dirname, "../templates")
    if (!fs.existsSync(templatesDir)) return []
    const files = fs.readdirSync(templatesDir).filter((f: string) => f.endsWith(".json"))
    return files.map((f: string) => {
      const data = JSON.parse(fs.readFileSync(path.join(templatesDir, f), "utf-8"))
      return { name: data.name, label: data.label, description: data.description }
    })
  })

  ipcMain.handle("templates:get", async (_event, name: string) => {
    const filePath = path.join(__dirname, "../templates", `${name}.json`)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  })

  ipcMain.handle("resume:save", async (_event, data: any, template: any) => {
    const resumes = getResumes()
    const id = `resume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const name = data?.sections?.personal?.name || "未命名简历"
    const entry: SavedResume = {
      id,
      title: `${name} - ${template?.label || "简历"}`,
      templateName: template?.name || "",
      templateLabel: template?.label || "",
      createdAt: new Date().toISOString(),
      data,
    }
    resumes.unshift(entry)
    saveResumes(resumes.slice(0, 50))
    return entry
  })

  ipcMain.handle("resume:list", async () => {
    return getResumes()
  })

  ipcMain.handle("resume:get", async (_event, id: string) => {
    const resumes = getResumes()
    return resumes.find((r) => r.id === id) || null
  })

  ipcMain.handle("resume:delete", async (_event, id: string) => {
    const resumes = getResumes().filter((r) => r.id !== id)
    saveResumes(resumes)
  })

  ipcMain.handle("resume:export-pdf", async (_event, data: any, template: any) => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })

    const html = generateHTML(data, template)

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        try { win.destroy() } catch { /* ignore */ }
      }

      win.webContents.on("did-finish-load", async () => {
        try {
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })

          const name = data?.sections?.personal?.name || "简历"
          const result = await dialog.showSaveDialog(win, {
            title: "导出简历",
            defaultPath: `${name}_简历.pdf`,
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          })

          if (result.canceled || !result.filePath) {
            cleanup()
            resolve({ success: false, reason: "canceled" })
            return
          }

          fs.writeFileSync(result.filePath, pdfBuffer)
          cleanup()
          resolve({ success: true, path: result.filePath })
        } catch (err: any) {
          cleanup()
          reject(err)
        }
      })

      win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
        cleanup()
        reject(new Error(`加载失败: ${errorDescription}`))
      })

      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    })
  })
}

export async function initOpencode() {
  await startOpencode()
  if (isMockMode()) {
    console.log("Running in mock mode (opencode SDK not available)")
  } else {
    const savedModel = store.get("currentModel")
    if (savedModel) {
      setModel(savedModel)
      console.log("Restored model:", savedModel)
    }
    console.log("Opencode initialized")
  }
}
