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

interface UserProfile {
  name?: string
  sections: Record<string, Record<string, string>>
  updatedAt: string | null
}

interface UserPreferences {
  template: string
  accentColor: string
  fontFamily: string
  fontSize: string
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
  exportPDF: (data: any, template: any) => Promise<{ success: boolean; path?: string; reason?: string }>
  savePdfBuffer: (buffer: ArrayBuffer) => Promise<{ success: boolean; path?: string; reason?: string }>
  onChatChunk: (callback: (chunk: ChatChunk) => void) => void
  removeChatListeners: () => void
  listUsers: () => Promise<string[]>
  loadProfile: (userId: string) => Promise<UserProfile>
  saveProfile: (userId: string, data: any) => Promise<UserProfile>
  loadPreferences: (userId: string) => Promise<UserPreferences>
  savePreferences: (userId: string, prefs: any) => Promise<UserPreferences>
  saveConversation: (userId: string, messages: any[]) => Promise<any>
  listConversations: (userId: string) => Promise<{ date: string; messageCount: number; updatedAt: string }[]>
  saveDraft: (userId: string, data: any) => Promise<any>
  loadDraft: (userId: string) => Promise<any>
  setChatContext: (context: string) => Promise<void>
  clearChatContext: () => Promise<void>
  extractPdfStyle: (filePath: string) => Promise<any>
}

interface File {
  path: string
}

interface Window {
  electronAPI: ElectronAPI
}
