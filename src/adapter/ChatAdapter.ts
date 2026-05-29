export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  thinking?: string
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onThinking?: (thinking: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export interface ChatAdapter {
  sendMessage(text: string, callbacks: StreamCallbacks): Promise<void>
  abort(): void
  getModels(): Promise<string[]>
  setModel(model: string): Promise<void>
  getCurrentModel(): Promise<string>
}
