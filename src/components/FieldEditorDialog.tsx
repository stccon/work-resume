import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkles, X, Loader2, Check, RefreshCw, Save, AlertCircle } from "lucide-react"
import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"
import type { FieldLocator } from "@/types/inline-edit"
import { readField } from "@/lib/field-locator"
import { buildPolishPayload } from "@/lib/field-context"
import { diffText, shouldComputeDiff, type DiffOp } from "@/lib/text-diff"
import { toast } from "@/components/Toast"

const MULTI_LINE_FIELD_HINTS = [
  "detail",
  "summary",
  "achievements",
  "responsibilities",
  "highlights",
  "description",
  "honors",
  "coursework",
]

interface FieldEditorDialogProps {
  open: boolean
  locator: FieldLocator | null
  data: ResumeData
  template: TemplateDefinition
  targetRole?: string
  onClose: () => void
  onCommit: (newValue: string) => void
}

type DialogState = "editing" | "polishing" | "diff"

export function FieldEditorDialog({
  open,
  locator,
  data,
  template,
  targetRole,
  onClose,
  onCommit,
}: FieldEditorDialogProps) {
  const [state, setState] = useState<DialogState>("editing")
  const [originalValue, setOriginalValue] = useState<string>("")
  const [editValue, setEditValue] = useState<string>("")
  const [polishedValue, setPolishedValue] = useState<string>("")
  const [extraPrompt, setExtraPrompt] = useState<string>("")
  const [dirty, setDirty] = useState<boolean>(false)
  const [showConfirmDiscard, setShowConfirmDiscard] = useState<boolean>(false)

  const requestIdRef = useRef<string | null>(null)
  const stateRef = useRef<DialogState>("editing")
  stateRef.current = state

  const isMultiLine = (key: string): boolean => {
    if (editValue.includes("\n")) return true
    return MULTI_LINE_FIELD_HINTS.some((h) => key.toLowerCase().includes(h))
  }

  useEffect(() => {
    if (!open || !locator) return
    const current = readField(data, locator)
    setOriginalValue(current)
    setEditValue(current)
    setPolishedValue("")
    setExtraPrompt("")
    setDirty(false)
    setState("editing")
    setShowConfirmDiscard(false)
  }, [open, locator, data])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleAttemptClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty, state])

  useEffect(() => {
    return () => {
      if (requestIdRef.current) {
        window.electronAPI.cancelPolish(requestIdRef.current).catch(() => {})
        requestIdRef.current = null
      }
    }
  }, [])

  const handleAttemptClose = useCallback(() => {
    const hasChanges = dirty || (state === "diff" && polishedValue !== originalValue)
    if (hasChanges && stateRef.current !== "polishing") {
      setShowConfirmDiscard(true)
      return
    }
    if (stateRef.current === "polishing" && requestIdRef.current) {
      window.electronAPI.cancelPolish(requestIdRef.current).catch(() => {})
      requestIdRef.current = null
    }
    onClose()
  }, [dirty, state, polishedValue, originalValue, onClose])

  const handleSave = useCallback(() => {
    onCommit(editValue)
  }, [editValue, onCommit])

  const handleAdopt = useCallback(() => {
    onCommit(editValue)
  }, [editValue, onCommit])

  const handleReject = useCallback(() => {
    setEditValue(originalValue)
    setDirty(false)
    setState("editing")
  }, [originalValue])

  const runPolish = useCallback(async (sourceValue: string) => {
    if (!locator) return
    setState("polishing")
    const payload = buildPolishPayload(data, template, locator, targetRole || "", extraPrompt)
    payload.fieldValue = sourceValue
    const requestId = `polish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    requestIdRef.current = requestId
    try {
      const result = await window.electronAPI.polishField(requestId, payload)
      if (requestIdRef.current !== requestId) return
      if (result.error) throw new Error(result.error)
      const polished = result.content
      if (!polished || polished === sourceValue) {
        toast("info", "AI 未做出修改")
        setState("editing")
        return
      }
      setPolishedValue(polished)
      setEditValue(polished)
      setDirty(polished !== originalValue)
      setState("diff")
    } catch (err: any) {
      if (requestIdRef.current !== requestId) return
      toast("error", `润色失败：${err?.message || String(err)}`)
      setState("editing")
    } finally {
      if (requestIdRef.current === requestId) {
        requestIdRef.current = null
      }
    }
  }, [locator, data, template, targetRole, extraPrompt, originalValue])

  const handlePolish = useCallback(() => {
    if (!editValue.trim()) {
      toast("info", "空字段无需润色")
      return
    }
    runPolish(editValue)
  }, [editValue, runPolish])

  const handleRePolish = useCallback(() => {
    runPolish(editValue)
  }, [editValue, runPolish])

  if (!open || !locator) return null

  const section = template.sections.find((s) => s.id === locator.section)
  const sectionLabel = section?.label || locator.section
  const fieldBaseKey = locator.field.includes("_") ? locator.field.slice(locator.field.indexOf("_") + 1) : locator.field
  const fieldLabel = section?.fields.find((f) => f.id === fieldBaseKey)?.label || fieldBaseKey
  const entryLabel = locator.entry !== undefined && locator.entry !== null
    ? `第 ${locator.entry + 1} 条`
    : null
  const neighborPreview = locator.entry !== undefined
    ? getNeighborPreview(data, locator)
    : null

  const showPolishButton = editValue.trim().length > 0
  const canSave = editValue !== originalValue || (state === "editing" && dirty)
  const useFullDiff = shouldComputeDiff(originalValue, editValue)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose()
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl bg-card border border-border shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold truncate">编辑：{fieldLabel}</h2>
              {state === "polishing" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />润色中
                </span>
              )}
              {state === "diff" && !useFullDiff && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  整体修改
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {sectionLabel}
              {entryLabel ? ` · ${entryLabel}` : ""}
              {neighborPreview ? ` · ${neighborPreview}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <span>原文</span>
                <span className="text-[10px] text-muted-foreground/70">（参考）</span>
              </div>
              <DiffPanel
                ops={useFullDiff ? diffText(originalValue, editValue) : null}
                originalText={originalValue}
                currentText={editValue}
                showDiff={useFullDiff}
                fallbackText={state === "diff" ? polishedValue : editValue}
                mode="original"
              />
            </div>
            <div className="flex flex-col">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <span>{state === "diff" ? "润色结果" : "当前内容"}</span>
                <span className="text-[10px] text-muted-foreground/70">（可编辑）</span>
              </div>
              {state === "polishing" ? (
                <div className="flex-1 min-h-[120px] flex items-center justify-center rounded-md border border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                    AI 思考中…
                  </div>
                </div>
              ) : (
                <textarea
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value)
                    setDirty(e.target.value !== originalValue)
                    if (state === "diff") {
                      setState("editing")
                    }
                  }}
                  className={cn(
                    "flex-1 min-h-[120px] p-2 rounded-md border bg-background text-sm font-sans",
                    "border-border focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400",
                    "resize-y whitespace-pre-wrap"
                  )}
                  placeholder="字段内容"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              给 AI 的额外偏好（可选）
            </label>
            <input
              type="text"
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              placeholder="例如：更简洁一点、突出量化成果、保持英文术语"
              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400"
              disabled={state === "polishing"}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {dirty && state === "editing" && editValue !== originalValue ? "有未保存的修改" : ""}
            {state === "diff" ? (
              <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <Check className="w-3 h-3" />润色完成，可微调后采纳
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {state === "editing" && (
              <>
                {showPolishButton && (
                  <button
                    type="button"
                    onClick={handlePolish}
                    className="text-xs px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 润色
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </button>
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
                >
                  取消
                </button>
              </>
            )}
            {state === "polishing" && (
              <button
                type="button"
                disabled
                className="text-xs px-3 py-1.5 rounded-md border border-border opacity-50 cursor-not-allowed"
              >
                <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />
                润色中…
              </button>
            )}
            {state === "diff" && (
              <>
                <button
                  type="button"
                  onClick={handleAdopt}
                  className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  采纳
                </button>
                <button
                  type="button"
                  onClick={handleRePolish}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新润色
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  拒绝
                </button>
              </>
            )}
          </div>
        </div>

        {showConfirmDiscard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-xl">
            <div className="bg-card border border-border rounded-lg p-4 max-w-sm mx-4 shadow-lg">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">放弃未保存的修改？</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    当前字段的修改将丢失。
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDiscard(false)}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
                >
                  继续编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDiscard(false)
                    onClose()
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
                >
                  放弃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DiffPanelProps {
  ops: DiffOp[] | null
  originalText: string
  currentText: string
  showDiff: boolean
  fallbackText: string
  mode: "original"
}

function DiffPanel({ ops, originalText, currentText, showDiff, fallbackText }: DiffPanelProps) {
  if (!showDiff || !ops) {
    return (
      <div
        className={cn(
          "flex-1 min-h-[120px] p-2 rounded-md border border-border bg-muted/30 text-sm font-sans",
          "whitespace-pre-wrap break-words text-muted-foreground"
        )}
      >
        {fallbackText || <span className="italic text-muted-foreground/60">（空）</span>}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex-1 min-h-[120px] p-2 rounded-md border border-border bg-muted/30 text-sm font-sans",
        "whitespace-pre-wrap break-words"
      )}
    >
      {ops.map((op, i) => {
        if (op.type === "unchanged") {
          return <span key={i}>{op.text}</span>
        }
        if (op.type === "removed") {
          return (
            <span
              key={i}
              className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through"
            >
              {op.text}
            </span>
          )
        }
        return null
      })}
    </div>
  )
}

function getNeighborPreview(data: ResumeData, locator: FieldLocator): string | null {
  if (locator.entry === undefined) return null
  const section = data.sections?.[locator.section]
  if (!section) return null
  const parts: string[] = []
  const pos = section[`entry${locator.entry}_position`]
  const comp = section[`entry${locator.entry}_company`]
  const school = section[`entry${locator.entry}_school`]
  const name = section[`entry${locator.entry}_name`]
  if (pos) parts.push(pos)
  if (comp) parts.push(comp)
  if (school) parts.push(school)
  if (name) parts.push(name)
  return parts.length > 0 ? parts.join(" · ") : null
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}
