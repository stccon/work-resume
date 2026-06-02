import { describe, it, expect } from "vitest"
import { mapToTemplate } from "../template-mapper"
import type { TemplateDefinition } from "../../src/types/template"
import type { ParsedResume } from "../resume-parser"

const template: TemplateDefinition = {
  name: "general",
  label: "通用简历",
  description: "通用",
  sections: [
    {
      id: "personal",
      label: "个人信息",
      fields: [
        { id: "name", label: "姓名", type: "text", required: true, order: 1, prompt: "" },
        { id: "email", label: "邮箱", type: "text", required: true, order: 2, prompt: "" },
        { id: "phone", label: "电话", type: "text", required: true, order: 3, prompt: "" },
        { id: "title", label: "求职意向", type: "text", required: true, order: 4, prompt: "" },
        { id: "github", label: "GitHub", type: "text", required: false, order: 5, prompt: "" },
      ],
    },
    {
      id: "summary",
      label: "简介",
      fields: [
        { id: "summary", label: "简介", type: "textarea", required: true, order: 1, prompt: "" },
      ],
    },
    {
      id: "skills",
      label: "技能",
      fields: [
        { id: "skills", label: "技能概述", type: "skills", required: true, order: 1, prompt: "" },
        { id: "languages", label: "编程语言", type: "text", required: false, order: 2, prompt: "" },
      ],
    },
    {
      id: "experience",
      label: "工作经历",
      fields: [
        { id: "company", label: "公司", type: "text", required: true, order: 1, prompt: "" },
        { id: "position", label: "职位", type: "text", required: true, order: 2, prompt: "" },
        { id: "startDate", label: "开始", type: "date", required: true, order: 3, prompt: "" },
        { id: "endDate", label: "结束", type: "date", required: false, order: 4, prompt: "" },
        { id: "achievements", label: "成就", type: "textarea", required: true, order: 5, prompt: "" },
      ],
    },
    {
      id: "education",
      label: "教育",
      fields: [
        { id: "school", label: "学校", type: "text", required: true, order: 1, prompt: "" },
        { id: "major", label: "专业", type: "text", required: true, order: 2, prompt: "" },
        { id: "degree", label: "学位", type: "text", required: true, order: 3, prompt: "" },
        { id: "gradYear", label: "毕业年份", type: "date", required: true, order: 4, prompt: "" },
      ],
    },
    {
      id: "certifications",
      label: "证书",
      fields: [
        { id: "certifications", label: "证书", type: "textarea", required: false, order: 1, prompt: "" },
      ],
    },
  ],
}

const baseParsed: ParsedResume = {
  name: "",
  email: "",
  phone: "",
  skills: [],
  experience: [],
  education: [],
}

describe("mapToTemplate", () => {
  it("maps personal fields", () => {
    const result = mapToTemplate(
      { ...baseParsed, name: "张三", email: "a@b.com", phone: "13800138000", title: "前端", github: "zhangsan" },
      template,
    )
    expect(result.sections.personal).toEqual({
      name: "张三",
      email: "a@b.com",
      phone: "13800138000",
      title: "前端",
      github: "zhangsan",
    })
  })

  it("flattens multiple experiences into entry0_xxx, entry1_xxx", () => {
    const result = mapToTemplate(
      {
        ...baseParsed,
        experience: [
          { company: "字节", position: "高级", startDate: "2020.06", endDate: "至今", achievements: "成就1" },
          { company: "阿里", position: "前端", startDate: "2018.09", endDate: "2020.05", achievements: "成就2" },
        ],
      },
      template,
    )
    expect(result.sections.experience).toEqual({
      entry0_company: "字节",
      entry0_position: "高级",
      entry0_startDate: "2020.06",
      entry0_endDate: "至今",
      entry0_achievements: "成就1",
      entry1_company: "阿里",
      entry1_position: "前端",
      entry1_startDate: "2018.09",
      entry1_endDate: "2020.05",
      entry1_achievements: "成就2",
    })
  })

  it("flattens education entries", () => {
    const result = mapToTemplate(
      {
        ...baseParsed,
        education: [
          { school: "清华", major: "CS", degree: "本科", gradYear: "2019" },
        ],
      },
      template,
    )
    expect(result.sections.education).toEqual({
      entry0_school: "清华",
      entry0_major: "CS",
      entry0_degree: "本科",
      entry0_gradYear: "2019",
    })
  })

  it("joins skills with 、 separator", () => {
    const result = mapToTemplate(
      { ...baseParsed, skills: ["React", "TypeScript", "Node"] },
      template,
    )
    expect(result.sections.skills.skills).toBe("React、TypeScript、Node")
  })

  it("fills missing required fields with empty string", () => {
    const result = mapToTemplate(baseParsed, template)
    expect(result.sections.personal.name).toBe("")
    expect(result.sections.experience).toEqual({})
    expect(result.sections.education).toEqual({})
  })

  it("includes template name in output", () => {
    const result = mapToTemplate(baseParsed, template)
    expect(result.template).toBe("general")
  })

  it("adds sections from template even when not in parsed resume", () => {
    const customTemplate: TemplateDefinition = {
      ...template,
      sections: [
        ...template.sections,
        { id: "projects", label: "项目", fields: [{ id: "projects", label: "项目", type: "textarea", required: false, order: 1, prompt: "" }] },
      ],
    }
    const result = mapToTemplate(baseParsed, customTemplate)
    expect(result.sections.projects).toEqual({ projects: "" })
  })

  it("preserves unknown parsed fields into existing section", () => {
    const result = mapToTemplate(
      { ...baseParsed, summary: "5年经验" },
      template,
    )
    expect(result.sections.summary.summary).toBe("5年经验")
  })
})
