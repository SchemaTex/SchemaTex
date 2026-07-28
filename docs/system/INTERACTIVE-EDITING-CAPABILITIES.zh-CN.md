# Interactive Editing 能力说明

> 当前实现的 canonical truth · 2026-07-18 Pacific Time
> 范围：在 SVG preview 内直接编辑。即使某种图尚不支持 Canvas 编辑，用户仍然可以通过 DSL 源码编辑它。
>
> [English version / 英文版](./INTERACTIVE-EDITING-CAPABILITIES.md)

## 安全边界

只有当某个 diagram 的 parser 和 renderer 能产出确定性的 scene metadata 时，Schematex 才会开启 Canvas 编辑。画面上出现一段文字并不够：每一个可编辑 label 都必须携带 parser 产出的精确 `SourceRange`，并且这个 range 必须指向真正要被替换的 authored token。

Schematex 不会通过“比较 SVG 文字和源码中的引号字符串”来猜 edit target。只要文字重复、renderer 按计算分数重排，或 config value 恰好和 label 相同，这种方法就存在 ambiguity。没有 native range 的 engine 仍可通过源码编辑，但不提供 Canvas handle。

当前版本有 **21 种 parser-native Canvas 可编辑图**，其中 **18 种**还具备安全的位置模型。其余 31 种图正常 render，也能在 DSL editor 中修改，但不会生成 Canvas handle。

## 能力词汇

1. **标题编辑** —— 双击 authored title，精确替换原 DSL token。标题也可以拖拽，展示位置会写入 `@overrides` 中的 `pin @title x,y`。
2. **内容编辑** —— 双击 authored label 或结构化字段，精确替换对应 token。
3. **展示层拖拽** —— 移动拥有稳定 semantic ID 的对象，把 `pin <id> x,y` delta 写入 `@overrides`。
4. **Native geometry 编辑** —— 拖拽领域专用 handle，改写已有的日期、波形、坐标、breadboard 插孔、furniture 位置或 room size token。

位置值含义：

- **x/y** —— 两个方向都能自由移动。
- **仅 x / 仅 y** —— 另一个轴表达层级或顺序，因此被锁定。
- **交叉轴** —— TB layout 沿 x 移动，LR layout 沿 y 移动。
- **native handle** —— handle 改写 domain geometry；对象本身不是通用自由节点。

## Parser-native engines

| Diagram | 用户标题 | Canvas 文字 / 字段 | 位置编辑 | 连线与几何 | 重要限制 |
| --- | --- | --- | --- | --- | --- |
| Flowchart | 编辑 + x/y 拖拽 | Node 和 edge label | Node：x/y，通过 `@overrides` | 相连 edge 实时预览，drop 后重新路由 | 自由移动可能造成重叠 |
| State | 编辑 + x/y 拖拽 | State 和 transition label | State：交叉轴，通过 `@overrides` | 正交 transition 保持连接 | Pseudo state 和生成 label 只读 |
| Sequence | 编辑 + x/y 拖拽 | Participant name 和 message | Participant：仅 x，通过 `@overrides` | Message 跟随 lifeline 并保持水平 | Message y/order 具有语义 |
| Org chart | 编辑 + x/y 拖拽 | 人员 / card 名称 | Card：仅 x，通过 `@overrides` | 汇报线保持正交 | 汇报深度具有语义 |
| Circuit · positional | 编辑 + x/y 拖拽 | 显式 component label 和 value | 显式 ID component：x/y，通过 `@overrides` | 用户定义 wire 在 drop 后重连 | 生成 ID 受保护 |
| Circuit · netlist | 编辑 + x/y 拖拽 | 显式 `label=` 和 `value=` | SPICE component ID：x/y，通过 `@overrides` | Net 实时跟随，rerender 后仍是正交线段 | Component ID 和 net name 是 identity |
| Floorplan | 编辑 + x/y 拖拽 | Room 和 furniture label | Furniture：native x/y；简单 room：size handle | 改写 furniture coordinate 或 `size WxH` | Room body 不拖；multipart room 无单一 resize box |
| Evacuation | 编辑 + x/y 拖拽 | Room 和 furniture label | Furniture：native x/y；简单 room：size handle | 复用 floorplan-native coordinate edit | Safety sign、route 和 compliance annotation 仍通过源码编辑 |
| Genogram | 编辑 + x/y 拖拽 | 显式 person label | Person：仅 x，通过 `@overrides` | 伴侣、子女和 household connector 实时跟随 | Generation y 被锁定 |
| Network | 编辑 + x/y 拖拽 | Device 和 authored link label | Device：x/y，通过 `@overrides` | Topology link 保持连接并重新路由 | Device ID 仍是 identity |
| Decision tree | 编辑 + x/y 拖拽 | Question 和 answer | 无 | Tree geometry 自动排版 | 生成 node ID 不允许 pin |
| Fishbone | 编辑 + x/y 拖拽 | Effect、category、cause、sub-cause | 无 | Bone geometry 自动排版 | 位置表达层级 |
| ERD | 编辑 + x/y 拖拽 | Alias、column name、column type | Table：交叉轴，通过 `@overrides` | Relationship 正交重路由 | Bare ID/reference 是 identity，应编辑 alias |
| UML class | 编辑 + x/y 拖拽 | Alias、member name、member type | Class：交叉轴，通过 `@overrides` | Relationship 保持连接 | Bare classifier ID 是 identity |
| P&ID | 编辑 + x/y 拖拽 | 仅标题 | Equipment/instrument：x/y，通过 `@overrides` | Process/signal line 保持正交 | Tag 暂不支持 Canvas 文字编辑 |
| FBD | 编辑 + x/y 拖拽 | 仅标题 | Named block：仅 y，通过 `@overrides` | IEC wire 保持连接 | Synthetic block 和 identifier 只读 |
| Petri net | 编辑 + x/y 拖拽 | 仅标题 | Place/transition：交叉轴，通过 `@overrides` | Arc 保持连接 | ID、marking、weight 只读 |
| Timeline | 编辑 + x/y 拖拽 | 仅标题 | Date/range handle：native 仅 x | 改写 authored date | Handle 要求 proportional scale |
| Timing | 编辑 + x/y 拖拽 | 仅标题 | Wave boundary：native 仅 x | 调整相邻 waveform run | 只有 literal wave token 有精确 handle |
| Breadboard | 编辑 + x/y 拖拽 | 仅标题 | 板上元件：native x/y，吸附插孔 | Jumper wire 跟随 component pin | 侧装元件和独立 wire endpoint 不拖 |
| Siteplan | 编辑 + x/y 拖拽 | 仅标题 | Vertex 和 marker：native x/y | 改写精确 coordinate pair | 暂不支持 whole-shape translation 和曲线 |
| Mindmap | Root text 是内容，不是独立 title | Authored Markdown heading/item | 无 | Hierarchy 自动排版 | 生成 ID 不稳定，因此禁用 pin |

Flowchart、Circuit 和 Floorplan 各有多个 Playground specimen，所以 test workspace 为这 21 种图提供了 24 个 interactive specimen。

## 仅源码编辑

以下 30 个 engine 当前即使收到 `scene: true`，也不会输出 scene 或 `data-sx-*` edit hook：

`ecomap`、`pedigree`、`phylo`、`sociogram`、`logic`、`blockdiagram`、`ladder`、`sld`、`entity`、`venn`、`matrix`、`bpmn`、`sfc`、`prisma`、`usecase`、`pert`、`faulttree`、`bowtie`、`eventtree`、`fmea`、`rbd`、`comparison`、`causalloop`、`markov`、`gitgraph`、`epc`、`idef0`、`threatmodel`、`welding` 和 `playbook`。

这只是 implementation backlog，不代表这些图的 authored text 天生不可编辑。以后会按 engine 逐个补 parser range，通过安全 gate 后再移入上表。

## Core 安全不变式

- 只有 `scene === true` 且 plugin 声明 native scene support 时，才会产生 `scene` 和 SVG `data-sx-*` attribute。默认 `render()` 不包含交互 attribute。
- 每一个可编辑 label 都有 parser 产出的 `SourceRange`、精确的 `expectedText` snapshot，以及生成它时的 source revision。
- `setLabel` 和 `setPosition` 在 core 内拒绝 stale revision；`setLabel` 落笔前还会检查每个 target range 是否仍包含预期 authored text。
- 没有 range 就没有 edit capability；UI 不会为 generated/unmatched output 编造 handle。
- Stable-ID drag 只写 `@overrides` 展示 delta；native geometry handle 直接改写原 domain token。
- 连线在拖拽中预览，drop 后从 semantic endpoint 重新计算；承诺 orthogonal routing 的 engine 在 rerender 后仍只包含水平 / 垂直线段。

`expectedText` 能把很多 stale-range 问题转成安全拒绝，但它本身无法区分两处完全相同的文字。正确性的根本来源仍是 parser-native range；护栏只是 defense in depth。

## 新 engine 的迁移 gate

每个 engine 单独做一个可 review 的迁移，必须同时交付：

1. 所有对外宣称可编辑 token 的 parser-produced range；
2. 只在 `scene === true` 下出现的 renderer scene item 和 SVG hook；
3. default render zero-diff coverage；
4. edit → parse → render round-trip test；
5. 对会按计算结果排序的 engine，加入“重复文字 + render order 与 source order 不同”的定向测试；
6. 可见 glyph/card 和每个允许 drag axis 的 browser coverage。

FMEA、Pugh comparison、fault tree、RBD 在开启 Canvas 编辑之前，尤其必须覆盖风险/分数排序下的重复文字案例。

## Public APIs

Typed registry 位于 `src/core/interactive-capabilities.ts`，并从 `schematex` 导出。对 source-only engine 调用 `getInteractiveCapabilities(type)` 会得到空 `text` 和 `position: "none"`；`INTERACTIVE_CAPABILITIES` 本身只包含已 ship 的 21 种 native diagram type。

受控 React editor 从 `schematex/react` 导出；低层 DOM adapter 位于 `schematex/interactive`。AI 和 MCP 调用方应使用带 revision guard 的 `inspectDiagram` → `applyDiagramEdits` 流程，不应自己构造 offset。

## 相关文档

- 实施规格：`CoCEO/schematex/impl/3.0-interactive-editing.md`
- 第一性原理分类与迁移顺序：`docs/design/interactive-capability-audit.md`
- 回归测试：`tests/interactive/`
