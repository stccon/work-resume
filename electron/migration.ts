import fs from "fs"
import path from "path"
import { app } from "electron"
import { getUserDir, getUserProfilePath, getUserPreferencesPath, getUserResumeDraftPath, listUsers } from "./paths"

interface SavedResume {
  id: string
  title: string
  templateName: string
  templateLabel: string
  createdAt: string
  data: any
}

export function migrateLegacyData() {
  const existingUsers = listUsers()
  if (existingUsers.length > 0) return

  const legacyResumes = getLegacyResumes()
  if (legacyResumes.length === 0) return

  const defaultUserDir = getUserDir("default")
  if (!fs.existsSync(defaultUserDir)) {
    fs.mkdirSync(defaultUserDir, { recursive: true })
  }

  const latest = legacyResumes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]

  const personal = latest.data?.sections?.personal || {}
  const profile = {
    name: personal.name || latest.title || "用户",
    sections: latest.data?.sections || {},
    updatedAt: latest.createdAt || null,
  }
  fs.writeFileSync(getUserProfilePath("default"), JSON.stringify(profile, null, 2), "utf-8")

  const draft = {
    template: latest.templateName || latest.templateLabel || "general",
    sections: latest.data?.sections || {},
    completedAt: latest.createdAt || null,
  }
  fs.writeFileSync(getUserResumeDraftPath("default"), JSON.stringify(draft, null, 2), "utf-8")

  const preferences = {
    template: latest.templateName || "general",
    accentColor: "#1a56db",
    fontFamily: "system",
    fontSize: "13",
    layout: "standard",
  }
  fs.writeFileSync(getUserPreferencesPath("default"), JSON.stringify(preferences, null, 2), "utf-8")

  console.log(`Migrated ${legacyResumes.length} legacy resume(s) to userdata/default/`)
}

function getLegacyResumes(): SavedResume[] {
  const userDataPath = app.getPath("userData")
  const configPath = path.join(userDataPath, "config.json")
  if (!fs.existsSync(configPath)) return []

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
    return config.resumes || []
  } catch {
    return []
  }
}
