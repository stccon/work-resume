export type TypeFamily = "sans" | "serif" | "mono"

export type Density = "dense" | "normal" | "spacious"

export type AvatarPlacement = "top-right" | "top-left" | "inline-left" | "sidebar-top" | "magazine-top" | "none"

export type AvatarSize = "small" | "medium" | "large"

export type AvatarShape = "circle" | "rounded" | "square"

export type AvatarBorder = "none" | "thin" | "thick" | "colored"

export interface AvatarConfig {
  placement: AvatarPlacement
  size: AvatarSize
  shape: AvatarShape
  border: AvatarBorder
}

export type Bullet = "•" | "—" | "›" | "▪" | "none"

export type TagStyle = "pill" | "flat" | "underline"

export type SectionTitleRule = "short-line" | "full-line" | "double-line" | "boxed" | "none"

export interface TypographyEntry {
  size: string
  weight: number
  lineHeight: string
  letterSpacing?: string
  transform?: "uppercase" | "none"
  tabularNums?: boolean
}

export interface V3Colors {
  primary: string
  accent: string
  background: string
  surface: string
  border: string
  muted: string
  text: string
}

export interface V3Spacing {
  pagePadding: string
  sectionGap: string
  entryGap: string
}

export interface V3Fonts {
  heading: string
  body: string
  mono: string
}

export interface V3Print {
  pageBreakInsideEntry: boolean
  pageBreakInsideSection: boolean
  tabularNums: boolean
  hanLatinSpacing: string
}

export interface V3Theme {
  name: string
  label: string
  description: string
  hasAvatar: boolean
  typeFamily: TypeFamily
  sectionOrder: string[]
  fonts: V3Fonts
  typography: {
    name: TypographyEntry
    title: TypographyEntry
    sectionTitle: TypographyEntry
    body: TypographyEntry
    entryTitle: TypographyEntry
    entryDate: TypographyEntry
    tag?: TypographyEntry
  }
  colors: V3Colors
  baseline: 4 | 8
  spacing: V3Spacing
  density: Density
  sectionTitleRule: SectionTitleRule
  sectionTitleRuleWidth?: string
  sectionTitleRuleHeight?: string
  sectionTitleRuleOffset?: string
  bullet: Bullet
  bulletColor?: "primary" | "accent" | "muted"
  tagStyle: TagStyle
  print: V3Print
  layout?: "single-column" | "two-column"
  sidebarWidth?: string
  sidebarBg?: string
  sidebarText?: string
  avatar?: AvatarConfig
}

export type VisualTheme = V3Theme

const AVATAR_SIZES: Record<AvatarSize, number> = {
  small: 40,
  medium: 64,
  large: 96,
}

export function getAvatarSizePx(size: AvatarSize): number {
  return AVATAR_SIZES[size]
}

export function getMonogramFontSize(size: AvatarSize): number {
  if (size === "small") return 14
  if (size === "medium") return 22
  return 32
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

export function validateV3Theme(theme: unknown): ValidationResult {
  const errors: string[] = []
  const t = theme as Partial<V3Theme>

  if (!t || typeof t !== "object") {
    return { ok: false, errors: ["theme must be an object"] }
  }

  if (typeof t.name !== "string" || !t.name) errors.push("name 必须是非空字符串")
  if (typeof t.label !== "string" || !t.label) errors.push("label 必须是非空字符串")
  if (typeof t.description !== "string") errors.push("description 必须是字符串")
  if (typeof t.hasAvatar !== "boolean") errors.push("hasAvatar 必须是 boolean")

  if (t.typeFamily && !["sans", "serif", "mono"].includes(t.typeFamily)) {
    errors.push("typeFamily 必须是 'sans' | 'serif' | 'mono'")
  }

  if (!Array.isArray(t.sectionOrder) || t.sectionOrder.length === 0) {
    errors.push("sectionOrder 必须是非空数组")
  }

  if (!t.fonts || typeof t.fonts !== "object") {
    errors.push("fonts 必须是对象")
  } else {
    if (typeof t.fonts.heading !== "string") errors.push("fonts.heading 必须是字符串")
    if (typeof t.fonts.body !== "string") errors.push("fonts.body 必须是字符串")
    if (typeof t.fonts.mono !== "string") errors.push("fonts.mono 必须是字符串")
  }

  if (!t.typography || typeof t.typography !== "object") {
    errors.push("typography 必须是对象")
  } else {
    const typeEntries = Object.values(t.typography).filter(
      (v): v is TypographyEntry => !!v && typeof v === "object",
    )
    if (typeEntries.length > 6) {
      errors.push(`typography 档位过多: ${typeEntries.length}（V3 宪法限制 ≤ 6 档）`)
    }
  }

  if (!t.colors || typeof t.colors !== "object") {
    errors.push("colors 必须是对象")
  } else {
    const colorKeys = Object.keys(t.colors).filter((k) => {
      const v = (t.colors as unknown as Record<string, unknown>)[k]
      return typeof v === "string" && v.length > 0
    })
    if (colorKeys.length > 7) {
      errors.push(`colors token 过多: ${colorKeys.length}（V3 宪法限制 = 7）`)
    }
  }

  if (t.baseline !== 4 && t.baseline !== 8) {
    errors.push("baseline 必须是 4 或 8")
  }

  if (!t.spacing || typeof t.spacing !== "object") {
    errors.push("spacing 必须是对象")
  } else if (t.baseline) {
    const baseline = t.baseline
    for (const key of ["pagePadding", "sectionGap", "entryGap"] as const) {
      const value = t.spacing[key]
      if (typeof value !== "string") {
        errors.push(`spacing.${key} 必须是字符串`)
        continue
      }
      const px = parsePx(value)
      if (px !== null && px % baseline !== 0) {
        errors.push(`spacing.${key} = ${value} 不是 baseline=${baseline} 的整数倍`)
      }
    }
  }

  if (t.typeFamily && t.fonts) {
    const bodyLower = t.fonts.body.toLowerCase()
    if (t.typeFamily === "mono") {
      if (!bodyLower.includes("mono")) {
        errors.push("typeFamily=mono 与 fonts.body 不一致（应含 'mono'）")
      }
    } else if (t.typeFamily === "serif") {
      if (!bodyLower.includes("serif") || bodyLower.includes("sans-serif")) {
        errors.push("typeFamily=serif 与 fonts.body 不一致（应含 'serif' 且不应含 'sans-serif'）")
      }
    } else {
      if (bodyLower.includes("serif") && !bodyLower.includes("sans-serif")) {
        errors.push("typeFamily=sans 与 fonts.body 不一致（应为 sans-serif）")
      }
    }
  }

  if (t.hasAvatar === true && !t.avatar) {
    errors.push("hasAvatar=true 时必须有 avatar 字段")
  }
  if (t.hasAvatar === false && t.avatar) {
    errors.push("hasAvatar=false 时不应有 avatar 字段")
  }

  return { ok: errors.length === 0, errors }
}

function parsePx(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/i)
  if (!match) return null
  return parseFloat(match[1])
}

export function isV3Theme(theme: VisualTheme): theme is V3Theme {
  return validateV3Theme(theme).ok
}
