import type { FieldLocator } from "@/types/inline-edit"

const DATA_SECTION = "data-section"
const DATA_FIELD = "data-field"
const DATA_ENTRY = "data-entry"

export function getFieldFromElement(el: HTMLElement | null): FieldLocator | null {
  let cur: HTMLElement | null = el
  while (cur) {
    const section = cur.getAttribute(DATA_SECTION)
    const field = cur.getAttribute(DATA_FIELD)
    if (section && field) {
      const entryAttr = cur.getAttribute(DATA_ENTRY)
      const locator: FieldLocator = { section, field }
      if (entryAttr !== null && entryAttr !== "") {
        const n = parseInt(entryAttr, 10)
        if (!Number.isNaN(n)) locator.entry = n
      }
      return locator
    }
    cur = cur.parentElement
  }
  return null
}

export function readField(data: any, locator: FieldLocator): string {
  const sectionData = data.sections?.[locator.section]
  if (!sectionData) return ""
  return sectionData[locator.field] || ""
}

export function patchField(
  data: any,
  locator: FieldLocator,
  newValue: string
): any {
  const sectionData = data.sections?.[locator.section]
  if (!sectionData) return data
  if (sectionData[locator.field] === newValue) return data
  return {
    ...data,
    sections: {
      ...data.sections,
      [locator.section]: {
        ...sectionData,
        [locator.field]: newValue,
      },
    },
  }
}
