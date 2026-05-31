import path from "path"
import fs from "fs"

const logDir = path.join(__dirname, "..", "logs")
const logFile = path.join(logDir, `debug-${new Date().toISOString().slice(0, 10)}.log`)

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

export function log(tag: string, ...args: any[]) {
  const time = new Date().toISOString().slice(11, 23)
  const line = `[${time}] [${tag}] ${args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}`
  fs.appendFileSync(logFile, line + "\n")
}
