import type { V3Theme } from "@/types/visual-template"
import { getAvatarSizePx, getMonogramFontSize } from "@/types/visual-template"

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

function isCjk(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
}

function hasCjk(s: string): boolean {
  return CJK_RE.test(s)
}

const NUMERIC_RE = /^\d+$/

export function getMonogramText(name: string | undefined, fallback = "?"): string {
  const trimmed = (name || "").trim()
  if (!trimmed) return fallback

  if (NUMERIC_RE.test(trimmed)) {
    return trimmed
  }

  if (hasCjk(trimmed)) {
    return trimmed[0]
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0][0]
    const last = parts[parts.length - 1][0]
    if (first && last) return (first + last).toUpperCase()
  }

  return trimmed[0].toUpperCase()
}

function getAvatarShapeStyle(shape: string): string {
  if (shape === "circle") return "50%"
  if (shape === "rounded") return "8px"
  return "0"
}

function getAvatarBorderStyle(border: string, primary: string, borderColor: string): string {
  if (border === "thin") return `1px solid ${borderColor}`
  if (border === "thick") return `3px solid ${borderColor}`
  if (border === "colored") return `2px solid ${primary}`
  return "none"
}

export function renderMonogram(name: string, theme: V3Theme): string {
  if (!theme.hasAvatar) return ""

  const config = theme.avatar
  if (!config) return ""

  const text = getMonogramText(name)
  const sizePx = getAvatarSizePx(config.size)
  const fontSize = getMonogramFontSize(config.size)
  const radius = getAvatarShapeStyle(config.shape)
  const border = getAvatarBorderStyle(config.border, theme.colors.primary, theme.colors.border)

  const placementClass = `placement-${config.placement.replace(/-/g, "-")}`
  const sizeClass = `size-${config.size}`
  const shapeClass = `shape-${config.shape}`
  const borderClass = `border-${config.border}`

  return `<span class="resume-monogram ${placementClass} ${sizeClass} ${shapeClass} ${borderClass}" ` +
    `style="display:inline-flex;align-items:center;justify-content:center;` +
    `width:${sizePx}px;height:${sizePx}px;border-radius:${radius};${border !== "none" ? `border:${border};` : ""}` +
    `background:${theme.colors.surface};font-size:${fontSize}px;font-weight:700;color:${theme.colors.text};` +
    `font-family:${theme.fonts.heading}">` +
    `${text}</span>`
}
