"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (text) => electron.ipcRenderer.invoke("chat:send", text),
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
  exportPDF: (data, template) => electron.ipcRenderer.invoke("resume:export-pdf", data, template),
  onChatChunk: (callback) => {
    electron.ipcRenderer.on("chat:chunk", (_event, chunk) => callback(chunk));
  },
  removeChatListeners: () => {
    electron.ipcRenderer.removeAllListeners("chat:chunk");
  }
});
