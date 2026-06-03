import { describe, it, expect } from "vitest"
import path from "path"
import fs from "fs"
import { parseResumePdf } from "../resume-parser"
import { extractPdfStyle } from "../pdf-extractor"

const RESUMES_DIR = path.resolve(__dirname, "..", "..", "resumes")

function pdfPath(name: string): string {
  const p = path.join(RESUMES_DIR, name)
  if (!fs.existsSync(p)) {
    throw new Error(`Fixture PDF missing: ${p}`)
  }
  return p
}

async function assertParsingWorks(fileName: string, opts: { requireSkills?: boolean } = {}) {
  const file = pdfPath(fileName)
  const style = await extractPdfStyle(file)
  expect(style.degraded).toBe(true)
  expect(style.commonFontName).toBeTruthy()
  expect(style.items.length).toBeGreaterThan(0)
  expect(style.items.every((i) => i.fontSize === 0 || /^g_d\d+_f\d+$/.test(i.fontName))).toBe(true)

  const parsed = await parseResumePdf(file)
  expect(parsed.name).toContain("黄宇程")
  expect(parsed.email).toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  expect(parsed.phone).toMatch(/1[3-9]\d{9}/)
  expect(parsed.experience.length).toBeGreaterThanOrEqual(1)
  expect(parsed.education.length).toBeGreaterThanOrEqual(1)
  if (opts.requireSkills !== false) {
    expect(parsed.skills.length).toBeGreaterThan(0)
  }
  return parsed
}

describe("exported-pdf roundtrip (degraded mode)", () => {
  it("parses 黄宇程_通用简历_2026-05-31.pdf", async () => {
    const parsed = await assertParsingWorks("黄宇程_通用简历_2026-05-31.pdf")
    expect(parsed.experience[0].company || parsed.experience[0].position).toBeTruthy()
    expect(parsed.education[0].school || parsed.education[0].major).toBeTruthy()
  }, 15000)

  it("parses 黄宇程_通用简历_2026-06-01.pdf", async () => {
    const parsed = await assertParsingWorks("黄宇程_通用简历_2026-06-01.pdf")
    expect(parsed.experience[0].company || parsed.experience[0].position).toBeTruthy()
    expect(parsed.education[0].school || parsed.education[0].major).toBeTruthy()
  }, 15000)

  it("parses 黄宇程_通用简历_2026-06-03.pdf", async () => {
    const parsed = await assertParsingWorks("黄宇程_通用简历_2026-06-03.pdf", { requireSkills: false })
    expect(parsed.experience[0].company || parsed.experience[0].position).toBeTruthy()
    expect(parsed.education[0].school || parsed.education[0].major).toBeTruthy()
  }, 15000)
})
