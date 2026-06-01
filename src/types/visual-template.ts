export type LayoutStyle = "single-column" | "two-column"

export type SectionStyle = "underlined" | "colored-bg" | "minimal" | "card"

export type HeaderStyle = "centered" | "left" | "colored-bar"

export type DecorationStyle = "line" | "dot" | "none"

export type ThemeSeries = "v1" | "v2"

export type ThemeLanguage = "chinese" | "english" | "auto"

export type ThemeFamily = "minimal" | "modern" | "editorial"

export type AvatarPlacement = "top-right" | "top-left" | "inline-left" | "sidebar-top" | "magazine-top" | "none"

export type AvatarSize = "small" | "medium" | "large"

export type AvatarShape = "circle" | "square" | "rounded"

export type AvatarBorder = "none" | "thin" | "thick" | "colored"

export interface AvatarConfig {
  defaultEnabled: boolean
  placement: AvatarPlacement
  size: AvatarSize
  shape: AvatarShape
  border: AvatarBorder
}

export interface VisualTheme {
  name: string
  label: string
  description: string
  series?: ThemeSeries
  family?: ThemeFamily
  language?: ThemeLanguage
  layout: LayoutStyle
  headerStyle: HeaderStyle
  decorationStyle: DecorationStyle
  colors: {
    primary: string
    primaryLight: string
    text: string
    textMuted: string
    background: string
    border: string
    sidebarBg?: string
    sidebarText?: string
    headerBg?: string
    headerText?: string
    sectionBg?: string
    accent?: string
    divider?: string
  }
  fonts: {
    heading: string
    body: string
    mono?: string
  }
  typography: {
    nameFontSize: string
    titleFontSize: string
    sectionTitleFontSize: string
    bodyFontSize: string
    lineHeight: string
    nameLetterSpacing?: string
    sectionTitleTransform?: "uppercase" | "none"
    sectionTitleLetterSpacing?: string
  }
  sectionStyle: SectionStyle
  spacing: {
    pagePadding: string
    sectionGap: string
    entryGap: string
  }
  sidebarWidth?: string
  borderRadius: string
  v2Config?: {
    headerVariant: "minimal" | "split" | "magazine"
    sectionTitleRule: "short-line" | "full-line" | "double-line" | "boxed"
    contactSeparator: string
    showHeaderDivider: boolean
    nameStyle: "default" | "uppercase" | "serif-large"
    bulletStyle: "dot" | "square" | "dash" | "arrow" | "none"
    tagStyle: "pill" | "flat" | "underline"
    avatar?: AvatarConfig
  }
  avatar?: AvatarConfig
}
