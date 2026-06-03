import { ipcMain, BrowserWindow, dialog, app } from "electron"
import { startOpencode, stopOpencode, sendPrompt, setModel, getModels, getCurrentModel, isConnected, retryOpencode, setConversationContext, clearConversationContext, switchResume, removeResumeSession } from "./opencode"
import path from "path"
import fs from "fs"
import os from "os"
import { log } from "./logger"
import {
  getTemplatesDir,
  getResumesDir,
  getVisualThemesDir,
  generateResumeFileName,
} from "./paths"
import { renderResumeDocument } from "../src/lib/resume-renderer"

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

interface AvatarEntry {
  dataUrl: string
  enabled: boolean
}

type AvatarMap = Record<string, AvatarEntry>

function getAvatars(): AvatarMap {
  return store.get("avatars", {}) as AvatarMap
}

function saveAvatars(avatars: AvatarMap) {
  store.set("avatars", avatars)
}

function readJSONSafe(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } catch { return null }
}

function writeJSONSafe(filePath: string, data: any): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

function readVisualTheme(name: string): any | null {
  const dir = getVisualThemesDir()
  const p = path.join(dir, `${name}.json`)
  return readJSONSafe(p)
}

function generateHTML(data: any, template: any, visualThemeName?: string): string {
  const theme = (visualThemeName && readVisualTheme(visualThemeName)) || readVisualTheme("modern-blue") || {
    name: "modern-blue", label: "现代蓝", layout: "single-column",
    colors: { primary: "#1a56db", primaryLight: "#e8effd", text: "#1f2937", textMuted: "#6b7280", background: "#ffffff", border: "#e5e7eb" },
    typography: { nameFontSize: "24px", titleFontSize: "14px", sectionTitleFontSize: "13px", bodyFontSize: "11px", fontFamily: "-apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif", lineHeight: "1.6" },
    sectionStyle: "underlined", spacing: { pagePadding: "40px", sectionGap: "20px", entryGap: "10px" },
  }
  return renderResumeDocument(data, template, theme, `${data?.sections?.personal?.name || "简历"} - 简历`)
}

function readTemplateJSON(name: string): any | null {
  const templatesDir = getTemplatesDir()
  for (const ext of ["", ".json"]) {
    const p = path.join(templatesDir, `${name}${ext}`)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"))
  }
  return null
}

export function setupIPC() {
  ipcMain.handle("app:get-version", async () => {
    return app.getVersion()
  })

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

  ipcMain.handle("chat:send-first-message", async (event, prompt: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      const result = await sendPrompt(prompt, win, true)
      return { content: result.content, error: null, isQuotaError: false }
    } catch (err: any) {
      console.error("chat:send-first-message error:", err)
      const isQuotaError = err.message?.includes('TOKEN_QUOTA_EXCEEDED')
      return {
        content: `（错误）${err.message || String(err)}`,
        error: null,
        isQuotaError
      }
    }
  })

  ipcMain.handle("chat:set-context", async (_event, context: string) => {
    setConversationContext(context)
  })

  ipcMain.handle("chat:clear-context", async () => {
    clearConversationContext()
  })

  ipcMain.handle("chat:switch-resume", async (_event, resumeId: string) => {
    await switchResume(resumeId)
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

  ipcMain.handle("opencode:status", async () => {
    return { connected: isConnected() }
  })

  ipcMain.handle("opencode:retry", async () => {
    const ok = await retryOpencode()
    return { connected: ok }
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
    const templatesDir = getTemplatesDir()
    if (!fs.existsSync(templatesDir)) return []
    const files = fs.readdirSync(templatesDir).filter((f: string) => f.endsWith(".json"))
    return files.map((f: string) => {
      const data = JSON.parse(fs.readFileSync(path.join(templatesDir, f), "utf-8"))
      return { name: data.name, label: data.label, description: data.description }
    })
  })

  ipcMain.handle("templates:get", async (_event, name: string) => {
    return readTemplateJSON(name)
  })

  // ── Visual Theme IPC ──

  ipcMain.handle("visual-templates:list", async () => {
    const dir = getVisualThemesDir()
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".json"))
    return files.map((f: string) => {
      const data = readJSONSafe(path.join(dir, f))
      if (!data) return null
      return { name: data.name, label: data.label, description: data.description, layout: data.layout }
    }).filter(Boolean)
  })

  ipcMain.handle("visual-templates:get", async (_event, name: string) => {
    return readVisualTheme(name)
  })

  // ── Resume Save / Load ──

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

  ipcMain.handle("resume:update", async (_event, id: string, data: any, template?: any) => {
    const resumes = getResumes()
    const idx = resumes.findIndex((r: SavedResume) => r.id === id)
    if (idx === -1) return null
    const name = data?.sections?.personal?.name || "未命名简历"
    resumes[idx].data = data
    resumes[idx].title = `${name} - ${template?.label || resumes[idx].templateLabel || "简历"}`
    resumes[idx].templateName = template?.name || resumes[idx].templateName
    resumes[idx].templateLabel = template?.label || resumes[idx].templateLabel
    resumes[idx].createdAt = new Date().toISOString()
    saveResumes(resumes)
    return resumes[idx]
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
    removeResumeSession(id)
    const avatars = getAvatars()
    if (avatars[id]) {
      delete avatars[id]
      saveAvatars(avatars)
    }
  })

  ipcMain.handle("resume:export-pdf", async (_event, data: any, template: any, visualThemeName?: string) => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })

    const html = generateHTML(data, template, visualThemeName)

    return new Promise((resolve, reject) => {
      let tmpHtmlPath = ""
      const cleanup = () => {
        try { win.destroy() } catch { /* ignore */ }
        if (tmpHtmlPath) {
          try { fs.unlinkSync(tmpHtmlPath) } catch { /* ignore */ }
        }
      }

      win.webContents.on("did-finish-load", async () => {
        try {
          await win.webContents.executeJavaScript(`
            Promise.all(Array.from(document.images).map(img => {
              if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
              return new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
                setTimeout(resolve, 5000)
              })
            })).then(() => true)
          `)
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })

          const name = data?.sections?.personal?.name || "简历"
          const tmplLabel = template?.label || "简历"
          const defaultName = generateResumeFileName(name, tmplLabel)

          const result = await dialog.showSaveDialog(win, {
            title: "导出简历",
            defaultPath: defaultName,
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          })

          if (result.canceled || !result.filePath) {
            cleanup()
            resolve({ success: false, reason: "canceled" })
            return
          }

          fs.writeFileSync(result.filePath, pdfBuffer)

          // Also save a copy to resumes/ directory
          try {
            const resumesDir = getResumesDir()
            const copyPath = path.join(resumesDir, path.basename(result.filePath))
            fs.writeFileSync(copyPath, pdfBuffer)
          } catch { /* ignore copy failure */ }

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

      const tmpDir = path.join(os.tmpdir(), "resume-ai-pdf")
      fs.mkdirSync(tmpDir, { recursive: true })
      const filePath = path.join(tmpDir, `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`)
      tmpHtmlPath = filePath
      fs.writeFileSync(filePath, html, "utf-8")
      win.loadFile(filePath)
    })
  })

  ipcMain.handle("resume:save-pdf-buffer", async (_event, buffer: ArrayBuffer) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, reason: "no_window" }

    const result = await dialog.showSaveDialog(win, {
      title: "导出简历",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, reason: "canceled" }
    }

    fs.writeFileSync(result.filePath, Buffer.from(buffer))

    try {
      const resumesDir = getResumesDir()
      const copyPath = path.join(resumesDir, path.basename(result.filePath))
      fs.writeFileSync(copyPath, Buffer.from(buffer))
    } catch { /* ignore copy failure */ }

    return { success: true, path: result.filePath }
  })

  ipcMain.handle("pdf:extract-style", async (_event, filePath: string) => {
    try {
      const { extractPdfStyle } = await import("./pdf-extractor")
      return await extractPdfStyle(filePath)
    } catch (err: any) {
      console.error("PDF extraction error:", err)
      return { error: err.message || String(err) }
    }
  })

  ipcMain.handle("pdf:parse-resume", async (_event, filePath: string) => {
    try {
      const { parseResumePdf } = await import("./resume-parser")
      const { mapToTemplate } = await import("./template-mapper")
      const parsed = await parseResumePdf(filePath)
      const tmpl = readTemplateJSON("general")
      if (!tmpl) return { error: "general 模板不存在" }
      return mapToTemplate(parsed, tmpl)
    } catch (err: any) {
      console.error("Resume parse error:", err)
      return { error: err.message || String(err) }
    }
  })

  ipcMain.handle("pdf:extract-avatar-payload", async (_event, filePath: string) => {
    try {
      const { extractPdfAvatarPayload } = await import("./pdf-image-extractor")
      return await extractPdfAvatarPayload(filePath)
    } catch (err: any) {
      console.error("PDF avatar extraction error:", err)
      return null
    }
  })

  ipcMain.handle("pdf:extract-theme", async (_event, filePath: string) => {
    try {
      const { extractPdfTheme } = await import("./pdf-theme-extractor")
      return await extractPdfTheme(filePath)
    } catch (err: any) {
      console.error("PDF theme extraction error:", err)
      return { error: err.message || String(err) }
    }
  })

  ipcMain.handle("theme:save-imported", async (_event, theme: Record<string, unknown>) => {
    try {
      const { saveImportedTheme } = await import("./imported-themes")
      return saveImportedTheme(theme)
    } catch (err: any) {
      console.error("Save imported theme error:", err)
      return { error: err.message || String(err) }
    }
  })

  ipcMain.handle("theme:delete-imported", async (_event, themeName: string) => {
    try {
      const { deleteImportedTheme } = await import("./imported-themes")
      return deleteImportedTheme(themeName)
    } catch (err: any) {
      console.error("Delete imported theme error:", err)
      return { error: err.message || String(err) }
    }
  })

  ipcMain.handle("theme:list-imported", async () => {
    try {
      const { getImportedThemeFiles } = await import("./imported-themes")
      return getImportedThemeFiles().map((f) => f.name)
    } catch (err: any) {
      console.error("List imported themes error:", err)
      return []
    }
  })

  // ── Last Active Resume ──

  ipcMain.handle("resume:set-last-active", async (_event, id: string) => {
    store.set("lastActiveResumeId", id)
  })

  ipcMain.handle("resume:get-last-active", async () => {
    return store.get("lastActiveResumeId", null)
  })

  // ── Avatar IPC (per-resume) ──

  ipcMain.handle("avatar:get", async (_event, resumeId: string): Promise<AvatarEntry | null> => {
    return getAvatars()[resumeId] || null
  })

  ipcMain.handle("avatar:set", async (_event, resumeId: string, dataUrl: string, enabled: boolean) => {
    const avatars = getAvatars()
    avatars[resumeId] = { dataUrl, enabled }
    saveAvatars(avatars)
  })

  ipcMain.handle("avatar:remove", async (_event, resumeId: string) => {
    const avatars = getAvatars()
    if (avatars[resumeId]) {
      delete avatars[resumeId]
      saveAvatars(avatars)
    }
  })

  ipcMain.handle("avatar:migrate-from-legacy", async (_event, resumeId: string, dataUrl: string, enabled: boolean) => {
    const avatars = getAvatars()
    avatars[resumeId] = { dataUrl, enabled }
    saveAvatars(avatars)
    return { success: true }
  })

  ipcMain.handle("log:write", async (_event, tag: string, message: string) => {
    log(tag, message)
  })
}

export async function initOpencode() {
  try {
    await startOpencode()
    const savedModel = store.get("currentModel")
    if (savedModel) {
      setModel(savedModel)
      console.log("Restored model:", savedModel)
    }
    console.log("Opencode initialized")
  } catch (err: any) {
    console.warn("Opencode failed to start, entering mock mode:", err.message || err)
  }
}
