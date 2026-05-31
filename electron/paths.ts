import { app } from "electron"
import path from "path"
import fs from "fs"

function getBaseDir(): string {
  if (app.isPackaged) {
    return app.getPath("userData")
  }
  return path.join(__dirname, "..")
}

function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getTemplatesDir(): string {
  return ensureDir(path.join(getBaseDir(), "templates"))
}

export function getResumesDir(): string {
  return ensureDir(path.join(getBaseDir(), "resumes"))
}

export function generateResumeFileName(userName: string, templateLabel: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${userName}_${templateLabel}_${date}.pdf`
}

export function getVisualThemesDir(): string {
  return ensureDir(path.join(getBaseDir(), "themes"))
}

export function resolveTemplatesDir(): string {
  return getTemplatesDir()
}
