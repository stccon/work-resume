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

### Requirement: 上传简历视觉样式提取
系统 SHALL 在用户上传简历时，除了提取内容，还分析其视觉风格（字体、颜色、布局等），可用于新简历的样式参考。

#### Scenario: 提取风格参数
- **WHEN** 用户上传 PDF 简历
- **THEN** 系统提取视觉元数据（字体名、大小、颜色、坐标、布局类型）交给 LLM 分析

#### Scenario: LLM 风格描述
- **WHEN** 视觉元数据提取完成
- **THEN** LLM 输出结构化风格描述（font_family、accent_color、layout_style、density 等）

#### Scenario: 风格匹配模板
- **WHEN** 用户选择"使用此风格创建新简历"
- **THEN** 系统根据风格描述自动选择最匹配的 React 模板并设置对应参数

### Requirement: 保留手动微调
系统 SHALL 在自动套用风格后保留用户手动调整参数的能力。

#### Scenario: 手动调色
- **WHEN** 用户对自动匹配的颜色不满意
- **THEN** 用户可在偏好设置中手动修改颜色/字体，修改保存到 preferences.json
