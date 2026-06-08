## ADDED Requirements

### Requirement: 打包时排除冗余二进制
electron-builder 打包时 SHALL NOT 将 `opencode-ai` 及其平台子依赖（`opencode-windows-x64`、`opencode-windows-x64-baseline`）中的二进制文件包含到安装包中。

#### Scenario: 安装包不包含多个 opencode.exe
- **WHEN** 执行 `electron:build`
- **THEN** 生成的安装包内 SHALL ONLY 包含一个 `opencode.exe`（位于 `resources/opencode-ai/bin/`）
- **AND** `app.asar.unpacked` 中 SHALL NOT 包含 `opencode.exe`

### Requirement: 开发环境正常使用 opencode
将 `opencode-ai` 移至 `devDependencies` 后，开发环境（`npm run dev`）SHALL 仍能正常启动 opencode 服务。

#### Scenario: 开发模式启动
- **WHEN** 开发环境下运行 `npm run dev`
- **AND** `opencode-ai` 作为 devDependency 已安装
- **THEN** `electron/opencode.ts` 中的开发路径回退（`__dirname + ../node_modules/opencode-ai/bin/opencode.exe`）SHALL 正常工作

### Requirement: 安装包使用压缩
electron-builder SHALL 使用最大压缩级别打包，以减小安装包体积。

#### Scenario: 压缩生效
- **WHEN** 执行 `electron:build`
- **THEN** electron-builder 配置中 SHALL 设置 `compression: "maximum"`

### Requirement: 确认 skia 二进制未被引用
构建过程 SHALL 验证 `skia.win32-x64-msvc.node` 是否被应用代码实际引用。若未被引用，SHALL 将其排除出安装包。

#### Scenario: 未引用时排除
- **WHEN** 分析发现应用代码未直接引用 skia 二进制
- **THEN** 构建配置 SHALL 排除 `node_modules/pdfjs-dist/build/pdf.skia.js` 及相关 skia 资源
