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
  getTemplate: (name) => electron.ipcRenderer.invoke("templates:get", name)
});
