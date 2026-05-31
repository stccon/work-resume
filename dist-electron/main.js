"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
let serverProcess = null;
let serverUrl = null;
let client = null;
let sessionId = null;
let currentModel = "big-pickle";
function getBinaryPath() {
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode";
  if (electron.app.isPackaged) {
    const p = path.join(process.resourcesPath, "opencode-ai", "bin", binaryName);
    if (fs.existsSync(p)) return p;
    console.warn("Bundled opencode binary not found at", p, "falling back to PATH");
  }
  const devPath = path.join(__dirname, "..", "node_modules", "opencode-ai", "bin", binaryName);
  if (fs.existsSync(devPath)) return devPath;
  const cwdPath = path.join(process.cwd(), "node_modules", "opencode-ai", "bin", binaryName);
  if (fs.existsSync(cwdPath)) return cwdPath;
  return binaryName;
}
function isMockMode() {
  return false;
}
async function startOpencode() {
  if (serverProcess) return;
  const cmd = getBinaryPath();
  serverProcess = child_process.spawn(cmd, ["serve"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: process.env
  });
  return new Promise((resolve, reject) => {
    var _a, _b;
    let found = false;
    let output = "";
    const timeout = setTimeout(() => {
      if (!found) {
        serverProcess == null ? void 0 : serverProcess.kill();
        serverProcess = null;
        reject(new Error(`opencode serve 启动超时（20秒）
${output.slice(-500)}`));
      }
    }, 2e4);
    function onData(data) {
      const text = data.toString();
      output += text;
      const m = text.match(/opencode server listening on\s+(https?:\/\/[^\s]+)/);
      if (m && !found) {
        found = true;
        serverUrl = m[1].replace(/\/+$/, "");
        clearTimeout(timeout);
        console.log("Opencode server ready at", serverUrl);
        resolve();
      }
    }
    (_a = serverProcess.stdout) == null ? void 0 : _a.on("data", onData);
    (_b = serverProcess.stderr) == null ? void 0 : _b.on("data", onData);
    serverProcess.on("error", (err) => {
      if (!found) {
        clearTimeout(timeout);
        serverProcess = null;
        reject(err);
      }
    });
    serverProcess.on("exit", (code) => {
      if (!found) {
        clearTimeout(timeout);
        serverProcess = null;
        reject(new Error(`opencode serve 已退出 (code ${code})
${output.slice(-500)}`));
      }
    });
  });
}
async function getClient() {
  if (client) return client;
  if (!serverUrl) throw new Error("Opencode 未连接");
  const sdk = await import("@opencode-ai/sdk");
  client = sdk.createOpencodeClient({ baseUrl: serverUrl });
  return client;
}
async function ensureSession() {
  var _a;
  if (sessionId) return sessionId;
  const c = await getClient();
  const session = await Promise.race([
    c.session.create(),
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error("会话创建超时")), 15e3)
    )
  ]);
  if (session.error) throw new Error(JSON.stringify(session.error));
  sessionId = (_a = session.data) == null ? void 0 : _a.id;
  if (!sessionId) throw new Error("会话 ID 为空");
  return sessionId;
}
async function streamFromGlobalEvents(sid, win, signal) {
  var _a, _b, _c;
  if (!serverUrl) return;
  try {
    const res = await fetch(`${serverUrl}/global/event`, { signal });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let currentPartType = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      let eventType = "";
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("event:")) {
          eventType = t.slice(6).trim();
        } else if (t.startsWith("data:")) {
          const jsonStr = t.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            const payload = data == null ? void 0 : data.payload;
            if (!(payload == null ? void 0 : payload.properties)) {
              eventType = "";
              continue;
            }
            const props = payload.properties;
            const sessionMatch = props.sessionID || ((_a = props == null ? void 0 : props.part) == null ? void 0 : _a.sessionID) || "";
            if (sessionMatch !== sid) {
              eventType = "";
              continue;
            }
            const pType = payload.type || eventType;
            if ((_b = props == null ? void 0 : props.part) == null ? void 0 : _b.type) currentPartType = props.part.type;
            const text = props.delta || props.text || ((_c = props == null ? void 0 : props.part) == null ? void 0 : _c.text) || "";
            if (!text) {
              eventType = "";
              continue;
            }
            const isText = pType.includes("text") || pType === "message.part.delta" && props.field === "text" && currentPartType !== "reasoning";
            const isReason = pType.includes("reason") || pType === "message.part.delta" && (props.field === "reasoning" || props.field === "text" && currentPartType === "reasoning");
            if (isText) {
              win.webContents.send("chat:chunk", { type: "text", text });
            } else if (isReason) {
              win.webContents.send("chat:chunk", { type: "thinking", text });
            }
          } catch {
          }
          eventType = "";
        }
      }
    }
  } catch {
  }
}
let conversationContext = "";
function setConversationContext(ctx) {
  conversationContext = ctx;
}
function clearConversationContext() {
  conversationContext = "";
}
async function sendPrompt(text, win, asFirstMessage = false) {
  var _a;
  const c = await getClient();
  const sid = await ensureSession();
  const abortController = new AbortController();
  if (win) {
    streamFromGlobalEvents(sid, win, abortController.signal);
  }
  const prefix = asFirstMessage ? "" : "用户消息: ";
  const fullText = conversationContext ? `${conversationContext}

${prefix}${text}` : text;
  try {
    const result = await Promise.race([
      c.session.prompt({
        path: { id: sid },
        body: {
          parts: [{ type: "text", text: fullText }],
          model: { providerID: "opencode", modelID: currentModel }
        }
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("AI 响应超时（60秒）")), 6e4)
      )
    ]);
    if (result.error) throw new Error(JSON.stringify(result.error));
    const parts = ((_a = result.data) == null ? void 0 : _a.parts) || [];
    const content = parts.filter((p) => p.type === "text").map((p) => p.text).join("");
    const thinking = parts.filter((p) => p.type === "reasoning").map((p) => p.text).join("\n");
    if (win) {
      win.webContents.send("chat:chunk", { type: "done", content, thinking });
    }
    return { content: content || "(空回复)", thinking };
  } finally {
    abortController.abort();
  }
}
function setModel(model) {
  currentModel = model;
}
function getCurrentModel() {
  return currentModel;
}
async function getModels() {
  var _a;
  try {
    const c = await getClient();
    const result = await c.config.providers();
    const providers = ((_a = result.data) == null ? void 0 : _a.providers) || [];
    const opencodeProvider = providers.find((p) => p.id === "opencode");
    if (!opencodeProvider) return ["big-pickle"];
    return Object.entries(opencodeProvider.models).filter(([_, m]) => {
      const cost = m.cost || { input: 0, output: 0 };
      return cost.input === 0 && cost.output === 0;
    }).map(([id]) => id);
  } catch (err) {
    console.warn("Failed to fetch models, using fallback:", err);
    return ["big-pickle"];
  }
}
function getBaseDir() {
  if (electron.app.isPackaged) {
    return path.join(electron.app.getPath("userData"), "resume-ai");
  }
  return path.join(__dirname, "..");
}
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function getTemplatesDir() {
  return ensureDir(path.join(getBaseDir(), "templates"));
}
function getResumesDir() {
  return ensureDir(path.join(getBaseDir(), "resumes"));
}
function generateResumeFileName(userName, templateLabel) {
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return `${userName}_${templateLabel}_${date}.pdf`;
}
const Store = require("electron-store");
const store = new Store({ encryptionKey: "resume-ai-local" });
function getResumes() {
  return store.get("resumes", []);
}
function saveResumes(resumes) {
  store.set("resumes", resumes);
}
function generateHTML(data, template) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const sectionsHtml = (template.sections || []).map((section) => {
    var _a2;
    const sectionData = (_a2 = data.sections) == null ? void 0 : _a2[section.id];
    if (!sectionData) return "";
    const fieldsHtml = section.fields.map((field) => {
      const value = sectionData[field.id];
      if (!value) return "";
      const lines = value.split("\n").filter((l) => l.trim());
      const formatted = lines.map((l) => `<p style="margin:0 0 2px 0">${l}</p>`).join("");
      return `<div style="margin-bottom:6px"><strong>${field.label}:</strong> ${formatted}</div>`;
    }).filter(Boolean).join("");
    const extraFieldsHtml = Object.entries(sectionData).filter(([k]) => !section.fields.some((f) => f.id === k)).filter(([, v]) => v).map(([k, v]) => {
      var _a3, _b2, _c2;
      const s = (_a3 = template.sections) == null ? void 0 : _a3.find((s2) => s2.id === section.id);
      const label = ((_c2 = (_b2 = s == null ? void 0 : s.fields) == null ? void 0 : _b2.find((f) => f.id === k)) == null ? void 0 : _c2.label) || k;
      return `<div style="margin-bottom:6px"><strong>${label}:</strong> ${v}</div>`;
    }).join("");
    if (!fieldsHtml && !extraFieldsHtml) return "";
    return `<div style="margin-bottom:24px;page-break-inside:avoid">
        <h2 style="font-size:16px;font-weight:bold;border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:8px;color:#1a1a1a">${section.label}</h2>
        ${fieldsHtml}${extraFieldsHtml}
      </div>`;
  }).join("");
  const name = ((_b = (_a = data.sections) == null ? void 0 : _a.personal) == null ? void 0 : _b.name) || "简历";
  const title = ((_d = (_c = data.sections) == null ? void 0 : _c.personal) == null ? void 0 : _d.title) || "";
  const email = ((_f = (_e = data.sections) == null ? void 0 : _e.personal) == null ? void 0 : _f.email) || "";
  const phone = ((_h = (_g = data.sections) == null ? void 0 : _g.personal) == null ? void 0 : _h.phone) || "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${name} - 简历</title>
<style>
  body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif; max-width:800px; margin:0 auto; padding:40px; color:#333; font-size:13px; }
  @media print { body { padding:20px; } }
</style></head>
<body>
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:24px;margin:0;color:#1a1a1a">${name}</h1>
    ${title ? `<p style="font-size:15px;color:#666;margin:4px 0 0 0">${title}</p>` : ""}
    <p style="font-size:12px;color:#999;margin:8px 0 0 0">${[email, phone].filter(Boolean).join(" | ")}</p>
  </div>
  ${sectionsHtml}
</body></html>`;
}
function readTemplateJSON(name) {
  const templatesDir = getTemplatesDir();
  for (const ext of ["", ".json"]) {
    const p = path.join(templatesDir, `${name}${ext}`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  return null;
}
function setupIPC() {
  electron.ipcMain.handle("chat:send", async (event, text) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(text, win);
      return result;
    } catch (err) {
      console.error("chat:send error:", err);
      return { content: `（错误）${err.message || String(err)}`, thinking: "" };
    }
  });
  electron.ipcMain.handle("chat:send-first-message", async (event, prompt) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(prompt, win, true);
      return result;
    } catch (err) {
      console.error("chat:send-first-message error:", err);
      return { content: `（错误）${err.message || String(err)}`, thinking: "" };
    }
  });
  electron.ipcMain.handle("chat:set-context", async (_event, context) => {
    setConversationContext(context);
  });
  electron.ipcMain.handle("chat:clear-context", async () => {
    clearConversationContext();
  });
  electron.ipcMain.handle("models:list", async () => {
    return getModels();
  });
  electron.ipcMain.handle("models:set", async (_event, model) => {
    setModel(model);
    store.set("currentModel", model);
  });
  electron.ipcMain.handle("models:current", async () => {
    return getCurrentModel();
  });
  electron.ipcMain.handle("apikey:set", async (_event, provider, key) => {
    store.set(`apikey-${provider}`, key);
  });
  electron.ipcMain.handle("apikey:get", async (_event, provider) => {
    return store.get(`apikey-${provider}`, null);
  });
  electron.ipcMain.handle("apikey:clear", async (_event, provider) => {
    store.delete(`apikey-${provider}`);
  });
  electron.ipcMain.handle("templates:list", async () => {
    const templatesDir = getTemplatesDir();
    if (!fs.existsSync(templatesDir)) return [];
    const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(templatesDir, f), "utf-8"));
      return { name: data.name, label: data.label, description: data.description };
    });
  });
  electron.ipcMain.handle("templates:get", async (_event, name) => {
    return readTemplateJSON(name);
  });
  electron.ipcMain.handle("resume:save", async (_event, data, template) => {
    var _a, _b;
    const resumes = getResumes();
    const id = `resume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const name = ((_b = (_a = data == null ? void 0 : data.sections) == null ? void 0 : _a.personal) == null ? void 0 : _b.name) || "未命名简历";
    const entry = {
      id,
      title: `${name} - ${(template == null ? void 0 : template.label) || "简历"}`,
      templateName: (template == null ? void 0 : template.name) || "",
      templateLabel: (template == null ? void 0 : template.label) || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      data
    };
    resumes.unshift(entry);
    saveResumes(resumes.slice(0, 50));
    return entry;
  });
  electron.ipcMain.handle("resume:update", async (_event, id, data, template) => {
    var _a, _b;
    const resumes = getResumes();
    const idx = resumes.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const name = ((_b = (_a = data == null ? void 0 : data.sections) == null ? void 0 : _a.personal) == null ? void 0 : _b.name) || "未命名简历";
    resumes[idx].data = data;
    resumes[idx].title = `${name} - ${(template == null ? void 0 : template.label) || resumes[idx].templateLabel || "简历"}`;
    resumes[idx].templateName = (template == null ? void 0 : template.name) || resumes[idx].templateName;
    resumes[idx].templateLabel = (template == null ? void 0 : template.label) || resumes[idx].templateLabel;
    resumes[idx].createdAt = (/* @__PURE__ */ new Date()).toISOString();
    saveResumes(resumes);
    return resumes[idx];
  });
  electron.ipcMain.handle("resume:list", async () => {
    return getResumes();
  });
  electron.ipcMain.handle("resume:get", async (_event, id) => {
    const resumes = getResumes();
    return resumes.find((r) => r.id === id) || null;
  });
  electron.ipcMain.handle("resume:delete", async (_event, id) => {
    const resumes = getResumes().filter((r) => r.id !== id);
    saveResumes(resumes);
  });
  electron.ipcMain.handle("resume:export-pdf", async (_event, data, template) => {
    const win = new electron.BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    const html = generateHTML(data, template);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        try {
          win.destroy();
        } catch {
        }
      };
      win.webContents.on("did-finish-load", async () => {
        var _a, _b;
        try {
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
          });
          const name = ((_b = (_a = data == null ? void 0 : data.sections) == null ? void 0 : _a.personal) == null ? void 0 : _b.name) || "简历";
          const tmplLabel = (template == null ? void 0 : template.label) || "简历";
          const defaultName = generateResumeFileName(name, tmplLabel);
          const result = await electron.dialog.showSaveDialog(win, {
            title: "导出简历",
            defaultPath: defaultName,
            filters: [{ name: "PDF", extensions: ["pdf"] }]
          });
          if (result.canceled || !result.filePath) {
            cleanup();
            resolve({ success: false, reason: "canceled" });
            return;
          }
          fs.writeFileSync(result.filePath, pdfBuffer);
          try {
            const resumesDir = getResumesDir();
            const copyPath = path.join(resumesDir, path.basename(result.filePath));
            fs.writeFileSync(copyPath, pdfBuffer);
          } catch {
          }
          cleanup();
          resolve({ success: true, path: result.filePath });
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
      win.webContents.on("did-fail-load", (_event2, errorCode, errorDescription) => {
        cleanup();
        reject(new Error(`加载失败: ${errorDescription}`));
      });
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });
  });
  electron.ipcMain.handle("resume:save-pdf-buffer", async (_event, buffer) => {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, reason: "no_window" };
    const result = await electron.dialog.showSaveDialog(win, {
      title: "导出简历",
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, reason: "canceled" };
    }
    fs.writeFileSync(result.filePath, Buffer.from(buffer));
    try {
      const resumesDir = getResumesDir();
      const copyPath = path.join(resumesDir, path.basename(result.filePath));
      fs.writeFileSync(copyPath, Buffer.from(buffer));
    } catch {
    }
    return { success: true, path: result.filePath };
  });
  electron.ipcMain.handle("pdf:extract-style", async (_event, filePath) => {
    try {
      const { extractPdfStyle } = await Promise.resolve().then(() => require("./pdf-extractor-BxKYHj3d.js"));
      return await extractPdfStyle(filePath);
    } catch (err) {
      console.error("PDF extraction error:", err);
      return { error: err.message || String(err) };
    }
  });
}
async function initOpencode() {
  try {
    await startOpencode();
    if (isMockMode()) ;
    else {
      const savedModel = store.get("currentModel");
      if (savedModel) {
        setModel(savedModel);
        console.log("Restored model:", savedModel);
      }
      console.log("Opencode initialized");
    }
  } catch (err) {
    console.warn("Opencode failed to start, entering mock mode:", err.message || err);
  }
}
let mainWindow = null;
function ensureDirectories() {
  getTemplatesDir();
  getResumesDir();
  const devTemplates = path.join(__dirname, "..", "templates");
  if (fs.existsSync(devTemplates)) {
    const targetDir = getTemplatesDir();
    for (const file of fs.readdirSync(devTemplates)) {
      if (file.endsWith(".json")) {
        const dest = path.join(targetDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(devTemplates, file), dest);
        }
      }
    }
  }
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "hiddenInset",
    show: false
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12") {
      mainWindow == null ? void 0 : mainWindow.webContents.toggleDevTools();
    }
  });
  mainWindow.webContents.on("crashed", (event, killed) => {
    console.error("Renderer crashed:", { killed });
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
electron.app.whenReady().then(async () => {
  ensureDirectories();
  setupIPC();
  await initOpencode();
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
