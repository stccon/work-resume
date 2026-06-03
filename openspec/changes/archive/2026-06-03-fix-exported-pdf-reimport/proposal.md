## Why

系统自导出的 PDF（位于 `resumes/` 下的 `黄宇程_通用简历_*.pdf`）在重新导入时，UI 报"无法自动解析此 PDF"，内容字段几乎全部丢失。根因是：导出端走 `webContents.printToPDF`，Chromium 把字体重命名为匿名的 `g_d0_fN`、并把 `fontSize` 一律报告为 `0`；而 `electron/resume-parser.ts` 识别 section 标题/加粗行的全部逻辑都基于 `line.isBold || line.fontSize >= 12` —— 两条都失败，导致 `splitByBlocks()` 切不出段落、块内找不到标题行，解析器返回基本为空的 `ResumeData`。

实测三份历史导出（2026-05-31 / 2026-06-01 / 2026-06-03）的解析结果：技能 / 工作 / 教育 / 项目四个数组基本为 0，唯一能识别的是姓名、邮箱、手机号（因为走的是文本正则，不依赖字号）。

**这不是导出端有 bug**：PDF 本身是文字可选中的、可正常打开查看。问题完全在解析层，缺一个能在"元数据缺失"场景下回退的启发式。

## What Changes

- 修复 `electron/pdf-extractor.ts`：检测"退化模式"（所有 `fontSize === 0` 且字名为 `g_d0_fN` 风格），并在每条 `ExtractedLine` 上补充字体频次、Y 间距、是否短行等信号。
- 修复 `electron/resume-parser.ts`：
  - 退化模式下用"字体频次 = 正文 / 其它 = 标题候选"代替 `isBold` 判断
  - 退化模式下用 Y 间距突变代替"加粗即段落头"
  - 兜底用常见中文 section 标题白名单（"教育经历" / "工作经历" / "项目经历" 等）
  - `splitByBlocks()` 增加 Y 间距切分
  - `parseExperienceBlock` / `parseEducationBlock` 等在找不到 `isBold` 标题行时回退到稀有字体首行
- 新增 `KNOWN_SECTION_TITLES` 常量（白名单）。
- 新增 `electron/__tests__/exported-pdf-roundtrip.test.ts`，用 `resumes/` 下三份历史 PDF 做端到端回归断言。
- 补 `electron/__tests__/pdf-extractor.test.ts` 与 `electron/__tests__/resume-parser.test.ts` 的最小回归用例（`fontSize: 0` + 匿名字体名）。

非破坏性修改：旧逻辑路径完全保留，仅在 `degraded === true` 时启用新启发式。**不动**导出端、不动 UI、不引入 LLM 兜底。

## Capabilities

### New Capabilities
- `resume-import`：从 PDF 导入简历的解析能力
  - 引入"退化模式"识别：当 PDF 全部 `fontSize === 0` 且字名为 `g_d0_fN` 风格时（典型场景为 Electron `printToPDF` 输出）触发回退启发式
  - 字体频次 = 正文 / 其它 = 标题候选（替代 `isBold`）
  - Y 间距突变 = 段落边界（替代"加粗即段落头"）
  - 常见中文 section 标题白名单（"教育经历" / "工作经历" / "项目经历" / "个人优势" / "技能" 等）作为兜底
  - 解析器块内标题行回退策略：isBold → 稀有字体短行 → 命中白名单 → 首行
  - 行为约束：旧逻辑（基于 `fontSize >= 12` 和 `isBoldFont` 匹配）完全保留，仅在 `degraded === true` 时启用新路径

### Modified Capabilities
（无 — `openspec/specs/resume-import/` 在主分支上尚不存在；本次作为新能力引入，与其它 pending 变更的 `resume-import` 由 archive 阶段协调。）

## Impact

- 修改：`electron/pdf-extractor.ts`（提取层增加退化模式探测 + Line 字段）
- 修改：`electron/resume-parser.ts`（判定逻辑、块切分、解析器回退、白名单常量）
- 修改：`electron/__tests__/pdf-extractor.test.ts`（补 fontSize:0 用例）
- 修改：`electron/__tests__/resume-parser.test.ts`（补退化模式用例）
- 新增：`electron/__tests__/exported-pdf-roundtrip.test.ts`（基于历史 PDF 的端到端回归）
- **不动**：`src/lib/resume-renderer.ts`、`electron/ipc.ts` 导出端、`src/App.tsx`、`src/adapter/distillation.ts`、`templates/*.json`、`themes/`
- **不动**：`package.json` 依赖、`vite.config.ts`、`vitest.config.ts`
- **验证**：`npm test` 全量通过 + `npm run typecheck` 通过 + 手动拖入 `黄宇程_通用简历_2026-06-03.pdf` 出现完整字段
