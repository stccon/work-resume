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
    if (result.error) throw new Error(JSON.stringify(result.error));
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
function getVisualTemplatesDir() {
  return ensureDir(path.join(getBaseDir(), "visual-templates"));
}
function renderResumeCSS(theme) {
  const c = theme.colors;
  const t = theme.typography;
  const s = theme.spacing;
  return `* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: ${t.fontFamily}; font-size: ${t.bodyFontSize}; color: ${c.text}; line-height: ${t.lineHeight}; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
.resume-header { text-align:center; margin-bottom:20px; }
.resume-name { font-size:${t.nameFontSize}; font-weight:700; color:${c.text}; margin:0; }
.resume-title { font-size:${t.titleFontSize}; color:${c.textMuted}; margin-top:4px; }
.resume-contact { font-size:11px; color:${c.textMuted}; margin-top:8px; display:flex; justify-content:center; gap:12px; }
.resume-section { margin-bottom:${s.sectionGap}; }
.resume-section-title { margin-bottom:8px; }
.resume-section-title.underlined { font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.primary}; border-bottom:2px solid ${c.primary}; padding-bottom:4px; }
.resume-section-title.colored-bg { font-size:${t.sectionTitleFontSize}; font-weight:700; color:#fff; background:${c.primary}; padding:4px 10px; border-radius:4px; }
.resume-section-title.minimal { font-size:${t.sectionTitleFontSize}; font-weight:700; color:${c.text}; }
.resume-body-text { font-size:${t.bodyFontSize}; line-height:${t.lineHeight}; white-space:pre-wrap; }
.resume-field-row { display:flex; margin-bottom:4px; font-size:${t.bodyFontSize}; }
.resume-field-label { color:${c.textMuted}; width:96px; flex-shrink:0; }
.resume-field-value { color:${c.text}; }
.resume-entry { margin-bottom:${s.entryGap}; }
.resume-entry-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
.resume-entry-main-title { font-weight:600; font-size:${t.bodyFontSize}; color:${c.text}; }
.resume-entry-subtitle { font-size:11px; color:${c.textMuted}; }
.resume-entry-date { font-size:11px; color:${c.textMuted}; white-space:nowrap; margin-left:12px; }
.resume-entry-detail { font-size:${t.bodyFontSize}; color:${c.text}; line-height:${t.lineHeight}; margin-top:6px; white-space:pre-wrap; }
.resume-entry-extra { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-top:4px; }
.resume-entry-extra-item { font-size:11px; color:${c.textMuted}; }
.resume-two-column { display:flex; min-height:100vh; }
.resume-sidebar { width:35%; background:${c.sidebarBg || c.primary}; padding:${s.pagePadding}; }
.resume-sidebar .resume-name { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-title { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-contact { color:${c.sidebarText ? `${c.sidebarText}99` : "#ffffff99"}; }
.resume-sidebar .resume-section-title { color:${c.sidebarText || "#fff"}; border-bottom-color:${c.sidebarText || "#fff"} !important; }
.resume-sidebar .resume-field-label { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; width:80px; }
.resume-sidebar .resume-field-value { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-entry-main-title { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-entry-subtitle { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-entry-date { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-sidebar .resume-entry-detail { color:${c.sidebarText || "#fff"}; }
.resume-sidebar .resume-entry-extra-item { color:${c.sidebarText ? `${c.sidebarText}cc` : "#ffffffcc"}; }
.resume-main { width:65%; padding:${s.pagePadding}; background:${c.background}; }
.resume-footer { text-align:center; font-size:10px; color:${c.textMuted}; margin-top:24px; padding-top:12px; border-top:1px solid ${c.border}; }`;
}
function sectionTitleClass(theme) {
  return `resume-section-title ${theme.sectionStyle}`;
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
    gradYear: "毕业年份"
  };
  for (const [key, label] of Object.entries(known)) {
    if (fieldId.includes(key)) return label;
  }
  return htmlEscapedText(fieldId);
}
function formatLines(value) {
  const lines = value.split("\n").filter((l) => l.trim());
  return lines.map((l) => `<p style="margin:0 0 2px 0">${htmlEscapedText(l)}</p>`).join("");
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
  const isSkills = section.id === "skills";
  const isMulti = ["experience", "education", "projects"].includes(section.id) && isMultiEntry(sectionData);
  if (isSummary) {
    const text = Object.values(sectionData)[0];
    if (!text) return "";
    return `<p class="resume-body-text">${formatValue(text)}</p>`;
  }
  if (isSkills) {
    const parts2 = [];
    for (const field of section.fields || []) {
      const value = sectionData[field.id];
      if (!value) continue;
      parts2.push(`<div class="resume-field-row"><span class="resume-field-label">${htmlEscapedText(field.label)}：</span><span class="resume-field-value">${formatValue(value)}</span></div>`);
    }
    return `<div class="resume-section-content">${parts2.join("")}</div>`;
  }
  if (isMulti) {
    const entries = groupFieldsByEntry(sectionData);
    const parts2 = entries.map((entry) => {
      const titleKey = section.id === "experience" ? "position" : section.id === "education" ? "school" : "name";
      const subtitleKey = section.id === "experience" ? "company" : section.id === "education" ? "major" : "";
      const hasDate = entry.fields.date || entry.fields.startDate || entry.fields.endDate;
      const dateStr = entry.fields.date || (entry.fields.startDate ? `${entry.fields.startDate} - ${entry.fields.endDate || "至今"}` : "");
      const mainTitle = entry.fields[titleKey] || "";
      const subTitle = subtitleKey && entry.fields[subtitleKey] ? entry.fields[subtitleKey] : "";
      const detail = entry.fields.detail || "";
      const extraKeys = Object.keys(entry.fields).filter(
        (k) => k !== titleKey && k !== subtitleKey && k !== "detail" && k !== "date" && k !== "startDate" && k !== "endDate"
      );
      let html = `<div class="resume-entry">`;
      if (mainTitle || hasDate) {
        html += `<div class="resume-entry-header">`;
        html += `<div>`;
        if (mainTitle) html += `<span class="resume-entry-main-title">${formatValue(mainTitle)}</span>`;
        if (subTitle) html += `<div class="resume-entry-subtitle">${formatValue(subTitle)}</div>`;
        html += `</div>`;
        if (hasDate) html += `<span class="resume-entry-date">${formatValue(dateStr)}</span>`;
        html += `</div>`;
      }
      if (detail) {
        html += `<div class="resume-entry-detail">${formatLines(detail)}</div>`;
      }
      if (extraKeys.length > 0) {
        html += `<div class="resume-entry-extra">`;
        for (const k of extraKeys) {
          html += `<div class="resume-entry-extra-item"><span>${getFieldLabel(section, k)}：</span><span>${formatValue(entry.fields[k])}</span></div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
      return html;
    });
    return `<div class="resume-section-content">${parts2.join("")}</div>`;
  }
  const parts = [];
  for (const field of section.fields || []) {
    const value = sectionData[field.id];
    if (!value) continue;
    parts.push(`<div class="resume-field-row"><span class="resume-field-label">${htmlEscapedText(field.label)}：</span><span class="resume-field-value">${formatValue(value)}</span></div>`);
  }
  for (const [k, v] of Object.entries(sectionData)) {
    if ((_a = section.fields) == null ? void 0 : _a.some((f) => f.id === k)) continue;
    if (!v) continue;
    parts.push(`<div class="resume-field-row"><span class="resume-field-label">${getFieldLabel(section, k)}：</span><span class="resume-field-value">${formatValue(v)}</span></div>`);
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
    parts.push(`<div class="resume-section">
      <div class="${sectionTitleClass(theme)}">${htmlEscapedText(section.label)}</div>
      ${content}
    </div>`);
  }
  return parts.join("");
}
function renderResumeBody(data, template, theme) {
  var _a, _b, _c, _d, _e, _f;
  const c = theme.colors;
  const s = theme.spacing;
  const name = ((_a = data.sections.personal) == null ? void 0 : _a.name) || ((_b = data.sections.personal) == null ? void 0 : _b.title) || "简历";
  const title = ((_c = data.sections.personal) == null ? void 0 : _c.title) || "";
  const email = ((_d = data.sections.personal) == null ? void 0 : _d.email) || "";
  const phone = ((_e = data.sections.personal) == null ? void 0 : _e.phone) || "";
  const github = ((_f = data.sections.personal) == null ? void 0 : _f.github) || "";
  const contactParts = [email, phone, github].filter(Boolean);
  const contactHtml = contactParts.length > 0 ? `<div class="resume-contact">${contactParts.map((p) => `<span>${htmlEscapedText(p)}</span>`).join("")}</div>` : "";
  const headerHtml = `<div class="resume-header">
    <h1 class="resume-name">${htmlEscapedText(name)}</h1>
    ${title ? `<p class="resume-title">${htmlEscapedText(title)}</p>` : ""}
    ${contactHtml}
  </div>`;
  if (theme.layout === "two-column") {
    const sidebarSections = ["personal", "skills"];
    const sidebarHtml = renderSections(template, data, theme, sidebarSections);
    const mainHtml = renderSections(template, data, theme, null);
    const footerHtml2 = data.completedAt ? `<div class="resume-footer">生成时间：${new Date(data.completedAt).toLocaleString("zh-CN")}</div>` : "";
    return `<div class="resume-two-column">
      <div class="resume-sidebar" style="padding:${s.pagePadding}">
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
  return `<div style="padding:${s.pagePadding};background:${c.background}">
    ${headerHtml}
    ${sectionsHtml}
    ${footerHtml}
  </div>`;
}
function renderResumeDocument(data, template, theme, title = "简历") {
  const css = renderResumeCSS(theme);
  const body = renderResumeBody(data, template, theme);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${htmlEscapedText(title)}</title>
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
  const dir = getVisualTemplatesDir();
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
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(text, win);
      return result;
    } catch (err) {
      console.error("chat:send error:", err);
      return { content: `（错误）${err.message || String(err)}` };
    }
  });
  electron.ipcMain.handle("chat:send-first-message", async (event, prompt) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await sendPrompt(prompt, win, true);
      return result;
    } catch (err) {
      console.error("chat:send-first-message error:", err);
      return { content: `（错误）${err.message || String(err)}` };
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
    const dir = getVisualTemplatesDir();
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
  getVisualTemplatesDir();
  const devTemplates = path.join(__dirname, "..", "templates");
  copyJsonDir(devTemplates, getTemplatesDir());
  const devVisualTemplates = path.join(__dirname, "..", "visual-templates", "themes");
  copyJsonDir(devVisualTemplates, getVisualTemplatesDir());
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
