import type { TemplateDefinition } from "@/types/template"

interface TemplatePreviewProps {
  template: TemplateDefinition
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">简历预览</h1>
        <p className="text-sm text-muted-foreground mt-1">{template.label}</p>
      </div>

      {template.sections.map((section) => (
        <div key={section.id} className="mb-6">
          <h2 className="text-lg font-semibold border-b border-border pb-1 mb-3">
            {section.label}
          </h2>
          <div className="space-y-4">
            {section.fields.map((field) => (
              <div key={field.id} className="text-sm">
                <span className="text-muted-foreground">{field.label}：</span>
                <span className="text-foreground">
                  {field.required ? "" : "（选填）"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
