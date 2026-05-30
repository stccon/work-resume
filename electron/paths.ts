import { app } from "electron"
import path from "path"
import fs from "fs"

function getBaseDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "resume-ai")
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

export function getUserdataDir(): string {
  return ensureDir(path.join(getBaseDir(), "userdata"))
}

export function getUserDir(userId: string): string {
  return ensureDir(path.join(getUserdataDir(), userId))
}

export function getUserProfilePath(userId: string): string {
  return path.join(getUserDir(userId), "profile.json")
}

export function getUserConversationsDir(userId: string): string {
  return ensureDir(path.join(getUserDir(userId), "conversations"))
}

export function getUserPreferencesPath(userId: string): string {
  return path.join(getUserDir(userId), "preferences.json")
}

export function getUserResumeDraftPath(userId: string): string {
  return path.join(getUserDir(userId), "resume-draft.json")
}

export function listUsers(): string[] {
  const dir = getUserdataDir()
  return fs.readdirSync(dir).filter((name) => {
    const sub = path.join(dir, name)
    return fs.statSync(sub).isDirectory()
  })
}

export function generateResumeFileName(userName: string, templateLabel: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${userName}_${templateLabel}_${date}.pdf`
}

export function resolveTemplatesDir(): string {
  return getTemplatesDir()
}
