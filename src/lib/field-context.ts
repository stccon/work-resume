import type { FieldLocator, PolishFieldPayload } from "@/types/inline-edit"
import type { TemplateDefinition } from "@/types/template"

function findFieldLabel(template: TemplateDefinition, sectionId: string, fieldKey: string): string {
  let subKey = fieldKey
  if (fieldKey.startsWith("entry") && fieldKey.includes("_")) {
    subKey = fieldKey.slice(fieldKey.indexOf("_") + 1)
  }
  const section = template.sections.find((s) => s.id === sectionId)
  if (section) {
    const f = section.fields.find((x) => x.id === subKey)
    if (f?.label) return f.label
  }
  return subKey
}

function findSectionLabel(template: TemplateDefinition, sectionId: string): string {
  return template.sections.find((s) => s.id === sectionId)?.label || sectionId
}

function getEntryNeighbors(
  data: any,
  locator: FieldLocator
): PolishFieldPayload["entryNeighbors"] | undefined {
  if (locator.entry === undefined) return undefined
  const sectionData = data.sections?.[locator.section]
  if (!sectionData) return undefined
  const entryIdx = locator.entry
  const result: PolishFieldPayload["entryNeighbors"] = {}
  const company = sectionData[`entry${entryIdx}_company`]
  const position = sectionData[`entry${entryIdx}_position`]
  const startDate = sectionData[`entry${entryIdx}_startDate`]
  const endDate = sectionData[`entry${entryIdx}_endDate`]
  if (company) result.company = company
  if (position) result.position = position
  if (startDate) result.startDate = startDate
  if (endDate) result.endDate = endDate
  return Object.keys(result).length > 0 ? result : undefined
}

export function buildPolishPayload(
  data: any,
  template: TemplateDefinition,
  locator: FieldLocator,
  targetRole: string,
  extraPrompt?: string
): PolishFieldPayload {
  const sectionLabel = findSectionLabel(template, locator.section)
  const fieldLabel = findFieldLabel(template, locator.section, locator.field)
  const fieldValue = data.sections?.[locator.section]?.[locator.field] || ""
  const entryNeighbors = getEntryNeighbors(data, locator)
  return {
    targetRole: targetRole || "",
    sectionId: locator.section,
    sectionLabel,
    fieldLabel,
    fieldValue,
    entryNeighbors,
    extraPrompt: extraPrompt?.trim() || undefined,
  }
}
