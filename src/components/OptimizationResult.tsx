import { Check, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Suggestion {
  category: string
  items: string[]
}

interface OptimizationResultProps {
  suggestions: Suggestion[]
}

export function OptimizationResult({ suggestions }: OptimizationResultProps) {
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const toggleApplied = (item: string) => {
    setApplied((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }

  if (suggestions.length === 0) return null

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">优化建议</h3>
      {suggestions.map((group) => (
        <div key={group.category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{group.category}</h4>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item}
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg border text-sm transition-colors cursor-pointer",
                  applied.has(item)
                    ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                    : "border-border hover:bg-accent"
                )}
                onClick={() => toggleApplied(item)}
              >
                <button className="mt-0.5 shrink-0">
                  {applied.has(item) ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <span className={cn(applied.has(item) && "line-through text-muted-foreground")}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
