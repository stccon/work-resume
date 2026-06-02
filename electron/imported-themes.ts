import fs from "fs"
import path from "path"
import { app } from "electron"

function getBaseDir(): string {
  if (app.isPackaged) {
    return app.getPath("userData")
  }
  return path.join(__dirname, "..")
}

export function getImportedThemesDir(): string {
  const dir = path.join(getBaseDir(), "themes")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getImportedThemeFiles(): { name: string; filePath: string; mtime: number }[] {
  const dir = getImportedThemesDir()
  return fs.readdirSync(dir)
    .filter((f) => f.startsWith("imported-") && f.endsWith(".json"))
    .map((f) => {
      const filePath = path.join(dir, f)
      return { name: f.replace(/\.json$/, ""), filePath, mtime: fs.statSync(filePath).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)
}

export function saveImportedTheme(theme: Record<string, unknown>): { name: string; isNew: boolean } {
  const themeName = (theme as any).name
  if (!themeName || !themeName.startsWith("imported-")) {
    throw new Error("主题 name 必须以 imported- 开头")
  }
  const fileName = `${themeName}.json`
  const dir = getImportedThemesDir()
  const filePath = path.join(dir, fileName)
  const isNew = !fs.existsSync(filePath)
  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2), "utf-8")
  return { name: themeName, isNew }
}

export function deleteImportedTheme(themeName: string): boolean {
  if (!themeName.startsWith("imported-")) {
    throw new Error("只能删除 imported-* 主题")
  }
  const filePath = path.join(getImportedThemesDir(), `${themeName}.json`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

export function readImportedTheme(themeName: string): Record<string, unknown> | null {
  if (!themeName.startsWith("imported-")) return null
  const filePath = path.join(getImportedThemesDir(), `${themeName}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}
