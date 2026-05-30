import { cn } from "@/lib/utils"
import { useState } from "react"
import { ChevronDown, ChevronRight, Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  thinking?: string
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  )
}

export function ChatMessage({ role, content, thinking }: ChatMessageProps) {
  const [showThinking, setShowThinking] = useState(true)
  const isLoading = role === "assistant" && (content === "..." || content === "")

  return (
    <div className={cn("flex gap-3 px-4 py-3", role === "user" ? "justify-end" : "justify-start")}>
      {role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={cn("max-w-[80%]", role === "user" && "order-first")}>
        {role === "assistant" && thinking && (
          <div className="mb-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              思考过程
            </button>
            {showThinking && (
              <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground border border-border whitespace-pre-wrap">
                {thinking}
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
            role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border"
          )}
        >
          {isLoading ? <TypingDots /> : (content || (role === "assistant" ? "..." : ""))}
        </div>
      </div>
      {role === "user" && (
        <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}
