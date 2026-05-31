import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
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

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isLoading = role === "assistant" && (content === "..." || content === "")

  return (
    <div className={cn("flex gap-3 px-4 py-3", role === "user" ? "justify-end" : "justify-start")}>
      {role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={cn("max-w-[80%]", role === "user" && "order-first")}>
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
