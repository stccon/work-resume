import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
).toString()

export interface ExtractedImageRaw {
  name: string
  width: number
  height: number
  hasAlpha: boolean
  rgb: number[] | string
  smask: number[] | null
}

export interface ExtractedImageMeta {
  name: string
  width: number
  height: number
  pageIndex: number
  inTopHalf: boolean
}

const MIN_AVATAR_WIDTH = 100
const MIN_AVATAR_HEIGHT = 100

export async function extractPdfImagesMeta(filePath: string): Promise<ExtractedImageMeta[]> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const doc = await getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise

  const results: ExtractedImageMeta[] = []

  const maxPage = Math.min(doc.numPages, 2)
  for (let i = 1; i <= maxPage; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1 })

    const opList = await page.getOperatorList()
    const seenNames = new Set<string>()

    let cursorX = 0
    let cursorY = 0
    for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
      const fn = opList.fnArray[opIdx]
      const args = opList.argsArray[opIdx]
      if (fn === 10 /* cm: concat matrix */ && args?.length === 6) {
        cursorX = args[4]
        cursorY = args[5]
      }
      if ((fn === 85 /* paintImageXObject */) && args?.[0]) {
        const name: string = args[0]
        if (seenNames.has(name)) continue
        seenNames.add(name)

        const commonObjs = (page as any).commonObjs
        if (!commonObjs) continue

        try {
          const obj = await commonObjs.get(name)
          if (!obj || obj.kind !== "image") continue
          const w = obj.width || 0
          const h = obj.height || 0
          if (w < MIN_AVATAR_WIDTH || h < MIN_AVATAR_HEIGHT) continue

          const inTopHalf = cursorY > viewport.height * 0.5
          const isFirstPage = i === 1
          if (!isFirstPage && !inTopHalf) continue

          results.push({ name, width: w, height: h, pageIndex: i - 1, inTopHalf })
        } catch {
          continue
        }
      }
    }
  }

  return results
}

export interface ExtractedImagePayload {
  width: number
  height: number
  hasAlpha: boolean
  rgbBase64: string
  smaskBase64: string | null
}

export async function extractPdfImagePayload(
  filePath: string,
  imageName: string,
  pageIndex: number,
): Promise<ExtractedImagePayload | null> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const doc = await getDocument({ data, useWorkerFetch: false, useSystemFonts: false }).promise

  if (pageIndex + 1 > doc.numPages) {
    return null
  }
  const page = await doc.getPage(pageIndex + 1)
  const commonObjs = (page as any).commonObjs
  if (!commonObjs) {
    return null
  }

  try {
    const obj = await commonObjs.get(imageName)
    if (!obj || obj.kind !== "image") {
      return null
    }

    const w = obj.width || 0
    const h = obj.height || 0
    const rgb = obj.data
    const smask = obj.smask
    if (!rgb || !Buffer.isBuffer(rgb) && !(rgb instanceof Uint8Array)) {
      return null
    }

    const rgbBuf = Buffer.isBuffer(rgb) ? rgb : Buffer.from(rgb)
    const smaskBuf = smask ? (Buffer.isBuffer(smask) ? smask : Buffer.from(smask)) : null

    return {
      width: w,
      height: h,
      hasAlpha: !!smaskBuf,
      rgbBase64: rgbBuf.toString("base64"),
      smaskBase64: smaskBuf ? smaskBuf.toString("base64") : null,
    }
  } catch {
    return null
  }
}

export async function extractPdfAvatarMeta(filePath: string): Promise<ExtractedImageMeta | null> {
  const metas = await extractPdfImagesMeta(filePath)
  if (metas.length === 0) return null
  const sorted = [...metas].sort((a, b) => b.width * b.height - a.width * a.height)
  return sorted[0]
}

export async function extractPdfAvatarPayload(
  filePath: string,
): Promise<ExtractedImagePayload | null> {
  const meta = await extractPdfAvatarMeta(filePath)
  if (!meta) return null
  return await extractPdfImagePayload(filePath, meta.name, meta.pageIndex)
}
