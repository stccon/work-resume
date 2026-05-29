/// <reference types="vite/client" />

interface ElectronAPI {
  sendMessage: (text: string) => Promise<string>
  getModels: () => Promise<string[]>
  setModel: (model: string) => Promise<void>
  getCurrentModel: () => Promise<string>
  setApiKey: (provider: string, key: string) => Promise<void>
  getApiKey: (provider: string) => Promise<string | null>
  clearApiKey: (provider: string) => Promise<void>
  getTemplates: () => Promise<{ name: string; label: string; description: string }[]>
  getTemplate: (name: string) => Promise<any>
}

interface Window {
  electronAPI: ElectronAPI
}
