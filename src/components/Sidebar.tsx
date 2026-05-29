import { FileText, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  templates: { name: string; label: string }[]
  activeTemplate: string | null
  onSelectTemplate: (name: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ templates, activeTemplate, onSelectTemplate, onOpenSettings }: SidebarProps) {
  return (
    <aside className="w-64 flex flex-col border-r border-border bg-sidebar">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">模板</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {templates.map((t) => (
          <button
            key={t.name}
            onClick={() => onSelectTemplate(t.name)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              activeTemplate === t.name
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
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
