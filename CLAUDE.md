# CLAUDE.md — Lineage

> 入口文件。开工前读完本文件 + 引用的 docs。不读完不动代码。

## What is Lineage?

开源 TypeScript 库：Text DSL → SVG，专注 genogram / ecomap / pedigree chart。
定位："Mermaid for relationship diagrams"。零 runtime dependency。

Owner: Victor (victor@mymap.ai)。商业目标：开源获分发 → MyMap.ai / ChatDiagram.com 集成变现。

---

## 文档体系（按需读，不默认全读）

| 文件 | 何时读 |
|------|--------|
| `docs/system/00-OVERVIEW.md` | **每次开工必读**——架构、目录、硬约束、质量 gate |
| `docs/system/01-GENOGRAM-STANDARD.md` | 做 genogram 相关代码时读——McGoldrick 符号、布局规则、DSL grammar、test cases |
| `docs/system/02-ECOMAP-STANDARD.md` | 做 ecomap 时读 |
| `docs/system/03-PEDIGREE-STANDARD.md` | 做 pedigree 时读 |
| `docs/impl/1.0-genogram-parser.md` | 实现 parser 时读——详细步骤 + tests + DoD |
| `docs/impl/1.1-genogram-symbols.md` | 实现 symbols 时读 |
| `docs/impl/1.2-genogram-layout.md` | 实现 layout 时读——**最难最重要**，7 步算法 + edge cases |
| `docs/impl/1.3-genogram-renderer.md` | 实现 renderer 时读——SVG 结构 + CSS class 参考 |
| `docs/impl/1.4-genogram-integration.md` | 串起 Phase 1 时读——e2e tests + build verification |
| `docs/impl/2.0-ecomap.md` | Phase 2 ecomap |
| `docs/impl/2.1-pedigree.md` | Phase 2 pedigree |
| `docs/impl/3.0-integrations.md` | Phase 3 browser/React/markdown/Obsidian |
| `docs/issues/` | 遇到 bug 或设计问题时，先查这里是否已有记录 |
| `src/core/types.ts` | **Types 是 spec。** 任何关于数据结构的疑问，查这个文件 |

---

## 执行协议

### 自主开发流程

1. **读 impl doc** — 开始一个新模块前，先读对应的 `docs/impl/` 文件
2. **写 tests FIRST** — 尤其是 layout（impl doc 里有 test 大纲）
3. **实现** — 按 impl doc 的步骤来
4. **过 quality gate** — `typecheck → test → lint → build`（详见 `docs/system/00-OVERVIEW.md`）
5. **更新 impl doc status** — 完成后把 Status 改为 `Implemented`
6. **进入下一个 impl** — 按编号顺序：1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 2.0 → ...

### 遇到问题时

1. 先查 `docs/issues/` 是否已有记录
2. 如果是新问题，创建 `docs/issues/XX-description.md` 记录
3. 如果是设计决策，在 impl doc 中记录 decision + rationale
4. 如果需要 Victor 确认，在 impl doc 中标注 `⚠️ NEEDS VICTOR INPUT`

### impl doc 进度追踪

每个 impl doc 有一个 `Status` 字段和 `Definition of Done` checklist。
- `Not started` → `In progress` → `Implemented`
- DoD checklist 中每完成一项打 `[x]`
- **不要同时开多个 impl**——完成一个再开下一个（除非 doc 明确说可以并行）

---

## 硬规矩（不可违反）

1. **零 runtime dependency** — 无 D3，无 dagre，无 parser generator。手写一切。
2. **Strict TypeScript** — 无 `any`，无未注释 `as`。
3. **语义 SVG** — `<title>` + `<desc>` accessibility，CSS class 可主题化，`data-*` 可交互。无 inline style（除嵌入 `<style>` block）。
4. **Test-first for layout** — layout 代码先写测试。
5. **标准合规** — 详见各 `docs/system/` 文件。
6. **用 `src/core/svg.ts` builder** — 不要拼接 raw SVG string。
7. **文件命名** — `src/diagrams/{type}/{module}.ts`，`tests/{type}/{module}.test.ts`

---

## Quick Reference

```bash
npm run typecheck   # TS 编译检查
npm run test        # Vitest
npm run lint        # ESLint
npm run build       # tsup → dist/
npm run dev         # tsup --watch
```

Pipeline: `Text → Parser → AST → Layout → LayoutResult → Renderer → SVG`

Types 定义在 `src/core/types.ts`。SVG builder 在 `src/core/svg.ts`。

当前优先级：**Phase 1 — Genogram**（impl 1.0 → 1.4）。
