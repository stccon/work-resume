import { useState } from "react"
import { MessageSquare, FileText, Wand2, Upload } from "lucide-react"

interface WelcomeGuideProps {
  onDismiss: () => void
}

const STEPS = [
  {
    icon: MessageSquare,
    title: "和 AI 对话",
    description: "AI 会主动问候你，引导你一步步完成简历。你只需要回答就好。",
  },
  {
    icon: FileText,
    title: "生成简历",
    description: "信息收集完整后，AI 会帮你生成结构完整的简历。",
  },
  {
    icon: Wand2,
    title: "继续优化",
    description: "不满意可以继续对话修改，反复优化直到满意为止。",
  },
  {
    icon: Upload,
    title: "上传已有简历",
    description: "也可以上传现有简历，让 AI 帮你分析和优化。",
  },
]

export function WelcomeGuide({ onDismiss }: WelcomeGuideProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <current.icon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground mb-6">{current.description}</p>
          <div className="flex gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                开始使用
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent"
            >
              跳过
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
