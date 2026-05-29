import { useState } from "react"
import { X, Sun, Moon, Key } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  theme: "light" | "dark"
  onToggleTheme: () => void
  models: string[]
  currentModel: string
  onSelectModel: (model: string) => void
}

export function SettingsDialog({
  open,
  onClose,
  theme,
  onToggleTheme,
  models,
  currentModel,
  onSelectModel,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">设置</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm">主题</span>
            <button
              onClick={onToggleTheme}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border",
                "hover:bg-accent transition-colors"
              )}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "浅色" : "深色"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI 模型</label>
            <select
              value={currentModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center gap-1">
                <Key className="w-3 h-3" />
                API Key（可选）
              </div>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入自定义 API Key..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-1">留空则使用默认免费模型</p>
          </div>
        </div>
      </div>
    </div>
  )
}
