import { useCallback, useRef, useState } from "react"
import { Camera, ChevronDown, Trash2, Upload, User } from "lucide-react"
import { validateAvatarFile, readAvatarFile } from "@/lib/avatar-utils"

interface ResumeNamePillProps {
  title: string
  avatar: string | null
  avatarEnabled: boolean
  themeHasAvatar: boolean
  onUpload: (dataUrl: string) => void
  onRemove: () => void
  onToggleEnabled: (enabled: boolean) => void
}

export function ResumeNamePill({
  title,
  avatar,
  avatarEnabled,
  themeHasAvatar,
  onUpload,
  onRemove,
  onToggleEnabled,
}: ResumeNamePillProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const v = validateAvatarFile(file)
    if (!v.ok) {
      setError(v.error)
      return
    }
    try {
      const dataUrl = await readAvatarFile(file)
      onUpload(dataUrl)
      setOpen(false)
    } catch (e: any) {
      setError(e?.message || "文件读取失败")
    }
  }, [onUpload])

  const handleSelect = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleRemove = useCallback(() => {
    onRemove()
    setOpen(false)
    if (fileRef.current) fileRef.current.value = ""
  }, [onRemove])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-accent text-muted-foreground hover:bg-accent/70 transition-colors text-xs max-w-[240px]"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border overflow-hidden shrink-0">
          {avatar ? (
            <img src={avatar} alt="头像" className="w-full h-full object-cover" />
          ) : (
            <User className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
        <span className="truncate">{title}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-accent/40 border-b border-border/50">
              简历头像
            </div>

            {avatar && (
              <div className="px-3 py-3 flex justify-center bg-accent/20">
                <img
                  src={avatar}
                  alt="预览"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              </div>
            )}

            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={handleSelect}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-accent rounded transition-colors"
              >
                {avatar ? <Upload className="w-3.5 h-3.5 text-muted-foreground" /> : <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{avatar ? "更换头像" : "上传头像"}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">JPG/PNG/WebP · ≤2MB</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-accent rounded transition-colors text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>移除头像</span>
                </button>
              )}

              {avatar && (
                <div className="px-3 py-2 flex items-center justify-between text-xs border-t border-border/50 mt-1 pt-2">
                  <div className="flex flex-col">
                    <span>显示头像</span>
                    {!themeHasAvatar && (
                      <span className="text-[10px] text-muted-foreground">
                        当前主题不使用头像
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(!avatarEnabled)}
                    disabled={!themeHasAvatar}
                    className={`relative w-8 h-4 rounded-full transition-colors ${avatarEnabled ? "bg-primary" : "bg-muted"} ${!themeHasAvatar ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-pressed={avatarEnabled}
                    aria-disabled={!themeHasAvatar}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${avatarEnabled ? "left-4" : "left-0.5"}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="px-3 py-2 text-[10px] text-red-600 border-t border-border/50 bg-red-50">
                {error}
              </div>
            )}

            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border/50 leading-relaxed">
              中国市场简历通常附带证件照，欧美市场建议不放。头像仅保存到本地，不会上传。
            </div>
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        className="hidden"
      />
    </div>
  )
}
