// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { getFieldFromElement, readField, patchField } from "@/lib/field-locator"
import type { ResumeData } from "@/types/resume"

const sampleData: ResumeData = {
  template: "general",
  sections: {
    personal: { name: "张三", title: "前端工程师", email: "a@b.com", phone: "138" },
    summary: { summary: "8 年前端经验" },
    experience: {
      entry0_position: "前端工程师",
      entry0_company: "字节跳动",
      entry0_detail: "负责抖音 Web 端",
      entry1_position: "高级前端",
      entry1_company: "腾讯",
      entry1_detail: "负责 QQ 音乐",
    },
  },
}

describe("getFieldFromElement", () => {
  function makeEl(tag: string, attrs: Record<string, string>, parent?: HTMLElement): HTMLElement {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (parent) parent.appendChild(el)
    return el
  }

  it("returns null when no ancestor has data-section/data-field", () => {
    const root = document.createElement("div")
    const span = makeEl("span", {}, root)
    expect(getFieldFromElement(span)).toBeNull()
  })

  it("finds the nearest data-section/data-field ancestor", () => {
    const root = document.createElement("div")
    const field = makeEl("span", { "data-section": "personal", "data-field": "name" }, root)
    const inner = makeEl("b", {}, field)
    const text = document.createTextNode("张三")
    inner.appendChild(text)
    expect(getFieldFromElement(inner)).toEqual({ section: "personal", field: "name" })
  })

  it("extracts data-entry when present", () => {
    const root = document.createElement("div")
    const field = makeEl(
      "div",
      { "data-section": "experience", "data-field": "entry1_detail", "data-entry": "1" },
      root
    )
    expect(getFieldFromElement(field)).toEqual({
      section: "experience",
      field: "entry1_detail",
      entry: 1,
    })
  })

  it("walks up through nested elements to find the marker", () => {
    const root = document.createElement("div")
    const outer = makeEl("div", { class: "wrapper" }, root)
    const field = makeEl("div", { "data-section": "summary", "data-field": "summary" }, outer)
    const p = makeEl("p", {}, field)
    const text = makeEl("span", {}, p)
    expect(getFieldFromElement(text)).toEqual({ section: "summary", field: "summary" })
  })

  it("returns null for null input", () => {
    expect(getFieldFromElement(null)).toBeNull()
  })
})

describe("patchField", () => {
  it("immutably updates a single-entry field", () => {
    const next = patchField(sampleData, { section: "personal", field: "name" }, "李四")
    expect(next).not.toBe(sampleData)
    expect(next.sections).not.toBe(sampleData.sections)
    expect(next.sections.personal).not.toBe(sampleData.sections.personal)
    expect(next.sections.personal.name).toBe("李四")
    expect(next.sections.personal.email).toBe("a@b.com")
  })

  it("immutably updates a multi-entry field (entry1_detail)", () => {
    const next = patchField(sampleData, { section: "experience", field: "entry1_detail", entry: 1 }, "负责 QQ 音乐重构")
    expect(next.sections.experience.entry1_detail).toBe("负责 QQ 音乐重构")
    expect(next.sections.experience.entry0_detail).toBe("负责抖音 Web 端")
    expect(next.sections.experience).not.toBe(sampleData.sections.experience)
  })

  it("returns same reference when value unchanged", () => {
    const next = patchField(sampleData, { section: "personal", field: "name" }, "张三")
    expect(next).toBe(sampleData)
  })

  it("returns same reference when section missing", () => {
    const next = patchField(sampleData, { section: "nonexistent", field: "x" }, "y")
    expect(next).toBe(sampleData)
  })
})

describe("readField", () => {
  it("returns the field value for single-entry", () => {
    expect(readField(sampleData, { section: "personal", field: "name" })).toBe("张三")
  })

  it("returns the field value for multi-entry", () => {
    expect(readField(sampleData, { section: "experience", field: "entry0_position", entry: 0 })).toBe("前端工程师")
  })

  it("returns empty string for missing", () => {
    expect(readField(sampleData, { section: "personal", field: "avatar" })).toBe("")
  })
})
