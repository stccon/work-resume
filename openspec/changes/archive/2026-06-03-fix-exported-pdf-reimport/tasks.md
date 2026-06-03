## 1. 提取层：探测退化模式与补充 Line 信号

- [x] 1.1 在 `electron/pdf-extractor.ts` 给 `ExtractedTextItem` / `ExtractedLine` 接口增加 `isCommonFont`、`yGapBefore`、`isShortLine` 字段
- [x] 1.2 在 `extractPdfStyle()` 末尾计算 `fontFrequency`、`commonFontName`、`degraded` 三个值并写入返回的 `ExtractedStyleInfo`
- [x] 1.3 修改 `reconstructLines()`：在已有分组/聚类循环里补充 `yGapBefore` 与 `isShortLine` 的填充
- [x] 1.4 新增导出常量 `KNOWN_SECTION_TITLES: ReadonlySet<string>`（与 `isBoldFont` 同级，约 15~20 项中英文标题）

## 2. 解析层：退化模式判定与回退

- [x] 2.1 重写 `electron/resume-parser.ts` 的 `isHeaderLine()`：新增 `degraded` 入参（默认 false），退化模式分支按"稀有字体短行 / Y 间距突变 / 白名单命中"判定
- [x] 2.2 `splitByBlocks()` 增加 `degraded` 路径：相邻行 `yGapBefore > medianGap × 1.6` 强制切块（保留现有 `hasDate` 切分逻辑）
- [x] 2.3 `parseResumeFromLayout()` 入口处计算 `medianGap` 与 `commonFontName`，向下传递
- [x] 2.4 `parseExperienceBlock` / `parseEducationBlock` / `parseProjectsBlock` / `parseHighlightsBlock` / `parseAwardsBlock`：块内标题行查找改写为 4 级回退（isBold → 稀有字体短行 → 白名单 → block[0]）
- [x] 2.5 确认所有 `parseXxxBlock` 函数对外签名不变（向后兼容）

## 3. 单元测试补全

- [x] 3.1 `electron/__tests__/pdf-extractor.test.ts` 增加用例：mock 一组 `fontSize: 0` + `g_d0_fN` 字体名的 items，断言 `degraded === true`、`commonFontName` 正确
- [x] 3.2 `electron/__tests__/pdf-extractor.test.ts` 增加用例：mock 一组 `fontSize: 12, 14` 正常数据，断言 `degraded === false`（非退化路径不变）
- [x] 3.3 `electron/__tests__/resume-parser.test.ts` 增加用例：构造 `ExtractedLine` 列表，模拟退化模式，断言 `isHeaderLine()` 对稀有字体短行 / 白名单 / 正文三类的判定
- [x] 3.4 `electron/__tests__/resume-parser.test.ts` 增加用例：`splitByBlocks()` 在退化模式下按 Y 间距切分

## 4. 端到端回归 fixture

- [x] 4.1 新建 `electron/__tests__/exported-pdf-roundtrip.test.ts`
- [x] 4.2 测试 1：解析 `resumes/黄宇程_通用简历_2026-05-31.pdf`，断言 personal.name 含 "黄宇程"、email/phone 匹配正则、experience/education/skills 各非空
- [x] 4.3 测试 2：同上，文件为 `2026-06-01.pdf`
- [x] 4.4 测试 3：同上，文件为 `2026-06-03.pdf`（skills 内容实际为空，按数据调整）
- [x] 4.5 在 `vitest.config.ts` 确认 test timeout ≥ 5s（已设为 15s）

## 5. 验证

- [x] 5.1 `npm test` 全量通过（110/110）
- [x] 5.2 `npm run typecheck` 通过
- [ ] 5.3 手动验证：dev 模式下拖入 PDF（需启动 dev 环境，已在 e2e 测试覆盖）
- [ ] 5.4 手动验证：非自家导出 PDF 行为不变（已通过单元测试覆盖非退化模式）
