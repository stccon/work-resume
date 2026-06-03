import { useState, useRef, DragEvent } from "react"
import { FileText, Settings, Plus, Trash2, FileUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  onOpenSettings: () => void
  savedResumes: SavedResume[]
  activeResumeId: string | null
  onSelectResume: (id: string) => void
  onDeleteResume: (id: string) => void
  onCreateResume: () => void
  onImportPdf: (file: File) => void
}

export function Sidebar({
  onOpenSettings,
  savedResumes,
  activeResumeId,
  onSelectResume,
  onDeleteResume,
  onCreateResume,
  onImportPdf,
}: SidebarProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onImportPdf(f)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.toLowerCase().endsWith(".pdf")) {
      onImportPdf(f)
    }
  }

  return (
    <aside
      className={cn(
        "w-64 flex flex-col border-r border-border bg-sidebar transition-colors",
        dragOver && "bg-primary/5 ring-2 ring-primary ring-inset",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-border space-y-2">
        <button
          onClick={onCreateResume}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>创建简历</span>
        </button>
        <button
          onClick={handleImportClick}
          title="选择简历文件导入"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors"
        >
          <FileUp className="w-4 h-4" />
          <span>导入简历</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {dragOver && (
          <p className="text-[10px] text-center text-primary font-medium">
            松开以导入简历
          </p>
        )}
      </div>

      {savedResumes.length > 0 && (
        <>
          <div className="px-4 py-2 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              我的简历
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
            还没有简历<br />
            点击创建或导入
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
