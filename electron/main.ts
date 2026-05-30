import { app, BrowserWindow } from "electron"
import path from "path"
import fs from "fs"
import { setupIPC, initOpencode } from "./ipc"
import { getTemplatesDir, getResumesDir, getUserdataDir } from "./paths"
import { migrateLegacyData } from "./migration"

let mainWindow: BrowserWindow | null = null

function ensureDirectories() {
  getTemplatesDir()
  getResumesDir()
  getUserdataDir()

  const devTemplates = path.join(__dirname, "..", "templates")
  if (fs.existsSync(devTemplates)) {
    const targetDir = getTemplatesDir()
    for (const file of fs.readdirSync(devTemplates)) {
      if (file.endsWith(".json")) {
        const dest = path.join(targetDir, file)
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(devTemplates, file), dest)
        }
      }
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
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
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
  migrateLegacyData()
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
