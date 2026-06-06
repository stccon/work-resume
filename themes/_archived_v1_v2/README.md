# Archived v1/v2 themes

This directory contains the 14 v1 (6) and v2 (8) visual themes that were active before the V3 design system. They are **not** registered in `themes/index.ts` and **not** shown in the VisualThemePicker.

## Why archived

The V3 design system enforces 8 strict design constraints (see `openspec/changes/v3-premium-themes/`):

1. Single type family (sans / serif / mono)
2. 7 color tokens max
3. 4 / 8px baseline grid
4. Single density choice
5. `hasAvatar` binary (no "optional" avatars)
6. Single section title rule
7. Single bullet + single tag style
8. Print-aware primitives (page-break, tabular-nums, han-latin spacing)

The archived themes are kept for two reasons:
- **Rollback** — if V3 themes need to be reverted, the JSON files are intact and can be re-imported
- **Reference** — useful for understanding what design decisions V3 corrects

## Layout

```
_archived_v1_v2/
├── v1/                  ← 6 first-generation themes
│   ├── elegant-blue.json
│   ├── graphite.json
│   ├── emerald-sidebar.json
│   ├── amber-header.json
│   ├── basalt.json
│   └── glacier.json
└── v2/                  ← 8 second-generation themes
    ├── v2-modern-pro.json
    ├── v2-editorial.json
    ├── v2-executive-sidebar.json
    ├── v2-tech-blueprint.json
    ├── v2-academic-serif.json
    ├── v2-warm-earth.json
    ├── v2-typst-monospace.json
    └── v2-minimal-mono.json
```

## How to roll back (not recommended)

1. Copy any JSON file back to `themes/`
2. Add an `import` line in `themes/index.ts`
3. Add to the `builtInThemes` array
4. Restart the app

The current V3 renderer does **not** support the v1/v2 schema (`sectionStyle: "underlined" | "colored-bg" | "minimal" | "card"`, `decorationStyle`, `headerStyle: "centered" | "left" | "colored-bar"`, `v2Config.*`, `series`, `family`). Re-importing v1/v2 themes requires restoring the legacy `renderV2CSS()` function from git history.
