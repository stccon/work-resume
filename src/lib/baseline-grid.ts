import type { V3Theme } from "@/types/visual-template"

function parsePx(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/i)
  if (!match) return null
  return parseFloat(match[1])
}

export function assertBaselineMultiple(valuePx: number, baseline: number, fieldName: string): void {
  if (Number.isNaN(valuePx)) return
  if (import.meta.env.DEV && valuePx % baseline !== 0) {
    const lower = Math.floor(valuePx / baseline) * baseline
    const upper = lower + baseline
    console.warn(
      `[baseline-grid] "${fieldName}" = ${valuePx}px 不是 baseline=${baseline} 的整数倍，建议 ${lower}px 或 ${upper}px`
    )
  }
}

export function getBaselineReminders(theme: V3Theme): string[] {
  const reminders: string[] = []
  for (const key of ["pagePadding", "sectionGap", "entryGap"] as const) {
    const value = theme.spacing[key]
    const px = parsePx(value)
    if (px !== null && px % theme.baseline !== 0) {
      reminders.push(`"${key}" = ${value} 不是 baseline=${theme.baseline} 的整数倍`)
    }
  }
  return reminders
}

export function checkSpacingOnThemeLoad(theme: V3Theme): void {
  if (!import.meta.env.DEV) return
  const reminders = getBaselineReminders(theme)
  if (reminders.length > 0) {
    console.warn(`[baseline-grid] 主题 "${theme.name}" 存在 spacing 不合规项：\n${reminders.join("\n")}`)
  }
}
