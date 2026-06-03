## MODIFIED Requirements

### Requirement: 简历内容模板包含业界顶尖标准字段

系统 SHALL 在 `templates/general.json` 中定义以下 section 及其字段，按 LinkedIn / Resume.io / BeamJobs / 超级简历 共识：

| Section | 字段 | 说明 |
|---|---|---|
| **personal** | name, title, email, phone, location, linkedin, github | 个人信息 |
| **summary** | summary | 个人简介（80-150 字） |
| **highlights** | highlights | 个人优势/核心竞争力（textarea） |
| **skills** | skills, languages, frameworks, databases, cloud | 专业技能 |
| **experience**（多 entry） | company, position, location, startDate, endDate, achievements, techStack, teamSize, responsibilities | 工作经历 |
| **projects**（多 entry） | name, role, startDate, endDate, description, techStack, link, highlights | 项目经历（独立 section） |
| **education**（多 entry） | school, major, degree, startDate, endDate, gpa, honors, coursework, location | 教育背景 |
| **certifications** | certifications | 证书与培训 |
| **awards** | awards | 荣誉奖项 |

#### Scenario: 模板驱动 AI 对话
- **WHEN** 用户开始对话
- **THEN** AI 上下文包含上述全部 section 和字段
- **AND** AI 主动询问缺失的关键字段

#### Scenario: 模板可扩展
- **WHEN** 开发者修改 `general.json` 增加 section 或字段
- **THEN** 系统自动将新字段加入 AI 上下文和渲染管线

### Requirement: Section 顺序按业界资深者视角

系统 SHALL 按以下顺序渲染 section（资深者视角，LinkedIn / BeamJobs 共识）：

1. personal
2. summary
3. highlights
4. skills
5. experience
6. projects
7. education
8. certifications
9. awards

#### Scenario: 单栏布局渲染顺序
- **WHEN** 用户使用单栏布局的视觉主题
- **THEN** section 按上述顺序自上而下渲染

#### Scenario: 双栏布局分配
- **WHEN** 用户使用双栏布局的视觉主题
- **THEN** 侧栏包含 personal、summary、highlights、skills
- **AND** 主栏包含 experience、projects、education、certifications、awards

### Requirement: 多 entry section 独立编号

系统 SHALL 对 `experience`、`projects`、`education` 等多 entry section 使用 `entryN_xxx` 扁平存储格式。

#### Scenario: 多条工作经历
- **WHEN** 用户有 2 段工作经历
- **THEN** 数据存储为 `entry0_company`, `entry0_position`, ..., `entry1_company`, `entry1_position`, ...
- **AND** 渲染器按 `entryN_xxx` 前缀正确分组为多个 entry

#### Scenario: 多条项目经历
- **WHEN** 用户有 3 段项目经历
- **THEN** 数据存储为 `entry0_name`, `entry0_role`, ..., `entry1_name`, ..., `entry2_name`, ...
- **AND** 渲染器正确切分并按时间倒序展示

### Requirement: 教育字段采用业界标准命名

系统 SHALL 使用业界标准的教育字段命名：
- `startDate`（入学时间，格式 YYYY.MM）
- `endDate`（毕业时间，格式 YYYY.MM）
- `gpa`（GPA/排名）
- `honors`（荣誉奖项）
- `coursework`（核心课程）
- `location`（学校地点）

**注意**：原 `gradYear` 字段已被 `endDate` 替代。**项目未上线，无历史数据兼容问题**。

#### Scenario: 教育 entry 完整字段
- **WHEN** 用户填写教育经历
- **THEN** 包含 startDate、endDate、gpa、honors、coursework、location 等可选字段
- **AND** 渲染时所有已填写字段正确显示

### Requirement: 视觉模板与内容模板解耦（保留行为）

系统 SHALL 维持现有的视觉模板系统（`VisualThemePicker`、14+ 内置主题、主题切换）完全不变。视觉模板仅影响渲染样式，不影响内容数据。

#### Scenario: 切换视觉主题不影响内容
- **WHEN** 用户在 `VisualThemePicker` 中切换主题
- **THEN** 仅渲染样式变化
- **AND** 内容数据（`ResumeData`）完全不变

## REMOVED Requirements

### Requirement: 教育字段使用 `gradYear`（毕业年份）作为毕业时间
**Reason**: 业界标准使用 `endDate`（毕业时间，格式 YYYY.MM）以提供更精确的时间信息

**Migration**: 项目未上线，无历史数据迁移需求
