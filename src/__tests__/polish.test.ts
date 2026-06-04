import { describe, it, expect } from "vitest"
import { POLISH_SYSTEM_PROMPT, buildPolishUserPrompt, cleanPolishResponse } from "@/adapter/polish"
import type { PolishFieldPayload } from "@/types/inline-edit"

const basePayload: PolishFieldPayload = {
  targetRole: "前端工程师",
  sectionId: "summary",
  sectionLabel: "个人简介",
  fieldLabel: "个人简介",
  fieldValue: "我做前端8年了。",
}

describe("buildPolishUserPrompt", () => {
  it("includes target role, section label, field label, and value", () => {
    const out = buildPolishUserPrompt(basePayload)
    expect(out).toContain("目标岗位：前端工程师")
    expect(out).toContain("简历段落：个人简介")
    expect(out).toContain("字段：个人简介")
    expect(out).toContain("我做前端8年了。")
  })

  it("omits target role line when empty", () => {
    const out = buildPolishUserPrompt({ ...basePayload, targetRole: "" })
    expect(out).not.toContain("目标岗位")
  })

  it("includes entry neighbors block only when present", () => {
    const out = buildPolishUserPrompt({
      ...basePayload,
      sectionId: "experience",
      sectionLabel: "工作经历",
      fieldLabel: "工作成就",
      fieldValue: "做了个牛逼的系统",
      entryNeighbors: { company: "字节跳动", position: "前端工程师" },
    })
    expect(out).toContain("company: 字节跳动")
    expect(out).toContain("position: 前端工程师")
    expect(out).toContain("所属条目上下文")

    const out2 = buildPolishUserPrompt(basePayload)
    expect(out2).not.toContain("所属条目上下文")
  })

  it("appends extraPrompt when non-empty", () => {
    const out = buildPolishUserPrompt({ ...basePayload, extraPrompt: "更简洁一点" })
    expect(out).toContain("用户额外要求：更简洁一点")
  })

  it("omits extraPrompt block when empty or whitespace", () => {
    expect(buildPolishUserPrompt({ ...basePayload, extraPrompt: "" })).not.toContain("用户额外要求")
    expect(buildPolishUserPrompt({ ...basePayload, extraPrompt: "   " })).not.toContain("用户额外要求")
  })
})

describe("cleanPolishResponse", () => {
  it("strips common Chinese prefix", () => {
    expect(cleanPolishResponse("以下是改写后的内容：资深前端工程师，8年经验。"))
      .toBe("资深前端工程师，8年经验。")
  })

  it("strips common English prefix", () => {
    expect(cleanPolishResponse("Sure, here is the polished version: Senior frontend engineer."))
      .toBe("Senior frontend engineer.")
  })

  it("strips surrounding quotes", () => {
    expect(cleanPolishResponse("\"资深前端工程师\"")).toBe("资深前端工程师")
    expect(cleanPolishResponse("「资深前端工程师」")).toBe("资深前端工程师")
  })

  it("strips multiple layers of prefixes", () => {
    expect(cleanPolishResponse("好的，以下是改写后的内容：\"资深前端\""))
      .toBe("资深前端")
  })

  it("returns empty string for empty input", () => {
    expect(cleanPolishResponse("")).toBe("")
  })

  it("leaves clean text unchanged", () => {
    expect(cleanPolishResponse("资深前端工程师")).toBe("资深前端工程师")
  })
})

describe("POLISH_SYSTEM_PROMPT", () => {
  it("contains key constraints", () => {
    expect(POLISH_SYSTEM_PROMPT).toContain("只输出")
    expect(POLISH_SYSTEM_PROMPT).toContain("不要使用引号")
    expect(POLISH_SYSTEM_PROMPT).toContain("保留原始换行")
  })
})
