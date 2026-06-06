import { app } from "electron"
import path from "path"
import fs from "fs"

function getBaseDir(): string {
  if (app.isPackaged) {
    return path.dirname(app.getPath("exe"))
  }
  return path.join(__dirname, "..")
}

export function getAppBaseDir(): string {
  return getBaseDir()
}

function ensureDir(dir: string): string {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const probe = path.join(dir, ".write-probe")
    fs.writeFileSync(probe, "")
    fs.unlinkSync(probe)
    return dir
  } catch {
    console.warn(`[paths] Cannot write to ${dir}, falling back to userData`)
    const fallback = path.join(app.getPath("userData"), path.basename(dir))
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true })
    }
    return fallback
  }
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

export function getLogsDir(): string {
  return ensureDir(path.join(getBaseDir(), "logs"))
}

export function resolveTemplatesDir(): string {
  return getTemplatesDir()
}
