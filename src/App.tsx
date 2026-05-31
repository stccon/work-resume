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
import type { VisualTheme } from "@/types/visual-template"
import { VisualThemePicker } from "@/components/VisualThemePicker"
import { getAllVisualThemes, getVisualTheme, DEFAULT_VISUAL_THEME } from "../visual-templates/index"

import { buildResumeContext, buildFirstMessagePrompt } from "@/adapter/distillation"
import { buildStyleAnalysisPrompt } from "@/adapter/style-analyzer"

const log = (tag: string, ...args: any[]) => {
  const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
  console.log(`[${tag}]`, ...args)
  window.electronAPI?.log?.(tag, msg).catch(() => {})
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState("big-pickle")
  const [models, setModels] = useState<string[]>([])
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("welcome-done"))
  const [templateData, setTemplateData] = useState<TemplateDefinition | null>(null)
  const [streamingContent, setStreamingContent] = useState("")
  const [opencodeConnected, setOpencodeConnected] = useState(true)
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null)
  const [visualThemes, setVisualThemes] = useState<VisualTheme[]>(getAllVisualThemes())
  const [currentVisualTheme, setCurrentVisualTheme] = useState<VisualTheme>(getVisualTheme(DEFAULT_VISUAL_THEME))
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const resumeDataRef = useRef(resumeData)
  resumeDataRef.current = resumeData
  const activeResumeIdRef = useRef(activeResumeId)
  activeResumeIdRef.current = activeResumeId
  const savedResumesRef = useRef(savedResumes)
  savedResumesRef.current = savedResumes

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const init = async () => {
      const [list, modelsList, current] = await Promise.all([
        window.electronAPI.listResumes(),
        window.electronAPI.getModels().catch(() => ["big-pickle"]),
        window.electronAPI.getCurrentModel().catch(() => "big-pickle"),
      ])
      setSavedResumes(list)
      setModels(modelsList)
      setCurrentModel(current)

      const status = await window.electronAPI.opencodeStatus().catch(() => ({ connected: false }))
      setOpencodeConnected(status.connected)

      if (list.length > 0) {
        await selectResume(list[0].id, list)
      }
    }
    init()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const selectResume = async (id: string, list?: SavedResume[]) => {
    if (id === activeResumeIdRef.current) return
    const resumes = list || savedResumesRef.current
    const saved = resumes.find((r) => r.id === id)
    if (!saved) return

    setActiveResumeId(id)
    setResumeData(saved.data)
    setMessages([])

    let tmpl = await window.electronAPI.getTemplate(saved.templateName)
    if (!tmpl) tmpl = await window.electronAPI.getTemplate("general")
    if (tmpl) setTemplateData(tmpl)

    await window.electronAPI.switchResume(id)
    const context = buildResumeContext(saved.data, saved.templateName)
    await window.electronAPI.setChatContext(context)

    // Send a greeting acknowledging the existing resume
    const prompt = buildFirstMessagePrompt(saved.data)
    await sendFirstMessage(prompt)
  }

  const loadSavedResumes = async () => {
    try {
      const list = await window.electronAPI.listResumes()
      setSavedResumes(list)
    } catch { /* ignore */ }
  }

  const handleCreateResume = async () => {
    const tmpl = await window.electronAPI.getTemplate("general")
    if (!tmpl) return

    const emptyData: ResumeData = { template: "general", sections: {} }
    const entry = await window.electronAPI.saveResume(emptyData, tmpl)

    setActiveResumeId(entry.id)
    setResumeData(null)
    setTemplateData(tmpl)
    setMessages([])

    const list = await window.electronAPI.listResumes()
    setSavedResumes(list)

    const context = buildResumeContext(null, "general")
    await window.electronAPI.setChatContext(context)
    triggerFirstMessage()
  }

  const handleDismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem("welcome-done", "1")
  }

  function flattenSectionValues(data: ResumeData) {
    for (const sectionId of Object.keys(data.sections)) {
      const section = data.sections[sectionId]
      const keys = Object.keys(section)
      let hasObject = false
      for (const k of keys) {
        if (typeof section[k] === "object" && section[k] !== null) {
          hasObject = true
          break
        }
      }
      if (!hasObject) continue

      const flattened: Record<string, string> = {}
      for (const [entryKey, entryVal] of Object.entries(section)) {
        if (typeof entryVal === "object" && entryVal !== null) {
          const idx = isNaN(Number(entryKey)) ? entryKey : `entry${entryKey}`
          for (const [fieldKey, fieldVal] of Object.entries(entryVal as Record<string, any>)) {
            flattened[`${idx}_${fieldKey}`] = typeof fieldVal === "string" ? fieldVal : JSON.stringify(fieldVal)
          }
        } else if (typeof entryVal === "string") {
          flattened[entryKey] = entryVal
        }
      }
      data.sections[sectionId] = flattened
    }
  }

  const tryDetectResumeJSON = useCallback((reply: string) => {
    const jsonBlock = reply.match(/```json\n?([\s\S]*?)\n?```/)
    if (!jsonBlock) return null
    try {
      const parsed = JSON.parse(jsonBlock[1])
      if (parsed?.template && parsed?.sections) {
        if (parsed.template === "technical" || parsed.template === "management") {
          parsed.template = "general"
        }
        flattenSectionValues(parsed)
        return parsed as ResumeData
      }
    } catch { /* ignore */ }
    return null
  }, [])

  const tryDetectStyleJSON = useCallback((reply: string) => {
    const jsonBlock = reply.match(/```json\n?([\s\S]*?)\n?```/)
    if (!jsonBlock) return null
    try {
      const parsed = JSON.parse(jsonBlock[1])
      if (parsed?.layoutStyle && parsed?.description) {
        return parsed
      }
    } catch { /* ignore */ }
    return null
  }, [])

  const handleAfterDone = useCallback(async (content: string) => {
    setStreamingContent("")
    setLoading(false)

    const detected = tryDetectResumeJSON(content)
    if (detected) {
      setResumeData(detected)

      const id = activeResumeIdRef.current
      if (id) {
        const tmpl = await window.electronAPI.getTemplate(detected.template)
        if (tmpl) setTemplateData(tmpl)
        await window.electronAPI.updateResume(id, detected, tmpl || undefined)

        const newContext = buildResumeContext(detected, detected.template)
        await window.electronAPI.setChatContext(newContext)

        const list = await window.electronAPI.listResumes()
        setSavedResumes(list)
      }
    }

    const displayContent = detected
      ? content.replace(/```json\n?[\s\S]*?\n?```\n?/g, "").trim()
      : content

    setMessages((prev) => [...prev, { role: "assistant", content: displayContent }])

    const styleJson = tryDetectStyleJSON(content)
    if (styleJson) {
      toast("success", `已套用分析到的视觉风格: ${styleJson.description}`)
    }
  }, [tryDetectResumeJSON, tryDetectStyleJSON])

  const streamResponse = useCallback(async (text: string, isFirstMessage: boolean) => {
    setLoading(true)
    setStreamingContent("")

    window.electronAPI.removeChatListeners()

    window.electronAPI.onChatChunk((chunk) => {
      if (chunk.type === "done") {
        window.electronAPI.removeChatListeners()
        const content = chunk.content || "(无回复)"
        log("renderer", "done — content (first 500):", content.slice(0, 500))
        handleAfterDone(content)
      }
    })

    try {
      if (isFirstMessage) {
        await window.electronAPI.sendFirstMessage(text)
      } else {
        await window.electronAPI.sendMessage(text)
      }
    } catch (err) {
      window.electronAPI.removeChatListeners()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `抱歉，出错了：${err}` },
      ])
      setStreamingContent("")
      setLoading(false)
    }
  }, [handleAfterDone])

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }])
    await streamResponse(text, false)
  }, [streamResponse])

  const sendFirstMessage = useCallback(async (prompt: string) => {
    await streamResponse(prompt, true)
  }, [streamResponse])

  const triggerFirstMessage = useCallback(async () => {
    const data = resumeDataRef.current
    const prompt = buildFirstMessagePrompt(data)
    await sendFirstMessage(prompt)
  }, [sendFirstMessage])

  const handleSelectResume = async (id: string) => {
    await selectResume(id)
  }

  const handleDeleteResume = async (id: string) => {
    try {
      await window.electronAPI.deleteResume(id)
      await loadSavedResumes()
      if (activeResumeId === id) {
        setActiveResumeId(null)
        setResumeData(null)
        setTemplateData(null)
        setMessages([])
      }
    } catch { /* ignore */ }
  }

  const handleSelectModel = async (model: string) => {
    setCurrentModel(model)
    await window.electronAPI.setModel(model)
    toast("success", `已切换到 ${model}`)
  }

  const handleNewChat = () => {
    if (!activeResumeIdRef.current) return
    setMessages([])
    triggerFirstMessage()
  }

  const handleAnalyzeResume = async (file: File) => {
    setMessages([])
    setResumeData(null)

    const isPdf = file.name.endsWith(".pdf")

    if (isPdf) {
      try {
        const style = await window.electronAPI.extractPdfStyle(file.path)
        if (style?.error) {
          toast("error", `PDF 解析失败: ${style.error}`)
          return
        }
        const stylePrompt = buildStyleAnalysisPrompt(style)
        const allText = style.items?.map((i: any) => i.text).join("\n") || ""
        handleSend(`这是一份 PDF 简历的提取内容。\n\n简历文本：\n${allText}\n\n另外，请分析它的视觉风格：\n${stylePrompt}\n\n请先分析内容并给出优化建议，然后分析视觉风格，输出 JSON 格式的风格参数。`)
        toast("info", `已提取 ${style.items?.length || 0} 个文本项`)
      } catch (err: any) {
        toast("error", `PDF 提取失败: ${err.message}`)
      }
    } else {
      const text = await file.text()
      handleSend(`请分析以下简历内容并给出优化建议。\n\n简历内容：\n${text}`)
    }
  }

  const handleExportPDF = async () => {
    const data = resumeData
    const tmpl = templateData
    if (!data || !tmpl) {
      toast("error", "请先生成简历数据")
      return
    }
    try {
      const result = await window.electronAPI.exportPDF(data, tmpl, currentVisualTheme.name)
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

  const handleVisualThemeChange = (theme: VisualTheme) => {
    setCurrentVisualTheme(theme)
  }

  const handleRetryOpencode = async () => {
    const { connected } = await window.electronAPI.opencodeRetry()
    setOpencodeConnected(connected)
    if (connected) {
      toast("success", "Opencode 已连接")
    } else {
      toast("error", "Opencode 连接失败，请检查是否已安装 Opencode")
    }
  }

  const hasResumes = savedResumes.length > 0
  const activeResume = hasResumes && activeResumeId
    ? savedResumes.find((r) => r.id === activeResumeId)
    : null

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        savedResumes={savedResumes}
        activeResumeId={activeResumeId}
        onSelectResume={handleSelectResume}
        onDeleteResume={handleDeleteResume}
        onCreateResume={handleCreateResume}
      />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">AI 简历助手</h1>
            {!opencodeConnected && (
              <button
                onClick={handleRetryOpencode}
                className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Opencode 未连接，点击重试"
              >
                Opencode 未连接 · 重试
              </button>
            )}
            {activeResume && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                {activeResume.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {resumeData && (
              <>
                <VisualThemePicker
                  themes={visualThemes}
                  currentTheme={currentVisualTheme}
                  onChange={handleVisualThemeChange}
                />
                <button
                  onClick={handleNewChat}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  新对话
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

        {!hasResumes ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <h2 className="text-xl font-semibold">欢迎使用 AI 简历助手</h2>
              <p className="text-sm text-muted-foreground">
                点击左侧「创建简历」按钮，AI 将引导你一步步完成一份专业的简历。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              {!resumeData && (
                <FileUpload onFileSelected={handleFileSelected} onAnalyze={handleAnalyzeResume} />
              )}
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 && !loading && !resumeData ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                    <p className="text-lg">欢迎使用 AI 简历助手</p>
                    <p className="text-sm">请输入你的信息或上传一份现有简历开始</p>
                  </div>
                ) : messages.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                    <p className="text-lg">欢迎使用 AI 简历助手</p>
                    <p className="text-sm">AI 正在准备中，请稍候...</p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto py-4">
                    {messages.map((msg, i) => (
                      <ChatMessage key={i} role={msg.role} content={msg.content} />
                    ))}
                    {loading && (
                      <ChatMessage
                        role="assistant"
                        content={streamingContent || "..."}
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <ChatInput onSend={handleSend} disabled={loading} placeholder={loading ? "AI 思考中..." : "输入消息...（Enter 发送，Shift+Enter 换行）"} />
            </div>
            <div className="w-[55%] min-w-[420px] border-l border-border overflow-y-auto">
              {resumeData && templateData ? (
                <ResumePreview data={resumeData} template={templateData} visualTheme={currentVisualTheme} />
              ) : null}
            </div>
          </div>
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