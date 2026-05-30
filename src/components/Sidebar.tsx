import { FileText, Settings, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SavedResume } from "@/env"

interface SidebarProps {
  templates: { name: string; label: string }[]
  activeTemplate: string | null
  onSelectTemplate: (name: string) => void
  onOpenSettings: () => void
  savedResumes: SavedResume[]
  activeResumeId: string | null
  onSelectResume: (id: string) => void
  onDeleteResume: (id: string) => void
}

export function Sidebar({
  templates,
  activeTemplate,
  onSelectTemplate,
  onOpenSettings,
  savedResumes,
  activeResumeId,
  onSelectResume,
  onDeleteResume,
}: SidebarProps) {
  return (
    <aside className="w-64 flex flex-col border-r border-border bg-sidebar">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-semibold">模板</h2>
      </div>
      <nav className="overflow-y-auto p-2 space-y-1">
        {templates.map((t) => (
          <button
            key={t.name}
            onClick={() => onSelectTemplate(t.name)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              activeTemplate === t.name && !activeResumeId
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </nav>

      {savedResumes.length > 0 && (
        <>
          <div className="px-4 py-2 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              保存的简历
            </h3>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {savedResumes.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                  activeResumeId === r.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground"
                )}
                onClick={() => onSelectResume(r.id)}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{r.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteResume(r.id)
                  }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </nav>
        </>
      )}

      <div className="p-3 border-t border-border">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}
