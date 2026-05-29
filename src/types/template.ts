export interface TemplateField {
  id: string
  label: string
  type: "text" | "textarea" | "date" | "list" | "skills"
  required: boolean
  order: number
  prompt: string
  followUpPrompt?: string
  placeholder?: string
}

export interface TemplateSection {
  id: string
  label: string
  fields: TemplateField[]
}

export interface TemplateDefinition {
  name: string
  label: string
  description: string
  sections: TemplateSection[]
}

export interface TemplateMeta {
  name: string
  label: string
  description: string
}
