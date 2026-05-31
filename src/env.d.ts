/// <reference types="vite/client" />

interface SendMessageResult {
  content: string
  error: any
  isQuotaError: boolean
}

interface ChatChunk {
  type: "done"
  content?: string
}

interface SavedResume {
  id: string
  title: string
  templateName: string
  templateLabel: string
  createdAt: string
  data: any
}

interface UserPreferences {
  template: string
  accentColor: string
  fontFamily: string
  fontSize: string
  layout: string
}

interface VisualThemeMeta {
  name: string
  label: string
  description: string
  layout: string
}

interface ElectronAPI {
  sendMessage: (text: string) => Promise<SendMessageResult>
  sendFirstMessage: (prompt: string) => Promise<SendMessageResult>
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
  updateResume: (id: string, data: any, template?: any) => Promise<SavedResume | null>
  exportPDF: (data: any, template: any, visualThemeName?: string) => Promise<{ success: boolean; path?: string; reason?: string }>
  savePdfBuffer: (buffer: ArrayBuffer) => Promise<{ success: boolean; path?: string; reason?: string }>
  getVisualThemes: () => Promise<VisualThemeMeta[]>
  getVisualTheme: (name: string) => Promise<any>
  onChatChunk: (callback: (chunk: ChatChunk) => void) => void
  removeChatListeners: () => void
  setChatContext: (context: string) => Promise<void>
  clearChatContext: () => Promise<void>
  switchResume: (resumeId: string) => Promise<void>
  extractPdfStyle: (filePath: string) => Promise<any>
  opencodeStatus: () => Promise<{ connected: boolean }>
  opencodeRetry: () => Promise<{ connected: boolean }>
  setLastActiveResume: (id: string) => Promise<void>
  getLastActiveResume: () => Promise<string | null>
  log: (tag: string, message: string) => Promise<void>
}

interface File {
  path: string
}

interface Window {
  electronAPI: ElectronAPI
}
