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
const os = require("os");
const logDir = path.join(__dirname, "..", "logs");
const logFile = path.join(logDir, `debug-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.log`);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
function log(tag, ...args) {
  const time = (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
  const line = `[${time}] [${tag}] ${args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}`;
  fs.appendFileSync(logFile, line + "\n");
}
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
function isConnected() {
  return serverUrl !== null;
}
const LISTEN_RE = /opencode server listening on\s+(https?:\/\/[^\s]+)/;
function spawnServer() {
  const cmd = getBinaryPath();
  log("server", "spawning:", cmd, "serve");
  serverProcess = child_process.spawn(cmd, ["serve"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: process.env
  });
  const proc = serverProcess;
  return new Promise((resolve, reject) => {
    var _a, _b;
    let output = "";
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error(`启动超时（20秒）
${output.slice(-500)}`));
      }
    }, 2e4);
    function onData(data) {
      output += data.toString();
      const m = LISTEN_RE.exec(output);
      if (m && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(m[1].replace(/\/+$/, ""));
      }
    }
    (_a = proc.stdout) == null ? void 0 : _a.on("data", onData);
    (_b = proc.stderr) == null ? void 0 : _b.on("data", onData);
    proc.on("error", (err) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(err);
      }
    });
    proc.on("exit", (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`进程已退出 (code ${code})
${output.slice(-500)}`));
      }
    });
  });
}
async function startOpencode() {
  if (serverProcess) return;
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = await spawnServer();
      serverUrl = url;
      log("server", "opencode server ready at", serverUrl);
      return;
    } catch (err) {
      log("server", `attempt ${attempt}/${maxAttempts} failed:`, err.message || err);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2e3));
      } else {
        serverUrl = null;
        serverProcess = null;
        throw err;
      }
    }
  }
}
async function retryOpencode() {
  serverUrl = null;
  serverProcess = null;
  client = null;
  sessionId = null;
  try {
    await startOpencode();
    return true;
  } catch {
    return false;
  }
}
let sessionLock = null;
const resumeSessions = /* @__PURE__ */ new Map();
let currentResumeId = null;
async function getClient() {
  if (client) return client;
  if (!serverUrl) throw new Error("Opencode 未连接");
  const sdk = await import("@opencode-ai/sdk");
  client = sdk.createOpencodeClient({ baseUrl: serverUrl });
  return client;
}
async function ensureSession() {
  if (sessionId) return sessionId;
  if (sessionLock) {
    await sessionLock;
    if (sessionId) return sessionId;
  }
  sessionLock = (async () => {
    var _a;
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
  })();
  await sessionLock;
  return sessionId;
}
async function streamFromGlobalEvents(sid, win, signal) {
  var _a, _b;
  if (!serverUrl) return;
  try {
    const res = await fetch(`${serverUrl}/global/event`, { signal });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
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
            const text = props.delta || props.text || ((_b = props == null ? void 0 : props.part) == null ? void 0 : _b.text) || "";
            if (!text) {
              eventType = "";
              continue;
            }
            log("sse", `event pType=${pType} field=${props.field || "?"} textLen=${text.length}`);
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
function switchResume(resumeId) {
  if (currentResumeId && sessionId) {
    resumeSessions.set(currentResumeId, sessionId);
  }
  if (resumeSessions.has(resumeId)) {
    sessionId = resumeSessions.get(resumeId);
    sessionLock = null;
  } else {
    sessionId = null;
    sessionLock = null;
  }
  currentResumeId = resumeId;
}
function removeResumeSession(resumeId) {
  resumeSessions.delete(resumeId);
}
async function sendPrompt(text, win, asFirstMessage = false) {
  var _a;
  const c = await getClient();
  const sid = await ensureSession();
  if (currentResumeId && !resumeSessions.has(currentResumeId)) {
    resumeSessions.set(currentResumeId, sid);
  }
  const abortController = new AbortController();
  if (win) {
    streamFromGlobalEvents(sid, win, abortController.signal);
  }
  const prefix = asFirstMessage ? "" : "用户消息: ";
  const fullText = conversationContext ? `${conversationContext}

${prefix}${text}` : text;
  log("prompt", `fullText len=${fullText.length} text=${text.slice(0, 100)}`);
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
    if (result.error) {
      const errorMsg = JSON.stringify(result.error);
      const isQuotaError = QUOTA_ERROR_PATTERNS.some((pattern) => pattern.test(errorMsg));
      if (isQuotaError) {
        throw new Error("TOKEN_QUOTA_EXCEEDED: token 配额不足，请充值后重试");
      }
      throw new Error(errorMsg);
    }
    const parts = ((_a = result.data) == null ? void 0 : _a.parts) || [];
    const content = parts.filter((p) => p.type === "text").map((p) => p.text).join("");
    log("prompt-result", `parts=${parts.length} contentLen=${content.length}`);
    if (win) {
      win.webContents.send("chat:chunk", { type: "done", content });
    }
    return { content: content || "(空回复)", thinking: "" };
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
const QUOTA_ERROR_PATTERNS = [
  /insufficient balance/i,
  /insufficient credit/i,
  /quota exceeded/i,
  /quota limit/i,
  /payment required/i,
  /out of tokens/i,
  /balance not enough/i,
  /credit.*not.*available/i,
  /subscription.*expired/i,
  /expired account/i
];
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
    return electron.app.getPath("userData");
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
function getVisualThemesDir() {
  return ensureDir(path.join(getBaseDir(), "themes"));
}
function renderResumeCSS(theme) {
  const c = theme.colors;
  const t = theme.typography;
  const s = theme.spacing;
  const f = theme.fonts;
  const r = theme.borderRadius;
  const v2 = theme.v2Config;
  const baseCSS = `* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:${f.body}; font-size:${t.bodyFontSize}; color:${c.text}; line-height:${t.lineHeight}; background:${c.background}; }

@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }

.resume-header { margin-bottom:20px; }
.resume-header.centered { text-align:center; }
.resume-header.left { text-align:left; }
.resume-header.colored-bar { text-align:center; background:${c.headerBg || c.primary}; padding:${s.pagePadding}; margin:-${s.pagePadding}; margin-bottom:20px; }
.resume-header.colored-bar .resume-name { color:${c.headerText || "#fff"}; }
.resume-header.colored-bar .resume-title { color:${c.headerText ? `${c.headerText}cc` : "#ffffffcc"}; }
.resume-header.colored-bar .resume-contact { color:${c.headerText ? `${c.headerText}99` : "#ffffff99"}; }

.resume-name { font-family:${f.heading}; font-size:${t.nameFontSize}; font-weight:700; color:${c.text}; margin:0; }
.resume-title { font-family:${f.heading}; font-size:${t.titleFontSize}; color:${c.textMuted}; margin-top:4px; }
.resume-contact { font-size:11px; color:${c.textMuted}; margin-top:8px; display:flex; flex-wrap:wrap; gap:8px 16px; }
.resume-header.centered .resume-contact { justify-content:center; }
.resume-header.left .resume-contact { justify-content:flex-start; }

.resume-section { margin-bottom:${s.sectionGap}; }
.resume-section.card { background:${c.sectionBg || c.primaryLight}; border-radius:${r}; padding:12px 16px; }

.resume-section-title { margin-bottom:8px; font-family:${f.heading}; }
.resume-section-title.underlined { font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.primary}; border-bottom:2px solid ${c.primary}; padding-bottom:4px; }
.resume-section-title.underlined.dot { border-bottom:none; padding-bottom:0; }
.resume-section-title.underlined.dot::after { display:block; content:""; width:40px; height:3px; background:${c.primary}; border-radius:2px; margin-top:4px; }
.resume-section-title.underlined.dot.centered::after { margin:4px auto 0; }
.resume-section-title.colored-bg { font-size:${t.sectionTitleFontSize}; font-weight:700; color:#fff; background:${c.primary}; padding:4px 10px; border-radius:${r}; }
.resume-section-title.colored-bg.dot { background:none; color:${c.text}; padding:0; }
.resume-section-title.colored-bg.dot::before { content:"●"; color:${c.primary}; margin-right:6px; font-size:10px; }
.resume-section-title.minimal { font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.text}; }
.resume-section-title.minimal.dot::before { content:"●"; color:${c.primary}; margin-right:6px; font-size:10px; }

.resume-body-text { font-size:${t.bodyFontSize}; line-height:${t.lineHeight}; white-space:pre-wrap; }

.resume-field-row { display:flex; margin-bottom:3px; font-size:${t.bodyFontSize}; line-height:1.5; }
.resume-field-label { color:${c.textMuted}; width:88px; flex-shrink:0; }
.resume-field-value { color:${c.text}; }

.resume-entry { margin-bottom:${s.entryGap}; }
.resume-entry-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
.resume-entry-main-title { font-family:${f.heading}; font-weight:600; font-size:${t.bodyFontSize}; color:${c.text}; }
.resume-entry-subtitle { font-size:11px; color:${c.textMuted}; margin-top:1px; }
.resume-entry-date { font-size:11px; color:${c.textMuted}; white-space:nowrap; margin-left:12px; }
.resume-entry-divider { border:none; border-top:1px solid ${c.border}; margin:${s.entryGap} 0; }

.resume-prose { margin:6px 0; }
.resume-prose p { margin-bottom:4px; line-height:${t.lineHeight}; }

.resume-bullets { margin:4px 0; padding:0; list-style:none; }
.resume-bullets li { position:relative; padding-left:14px; margin-bottom:3px; font-size:${t.bodyFontSize}; line-height:1.5; }
.resume-bullets li::before { content:"•"; position:absolute; left:0; color:${c.primary}; font-weight:700; }

.resume-tags { display:flex; flex-wrap:wrap; gap:4px 6px; margin:4px 0; }
.resume-tag { display:inline-block; background:${c.primaryLight}; color:${c.primary}; padding:1px 8px; border-radius:999px; font-size:10px; font-family:${f.body}; line-height:1.6; }

.resume-two-column { display:flex; min-height:100vh; }
.resume-sidebar { background:${c.sidebarBg || c.primary}; padding:${s.pagePadding}; }
.resume-sidebar .resume-name { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-title { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-contact { color:${c.sidebarText ? `${c.sidebarText}99` : "#ffffff99"}; }
.resume-sidebar .resume-section-title { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-section-title.underlined { border-bottom-color:${c.sidebarText ? `${c.sidebarText}66` : "#ffffff66"}; }
.resume-sidebar .resume-section-title.colored-bg { background:${c.sidebarText ? `${c.sidebarText}22` : "#ffffff22"}; color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-section-title.underlined.dot::after { background:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-section-title.minimal.dot::before,
.resume-sidebar .resume-section-title.colored-bg.dot::before { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-field-label { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; width:80px; }
.resume-sidebar .resume-field-value { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-entry-main-title { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-entry-subtitle { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-entry-date { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-entry-divider { border-top-color:${c.sidebarText ? `${c.sidebarText}33` : "#ffffff33"}; }
.resume-sidebar .resume-tag { background:${c.sidebarText ? `${c.sidebarText}22` : "#ffffff22"}; color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-bullets li::before { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-prose { color:${c.sidebarText || "#fff"}; }
.resume-skills-overview { margin-bottom:8px; }
.resume-skills-category { margin-bottom:6px; display:flex; align-items:flex-start; gap:8px; }
.resume-skills-cat-label { font-size:${t.bodyFontSize}; color:${c.textMuted}; white-space:nowrap; min-width:60px; flex-shrink:0; }
.resume-sidebar .resume-skills-cat-label { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-main { background:${c.background}; padding:${s.pagePadding}; }
.resume-footer { text-align:center; font-size:10px; color:${c.textMuted}; margin-top:24px; padding-top:12px; border-top:1px solid ${c.border}; }`;
  const avatarCSS = renderAvatarCSS(theme);
  if (theme.series !== "v2" || !v2) {
    return baseCSS + "\n" + avatarCSS;
  }
  const v2CSS = renderV2CSS(theme);
  return baseCSS + "\n" + avatarCSS + "\n" + v2CSS;
}
function renderAvatarCSS(theme) {
  const c = theme.colors;
  const accentColor = c.accent || c.primary;
  const sizeMap = { small: "40px", medium: "64px", large: "96px" };
  const shapeMap = { circle: "50%", square: "0", rounded: "8px" };
  const sizes = ["small", "medium", "large"].map((sz) => {
    const px = sizeMap[sz];
    return `.resume-avatar.size-${sz} { width:${px}; height:${px}; }`;
  }).join("\n");
  const shapes = ["circle", "square", "rounded"].map((sh) => {
    const r = shapeMap[sh];
    return `.resume-avatar.shape-${sh} { border-radius:${r}; }`;
  }).join("\n");
  const borderNone = `.resume-avatar.border-none { box-shadow:none; border:none; }`;
  const borderThin = `.resume-avatar.border-thin { box-shadow:0 0 0 1px ${c.border}; }`;
  const borderThick = `.resume-avatar.border-thick { box-shadow:0 0 0 3px ${c.background}, 0 0 0 4px ${c.primary}; padding:2px; background:${c.background}; }`;
  const borderColored = `.resume-avatar.border-colored { box-shadow:0 0 0 2px ${c.background}, 0 0 0 4px ${accentColor}; padding:2px; background:${accentColor}; }`;
  return `
.resume-avatar { display:block; object-fit:cover; flex-shrink:0; box-sizing:border-box; vertical-align:top; max-width:100%; }
.resume-avatar.placement-top-right { margin-left:16px; margin-bottom:8px; }
.resume-avatar.placement-top-left { margin-right:16px; margin-bottom:8px; }
.resume-avatar.placement-inline-left { margin-right:12px; align-self:flex-start; }
.resume-avatar.placement-sidebar-top { display:block; margin:0 auto 16px; }
.resume-avatar.placement-magazine-top { display:block; margin:0 0 16px; }
${sizes}
${shapes}
${borderNone}
${borderThin}
${borderThick}
${borderColored}

.resume-header.with-avatar-top-right { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.resume-header.with-avatar-top-right .resume-avatar-block { flex:0 0 auto; }
.resume-header.with-avatar-top-right .resume-name-block { flex:1 1 auto; min-width:0; }

.resume-header.with-avatar-top-left { display:flex; align-items:flex-start; gap:16px; }
.resume-header.with-avatar-top-left .resume-avatar-block { flex:0 0 auto; }
.resume-header.with-avatar-top-left .resume-name-block { flex:1 1 auto; min-width:0; }

.resume-header.with-avatar-inline-left { display:flex; align-items:flex-start; gap:12px; }
.resume-header.with-avatar-inline-left .resume-avatar-block { flex:0 0 auto; }
.resume-header.with-avatar-inline-left .resume-name-block { flex:1 1 auto; min-width:0; }

.resume-sidebar.with-sidebar-avatar { text-align:center; }
.resume-sidebar.with-sidebar-avatar .resume-header { text-align:center; }
.resume-sidebar.with-sidebar-avatar .resume-header .resume-contact { justify-content:center; }

@media print {
  .resume-avatar { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .resume-avatar.size-small { width:40px !important; height:40px !important; }
  .resume-avatar.size-medium { width:64px !important; height:64px !important; }
  .resume-avatar.size-large { width:96px !important; height:96px !important; }
  .resume-header.with-avatar-top-right,
  .resume-header.with-avatar-top-left,
  .resume-header.with-avatar-inline-left { display:flex !important; align-items:flex-start !important; }
  .resume-header.with-avatar-top-right .resume-avatar-block,
  .resume-header.with-avatar-top-left .resume-avatar-block,
  .resume-header.with-avatar-inline-left .resume-avatar-block { flex:0 0 auto !important; }
}
`;
}
function renderV2CSS(theme) {
  const c = theme.colors;
  const t = theme.typography;
  const s = theme.spacing;
  const f = theme.fonts;
  const v2 = theme.v2Config;
  const family = theme.family;
  const monoFont = f.mono || "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const dividerColor = c.divider || c.border;
  const accentColor = c.accent || c.primary;
  const nameLetterSpacing = t.nameLetterSpacing || "normal";
  const sectionTransform = t.sectionTitleTransform || "none";
  const sectionLetterSpacing = t.sectionTitleLetterSpacing || "normal";
  const nameStyleRules = v2.nameStyle === "uppercase" ? `text-transform:uppercase; letter-spacing:0.08em; font-weight:600;` : v2.nameStyle === "serif-large" ? `font-family:${f.heading}; font-weight:400; letter-spacing:-0.01em; font-style:normal;` : `letter-spacing:${nameLetterSpacing};`;
  const bulletContent = v2.bulletStyle === "square" ? "▪" : v2.bulletStyle === "dash" ? "—" : v2.bulletStyle === "arrow" ? "›" : v2.bulletStyle === "none" ? "" : "•";
  const tagCSS = v2.tagStyle === "flat" ? `background:${c.background}; color:${c.text}; border:1px solid ${c.border}; border-radius:0; padding:2px 10px;` : v2.tagStyle === "underline" ? `background:transparent; color:${c.text}; border-bottom:1px solid ${c.primary}; border-radius:0; padding:0 2px 1px;` : `background:${c.primaryLight}; color:${c.primary}; border-radius:999px; padding:2px 10px;`;
  let sectionTitleRules = "";
  let sectionTitleAfterRules = "";
  if (v2.sectionTitleRule === "full-line") {
    sectionTitleRules = `font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.text}; border-bottom:1px solid ${dividerColor}; padding-bottom:6px; letter-spacing:${sectionLetterSpacing}; ${sectionTransform === "uppercase" ? "text-transform:uppercase;" : ""}`;
  } else if (v2.sectionTitleRule === "short-line") {
    sectionTitleRules = `font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.text}; border-bottom:none; padding-bottom:0; letter-spacing:${sectionLetterSpacing}; ${sectionTransform === "uppercase" ? "text-transform:uppercase;" : ""}`;
    sectionTitleAfterRules = `display:block; content:""; width:36px; height:2px; background:${accentColor}; margin-top:6px;`;
  } else if (v2.sectionTitleRule === "double-line") {
    sectionTitleRules = `font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.text}; border-top:1px solid ${dividerColor}; border-bottom:1px solid ${dividerColor}; padding:6px 0; letter-spacing:${sectionLetterSpacing}; ${sectionTransform === "uppercase" ? "text-transform:uppercase;" : ""}`;
  } else if (v2.sectionTitleRule === "boxed") {
    sectionTitleRules = `font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.background}; background:${c.text}; padding:4px 12px; display:inline-block; letter-spacing:${sectionLetterSpacing}; ${sectionTransform === "uppercase" ? "text-transform:uppercase;" : ""}`;
  }
  const contactSeparator = v2.contactSeparator || " · ";
  const headerDividerCSS = v2.showHeaderDivider ? `border-bottom:1px solid ${dividerColor}; padding-bottom:16px;` : "";
  const headerVariantCSS = v2.headerVariant === "split" ? `display:flex; align-items:flex-end; justify-content:space-between; gap:24px;` : v2.headerVariant === "magazine" ? `text-align:left; border-bottom:2px solid ${c.text}; padding-bottom:14px;` : `text-align:left; ${headerDividerCSS}`;
  return `
/* === V2 SERIES: ${(family == null ? void 0 : family.toUpperCase()) || "PREMIUM"} === */
.resume-document { font-feature-settings:"kern","liga","calt"; text-rendering:optimizeLegibility; -webkit-font-smoothing:antialiased; }
.resume-document.lang-en { font-family:${f.body}; }
.resume-document.lang-zh { font-family:${f.body}; }

.resume-header.v2 { ${headerVariantCSS} }
.resume-header.v2 .resume-name { ${nameStyleRules} }
.resume-header.v2.split .resume-name-block { flex:1; }
.resume-header.v2.split .resume-contact-block { text-align:right; font-size:11px; color:${c.textMuted}; }
.resume-header.v2 .resume-contact { display:block; margin-top:6px; font-size:11px; color:${c.textMuted}; }
.resume-header.v2 .resume-contact span + span::before { content:"${contactSeparator}"; color:${c.textMuted}; margin:0 6px; opacity:0.6; }
.resume-header.v2 .resume-title { font-family:${f.body}; font-size:${t.titleFontSize}; color:${c.textMuted}; margin-top:4px; font-weight:400; letter-spacing:0.02em; }

${v2.headerVariant === "magazine" ? `.resume-header.v2 .resume-title { font-style:italic; color:${c.textMuted}; }
.resume-header.v2 .resume-contact span + span::before { content:"${contactSeparator}"; color:${accentColor}; margin:0 8px; opacity:0.8; }` : ""}

${v2.headerVariant === "minimal" ? `.resume-header.v2 .resume-name { font-weight:600; }` : ""}

.resume-section.v2 { margin-bottom:${s.sectionGap}; }

.resume-section-title.v2 { ${sectionTitleRules} margin-bottom:10px; }
${sectionTitleAfterRules ? `.resume-section-title.v2::after { ${sectionTitleAfterRules} }` : ""}

.resume-section-title.v2.centered { text-align:center; }
.resume-section-title.v2.centered::after { margin-left:auto; margin-right:auto; }

.resume-body-text.v2 { font-size:${t.bodyFontSize}; line-height:${t.lineHeight}; white-space:pre-wrap; color:${c.text}; }
.resume-prose.v2 p { margin-bottom:4px; line-height:${t.lineHeight}; color:${c.text}; }

.resume-bullets.v2 { margin:4px 0; padding:0; list-style:none; }
.resume-bullets.v2 li { position:relative; padding-left:16px; margin-bottom:4px; font-size:${t.bodyFontSize}; line-height:${t.lineHeight}; color:${c.text}; }
.resume-bullets.v2 li::before { content:"${bulletContent}"; position:absolute; left:0; top:0; color:${accentColor}; font-weight:700; }
${v2.bulletStyle === "none" ? ".resume-bullets.v2 li { padding-left:0; } .resume-bullets.v2 li::before { content:none; }" : ""}

.resume-tags.v2 { display:flex; flex-wrap:wrap; gap:4px 8px; margin:6px 0; }
.resume-tag.v2 { display:inline-block; ${tagCSS} font-size:10px; line-height:1.6; font-family:${f.body}; }

.resume-field-row.v2 { display:flex; margin-bottom:4px; font-size:${t.bodyFontSize}; line-height:1.5; }
.resume-field-label.v2 { color:${c.textMuted}; width:88px; flex-shrink:0; font-weight:500; }
.resume-field-value.v2 { color:${c.text}; }

.resume-entry.v2 { margin-bottom:${s.entryGap}; }
.resume-entry-header.v2 { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; gap:12px; }
.resume-entry-main-title.v2 { font-family:${f.heading}; font-weight:600; font-size:${parseInt(t.bodyFontSize) + 1}px; color:${c.text}; }
.resume-entry-subtitle.v2 { font-size:11px; color:${c.textMuted}; margin-top:2px; font-weight:400; }
.resume-entry-date.v2 { font-family:${f.mono ? monoFont : f.body}; font-size:10.5px; color:${c.textMuted}; white-space:nowrap; font-weight:500; letter-spacing:0.01em; }
.resume-entry-divider.v2 { border:none; border-top:1px solid ${dividerColor}; margin:${s.entryGap} 0; }

${v2.sectionTitleRule === "boxed" ? `.resume-section.v2 { padding-top:0; }` : ""}

${family === "minimal" ? `
.resume-document { letter-spacing:-0.005em; }
.resume-name { font-feature-settings:"ss01","cv11"; }
.resume-tags.v2 { gap:2px 6px; }
` : ""}

${family === "modern" ? `
.resume-document { letter-spacing:0.01em; }
.resume-section.v2 { padding-bottom:0; }
.resume-section-title.v2 { font-weight:600; }
` : ""}

${family === "editorial" ? `
.resume-document { letter-spacing:0.005em; }
.resume-name { font-weight:400; }
.resume-section-title.v2 { font-weight:500; font-style:italic; }
.resume-tags.v2 { gap:6px 10px; }
` : ""}

.resume-two-column.v2 .resume-sidebar { padding:${s.pagePadding}; }
.resume-two-column.v2 .resume-sidebar .resume-name { color:${c.sidebarText || "#fff"}; }
.resume-two-column.v2 .resume-sidebar .resume-title { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-two-column.v2 .resume-sidebar .resume-contact { color:${c.sidebarText ? `${c.sidebarText}99` : "#ffffff99"}; }
.resume-two-column.v2 .resume-sidebar .resume-section { margin-bottom:${parseInt(s.sectionGap) - 6}px; }
.resume-two-column.v2 .resume-sidebar .resume-section-title.v2 { color:${c.sidebarText || "#fff"}; ${sectionTitleRules} }
${sectionTitleAfterRules ? `.resume-two-column.v2 .resume-sidebar .resume-section-title.v2::after { ${sectionTitleAfterRules} background:${c.sidebarText || "#fff"}; }` : ""}
.resume-two-column.v2 .resume-sidebar .resume-body-text.v2,
.resume-two-column.v2 .resume-sidebar .resume-prose.v2 p { color:${c.sidebarText || "#fff"}; }
.resume-two-column.v2 .resume-sidebar .resume-field-label.v2 { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-two-column.v2 .resume-sidebar .resume-field-value.v2 { color:${c.sidebarText || "#fff"}; }
.resume-two-column.v2 .resume-sidebar .resume-entry-main-title.v2 { color:${c.sidebarText || "#fff"}; }
.resume-two-column.v2 .resume-sidebar .resume-entry-subtitle.v2 { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-two-column.v2 .resume-sidebar .resume-entry-date.v2 { color:${c.sidebarText ? `${c.sidebarText}b3` : "#ffffffb3"}; }
.resume-two-column.v2 .resume-sidebar .resume-entry-divider.v2 { border-top-color:${c.sidebarText ? `${c.sidebarText}33` : "#ffffff33"}; }
.resume-two-column.v2 .resume-sidebar .resume-bullets.v2 li { color:${c.sidebarText || "#fff"}; }
.resume-two-column.v2 .resume-sidebar .resume-bullets.v2 li::before { color:${c.sidebarText || "#fff"}; opacity:0.85; }
.resume-two-column.v2 .resume-sidebar .resume-tag.v2 {
  ${v2.tagStyle === "flat" ? `background:transparent; color:${c.sidebarText || "#fff"}; border:1px solid ${c.sidebarText ? `${c.sidebarText}55` : "#ffffff55"}; border-radius:0; padding:2px 10px;` : v2.tagStyle === "underline" ? `background:transparent; color:${c.sidebarText || "#fff"}; border-bottom:1px solid ${c.sidebarText ? `${c.sidebarText}88` : "#ffffff88"}; border-radius:0; padding:0 2px 1px;` : `background:${c.sidebarText ? `${c.sidebarText}22` : "#ffffff22"}; color:${c.sidebarText || "#fff"}; border-radius:999px; padding:2px 10px;`}
}
.resume-two-column.v2 .resume-sidebar .resume-skills-cat-label { color:${c.sidebarText ? `${c.sidebarText}b3` : "#ffffffb3"}; }
`;
}
function sectionTitleClass(theme) {
  const isV2 = theme.series === "v2";
  const base = `resume-section-title ${theme.sectionStyle}`;
  const deco = theme.decorationStyle === "line" && theme.sectionStyle === "underlined" ? "" : theme.decorationStyle;
  if (isV2) {
    return `resume-section-title v2 ${theme.sectionStyle}`;
  }
  const centered = theme.headerStyle === "centered" && theme.decorationStyle === "dot" ? " centered" : "";
  return deco ? `${base} ${deco}${centered}` : base;
}
function htmlEscapedText(v) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return htmlEscapedText(v);
  if (typeof v === "object") return htmlEscapedText(JSON.stringify(v));
  return htmlEscapedText(String(v));
}
function getFieldLabel(section, fieldId) {
  var _a;
  const field = (_a = section == null ? void 0 : section.fields) == null ? void 0 : _a.find((f) => f.id === fieldId);
  if (field) return htmlEscapedText(field.label);
  const known = {
    name: "姓名",
    email: "邮箱",
    phone: "电话",
    date: "时间",
    tech: "技术栈",
    detail: "详细描述",
    projects: "项目经历",
    responsibilities: "职责",
    achievements: "成果",
    startDate: "开始时间",
    endDate: "结束时间",
    company: "公司",
    position: "职位",
    school: "学校",
    major: "专业",
    degree: "学位",
    gradYear: "毕业年份",
    location: "地点",
    gpa: "GPA",
    honors: "荣誉奖项",
    coursework: "核心课程",
    role: "担任角色",
    link: "项目链接",
    highlights: "项目亮点",
    industry: "行业",
    linkedin: "LinkedIn",
    title: "求职意向"
  };
  for (const [key, label] of Object.entries(known)) {
    if (fieldId.includes(key)) return label;
  }
  return htmlEscapedText(fieldId);
}
function classifyField(fieldId) {
  const k = fieldId.toLowerCase();
  if (k.includes("detail") || k.includes("description") || k.includes("summary")) return "prose";
  if (k.includes("achievement") || k.includes("accomplishment") || k.includes("highlight") || k.includes("responsibility") || k.includes("responsibilities")) return "bullet-list";
  if (k.includes("tech") || k.includes("skill") || k.includes("tool") || k.includes("stack") || k.includes("keyword") || k.includes("language")) return "tags";
  return "label-value";
}
function renderProse(value, v2 = false) {
  const s = formatValue(value);
  const lines = s.split("\n").filter((l) => l.trim());
  const cls = v2 ? "resume-prose v2" : "resume-prose";
  return `<div class="${cls}">${lines.map((l) => `<p>${l}</p>`).join("")}</div>`;
}
function renderBulletList(value, v2 = false) {
  const s = formatValue(value);
  const lines = s.split("\n").filter((l) => l.trim());
  const cls = v2 ? "resume-bullets v2" : "resume-bullets";
  return `<ul class="${cls}">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}
function renderTags(value, v2 = false) {
  const s = formatValue(value);
  const items = s.split(/[,，、\n]/).map((s2) => s2.trim()).filter(Boolean);
  const cls = v2 ? "resume-tag v2" : "resume-tag";
  const containerCls = v2 ? "resume-tags v2" : "resume-tags";
  return `<div class="${containerCls}">${items.map((t) => `<span class="${cls}">${htmlEscapedText(t)}</span>`).join("")}</div>`;
}
function renderLabelledField(label, value, v2 = false) {
  const rowCls = v2 ? "resume-field-row v2" : "resume-field-row";
  const labelCls = v2 ? "resume-field-label v2" : "resume-field-label";
  const valueCls = v2 ? "resume-field-value v2" : "resume-field-value";
  return `<div class="${rowCls}"><span class="${labelCls}">${label}：</span><span class="${valueCls}">${formatValue(value)}</span></div>`;
}
function renderSkillsSection(section, sectionData, theme, sidebar) {
  const c = theme.colors;
  const t = theme.typography;
  theme.fonts;
  const isV2 = theme.series === "v2";
  const categoryGroups = /* @__PURE__ */ new Map();
  const templateLabels = /* @__PURE__ */ new Map();
  for (const field of section.fields || []) {
    templateLabels.set(field.id, field.label);
  }
  const overviewHtml = [];
  for (const [key, value] of Object.entries(sectionData)) {
    if (!value) continue;
    const m = key.match(/^([a-zA-Z]+)_(\d+)$/);
    if (m) {
      const category = m[1];
      if (!categoryGroups.has(category)) categoryGroups.set(category, []);
      categoryGroups.get(category).push(value);
      continue;
    }
    const label = templateLabels.get(key);
    if (label && key !== "skills" && !label.includes("概述")) {
      const items = value.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean);
      if (!categoryGroups.has(key)) categoryGroups.set(key, []);
      for (const item of items) {
        categoryGroups.get(key).push(item);
      }
      continue;
    }
    overviewHtml.push(`<p class="resume-body-text${isV2 ? " v2" : ""}">${formatValue(value)}</p>`);
  }
  const parts = [];
  if (overviewHtml.length > 0) {
    parts.push(`<div class="resume-skills-overview" style="margin-bottom:8px">${overviewHtml.join("")}</div>`);
  }
  for (const [cat, values] of categoryGroups) {
    const catLabel = templateLabels.get(cat) || getFieldLabel(section, cat);
    const tagCls = isV2 ? "resume-tag v2" : "resume-tag";
    const tagsHtml = values.map((v) => `<span class="${tagCls}">${htmlEscapedText(v)}</span>`).join("");
    const catLabelStyle = sidebar ? `font-size:${t.bodyFontSize};color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"};white-space:nowrap;min-width:60px` : `font-size:${t.bodyFontSize};color:${c.textMuted};white-space:nowrap;min-width:60px`;
    parts.push(`<div class="resume-skills-category" style="margin-bottom:6px;display:flex;align-items:flex-start;gap:8px">
      <span class="resume-skills-cat-label" style="${catLabelStyle}">${catLabel}：</span>
      <div class="resume-tags${isV2 ? " v2" : ""}" style="margin:0">
        ${tagsHtml}
      </div>
    </div>`);
  }
  return `<div class="resume-section-content">${parts.join("")}</div>`;
}
function isMultiEntry(fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return false;
  const prefixCounts = /* @__PURE__ */ new Map();
  for (const key of keys) {
    const m = key.match(/^([a-zA-Z]+)(\d+)_/);
    if (m) prefixCounts.set(m[1], (prefixCounts.get(m[1]) || 0) + 1);
  }
  for (const count of prefixCounts.values()) {
    if (count >= 3) return true;
  }
  return false;
}
function groupFieldsByEntry(fields) {
  const groups = /* @__PURE__ */ new Map();
  for (const key of Object.keys(fields)) {
    const m = key.match(/^([a-zA-Z]+)(\d+)_(.+)$/);
    if (m) {
      const idx = parseInt(m[2], 10);
      const subKey = m[3];
      if (!groups.has(idx)) groups.set(idx, {});
      groups.get(idx)[subKey] = fields[key];
    }
  }
  const entries = Array.from(groups.entries()).sort(([a], [b]) => a - b).map(([index, fieldData]) => ({ index, fields: fieldData }));
  if (entries.length === 0) entries.push({ index: 0, fields: { ...fields } });
  return entries;
}
function renderSectionContent(section, sectionData, theme, sidebar = false) {
  var _a;
  const isSummary = section.id === "summary";
  const isMulti = ["experience", "education", "projects"].includes(section.id) && isMultiEntry(sectionData);
  const isSkills = section.id === "skills";
  const isV2 = theme.series === "v2";
  if (isSummary) {
    const text = Object.values(sectionData)[0];
    if (!text) return "";
    return `<p class="resume-body-text${isV2 ? " v2" : ""}">${formatValue(text)}</p>`;
  }
  if (isSkills) {
    return renderSkillsSection(section, sectionData, theme, sidebar);
  }
  if (isMulti) {
    const entries = groupFieldsByEntry(sectionData);
    const parts2 = entries.map((entry, ei) => {
      const titleKey = section.id === "experience" ? "position" : section.id === "education" ? "school" : "name";
      const subtitleKey = section.id === "experience" ? "company" : section.id === "education" ? "major" : "";
      const hasDate = entry.fields.date || entry.fields.startDate || entry.fields.endDate;
      const dateStr = entry.fields.date || (entry.fields.startDate ? `${entry.fields.startDate} - ${entry.fields.endDate || "至今"}` : "");
      const mainTitle = entry.fields[titleKey] || "";
      const subTitle = subtitleKey && entry.fields[subtitleKey] ? entry.fields[subtitleKey] : "";
      const detail = entry.fields.detail || "";
      const knownKeys = /* @__PURE__ */ new Set([titleKey, subtitleKey, "detail", "date", "startDate", "endDate"]);
      const extraKeys = Object.keys(entry.fields).filter((k) => !knownKeys.has(k));
      const grouped = { prose: [], bullets: [], tags: [], labelled: { keys: [], labels: [] } };
      for (const k of extraKeys) {
        const v = entry.fields[k];
        if (!v) continue;
        const type = classifyField(k);
        if (type === "prose") {
          grouped.prose.push(v);
          continue;
        }
        if (type === "bullet-list") {
          grouped.bullets.push(v);
          continue;
        }
        if (type === "tags") {
          grouped.tags.push(v);
          continue;
        }
        grouped.labelled.keys.push(k);
        grouped.labelled.labels.push(getFieldLabel(section, k));
      }
      const entryCls = isV2 ? "resume-entry v2" : "resume-entry";
      const headerCls = isV2 ? "resume-entry-header v2" : "resume-entry-header";
      const mainTitleCls = isV2 ? "resume-entry-main-title v2" : "resume-entry-main-title";
      const subTitleCls = isV2 ? "resume-entry-subtitle v2" : "resume-entry-subtitle";
      const dateCls = isV2 ? "resume-entry-date v2" : "resume-entry-date";
      const dividerCls = isV2 ? "resume-entry-divider v2" : "resume-entry-divider";
      let html = `<div class="${entryCls}">`;
      if (mainTitle || hasDate) {
        html += `<div class="${headerCls}">`;
        html += `<div>`;
        if (mainTitle) html += `<span class="${mainTitleCls}">${formatValue(mainTitle)}</span>`;
        if (subTitle) html += `<div class="${subTitleCls}">${formatValue(subTitle)}</div>`;
        html += `</div>`;
        if (hasDate) html += `<span class="${dateCls}">${formatValue(dateStr)}</span>`;
        html += `</div>`;
      }
      if (detail) {
        html += renderProse(detail, isV2);
      }
      for (const v of grouped.bullets) {
        html += renderBulletList(v, isV2);
      }
      for (const v of grouped.prose) {
        html += renderProse(v, isV2);
      }
      for (const v of grouped.tags) {
        html += renderTags(v, isV2);
      }
      for (let i = 0; i < grouped.labelled.keys.length; i++) {
        html += renderLabelledField(grouped.labelled.labels[i], entry.fields[grouped.labelled.keys[i]], isV2);
      }
      html += `</div>`;
      if (ei < entries.length - 1) {
        html += `<hr class="${dividerCls}" />`;
      }
      return html;
    });
    return `<div class="resume-section-content">${parts2.join("")}</div>`;
  }
  const parts = [];
  for (const field of section.fields || []) {
    const value = sectionData[field.id];
    if (!value) continue;
    parts.push(renderLabelledField(htmlEscapedText(field.label), value, isV2));
  }
  for (const [k, v] of Object.entries(sectionData)) {
    if ((_a = section.fields) == null ? void 0 : _a.some((f) => f.id === k)) continue;
    if (k === "avatar") continue;
    if (!v) continue;
    parts.push(renderLabelledField(getFieldLabel(section, k), v, isV2));
  }
  return `<div class="resume-section-content">${parts.join("")}</div>`;
}
function renderSections(template, data, theme, sectionIds) {
  const parts = [];
  for (const section of template.sections || []) {
    if (sectionIds && !sectionIds.includes(section.id)) continue;
    const sectionData = data.sections[section.id];
    if (!sectionData || Object.keys(sectionData).length === 0) continue;
    const content = renderSectionContent(section, sectionData, theme, false);
    if (!content) continue;
    const isV2 = theme.series === "v2";
    const sectionClass = theme.sectionStyle === "card" ? "resume-section card" : isV2 ? "resume-section v2" : "resume-section";
    parts.push(`<div class="${sectionClass}">
      <div class="${sectionTitleClass(theme)}">${htmlEscapedText(section.label)}</div>
      ${content}
    </div>`);
  }
  return parts.join("");
}
function detectLanguage(data) {
  var _a, _b;
  const sample = [
    (_a = data.sections.personal) == null ? void 0 : _a.name,
    (_b = data.sections.personal) == null ? void 0 : _b.title,
    data.sections.summary && Object.values(data.sections.summary)[0]
  ].filter(Boolean).join(" ");
  if (!sample) return "chinese";
  return /[\u4e00-\u9fa5]/.test(sample) ? "chinese" : "english";
}
function renderV2Header(theme, name, title, contactHtml, avatarHtml = "") {
  const v2 = theme.v2Config;
  const avatarCfg = v2.avatar;
  if (v2.headerVariant === "split") {
    if (avatarHtml && avatarCfg && avatarCfg.placement === "top-right") {
      return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-top-right">
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        </div>
        <div class="resume-avatar-block">${avatarHtml}</div>
      </div>`;
    }
    if (avatarHtml && avatarCfg && avatarCfg.placement === "top-left") {
      return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-top-left">
        <div class="resume-avatar-block">${avatarHtml}</div>
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        </div>
      </div>`;
    }
    if (avatarHtml && avatarCfg && avatarCfg.placement === "inline-left") {
      return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-inline-left">
        <div class="resume-avatar-block">${avatarHtml}</div>
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
          ${contactHtml}
        </div>
      </div>`;
    }
    return `<div class="${`resume-header v2 ${v2.headerVariant}`}">
      <div class="resume-name-block">
        <h1 class="resume-name">${htmlEscapedText(name)}</h1>
        ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
      </div>
      <div class="resume-contact-block">${contactHtml.replace(/<div class="resume-contact">([\s\S]*?)<\/div>/, "$1")}</div>
    </div>`;
  }
  if (avatarHtml && avatarCfg && (avatarCfg.placement === "top-right" || avatarCfg.placement === "magazine-top")) {
    return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-top-right">
      <div class="resume-name-block">
        <h1 class="resume-name">${htmlEscapedText(name)}</h1>
        ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        ${contactHtml}
      </div>
      <div class="resume-avatar-block">${avatarHtml}</div>
    </div>`;
  }
  if (avatarHtml && avatarCfg && avatarCfg.placement === "top-left") {
    return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-top-left">
      <div class="resume-avatar-block">${avatarHtml}</div>
      <div class="resume-name-block">
        <h1 class="resume-name">${htmlEscapedText(name)}</h1>
        ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        ${contactHtml}
      </div>
    </div>`;
  }
  if (avatarHtml && avatarCfg && avatarCfg.placement === "inline-left") {
    return `<div class="resume-header v2 ${v2.headerVariant} with-avatar-inline-left">
      <div class="resume-avatar-block">${avatarHtml}</div>
      <div class="resume-name-block">
        <h1 class="resume-name">${htmlEscapedText(name)}</h1>
        ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        ${contactHtml}
      </div>
    </div>`;
  }
  return `<div class="${`resume-header v2 ${v2.headerVariant}`}">
    <h1 class="resume-name">${htmlEscapedText(name)}</h1>
    ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
    ${contactHtml}
  </div>`;
}
function getAvatarConfig(theme) {
  var _a;
  if ((_a = theme.v2Config) == null ? void 0 : _a.avatar) return theme.v2Config.avatar;
  return theme.avatar;
}
function renderAvatarElement(avatarUrl, theme) {
  const cfg = getAvatarConfig(theme);
  if (!cfg) return "";
  const placement = cfg.placement || "top-right";
  const size = cfg.size || "medium";
  const shape = cfg.shape || "circle";
  const border = cfg.border || "none";
  const sizeMap = { small: "40", medium: "64", large: "96" };
  const sizePx = sizeMap[size] || "64";
  return `<img class="resume-avatar placement-${placement} size-${size} shape-${shape} border-${border}" src="${htmlEscapedText(avatarUrl)}" alt="头像" width="${sizePx}" height="${sizePx}" />`;
}
function renderResumeBody(data, template, theme) {
  var _a, _b, _c, _d, _e, _f, _g;
  theme.colors;
  const s = theme.spacing;
  const isV2 = theme.series === "v2";
  const lang = theme.language === "auto" || !theme.language ? detectLanguage(data) : theme.language;
  const name = ((_a = data.sections.personal) == null ? void 0 : _a.name) || ((_b = data.sections.personal) == null ? void 0 : _b.title) || "简历";
  const title = ((_c = data.sections.personal) == null ? void 0 : _c.title) || "";
  const email = ((_d = data.sections.personal) == null ? void 0 : _d.email) || "";
  const phone = ((_e = data.sections.personal) == null ? void 0 : _e.phone) || "";
  const github = ((_f = data.sections.personal) == null ? void 0 : _f.github) || "";
  const avatarUrl = ((_g = data.sections.personal) == null ? void 0 : _g.avatar) || "";
  const avatarCfg = getAvatarConfig(theme);
  const isTwoCol = theme.layout === "two-column";
  const isSidebarTop = isTwoCol && (avatarCfg == null ? void 0 : avatarCfg.placement) === "sidebar-top";
  const showAvatar = !!avatarUrl && !!avatarCfg;
  const contactParts = [email, phone, github].filter(Boolean);
  const contactHtml = contactParts.length > 0 ? `<div class="resume-contact">${contactParts.map((p) => `<span>${htmlEscapedText(p)}</span>`).join("")}</div>` : "";
  const avatarHtml = showAvatar && !isSidebarTop ? renderAvatarElement(avatarUrl, theme) : "";
  const sidebarAvatarHtml = showAvatar && isSidebarTop ? renderAvatarElement(avatarUrl, theme) : "";
  let headerHtml;
  if (isV2) {
    headerHtml = renderV2Header(theme, name, title, contactHtml, avatarHtml);
  } else if (showAvatar && !isSidebarTop) {
    const cfg = avatarCfg;
    const placement = cfg.placement;
    if (placement === "top-right" || placement === "magazine-top") {
      headerHtml = `<div class="resume-header ${theme.headerStyle} with-avatar-top-right">
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
          ${contactHtml}
        </div>
        <div class="resume-avatar-block">${avatarHtml}</div>
      </div>`;
    } else if (placement === "top-left") {
      headerHtml = `<div class="resume-header ${theme.headerStyle} with-avatar-top-left">
        <div class="resume-avatar-block">${avatarHtml}</div>
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
          ${contactHtml}
        </div>
      </div>`;
    } else if (placement === "inline-left") {
      headerHtml = `<div class="resume-header ${theme.headerStyle} with-avatar-inline-left">
        <div class="resume-avatar-block">${avatarHtml}</div>
        <div class="resume-name-block">
          <h1 class="resume-name">${htmlEscapedText(name)}</h1>
          ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
          ${contactHtml}
        </div>
      </div>`;
    } else {
      headerHtml = `<div class="resume-header ${theme.headerStyle}">
        <h1 class="resume-name">${htmlEscapedText(name)}</h1>
        ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
        ${contactHtml}
      </div>`;
    }
  } else {
    headerHtml = `<div class="resume-header ${theme.headerStyle}">
      <h1 class="resume-name">${htmlEscapedText(name)}</h1>
      ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
      ${contactHtml}
    </div>`;
  }
  if (isTwoCol) {
    const sidebarSections = ["personal", "skills"];
    const sidebarHtml = renderSections(template, data, theme, sidebarSections);
    const mainHtml = renderSections(template, data, theme, null);
    const footerHtml2 = data.completedAt ? `<div class="resume-footer">生成时间：${new Date(data.completedAt).toLocaleString("zh-CN")}</div>` : "";
    const sw = theme.sidebarWidth || "35%";
    const twoColCls = isV2 ? "resume-two-column v2" : "resume-two-column";
    const sidebarCls = sidebarAvatarHtml ? "resume-sidebar with-sidebar-avatar" : "resume-sidebar";
    return `<div class="${twoColCls}">
      <div class="${sidebarCls}" style="width:${sw};padding:${s.pagePadding}">
        ${sidebarAvatarHtml ? `<div class="resume-sidebar-avatar">${sidebarAvatarHtml}</div>` : ""}
        ${headerHtml}
        ${sidebarHtml}
      </div>
      <div class="resume-main" style="padding:${s.pagePadding}">
        ${mainHtml}
        ${footerHtml2}
      </div>
    </div>`;
  }
  const sectionsHtml = renderSections(template, data, theme, null);
  const footerHtml = data.completedAt ? `<div class="resume-footer">生成时间：${new Date(data.completedAt).toLocaleString("zh-CN")}</div>` : "";
  const docCls = `resume-document lang-${lang === "chinese" ? "zh" : "en"}`;
  return `<div class="${docCls}" style="padding:${s.pagePadding}">
    ${headerHtml}
    ${sectionsHtml}
    ${footerHtml}
  </div>`;
}
function renderResumeDocument(data, template, theme, title = "简历") {
  const css = renderResumeCSS(theme);
  const body = renderResumeBody(data, template, theme);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=794, initial-scale=1"><title>${htmlEscapedText(title)}</title>
<style>${css}</style></head>
<body>${body}</body></html>`;
}
const Store = require("electron-store");
const store = new Store({ encryptionKey: "resume-ai-local" });
function getResumes() {
  return store.get("resumes", []);
}
function saveResumes(resumes) {
  store.set("resumes", resumes);
}
function readJSONSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
function readVisualTheme(name) {
  const dir = getVisualThemesDir();
  const p = path.join(dir, `${name}.json`);
  return readJSONSafe(p);
}
function generateHTML(data, template, visualThemeName) {
  var _a, _b;
  const theme = visualThemeName && readVisualTheme(visualThemeName) || readVisualTheme("modern-blue") || {
    layout: "single-column",
    colors: { primary: "#1a56db", primaryLight: "#e8effd", text: "#1f2937", textMuted: "#6b7280", background: "#ffffff", border: "#e5e7eb" },
    typography: { nameFontSize: "24px", titleFontSize: "14px", sectionTitleFontSize: "13px", bodyFontSize: "11px", fontFamily: "-apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif", lineHeight: "1.6" },
    sectionStyle: "underlined",
    spacing: { pagePadding: "40px", sectionGap: "20px", entryGap: "10px" }
  };
  return renderResumeDocument(data, template, theme, `${((_b = (_a = data == null ? void 0 : data.sections) == null ? void 0 : _a.personal) == null ? void 0 : _b.name) || "简历"} - 简历`);
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
    var _a;
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(text, win);
      return { content: result.content, error: null, isQuotaError: false };
    } catch (err) {
      console.error("chat:send error:", err);
      const isQuotaError = (_a = err.message) == null ? void 0 : _a.includes("TOKEN_QUOTA_EXCEEDED");
      return {
        content: `（错误）${err.message || String(err)}`,
        error: null,
        isQuotaError
      };
    }
  });
  electron.ipcMain.handle("chat:send-first-message", async (event, prompt) => {
    var _a;
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(prompt, win, true);
      return { content: result.content, error: null, isQuotaError: false };
    } catch (err) {
      console.error("chat:send-first-message error:", err);
      const isQuotaError = (_a = err.message) == null ? void 0 : _a.includes("TOKEN_QUOTA_EXCEEDED");
      return {
        content: `（错误）${err.message || String(err)}`,
        error: null,
        isQuotaError
      };
    }
  });
  electron.ipcMain.handle("chat:set-context", async (_event, context) => {
    setConversationContext(context);
  });
  electron.ipcMain.handle("chat:clear-context", async () => {
    clearConversationContext();
  });
  electron.ipcMain.handle("chat:switch-resume", async (_event, resumeId) => {
    await switchResume(resumeId);
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
  electron.ipcMain.handle("opencode:status", async () => {
    return { connected: isConnected() };
  });
  electron.ipcMain.handle("opencode:retry", async () => {
    const ok = await retryOpencode();
    return { connected: ok };
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
  electron.ipcMain.handle("visual-templates:list", async () => {
    const dir = getVisualThemesDir();
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const data = readJSONSafe(path.join(dir, f));
      if (!data) return null;
      return { name: data.name, label: data.label, description: data.description, layout: data.layout };
    }).filter(Boolean);
  });
  electron.ipcMain.handle("visual-templates:get", async (_event, name) => {
    return readVisualTheme(name);
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
    removeResumeSession(id);
  });
  electron.ipcMain.handle("resume:export-pdf", async (_event, data, template, visualThemeName) => {
    const win = new electron.BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    const html = generateHTML(data, template, visualThemeName);
    return new Promise((resolve, reject) => {
      let tmpHtmlPath = "";
      const cleanup = () => {
        try {
          win.destroy();
        } catch {
        }
        if (tmpHtmlPath) {
          try {
            fs.unlinkSync(tmpHtmlPath);
          } catch {
          }
        }
      };
      win.webContents.on("did-finish-load", async () => {
        var _a, _b;
        try {
          await win.webContents.executeJavaScript(`
            Promise.all(Array.from(document.images).map(img => {
              if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
              return new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
                setTimeout(resolve, 5000)
              })
            })).then(() => true)
          `);
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
      const tmpDir = path.join(os.tmpdir(), "resume-ai-pdf");
      fs.mkdirSync(tmpDir, { recursive: true });
      const filePath = path.join(tmpDir, `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`);
      tmpHtmlPath = filePath;
      fs.writeFileSync(filePath, html, "utf-8");
      win.loadFile(filePath);
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
      const { extractPdfStyle } = await Promise.resolve().then(() => require("./pdf-extractor-CfuUvTk6.js"));
      return await extractPdfStyle(filePath);
    } catch (err) {
      console.error("PDF extraction error:", err);
      return { error: err.message || String(err) };
    }
  });
  electron.ipcMain.handle("pdf:parse-resume", async (_event, filePath) => {
    try {
      const { parseResumePdf } = await Promise.resolve().then(() => require("./resume-parser-BIJk7JHq.js"));
      const { mapToTemplate } = await Promise.resolve().then(() => require("./template-mapper-DN_zI3CN.js"));
      const parsed = await parseResumePdf(filePath);
      const tmpl = readTemplateJSON("general");
      if (!tmpl) return { error: "general 模板不存在" };
      return mapToTemplate(parsed, tmpl);
    } catch (err) {
      console.error("Resume parse error:", err);
      return { error: err.message || String(err) };
    }
  });
  electron.ipcMain.handle("pdf:extract-avatar-payload", async (_event, filePath) => {
    try {
      const { extractPdfAvatarPayload } = await Promise.resolve().then(() => require("./pdf-image-extractor-b7QaxVW4.js"));
      return await extractPdfAvatarPayload(filePath);
    } catch (err) {
      console.error("PDF avatar extraction error:", err);
      return null;
    }
  });
  electron.ipcMain.handle("pdf:extract-theme", async (_event, filePath) => {
    try {
      const { extractPdfTheme } = await Promise.resolve().then(() => require("./pdf-theme-extractor-zKMnEqMu.js"));
      return await extractPdfTheme(filePath);
    } catch (err) {
      console.error("PDF theme extraction error:", err);
      return { error: err.message || String(err) };
    }
  });
  electron.ipcMain.handle("theme:save-imported", async (_event, theme) => {
    try {
      const { saveImportedTheme } = await Promise.resolve().then(() => require("./imported-themes-5o_27UPs.js"));
      return saveImportedTheme(theme);
    } catch (err) {
      console.error("Save imported theme error:", err);
      return { error: err.message || String(err) };
    }
  });
  electron.ipcMain.handle("theme:delete-imported", async (_event, themeName) => {
    try {
      const { deleteImportedTheme } = await Promise.resolve().then(() => require("./imported-themes-5o_27UPs.js"));
      return deleteImportedTheme(themeName);
    } catch (err) {
      console.error("Delete imported theme error:", err);
      return { error: err.message || String(err) };
    }
  });
  electron.ipcMain.handle("theme:list-imported", async () => {
    try {
      const { getImportedThemeFiles } = await Promise.resolve().then(() => require("./imported-themes-5o_27UPs.js"));
      return getImportedThemeFiles().map((f) => f.name);
    } catch (err) {
      console.error("List imported themes error:", err);
      return [];
    }
  });
  electron.ipcMain.handle("resume:set-last-active", async (_event, id) => {
    store.set("lastActiveResumeId", id);
  });
  electron.ipcMain.handle("resume:get-last-active", async () => {
    return store.get("lastActiveResumeId", null);
  });
  electron.ipcMain.handle("log:write", async (_event, tag, message) => {
    log(tag, message);
  });
}
async function initOpencode() {
  try {
    await startOpencode();
    const savedModel = store.get("currentModel");
    if (savedModel) {
      setModel(savedModel);
      console.log("Restored model:", savedModel);
    }
    console.log("Opencode initialized");
  } catch (err) {
    console.warn("Opencode failed to start, entering mock mode:", err.message || err);
  }
}
let mainWindow = null;
function copyJsonDir(srcDir, targetDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const file of fs.readdirSync(srcDir)) {
    if (file.endsWith(".json")) {
      const dest = path.join(targetDir, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(srcDir, file), dest);
      }
    }
  }
}
function ensureDirectories() {
  getTemplatesDir();
  getResumesDir();
  getVisualThemesDir();
  const devTemplates = path.join(__dirname, "..", "templates");
  copyJsonDir(devTemplates, getTemplatesDir());
  const devVisualTemplates = path.join(__dirname, "..", "themes");
  copyJsonDir(devVisualTemplates, getVisualThemesDir());
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
