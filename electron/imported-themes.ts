import fs from "fs"
import path from "path"
import { getVisualThemesDir } from "./paths"

function getDir(): string {
  return getVisualThemesDir()
}

export function getImportedThemesDir(): string {
  return getDir()
}

export function getImportedThemeFiles(): { name: string; filePath: string; mtime: number }[] {
  const dir = getDir()
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
  const dir = getDir()
  const filePath = path.join(dir, fileName)
  const isNew = !fs.existsSync(filePath)
  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2), "utf-8")
  return { name: themeName, isNew }
}

export function deleteImportedTheme(themeName: string): boolean {
  if (!themeName.startsWith("imported-")) {
    throw new Error("只能删除 imported-* 主题")
  }
  const filePath = path.join(getDir(), `${themeName}.json`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

export function readImportedTheme(themeName: string): Record<string, unknown> | null {
  if (!themeName.startsWith("imported-")) return null
  const filePath = path.join(getDir(), `${themeName}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}
