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
        { id: "title", label: "求职意向", type: "text", required: true, order: 2, prompt: "" },
        { id: "email", label: "邮箱", type: "text", required: true, order: 3, prompt: "" },
        { id: "phone", label: "电话", type: "text", required: true, order: 4, prompt: "" },
        { id: "location", label: "所在城市", type: "text", required: false, order: 5, prompt: "" },
        { id: "linkedin", label: "LinkedIn", type: "text", required: false, order: 6, prompt: "" },
        { id: "github", label: "GitHub", type: "text", required: false, order: 7, prompt: "" },
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
      id: "highlights",
      label: "个人优势",
      fields: [
        { id: "highlights", label: "个人优势", type: "textarea", required: false, order: 1, prompt: "" },
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
        { id: "location", label: "工作地点", type: "text", required: false, order: 3, prompt: "" },
        { id: "startDate", label: "开始", type: "date", required: true, order: 4, prompt: "" },
        { id: "endDate", label: "结束", type: "date", required: false, order: 5, prompt: "" },
        { id: "achievements", label: "成就", type: "textarea", required: true, order: 6, prompt: "" },
      ],
    },
    {
      id: "projects",
      label: "项目经历",
      fields: [
        { id: "name", label: "项目名称", type: "text", required: true, order: 1, prompt: "" },
        { id: "role", label: "担任角色", type: "text", required: false, order: 2, prompt: "" },
        { id: "description", label: "项目描述", type: "textarea", required: true, order: 3, prompt: "" },
        { id: "techStack", label: "技术栈", type: "text", required: false, order: 4, prompt: "" },
      ],
    },
    {
      id: "education",
      label: "教育",
      fields: [
        { id: "school", label: "学校", type: "text", required: true, order: 1, prompt: "" },
        { id: "major", label: "专业", type: "text", required: true, order: 2, prompt: "" },
        { id: "degree", label: "学位", type: "text", required: true, order: 3, prompt: "" },
        { id: "endDate", label: "毕业时间", type: "date", required: true, order: 4, prompt: "" },
        { id: "gpa", label: "GPA", type: "text", required: false, order: 5, prompt: "" },
      ],
    },
    {
      id: "certifications",
      label: "证书",
      fields: [
        { id: "certifications", label: "证书", type: "textarea", required: false, order: 1, prompt: "" },
      ],
    },
    {
      id: "awards",
      label: "荣誉奖项",
      fields: [
        { id: "awards", label: "奖项", type: "textarea", required: false, order: 1, prompt: "" },
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
  projects: [],
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
      location: "",
      linkedin: "",
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

  it("flattens education entries with GPA", () => {
    const result = mapToTemplate(
      {
        ...baseParsed,
        education: [
          { school: "清华", major: "CS", degree: "本科", startDate: "2015.09", endDate: "2019.06", gpa: "3.8/4.0" },
        ],
      },
      template,
    )
    expect(result.sections.education).toEqual({
      entry0_school: "清华",
      entry0_major: "CS",
      entry0_degree: "本科",
      entry0_startDate: "2015.09",
      entry0_endDate: "2019.06",
      entry0_gpa: "3.8/4.0",
    })
  })

  it("flattens multiple projects into entry0_xxx, entry1_xxx", () => {
    const result = mapToTemplate(
      {
        ...baseParsed,
        projects: [
          { name: "订单系统", role: "技术负责人", description: "性能提升 50%", techStack: "Java" },
          { name: "数据平台", role: "核心开发", description: "实时数仓", techStack: "Flink" },
        ],
      },
      template,
    )
    expect(result.sections.projects).toEqual({
      entry0_name: "订单系统",
      entry0_role: "技术负责人",
      entry0_description: "性能提升 50%",
      entry0_techStack: "Java",
      entry1_name: "数据平台",
      entry1_role: "核心开发",
      entry1_description: "实时数仓",
      entry1_techStack: "Flink",
    })
  })

  it("maps highlights as single textarea", () => {
    const result = mapToTemplate(
      { ...baseParsed, highlights: "8年后端经验\n主导日均 10 亿请求系统" },
      template,
    )
    expect(result.sections.highlights).toEqual({
      highlights: "8年后端经验\n主导日均 10 亿请求系统",
    })
  })

  it("maps awards as single textarea", () => {
    const result = mapToTemplate(
      { ...baseParsed, awards: "2022 ACM 金牌\n2021 国家奖学金" },
      template,
    )
    expect(result.sections.awards).toEqual({
      awards: "2022 ACM 金牌\n2021 国家奖学金",
    })
  })

  it("maps personal location and linkedin", () => {
    const result = mapToTemplate(
      { ...baseParsed, name: "李四", location: "北京", linkedin: "lisi" },
      template,
    )
    expect(result.sections.personal).toEqual({
      name: "李四",
      email: "",
      phone: "",
      title: "",
      location: "北京",
      linkedin: "lisi",
      github: "",
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
        { id: "languages", label: "语言能力", fields: [{ id: "languages", label: "语言", type: "text", required: false, order: 1, prompt: "" }] },
      ],
    }
    const result = mapToTemplate(baseParsed, customTemplate)
    expect(result.sections.languages).toEqual({ languages: "" })
  })

  it("preserves unknown parsed fields into existing section", () => {
    const result = mapToTemplate(
      { ...baseParsed, summary: "5年经验" },
      template,
    )
    expect(result.sections.summary.summary).toBe("5年经验")
  })
})
