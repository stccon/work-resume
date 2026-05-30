import { FileText, Settings, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"


interface SidebarProps {
  onOpenSettings: () => void
  savedResumes: SavedResume[]
  activeResumeId: string | null
  onSelectResume: (id: string) => void
  onDeleteResume: (id: string) => void
}

export function Sidebar({
  onOpenSettings,
  savedResumes,
  activeResumeId,
  onSelectResume,
  onDeleteResume,
}: SidebarProps) {
  return (
    <aside className="w-64 flex flex-col border-r border-border bg-sidebar">
      {savedResumes.length > 0 && (
        <>
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              保存的简历
            </h2>
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

      {savedResumes.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            还没有保存的简历<br />和 AI 对话来制作一份吧
          </p>
        </div>
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
