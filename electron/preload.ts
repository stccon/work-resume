import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text: string) => ipcRenderer.invoke("chat:send", text),
  getModels: () => ipcRenderer.invoke("models:list"),
  setModel: (model: string) => ipcRenderer.invoke("models:set", model),
  getCurrentModel: () => ipcRenderer.invoke("models:current"),
  setApiKey: (provider: string, key: string) => ipcRenderer.invoke("apikey:set", provider, key),
  getApiKey: (provider: string) => ipcRenderer.invoke("apikey:get", provider),
  clearApiKey: (provider: string) => ipcRenderer.invoke("apikey:clear", provider),
  getTemplates: () => ipcRenderer.invoke("templates:list"),
  getTemplate: (name: string) => ipcRenderer.invoke("templates:get", name),
})
