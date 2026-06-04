import { describe, it, expect } from "vitest"
import { buildPolishPayload } from "@/lib/field-context"
import type { ResumeData } from "@/types/resume"
import type { TemplateDefinition } from "@/types/template"

const template: TemplateDefinition = {
  name: "general",
  label: "通用简历",
  description: "",
  sections: [
    {
      id: "personal",
      label: "个人信息",
      fields: [
        { id: "name", label: "姓名", type: "text", required: true, order: 1, prompt: "" },
        { id: "title", label: "求职意向", type: "text", required: true, order: 2, prompt: "" },
        { id: "email", label: "邮箱", type: "text", required: true, order: 3, prompt: "" },
      ],
    },
    {
      id: "summary",
      label: "个人简介",
      fields: [
        { id: "summary", label: "个人简介", type: "textarea", required: true, order: 1, prompt: "" },
      ],
    },
    {
      id: "experience",
      label: "工作经历",
      fields: [
        { id: "company", label: "公司名称", type: "text", required: true, order: 1, prompt: "" },
        { id: "position", label: "职位", type: "text", required: true, order: 2, prompt: "" },
        { id: "detail", label: "详细描述", type: "textarea", required: false, order: 3, prompt: "" },
        { id: "achievements", label: "工作成就", type: "textarea", required: false, order: 4, prompt: "" },
        { id: "techStack", label: "技术栈", type: "text", required: false, order: 5, prompt: "" },
      ],
    },
  ],
}

const data: ResumeData = {
  template: "general",
  sections: {
    personal: { name: "张三", title: "前端工程师", email: "a@b.com" },
    summary: { summary: "8 年前端" },
    experience: {
      entry0_company: "字节跳动",
      entry0_position: "前端",
      entry0_detail: "负责抖音",
      entry0_achievements: "性能提升 50%",
      entry0_techStack: "React, TypeScript",
    },
  },
}

describe("buildPolishPayload", () => {
  it("builds payload for single-entry field with section/field labels from template", () => {
    const payload = buildPolishPayload(
      data,
      template,
      { section: "summary", field: "summary" },
      "前端工程师"
    )
    expect(payload.sectionId).toBe("summary")
    expect(payload.sectionLabel).toBe("个人简介")
    expect(payload.fieldLabel).toBe("个人简介")
    expect(payload.fieldValue).toBe("8 年前端")
    expect(payload.targetRole).toBe("前端工程师")
    expect(payload.entryNeighbors).toBeUndefined()
  })

  it("builds payload for multi-entry field with entry neighbors", () => {
    const payload = buildPolishPayload(
      data,
      template,
      { section: "experience", field: "entry0_detail", entry: 0 },
      "前端工程师"
    )
    expect(payload.sectionId).toBe("experience")
    expect(payload.sectionLabel).toBe("工作经历")
    expect(payload.fieldLabel).toBe("详细描述")
    expect(payload.fieldValue).toBe("负责抖音")
    expect(payload.entryNeighbors).toEqual({
      company: "字节跳动",
      position: "前端",
    })
  })

  it("strips entry prefix from field label", () => {
    const payload = buildPolishPayload(
      data,
      template,
      { section: "experience", field: "entry0_techStack", entry: 0 },
      ""
    )
    expect(payload.fieldLabel).toBe("技术栈")
    expect(payload.targetRole).toBe("")
  })

  it("falls back to field key when template has no label", () => {
    const payload = buildPolishPayload(
      data,
      template,
      { section: "personal", field: "phone" },
      ""
    )
    expect(payload.fieldLabel).toBe("phone")
  })

  it("includes extraPrompt when provided (trimmed)", () => {
    const payload = buildPolishPayload(
      data,
      template,
      { section: "summary", field: "summary" },
      "前端工程师",
      "  突出量化  "
    )
    expect(payload.extraPrompt).toBe("突出量化")
  })

  it("omits extraPrompt when empty / whitespace", () => {
    const a = buildPolishPayload(data, template, { section: "summary", field: "summary" }, "")
    const b = buildPolishPayload(data, template, { section: "summary", field: "summary" }, "", "   ")
    expect(a.extraPrompt).toBeUndefined()
    expect(b.extraPrompt).toBeUndefined()
  })
})
