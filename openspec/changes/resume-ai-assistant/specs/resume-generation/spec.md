## ADDED Requirements

### Requirement: 基于对话生成简历
系统 SHALL 根据对话中收集的用户信息，填充所选模板生成完整简历。

#### Scenario: 生成简历
- **WHEN** AI 确认信息已足够
- **THEN** 系统生成简历预览，用户可查看和下载

### Requirement: 信息完整性校验
系统 SHALL 在生成简历前检查模板必填字段是否已收集完整。

#### Scenario: 缺少必填信息
- **WHEN** 用户过早要求生成简历但必填字段未完成
- **THEN** AI 提示缺少哪些信息并继续提问

### Requirement: 简历导出
系统 SHALL 支持将简历导出为 PDF 格式。

#### Scenario: 导出 PDF
- **WHEN** 用户点击导出按钮
- **THEN** 系统将当前简历导出为 PDF 文件并触发下载
