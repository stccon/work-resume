import type { TemplateDefinition } from "../src/types/template"
import type { ResumeData } from "../src/types/resume"
import type { ParsedResume } from "./resume-parser"

export function mapToTemplate(parsed: ParsedResume, template: TemplateDefinition): ResumeData {
  const sections: Record<string, Record<string, string>> = {}

  const personal: Record<string, string> = {}
  if (parsed.name) personal.name = parsed.name
  if (parsed.email) personal.email = parsed.email
  if (parsed.phone) personal.phone = parsed.phone
  if (parsed.title) personal.title = parsed.title
  if (parsed.github) personal.github = parsed.github
  sections.personal = personal

  if (parsed.summary) {
    sections.summary = { summary: parsed.summary }
  } else {
    sections.summary = {}
  }

  if (parsed.experience.length > 0) {
    const exp: Record<string, string> = {}
    parsed.experience.forEach((e, i) => {
      const prefix = `entry${i}_`
      if (e.company) exp[`${prefix}company`] = e.company
      if (e.position) exp[`${prefix}position`] = e.position
      if (e.startDate) exp[`${prefix}startDate`] = e.startDate
      if (e.endDate) exp[`${prefix}endDate`] = e.endDate
      if (e.achievements) exp[`${prefix}achievements`] = e.achievements
      if (e.techStack) exp[`${prefix}techStack`] = e.techStack
      if (e.projects) exp[`${prefix}projects`] = e.projects
      if (e.teamSize) exp[`${prefix}teamSize`] = e.teamSize
      if (e.responsibilities) exp[`${prefix}responsibilities`] = e.responsibilities
    })
    sections.experience = exp
  } else {
    sections.experience = {}
  }

  if (parsed.education.length > 0) {
    const edu: Record<string, string> = {}
    parsed.education.forEach((e, i) => {
      const prefix = `entry${i}_`
      if (e.school) edu[`${prefix}school`] = e.school
      if (e.major) edu[`${prefix}major`] = e.major
      if (e.degree) edu[`${prefix}degree`] = e.degree
      if (e.gradYear) edu[`${prefix}gradYear`] = e.gradYear
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

  const LIST_SECTIONS = new Set(["experience", "education"])
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
