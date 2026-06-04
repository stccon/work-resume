import { useCallback, useEffect, useRef, useState } from "react"
import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"
import type { VisualTheme } from "@/types/visual-template"
import { renderResumeCSS, renderResumeBody } from "@/lib/resume-renderer"
import { getFieldFromElement, patchField, readField } from "@/lib/field-locator"
import type { FieldLocator } from "@/types/inline-edit"
import { FieldEditorDialog } from "@/components/FieldEditorDialog"

interface EditableResumePreviewProps {
  data: ResumeData
  template: TemplateDefinition
  visualTheme: VisualTheme
  targetRole?: string
  onChange: (next: ResumeData) => void
}

export function EditableResumePreview({
  data,
  template,
  visualTheme,
  targetRole,
  onChange,
}: EditableResumePreviewProps) {
  const css = renderResumeCSS(visualTheme)
  const bodyHtml = renderResumeBody(data, template, visualTheme)

  const containerRef = useRef<HTMLDivElement>(null)
  const [activeLocator, setActiveLocator] = useState<FieldLocator | null>(null)

  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    setActiveLocator(null)
  }, [data.template, data.completedAt, JSON.stringify(data.sections)])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return
    const target = e.target as HTMLElement
    if (target.classList?.contains("resume-avatar")) return
    if (target.closest("[data-no-edit]")) return
    const locator = getFieldFromElement(target)
    if (!locator) return
    e.preventDefault()
    setActiveLocator(locator)
  }, [])

  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.classList?.contains("resume-avatar")) return
    const locator = getFieldFromElement(target)
    if (!locator) return
    target.style.cursor = "text"
    target.classList.add("editable-preview-hover")
  }, [])

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    target.classList.remove("editable-preview-hover")
  }, [])

  const handleCommit = useCallback((newValue: string) => {
    if (!activeLocator) return
    onChange(patchField(dataRef.current, activeLocator, newValue))
    setActiveLocator(null)
  }, [activeLocator, onChange])

  const handleClose = useCallback(() => {
    setActiveLocator(null)
  }, [])

  const isFieldEditable = activeLocator
    ? readField(data, activeLocator) !== undefined
    : false

  return (
    <div className="max-w-3xl mx-auto p-8">
      <style>{`
        ${css}
        .editable-preview-hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.25) inset;
          border-radius: 2px;
        }
        .dark .editable-preview-hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
      <div
        className="rounded-xl shadow-sm border overflow-hidden relative"
        style={{ borderColor: visualTheme.colors.border }}
      >
        <div
          ref={containerRef}
          onClick={handleClick}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>

      <FieldEditorDialog
        open={!!activeLocator && isFieldEditable}
        locator={activeLocator}
        data={data}
        template={template}
        targetRole={targetRole}
        onClose={handleClose}
        onCommit={handleCommit}
      />
    </div>
  )
}
