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

### Requirement: 迭代生成（非一次性）
系统 SHALL 支持多次生成简历，每次生成后用户可继续对话修改，简历实时更新。

#### Scenario: 初次生成
- **WHEN** 对话信息满足必填字段要求
- **THEN** 系统生成简历预览，AI 询问"您看看这份简历是否满意？需要修改什么吗？"

#### Scenario: 用户要求修改
- **WHEN** 用户提出修改意见
- **THEN** AI 更新对应字段，重新生成简历预览

#### Scenario: 反复迭代
- **WHEN** 用户多次提出修改
- **THEN** 系统保持上下文，每次修改后更新预览，直到用户满意

### Requirement: 简历导出（@react-pdf/renderer）
系统 SHALL 使用 @react-pdf/renderer 作为主要 PDF 导出引擎，保留 HTML 打印作为 fallback。

#### Scenario: 导出 PDF
- **WHEN** 用户点击导出按钮
- **THEN** 系统通过 @react-pdf/renderer 生成原生 PDF 并触发保存对话框

#### Scenario: HTML 打印 fallback
- **WHEN** @react-pdf/renderer 导出失败
- **THEN** 系统自动降级到 HTML 浏览器打印方式

### Requirement: 简历实时预览
系统 SHALL 提供简历的实时预览功能，用户每次修改后预览自动更新。

#### Scenario: 预览更新
- **WHEN** 任何简历字段发生变化
- **THEN** 预览区域自动刷新显示最新版本
