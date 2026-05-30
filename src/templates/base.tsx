import { StyleSheet } from "@react-pdf/renderer"
import type { ResumeData } from "@/types/resume"

export interface ResumePDFProps {
  data: ResumeData
}

export const colors = {
  primary: "#1a56db",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#ffffff",
}

export function createStyles(overrides?: Record<string, object>) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: "Noto Sans SC",
      fontSize: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    header: {
      textAlign: "center",
      marginBottom: 20,
    },
    name: {
      fontSize: 22,
      fontWeight: 700,
      color: colors.primary,
    },
    title: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    contactRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 6,
      fontSize: 9,
      color: colors.muted,
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 700,
      color: colors.primary,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primary,
      paddingBottom: 3,
      marginBottom: 6,
    },
    entryBlock: {
      marginBottom: 8,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: {
      fontSize: 10,
      fontWeight: 700,
    },
    entrySubtitle: {
      fontSize: 9,
      color: colors.muted,
    },
    entryDate: {
      fontSize: 9,
      color: colors.muted,
    },
    bodyText: {
      fontSize: 9.5,
      lineHeight: 1.5,
      marginTop: 2,
    },
    bulletList: {
      marginTop: 2,
    },
    bulletItem: {
      flexDirection: "row",
      marginBottom: 1,
      fontSize: 9.5,
      lineHeight: 1.5,
    },
    bulletPoint: {
      width: 10,
      fontSize: 9.5,
    },
    bulletText: {
      flex: 1,
      fontSize: 9.5,
    },
    skillRow: {
      flexDirection: "row",
      marginBottom: 2,
      fontSize: 9.5,
    },
    skillLabel: {
      width: 70,
      fontWeight: 700,
      color: colors.text,
    },
    skillValue: {
      flex: 1,
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: colors.muted,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    ...overrides,
  })
}

export interface GroupedEntry {
  index: number
  fields: Record<string, string>
}

export function groupFieldsByEntry(fields: Record<string, string>): GroupedEntry[] {
  const groups = new Map<number, Record<string, string>>()
  for (const key of Object.keys(fields)) {
    const m = key.match(/^([a-zA-Z]+)(\d+)_(.+)$/)
    if (m) {
      const idx = parseInt(m[2], 10)
      const subKey = m[3]
      if (!groups.has(idx)) groups.set(idx, {})
      groups.get(idx)![subKey] = fields[key]
    }
  }
  const entries = Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([index, fieldData]) => ({ index, fields: fieldData }))
  if (entries.length === 0) {
    entries.push({ index: 0, fields: { ...fields } })
  }
  return entries
}
