import { useCallback, useRef, useState } from "react"
import type { VisualTheme } from "@/types/visual-template"

interface VisualThemePickerProps {
  themes: VisualTheme[]
  currentTheme: VisualTheme
  onChange: (theme: VisualTheme) => void
}

export function VisualThemePicker({ themes, currentTheme, onChange }: VisualThemePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback((theme: VisualTheme) => {
    onChange(theme)
    setOpen(false)
  }, [onChange])

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
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleSelect(theme)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left hover:bg-accent transition-colors ${
                  theme.name === currentTheme.name ? "bg-accent font-medium" : ""
                }`}
              >
                <div className="flex -space-x-1">
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
                  <div className="truncate">{theme.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{theme.description}</div>
                </div>
                {theme.layout === "two-column" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground shrink-0">
                    双栏
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
