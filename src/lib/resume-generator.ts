import type { TemplateDefinition, TemplateField } from "@/types/template"

export function generatePromptFromMessage(template: TemplateDefinition, chatHistory: string): string {
  const fields = template.sections.flatMap((s) => s.fields)
  const requiredFields = fields.filter((f) => f.required).map((f) => f.label)

  return `你是一个简历助手。我正在根据以下模板为你生成简历。

模板：${template.label}

需要收集的信息（必填）：
${requiredFields.map((f) => `- ${f}`).join("\n")}

对话历史：
${chatHistory}

请根据已有信息，主动向用户询问缺失的信息。注意每次只问1-2个问题，不要一次性问太多。
如果信息已经收集完整，请总结并告知用户可以生成简历了。`
}

export function extractResumeData(
  chatHistory: string,
  template: TemplateDefinition
): any {
  const data: any = {
    template: template.name,
    sections: {},
  }

  for (const section of template.sections) {
    data.sections[section.id] = {}
  }

  return data
}

export function checkRequiredFields(
  data: any,
  template: TemplateDefinition
): { missing: TemplateField[]; complete: boolean } {
  const missing: TemplateField[] = []

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.required) {
        const value = data.sections[section.id]?.[field.id]
        if (!value) {
          missing.push(field)
        }
      }
    }
  }

  return { missing, complete: missing.length === 0 }
}
