import { app, BrowserWindow } from "electron"
import path from "path"
import fs from "fs"
import { setupIPC, initOpencode } from "./ipc"
import { getTemplatesDir, getResumesDir, getVisualTemplatesDir } from "./paths"

let mainWindow: BrowserWindow | null = null

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
  getVisualTemplatesDir()

  const devTemplates = path.join(__dirname, "..", "templates")
  copyJsonDir(devTemplates, getTemplatesDir())

  const devVisualTemplates = path.join(__dirname, "..", "visual-templates", "themes")
  copyJsonDir(devVisualTemplates, getVisualTemplatesDir())
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
  ensureDirectories()
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
