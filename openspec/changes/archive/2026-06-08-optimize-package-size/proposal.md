## Why

当前打包出来的安装包体积达 244 MB（解压后近 1 GB），其中约 441 MB 是 3 份冗余的 `opencode.exe` 二进制文件。过大的安装包影响用户下载意愿和安装体验，需要优化。

## What Changes

- **移除冗余 opencode.exe 副本**：将 `opencode-ai` 从 `dependencies` 移到 `devDependencies`，消除打包时带入的 3 份重复二进制（每份 147 MB）
- **开启 electron-builder 压缩**：配置 NSIS 安装包使用 LZMA 压缩，减小安装包体积
- **启用 asar 压缩**：配置 electron-builder 对 asar 归档使用压缩模式
- **优化 pdfjs-dist 体积**：评估 skia 二进制（27 MB）的必要性，探索按需加载或精简方案

## Capabilities

### New Capabilities

- `package-size-optimization`: Electron 应用打包体积优化，包括依赖管理、构建配置和资源精简

### Modified Capabilities

<!-- 无现有 spec 需要修改 -->

## Impact

- `package.json`：`opencode-ai` 从 `dependencies` 移至 `devDependencies`
- `electron-builder.yml`：添加压缩相关配置项
- `electron/opencode.ts`：需确认生产环境二进制路径不受依赖移动影响（当前已使用 `process.resourcesPath`，不影响）
- 开发流程：`npm install` 行为不变，`opencode-ai` 作为 devDependency 仍会安装
- 构建流程：需要验证打包后 `extraResources` 中的 `opencode.exe` 能正常使用
