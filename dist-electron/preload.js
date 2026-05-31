"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text) => electron.ipcRenderer.invoke("chat:send", text),
  sendFirstMessage: (prompt) => electron.ipcRenderer.invoke("chat:send-first-message", prompt),
  getModels: () => electron.ipcRenderer.invoke("models:list"),
  setModel: (model) => electron.ipcRenderer.invoke("models:set", model),
  getCurrentModel: () => electron.ipcRenderer.invoke("models:current"),
  setApiKey: (provider, key) => electron.ipcRenderer.invoke("apikey:set", provider, key),
  getApiKey: (provider) => electron.ipcRenderer.invoke("apikey:get", provider),
  clearApiKey: (provider) => electron.ipcRenderer.invoke("apikey:clear", provider),
  getTemplates: () => electron.ipcRenderer.invoke("templates:list"),
  getTemplate: (name) => electron.ipcRenderer.invoke("templates:get", name),
  saveResume: (data, template) => electron.ipcRenderer.invoke("resume:save", data, template),
  listResumes: () => electron.ipcRenderer.invoke("resume:list"),
  getResume: (id) => electron.ipcRenderer.invoke("resume:get", id),
  deleteResume: (id) => electron.ipcRenderer.invoke("resume:delete", id),
  updateResume: (id, data, template) => electron.ipcRenderer.invoke("resume:update", id, data, template),
  exportPDF: (data, template) => electron.ipcRenderer.invoke("resume:export-pdf", data, template),
  savePdfBuffer: (buffer) => electron.ipcRenderer.invoke("resume:save-pdf-buffer", buffer),
  onChatChunk: (callback) => {
    electron.ipcRenderer.on("chat:chunk", (_event, chunk) => callback(chunk));
  },
  removeChatListeners: () => {
    electron.ipcRenderer.removeAllListeners("chat:chunk");
  },
  setChatContext: (context) => electron.ipcRenderer.invoke("chat:set-context", context),
  clearChatContext: () => electron.ipcRenderer.invoke("chat:clear-context"),
  extractPdfStyle: (filePath) => electron.ipcRenderer.invoke("pdf:extract-style", filePath)
});
