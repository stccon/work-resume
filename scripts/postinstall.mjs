import { rename, writeFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const ROOT = process.cwd()

function log(msg) {
  console.log(`[postinstall] ${msg}`)
}

function skip(msg) {
  console.log(`[postinstall] SKIP: ${msg}`)
}

async function patch7zipBin() {
  if (process.platform !== "win32") {
    skip("7za wrapper only required on win32")
    return
  }

  const binDir = path.join(ROOT, "node_modules", "7zip-bin", "win", "x64")
  const realExe = path.join(binDir, "7za.exe")
  const renamedExe = path.join(binDir, "7za-real.exe")
  const wrapperBat = path.join(binDir, "7za.bat")

  if (!existsSync(realExe) && !existsSync(renamedExe)) {
    skip("7za binary not found (run npm install first?)")
    return
  }

  if (existsSync(realExe) && !existsSync(renamedExe)) {
    await rename(realExe, renamedExe)
    log("renamed 7za.exe -> 7za-real.exe")
  }

  if (existsSync(renamedExe) && !existsSync(wrapperBat)) {
    const bat = `@echo off
setlocal EnableExtensions DisableDelayedExpansion
"%~dp07za-real.exe" -snl- %*
exit /b %ERRORLEVEL%
`
    await writeFile(wrapperBat, bat, "utf8")
    log("created 7za.bat wrapper (forces -snl- to skip symlink creation)")
  } else if (existsSync(wrapperBat)) {
    log("7za.bat already exists")
  }

  const indexPath = path.join(ROOT, "node_modules", "7zip-bin", "index.js")
  if (!existsSync(indexPath)) return
  const src = await readFile(indexPath, "utf8")
  const target = "return path.join(__dirname, \"win\", process.arch, \"7za.exe\")"
  const replaced = "return path.join(__dirname, \"win\", process.arch, \"7za.bat\")"
  if (src.includes(replaced)) {
    log("7zip-bin/index.js already patched")
  } else if (src.includes(target)) {
    await writeFile(indexPath, src.replace(target, replaced), "utf8")
    log("patched 7zip-bin/index.js -> path7za points to 7za.bat")
  }
}

async function patchBuilderUtil() {
  const utilPath = path.join(
    ROOT, "node_modules", "builder-util", "out", "util.js"
  )
  if (!existsSync(utilPath)) {
    skip("builder-util/out/util.js not found")
    return
  }

  const src = await readFile(utilPath, "utf8")
  const marker = "const isWinScript = process.platform === \"win32\""
  if (src.includes(marker)) {
    log("builder-util/out/util.js already patched")
    return
  }

  const oldBlock = `    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(file, args, {`
  const newBlock = `    return new Promise((resolve, reject) => {
        const isWinScript = process.platform === "win32" && /\\.(bat|cmd)$/i.test(file);
        (0, child_process_1.execFile)(isWinScript ? "cmd.exe" : file, isWinScript ? ["/c", file, ...args] : args, {
            ...options,
            maxBuffer: 1000 * 1024 * 1024,
            env: getProcessEnv(options == null ? null : options.env),
            shell: isWinScript,
        }, (error, stdout, stderr) => {`

  const oldTail = `    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(file, args, {
            ...options,
            maxBuffer: 1000 * 1024 * 1024,
            env: getProcessEnv(options == null ? null : options.env),
        }, (error, stdout, stderr) => {`

  if (!src.includes(oldTail)) {
    skip("builder-util exec() signature changed in this version, patch skipped")
    return
  }

  await writeFile(utilPath, src.replace(oldTail, newBlock), "utf8")
  log("patched builder-util/out/util.js -> exec() routes .bat/.cmd through cmd /c")
}

async function main() {
  log(`platform=${process.platform} node=${process.version}`)
  await patch7zipBin()
  await patchBuilderUtil()
  log("done")
}

main().catch((err) => {
  console.error("[postinstall] FAILED:", err)
  process.exitCode = 0
})
