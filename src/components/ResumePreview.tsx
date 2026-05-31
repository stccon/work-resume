import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"
import type { VisualTheme } from "@/types/visual-template"
import { renderResumeCSS, renderResumeBody } from "@/lib/resume-renderer"

interface ResumePreviewProps {
  data: ResumeData
  template: TemplateDefinition
  visualTheme: VisualTheme
}

export function ResumePreview({ data, template, visualTheme }: ResumePreviewProps) {
  const css = renderResumeCSS(visualTheme)
  const bodyHtml = renderResumeBody(data, template, visualTheme)

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: visualTheme.colors.border }}>
        <style>{css}</style>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
    </div>
  )
}
