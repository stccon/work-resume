export type LayoutStyle = "single-column" | "two-column"

export type SectionStyle = "underlined" | "colored-bg" | "minimal" | "card"

export type HeaderStyle = "centered" | "left" | "colored-bar"

export type DecorationStyle = "line" | "dot" | "none"

export interface VisualTheme {
  name: string
  label: string
  description: string
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
  }
  fonts: {
    heading: string
    body: string
  }
  typography: {
    nameFontSize: string
    titleFontSize: string
    sectionTitleFontSize: string
    bodyFontSize: string
    lineHeight: string
  }
  sectionStyle: SectionStyle
  spacing: {
    pagePadding: string
    sectionGap: string
    entryGap: string
  }
  sidebarWidth?: string
  borderRadius: string
}
