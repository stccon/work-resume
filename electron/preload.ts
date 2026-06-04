import { contextBridge, ipcRenderer, webUtils } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text) as Promise<{ content: string; error: any; isQuotaError: boolean }>,
  sendFirstMessage: (prompt: string) => ipcRenderer.invoke("chat:send-first-message", prompt) as Promise<{ content: string; error: any; isQuotaError: boolean }>,
  getModels: () => ipcRenderer.invoke("models:list"),
  setModel: (model: string) => ipcRenderer.invoke("models:set", model),
  getCurrentModel: () => ipcRenderer.invoke("models:current"),
  setApiKey: (provider: string, key: string) => ipcRenderer.invoke("apikey:set", provider, key),
  getApiKey: (provider: string) => ipcRenderer.invoke("apikey:get", provider),
  clearApiKey: (provider: string) => ipcRenderer.invoke("apikey:clear", provider),
  getTemplates: () => ipcRenderer.invoke("templates:list"),
  getTemplate: (name: string) => ipcRenderer.invoke("templates:get", name),
  saveResume: (data: any, template: any) => ipcRenderer.invoke("resume:save", data, template),
  listResumes: () => ipcRenderer.invoke("resume:list"),
  getResume: (id: string) => ipcRenderer.invoke("resume:get", id),
  deleteResume: (id: string) => ipcRenderer.invoke("resume:delete", id),
  updateResume: (id: string, data: any, template?: any) => ipcRenderer.invoke("resume:update", id, data, template),
  exportPDF: (data: any, template: any, visualThemeName?: string) => ipcRenderer.invoke("resume:export-pdf", data, template, visualThemeName),
  savePdfBuffer: (buffer: ArrayBuffer) => ipcRenderer.invoke("resume:save-pdf-buffer", buffer),
  getVisualThemes: () => ipcRenderer.invoke("visual-templates:list"),
  getVisualTheme: (name: string) => ipcRenderer.invoke("visual-templates:get", name),
  opencodeStatus: () => ipcRenderer.invoke("opencode:status") as Promise<{ connected: boolean }>,
  opencodeRetry: () => ipcRenderer.invoke("opencode:retry") as Promise<{ connected: boolean }>,
  onChatChunk: (callback: (chunk: { type: "done"; content?: string }) => void) => {
    ipcRenderer.on("chat:chunk", (_event, chunk) => callback(chunk))
  },
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners("chat:chunk")
  },
  setChatContext: (context: string) => ipcRenderer.invoke("chat:set-context", context),
  clearChatContext: () => ipcRenderer.invoke("chat:clear-context"),
  switchResume: (resumeId: string) => ipcRenderer.invoke("chat:switch-resume", resumeId),
  extractPdfStyle: (filePath: string) => ipcRenderer.invoke("pdf:extract-style", filePath),
  parseResume: (filePath: string) => ipcRenderer.invoke("pdf:parse-resume", filePath),
  extractPdfAvatarPayload: (filePath: string) => ipcRenderer.invoke("pdf:extract-avatar-payload", filePath),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  extractPdfTheme: (filePath: string) => ipcRenderer.invoke("pdf:extract-theme", filePath),
  saveImportedTheme: (theme: Record<string, unknown>) => ipcRenderer.invoke("theme:save-imported", theme),
  deleteImportedTheme: (themeName: string) => ipcRenderer.invoke("theme:delete-imported", themeName),
  listImportedThemes: () => ipcRenderer.invoke("theme:list-imported") as Promise<string[]>,
  setLastActiveResume: (id: string) => ipcRenderer.invoke("resume:set-last-active", id),
  getLastActiveResume: () => ipcRenderer.invoke("resume:get-last-active") as Promise<string | null>,
  getAvatar: (resumeId: string) => ipcRenderer.invoke("avatar:get", resumeId) as Promise<{ dataUrl: string; enabled: boolean } | null>,
  setAvatar: (resumeId: string, dataUrl: string, enabled: boolean) => ipcRenderer.invoke("avatar:set", resumeId, dataUrl, enabled),
  removeAvatar: (resumeId: string) => ipcRenderer.invoke("avatar:remove", resumeId),
  migrateAvatarFromLegacy: (resumeId: string, dataUrl: string, enabled: boolean) => ipcRenderer.invoke("avatar:migrate-from-legacy", resumeId, dataUrl, enabled) as Promise<{ success: boolean }>,
  log: (tag: string, message: string) => ipcRenderer.invoke("log:write", tag, message),
  getVersion: () => ipcRenderer.invoke("app:get-version") as Promise<string>,
  polishField: (requestId: string, payload: PolishFieldPayload) => ipcRenderer.invoke("ai:polish-field", requestId, payload) as Promise<{ content: string; error: string | null; isQuotaError: boolean }>,
  cancelPolish: (requestId: string) => ipcRenderer.invoke("ai:cancel-polish", requestId) as Promise<{ cancelled: boolean }>,
})

export interface PolishFieldPayload {
  targetRole: string
  sectionId: string
  sectionLabel: string
  fieldLabel: string
  fieldValue: string
  entryNeighbors?: { company?: string; position?: string; startDate?: string; endDate?: string }
}
