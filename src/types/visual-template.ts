export type LayoutStyle = "single-column" | "two-column"

export type SectionStyle = "underlined" | "colored-bg" | "minimal"

export interface VisualTheme {
  name: string
  label: string
  description: string
  layout: LayoutStyle
  colors: {
    primary: string
    primaryLight: string
    text: string
    textMuted: string
    background: string
    border: string
    sidebarBg?: string
    sidebarText?: string
  }
  typography: {
    nameFontSize: string
    titleFontSize: string
    sectionTitleFontSize: string
    bodyFontSize: string
    fontFamily: string
    lineHeight: string
  }
  sectionStyle: SectionStyle
  spacing: {
    pagePadding: string
    sectionGap: string
    entryGap: string
  }
}
