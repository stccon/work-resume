import { useEffect, useState } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

interface ToastData {
  id: string
  type: ToastType
  message: string
}

let addToastFn: ((toast: Omit<ToastData, "id">) => void) | null = null

export function toast(type: ToastType, message: string) {
  addToastFn?.({ type, message })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToastFn = (t) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, 3000)
    }
    return () => { addToastFn = null }
  }, [])

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm min-w-[280px] animate-in slide-in-from-right",
            t.type === "success" && "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
            t.type === "error" && "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
            t.type === "info" && "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
          )}
        >
          {t.type === "success" && <CheckCircle className="w-4 h-4" />}
          {t.type === "error" && <AlertCircle className="w-4 h-4" />}
          {t.type === "info" && <Info className="w-4 h-4" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="p-0.5 rounded hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
