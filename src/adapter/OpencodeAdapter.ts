import type { ChatAdapter, StreamCallbacks } from "./ChatAdapter"

export class OpencodeAdapter implements ChatAdapter {
  async sendMessage(text: string, callbacks: StreamCallbacks) {
    try {
      const sessionId = await window.electronAPI.sendMessage(text)
      window.electronAPI.onStreamChunk((chunk) => {
        callbacks.onChunk(chunk)
      })
      window.electronAPI.onStreamDone(() => {
        callbacks.onDone()
      })
      window.electronAPI.onStreamError((error) => {
        callbacks.onError(error)
      })
    } catch (err) {
      callbacks.onError(String(err))
    }
  }

  abort() {
    window.electronAPI.removeStreamListeners()
  }

  async getModels() {
    return window.electronAPI.getModels()
  }

  async setModel(model: string) {
    return window.electronAPI.setModel(model)
  }

  async getCurrentModel() {
    return window.electronAPI.getCurrentModel()
  }
}
