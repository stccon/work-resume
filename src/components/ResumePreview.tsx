import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"
import type { VisualTheme } from "@/types/visual-template"

interface ResumePreviewProps {
  data: ResumeData
  template: TemplateDefinition
  visualTheme: VisualTheme
}

function getFieldLabel(sectionId: string, fieldId: string, template: TemplateDefinition): string {
  const section = template.sections.find((s) => s.id === sectionId)
  if (!section) return fieldId
  const field = section.fields.find((f) => f.id === fieldId)
  if (field) return field.label
  for (const f of section.fields) {
    if (fieldId.endsWith(`_${f.id}`) || fieldId.endsWith(f.id)) return f.label
    if (fieldId.startsWith(f.id) || fieldId.includes(f.id)) return f.label
  }
  const known: Record<string, string> = {
    name: "姓名", email: "邮箱", phone: "电话", date: "时间", tech: "技术栈",
    detail: "详细描述", projects: "项目经历", responsibilities: "职责", achievements: "成果",
  }
  for (const [key, label] of Object.entries(known)) {
    if (fieldId.includes(key)) return label
  }
  return fieldId
}

function formatValue(value: any): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function isMultiEntry(fields: Record<string, string>): boolean {
  const keys = Object.keys(fields)
  if (keys.length === 0) return false
  const prefixCounts = new Map<string, number>()
  for (const key of keys) {
    const m = key.match(/^([a-zA-Z]+)(\d+)_/)
    if (m) prefixCounts.set(m[1], (prefixCounts.get(m[1]) || 0) + 1)
  }
  for (const count of prefixCounts.values()) {
    if (count >= 3) return true
  }
  return false
}

function groupFieldsByEntry(fields: Record<string, string>): Array<{ index: number; fields: Record<string, string> }> {
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
  if (entries.length === 0) entries.push({ index: 0, fields: { ...fields } })
  return entries
}

function sectionTitleStyle(theme: VisualTheme) {
  const base = {
    fontSize: theme.typography.sectionTitleFontSize,
    fontWeight: 700 as const,
    marginBottom: "8px",
  }
  if (theme.sectionStyle === "underlined") {
    return { ...base, color: theme.colors.primary, borderBottom: `2px solid ${theme.colors.primary}`, paddingBottom: "4px" }
  }
  if (theme.sectionStyle === "colored-bg") {
    return { ...base, color: "#fff", backgroundColor: theme.colors.primary, padding: "4px 10px", borderRadius: "4px" }
  }
  return { ...base, color: theme.colors.text }
}

function ResumeSection({ section, sectionData, theme, template, sidebar }: {
  section: any
  sectionData: Record<string, string>
  theme: VisualTheme
  template: TemplateDefinition
  sidebar?: boolean
}) {
  const isSummary = section.id === "summary"
  const isSkills = section.id === "skills"
  const isMulti = ["experience", "education", "projects"].includes(section.id) && isMultiEntry(sectionData)
  const textColor = sidebar ? (theme.colors.sidebarText || "#fff") : theme.colors.text
  const mutedColor = sidebar ? `${theme.colors.sidebarText || "#fff"}cc` : theme.colors.textMuted

  return (
    <div style={{ marginBottom: theme.spacing.sectionGap }}>
      <h2 style={sectionTitleStyle(theme)}>{section.label}</h2>

      {isSummary && (
        <p style={{ fontSize: theme.typography.bodyFontSize, color: textColor, lineHeight: theme.typography.lineHeight, whiteSpace: "pre-wrap" }}>
          {formatValue(Object.values(sectionData)[0] || "")}
        </p>
      )}

      {isSkills && (
        <div className="space-y-1.5">
          {section.fields.map((field: any) => {
            const value = sectionData[field.id]
            if (!value) return null
            return (
              <div key={field.id} className="flex" style={{ fontSize: theme.typography.bodyFontSize }}>
                <span className="shrink-0" style={{ color: mutedColor, width: sidebar ? "80px" : "96px" }}>{field.label}：</span>
                <span style={{ color: textColor }}>{formatValue(value)}</span>
              </div>
            )
          })}
        </div>
      )}

      {isMulti && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {groupFieldsByEntry(sectionData).map((entry) => (
            <div key={entry.index} style={{ borderLeft: `2px solid ${theme.colors.border}`, paddingLeft: "12px" }}>
              {entry.fields.position && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: theme.typography.bodyFontSize, color: textColor }}>{entry.fields.position}</div>
                    {entry.fields.company && <div style={{ fontSize: "11px", color: mutedColor }}>{entry.fields.company}</div>}
                  </div>
                  {entry.fields.date && <span style={{ fontSize: "11px", color: mutedColor, whiteSpace: "nowrap", marginLeft: "12px" }}>{entry.fields.date}</span>}
                </div>
              )}
              {entry.fields.detail && (
                <p style={{ fontSize: theme.typography.bodyFontSize, color: textColor, lineHeight: theme.typography.lineHeight, marginTop: "6px", whiteSpace: "pre-wrap" }}>
                  {entry.fields.detail}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1 mt-1">
                {Object.entries(entry.fields)
                  .filter(([k]) => !["position", "company", "date", "detail", "startDate", "endDate"].includes(k))
                  .map(([k, v]) => (
                    <div key={k} style={{ fontSize: "11px", color: mutedColor }}>
                      <span>{getFieldLabel(section.id, k, template)}：</span>
                      <span>{formatValue(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isSummary && !isSkills && !isMulti && (
        <div className="space-y-1.5">
          {section.fields.map((field: any) => {
            const value = sectionData[field.id]
            if (!value) return null
            return (
              <div key={field.id} style={{ fontSize: theme.typography.bodyFontSize }}>
                <span style={{ color: mutedColor }}>{field.label}：</span>
                <span style={{ color: textColor }}>{formatValue(value)}</span>
              </div>
            )
          })}
          {Object.entries(sectionData)
            .filter(([k]) => !section.fields.some((f: any) => f.id === k))
            .map(([k, v]) => (
              <div key={k} style={{ fontSize: theme.typography.bodyFontSize }}>
                <span style={{ color: mutedColor }}>{getFieldLabel(section.id, k, template)}：</span>
                <span style={{ color: textColor }}>{formatValue(v)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function ResumePreview({ data, template, visualTheme }: ResumePreviewProps) {
  const t = visualTheme.typography
  const c = visualTheme.colors
  const s = visualTheme.spacing
  const name = data.sections.personal?.name || data.sections.personal?.title || "简历"
  const title = data.sections.personal?.title || ""
  const email = data.sections.personal?.email || ""
  const phone = data.sections.personal?.phone || ""
  const github = data.sections.personal?.github || ""

  const sidebarSections = ["personal", "skills"]
  const mainSections = (template.sections || []).filter((sec) => !sidebarSections.includes(sec.id))

  if (visualTheme.layout === "two-column") {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: c.border, display: "flex", minHeight: "500px" }}>
          <div style={{ width: "35%", backgroundColor: c.sidebarBg || c.primary, padding: s.pagePadding }}>
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <div style={{ fontSize: t.nameFontSize, fontWeight: 700, color: c.sidebarText || "#fff" }}>{name}</div>
              {title && <div style={{ fontSize: t.titleFontSize, color: `${c.sidebarText || "#fff"}cc`, marginTop: "4px" }}>{title}</div>}
              <div style={{ fontSize: "10px", color: `${c.sidebarText || "#fff"}99`, marginTop: "8px" }}>
                {[email, phone, github].filter(Boolean).join(" | ")}
              </div>
            </div>
            {sidebarSections.map((secId) => {
              const section = template.sections.find((s) => s.id === secId)
              const sectionData = data.sections[secId]
              if (!section || !sectionData || Object.keys(sectionData).length === 0) return null
              return <ResumeSection key={secId} section={section} sectionData={sectionData} theme={visualTheme} template={template} sidebar />
            })}
          </div>
          <div style={{ width: "65%", padding: s.pagePadding, backgroundColor: c.background }}>
            {mainSections.map((section) => {
              const sectionData = data.sections[section.id]
              if (!sectionData || Object.keys(sectionData).length === 0) return null
              return <ResumeSection key={section.id} section={section} sectionData={sectionData} theme={visualTheme} template={template} />
            })}
            {data.completedAt && (
              <div className="text-center" style={{ fontSize: "10px", color: c.textMuted, marginTop: "24px", paddingTop: "12px", borderTop: `1px solid ${c.border}` }}>
                生成时间：{new Date(data.completedAt).toLocaleString("zh-CN")}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: c.border, backgroundColor: c.background }}>
        <div style={{ padding: s.pagePadding }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1 style={{ fontSize: t.nameFontSize, fontWeight: 700, color: c.text, margin: 0 }}>{name}</h1>
            {title && <p style={{ fontSize: t.titleFontSize, color: c.textMuted, marginTop: "4px" }}>{title}</p>}
            <div style={{ fontSize: "11px", color: c.textMuted, marginTop: "8px", display: "flex", justifyContent: "center", gap: "12px" }}>
              {email && <span>{email}</span>}
              {phone && <span>{phone}</span>}
              {github && <span>{github}</span>}
            </div>
          </div>

          {template.sections.map((section) => {
            const sectionData = data.sections[section.id]
            if (!sectionData || Object.keys(sectionData).length === 0) return null
            return <ResumeSection key={section.id} section={section} sectionData={sectionData} theme={visualTheme} template={template} />
          })}

          {data.completedAt && (
            <div className="text-center" style={{ fontSize: "10px", color: c.textMuted, marginTop: "24px", paddingTop: "12px", borderTop: `1px solid ${c.border}` }}>
              生成时间：{new Date(data.completedAt).toLocaleString("zh-CN")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
