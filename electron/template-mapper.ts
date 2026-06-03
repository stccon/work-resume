import type { TemplateDefinition } from "../src/types/template"
import type { ResumeData } from "../src/types/resume"
import type { ParsedResume } from "./resume-parser"

const LIST_SECTIONS = new Set(["experience", "education", "projects"])

function flattenEntry(
  obj: Record<string, string | undefined>,
  prefix: string,
  out: Record<string, string>,
): void {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "") continue
    out[`${prefix}${k}`] = v
  }
}

export function mapToTemplate(parsed: ParsedResume, template: TemplateDefinition): ResumeData {
  const sections: Record<string, Record<string, string>> = {}

  const personal: Record<string, string> = {}
  if (parsed.name) personal.name = parsed.name
  if (parsed.title) personal.title = parsed.title
  if (parsed.email) personal.email = parsed.email
  if (parsed.phone) personal.phone = parsed.phone
  if (parsed.location) personal.location = parsed.location
  if (parsed.github) personal.github = parsed.github
  if (parsed.linkedin) personal.linkedin = parsed.linkedin
  sections.personal = personal

  if (parsed.summary) {
    sections.summary = { summary: parsed.summary }
  } else {
    sections.summary = {}
  }

  if (parsed.highlights) {
    sections.highlights = { highlights: parsed.highlights }
  } else {
    sections.highlights = {}
  }

  if (parsed.experience.length > 0) {
    const exp: Record<string, string> = {}
    parsed.experience.forEach((e, i) => {
      flattenEntry(e, `entry${i}_`, exp)
    })
    sections.experience = exp
  } else {
    sections.experience = {}
  }

  if (parsed.projects.length > 0) {
    const proj: Record<string, string> = {}
    parsed.projects.forEach((p, i) => {
      flattenEntry(p, `entry${i}_`, proj)
    })
    sections.projects = proj
  } else {
    sections.projects = {}
  }

  if (parsed.education.length > 0) {
    const edu: Record<string, string> = {}
    parsed.education.forEach((e, i) => {
      flattenEntry(e, `entry${i}_`, edu)
    })
    sections.education = edu
  } else {
    sections.education = {}
  }

  if (parsed.skills.length > 0) {
    sections.skills = {
      skills: parsed.skills.join("、"),
    }
    if (parsed.languages) sections.skills.languages = parsed.languages
    if (parsed.frameworks) sections.skills.frameworks = parsed.frameworks
    if (parsed.databases) sections.skills.databases = parsed.databases
    if (parsed.cloud) sections.skills.cloud = parsed.cloud
  } else {
    sections.skills = {}
  }

  if (parsed.certifications) {
    sections.certifications = { certifications: parsed.certifications }
  } else {
    sections.certifications = {}
  }

  if (parsed.awards) {
    sections.awards = { awards: parsed.awards }
  } else {
    sections.awards = {}
  }

  for (const section of template.sections) {
    if (!sections[section.id]) {
      sections[section.id] = {}
    }
    const current = sections[section.id]
    if (LIST_SECTIONS.has(section.id)) continue
    for (const field of section.fields) {
      if (!(field.id in current)) {
        current[field.id] = ""
      }
    }
  }

  return {
    template: template.name,
    sections,
  }
}
