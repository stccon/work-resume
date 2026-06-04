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
  parseResume: (filePath: string) => Promise<any>
  extractPdfAvatarPayload: (filePath: string) => Promise<ExtractedImagePayload | null>
  extractPdfTheme: (filePath: string) => Promise<DetectedTheme | { error: string }>
  saveImportedTheme: (theme: Record<string, unknown>) => Promise<{ name: string; isNew: boolean } | { error: string }>
  deleteImportedTheme: (themeName: string) => Promise<boolean | { error: string }>
  listImportedThemes: () => Promise<string[]>
  getFilePath: (file: File) => string
  opencodeStatus: () => Promise<{ connected: boolean }>
  opencodeRetry: () => Promise<{ connected: boolean }>
  setLastActiveResume: (id: string) => Promise<void>
  getLastActiveResume: () => Promise<string | null>
  getUiTheme: () => Promise<"light" | "dark">
  setUiTheme: (mode: "light" | "dark") => Promise<void>
  getCurrentVisualTheme: () => Promise<string | null>
  setCurrentVisualTheme: (name: string) => Promise<void>
  getAvatar: (resumeId: string) => Promise<{ dataUrl: string; enabled: boolean } | null>
  setAvatar: (resumeId: string, dataUrl: string, enabled: boolean) => Promise<void>
  removeAvatar: (resumeId: string) => Promise<void>
  migrateAvatarFromLegacy: (resumeId: string, dataUrl: string, enabled: boolean) => Promise<{ success: boolean }>
  log: (tag: string, message: string) => Promise<void>
  getVersion: () => Promise<string>
  polishField: (requestId: string, payload: PolishFieldPayload) => Promise<{ content: string; error: string | null; isQuotaError: boolean }>
  cancelPolish: (requestId: string) => Promise<{ cancelled: boolean }>
}

interface PolishFieldPayload {
  targetRole: string
  sectionId: string
  sectionLabel: string
  fieldLabel: string
  fieldValue: string
  entryNeighbors?: { company?: string; position?: string; startDate?: string; endDate?: string }
}

interface File {
  path: string
}

interface ExtractedImagePayload {
  width: number
  height: number
  hasAlpha: boolean
  rgbBase64: string
  smaskBase64: string | null
}

interface DetectedTheme {
  name: string
  label: string
  description: string
  layout: "single-column" | "two-column"
  headerStyle: "centered" | "left" | "colored-bar"
  sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"
  decorationStyle: "line" | "dot" | "none"
  colors: Record<string, string>
  fonts: { heading: string; body: string; mono: string }
  typography: Record<string, string>
  spacing: Record<string, string>
  borderRadius: string
  sidebarWidth: string
  isImported: true
  importedFrom: string
  confidence: number
  detectedAt: string
}

interface Window {
  electronAPI: ElectronAPI
}
