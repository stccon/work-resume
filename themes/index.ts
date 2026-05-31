import type { VisualTheme } from "@/types/visual-template"
import elegantBlue from "./elegant-blue.json"
import graphite from "./graphite.json"
import emeraldSidebar from "./emerald-sidebar.json"
import amberHeader from "./amber-header.json"
import basalt from "./basalt.json"
import glacier from "./glacier.json"

const themes: VisualTheme[] = [
  elegantBlue as VisualTheme,
  graphite as VisualTheme,
  emeraldSidebar as VisualTheme,
  amberHeader as VisualTheme,
  basalt as VisualTheme,
  glacier as VisualTheme,
]

const themeMap = new Map(themes.map((t) => [t.name, t]))

export function getAllVisualThemes(): VisualTheme[] {
  return themes
}

export function getVisualTheme(name: string): VisualTheme {
  return themeMap.get(name) || themes[0]
}

export const DEFAULT_VISUAL_THEME = themes[0].name
