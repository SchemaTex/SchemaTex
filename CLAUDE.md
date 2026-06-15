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
| `docs/reference/35-NETWORK-STANDARD.md` | Network topology（IT/CCTV）标准 — Cisco-convention icons、设备/链路/端口词汇、8 layout modes、boundary 系统、validation |
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

已完成：Genogram, Ecomap, Pedigree, Phylo, Sociogram, Timing, Logic Gate, Circuit, Block, Ladder, SLD, Entity Structure, Decision Tree, ERD (crow's-foot v0.1; Chen/Barker deferred), Breadboard (v0.1; Fritzing-style stylized parts catalog, smooth Bézier wires), BPMN (v0.1; pools/lanes/events/gateways/flows, OMG BPMN 2.0.2 visual subset), FBD (v0.1; IEC 61131-3 §6.4 — boolean/timer/counter/comparison/math/selection blocks, inline expression notation, IEC distinctive symbols, type-colored wires), SFC (v0.1; IEC 61131-3 §6.5 — initial/normal steps, alt single-bar / sim double-bar branches, 11 action qualifiers with time literals, margin-jump arrows), Use Case (v0.1; UML 2.5.1 §18 — stick-figure/external-system actors, use-case ellipses with extension-point compartments, subject boundary, association/«include»/«extend»/generalization with tree-merged heads, multiplicity, custom stereotypes, PlantUML-aligned inline form, parser-side arrow-direction + metaclass validation), PRISMA (v0.1; PRISMA 2020 flow diagram, Page et al. BMJ 2021 — rigid four-row Identification → Screening → Eligibility → Included layout, single + dual pipeline with Y-junction merge, mandatory `n =` counts, exclusion side-boxes, optional previous-studies row, scoping-review/IPD vocabulary overlays, count-arithmetic validation, top-N reason aggregation, independent capsule stage bands + spanning column-group headers), PERT/CPM (v0.1; PMI PMBOK 7 + Moder 1983 activity-on-node — the engine *computes* the schedule: forward/backward pass → ES/EF/LS/LF, total slack, project duration, critical path; FS/SS/FF/SF dependencies with lag/lead, three-point estimation te=(O+4M+P)/6 + variance, milestone diamonds, optional Start/Finish sentinels, swimlanes via `lane:`, `layout: network` (default, longest-path layering) + `layout: timescaled` (x∝ES, width∝duration, time axis) + **`gantt`/`layout: gantt`** (calendar Gantt: bars placed from the computed ES/EF — type deps not dates, Mermaid-can't-compute-critical-path is the wedge; `start:` date axis, `calendar: continuous|5day`, `lane:` sections, `progress:`, `milestone`, `today:` marker, slack annotated on off-path bars; days-from-civil integer calendar, zero-dep); house-style blue palette with red reserved as the critical-path accent), Sequence (v0.1; UML 2.5.1 §17 Interactions — lifelines with kind-specific heads (actor stick figure, Jacobson boundary/control/entity icons, database cylinder, classifier box) + `«stereotype»`/`<<stereotype>>` override; sync/async/reply/lost/found messages + self-messages; `+`/`-` activation bars with nesting; `*Target` create + `destroy`; **all 12** combined-fragment operators (alt/opt/loop/par/break/critical/seq/strict/neg/ignore/consider/assert) with arbitrary nesting; `ref` interaction-use frames; notes (over/left/right + spanning), `==` dividers, `state` invariants, `autonumber`; deterministic timeline with label-aware column spacing; CJK-quote labels; gates/coregion/time-duration-constraints deferred), Petri net (v0.1; Murata 1989 + ISO/IEC 15909-1 place/transition nets — the engine *computes the dynamics*: validates the bipartite structure, applies the `fire:` sequence to the initial marking, and highlights which transitions are *enabled* in the result; immediate-bar vs timed-box transitions (GSPN), weighted arcs, place capacity, source/sink + workflow-net / state-machine / marked-graph subclass detection, and the four arc types standard `->` / inhibitor `-o` / read `--` / reset `=>`; layered bipartite layout with cycle-removal back-edge routing in `lr`/`tb`; house-style blue body with green reserved for "enabled" and red for "inhibitor/dead", faithful black-and-white Murata textbook look under `monochrome`; coloured-token CPN inscriptions, reachability graphs + boundedness/liveness analysis, and PNML round-trip deferred), Network topology (v0.1; IT / CCTV infrastructure diagrams — de-facto Cisco-convention icon silhouettes redrawn as original line-art (no central Icon interface; own `symbols.ts`), ~30 device kinds across infra / endpoints / **full CCTV cluster** (camera fixed/bullet/dome/ptz/turret, NVR/DVR, PoE switch, encoder, monitor) / clouds; typed annotated links copper/fiber/wireless/serial/PoE/VPN/LAG carrying trunk-access mode, VLAN, speed, near>far ports; nested boundaries site/rack (solid) + subnet/VLAN/zone/DMZ (dashed tinted, C4-style union+padding); 8 `layout:` modes tiered (tier banding) / tree / star / ring / bus / mesh / spine-leaf (auto-meshes spine↔leaf) / manual; **structural differentiator** — never silently drops a device/port/link (the P0 raw-Mermaid failure), validates duplicate-id, unknown-kind-with-suggestion, undeclared-ref, VLAN range 1–4094, and device-IP-in-subnet-CIDR; single-VLAN link tinting skips reserved alarm-red; `NetworkTokens` coloured-house theme (network-blue bodies, fiber-orange/PoE-green/dashed-wireless) with monochrome line-style fallback + dark; live SNMP/LLDP discovery import, rack-elevation view, L3 path computation, and SPOF analysis deferred), UML Class (v0.1; UML 2.5.1 §9–§11 — five classifier kinds (class/interface/enum/datatype/primitive), members with visibility `+ - # ~` / static / abstract / derived / multiplicity / defaults / properties, all six relationship kinds with standard-correct adornments (hollow triangle→parent, filled/hollow diamond at composite/aggregate, open arrow→target, dashed dependency/realization), **generalization-driven Sugiyama layout** with dummy-node edge routing (connectors never cross a box) + **tree-merged inheritance heads** (N children share one trunk + one triangle); **namespaces/packages** `namespace A.B.C { }` as nested C4-style containment frames with dot-notation auto-creation + package-clustering layout pass; Mermaid `classDiagram` compatibility — glyph aliases, tilde-generics `List~T~`→`List<T>`, single-line `Class : +member` / `Class : <<iface>>`, member classifiers `*`/`$`, space-return-type, single-line class bodies; deferred: association classes, parameterised-classifier box, lollipop/ports, notes, tabbed-folder package glyph), Fault Tree (v0.1; NUREG-0492 / IEC 61025 — opens the **Risk & Reliability** cluster; the engine *computes* the answer via **MOCUS** (Fussell-Vesely 1972): minimal cut sets with idempotence + absorption (repeated/shared events handled correctly) + top-event probability (`prob: rare|mcub|exact`, inclusion-exclusion de-dupes shared events), highlighting cut sets in red and single points of failure in the strongest red; events top/intermediate rectangles · basic circles w/ `p:` · undeveloped diamonds · house `state:0|1` · conditioning ellipses; gates AND dome · OR/XOR shield · VOTING k/n · INHIBIT hexagon · PAND order; flat declaration wired by id (DAG-friendly, keyword `faulttree`/`fta`); deterministic tidy top-down layout w/ content-sized boxes + duplicated shared leaves; validation: single-top / undefined-ref / cycle / prob-range / voting-bounds / conditioning-placement; deferred: dynamic fault trees (SPARE/FDEP/SEQ), non-coherent NOT/NAND/NOR, importance measures, BDD quantification, multi-page transfers), Bowtie (v0.1; CCPS / Energy Institute 2018 + IEC 31010 §B.4.6 + ICAO Doc 9859 — sibling of Fault Tree in the **Risk & Reliability** cluster; the qualitative integrating picture of barrier-based risk management: a central **top event** knot with **threats** fanning in through preventative-barrier chains (left) and **consequences** fanning out through mitigative-barrier chains (right), shaped like a bow tie; full element vocab — `hazard` header · `topevent` green-disc knot · `threat` orange · `prevent`/`mitigate` grey barriers (declaration-order outer→inner) · `consequence` red · `escalation` factor amber dropping below the barrier it degrades · escalation-factor `barrier`; the differentiator is **not** computation (no probability rollup — that's Fault Tree's job) but a **rigid correct-by-construction symmetric band layout** no general tool produces + **structural validation of the CCPS/EI barrier rule set** (every threat/consequence reaches the knot through ≥1 barrier, every escalation attaches to a named barrier — violations rejected, not silently drawn); indentation-structured DSL mirroring the CCPS 7-step build, CJK quotes; `BowtieTokens` BowTieXP/bowtiemaster colour scheme in `default`, shape/border-based `monochrome` for regulator print, Catppuccin `dark`; deferred: barrier-effectiveness/LOPA quantification, barrier types/categories, FTA/ETA drill-down links, multi-hazard bowtie books, per-barrier accountability metadata), Floor plan (v0.1; Architectural Graphic Standards + US NCS v6 + banquet-industry capacity conventions — opens the **Architecture & Space** cluster; the highest-volume professional request with no text-DSL engine anywhere (CD 90-day data: classroom 31% / event 23% / residential 17% / commercial 11%); rooms with real dimensions → poché walls with **automatic shared-wall merging**, **L/T/U rooms** as rect unions via `extend` (mirrors how pros measure: split into rectangles, sum — validated as the LLM-ergonomic choice vs polygon vertices), doors single/double/sliding/pocket/bifold with quarter-arc swings hung by `between A B` shared-wall resolution, windows fixed/sliding/casement/bay, **stairs straight/L/U/spiral** per drafting convention (0.28 m treads, UP arrow from lowest tread, 45° zigzag cut-plane break line, dashed treads beyond), **93-symbol furniture catalog** across residential/kitchen-bath/classroom-office/event-banquet/retail-warehouse/salon-gym/site-outdoor (`tree`/`car` for site plans) with **auto-seating** (round-table-8 = 8 countable chairs; dining/banquet/conference seat both long edges @0.65 m; manicure-table seats client+tech; row-chairs theater strips @0.55 m) and underlay surfaces (rug/dance-floor/yoga-mat/counter/island/wall-cabinet/range-hood/ceiling-fan never collide); 18 worked examples spanning residential → banquet/cinema/office/lab/site-plan/retail/warehouse/salon/gym; engine computes room areas + exterior dimension strings (architectural slash ticks, ft′in″ under `unit ft`) and validates the errors LLMs actually make — room overlap, door between non-adjacent rooms, furniture outside its room/L-notch (errors) + **oriented-box SAT collision with chair-ring envelopes** (warnings, exact under rotation); arrays `grid`/`row`/`arc` with row-major `count` truncation; north compass; light-only theming (paper notation — `dark` resolves to default); deferred: polygon-vertex rooms (45° fast-follow, curved walls Pro-tier rarity per RPLAN evidence), multi-floor linking, electrical overlay, auto-layout from adjacency), Sports playbook (v0.1; opens the **Sports & Tactics** cluster; coach's tactics board from one paragraph of text for **football / basketball / soccer**, each a `SportModule` sharing parser/layout/renderer but owning its coordinate model (yards y-up / feet NBA half-court / metres IFAB pitch), formation+set roster, named-route + landmark resolution, field markings, and legend; baselines AFCA X&O + numbered route tree (football), FIBA/NBA half-court + coaching legend (basketball), IFAB Law 1 pitch + tactics legend (soccer); the cross-sport insight is that **the pass-vs-run line convention is inverted between sports** (bball pass=dashed/cut=solid; soccer pass=solid/run=dashed) and is honoured per sport with a matching legend; football `route`(route tree)/`run`/`handoff`/`pull`/`block` on a yard field with hashes + end zone + goalposts (`goal N`), basketball `pass`/`cut`/`dribble`/`screen` to rim/elbow/wing/corner landmarks on **light maple hardwood (never green)**, soccer `pass`/`run`/`dribble`/`shot` on a striped pitch with penalty areas + arcs + corner arcs; shared renderer frames every surface with an out-of-bounds surround + boundary so nothing bleeds off-canvas; `defense` overlays cover-shells / man-zone / press lines; validates unknown sport/formation/defense/route + undeclared player refs; default/monochrome/dark theming with **soccer daylight-only** (dark→default); 15 worked examples (5 per sport); deferred: more sports, animation, full defensive fits, set-piece libraries, pressing-trigger annotations), Reliability Block Diagram (v0.1; IEC 61078:2016 — fifth member of the **Risk & Reliability** cluster, the success-space dual of Fault Tree; the engine *computes the answer*: reduces brace-nested success logic to **system reliability** (∏ for `series`, 1−∏(1−Rᵢ) for `parallel`, exact 2ⁿ-state enumeration for `kofn k/n`, n≤18 else parallel-bound), derives the **Birnbaum reliability importance** Iᴮ(i)=R_sys(Rᵢ=1)−R_sys(Rᵢ=0) of every block (highest = improvement target, green accent), and flags **single points of failure** (R_sys(Rᵢ=0)=0, red border) — a non-redundant series block is always SPOF; DSL `block ID "Label" R=0.99` (also `p=0.01` failure prob / `R=99%` / bare number), bare top-level list = implicit series, CJK quotes; recursive bounding-box left-to-right layout (series chain wired end-to-end, parallel/kofn on rails fanning split→join, input/output terminals, `k/n` label at join); high reliabilities keep their nines (never rounded to "1"); shared `ReliabilityTokens` palette (neutral blocks, blue numerals, red SPOF) with monochrome border-weight fallback + dark; validation: k clamped 1..n, R clamped 0..1, duplicate-id, missing-R → `n/a` (no invented number); 5 examples (redundant server / 1oo2 dual-channel / data-center Tier III / IEC 61511 SIF / fly-by-wire); deferred: time-dependent R(t)/Weibull, repairable availability w/ MTTR, cold/warm standby + switch, common-cause β-factor, importance measures beyond Birnbaum, RBD↔fault-tree conversion)。
