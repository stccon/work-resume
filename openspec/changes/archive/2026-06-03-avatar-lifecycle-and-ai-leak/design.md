## Context

**当前实现快照**：

```
头像数据流（当前）
═════════════════════════════════════════════════════════════════════
   PDF 导入提取                ↓ dataURL
   用户上传                    ↓ dataURL
                               ▼
              localStorage["user-avatar"]       ← 全局单值
                               │
                               ▼
              composeDataWithAvatar()           ← 合成时塞回 personal.avatar
                               │
                       ┌───────┴───────┐
                       ▼               ▼
                 ResumePreview     PDF 导出
                  （正确用法）      （正确用法）

   AI prompt 流（当前）
═════════════════════════════════════════════════════════════════════
   resumeData.sections     ──→ JSON.stringify ──→  prompt  ──→  AI
        │                                                       │
        │   理论上不含 avatar                                     │
        │   但 AI 输出 JSON 时可能塞 avatar                       │
        ▼                                                       │
   tryDetectResumeJSON ◀──────────────────────────────────────┘
   （回写时无 stripping）
```

**约束**：

- 不能破坏 PDF 导出（依赖 `composedResumeData.personal.avatar` 注入）
- 不能破坏 PDF 导入的"自动提取头像"流程
- 老用户磁盘上的 `user-avatar` / `user-avatar-enabled` 必须能透明迁移
- 渲染层（`renderResumeBody`）已经按 `personal.avatar` 读，不应改动

## Goals / Non-Goals

**Goals:**

- AI prompt 永远不包含 base64 avatar 数据（纵深防御：进+出双向 strip）
- 头像数据与简历 1:1 绑定，跨简历切换时跟随
- 头像 UI 入口物理上靠近"简历名"，强化"这是这份简历的头像"的心智
- 历史用户零感知迁移（不需要重新上传）

**Non-Goals:**

- 不改变 PDF 导入时的头像自动提取逻辑
- 不改变渲染器（`resume-renderer.ts`）对 `personal.avatar` 的读取方式
- 不引入云端头像/CDN/外链——头像继续以 base64 dataURL 形式本地存储
- 不优化 base64 压缩比（已有 `payloadToDataUrl` 缩放到 400px，足够）
- 不改变 visualTheme 中 `avatar.defaultEnabled` / `v2Config.avatar` 的语义

## Decisions

### 决策 1：纵深防御——AI 上下文双向剥离

**选择**：在两个边界点都 strip 头像字段。

```
┌──────────────────────────────────────────────────────────────┐
│  入口 strip                                                   │
│  tryDetectResumeJSON(reply) → delete parsed.sections          │
│                                .personal?.avatar              │
│  ↑ 保证：AI 输出的 avatar 永远进不了 resumeData               │
│                                                              │
│  出口 strip                                                   │
│  distillation.ts 抽 helper：stripAvatar(sections)            │
│  buildFirstMessagePrompt / buildResumeContext /              │
│  buildRefinePrompt 在 stringify 前调用                       │
│  ↑ 保证：旧落盘数据/外部数据中已有的 avatar，也不会被发出     │
└──────────────────────────────────────────────────────────────┘
```

**为什么两道都做**：

- 只做入口 strip → 老数据（已落盘的 `personal.avatar`）仍会泄漏
- 只做出口 strip → resumeData 内部仍带脏字段，给未来代码留坑
- 双向做 → resumeData 保证纯净 + 出口仍兜底

**替代方案**：彻底改 `resumeData` 类型，把 `avatar` 移出 `personal` 到顶层独立字段。
**否决理由**：渲染器和 PDF 导出都按 `personal.avatar` 读，改动面大且收益边际。

### 决策 2：头像存储位置——electron-store 中的 map

**选择**：electron-store 新键 `avatars`，结构 `{ [resumeId]: { dataUrl, enabled } }`。

```
{
  "avatars": {
    "resume_1717000000_abc": { "dataUrl": "data:image/jpeg;base64,...", "enabled": true },
    "resume_1717000111_xyz": { "dataUrl": "data:image/jpeg;base64,...", "enabled": false }
  }
}
```

**为什么 electron-store 而非 localStorage**：

| 维度          | localStorage         | electron-store         |
|---------------|----------------------|------------------------|
| 容量配额      | 5-10MB（域共享）     | 无限（受磁盘约束）     |
| 多简历容量    | 易爆（base64 累加）  | OK                     |
| 一致性        | 与简历存储不同位置   | 与简历同 store         |
| 跨设备/备份   | 难                   | 文件级，便于备份       |

**为什么不直接放在 `SavedResume.data.sections.personal.avatar`**：

- 与决策 1 的"sections 不含 avatar"冲突
- 落盘的简历数据可能被分享/导出，把 base64 混在 sections 里污染数据语义

**替代方案**：每张头像单独存为文件（`resumes/avatars/<resumeId>.jpg`）。
**否决理由**：当前规模（最多 50 份简历，每张 ~50KB）单文件够用，多文件徒增 IO 复杂度和清理负担。如未来头像变大可再切换。

### 决策 3：迁移策略——首启迁移一次，然后删除旧 key

**步骤**：

```
启动时 (App.tsx useEffect init)
   │
   ▼
   旧 key 存在? (localStorage["user-avatar"])
   │
   ├─ 否 → 跳过
   │
   └─ 是 → 等待 list 加载完毕
            │
            ▼
            getLastActiveResume() 拿到上次活跃 id
            │
            ├─ 拿到 id  → avatars[id] = { dataUrl: 旧值, enabled: 旧 enabled ?? true }
            │             ↓
            │             删除 localStorage["user-avatar"]
            │             删除 localStorage["user-avatar-enabled"]
            │
            └─ 没有  →  保留 localStorage（用户还没创建过简历）
                       下次有简历后再迁移
```

**为什么不"复制到所有简历"**：用户已确认接受"绑到上次活跃简历"，且复制方案会让多份简历共享同一张头像，与本次改动初衷相悖。

**回滚策略**：如发现迁移有问题，可在 store 中保留 `migratedFrom: "v1.0.0-globalAvatar"` 元数据，用于诊断。但**不**保留旧 localStorage 数据（避免数据双份）。

### 决策 4：UI 合并形态——简历名胶囊变可点击 popover trigger

**选择**：

```
当前 header：
┌────────────────────────────────────────────────────────────────┐
│  AI 简历助手  [activeResume.title]  ……  [📷] [🎨] [新对话][导出]│
└────────────────────────────────────────────────────────────────┘

改造后：
┌────────────────────────────────────────────────────────────────┐
│  AI 简历助手  [👤 张三 - 通用简历 ▾]  ……      [🎨] [新对话][导出]│
└────────────────────────────────────────────────────────────────┘
                  ↑
       点击 → 展开 popover：
       ┌─────────────────────────────┐
       │ [大头像预览]                  │
       │ ─────────────────────────── │
       │ 📤 上传 / 更换头像           │
       │ 🗑  移除头像                 │
       │ ─────────────────────────── │
       │ 显示头像  [ON ⏺ ]            │ ← 从 VisualThemePicker 搬过来
       └─────────────────────────────┘
```

**新组件名**：`ResumeNamePill`（替代/吞并 `AvatarUploader`）。

**为什么吞并而非并列**：用户已确认"先合并试试"。合并后视觉密度更低，且把"头像"与"这份简历"的归属关系显性化。

**无头像时的形态**：胶囊显示通用的 👤 占位图标（小 avatar 区 + 名字），点击仍能进入上传流程。

### 决策 5：移除 VisualThemePicker 的头像开关

**原因**：

- 当前 `avatarEnabled` 由 VisualThemePicker 控制，但语义上 enabled 状态是"这张头像在简历里要不要显示"——和简历归属，与视觉主题无关
- UI 合并后开关有了更合理的归宿（ResumeNamePill popover 内）
- VisualThemePicker 专心做"视觉主题选择"，职责更单一

**接口收缩**：

```ts
// 删除这些 props
interface VisualThemePickerProps {
-  avatarEnabled: boolean
-  onAvatarEnabledChange: (enabled: boolean) => void
-  hasAvatar: boolean
}
```

## Risks / Trade-offs

**[R1] 迁移竞态**：用户第一次启动时同时点击"创建新简历"——可能先创建出新简历，比 `getLastActiveResume` 解析快，迁移目标变成新建空简历。
→ **缓解**：迁移逻辑放在 `init()` 的 `Promise.all` 之后、`selectResume` 之前；初始化阶段禁用"创建简历"按钮（用 loading 态）。

**[R2] PDF 导入冲突**：导入 PDF 时会自动提取头像并 `setUserAvatar`。改造后这一步必须改为 `setAvatarFor(newResumeId, dataUrl)`。漏改会导致导入后头像不显示。
→ **缓解**：PDF 导入流程的测试单独覆盖。

**[R3] 现存脏数据**：用户已有简历的 `sections.personal.avatar` 字段（如果存在）不会被自动清理，仍占磁盘空间。
→ **缓解**：迁移时遍历所有 `SavedResume.data.sections.personal.avatar` 一次性清理（可选；如果不做，由出口 strip 兜底）。建议做。

**[R4] AI 输出 JSON 时不按规矩 omit avatar**：纵深防御已覆盖。但如果 AI 在 `experience.achievements` 等字段里写了类似 base64 的长字符串呢？
→ **目前不防御**。理论可能但实际未观察到。如未来出现，可以加一道"字段值长度告警"，但不在本次范围内。

**[R5] electron-store 加密**：现有 store 用 `encryptionKey: "resume-ai-local"`。新增 avatars 键继承加密。base64 加密后体积会膨胀 ~30%——50 份 ×50KB ×1.3 = ~3MB，仍在可接受范围。

## Migration Plan

**Phase 1（同一次发布内完成）**：

1. 新增 IPC handler 和存储后端
2. App.tsx 启动时检测+迁移
3. UI 切换到 ResumeNamePill
4. 清理旧常量

**回滚**：本次改动是单向迁移。如需回滚，需要：
- 把 electron-store 中 `avatars["<lastActiveId>"].dataUrl` 写回 localStorage
- 还原 UI 到旧版

不计划做"双轨运行"——成本高于收益，本地应用回滚频率极低。

## Open Questions

- 是否同步清理现存 `SavedResume.data.sections.personal.avatar` 脏数据？（倾向 **是**，迁移时一次性扫一遍）
- ResumeNamePill 在"还没选择简历"或"未命名简历"状态下的形态？默认显示"未命名 + 占位 avatar"应该 OK，待 UI 落地时再确认。
