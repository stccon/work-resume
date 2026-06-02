import type { VisualTheme } from "@/types/visual-template"
import elegantBlue from "./elegant-blue.json"
import graphite from "./graphite.json"
import emeraldSidebar from "./emerald-sidebar.json"
import amberHeader from "./amber-header.json"
import basalt from "./basalt.json"
import glacier from "./glacier.json"
import v2MinimalMono from "./v2-minimal-mono.json"
import v2ModernPro from "./v2-modern-pro.json"
import v2Editorial from "./v2-editorial.json"
import v2TypstMonospace from "./v2-typst-monospace.json"
import v2AcademicSerif from "./v2-academic-serif.json"
import v2ExecutiveSidebar from "./v2-executive-sidebar.json"
import v2WarmEarth from "./v2-warm-earth.json"
import v2TechBlueprint from "./v2-tech-blueprint.json"

const builtInThemes: VisualTheme[] = [
  elegantBlue as VisualTheme,
  graphite as VisualTheme,
  emeraldSidebar as VisualTheme,
  amberHeader as VisualTheme,
  basalt as VisualTheme,
  glacier as VisualTheme,
  v2MinimalMono as VisualTheme,
  v2ModernPro as VisualTheme,
  v2Editorial as VisualTheme,
  v2TypstMonospace as VisualTheme,
  v2AcademicSerif as VisualTheme,
  v2ExecutiveSidebar as VisualTheme,
  v2WarmEarth as VisualTheme,
  v2TechBlueprint as VisualTheme,
]

const userImports = import.meta.glob<{ default: VisualTheme }>(
  ["./imported-*.json", "./imported-*.json?imported"],
  { eager: true },
)
const importedThemes: VisualTheme[] = Object.entries(userImports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const theme = (mod as any).default || mod
    return { ...(theme as VisualTheme), isImported: true as const }
  })

const allThemes: VisualTheme[] = [...builtInThemes, ...importedThemes]
const themeMap = new Map(allThemes.map((t) => [t.name, t]))

export function getAllVisualThemes(): VisualTheme[] {
  return allThemes
}

export function getVisualTheme(name: string): VisualTheme {
  return themeMap.get(name) || allThemes[0]
}

export const DEFAULT_VISUAL_THEME = allThemes[0].name

export function getImportedThemeNames(): string[] {
  return importedThemes.map((t) => t.name)
}
