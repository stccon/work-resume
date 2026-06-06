import type { V3Theme, VisualTheme } from "@/types/visual-template"

const builtInThemes: V3Theme[] = []

const userImports = import.meta.glob<{ default: VisualTheme }>(
  ["./v3-*.json", "./v3-*.json?imported"],
  { eager: true },
)
const importedV3Themes: V3Theme[] = Object.entries(userImports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const theme = (mod as any).default || mod
    return theme as V3Theme
  })

const allThemes: V3Theme[] = [...builtInThemes, ...importedV3Themes]
const themeMap = new Map(allThemes.map((t) => [t.name, t]))

export function getAllVisualThemes(): V3Theme[] {
  return allThemes
}

export function getVisualTheme(name: string): V3Theme {
  return themeMap.get(name) || allThemes[0]
}

export const DEFAULT_VISUAL_THEME = allThemes[0]?.name ?? ""

export function getImportedThemeNames(): string[] {
  return importedV3Themes.map((t) => t.name)
}
