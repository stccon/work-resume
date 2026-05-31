import type { VisualTheme } from "@/types/visual-template"
import modernBlue from "./themes/modern-blue.json"
import professionalSlate from "./themes/professional-slate.json"
import creativeDual from "./themes/creative-dual.json"

const themes: VisualTheme[] = [
  modernBlue as VisualTheme,
  professionalSlate as VisualTheme,
  creativeDual as VisualTheme,
]

const themeMap = new Map(themes.map((t) => [t.name, t]))

export function getAllVisualThemes(): VisualTheme[] {
  return themes
}

export function getVisualTheme(name: string): VisualTheme {
  return themeMap.get(name) || themes[0]
}

export const DEFAULT_VISUAL_THEME = themes[0].name
