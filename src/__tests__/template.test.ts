import { describe, it, expect } from "vitest"
import generalTemplate from "../../templates/general.json"

describe("templates", () => {
  it("should have valid general template", () => {
    expect(generalTemplate.name).toBe("general")
    expect(generalTemplate.sections.length).toBeGreaterThan(0)
    for (const section of generalTemplate.sections) {
      expect(section.fields.length).toBeGreaterThan(0)
    }
  })

  it("should have unique field ids per section", () => {
    for (const section of generalTemplate.sections) {
      const ids = section.fields.map((f: { id: string }) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it("should have label and description", () => {
    expect(generalTemplate.label).toBeTruthy()
    expect(generalTemplate.description).toBeTruthy()
  })

  it("should include all essential sections", () => {
    const sectionIds = generalTemplate.sections.map((s: { id: string }) => s.id)
    expect(sectionIds).toContain("personal")
    expect(sectionIds).toContain("summary")
    expect(sectionIds).toContain("experience")
    expect(sectionIds).toContain("education")
    expect(sectionIds).toContain("skills")
  })

  it("personal section should have required core fields", () => {
    const personal = generalTemplate.sections.find((s: { id: string }) => s.id === "personal")
    expect(personal).toBeDefined()
    const fieldIds = personal!.fields.map((f: { id: string }) => f.id)
    expect(fieldIds).toContain("name")
    expect(fieldIds).toContain("email")
    expect(fieldIds).toContain("phone")
    expect(fieldIds).toContain("title")
  })
})
