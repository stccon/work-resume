"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const electron = require("electron");
function getBaseDir() {
  if (electron.app.isPackaged) {
    return electron.app.getPath("userData");
  }
  return path.join(__dirname, "..");
}
function getImportedThemesDir() {
  const dir = path.join(getBaseDir(), "themes");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getImportedThemeFiles() {
  const dir = getImportedThemesDir();
  return fs.readdirSync(dir).filter((f) => f.startsWith("imported-") && f.endsWith(".json")).map((f) => {
    const filePath = path.join(dir, f);
    return { name: f.replace(/\.json$/, ""), filePath, mtime: fs.statSync(filePath).mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
}
function saveImportedTheme(theme) {
  const themeName = theme.name;
  if (!themeName || !themeName.startsWith("imported-")) {
    throw new Error("主题 name 必须以 imported- 开头");
  }
  const fileName = `${themeName}.json`;
  const dir = getImportedThemesDir();
  const filePath = path.join(dir, fileName);
  const isNew = !fs.existsSync(filePath);
  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2), "utf-8");
  return { name: themeName, isNew };
}
function deleteImportedTheme(themeName) {
  if (!themeName.startsWith("imported-")) {
    throw new Error("只能删除 imported-* 主题");
  }
  const filePath = path.join(getImportedThemesDir(), `${themeName}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}
function readImportedTheme(themeName) {
  if (!themeName.startsWith("imported-")) return null;
  const filePath = path.join(getImportedThemesDir(), `${themeName}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
exports.deleteImportedTheme = deleteImportedTheme;
exports.getImportedThemeFiles = getImportedThemeFiles;
exports.getImportedThemesDir = getImportedThemesDir;
exports.readImportedTheme = readImportedTheme;
exports.saveImportedTheme = saveImportedTheme;
