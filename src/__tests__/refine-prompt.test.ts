import { describe, it, expect } from "vitest"
import { buildRefinePrompt } from "@/adapter/distillation"
import type { ResumeData } from "@/types/resume"

const sampleResume: ResumeData = {
  template: "general",
  sections: {
    personal: { name: "张三", email: "a@b.com" },
    experience: { entry0_company: "字节", entry0_position: "前端" },
  },
}

describe("buildRefinePrompt", () => {
  it("includes iteration count", () => {
    expect(buildRefinePrompt(sampleResume, 1)).toContain("第 1 次润色")
    expect(buildRefinePrompt(sampleResume, 2)).toContain("第 2 次润色")
    expect(buildRefinePrompt(sampleResume, 5)).toContain("第 5 次润色")
  })

  it("includes JSON block with current sections", () => {
    const p = buildRefinePrompt(sampleResume, 1)
    expect(p).toContain("```json")
    expect(p).toContain("张三")
    expect(p).toContain("字节")
  })

  it("first iteration focuses on achievements, summary, tech stack", () => {
    const p = buildRefinePrompt(sampleResume, 1)
    expect(p).toContain("工作成就")
    expect(p).toContain("个人简介")
    expect(p).toContain("技术栈")
  })

  it("second iteration focuses on details and self-check", () => {
    const p = buildRefinePrompt(sampleResume, 2)
    expect(p).toContain("拼写")
    expect(p).toContain("项目细节")
  })

  it("third iteration focuses on consistency", () => {
    const p = buildRefinePrompt(sampleResume, 3)
    expect(p).toContain("语气一致")
    expect(p).toContain("中英文标点")
  })

  it("iteration >= 4 falls back to differentiation focus", () => {
    const p = buildRefinePrompt(sampleResume, 7)
    expect(p).toContain("已润色多次")
    expect(p).toContain("差异化")
  })

  it("preserves constraint about not clearing fields", () => {
    const p = buildRefinePrompt(sampleResume, 1)
    expect(p).toContain("保留所有已有数据")
    expect(p).toContain("不要清空")
  })

  it("defaults to iteration 1 when omitted", () => {
    const p = buildRefinePrompt(sampleResume)
    expect(p).toContain("第 1 次润色")
  })
})
