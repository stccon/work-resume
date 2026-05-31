import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"

interface ResumePreviewProps {
  data: ResumeData
  template: TemplateDefinition
}

function getFieldLabel(sectionId: string, fieldId: string, template: TemplateDefinition): string {
  const section = template.sections.find((s) => s.id === sectionId)
  if (!section) return fieldId

  const field = section.fields.find((f) => f.id === fieldId)
  if (field) return field.label

  for (const f of section.fields) {
    if (fieldId.endsWith(`_${f.id}`) || fieldId.endsWith(f.id)) {
      return f.label
    }
    if (fieldId.startsWith(f.id) || fieldId.includes(f.id)) {
      return f.label
    }
  }

  const known: Record<string, string> = {
    name: "姓名",
    email: "邮箱",
    phone: "电话",
    date: "时间",
    tech: "技术栈",
    detail: "详细描述",
    projects: "项目经历",
    responsibilities: "职责",
    achievements: "成果",
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
    if (m) {
      prefixCounts.set(m[1], (prefixCounts.get(m[1]) || 0) + 1)
    }
  }
  for (const count of prefixCounts.values()) {
    if (count >= 3) return true
  }
  return false
}

function groupFieldsByEntry(fields: Record<string, string>): Array<{ index: number; fields: Record<string, string> }> {
  const groups = new Map<number, Record<string, string>>()
  const prefixes = new Set<string>()

  for (const key of Object.keys(fields)) {
    const m = key.match(/^([a-zA-Z]+)(\d+)_(.+)$/)
    if (m) {
      const idx = parseInt(m[2], 10)
      const subKey = m[3]
      prefixes.add(m[1])
      if (!groups.has(idx)) groups.set(idx, {})
      groups.get(idx)![subKey] = fields[key]
    }
  }

  const entries = Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([index, fieldData]) => ({
      index,
      fields: fieldData,
    }))

  if (entries.length === 0) {
    entries.push({ index: 0, fields: { ...fields } })
  }

  return entries
}

export function ResumePreview({ data, template }: ResumePreviewProps) {
  const multiEntrySections = ["experience", "education", "projects"]

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              {data.sections.personal?.name || data.sections.personal?.title || "简历"}
            </h1>
            {data.sections.personal?.title && (
              <p className="text-lg text-muted-foreground mt-1">{data.sections.personal.title}</p>
            )}
            <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
              {data.sections.personal?.email && <span>{data.sections.personal.email}</span>}
              {data.sections.personal?.phone && <span>{data.sections.personal.phone}</span>}
              {data.sections.personal?.github && <span>{data.sections.personal.github}</span>}
            </div>
          </div>

          {template.sections.map((section) => {
            const sectionData = data.sections[section.id]
            if (!sectionData || Object.keys(sectionData).length === 0) return null

            const isSummary = section.id === "summary"
            const isSkills = section.id === "skills"
            const isMulti = multiEntrySections.includes(section.id) && isMultiEntry(sectionData)

            return (
              <div key={section.id} className="mb-6">
                <h2 className="text-base font-bold text-foreground border-b-2 border-primary/30 pb-1 mb-3">
                  {section.label}
                </h2>

                {isSummary && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {formatValue(Object.values(sectionData)[0] || "")}
                  </p>
                )}

                {isSkills && (
                  <div className="space-y-2">
                    {section.fields.map((field) => {
                      const value = sectionData[field.id]
                      if (!value) return null
                      return (
                        <div key={field.id} className="flex text-sm">
                          <span className="text-muted-foreground w-24 shrink-0">{field.label}：</span>
                          <span className="text-foreground">{formatValue(value)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isMulti && (
                  <div className="space-y-4">
                    {groupFieldsByEntry(sectionData).map((entry) => (
                      <div key={entry.index} className="border-l-2 border-border pl-4">
                        {entry.fields.position && (
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h3 className="font-semibold text-sm">{entry.fields.position}</h3>
                              {entry.fields.company && (
                                <p className="text-xs text-muted-foreground">{entry.fields.company}</p>
                              )}
                            </div>
                            {entry.fields.date && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{entry.fields.date}</span>
                            )}
                          </div>
                        )}
                        {entry.fields.detail && (
                          <p className="text-sm text-foreground leading-relaxed mt-2 whitespace-pre-wrap">
                            {entry.fields.detail}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {Object.entries(entry.fields)
                            .filter(([k]) => !["position", "company", "date", "detail"].includes(k))
                            .map(([k, v]) => (
                              <div key={k} className="text-xs text-muted-foreground">
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
                  <div className="space-y-2">
                    {section.fields.map((field) => {
                      const value = sectionData[field.id]
                      if (!value) return null
                      return (
                        <div key={field.id} className="text-sm">
                          <span className="text-muted-foreground">{field.label}：</span>
                          <span className="text-foreground">{formatValue(value)}</span>
                        </div>
                      )
                    })}
                    {Object.entries(sectionData)
                      .filter(([k]) => !section.fields.some((f) => f.id === k))
                      .map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <span className="text-muted-foreground">{getFieldLabel(section.id, k, template)}：</span>
                          <span className="text-foreground">{formatValue(v)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}

          {data.completedAt && (
            <div className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
              生成时间：{new Date(data.completedAt).toLocaleString("zh-CN")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
