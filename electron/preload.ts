import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text) as Promise<{ content: string; thinking: string }>,
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
  onChatChunk: (callback: (chunk: { type: "text" | "thinking" | "done"; text?: string; content?: string; thinking?: string }) => void) => {
    ipcRenderer.on("chat:chunk", (_event, chunk) => callback(chunk))
  },
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners("chat:chunk")
  },
})
