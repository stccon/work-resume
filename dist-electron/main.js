"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
let serverProcess = null;
let serverUrl = null;
let currentSessionId = null;
async function startOpencode() {
  if (serverProcess) return;
  return new Promise((resolve, reject) => {
    var _a, _b;
    const cmd = process.platform === "win32" ? "opencode.cmd" : "opencode";
    serverProcess = child_process.spawn(cmd, ["serve"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: process.env
    });
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
async function createSession() {
  if (!serverUrl) throw new Error("opencode 未启动");
  const res = await fetch(`${serverUrl}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!res.ok) {
    throw new Error(`创建会话失败: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.id) throw new Error("创建会话返回无 ID");
  return data.id;
}
async function sendPromptToSession(sessionId, text) {
  var _a;
  if (!serverUrl) throw new Error("opencode 未启动");
  const res = await fetch(`${serverUrl}/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parts: [{ type: "text", text }],
      model: { providerID: "opencode", modelID: "big-pickle" }
    })
  });
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${await res.text()}`);
  }
  const result = await res.json();
  const parts = result.parts || ((_a = result.data) == null ? void 0 : _a.parts) || [];
  return parts.filter((p) => p.type === "text").map((p) => p.text).join("");
}
async function sendPrompt(text) {
  if (!serverUrl) throw new Error("opencode 未连接，请等待启动完成");
  const sid = currentSessionId || await createSession();
  currentSessionId = sid;
  return await sendPromptToSession(sid, text);
}
function getModels() {
  return ["qwen3.6", "big-pickle"];
}
function setupIPC() {
  electron.ipcMain.handle("chat:send", async (_event, text) => {
    try {
      const reply = await sendPrompt(text);
      return reply;
    } catch (err) {
      console.error("chat:send error:", err);
      return `（错误）${err.message || String(err)}`;
    }
  });
  electron.ipcMain.handle("models:list", async () => {
    return getModels();
  });
  electron.ipcMain.handle("models:set", async (_event, model) => {
  });
  electron.ipcMain.handle("models:current", async () => {
    return "qwen3.6";
  });
  electron.ipcMain.handle("apikey:set", async (_event, provider, key) => {
    const { safeStorage } = require("electron");
    const Store = require("electron-store");
    const store = new Store({ encryptionKey: "resume-ai-local" });
    store.set(`apikey-${provider}`, key);
  });
  electron.ipcMain.handle("apikey:get", async (_event, provider) => {
    const Store = require("electron-store");
    const store = new Store({ encryptionKey: "resume-ai-local" });
    return store.get(`apikey-${provider}`, null);
  });
  electron.ipcMain.handle("apikey:clear", async (_event, provider) => {
    const Store = require("electron-store");
    const store = new Store({ encryptionKey: "resume-ai-local" });
    store.delete(`apikey-${provider}`);
  });
  electron.ipcMain.handle("templates:list", async () => {
    const fs = require("fs");
    const path2 = require("path");
    const templatesDir = path2.join(__dirname, "../templates");
    if (!fs.existsSync(templatesDir)) return [];
    const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const data = JSON.parse(fs.readFileSync(path2.join(templatesDir, f), "utf-8"));
      return { name: data.name, label: data.label, description: data.description };
    });
  });
  electron.ipcMain.handle("templates:get", async (_event, name) => {
    const fs = require("fs");
    const path2 = require("path");
    const filePath = path2.join(__dirname, "../templates", `${name}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  });
}
async function initOpencode() {
  await startOpencode();
  {
    console.log("Opencode initialized");
  }
}
let mainWindow = null;
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
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
