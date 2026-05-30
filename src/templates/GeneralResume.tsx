import { Document, Page, View, Text } from "@react-pdf/renderer"
import { createStyles, groupFieldsByEntry } from "./base"
import type { ResumePDFProps } from "./base"
import type { TemplateDefinition } from "@/types/template"

const styles = createStyles({
  name: { fontSize: 22, fontWeight: 700, color: "#1f2937" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1f2937",
    borderBottomWidth: 1.5,
    borderBottomColor: "#374151",
    paddingBottom: 3,
    marginBottom: 6,
  },
})

function fieldLabel(section: any, id: string): string {
  const field = section?.fields?.find((f: any) => f.id === id)
  return field?.label || id
}

export function GeneralResume({ data, template }: ResumePDFProps & { template?: TemplateDefinition }) {
  const personal = data.sections.personal || {}
  const getSec = (id: string) => data.sections[id]
  const getTmpl = (id: string) => template?.sections?.find((s) => s.id === id)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{personal.name || "简历"}</Text>
          {personal.title && <Text style={styles.title}>{personal.title}</Text>}
          <View style={styles.contactRow}>
            {personal.email && <Text>{personal.email}</Text>}
            {personal.phone && <Text>{personal.phone}</Text>}
          </View>
        </View>

        {renderSectionSimple(getSec("summary"), getTmpl("summary"), "个人简介")}
        {renderSectionSimple(getSec("skills"), getTmpl("skills"), "技能")}
        {renderMultiEntrySection(getSec("experience"), getTmpl("experience"), ["company", "position"])}
        {renderMultiEntrySection(getSec("education"), getTmpl("education"), ["school", "major"])}
        {renderMultiEntrySection(getSec("projects"), getTmpl("projects"), ["name"])}

        {data.completedAt && (
          <Text style={styles.footer}>
            生成时间：{new Date(data.completedAt).toLocaleString("zh-CN")}
          </Text>
        )}
      </Page>
    </Document>
  )
}

function renderSectionSimple(
  sectionData: Record<string, string> | undefined,
  sectionTmpl: any,
  label: string,
) {
  if (!sectionData || Object.keys(sectionData).length === 0) return null
  const text = Object.values(sectionData)[0]
  if (!text) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTmpl?.label || label}</Text>
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  )
}

function renderMultiEntrySection(
  sectionData: Record<string, string> | undefined,
  sectionTmpl: any,
  titleFields: string[],
) {
  if (!sectionData || Object.keys(sectionData).length === 0) return null
  const entries = groupFieldsByEntry(sectionData)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTmpl?.label || titleFields[0] || "经历"}</Text>
      {entries.map((entry) => (
        <View key={entry.index} style={styles.entryBlock}>
          <View style={styles.entryHeader}>
            <View>
              {titleFields.map((f) => {
                if (!entry.fields[f]) return null
                return (
                  <Text key={f} style={f === titleFields[0] ? styles.entryTitle : styles.entrySubtitle}>
                    {entry.fields[f]}
                  </Text>
                )
              })}
            </View>
            {entry.fields.date && <Text style={styles.entryDate}>{entry.fields.date}</Text>}
          </View>
          {entry.fields.detail && <Text style={styles.bodyText}>{entry.fields.detail}</Text>}
          {Object.entries(entry.fields)
            .filter(([k]) => !titleFields.includes(k) && k !== "detail" && k !== "date")
            .map(([k, v]) => (
              <View key={k} style={styles.skillRow}>
                <Text style={styles.skillLabel}>{fieldLabel(sectionTmpl, k)}：</Text>
                <Text style={styles.skillValue}>{v}</Text>
              </View>
            ))}
        </View>
      ))}
    </View>
  )
}
