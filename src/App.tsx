import { useState, useEffect, useRef, useCallback } from "react"
import { Sidebar } from "@/components/Sidebar"
import { ChatMessage } from "@/components/ChatMessage"
import { ChatInput } from "@/components/ChatInput"
import { SettingsDialog } from "@/components/SettingsDialog"
import { FileUpload } from "@/components/FileUpload"
import { WelcomeGuide } from "@/components/WelcomeGuide"
import { ToastContainer, toast } from "@/components/Toast"
import { exportResumeToPDF } from "@/lib/pdf-export"
import type { ChatMessage as ChatMessageType } from "@/adapter/ChatAdapter"
import type { TemplateDefinition } from "@/types/template"
import type { ResumeData } from "@/types/resume"

const DEFAULT_TEMPLATES = [
  { name: "general", label: "通用简历" },
  { name: "technical", label: "技术岗位" },
  { name: "management", label: "管理岗位" },
]

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState("qwen3.6")
  const [models] = useState(["qwen3.6", "big-pickle"])
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [templates] = useState(DEFAULT_TEMPLATES)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("welcome-done"))
  const [templateData, setTemplateData] = useState<TemplateDefinition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        handleNewChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleDismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem("welcome-done", "1")
  }

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const reply = await window.electronAPI.sendMessage(text)
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "(无回复)" }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `抱歉，出错了：${err}` },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelectModel = async (model: string) => {
    setCurrentModel(model)
    await window.electronAPI.setModel(model)
    toast("success", `已切换到 ${model}`)
  }

  const handleNewChat = () => {
    setMessages([])
    toast("info", "已开始新对话")
  }

  const handleSelectTemplate = async (name: string) => {
    setActiveTemplate(name)
    const data = await window.electronAPI.getTemplate(name)
    setTemplateData(data)
    handleNewChat()
  }

  const handleAnalyzeResume = async (text: string) => {
    setMessages([])
    const prompt = `请分析以下简历内容并给出优化建议。\n\n简历内容：\n${text}`
    handleSend(prompt)
  }

  const handleExportPDF = async () => {
    if (!templateData) {
      toast("error", "请先选择模板")
      return
    }
    const resumeData: ResumeData = {
      template: templateData.name,
      sections: {},
    }
    for (const section of templateData.sections) {
      resumeData.sections[section.id] = {}
    }
    await exportResumeToPDF(resumeData, templateData)
    toast("success", "简历已导出")
  }

  const handleFileSelected = (_file: File) => {
    toast("info", `已选择文件`)
  }

  const SUGGESTIONS = [
    "我想找一份前端开发的工作",
    "我正在找管理岗位",
    "帮我优化一下简历",
  ]

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        templates={templates}
        activeTemplate={activeTemplate}
        onSelectTemplate={handleSelectTemplate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">AI 简历助手</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">模型：{currentModel}</span>
            <button
              onClick={handleExportPDF}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              导出 PDF
            </button>
            <button
              onClick={handleNewChat}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              新建对话
            </button>
          </div>
        </header>

        <FileUpload onFileSelected={handleFileSelected} onAnalyze={handleAnalyzeResume} />

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <p className="text-lg">欢迎使用 AI 简历助手</p>
              <p className="text-sm">选择左侧模板，或直接开始对话</p>
              <div className="flex flex-col gap-2 mt-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent hover:border-muted-foreground transition-all disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} thinking={msg.thinking} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={loading} placeholder={loading ? "AI 思考中..." : "输入消息...（Enter 发送，Shift+Enter 换行）"} />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        models={models}
        currentModel={currentModel}
        onSelectModel={handleSelectModel}
      />

      {showWelcome && <WelcomeGuide onDismiss={handleDismissWelcome} />}
      <ToastContainer />
    </div>
  )
}

export default App
