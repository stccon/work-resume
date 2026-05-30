## 1. Bundle opencode CLI

- [x] 1.1 Add `opencode-ai` dependency to package.json
- [x] 1.2 Add `extraResources` to electron-builder.yml for binary distribution
- [x] 1.3 Implement `getBinaryPath()` in electron/opencode.ts to resolve binary path

## 2. Dynamic Model Discovery

- [x] 2.1 Implement `getModels()` using `client.config.providers()` with free-model filtering
- [x] 2.2 Implement `setModel()` to actually store current model
- [x] 2.3 Update `sendPrompt()` to use dynamic model variable

## 3. Persistence and IPC

- [x] 3.1 Persist model choice in electron-store (ipc.ts models:set handler)
- [x] 3.2 Restore persisted model on startup (initOpencode)
- [x] 3.3 Update models:current handler to return actual current model

## 4. Frontend Adaptation

- [x] 4.1 Fetch models dynamically in App.tsx on mount
- [x] 4.2 Remove hardcoded model list from App.tsx
