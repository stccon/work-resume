import { pdf } from "@react-pdf/renderer"
import React from "react"
import type { ResumeData } from "../src/types/resume"
import type { TemplateDefinition } from "../src/types/template"

async function importTemplate(name: string) {
  const templates: Record<string, any> = {
    technical: "TechnicalResume",
    general: "GeneralResume",
    management: "ManagementResume",
  }
  const componentName = templates[name]
  if (!componentName) return null
  try {
    const mod = await import(`../src/templates/${componentName}.tsx`)
    return mod[componentName]
  } catch {
    return null
  }
}

export async function renderPdfBuffer(
  data: ResumeData,
  template: TemplateDefinition,
): Promise<Buffer> {
  const Component = await importTemplate(data.template) || await importTemplate(template.name) || await importTemplate("general")
  if (!Component) {
    throw new Error(`未找到模板组件: ${data.template || template.name}`)
  }

  const instance = pdf(React.createElement(Component, { data, template }))
  instance.updateContainer(React.createElement(Component, { data, template }))
  return Buffer.from(await instance.toBuffer())
}
