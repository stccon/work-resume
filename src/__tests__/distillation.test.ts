import { describe, it, expect } from "vitest"
import { buildFirstMessagePrompt, buildResumeContext } from "@/adapter/distillation"
import type { ResumeData } from "@/types/resume"

describe("buildFirstMessagePrompt", () => {
  it("should return first-time greeting when profile is empty", () => {
    const result = buildFirstMessagePrompt(null)
    expect(result).toContain("第一次对话")
    expect(result).toContain("打招呼")
    expect(result).toContain("姓名")
  })

  it("should return first-time greeting when resume has no sections", () => {
    const resume: ResumeData = { template: "general", sections: {} }
    const result = buildFirstMessagePrompt(resume)
    expect(result).toContain("第一次对话")
  })

  it("should return returning greeting when resume has data", () => {
    const resume: ResumeData = {
      template: "general",
      sections: {
        personal: { name: "张三", email: "zhang@test.com", title: "前端开发" },
        summary: { summary: "10年前端经验" },
      },
    }
    const result = buildFirstMessagePrompt(resume)
    expect(result).toContain("张三")
    expect(result).toContain("JSON")
    expect(result).toContain("简历信息")
  })

  it("should include user name in greeting when available", () => {
    const resume: ResumeData = {
      template: "general",
      sections: { personal: { name: "李四" } },
    }
    const result = buildFirstMessagePrompt(resume)
    expect(result).toContain("李四")
  })
})

describe("buildResumeContext", () => {
  it("should include template fields when called without arguments", () => {
    const result = buildResumeContext(null)
    expect(result).toContain("AI 简历助手")
    expect(result).toContain("个人信息")
    expect(result).toContain("工作经历")
    expect(result).toContain("教育背景")
  })

  it("should include new section semantics for highlights/projects/awards", () => {
    const result = buildResumeContext(null)
    expect(result).toContain("个人优势")
    expect(result).toContain("项目经历")
    expect(result).toContain("荣誉奖项")
    expect(result).toContain("section 列表与语义")
  })

  it("should include existing resume data when sections exist", () => {
    const resume: ResumeData = {
      template: "general",
      sections: { personal: { name: "张三" } },
    }
    const result = buildResumeContext(resume)
    expect(result).toContain("已有简历信息")
    expect(result).toContain("张三")
  })

  it("should indicate first-time when resume is empty", () => {
    const result = buildResumeContext(null)
    expect(result).toContain("第一次对话")
  })
})