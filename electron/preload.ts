import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text) as Promise<{ content: string; thinking: string }>,
  sendFirstMessage: (prompt: string) => ipcRenderer.invoke("chat:send-first-message", prompt) as Promise<{ content: string; thinking: string }>,
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
  exportPDF: (data: any, template: any) => ipcRenderer.invoke("resume:export-pdf", data, template),
  savePdfBuffer: (buffer: ArrayBuffer) => ipcRenderer.invoke("resume:save-pdf-buffer", buffer),
  onChatChunk: (callback: (chunk: { type: "text" | "thinking" | "done"; text?: string; content?: string; thinking?: string }) => void) => {
    ipcRenderer.on("chat:chunk", (_event, chunk) => callback(chunk))
  },
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners("chat:chunk")
  },
  listUsers: () => ipcRenderer.invoke("user:list"),
  loadProfile: (userId: string) => ipcRenderer.invoke("user:profile-load", userId),
  saveProfile: (userId: string, data: any) => ipcRenderer.invoke("user:profile-save", userId, data),
  loadPreferences: (userId: string) => ipcRenderer.invoke("user:preferences-load", userId),
  savePreferences: (userId: string, prefs: any) => ipcRenderer.invoke("user:preferences-save", userId, prefs),
  saveConversation: (userId: string, messages: any[]) => ipcRenderer.invoke("user:conversation-save", userId, messages),
  listConversations: (userId: string) => ipcRenderer.invoke("user:conversation-list", userId),
  saveDraft: (userId: string, data: any) => ipcRenderer.invoke("user:draft-save", userId, data),
  loadDraft: (userId: string) => ipcRenderer.invoke("user:draft-load", userId),
  setChatContext: (context: string) => ipcRenderer.invoke("chat:set-context", context),
  clearChatContext: () => ipcRenderer.invoke("chat:clear-context"),
  extractPdfStyle: (filePath: string) => ipcRenderer.invoke("pdf:extract-style", filePath),
})
