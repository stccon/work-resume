import { useCallback, useMemo, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import type { VisualTheme } from "@/types/visual-template"
import { toast } from "./Toast"

interface VisualThemePickerProps {
  themes: VisualTheme[]
  currentTheme: VisualTheme
  onChange: (theme: VisualTheme) => void
  onDeleteImported?: (themeName: string) => void
}

const FAMILY_LABEL: Record<string, string> = {
  minimal: "极简",
  modern: "商务",
  editorial: "编辑",
}

const SERIES_LABEL: Record<string, string> = {
  v1: "经典",
  v2: "Premium",
}

export function VisualThemePicker({
  themes,
  currentTheme,
  onChange,
  onDeleteImported,
}: VisualThemePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback((theme: VisualTheme) => {
    onChange(theme)
    setOpen(false)
  }, [onChange])

  const handleDelete = useCallback((e: React.MouseEvent, theme: VisualTheme) => {
    e.stopPropagation()
    e.preventDefault()
    if (!onDeleteImported) return
    const ok = window.confirm(`确定删除导入的主题"${theme.label}"？此操作无法撤销。`)
    if (!ok) return
    onDeleteImported(theme.name)
  }, [onDeleteImported])

  const grouped = useMemo(() => {
    const imported = themes.filter((t) => t.isImported)
    const v1 = themes.filter((t) => !t.isImported && (t.series || "v1") === "v1")
    const v2 = themes.filter((t) => !t.isImported && t.series === "v2")
    const groups = [
      { key: "v2", label: SERIES_LABEL.v2, items: v2 },
      { key: "v1", label: SERIES_LABEL.v1, items: v1 },
    ]
    if (imported.length > 0) {
      groups.unshift({ key: "imported", label: "导入主题", items: imported })
    }
    return groups.filter((g) => g.items.length > 0)
  }, [themes])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: currentTheme.colors.primary }}
        />
        <span>{currentTheme.label}</span>
        {(currentTheme.series === "v2") && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
            PRO
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[520px] overflow-y-auto">
            {grouped.map((group) => (
              <div key={group.key}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-accent/40 border-b border-border/50 sticky top-0">
                  {group.label}
                </div>
                {group.items.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => handleSelect(theme)}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left hover:bg-accent transition-colors ${
                      theme.name === currentTheme.name ? "bg-accent font-medium" : ""
                    }`}
                  >
                    <div className="flex -space-x-1 shrink-0">
                      <span
                        className="w-3 h-3 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <span
                        className="w-3 h-3 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: theme.colors.primaryLight }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{theme.label}</span>
                        {theme.series === "v2" && theme.family && (
                          <span className="text-[9px] px-1 py-px rounded bg-accent text-muted-foreground shrink-0">
                            {FAMILY_LABEL[theme.family] || theme.family}
                          </span>
                        )}
                        {theme.isImported && theme.confidence !== undefined && (
                          <span className="text-[9px] px-1 py-px rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                            {Math.round(theme.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {theme.description}
                      </div>
                    </div>
                    {theme.layout === "two-column" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground shrink-0">
                        双栏
                      </span>
                    )}
                    {theme.isImported && onDeleteImported && (
                      <button
                        onClick={(e) => handleDelete(e, theme)}
                        title="删除导入主题"
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
