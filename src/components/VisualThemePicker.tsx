import { useCallback, useMemo, useRef, useState } from "react"
import type { VisualTheme } from "@/types/visual-template"

interface VisualThemePickerProps {
  themes: VisualTheme[]
  currentTheme: VisualTheme
  onChange: (theme: VisualTheme) => void
  avatarEnabled: boolean
  onAvatarEnabledChange: (enabled: boolean) => void
  hasAvatar: boolean
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
  avatarEnabled,
  onAvatarEnabledChange,
  hasAvatar,
}: VisualThemePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback((theme: VisualTheme) => {
    onChange(theme)
    setOpen(false)
  }, [onChange])

  const grouped = useMemo(() => {
    const v1 = themes.filter((t) => (t.series || "v1") === "v1")
    const v2 = themes.filter((t) => t.series === "v2")
    return [
      { key: "v2", label: SERIES_LABEL.v2, items: v2 },
      { key: "v1", label: SERIES_LABEL.v1, items: v1 },
    ].filter((g) => g.items.length > 0)
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left hover:bg-accent transition-colors ${
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
                  </button>
                ))}
              </div>
            ))}

            {hasAvatar && (
              <div className="border-t border-border/50 px-3 py-2.5 bg-accent/20 sticky bottom-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium">显示头像</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {avatarEnabled ? "已开启" : "已关闭"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAvatarEnabledChange(!avatarEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                      avatarEnabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        avatarEnabled ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
