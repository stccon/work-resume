import { useState, useEffect, useRef, useCallback } from "react"
import { Sidebar } from "@/components/Sidebar"
import { ChatMessage } from "@/components/ChatMessage"
import { ChatInput } from "@/components/ChatInput"
import { SettingsDialog } from "@/components/SettingsDialog"
import { FileUpload } from "@/components/FileUpload"
import { WelcomeGuide } from "@/components/WelcomeGuide"
import { ResumePreview } from "@/components/ResumePreview"
import { ToastContainer, toast } from "@/components/Toast"
import type { ChatMessage as ChatMessageType } from "@/adapter/ChatAdapter"
import type { TemplateDefinition } from "@/types/template"
import type { ResumeData } from "@/types/resume"
import type { SavedResume } from "@/env"

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
  const [currentModel, setCurrentModel] = useState("big-pickle")
  const [models, setModels] = useState<string[]>([])
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [templates] = useState(DEFAULT_TEMPLATES)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("welcome-done"))
  const [templateData, setTemplateData] = useState<TemplateDefinition | null>(null)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamingThinking, setStreamingThinking] = useState("")
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const charBufferRef = useRef("")
  const thinkBufferRef = useRef("")

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent, streamingThinking])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    loadSavedResumes()
    window.electronAPI.getModels().then(setModels).catch(() => setModels(["big-pickle"]))
    window.electronAPI.getCurrentModel().then(setCurrentModel).catch(() => {})
  }, [])

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

  const loadSavedResumes = async () => {
    try {
      const list = await window.electronAPI.listResumes()
      setSavedResumes(list)
    } catch { /* ignore */ }
  }

  const handleDismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem("welcome-done", "1")
  }

  const tryDetectResumeJSON = useCallback((reply: string) => {
    const jsonBlock = reply.match(/```json\n?([\s\S]*?)\n?```/)
    if (!jsonBlock) return null
    try {
      const parsed = JSON.parse(jsonBlock[1])
      if (parsed?.template && parsed?.sections) {
        return parsed as ResumeData
      }
    } catch { /* ignore */ }
    return null
  }, [])

  const autoSaveResume = useCallback(async (data: ResumeData) => {
    try {
      const tmpl = await window.electronAPI.getTemplate(data.template)
      await window.electronAPI.saveResume(data, tmpl)
      await loadSavedResumes()
    } catch { /* ignore */ }
  }, [])

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)
    setStreamingContent("")
    setStreamingThinking("")

    charBufferRef.current = ""
    thinkBufferRef.current = ""

    window.electronAPI.removeChatListeners()
    // Strip echoed user input prefix
    const stripped = (s: string) => s.startsWith(text) ? s.slice(text.length) : s

    window.electronAPI.onChatChunk((chunk) => {
      if (chunk.type === "text") {
        charBufferRef.current += chunk.text
        setStreamingContent(stripped(charBufferRef.current))
      } else if (chunk.type === "thinking") {
        thinkBufferRef.current += chunk.text
        setStreamingThinking(thinkBufferRef.current)
      } else if (chunk.type === "done") {
        window.electronAPI.removeChatListeners()
        const raw = chunk.content || charBufferRef.current || "(无回复)"
        const content = stripped(raw)
        const thinking = chunk.thinking || thinkBufferRef.current || ""
        setMessages((prev) => {
          const updated = [...prev, { role: "assistant" as const, content, thinking }]
          const detected = tryDetectResumeJSON(content)
          if (detected) {
            setResumeData(detected)
            setActiveResumeId(null)
            autoSaveResume(detected)
            loadTemplateFromName(detected.template)
          }
          return updated
        })
        setStreamingContent("")
        setStreamingThinking("")
        setLoading(false)
      }
    })

    try {
      await window.electronAPI.sendMessage(text)
    } catch (err) {
      window.electronAPI.removeChatListeners()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `抱歉，出错了：${err}`, thinking: "" },
      ])
      setStreamingContent("")
      setStreamingThinking("")
      setLoading(false)
    }
  }, [tryDetectResumeJSON, autoSaveResume])

  const loadTemplateFromName = async (name: string) => {
    setActiveTemplate(name)
    const data = await window.electronAPI.getTemplate(name)
    if (data) setTemplateData(data)
  }

  const handleSelectResume = async (id: string) => {
    const saved = savedResumes.find((r) => r.id === id)
    if (!saved) return
    setActiveResumeId(id)
    setResumeData(saved.data)
    await loadTemplateFromName(saved.templateName)
    setMessages([])
  }

  const handleDeleteResume = async (id: string) => {
    try {
      await window.electronAPI.deleteResume(id)
      await loadSavedResumes()
      if (activeResumeId === id) {
        setActiveResumeId(null)
        setResumeData(null)
      }
    } catch { /* ignore */ }
  }

  const handleImportJSON = () => {
    jsonInputRef.current?.click()
  }

  const handleJSONFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as ResumeData
      if (!parsed.template || !parsed.sections) {
        toast("error", "JSON 格式不正确")
        return
      }
      setResumeData(parsed)
      setActiveResumeId(null)
      await loadTemplateFromName(parsed.template)
      await autoSaveResume(parsed)
      toast("success", "已导入简历数据")
    } catch {
      toast("error", "JSON 解析失败")
    }
    e.target.value = ""
  }

  const handleSelectModel = async (model: string) => {
    setCurrentModel(model)
    await window.electronAPI.setModel(model)
    toast("success", `已切换到 ${model}`)
  }

  const handleNewChat = () => {
    setMessages([])
    setResumeData(null)
    setActiveResumeId(null)
    setStreamingContent("")
    setStreamingThinking("")
  }

  const handleSelectTemplate = async (name: string) => {
    setActiveTemplate(name)
    const data = await window.electronAPI.getTemplate(name)
    setTemplateData(data)
    handleNewChat()
  }

  const handleAnalyzeResume = async (text: string) => {
    setMessages([])
    setResumeData(null)
    setActiveResumeId(null)
    handleSend(`请分析以下简历内容并给出优化建议。\n\n简历内容：\n${text}`)
  }

  const handleExportPDF = async () => {
    const data = resumeData
    const tmpl = templateData
    if (!data || !tmpl) {
      toast("error", "请先生成简历数据")
      return
    }
    try {
      const result = await window.electronAPI.exportPDF(data, tmpl)
      if (result.success) {
        toast("success", `已保存到 ${result.path}`)
      } else if (result.reason === "canceled") {
        toast("info", "已取消导出")
      }
    } catch (err: any) {
      toast("error", `导出失败: ${err.message}`)
    }
  }

  const handleFileSelected = (_file: File) => {
    toast("info", "已选择文件")
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
        savedResumes={savedResumes}
        activeResumeId={activeResumeId}
        onSelectResume={handleSelectResume}
        onDeleteResume={handleDeleteResume}
      />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">AI 简历助手</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleJSONFileChange}
              className="hidden"
            />
            {!resumeData && (
              <button
                onClick={handleImportJSON}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                导入 JSON
              </button>
            )}
            {resumeData && (
              <>
                <button
                  onClick={handleNewChat}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  开始新对话
                </button>
                <button
                  onClick={handleExportPDF}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  导出 PDF
                </button>
              </>
            )}
          </div>
        </header>

        {resumeData && templateData ? (
          <div className="flex-1 overflow-y-auto">
            <ResumePreview data={resumeData} template={templateData} />
          </div>
        ) : (
          <>
            <FileUpload onFileSelected={handleFileSelected} onAnalyze={handleAnalyzeResume} />

            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 && !loading ? (
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
                  {loading && (
                    <ChatMessage
                      role="assistant"
                      content={streamingContent || "..."}
                      thinking={streamingThinking}
                    />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <ChatInput onSend={handleSend} disabled={loading} placeholder={loading ? "AI 思考中..." : "输入消息...（Enter 发送，Shift+Enter 换行）"} />
          </>
        )}
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
