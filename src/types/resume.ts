export interface ResumeData {
  template: string
  sections: Record<string, Record<string, string>>
  completedAt?: string
}
