import { useState, useRef, KeyboardEvent, DragEvent } from "react"
import { Send, Loader2, FileUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (text: string) => void
  onImportPdf?: (file: File) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onImportPdf, disabled, placeholder = "输入消息..." }: ChatInputProps) {
  const [text, setText] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 200) + "px"
    }
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
    if (!f) return
    if (f.name.toLowerCase().endsWith(".pdf") && onImportPdf) {
      onImportPdf(f)
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && onImportPdf) {
      onImportPdf(f)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div
      className="border-t border-border p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-end gap-2 max-w-4xl mx-auto relative">
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl pointer-events-none">
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <FileUp className="w-5 h-5" />
              松开以导入 PDF 简历
            </div>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all"
          )}
        />
        {onImportPdf && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleFileClick}
              disabled={disabled}
              title="导入 PDF 简历"
              className={cn(
                "rounded-xl p-3 transition-all shrink-0",
                "bg-card border border-border text-muted-foreground",
                "hover:bg-accent hover:text-foreground",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <FileUp className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={cn(
            "rounded-xl p-3 transition-all shrink-0",
            "bg-primary text-primary-foreground",
            "hover:opacity-90",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
