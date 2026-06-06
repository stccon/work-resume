import path from "path"
import fs from "fs"
import { getLogsDir } from "./paths"

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10)
  return path.join(getLogsDir(), `debug-${date}.log`)
}

export function log(tag: string, ...args: any[]) {
  const time = new Date().toISOString().slice(11, 23)
  const line = `[${time}] [${tag}] ${args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}`
  try {
    fs.appendFileSync(getLogFile(), line + "\n")
  } catch {
    /* logging must never crash the app */
  }
}
