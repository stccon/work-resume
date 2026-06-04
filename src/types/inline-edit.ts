export interface FieldLocator {
  section: string
  field: string
  entry?: number
}

export interface PolishFieldPayload {
  targetRole: string
  sectionId: string
  sectionLabel: string
  fieldLabel: string
  fieldValue: string
  entryNeighbors?: {
    company?: string
    position?: string
    startDate?: string
    endDate?: string
  }
  extraPrompt?: string
}

export interface PendingUndo {
  locator: FieldLocator
  oldValue: string
  expiresAt: number
}
