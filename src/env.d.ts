/// <reference types="vite/client" />

interface SendMessageResult {
  content: string
  thinking: string
}

interface ChatChunk {
  type: "text" | "thinking" | "done"
  text?: string
  content?: string
  thinking?: string
}

interface SavedResume {
  id: string
  title: string
  templateName: string
  templateLabel: string
  createdAt: string
  data: any
}

interface ElectronAPI {
  sendMessage: (text: string) => Promise<SendMessageResult>
  getModels: () => Promise<string[]>
  setModel: (model: string) => Promise<void>
  getCurrentModel: () => Promise<string>
  setApiKey: (provider: string, key: string) => Promise<void>
  getApiKey: (provider: string) => Promise<string | null>
  clearApiKey: (provider: string) => Promise<void>
  getTemplates: () => Promise<{ name: string; label: string; description: string }[]>
  getTemplate: (name: string) => Promise<any>
  saveResume: (data: any, template: any) => Promise<SavedResume>
  listResumes: () => Promise<SavedResume[]>
  getResume: (id: string) => Promise<SavedResume | null>
  deleteResume: (id: string) => Promise<void>
  exportPDF: (data: any, template: any) => Promise<{ success: boolean; path?: string; reason?: string }>
  onChatChunk: (callback: (chunk: ChatChunk) => void) => void
  removeChatListeners: () => void
}

interface Window {
  electronAPI: ElectronAPI
}
