import fs from "fs"

export function parseResumeFile(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (ext === "txt") {
    return fs.readFileSync(filePath, "utf-8")
  }
  if (ext === "pdf") {
    return extractPDFText(filePath)
  }
  if (ext === "docx") {
    return extractDOCXText(filePath)
  }
  throw new Error(`不支持的文件格式: ${ext}`)
}

function extractPDFText(filePath: string): string {
  return `[PDF 解析需要 pdf-parse 库] 文件路径: ${filePath}`
}

function extractDOCXText(filePath: string): string {
  return `[DOCX 解析需要 mammoth 库] 文件路径: ${filePath}`
}
