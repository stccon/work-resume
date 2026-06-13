import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition, TemplateField } from "@/types/template"
import type { VisualTheme } from "@/types/visual-template"

function esc(s: unknown): string {
  if (typeof s !== "string") return ""
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderCSS(theme: VisualTheme, scopePrefix = ""): string {
  const t = theme
  const c = t.colors as unknown as Record<string, string>
  const parts: string[] = []

  function prop(k: string, v: string) { return `${k}:${v};` }
  function nl(map: Record<string, string>) { return Object.entries(map).map(([k, v]) => prop(k, v)).join("\n") }
  function sec(sel: string, map: Record<string, string>) { return `${sel} {\n${nl(map)}\n}` }

  function tyProps(e: { size: string; weight: number; lineHeight: string; letterSpacing?: string; transform?: string }): Record<string, string> {
    const r: Record<string, string> = {
      "font-size": e.size,
      "font-weight": String(e.weight),
      "line-height": e.lineHeight,
    }
    if (e.letterSpacing) r["letter-spacing"] = e.letterSpacing
    if (e.transform && e.transform !== "none") r["text-transform"] = e.transform
    return r
  }

  const starSel = scopePrefix ? `${scopePrefix} *` : "*"
  parts.push(sec(starSel, { "margin": "0", "padding": "0", "box-sizing": "border-box" }))

  const bodyBase: Record<string, string> = {
    "font-family": t.fonts.body,
    "color": c["text"],
    "background": c["background"],
    "-webkit-print-color-adjust": "exact",
    "print-color-adjust": "exact",
  }
  if (t.print.tabularNums) bodyBase["font-variant-numeric"] = "tabular-nums"
  const bodySel = scopePrefix || "body"
  parts.push(sec(bodySel, bodyBase))
  parts.push(sec(".resume-name", { ...tyProps(t.typography.name), "color": c["primary"] }))
  parts.push(sec(".resume-title", { ...tyProps(t.typography.title), "color": c["text"] }))
  parts.push(sec(".resume-section-title", { ...tyProps(t.typography.sectionTitle), "color": c["primary"], "margin-bottom": "8px" }))

  const rule = t.sectionTitleRule
  if (rule === "short-line") {
    parts.push(sec(".resume-section-title::after", {
      "content": '""', "display": "block",
      "width": t.sectionTitleRuleWidth || "32px",
      "height": t.sectionTitleRuleHeight || "1.5px",
      "background": c["primary"], "margin-top": t.sectionTitleRuleOffset || "8px",
    }))
  } else if (rule === "full-line") {
    parts.push(sec(".resume-section-title::after", {
      "content": '""', "display": "block",
      "width": t.sectionTitleRuleWidth || "100%",
      "height": t.sectionTitleRuleHeight || "0.5px",
      "background": c["border"], "margin-top": t.sectionTitleRuleOffset || "12px",
    }))
  } else if (rule === "double-line") {
    parts.push(sec(".resume-section-title::after", {
      "content": '""', "display": "block",
      "width": t.sectionTitleRuleWidth || "100%",
      "height": t.sectionTitleRuleHeight || "2px",
      "background": c["border"], "margin-top": t.sectionTitleRuleOffset || "8px",
      "border-bottom": `1px solid ${c["border"]}`,
    }))
  } else if (rule === "boxed") {
    parts.push(sec(".resume-section-title", { "background": c["surface"], "padding": "4px 8px", "display": "inline-block" }))
  }

  parts.push(sec(".resume-body", { "padding": t.spacing.pagePadding, ...tyProps(t.typography.body) }))
  parts.push(sec(".resume-section", { "margin-bottom": t.spacing.sectionGap }))
  parts.push(sec(".resume-section:last-child", { "margin-bottom": "0" }))
  parts.push(sec(".resume-entry", { "margin-bottom": t.spacing.entryGap }))
  parts.push(sec(".resume-entry:last-child", { "margin-bottom": "0" }))
  parts.push(sec(".resume-entry-title", tyProps(t.typography.entryTitle)))
  parts.push(sec(".resume-entry-date", { ...tyProps(t.typography.entryDate), "color": c["muted"], "font-family": t.fonts.mono }))
  parts.push(sec(".resume-contact", { ...tyProps(t.typography.body), "color": c["text"], "margin-bottom": "12px" }))
  parts.push(sec(".resume-contact-item", { "display": "inline-block", "margin-right": "16px" }))
  parts.push(sec(".resume-contact a", { "color": c["accent"], "text-decoration": "none" }))

  const tagDecl: Record<string, string> = { "display": "inline-block", "margin": "2px 4px 2px 0" }
  if (t.tagStyle === "pill") { tagDecl["background"] = c["surface"]; tagDecl["border-radius"] = "999px"; tagDecl["padding"] = "2px 10px" }
  else if (t.tagStyle === "flat") { tagDecl["background"] = c["surface"]; tagDecl["padding"] = "2px 8px" }
  else if (t.tagStyle === "underline") { tagDecl["border-bottom"] = `1px solid ${c["border"]}`; tagDecl["padding-bottom"] = "1px" }
  parts.push(sec(".resume-tag", tagDecl))

  parts.push(sec(".resume-highlights-list", {
    "list-style": t.bullet === "none" ? "none" : `"${t.bullet} "`,
    "padding-left": t.bullet === "none" ? "0" : "1.2em",
    "margin": "4px 0",
  }))
  parts.push(sec(".resume-highlights-list li", { "margin-bottom": "2px" }))

  if (t.hasAvatar) {
    const a = t.avatar!
    const size = a.size === "large" ? "96px" : a.size === "medium" ? "64px" : "40px"
    const avDecl: Record<string, string> = { "width": size, "height": size, "object-fit": "cover" }
    avDecl["border-radius"] = a.shape === "circle" ? "50%" : a.shape === "rounded" ? "8px" : "0"
    if (a.border === "thin") avDecl["border"] = `1px solid ${c["border"]}`
    else if (a.border === "thick") avDecl["border"] = `3px solid ${c["border"]}`
    else if (a.border === "colored") avDecl["border"] = `2px solid ${c["primary"]}`
    parts.push(sec(".resume-avatar", avDecl))

    const monoDecl: Record<string, string> = { "width": size, "height": size, "display": "flex", "align-items": "center", "justify-content": "center" }
    monoDecl["border-radius"] = a.shape === "circle" ? "50%" : a.shape === "rounded" ? "8px" : "0"
    if (a.border === "thin") monoDecl["border"] = `1px solid ${c["border"]}`
    else if (a.border === "thick") monoDecl["border"] = `3px solid ${c["border"]}`
    else if (a.border === "colored") monoDecl["border"] = `2px solid ${c["primary"]}`
    monoDecl["background"] = c["surface"]
    monoDecl["font-size"] = a.size === "large" ? "32px" : a.size === "medium" ? "22px" : "14px"
    monoDecl["font-weight"] = "700"
    monoDecl["color"] = c["text"]
    monoDecl["font-family"] = t.fonts.heading
    parts.push(sec(".resume-monogram", monoDecl))
  }

  if (t.layout === "two-column") {
    parts.push(sec(".resume-two-column", { "display": "flex", "min-height": "100%" }))
    parts.push(sec(".resume-sidebar", {
      "width": t.sidebarWidth || "34%",
      "background": t.sidebarBg || "#f5f5f5",
      "color": t.sidebarText || "inherit",
      "padding": t.spacing.pagePadding,
      "flex-shrink": "0",
    }))
    parts.push(sec(".resume-sidebar .resume-section-title", { "color": t.sidebarText || "inherit" }))
    if (t.sidebarText) {
      parts.push(sec(".resume-sidebar .resume-tag", { "background": "rgba(255,255,255,0.1)", "color": t.sidebarText }))
    }
    parts.push(sec(".resume-main", { "flex": "1", "padding": t.spacing.pagePadding }))
  }

  if (t.print.pageBreakInsideEntry) {
    parts.push(`@media print {\n.resume-entry {\npage-break-inside:avoid;\n}\n}`)
  }

  if (t.print.hanLatinSpacing) {
    parts.push(sec(".resume-body", { "word-spacing": t.print.hanLatinSpacing }))
  }

  return parts.join("\n\n")
}

function getEntries(sectionData: Record<string, string>): number[] {
  const set = new Set<number>()
  for (const key of Object.keys(sectionData)) {
    const m = key.match(/^entry(\d+)_/)
    if (m) set.add(parseInt(m[1], 10))
  }
  return Array.from(set).sort((a, b) => a - b)
}

function renderSection(
  sectionId: string,
  label: string,
  fields: TemplateDefinition["sections"][number]["fields"],
  sectionData: Record<string, string>,
  isSidebar: boolean,
): string {
  const entries = getEntries(sectionData)
  const hasData = entries.length > 0 || Object.values(sectionData).some((v) => v?.trim())

  if (!hasData) return ""

  const bodyHtml = renderSectionBody(sectionId, fields, sectionData, entries, isSidebar)
  if (!bodyHtml.trim()) return ""

  return `<div class="resume-section" data-section="${sectionId}">
  <h2 class="resume-section-title">${esc(label)}</h2>
  ${bodyHtml}
</div>`
}

function renderSectionBody(
  sectionId: string,
  fields: TemplateDefinition["sections"][number]["fields"],
  sectionData: Record<string, string>,
  entries: number[],
  isSidebar: boolean,
): string {
  if (sectionId === "personal") {
    return renderPersonal(sectionData)
  }
  if (entries.length > 0) {
    return renderEntrySection(sectionId, fields, sectionData, entries)
  }
  const nonEntryFields = fields.filter((f) => sectionData[f.id]?.trim())
  if (nonEntryFields.length === 0) return ""
  return nonEntryFields.map((f) => renderField(sectionId, f, sectionData[f.id], isSidebar)).join("\n")
}

function renderPersonal(data: Record<string, string>): string {
  const parts: string[] = []

  if (data.name) {
    parts.push(`<h1 class="resume-name" data-section="personal" data-field="name">${esc(data.name)}</h1>`)
  }
  if (data.title) {
    parts.push(`<div class="resume-title" data-section="personal" data-field="title">${esc(data.title)}</div>`)
  }

  const contact: string[] = []
  if (data.email) contact.push(`<span class="resume-contact-item" data-section="personal" data-field="email">${esc(data.email)}</span>`)
  if (data.phone) contact.push(`<span class="resume-contact-item" data-section="personal" data-field="phone">${esc(data.phone)}</span>`)
  if (data.location) contact.push(`<span class="resume-contact-item" data-section="personal" data-field="location">${esc(data.location)}</span>`)
  if (data.linkedin) contact.push(`<a class="resume-contact-item" href="${esc(data.linkedin)}" data-section="personal" data-field="linkedin">${esc(data.linkedin)}</a>`)
  if (data.github) contact.push(`<a class="resume-contact-item" href="${esc(data.github)}" data-section="personal" data-field="github">${esc(data.github)}</a>`)

  if (contact.length > 0) {
    parts.push(`<div class="resume-contact">${contact.join("")}</div>`)
  }

  return parts.join("\n")
}

function renderField(
  sectionId: string,
  field: TemplateField,
  value: string,
  isSidebar: boolean,
): string {
  if (!value?.trim()) return ""

  if (field.type === "textarea") {
    const lines = value.split("\n").filter(Boolean)
    if (lines.length <= 1) {
      return `<p class="resume-entry-body" data-section="${sectionId}" data-field="${field.id}">${esc(value)}</p>`
    }
    const items = lines.map((l) => `<li>${esc(l)}</li>`).join("")
    return `<ul class="resume-highlights-list" data-section="${sectionId}" data-field="${field.id}">${items}</ul>`
  }

  if (field.type === "skills") {
    const skills = value.split(",").map((s) => s.trim()).filter(Boolean)
    if (skills.length === 0) return ""
    const tags = skills.map((s) => `<span class="resume-tag" data-section="${sectionId}" data-field="${field.id}">${esc(s)}</span>`).join("")
    return `<div>${tags}</div>`
  }

  return `<div data-section="${sectionId}" data-field="${field.id}">${esc(value)}</div>`
}

function renderEntrySection(
  sectionId: string,
  fields: TemplateDefinition["sections"][number]["fields"],
  sectionData: Record<string, string>,
  entries: number[],
): string {
  return entries.map((n) => {
    const getVal = (fid: string) => sectionData[`entry${n}_${fid}`] || ""
    const getField = (id: string) => fields.find((f) => f.id === id)

    const first = fields.find((f) => getVal(f.id))
    if (!first) return ""

    const titleField = fields.find((f) => f.type === "text" && (f.id === "company" || f.id === "school" || f.id === "position" || f.id === "name"))
    const dateField = fields.find((f) => f.type === "date")

    const titleVal = titleField ? getVal(titleField.id) : getVal(first.id) || ""
    const startDate = dateField ? getVal(dateField.id) : ""
    const endDate = dateField ? getVal(`${n}_endDate`) : ""

    let html = `<div class="resume-entry" data-section="${sectionId}" data-entry="${n}">`

    if (titleVal) {
      const tf = titleField || first
      html += `<div class="resume-entry-title" data-section="${sectionId}" data-field="entry${n}_${tf.id}">${esc(titleVal)}</div>`
    }

    if (startDate || endDate) {
      const dateStr = [startDate, endDate].filter(Boolean).join(" — ")
      const df = dateField!
      html += `<div class="resume-entry-date" data-section="${sectionId}" data-field="entry${n}_${df.id}">${esc(dateStr)}</div>`
    }

    for (const f of fields) {
      if (f === titleField || f === dateField) continue
      if (f.type === "date") continue
      const val = getVal(f.id)
      if (!val) continue
      html += `<div style="margin-top:4px">`
      html += renderField(sectionId, f, val, false)
      html += `</div>`
    }

    html += `</div>`
    return html
  }).filter(Boolean).join("\n")
}

function buildBody(
  data: ResumeData,
  template: TemplateDefinition,
  theme: VisualTheme,
): string {
  const t = theme
  const sections = t.sectionOrder
    .map((sid) => template.sections.find((s) => s.id === sid))
    .filter((s): s is TemplateDefinition["sections"][number] => s !== undefined)

  if (t.layout === "two-column") {
    const sidebarSections: string[] = []
    const mainSections: string[] = []

    sections.forEach((s, idx) => {
      const sectionData = data.sections[s.id] || {}
      const html = renderSection(s.id, s.label, s.fields, sectionData, idx % 2 === 0)
      if (!html.trim()) return
      if (idx % 2 === 0) {
        sidebarSections.push(html)
      } else {
        mainSections.push(html)
      }
    })

    const sidebarAvatar = t.hasAvatar ? renderAvatar(data) : ""

    return `<div class="resume-two-column">
  <div class="resume-sidebar">
    ${sidebarAvatar}
    ${sidebarSections.join("\n    ")}
  </div>
  <div class="resume-main">
    ${mainSections.join("\n    ")}
  </div>
</div>`
  }

  return sections
    .map((s) => {
      const sectionData = data.sections[s.id] || {}
      return renderSection(s.id, s.label, s.fields, sectionData, false)
    })
    .filter(Boolean)
    .join("\n")
}

function renderAvatar(data: ResumeData): string {
  const personal = data.sections.personal || {}
  const name = personal.name || ""
  const monogram = name ? name.charAt(0).toUpperCase() : "?"
  return `<div class="resume-avatar-wrap" style="text-align:center;margin-bottom:24px">
  <div class="resume-monogram">${esc(monogram)}</div>
</div>`
}

export function renderResumeCSS(theme: VisualTheme): string {
  return renderCSS(theme, ".resume-preview")
}

export function renderResumeBody(
  data: ResumeData,
  template: TemplateDefinition,
  theme: VisualTheme,
): string {
  const body = buildBody(data, template, theme)
  return `<div class="resume-preview"><div class="resume-body">\n${body}\n</div></div>`
}

export function renderResumeDocument(
  data: ResumeData,
  template: TemplateDefinition,
  theme: VisualTheme,
  _fileName?: string,
): string {
  const css = renderCSS(theme)
  const body = renderResumeBody(data, template, theme)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>`
}
