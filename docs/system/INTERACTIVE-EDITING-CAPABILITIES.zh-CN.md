# Interactive Editing 能力说明

> 当前实现的 canonical truth · 2026-07-17 Pacific Time
> 范围：在 SVG preview 内直接编辑。即使某种图尚不支持 Canvas 编辑，用户仍然可以通过 DSL 源码编辑它。
>
> [English version / 英文版](./INTERACTIVE-EDITING-CAPABILITIES.md)

## 如何阅读这份文档

Canvas 编辑不是一个简单的“支持 / 不支持”功能。Schematex 把它拆成四种相互独立的能力：

1. **标题编辑** —— 双击用户在 DSL 中明确写下的 diagram title，精确替换对应的 DSL token。
2. **内容编辑** —— 双击可见的用户文字或结构化字段，精确替换对应的 DSL token。
3. **展示层拖拽** —— 移动一个拥有稳定语义 ID 的对象；位置以 `pin <id> x,y` 的形式保存在 `@overrides` 中。
4. **Native geometry 编辑** —— 移动领域专用的 handle；它会改写原始的日期、波形、坐标、插孔或尺寸 token，而不是新增 override。

“双击”既可以点击文字本身，也可以点击文字所属的 node/card。只要标题是 DSL 中明确写下的 authored title，它也可以自由拖拽。拖拽标题会写入 `pin @title x,y`；重命名标题则会改写原来的引号内容。

文档中的拖拽方向含义如下：

- **x/y** —— 可水平和垂直自由移动。
- **仅 x** —— 只能水平移动；垂直位置仍然表示层级或顺序。
- **仅 y** —— 只能垂直移动；水平位置仍然表示层级或顺序。
- **交叉轴** —— 从上到下布局时可沿 x 轴移动，从左到右布局时可沿 y 轴移动。
- **handle** —— 只有蓝色的 native geometry handle 可以移动；对象本身不是通用可拖拽 node。

## 当前已实现的引擎

| Diagram | 用户标题 | Canvas 文字 / 字段 | 位置编辑 | 连线与几何 | 重要限制 |
| --- | --- | --- | --- | --- | --- |
| Flowchart | 编辑 + x/y 拖拽 | Node label 和 edge label | Node：x/y，通过 `@overrides` 保存 | 相连 edge 在拖拽中实时跟随，drop 后重新路由 | 自由移动可能造成重叠；自动布局仍是初始状态 |
| State | 编辑 + x/y 拖拽 | State label 和 transition label | State：交叉轴，通过 `@overrides` 保存 | 正交 transition 保持连接并重新路由 | Pseudo state 和自动生成的 label 只读 |
| Sequence | 编辑 + x/y 拖拽 | Participant name 和 message text | Participant：仅 x，通过 `@overrides` 保存 | Message 保持水平并跟随 lifeline | Message 的 y 位置 / 顺序具有语义，不可拖拽 |
| Org chart | 编辑 + x/y 拖拽 | 人员 / card 名称 | Card：仅 x，通过 `@overrides` 保存 | 汇报线保持正交和连接 | 汇报层级具有语义，不能通过垂直拖拽改变 |
| Circuit · positional | 编辑 + x/y 拖拽 | 显式 component label 和 value | 拥有显式 ID 的 component：x/y，通过 `@overrides` 保存 | 用户定义的 wire 在 drop 后重新连接 | 自动生成的 wire/component ID 受保护；positional wire 不承诺在整个拖拽过程中完整实时路由 |
| Circuit · netlist | 编辑 + x/y 拖拽 | 显式 `label=` 和 `value=` 字段 | SPICE component ID：x/y，通过 `@overrides` 保存 | Routed net 实时跟随，drop 后重建为纯水平 / 垂直线段 | Component ID 和 net name 是 identity，不是可编辑 label |
| Floorplan | 编辑 + x/y 拖拽 | Room 和 furniture label | Furniture：native x/y；简单房间：东侧 / 南侧 / 角落尺寸 handle | 改写 furniture 坐标或 room `size WxH`，并重新校验平面图 | Room body 不可拖拽；L 形 / 多部分 room 不提供单一 bounding-box resize handle |
| Genogram | 编辑 + x/y 拖拽 | 用户写入的 person label | Person：仅 x，通过 `@overrides` 保存 | 伴侣、子女和 household connector 实时跟随 | 代际 y 位置具有语义，因此锁定 |
| Network | 编辑 + x/y 拖拽 | Device label 和用户定义的 link label | Device：x/y，通过 `@overrides` 保存 | Topology link 保持连接并实时重新路由 | Device ID 仍然是稳定的 identity token |
| Decision tree | 编辑 + x/y 拖拽 | Question 和 answer | 无 | Tree geometry 保持自动布局 | Node ID 由系统生成；branch order / hierarchy 决定位置 |
| Fishbone | 编辑 + x/y 拖拽 | Effect、category、cause 和 sub-cause 文字 | 无 | Bone geometry 保持自动布局 | Bone 的位置用来表达层级，不可独立拖拽 |
| ERD | 编辑 + x/y 拖拽 | Display alias、column name 和 column type | Table：交叉轴，通过 `@overrides` 保存 | Relationship 保持正交并重新路由 | 纯 table ID 和 reference 是 identity token；如需改名，应编辑 display alias |
| UML class | 编辑 + x/y 拖拽 | Display alias、member name 和 member type | Class box：交叉轴，通过 `@overrides` 保存 | Relationship 保持连接并重新路由 | 纯 classifier ID 是 identity token；stereotype 和 relationship field 尚未全部暴露 |
| P&ID | 编辑 + x/y 拖拽 | 仅标题 | Equipment 和 instrument：x/y，通过 `@overrides` 保存 | Process line 和 signal line 保持正交、实时跟随，并根据用户定义的 port 重新计算 | Equipment tag、line tag 和 instrument tag 尚不支持 Canvas 文字编辑 |
| FBD | 编辑 + x/y 拖拽 | 仅标题 | 具名 function-block instance：仅 y，通过 `@overrides` 保存 | IEC wire 保持连接，并从具名 port 重新路由 | 合成的 inline-expression block 和 instance identifier 只读 |
| Petri net | 编辑 + x/y 拖拽 | 仅标题 | Place/transition：交叉轴，通过 `@overrides` 保存 | Standard、inhibitor、read 和 reset arc 保持连接 | Place/transition ID、marking 和 arc weight 尚不支持 Canvas 文字编辑 |
| Timeline | 编辑 + x/y 拖拽 | 仅标题 | Date/range handle：仅 x，native DSL | Point 和 range handle 会改写 ISO date | Date handle 需要 proportional scale；equidistant/log 布局仍然自动排版 |
| Timing | 编辑 + x/y 拖拽 | 仅标题 | Wave boundary handle：仅 x，native DSL | 一个 boundary 会同时调整相邻的两段 waveform run | 只支持字面 wave token；`clock` 和 `rle` 缩写没有可精确映射的 boundary token |
| Breadboard | 编辑 + x/y 拖拽 | 仅标题 | 板上 component：x/y，对齐到 native DSL 插孔 | 相连 jumper wire 实时跟随 component pin | 侧面安装的 board/module 和独立 wire endpoint 不可拖拽 |
| Siteplan | 编辑 + x/y 拖拽 | 仅标题 | Polygon/path/line/dimension/callout 的 vertex 和 marker：native x/y | 精确改写使用 site unit 的坐标对 | 尚未实现整个 shape 的平移和任意 curve handle |
| Mindmap | 无独立标题；root text 可编辑 | 用户写入的 Markdown heading/item | 无 | Hierarchy 保持自动布局 | 插入内容后，自动生成的 node ID 不稳定，因此特意禁用持久化 pin |
| Ecomap | 编辑 + x/y 拖拽 | Person/system/relationship label | 稳定 person/system：x/y，通过 `@overrides` 保存 | Relationship 在拖拽中跟随，drop 后重算 endpoint | 自由移动可能产生重叠 |
| Pedigree | 编辑 + x/y 拖拽 | Person label | Individual：仅 x，通过 `@overrides` 保存 | 亲子/伴侣 connector 保持连接 | Generation y 位置具有语义，锁定 |
| Phylogenetic tree | 编辑 + x/y 拖拽 | Newick leaf/internal-clade token 和缩进树名称 | 无 | Tree topology 和 branch geometry 自动布局 | Branch length 暂无 geometry handle |
| Sociogram | 编辑 + x/y 拖拽 | Member 和 tie label | Member：x/y，通过 `@overrides` 保存 | Directed tie 在拖拽中跟随 | 自动分析产生的 badge 只读 |
| Logic gate | 编辑 + x/y 拖拽 | Signal/gate identity（所有引用原子重命名） | 稳定 gate：x/y，通过 `@overrides` 保存 | Wire endpoint 在拖拽中跟随 | Input/output port 本身不提供位置拖拽 |
| Block diagram | 编辑 + x/y 拖拽 | Block 和 signal label | 稳定 block：x/y，通过 `@overrides` 保存 | Signal 保持连接 | Summing junction 和生成 port 的编辑仍受保护 |
| Ladder | 编辑 + x/y 拖拽 | Operand、tag、name/comment | 蓝色 rung grip：仅 y，native source-block reorder | Drop 后完整 rung block 重新 parse/layout | 不是任意 element 的像素拖拽；wire/grid 仍自动布局 |
| SFC | 编辑 + x/y 拖拽 | Step/action/transition 文字 | Step：仅 x，通过 `@overrides` 保存 | Transition 保持连接 | Flow order/y 位置具有语义 |
| Single-line diagram | 编辑 + x/y 拖拽 | Equipment label、voltage、rating | Equipment：仅 x，通过 `@overrides` 保存 | Feeder 保持连接 | Hierarchy/depth 不可通过拖拽改变 |
| Entity diagram | 编辑 + x/y 拖拽 | Entity 和 ownership label/field | Entity：仅 x，通过 `@overrides` 保存 | Ownership line 保持连接 | Ownership level/y 位置锁定 |
| Venn | 编辑 + x/y 拖拽 | Set/region label 和 value | Set body：native center x/y；蓝色东侧 handle：native radius | 改写 normalized `at` / `radius`，overlap 随之重算 | 不提供破坏 set semantics 的通用 region 拖拽 |
| BPMN | 编辑 + x/y 拖拽 | Task/event/pool/lane 文字 | Flow node：仅 x，通过 `@overrides` 保存 | Sequence flow 保持连接 | Lane membership 和 flow order 仍由 DSL 决定 |
| Use case | 编辑 + x/y 拖拽 | Actor、use-case、system 文字 | 稳定 actor/use-case：x/y，通过 `@overrides` 保存 | Association 保持连接 | System membership 不因拖拽改变 |
| PRISMA | 编辑 + x/y 拖拽 | Authored stage label 和 count | 无 | Flow geometry 自动布局 | Computed reconciliation/warning 只读 |
| PERT | 编辑 + x/y 拖拽 | Task label 和 duration | Stable task：x/y，通过 `@overrides` 保存 | Dependency 保持连接 | Critical-path 计算结果只读 |
| Fault tree | 编辑 + x/y 拖拽 | Event label 和 probability | Event/gate：仅 x，通过 `@overrides` 保存 | Tree connector 保持连接 | Failure level/y 位置锁定；top probability 计算值只读 |
| Bow-tie | 编辑 + x/y 拖拽 | Hazard/threat/barrier/consequence 文字 | Stable item：仅 y，通过 `@overrides` 保存 | Connector 保持连接 | Left/right region semantics 不可交换 |
| Matrix | 编辑 + x/y 拖拽 | Label、cell、structured value | Coordinate-mode point：native x/y | 改写 normalized point coordinate | 非 coordinate mode 没有可安全拖拽的 geometry token |
| Event tree | 编辑 + x/y 拖拽 | Initiating event、function、branch/outcome 文字与概率 | 无 | Branch geometry 自动布局 | Branch order 是语义，不能像素拖拽 |
| FMEA | 编辑 + x/y 拖拽 | Item/function/mode/effect/cause/control 与 S/O/D rating | 无 | Table geometry 自动布局 | RPN 等计算值只读 |
| Reliability block diagram | 编辑 + x/y 拖拽 | Block label 和 reliability | Stable block：仅 x，通过 `@overrides` 保存 | Reliability path 保持连接 | Lane/series-parallel structure 仍由 DSL 决定 |
| Comparison | 编辑 + x/y 拖拽 | Column/cell/structured value | 无 | Table/bubble geometry 自动布局 | 当前 DSL 没有 coordinate mode，因此不伪造 native handle |
| Causal loop | 编辑 + x/y 拖拽 | Variable、polarity、link label | Stable variable：x/y，通过 `@overrides` 保存 | Causal link 在拖拽中跟随 | 含空格 ID 会以 quoted pin 保存 |
| Markov | 编辑 + x/y 拖拽 | State label 和 probability | Stable state：x/y，通过 `@overrides` 保存 | Transition/self-loop 保持连接 | 修改概率仍须满足每个 state 的概率约束 |
| Git graph | 编辑 + x/y 拖拽 | Commit/tag 文字；branch 声明和所有引用原子重命名 | 无 | Lane/merge geometry 自动布局 | Branch lane/order 具有语义，不提供拖拽 |
| EPC | 编辑 + x/y 拖拽 | Event/function/connector 文字 | Stable event/function：仅 x，通过 `@overrides` 保存 | Connector 保持连接 | Process order/y 位置锁定 |
| IDEF0 | 编辑 + x/y 拖拽 | Function/ICOM 文字 | Stable function：x/y，通过 `@overrides` 保存 | ICOM arrow 保持连接 | ICOM role/topology 仍由 DSL 决定 |
| Threat model | 编辑 + x/y 拖拽 | Element、flow、boundary/STRIDE 文字 | Stable element：x/y，通过 `@overrides` 保存 | Data flow 保持连接 | Trust-boundary membership 不因拖拽改变 |
| Welding symbol | 编辑 + x/y 拖拽 | Dimension、joint、tail/process 文字 | 无 | Standard geometry 固定 | Geometry 不能被随意变形；只有 authored field 可编辑 |
| Playbook | 编辑 + x/y 拖拽 | Player/play label | 显式 player 坐标和 route endpoint：native x/y | Route endpoint 在拖拽中实时跟随，drop 后重算 | Formation 生成的 player 和 named-route geometry 只读 |

Interactive Playground 中有 53 个 specimen，是因为 Flowchart、Circuit 和 Floorplan 都提供了不止一种代表性模式。上表覆盖全部 50 个独立引擎：其中 40 个支持安全的位置编辑，50 个全部至少有一个可以在 Canvas 上编辑的用户标题、label 或结构化字段。

## Canvas coverage 状态

原“计划中的安全编辑模式”30 个引擎已全部 ship。现在没有 render-only engine；区别只在于哪些引擎能安全地改位置。没有稳定 identity 或 native geometry token 的图仍然只开放文字/字段编辑，不会为了“看起来可拖”而写入不可靠坐标。

最初的 20 个引擎使用 parser-native source range。后续补齐的 30 个引擎中，如果旧 AST 还没有暴露 range，则通过共享 compatibility adapter，把 SVG 中确实来自用户源码的文字映射回 source token；每个已 ship specimen 都必须通过 edit → parse → render round-trip。计算结果或无法可靠匹配的输出仍保持只读。以后扩展单个 engine 时，仍优先补 parser-native range。

## 持久化和路由规则

### `@overrides` 只存储展示层信息

拥有稳定 ID 的展示层拖拽只会写入用户明确操作产生的位置差异：

```text
@overrides
pin R1 153.1,73.1
pin @title 42,18
```

没有被 pin 的对象继续使用自动布局。结构修改不需要同时维护一份完整坐标快照。

### Native handle 改写领域事实

日期、波形边界、breadboard 插孔、site 坐标、furniture 坐标和 room 尺寸本来就存在于语义 DSL 中。对应的 handle 会更新这些精确 token，不会创建可能与领域值冲突的视觉 pin。

### 连线永远不能“撒谎”

拖拽过程中，相连的线必须从移动中的对象实时预览。Drop 后，引擎必须根据语义 endpoint 或 port 重新计算连线。承诺正交路由的引擎，在重新渲染后只能输出水平和垂直线段；Circuit Netlist 已有专门的 regression test 保护这一 invariant。

## 交互和测试契约

只有当以下相关检查全部通过时，一个引擎才能在文档中被标记为 Canvas-editable：

- 每一个可编辑 glyph 或 handle 都必须精确映射到一个 `SceneItem`；
- 每一个文字目标都必须具有精确对应用户源码的 `SourceRange`，来源可以是 parser-native adapter，也可以是受保护的 compatibility mapper；
- 编辑只能改变预期 token，修改后的结果必须能够重新 parse；
- 拥有稳定 ID 的拖拽只能写入或更新一条 `@overrides` pin；
- Native-handle 拖拽必须改写 native token，不能创建 override；
- 连线在操作过程中必须保持连接，drop 后必须重新计算；
- 浏览器验证必须确认：可见 node/card 本身也能调用主编辑动作，不能只有狭小的文字 glyph 可点；
- 默认的源码编辑、渲染、share link 和 Monaco undo 必须继续可用。

## 相关文档

- 实施规格：`CoCEO/schematex/impl/3.0-interactive-editing.md`
- 最初的第一性原理分类与已完成的开发顺序：`docs/design/interactive-capability-audit.md`
- Interactive regression test：`tests/interactive/`
