import { describe, it, expect } from "vitest"
import generalTemplate from "../../templates/general.json"
import technicalTemplate from "../../templates/technical.json"
import managementTemplate from "../../templates/management.json"

describe("templates", () => {
  it("should have valid general template", () => {
    expect(generalTemplate.name).toBe("general")
    expect(generalTemplate.sections.length).toBeGreaterThan(0)
    for (const section of generalTemplate.sections) {
      expect(section.fields.length).toBeGreaterThan(0)
    }
  })

  it("should have valid technical template", () => {
    expect(technicalTemplate.name).toBe("technical")
    expect(technicalTemplate.sections.length).toBeGreaterThan(0)
  })

  it("should have valid management template", () => {
    expect(managementTemplate.name).toBe("management")
    expect(managementTemplate.sections.length).toBeGreaterThan(0)
  })

  it("all templates should have unique field ids per section", () => {
    for (const t of [generalTemplate, technicalTemplate, managementTemplate]) {
      for (const section of t.sections) {
        const ids = section.fields.map((f: { id: string }) => f.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })

  it("all templates should have label and description", () => {
    for (const t of [generalTemplate, technicalTemplate, managementTemplate]) {
      expect(t.label).toBeTruthy()
      expect(t.description).toBeTruthy()
    }
  })
})
