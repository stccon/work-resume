import { app, BrowserWindow, Menu } from "electron"
import path from "path"
import fs from "fs"
import { setupIPC, initOpencode } from "./ipc"
import {
  getTemplatesDir,
  getResumesDir,
  getVisualThemesDir,
  getAppBaseDir,
} from "./paths"

let mainWindow: BrowserWindow | null = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

function copyJsonDir(srcDir: string, targetDir: string) {
  if (!fs.existsSync(srcDir)) return
  for (const file of fs.readdirSync(srcDir)) {
    if (file.endsWith(".json")) {
      const dest = path.join(targetDir, file)
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(srcDir, file), dest)
      }
    }
  }
}

function ensureDirectories() {
  getTemplatesDir()
  getResumesDir()
  getVisualThemesDir()

  const baseDir = getAppBaseDir()
  copyJsonDir(path.join(baseDir, "templates"), getTemplatesDir())
  copyJsonDir(path.join(baseDir, "themes"), getVisualThemesDir())
}

function migrateLegacyUserData() {
  if (!app.isPackaged) return
  const oldRoot = app.getPath("userData")
  if (!fs.existsSync(oldRoot)) return

  const pairs: Array<[string, string]> = [
    [path.join(oldRoot, "resumes"), getResumesDir()],
    [path.join(oldRoot, "themes"), getVisualThemesDir()],
  ]
  for (const [src, dst] of pairs) {
    if (!fs.existsSync(src)) continue
    const existing = fs.readdirSync(dst).filter((f) => f !== ".write-probe")
    if (existing.length > 0) continue
    for (const f of fs.readdirSync(src)) {
      const s = path.join(src, f)
      const d = path.join(dst, f)
      if (!fs.existsSync(d)) {
        try {
          fs.copyFileSync(s, d)
          console.log(`[migration] copied ${s} -> ${d}`)
        } catch (err) {
          console.warn(`[migration] failed to copy ${s}:`, err)
        }
      }
    }
  }

  const oldCfg = path.join(oldRoot, "config.json")
  const newCfg = path.join(getAppBaseDir(), "config.json")
  if (fs.existsSync(oldCfg) && !fs.existsSync(newCfg)) {
    try {
      fs.copyFileSync(oldCfg, newCfg)
      console.log(`[migration] config.json copied from legacy userData`)
    } catch (err) {
      console.warn(`[migration] config.json copy failed:`, err)
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12") {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.on("crashed", (event, killed) => {
    console.error("Renderer crashed:", { killed })
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err)
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  ensureDirectories()
  migrateLegacyUserData()
  setupIPC()
  await initOpencode()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
