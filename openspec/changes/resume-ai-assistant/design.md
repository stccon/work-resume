## Context

桌面简历 AI 助手，面向非技术用户。初期通过 opencode SDK 接入免费 LLM，后期可切换自建后端。Electron + React + Tailwind CSS 技术栈，所有逻辑在客户端完成（阶段1→阶段2）。

## Goals / Non-Goals

**Goals:**
- 开箱即用的桌面应用，无需用户安装配置或填写 API Key
- AI 对话驱动的简历生成流程，展示思考过程
- 模板驱动对话：模板字段决定 AI 提问内容
- 支持上传已有简历进行优化，并提取其视觉风格作为模板参考
- 模型可切换，支持用户自填 API Key
- 架构预留抽象层，未来可替换 LLM 后端
- 迭代优化循环：对话→保存→优化→再对话，持续改进简历直到用户满意
- 多用户支持（阶段2）：对话开始 AI 主动识别当前为谁做简历
- 对话信息持久化：仅提炼简历关键信息保存到用户数据目录，下次可复用

**Non-Goals:**
- 不实现协作功能（阶段2聚焦多用户而非协作）
- 不实现云端同步（本地存储优先）
- 不使用 opencode 的 agent/tool 系统，只当模型网关
- 不实现共享模板（多用户足够）

## Decisions

### 1. 三大目录结构
应用操作三个独立目录，职责分离：

```
work-resume/
├── templates/          ← 模板数据定义 (*.json)
│   ├── general.json
│   ├── technical.json
│   └── management.json
│
├── resumes/            ← 生成的简历文件 (PDF/DOCX)
│   └── {姓名}_{模板}_{日期}.pdf
│
└── userdata/           ← 每个用户的数据
    └── {用户名}/
        ├── profile.json         (结构化简历数据)
        ├── conversations/       (对话记录)
        │   └── {日期}.json
        ├── resume-draft.json    (当前简历草稿)
        └── preferences.json     (模板偏好、颜色设置等)
```

- `templates/` 和 `resumes/` 是全局的，`userdata/` 按用户分目录
- 早期单用户时 `userdata/default/` 工作，预留扩展接口

### 2. 迭代优化循环（死循环设计）
取代原有的线性"收集→生成→结束"流程，改为持续优化循环：

```
                ┌─────────────────────────────┐
                │     用户打开应用 / 新对话      │
                └─────────────┬───────────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │   AI 主动识别用户身份          │
                │   "你是给谁做简历？做什么岗位？" │
                └─────────────┬───────────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │   加载已有用户数据到上下文      │
                │   (profile.json 结构化摘要)    │
                └─────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               │                              │
               ▼                              ▼
     ┌──────────────────┐         ┌──────────────────┐
     │   AI 主动提问      │         │  用户主动输入/修改 │
     │  (模板字段驱动)    │         │  (自由对话)       │
     └────────┬─────────┘         └────────┬─────────┘
              │                            │
              └──────────────┬─────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  提炼简历关键信息  │
                   │  更新 profile    │
                   │  保存到 userdata │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  重新生成简历预览  │
                   │  (实时更新)       │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  用户反馈/要求修改 │
                   └────────┬─────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
        继续对话优化              用户满意 → 导出PDF
```

- 每次对话结束，关键信息提炼后写回 `userdata/{user}/profile.json`
- 下次对话自动加载摘要，不重来
- 用户数据量小（千字级别），token 消耗可控

### 3. AI 主动探测用户身份
对话开始时的识别流程：

```
用户打开应用
    │
    ▼
检查 userdata/ 下是否有已存在用户
    ├── 有: 列出已有用户让用户选择或确认
    └── 无: AI 主动问 "你想帮谁做简历？"
              │
              ▼
    用户回答 "帮我做" / "帮李四做"
              │
              ▼
    AI 确定用户标识 → 加载对应 userdata/{user}/
              │
              ▼
    继续: "你想做什么类型的岗位？"
          → 加载匹配模板
          → 开始对话循环
```

实现方式：对话开始前，系统端先获取 userdata 目录列表，通过 IPC 传给 AI 做上下文。

### 4. 模板系统分层（数据 + 视觉分离）
这是关键的架构升级。借鉴 JSON Resume + 业内最佳实践（Reactive Resume、Resumely、cvstack 等），分为两层：

```
┌─────────────────────────────────────────────────┐
│  Layer 1: 模板数据定义 (template JSON)            │
│                                                   │
│  general.json 定义:                               │
│  - sections: [personal, summary, experience, ...]  │
│  - fields: id, label, type, required, prompt       │
│  - 不包含任何样式信息                               │
│                                                   │
│  → 驱动 AI 对话："该问什么"                        │
├─────────────────────────────────────────────────┤
│  Layer 2: 模板视觉呈现 (React 模板组件)            │
│                                                   │
│  每个模板对应一个 React 组件:                       │
│  - templates/GeneralTemplate.tsx                   │
│  - templates/TechnicalTemplate.tsx                 │
│  - templates/ManagementTemplate.tsx                │
│                                                   │
│  使用 @react-pdf/renderer API:                     │
│  - 自定义字体、颜色、间距、布局                     │
│  - SVG 图标、分页控制                              │
│  - 可热插拔，新增模板只需加组件                     │
│                                                   │
│  → 控制"长什么样"                                  │
├─────────────────────────────────────────────────┤
│  Layer 3: 用户自定义覆盖                           │
│                                                   │
│  preferences.json 可覆盖:                          │
│  - accentColor: "#ff6363"                          │
│  - fontFamily: "Inter"                             │
│  - fontSize: "small" / "medium" / "large"          │
│  - layout: "single" / "two-column"                 │
└─────────────────────────────────────────────────┘
```

模板 JSON（Layer 1）和现有格式基本一致，但去掉样式负担。
新增的 React 模板组件（Layer 2）是纯前端组件，接收同一份数据输出不同视觉。
用户自定义（Layer 3）存储在 userdata/ 的 preferences.json 中。

### 5. PDF 渲染引擎：切换到 @react-pdf/renderer
当前使用的 `generateHTML()` + 浏览器打印方式替换为：

```
resume data → React 模板组件 → @react-pdf/renderer → 原生 PDF
                                │
                                ├─ 自定义字体注册
                                ├─ 精确的 flexbox 布局
                                ├─ SVG 图标支持
                                └─ 分页控制
```

在 Electron 中，`@react-pdf/renderer` 在渲染进程中直接调用，不经过 IPC。
保留 HTML 打印方式作为 PDF 导出的 fallback 选项。

### 6. 导入简历的样式提取
上传已有简历（PDF/Word）扩展为两个层面：

```
上传简历 PDF/Word
    │
    ├── [内容层] (已有)
    │   └─ AI 分析内容 → 提取结构化简历数据
    │
    └── [风格层] (新增)
        └─ LLM 分析视觉特征:
            ├─ 字体风格 (衬线/无衬线/等宽)
            ├─ 色彩方案 (主色/辅色/背景)
            ├─ 布局类型 (单栏/双栏/侧边栏)
            ├─ 密度 (紧凑/宽松)
            └─ 风格描述文字
                │
                ▼
        匹配现有关键参数:
        选出最接近的 React 模板
        自动设置 color/font/layout 参数
        → "青出于蓝" — 保留风格感觉，但用更好的排版引擎重制
```

注：PDF 的视觉样式信息可以程序化提取（字体名、大小、颜色、位置坐标），
但"设计意图"需要 LLM 理解并映射到模板参数。

### 7. 对话信息持久化策略
不是保存原始对话全文，而是提炼结构化摘要：

```
对话过程                                      userdata/{user}/
                                                
用户说 "我有10年前端经验" ────────→ 不单独保存
AI 追问 "用过哪些框架？"          不单独保存
用户说 "React, Vue, Angular" ────→ 不单独保存
用户说 "带过10人团队"  ──────────→ 不单独保存
                                      │
                                      ▼
对话结束 / AI 确认足够 ───────────→ profile.json 更新:
                                      {
                                        skills: { languages: "JS,TS",
                                                  frameworks: "React,Vue,Angular" },
                                        experience: [{ ... }],
                                        summary: "10年前端...带过10人团队"
                                      }
```

- `profile.json` 是结构化简历数据，每次对话结束后由 LLM 从对话中提炼更新
- `conversations/` 保存完整对话记录（可选，用于回溯），但上下文只加载结构化摘要
- 旧数据 + 新对话 = LLM 合并 → 新 profile.json
- 上限约 2000 token 的结构化数据，适合放入 LLM 上下文

### 8. Electron 主进程管理 opencode Server
通过 `@opencode-ai/sdk` 的 `createOpencode()` 在主进程拉起 Server，Render 进程通过 IPC 间接调用，不直接暴露网络端口给用户。

### 9. 对话抽象层隔离 opencode 依赖
```
┌─────────────────────────────────────────────┐
│  UI Layer (Renderer)                         │
│  └─ ChatStore (对话状态管理)                  │
│       └─ ChatAdapter (抽象接口)               │
│            ├─ OpencodeAdapter (阶段1)         │
│            └─ DirectApiAdapter (阶段2)        │
└─────────────────────────────────────────────┘
```
UI 只依赖 ChatAdapter 接口，切换底层实现不改 UI。

### 10. 模板即对话剧本（Layer 1 保持不变）
模板 JSON 定义所有字段及其属性（必填/选填、顺序、追问策略），对话引擎据此决定问什么。LLM 负责「怎么问」和「追问细节」，但不决定大方向。

### 11. 思考模式通过流式事件提取
opencode SDK 的 SSE 流包含多种事件类型，从中提取 LLM 的思考/推理内容，单独渲染在聊天界面中。

### 12. React + Tailwind CSS + Shadcn/ui
React 组件化开发，Tailwind 实现精美界面，Shadcn/ui 提供基础 UI 组件。

## 多用户时间线

```
阶段 1 (当前)              阶段 2 (目标)
───────────────           ───────────────
单用户                    多用户
userdata/default/         userdata/{user}/
无身份识别                 AI 主动识别用户
线性流程                   迭代循环
HTML 打印 PDF              @react-pdf/renderer
3 个模板 (纯 JSON)         N 个模板 (JSON + React 组件)
                         PDF 导入样式提取
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| opencode 免费模型停用或限流 | 对话抽象层预留切换能力，可快速切到自己后端 |
| opencode SDK API 变更 | 只使用 session.prompt() 等稳定接口，不依赖内部 API |
| Electron 打包体积过大 | 初期接受，优化阶段再拆减依赖 |
| 小白用户不熟悉"模型切换"概念 | 默认隐藏高级设置，仅暴露"切换模型"按钮 |
| @react-pdf/renderer 在 Electron 中的兼容性 | 保留 HTML 打印 fallback |
| PDF 样式提取精度不足 | LLM 视觉描述 + 手动微调参数，不追求 1:1 还原 |
| 多用户用户身份识别不够自然 | AI 主动提问 + 用户确认，非强制注册流程 |
