import { describe, it, expect } from "vitest"
import { buildFirstMessagePrompt, buildResumeContext } from "@/adapter/distillation"

describe("buildFirstMessagePrompt", () => {
  it("should return first-time greeting when profile is empty", () => {
    const result = buildFirstMessagePrompt(null)
    expect(result).toContain("第一次对话")
    expect(result).toContain("打招呼")
    expect(result).toContain("姓名")
  })

  it("should return first-time greeting when profile has no sections", () => {
    const profile: UserProfile = { sections: {}, updatedAt: null }
    const result = buildFirstMessagePrompt(profile)
    expect(result).toContain("第一次对话")
  })

  it("should return returning greeting when profile has data", () => {
    const profile: UserProfile = {
      name: "张三",
      sections: {
        personal: { name: "张三", email: "zhang@test.com", title: "前端开发" },
        summary: { summary: "10年前端经验" },
      },
      updatedAt: "2026-01-01",
    }
    const result = buildFirstMessagePrompt(profile)
    expect(result).toContain("张三")
    expect(result).toContain("JSON")
    expect(result).toContain("简历信息")
  })

  it("should include user name in greeting when available", () => {
    const profile: UserProfile = {
      name: "李四",
      sections: { personal: { name: "李四" } },
      updatedAt: null,
    }
    const result = buildFirstMessagePrompt(profile)
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

  it("should include existing profile data when profile has sections", () => {
    const profile: UserProfile = {
      sections: { personal: { name: "张三" } },
      updatedAt: null,
    }
    const result = buildResumeContext(profile)
    expect(result).toContain("已有简历信息")
    expect(result).toContain("张三")
  })

  it("should indicate first-time when profile is empty", () => {
    const result = buildResumeContext(null)
    expect(result).toContain("第一次对话")
  })
})
