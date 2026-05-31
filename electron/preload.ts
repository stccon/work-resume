import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text) as Promise<{ content: string }>,
  sendFirstMessage: (prompt: string) => ipcRenderer.invoke("chat:send-first-message", prompt) as Promise<{ content: string }>,
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
  exportPDF: (data: any, template: any) => ipcRenderer.invoke("resume:export-pdf", data, template),
  savePdfBuffer: (buffer: ArrayBuffer) => ipcRenderer.invoke("resume:save-pdf-buffer", buffer),
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
  log: (tag: string, message: string) => ipcRenderer.invoke("log:write", tag, message),
})
