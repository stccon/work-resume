import type { TemplateDefinition } from "@/types/template"
import generalTemplate from "../../templates/general.json"

const defaultTemplate = generalTemplate as TemplateDefinition

export function templateFieldsToString(template?: TemplateDefinition | null): string {
  const t = template || defaultTemplate
  return t.sections.map((section) =>
    `【${section.label}】\n` +
    section.fields.map((field) =>
      `  - ${field.label} (${field.id}) [${field.required ? "必填" : "选填"}] 提问: ${field.prompt}`
    ).join("\n")
  ).join("\n\n")
}
