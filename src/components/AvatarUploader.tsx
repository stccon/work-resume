import { useCallback, useRef, useState } from "react"
import { Camera, Trash2, Upload } from "lucide-react"

interface AvatarUploaderProps {
  avatar: string | null
  onChange: (avatar: string | null) => void
}

const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export function AvatarUploader({ avatar, onChange }: AvatarUploaderProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("仅支持 JPG/PNG/WebP/GIF 格式")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`文件大小不能超过 ${MAX_SIZE_MB}MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange(dataUrl)
      setOpen(false)
    }
    reader.onerror = () => {
      setError("文件读取失败")
    }
    reader.readAsDataURL(file)
  }, [onChange])

  const handleSelect = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleRemove = useCallback(() => {
    onChange(null)
    setOpen(false)
    if (fileRef.current) fileRef.current.value = ""
  }, [onChange])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="上传头像"
        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border hover:bg-accent transition-colors overflow-hidden p-0"
      >
        {avatar ? (
          <img src={avatar} alt="头像" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
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
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
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
            </div>

            {error && (
              <div className="px-3 py-2 text-[10px] text-red-600 border-t border-border/50 bg-red-50">
                {error}
              </div>
            )}

            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border/50 leading-relaxed">
              中国市场简历通常附带证件照，欧美市场建议不放。头像将保存到本地浏览器。
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
