## ADDED Requirements

### Requirement: 系统预置多个简历模板
系统 SHALL 预置至少 3 个不同风格的简历模板，覆盖常见职业场景。

#### Scenario: 查看预置模板
- **WHEN** 用户打开模板列表
- **THEN** 系统显示所有预置模板的预览和名称

### Requirement: 模板定义字段结构
每个模板 SHALL 定义其包含的简历字段（如姓名、工作经历、教育背景等），包括字段类型、是否必填、提问顺序和追问策略。

#### Scenario: 模板驱动对话
- **WHEN** 用户选择模板并开始对话
- **THEN** 系统根据模板字段定义，引导 AI 主动向用户收集对应信息

### Requirement: 模板可扩展
系统 SHALL 支持后续添加新模板，无需修改核心逻辑。

#### Scenario: 新增模板
- **WHEN** 开发者在模板目录添加新模板 JSON 文件
- **THEN** 系统自动识别并在模板列表中展示

### Requirement: 模板视觉呈现层
每个模板 SHALL 对应一个 React 组件，负责 JSON 数据到 PDF 的视觉渲染，实现数据与样式分离。

#### Scenario: 模板数据驱动对话
- **WHEN** 用户选择模板
- **THEN** AI 根据模板 JSON 的字段定义主动提问，收集简历信息

#### Scenario: 模板样式独立渲染
- **WHEN** 简历信息收集完毕
- **THEN** React 模板组件将结构化数据渲染为 PDF（@react-pdf/renderer），每个模板的布局、字体、颜色完全独立

### Requirement: 模板可由用户自定义视觉参数
系统 SHALL 允许用户在模板基础上调整颜色、字体、布局等视觉参数，并存为个人偏好。

#### Scenario: 调整颜色
- **WHEN** 用户在设置中修改主题色
- **THEN** 模板组件实时更新颜色，新颜色保存到 userdata/{user}/preferences.json

#### Scenario: 切换字体
- **WHEN** 用户选择不同字体方案
- **THEN** 模板组件使用新字体渲染，偏好持久化保存

### Requirement: 新增模板需同时提供 JSON + React 组件
系统 SHALL 要求新增模板时同时提供模板数据定义（JSON）和视觉呈现组件（React），两者缺一不可。

#### Scenario: 注册新模板
- **WHEN** 开发者添加新模板
- **THEN** 需要在 templates/ 目录放 JSON 文件，在组件注册表中注册对应的 React 组件
