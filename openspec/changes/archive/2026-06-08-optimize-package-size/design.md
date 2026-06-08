## Context

AI简历助手是一个 Electron + React 桌面应用，使用 electron-builder 打包。当前安装包 244 MB，解压后约 959 MB。分析发现 3 份冗余的 `opencode.exe`（每份 147 MB）是主要元凶，它们来自 `opencode-ai` 依赖及其平台子依赖被错误地打包进应用。

```
打包体积构成（解压后）:
┌─────────────────────────────────┐
│  Electron 运行时 (189 MB)       │
├─────────────────────────────────┤
│  app.asar (53 MB)               │
│   └─ 应用代码                    │
├─────────────────────────────────┤
│  opencode.exe ×4 (588 MB)       │
│   ├─ extraResources (需要的)     │
│   ├─ opencode-ai (冗余)         │
│   ├─ opencode-windows-x64 (冗余)│
│   └─ opencode-windows-x64       │
│       -baseline (冗余)          │
├─────────────────────────────────┤
│  skia (27 MB) + icudtl.dat (20) │
└─────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- 安装包体积从 244 MB 降低到 120-150 MB 范围
- 消除 3 份冗余的 opencode.exe（节省 ~441 MB 解压空间）
- 启用安装包压缩（减少网络传输体积）
- 保持所有功能正常运行，不影响用户体验

**Non-Goals:**
- 不改变 Electron 版本（升级 Electron 本身会带来体积变化，但那是独立事项）
- 不重构应用架构
- 不改变 opencode 集成方式

## Decisions

### 1. 将 opencode-ai 移至 devDependencies

**方案**：将 `package.json` 中 `opencode-ai` 从 `dependencies` 移到 `devDependencies`。

**理由**：
- 生产环境使用 `extraResources` 提供的二进制路径（`process.resourcesPath + "opencode-ai/bin/opencode.exe"`）
- `node_modules/opencode-ai/bin/opencode.exe` 仅作为开发环境回退路径
- electron-builder 不打包 devDependencies，因此 3 份冗余 exe 不会进入安装包

**风险**：需确认 `electron/opencode.ts` 中的开发路径回退在 dev 模式下仍能工作。答案是肯定的——devDependencies 在 `npm install` 时正常安装，仅打包时被排除。

### 2. electron-builder 压缩配置

**方案**：在 `electron-builder.yml` 中配置：
- `compression: "maximum"`（使用 LZMA/NX 压缩，比默认的 store 模式大幅减小）
- `asar: true`（默认已启用，确认）
- `asarUnpack` 仅保留必要的原生模块

**理由**：electron-builder 默认使用 store 模式（不压缩），切换后安装包体积可减少 30-40%。

### 3. pdfjs-dist 精简

**方案**：评估 `pdfjs-dist` 的 skia 二进制的必要性。如果不需要 skia 渲染路径，可以考虑：
- 使用 `pdfjs-dist/legacy/build/pdf.mjs`（当前已在用，不包含 skia）
- 确认 `skia.win32-x64-msvc.node`（27 MB）是否被实际引用

**理由**：当前 electron 代码从 `pdfjs-dist/legacy/build/pdf.mjs` 导入，这个路径不依赖 skia。skia 二进制可能是在 node_modules 中随附但未被引用的。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 移动 `opencode-ai` 后构建环境找不到二进制 | 确保 CI/build 环境运行 `npm install`（安装 devDependencies） |
| `@opencode-ai/sdk` 运行时动态导入受影响 | SDK 已单独 externalize，不受影响 |
| skia 二进制删除后某些 PDF 功能缺失 | 先确认是否被引用，再做决定 |
| 压缩后安装时间变长 | LZMA 解压比 store 慢但仍在可接受范围（<30秒） |
