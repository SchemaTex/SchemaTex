# CLAUDE.md — Schematex

> 入口文件。开工前读完本文件 + 引用的 docs。不读完不动代码。

## What is Schematex?

**Tagline:**
> *Every diagram a doctor, engineer, or lawyer would actually use.*
> *Free. Fully open source. Made for AI.*

开源 TypeScript 库：Text DSL → SVG。20 diagram families — genogram / ecomap / pedigree / phylo / sociogram / timing / logic-gate / circuit / ladder / block / SLD / entity-structure / fishbone / decision tree / venn / timeline / …

**三大价值支柱：** (1) **Diagrams professionals actually use**（每种图对应真实发布标准：McGoldrick / IEC 61131-3 / IEEE 315 / Newick 等；医生/工程师/律师本来就在画，让他们在代码里也画对）(2) **Free & fully open source**（AGPL-3.0，无 D3/dagre/parser generator，KB 级 bundle）(3) **Made for AI**（DSL 为 LLM 生成而设计：CJK 引号、嵌套歧义、AI-readable 错误）。

**四大 domain cluster：** 👪 Relationships · ⚡ Electrical & Industrial · 🏢 Corporate/Legal · 🐟 Causality/Analysis。详见 `docs/reference/00-OVERVIEW.md`。

Owner: Victor (victor@mymap.ai)。商业目标：AGPL-3.0 + 商业授权双轨 → 开源获分发，MyMap.ai / ChatDiagram.com 集成变现（替换路径进行中）。

---

## 文档体系

### 公开（提交到 repo）

| 路径 | 内容 |
|------|------|
| `docs/reference/00-OVERVIEW.md` | **每次开工必读** — 架构、目录、硬约束、质量 gate |
| `docs/reference/01-GENOGRAM-STANDARD.md` | McGoldrick 符号、布局规则、DSL grammar、test cases |
| `docs/reference/02-ECOMAP-STANDARD.md` | Ecomap 标准 |
| `docs/reference/03-PEDIGREE-STANDARD.md` | Pedigree 标准 |
| `docs/reference/04-PHYLOGENETIC-STANDARD.md` | Newick/NHX、布局、clade 高亮 |
| `docs/reference/05-SOCIOGRAM-STANDARD.md` | Moreno sociometry、edge operators、force-directed |
| `docs/reference/06–12-*.md` | Timing / Logic / Circuit / Block / Ladder / SLD / Entity |
| `docs/reference/32-PERT-STANDARD.md` | PERT/CPM AON 标准、调度算法（forward/backward pass）、DSL grammar、test cases |
| `docs/issues/` | Bug/设计问题记录 |
| `src/core/types.ts` | **Types 是 spec。** 数据结构疑问查这里 |

### 私有（不提交，在 `../CoCEO/schematex/`）

| 路径 | 内容 |
|------|------|
| `../CoCEO/schematex/impl/*.md` | 实施步骤 + DoD checklist + AI 协作 artifacts |

做某模块前读 `../CoCEO/schematex/impl/X.Y-*.md`。

---

## 执行协议

### 自主开发流程

1. **读 impl doc** — `../CoCEO/schematex/impl/` 对应文件
2. **写 tests FIRST** — 尤其 layout
3. **实现** — 按 impl doc 步骤
4. **过 quality gate** — `typecheck → test → lint → build`
5. **更新 impl doc status** → `Implemented`

### 遇到问题时

1. 查 `docs/issues/` 是否已有记录
2. 新问题：创建 `docs/issues/XX-description.md`
3. 设计决策：在 impl doc 记录 decision + rationale
4. 需要 Victor 确认：impl doc 标注 `⚠️ NEEDS VICTOR INPUT`

---

## 硬规矩（不可违反）

1. **零 runtime dependency** — 无 D3，无 dagre，无 parser generator。手写一切。
2. **Strict TypeScript** — 无 `any`，无未注释 `as`。
3. **语义 SVG** — `<title>` + `<desc>`，CSS class 可主题化，`data-*` 可交互。无 inline style。
4. **Test-first for layout**。
5. **标准合规** — 详见各 `docs/reference/` 文件。
6. **用 `src/core/svg.ts` builder** — 不拼接 raw SVG string。
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

Types 在 `src/core/types.ts`。SVG builder 在 `src/core/svg.ts`。

已完成：Genogram, Ecomap, Pedigree, Phylo, Sociogram, Timing, Logic Gate, Circuit, Block, Ladder, SLD, Entity Structure, Decision Tree, ERD (crow's-foot v0.1; Chen/Barker deferred), Breadboard (v0.1; Fritzing-style stylized parts catalog, smooth Bézier wires), BPMN (v0.1; pools/lanes/events/gateways/flows, OMG BPMN 2.0.2 visual subset), FBD (v0.1; IEC 61131-3 §6.4 — boolean/timer/counter/comparison/math/selection blocks, inline expression notation, IEC distinctive symbols, type-colored wires), SFC (v0.1; IEC 61131-3 §6.5 — initial/normal steps, alt single-bar / sim double-bar branches, 11 action qualifiers with time literals, margin-jump arrows), Use Case (v0.1; UML 2.5.1 §18 — stick-figure/external-system actors, use-case ellipses with extension-point compartments, subject boundary, association/«include»/«extend»/generalization with tree-merged heads, multiplicity, custom stereotypes, PlantUML-aligned inline form, parser-side arrow-direction + metaclass validation), PRISMA (v0.1; PRISMA 2020 flow diagram, Page et al. BMJ 2021 — rigid four-row Identification → Screening → Eligibility → Included layout, single + dual pipeline with Y-junction merge, mandatory `n =` counts, exclusion side-boxes, optional previous-studies row, scoping-review/IPD vocabulary overlays, count-arithmetic validation, top-N reason aggregation, independent capsule stage bands + spanning column-group headers), PERT/CPM (v0.1; PMI PMBOK 7 + Moder 1983 activity-on-node — the engine *computes* the schedule: forward/backward pass → ES/EF/LS/LF, total slack, project duration, critical path; FS/SS/FF/SF dependencies with lag/lead, three-point estimation te=(O+4M+P)/6 + variance, milestone diamonds, optional Start/Finish sentinels, swimlanes via `lane:`, `layout: network` (default, longest-path layering) + `layout: timescaled` (x∝ES, width∝duration, time axis); house-style blue palette with red reserved as the critical-path accent), Sequence (v0.1; UML 2.5.1 §17 Interactions — lifelines with kind-specific heads (actor stick figure, Jacobson boundary/control/entity icons, database cylinder, classifier box) + `«stereotype»`/`<<stereotype>>` override; sync/async/reply/lost/found messages + self-messages; `+`/`-` activation bars with nesting; `*Target` create + `destroy`; **all 12** combined-fragment operators (alt/opt/loop/par/break/critical/seq/strict/neg/ignore/consider/assert) with arbitrary nesting; `ref` interaction-use frames; notes (over/left/right + spanning), `==` dividers, `state` invariants, `autonumber`; deterministic timeline with label-aware column spacing; CJK-quote labels; gates/coregion/time-duration-constraints deferred), Petri net (v0.1; Murata 1989 + ISO/IEC 15909-1 place/transition nets — the engine *computes the dynamics*: validates the bipartite structure, applies the `fire:` sequence to the initial marking, and highlights which transitions are *enabled* in the result; immediate-bar vs timed-box transitions (GSPN), weighted arcs, place capacity, source/sink + workflow-net / state-machine / marked-graph subclass detection, and the four arc types standard `->` / inhibitor `-o` / read `--` / reset `=>`; layered bipartite layout with cycle-removal back-edge routing in `lr`/`tb`; house-style blue body with green reserved for "enabled" and red for "inhibitor/dead", faithful black-and-white Murata textbook look under `monochrome`; coloured-token CPN inscriptions, reachability graphs + boundedness/liveness analysis, and PNML round-trip deferred)。
