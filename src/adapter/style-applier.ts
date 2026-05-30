

const fontMap: Record<string, string> = {
  "sans-serif": "system",
  "微软雅黑": "system",
  "Microsoft YaHei": "system",
  "宋体": "serif",
  "SimSun": "serif",
  "Times New Roman": "serif",
  "Times": "serif",
  "Helvetica": "system",
  "Arial": "system",
  "PingFang": "system",
  "PingFang SC": "system",
  "Noto Sans": "system",
  "思源黑体": "system",
  "黑体": "system",
  "SimHei": "system",
}

const colorPalettes: Record<string, string[]> = {
  blue: ["#1a56db", "#2563eb", "#3b82f6"],
  teal: ["#0d9488", "#14b8a6", "#2dd4bf"],
  green: ["#16a34a", "#22c55e", "#4ade80"],
  red: ["#dc2626", "#ef4444", "#f87171"],
  purple: ["#7c3aed", "#8b5cf6", "#a78bfa"],
  orange: ["#ea580c", "#f97316", "#fb923c"],
  slate: ["#334155", "#475569", "#64748b"],
}

function detectColorPalette(accentColor: string): string {
  const c = accentColor.toLowerCase()
  if (c.includes("teal") || c.includes("14b8a6") || c.includes("0d94")) return "#0d9488"
  if (c.includes("green") || c.includes("16a3") || c.includes("22c5")) return "#16a34a"
  if (c.includes("red") || c.includes("dc26") || c.includes("ef44")) return "#dc2626"
  if (c.includes("purple") || c.includes("7c3a") || c.includes("8b5c")) return "#7c3aed"
  if (c.includes("orange") || c.includes("ea58") || c.includes("f973")) return "#ea580c"
  if (c.includes("slate") || c.includes("3341") || c.includes("4755")) return "#334155"
  return "#1a56db"
}

export function applyStyleToPreferences(analysis: any, currentPrefs: UserPreferences): UserPreferences {
  const detectedColor = detectColorPalette(analysis.accentColor || "#1a56db")
  const fontFamily = fontMap[analysis.fontFamily || ""] || currentPrefs.fontFamily
  const fontSize = analysis.fontSize ? String(Math.round(parseFloat(analysis.fontSize))) : currentPrefs.fontSize
  const layout = analysis.layoutStyle === "two-column" ? "two-column" : "standard"

  return {
    ...currentPrefs,
    accentColor: detectedColor,
    fontFamily,
    fontSize: fontSize || currentPrefs.fontSize,
    layout,
  }
}
