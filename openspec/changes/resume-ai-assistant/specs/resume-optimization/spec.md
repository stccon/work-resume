## ADDED Requirements

### Requirement: 用户可上传已有简历
系统 SHALL 支持用户上传本地简历文件（PDF/DOCX 格式），AI 提取内容并分析。

#### Scenario: 上传简历
- **WHEN** 用户拖拽或选择文件上传
- **THEN** 系统读取文件内容并交给 AI 分析

### Requirement: AI 优化简历
系统 SHALL 对上传的简历进行分析，给出优化建议，并可与用户对话完善修改。

#### Scenario: 分析简历
- **WHEN** 用户上传简历后
- **THEN** AI 分析简历并提出改进建议

#### Scenario: 逐项优化
- **WHEN** 用户接受某项优化建议
- **THEN** 系统应用修改并展示更新后的版本
