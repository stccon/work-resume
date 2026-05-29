import { describe, it, expect } from "vitest"
import { checkRequiredFields } from "@/lib/resume-generator"
import type { TemplateDefinition } from "@/types/template"
import type { ResumeData } from "@/types/resume"

const mockTemplate: TemplateDefinition = {
  name: "test",
  label: "测试模板",
  description: "",
  sections: [
    {
      id: "personal",
      label: "个人信息",
      fields: [
        { id: "name", label: "姓名", type: "text", required: true, order: 1, prompt: "" },
        { id: "email", label: "邮箱", type: "text", required: true, order: 2, prompt: "" },
        { id: "phone", label: "电话", type: "text", required: false, order: 3, prompt: "" },
      ],
    },
  ],
}

describe("checkRequiredFields", () => {
  it("should return complete when all required fields are filled", () => {
    const data: ResumeData = {
      template: "test",
      sections: {
        personal: { name: "张三", email: "zhang@test.com", phone: "13800138000" },
      },
    }
    const result = checkRequiredFields(data, mockTemplate)
    expect(result.complete).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it("should return missing fields when required fields are empty", () => {
    const data: ResumeData = {
      template: "test",
      sections: {
        personal: { name: "张三", email: "", phone: "" },
      },
    }
    const result = checkRequiredFields(data, mockTemplate)
    expect(result.complete).toBe(false)
    expect(result.missing).toHaveLength(1)
    expect(result.missing[0].id).toBe("email")
  })

  it("should allow optional fields to be empty", () => {
    const data: ResumeData = {
      template: "test",
      sections: {
        personal: { name: "张三", email: "zhang@test.com", phone: "" },
      },
    }
    const result = checkRequiredFields(data, mockTemplate)
    expect(result.complete).toBe(true)
  })
})
