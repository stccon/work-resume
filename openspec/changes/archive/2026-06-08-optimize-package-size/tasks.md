## 1. 移除冗余 opencode.exe

- [x] 1.1 将 `opencode-ai` 从 `package.json` 的 `dependencies` 移至 `devDependencies`
- [x] 1.2 构建后验证 `win-unpacked` 中只有 1 个 `opencode.exe`（位于 `resources/opencode-ai/bin/`）
- [x] 1.3 验证开发环境 `npm run dev` 能正常启动 opencode 服务（devDependencies 仍会安装）

## 2. 启用 electron-builder 压缩

- [x] 2.1 在 `electron-builder.yml` 中添加 `compression: "maximum"`
- [x] 2.2 确认 `asar` 压缩已启用（`asar: true`）
- [x] 2.3 构建并对比优化前后的安装包体积

## 3. 排除 pdfjs-dist skia 二进制

- [x] 3.1 分析 `skia.win32-x64-msvc.node` 是否被应用代码实际引用
- [x] 3.2 若未被引用，在 `electron-builder.yml` 的 `files` 中排除 pdfjs-dist 的 skia 相关文件
- [x] 3.3 验证 PDF 导入功能在移除后仍正常（`pdfjs-dist/legacy/build/pdf.mjs` 不依赖 skia）

## 4. 验证与发布

- [x] 4.1 完整构建并测试所有核心功能（AI 对话、简历解析、导入导出）
- [x] 4.2 记录优化前后的体积对比
- [x] 4.3 更新 AGENTS.md 记录相关构建知识（如需要）（无 AGENTS.md，跳过）
