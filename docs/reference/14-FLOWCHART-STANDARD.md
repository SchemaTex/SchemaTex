# 14 — Flowchart Standard Reference

*通用 process / decision / architecture / data-pipeline flowchart。设计目标：完全替代 Mermaid flowchart 作为 ChatDiagram 的默认渲染引擎，同时修正 Mermaid 在美学一致性、长边路由、subgraph 嵌套、label 定位上的缺陷。*

> **非目标（Non-goal）：Mermaid 1:1 语法兼容。** Schematex DSL 借鉴 Mermaid 的 arrow 语法（`-->`、`---`、`-.->`）和 direction keyword（`TD/LR`）只是为了降低 LLM 学习成本和人类迁移成本，但**不保证 1:1 兼容**，也不提供 `mermaid2schematex` 转译器。ChatDiagram 侧直接改 prompt 让 LLM 输出 Schematex DSL 即可，无需转译层。这简化了 scope，砍掉原 M4 milestone。

> **References:**
> - **ISO 5807:1985** *Information processing — Documentation symbols and conventions for data, program and system flowcharts, program network charts and system resources charts* — 国际流程图符号标准（retired 但仍是事实基准）
> - **ANSI X3.5-1970** *Flowchart Symbols and Their Usage in Information Processing* — 北美早期标准，规定 rect / diamond / parallelogram / document 等经典符号语义
> - **BPMN 2.0 (OMG 2011)** — Business Process Model and Notation，与 flowchart 重叠的部分（start/end/gateway/task 符号）
> - **Sugiyama, K. et al. (1981)** *Methods for visual understanding of hierarchical system structures*. IEEE Trans. Sys, Man & Cyber. — 分层 DAG 布局的原始算法
> - **Gansner, E. et al. (1993)** *A technique for drawing directed graphs* (Graphviz dot). IEEE TSE — dot 的 layered layout 工业实现
> - **Brandes, U. & Köpf, B. (2001)** *Fast and Simple Horizontal Coordinate Assignment*. Graph Drawing — Sugiyama 第 4 phase 的标准算法
> - **Eiglsperger, M. et al. (2005)** *An Efficient Implementation of Sugiyama's Algorithm for Layered Graph Drawing* — ELK (Eclipse Layout Kernel) 的理论基础
> - **Mermaid Flowchart Syntax Docs** — [mermaid.js.org/syntax/flowchart.html](https://mermaid.js.org/syntax/flowchart.html) — de-facto DSL 标准
> - **GoJS Layered Digraph Layout docs** — 商业参考实现
> - **mxGraph (draw.io)** hierarchical layout — 开源参考实现
>
> 注：flowchart 无单一权威 ISO 标准（ISO 5807 已废弃），本 standard 综合上述来源 + Mermaid 的事实 DSL 约定，形成可驱动零依赖实现的渲染规范。

---

## 1. 用户与需求（第一性原理）

### 1.1 用户画像

| 角色 | 场景 | 频度 | Mermaid 的痛点 |
|------|------|------|----------------|
| **软件开发者** | 架构图、数据流、error handling 分支 | 每周 | 长边穿节点、subgraph 视觉断裂 |
| **产品经理** | User flow、feature gating 逻辑、onboarding funnel | 每周 | 菱形节点标签溢出、美学不专业 |
| **架构师** | 系统组件图、microservice 依赖、集成蓝图 | 每周 | 大图 (> 30 节点) 布局爆炸，subgraph 嵌套层级乱 |
| **学生 / 教师** | 算法流程、离散数学证明、CS 教学 | 高频 | 数学 label 渲染差，手机端字号不可读 |
| **运维 / SRE** | Incident response runbook、CI/CD pipeline、on-call 决策树 | 每周 | edge label (yes/no) 位置漂移 |
| **BA / Process analyst** | 业务流程、审批链、SOP | 每月 | 符号不够（lacks SDLC/BPMN 混合形状） |
| **Technical writer** | 文档内的流程图 | 高频 | 导出图片/SVG 不清晰，主题差 |
| **数据工程师** | ETL / data pipeline / Airflow DAG 可视化 | 每周 | 无 subgraph 嵌套视觉对比 |
| **LLM (ChatDiagram 生成端)** | AI 生成 mermaid 给人看 | 每日数万次 | 语法错误率 3,587/月，syntax 太 fragile |

### 1.2 Schematex 必须比 Mermaid 做得更好的 5 件事

1. **Aesthetic consistency** — Mermaid 默认配色不统一（节点灰 + 菱形黄 + 深色边），Schematex 走统一 BaseTheme 的 3 preset（default / monochrome / dark），通过 `--schematex-*` CSS custom properties 可全局 override。
2. **Edge label readability** — Mermaid 把 `|yes|` label 塞在线段正中央，常常压在其他节点/线上；Schematex 用 **midpoint + collision-aware offset**，必要时 label 带半透明背景 pill。
3. **Subgraph nesting** — Mermaid 的 subgraph 深度 ≥ 2 时 bounding box 错乱；Schematex 用 **recursive layered layout with cluster constraints**（见 §10），保证 cluster 边界是紧贴 children 的矩形。
4. **Long-edge routing** — Mermaid 在跨 3+ 层的长边上直接斜穿，经常压过中间节点；Schematex 用 **dummy node insertion + orthogonal routing with obstacle avoidance**（M3）。
5. **DSL forgiving-ness** — Mermaid 对空格、引号、Unicode 括号极其挑剔（每月 3,587 parse errors）；Schematex parser 按 mermaid-compatible 语义优先，容错更高（见 §6.6）。

---

## 2. 市场需求数据

### 2.1 搜索量（Ahrefs 2026 Q1）

| 关键词 | US 月搜 | Global 月搜 | KD |
|--------|---------|-------------|----|
| `flowchart` | 103,000 | 589,000 | 70 |
| `flowchart maker` | 22,000 | 88,000 | 55 |
| `flow chart` | 33,000 | 180,000 | 62 |
| `mermaid flowchart` | 4,700 | 17,000 | 28 |
| `online flowchart` | 8,100 | 33,000 | 48 |
| `process flow diagram` | 7,200 | 28,000 | 40 |

**Flowchart 是图表市场里最大的单一品类**，搜索量是 genogram（4,700）的 22×，是 sociogram（1,400）的 73×。对 Schematex 分发的杠杆作用最大。

### 2.2 竞争格局

| 产品 | 定位 | 定价 | 痛点 |
|------|------|------|------|
| **Lucidchart** | SaaS 全能图表工具 | $9–16/user/mo | 按量付费，企业锁定，非嵌入式 |
| **draw.io / diagrams.net** | 免费开源 web app | 免费 | 不是库，要嵌 iframe，布局需手摆 |
| **Mermaid.js** | Markdown 原生 DSL | 免费 | 布局差（见 §1.2）、主题弱 |
| **GoJS** | JS 图表商业库 | $7,000 / dev-seat | 商业授权贵，学习曲线陡 |
| **mxGraph** | 老牌 JS 布局引擎 | 免费（Apache） | 已停止维护，API 繁琐 |
| **elkjs** | Eclipse Layout Kernel JS port | 免费 | 只做布局不做 DSL + 渲染，600KB 超大 |
| **ReactFlow** | React 专用节点编辑器 | 免费 + Pro $250/mo | React-only，不能纯 SVG 嵌入 |

**Schematex flowchart 的差异化定位：**
- 对标 Mermaid 的**易用性**（DSL compatible）
- 对标 GoJS / ELK 的**美观度**（真实 layered layout + orthogonal routing）
- **零 runtime dependency** + 纯 SVG 输出（任何框架可嵌入）
- 与 ChatDiagram / MyMap / ConceptMap 共生（AI 原生生成路径）

---

## 3. 标准合规

### 3.1 没有单一 ISO 现行标准

- **ISO 5807:1985** 定义了经典符号（rectangle=process, diamond=decision, parallelogram=I/O, document, manual-operation, predefined-process, terminator oval 等 15 种），但 2024 年仍未更新继任标准。Schematex 把它作为**符号语义的默认约定**（§4）。
- **ANSI X3.5** 已废止，但 ISO 5807 大部分继承自它。
- **BPMN 2.0** 覆盖更严谨的业务流程（event / gateway / task / pool / lane），Schematex 的 flowchart 不是完整 BPMN，但支持 BPMN 关键形状（start event circle、exclusive gateway diamond、subprocess rounded-rect）作为可选 shape keyword。BPMN 专用图单独规划为未来的 `15-BPMN-STANDARD.md`，本 standard 只覆盖 **BPMN 与 flowchart 重叠** 的部分。

### 3.2 Mermaid 作为事实 DSL 标准

Mermaid 的 flowchart 语法（节点形状、边语法、subgraph、direction）是 GitHub / GitLab / Obsidian / Notion-like 工具的默认接受方言。Schematex **优先保证 mermaid 语法的子集兼容**，再扩展自己的特性：

- 默认 parser 可直接读 `graph TD\nA-->B` 这种 mermaid snippet
- 扩展语法用 **`@` 前缀属性**（如 `A@{shape: cylinder}`），不与 mermaid 保留字冲突
- Mermaid-specific 语法 bug（例如 `|label with spaces|` 的 whitespace 挑剔）在 Schematex 里是 **tolerant**（更宽松的 token recognition）

注：Schematex DSL 借鉴 Mermaid 语法只为降低学习成本，不保证兼容。

---

## 4. Node Shape 目录

所有形状基于 **120 × 60 归一化单元** 渲染（consumer 通过 `nodeWidth` / `nodeHeight` 可 override）。形状外边距 4px 预留给 label 不溢出。默认填充使用 `BaseTheme.fill`，描边使用 `BaseTheme.stroke` 宽度 1.5px。

### 4.1 核心形状（已实现 — 13 个）

| Shape keyword | 语义 | Mermaid syntax | SVG 构造 | 状态 |
|---------------|------|----------------|----------|------|
| `rect` (default) | 通用 process / task | `A[text]` | `<rect rx=14/>` | ✅ M1 |
| `round` | 柔和 process / milestone | `A(text)` | `<rect rx=20/>` | ✅ M1 |
| `stadium` | terminator / start-end | `A([text])` | `<rect rx=h/2/>` | ✅ M1 |
| `diamond` | decision / branch | `A{text}` | `<polygon .../>` | ✅ M1 |
| `parallelogram` | input / output data | `A[/text/]` | slant 20px polygon | ✅ M1 |
| `parallelogram-alt` | 反向 I/O | `A[\text\]` | reverse slant polygon | ✅ M2 |
| `trapezoid` | manual operation | `A[/text\]` | top-wider polygon | ✅ M2 |
| `trapezoid-alt` | manual input | `A[\text/]` | bottom-wider polygon | ✅ M2 |
| `subroutine` | predefined process | `A[[text]]` | rect + 2 inner vert. bars | ✅ M2 |
| `cylinder` | database / storage | `A[(text)]` | rect + ellipse top + arc | ✅ M2 |
| `circle` | connector / small event | `A((text))` | `<circle/>` | ✅ M2 |
| `double-circle` | terminator / sink | `A(((text)))` | outer + inner ring | ✅ M2 |
| `hexagon` | preparation / setup step | `A{{text}}` | 6-pt horizontal hex | ✅ M2 |
| `asymmetric` | ISO 5807 alt process | `A>text]` | right-pointing flag | ✅ M2 |

### 4.2 次级形状（未实现 — +16 个，共 30 形状）

| Shape keyword | 语义 | Mermaid syntax | SVG 构造简述 |
|---------------|------|----------------|--------------|
| `subroutine` | predefined process | `A[[text]]` | rect + 双竖线 `x=8, x=112` |
| `cylinder` | database / storage | `A[(text)]` | rect + top ellipse rx=60 ry=8 |
| `circle` | connector / small event | `A((text))` | `<circle cx=60 cy=30 r=30/>` |
| `double-circle` | terminator / sink | `A(((text)))` | outer `r=30` + inner `r=26` |
| `trapezoid` | manual operation | `A[/text\]` | `<polygon points="0,60 20,0 100,0 120,60"/>` |
| `trapezoid-alt` | ISO 5807 manual-input | `A[\text/]` | `<polygon points="0,0 120,0 100,60 20,60"/>` (反向) |
| `hexagon` | preparation / setup step | `A{{text}}` | `<polygon points="20,0 100,0 120,30 100,60 20,60 0,30"/>` |
| `parallelogram-alt` | 反向 I/O | `A[\text\]` | `<polygon points="0,0 100,0 120,60 20,60"/>` |
| `asymmetric` | ISO 5807 alt process | `A>text]` | `<polygon points="0,0 100,0 120,30 100,60 0,60 20,30"/>` |
| `document` | ISO 5807 document | `A@{shape: doc}` | rect + 底部波浪线 path |
| `multi-document` | 文档集 | `A@{shape: docs}` | 3 层堆叠 rect |
| `delay` | ISO 5807 delay | `A@{shape: delay}` | 半圆右侧 + rect 左侧 |
| `cloud` | external service / API | `A@{shape: cloud}` | 多段 bezier curve |
| `bolt` | event / trigger | `A@{shape: bolt}` | Z 字 polygon |
| `tagged-rect` | 带标签 process | `A@{shape: tag-rect}` | rect + 右上角小三角 |
| `stored-data` | ISO 5807 stored data | `A@{shape: stored}` | rect + 两侧半圆切口 |
| `internal-storage` | 内存 | `A@{shape: internal}` | rect + 内部十字分割 |
| `display` | 屏幕输出 | `A@{shape: display}` | 左半圆 + 右波浪 |
| `manual-input` | keyboard input | `A@{shape: manual-input}` | 梯形顶部倾斜 |
| `card` | 物理卡片 | `A@{shape: card}` | rect 左上角缺口 |
| `punched-tape` | 老式纸带 | `A@{shape: tape}` | 上下双波浪 |
| `summing-junction` | 求和节点 | `A@{shape: sum}` | circle + 十字 |
| `or-gate` | 逻辑或 | `A@{shape: or}` | circle + X |
| `collate` | 整理 | `A@{shape: collate}` | 两三角对顶 |
| `sort` | 排序 | `A@{shape: sort}` | 菱形 + 水平中线 |
| `start` | BPMN start event | `A@{shape: start}` | circle 细描边 r=24 |
| `end` | BPMN end event | `A@{shape: end}` | circle 粗描边 r=24 stroke=3 |
| `gateway` | BPMN exclusive gateway | `A@{shape: gw}` | diamond + 内 X |
| `event` | BPMN intermediate event | `A@{shape: event}` | 双圆环 |
| `subprocess` | BPMN subprocess | `A@{shape: subprocess}` | round-rect + 底部 `+` 小方块 |

### 4.3 Shape 属性约束

- **默认尺寸自适应：** label 宽度 × 字号度量 + 24px padding → shape width; shape height 固定 60px（多行 label +20px/line）
- **最小尺寸：** 60 × 40（保证菱形能容纳 2 个字符）
- **多行 label：** 超过 `maxLineChars`（默认中文 8 / 英文 18）自动换行，`<tspan dy="1.2em">`
- **图标槽位：** `A@{shape: rect, icon: 🗄️}` 在 label 左侧预留 20px，M2 阶段支持 emoji，M3 阶段支持 SVG 外链 icon

### 4.4 DSL Shape 声明语法

```ebnf
node_def    = IDENTIFIER shape_spec? ("@{" attr_list "}")?
shape_spec  = "[" label "]"          # rect
            | "(" label ")"          # round
            | "([" label "])"        # stadium
            | "{" label "}"          # diamond
            | "[/" label "/]"        # parallelogram
            | "[\" label "\\]"       # parallelogram-alt
            | "[/" label "\\]"       # trapezoid
            | "[\\" label "/]"       # trapezoid-alt
            | "[[" label "]]"        # subroutine
            | "[(" label ")]"        # cylinder
            | "((" label "))"        # circle
            | "(((" label ")))"      # double-circle
            | "{{" label "}}"        # hexagon
            | ">" label "]"          # asymmetric
attr_list   = attr ("," attr)*
attr        = "shape:" SHAPE_KW
            | "icon:" STRING
            | "class:" IDENTIFIER
            | "style:" STRING
```

---

## 5. Edge 类型

### 5.1 Edge 核心类型（M1 — 6 种）

| Syntax | 类型 | Stroke | Arrow | 语义 |
|--------|------|--------|-------|------|
| `A --> B` | 实线 + 箭头 | solid 1.5px | 实心三角 | 默认 |
| `A --- B` | 实线无箭头 | solid 1.5px | 无 | association |
| `A -.-> B` | 虚线 + 箭头 | dashed 1.5px (4,3) | 实心三角 | optional / conditional |
| `A ==> B` | 粗线 + 箭头 | thick 3px | 实心三角 | emphasized / main path |
| `A <--> B` | 双向 | solid 1.5px | 两端箭头 | bi-directional |
| `A --x B` | crossed end | solid 1.5px | X 标记 | rejected / blocked |

### 5.2 Edge 扩展类型（M2 — +8 种）

| Syntax | 类型 |
|--------|------|
| `A --o B` | 圆头 end（aggregation） |
| `A ==o B` | 粗线 + 圆头 |
| `A ==x B` | 粗线 + X |
| `A -.-x B` | 虚线 + X |
| `A ==> B` thick | stroke=3px |
| `A -- text --> B` | 中段 label |
| `A -->|yes| B` | Mermaid style 管道 label |
| `A e1@--> B` | 命名 edge（用于 animation / CSS hook） |

### 5.3 Edge 标签（label）

两种等效语法：

```
A -->|yes| B
A -- "yes" --> B
```

标签渲染：
- 12px label，`text-anchor="middle"`
- 默认带半透明 `fill=var(--schematex-bg) fill-opacity=0.85` 背景 pill（避免压线）
- 位置：edge path midpoint，若 midpoint 与其他 label bbox 碰撞则沿 path 向前/后滑动 15% 寻找 gap

### 5.4 Chain 语法

```
A --> B --> C --> D
A & B --> C               # fan-in: 2→1 edges  ✅ 已实现
A --> B & C               # fan-out: 1→2 edges  ✅ 已实现
A & B --> C & D           # cross-product: 4 edges  ✅ 已实现
```

### 5.5 Animated edges（M3）

```
A e1@--> B
e1@{ animate: true }
```

渲染为 `<animateMotion>` 或 `stroke-dashoffset` animation。

---

## 6. DSL Grammar

### 6.1 完整 EBNF

```ebnf
document        = header statement* EOF
header          = ("graph" | "flowchart") direction? title? NEWLINE
direction       = "TB" | "TD" | "BT" | "LR" | "RL"   # TB=TD=top-bottom
title           = quoted_string

statement       = comment
                | node_def
                | edge_def
                | subgraph_def
                | class_def
                | class_apply
                | style_def
                | link_style
                | config_def
                | NEWLINE

comment         = "%%" [^\n]*

node_def        = IDENTIFIER shape_spec? attr_block?
attr_block      = "@{" attr ("," attr)* "}"
attr            = IDENTIFIER ":" (STRING | IDENTIFIER | NUMBER)

edge_def        = edge_source edge_op edge_target
edge_source     = IDENTIFIER ("&" IDENTIFIER)*
edge_target     = IDENTIFIER ("&" IDENTIFIER)*
edge_op         = arrow_kind
arrow_kind      = "-->" | "---" | "-.->" | "-.-" | "==>" | "==="
                | "<-->" | "<-.->" | "<==>"
                | "--o" | "--x" | "==o" | "==x"
                | edge_labeled

edge_labeled    = "--" STRING_INLINE "-->"                  # A -- text --> B
                | "-->|" STRING "|"                          # A -->|text| B
                | "==" STRING_INLINE "==>"
                | "-.-" STRING_INLINE "-.->"

subgraph_def    = "subgraph" (IDENTIFIER | quoted_string) direction?
                    statement*
                  "end"

class_def       = "classDef" IDENTIFIER css_props
class_apply     = "class" IDENTIFIER ("," IDENTIFIER)* IDENTIFIER  # class A,B foo
style_def       = "style" IDENTIFIER css_props
link_style      = "linkStyle" (NUMBER | "default") css_props

config_def      = "%%{init:" json_obj "}%%"

IDENTIFIER      = /[A-Za-z_][A-Za-z0-9_]*/
STRING          = '"' /[^"]*/ '"'
STRING_INLINE   = /[^-=|{}[\]()]+/
NUMBER          = /[0-9]+/
NEWLINE         = /\n/
```

### 6.2 Direction

- `TB` / `TD` — top to bottom（默认）
- `BT` — bottom to top
- `LR` — left to right
- `RL` — right to left

Subgraph 可以有自己的 direction，覆盖父级（Mermaid 兼容行为）。

### 6.3 示例：完整 flowchart

```
flowchart TD
  Start([开始]) --> Input[/输入数据/]
  Input --> Validate{数据有效?}
  Validate -->|是| Process[处理]
  Validate -->|否| Error[报错]
  Process --> DB[(数据库)]
  Error --> End([结束])
  DB --> End

  classDef errorPath fill:#fee,stroke:#d32f2f
  class Error,Validate errorPath
```

### 6.4 示例：subgraph 嵌套

```
flowchart LR
  subgraph "Frontend"
    direction TB
    UI[React UI] --> API[API Client]
  end

  subgraph "Backend"
    direction TB
    subgraph "Auth Service"
      Login --> Session[Session Store]
    end
    subgraph "Core Service"
      Handler --> DB[(Postgres)]
    end
  end

  API --> Login
  API --> Handler
```

### 6.5 示例：class / style

```
flowchart
  A[Critical] --> B[Normal] --> C[Warning]
  classDef critical fill:#d32f2f,color:#fff,stroke-width:3
  classDef warn fill:#fb8c00,color:#fff
  class A critical
  class C warn
  style B fill:#e3f2fd
  linkStyle 0 stroke:#d32f2f,stroke-width:3
```

### 6.6 Parser Tolerance（Schematex 扩展）

对 Mermaid 脆弱点的容错：

| Mermaid 错误 | Schematex 行为 |
|--------------|----------------|
| `A[text with (parens)]` parse error | accept，如果 `)` 不匹配则当字符处理 |
| `A[text with "quotes"]` escape | 容忍 raw quotes 在 `[...]` 内 |
| Unicode 括号 `A【中文】` | 当作 rect shape |
| 缺少 `end` 关闭 subgraph | 在 EOF 自动闭合 + warning |
| `-->` 前后空格不一致 | 始终接受 |
| Edge label 含 markdown `|**bold**|` | 渲染为粗体（M2） |

Parser 必须返回 `ParseDiagnostic[]`，分 `error` / `warning` / `hint` 三级，交给 ChatDiagram 在编辑器内高亮提示。

---

## 7. 布局算法（Sugiyama Layered Layout）

### 7.1 总体 Pipeline

```
AST
 ├─ Phase 1: Cycle Removal         (Greedy-FAS，见 Eades et al. 1993)
 ├─ Phase 2: Layer Assignment      (Longest-path，可选 Coffman-Graham)
 ├─ Phase 3: Crossing Minimization (Median + Barycenter 混合启发式)
 ├─ Phase 4: X-Coordinate Assignment (Brandes-Köpf 2001)
 ├─ Phase 5: Edge Routing          (M1: straight Manhattan, M3: orthogonal + A*)
 └─ Phase 6: Cluster Embedding     (M2)
   → LayoutResult
```

### 7.2 Phase 1 — Cycle Removal

Flowchart 通常是 DAG，但用户可能画反馈循环（`retry --> start`）。若存在 cycle，选择最小反馈边集合（Minimum Feedback Arc Set，NP-hard），使用 **Greedy-FAS heuristic**（Eades-Lin-Smyth 1993）：

1. 重复：取出 source 节点（入度 0）加到左端 list；取出 sink 节点（出度 0）加到右端；否则取出度-入度最大节点加左端
2. 剩余节点按该线性顺序扫描，**反向方向** 的边 = feedback edge
3. 在布局中临时反转这些边，保留 `isReversed: true` 标记，渲染时箭头方向还原

### 7.3 Phase 2 — Layer Assignment

每个节点 assigned 一个整数 layer（TB 方向下 = y 坐标分组）。

**M1 默认：Longest-path layering**

```
for node in topological order:
  layer[node] = max(layer[pred] + 1 for pred in predecessors(node))  // 起始 0
```

- 简单，但可能产生过宽的层（> 15 nodes/layer 会难看）

**M2 可选：Coffman-Graham layering**（当 `width > maxWidth` 时启用）

- 限制每层最多 W 个节点（默认 W = sqrt(|V|) × 1.5）
- 优先放 critical-path 深度最大的节点
- 生成更均衡的矩形画布

**Dummy node insertion:** 长边 `A(layer 0) --> B(layer 3)` 中插入 2 个 dummy node（`d1@layer1`, `d2@layer2`），edge 拆成 3 段 sub-edge。Dummy node 宽度 = 0，只占一个 y-slot，在 phase 3 参与 crossing minimization。

### 7.4 Phase 3 — Crossing Minimization

在每层内重排节点顺序，最小化相邻层之间的边交叉数（NP-hard）。

**算法：Layer-by-layer sweep with median + barycenter heuristic**

```
for iteration in 0..24:                  # Mermaid 用 24，ELK 用 40
  direction = iteration % 2 == 0 ? "down" : "up"
  for each pair of adjacent layers (L_i, L_{i+1}) in direction:
    fix L_i; reorder L_{i+1} nodes by median of neighbor positions
  if crossing count not improved in last 4 iter: break
```

**Median heuristic:** 节点 v 在新排序中的位置 = median(所有 fixed 层邻居的位置)。median 比 barycenter (mean) 对异常值更稳健。

**Tie-breaking:** 相同 median 的节点按 barycenter 平均位置做二级排序。

### 7.5 Phase 4 — X-Coordinate Assignment（Brandes-Köpf）

每层节点相对顺序已定，此阶段给每个节点赋确切 x 坐标（TB 方向）。

**Brandes-Köpf 2001 算法（简化描述）：**

1. 四次对齐：upper-left, upper-right, lower-left, lower-right
2. 每次对齐沿"type-1 conflict-free" edge path 合并节点到 block
3. 每个 block 内节点共享 x 坐标
4. 取 4 次对齐结果的中位数作为最终 x

**约束：**
- 相邻节点 x 距离 ≥ `nodeSpacingX`（默认 40px）
- Dummy node 尽量放直（减少折线）
- 对称性：同一 subtree 左右分支尽量对称

**Y 坐标简单：** `y = layer * (nodeHeight + nodeSpacingY)`（nodeSpacingY 默认 60px）

### 7.6 Phase 5 — Edge Routing

**M1 — Straight Manhattan：**
- 从 source node 底边中点（或配置的出口 port）垂直下降到中间 y
- 水平移动到 target node 顶边中点
- 垂直下降到 target
- 若同层直连（水平边，LR direction），直接水平段

生成 SVG path：`M x1,y1 V (y1+gap) H x2 V y2`

**M1 追加约束：多边同 port 防止重叠**
- 同一节点同一边出去的多条 edge 在 port 上平均分布（例：3 条出边 → x = port_x - 20 / port_x / port_x + 20）

**M3 — Orthogonal Routing with Obstacle Avoidance：**
- 构造 grid：canvas 以 10px 栅格量化，所有节点 bbox（+ 8px padding）标记为 obstacle
- 每条 edge 用 **grid-based A* 搜索**：cost = 路径长度 + bend penalty (每次 90° 转弯 +50) + 穿 label bbox penalty (+200)
- 结果 path 简化：合并共线段、8px 圆角 (`stroke-linejoin: round`)
- Edge bundling（M3 stretch）：同源节点群的多条边共享前缀，在共同分叉点 fanout

### 7.7 Phase 6 — Cluster Embedding（M2 subgraph）

Subgraph = recursive layered layout：
1. 先递归 layout 内层 subgraph，得到 children bbox
2. 把整个 cluster 当作一个 meta-node（width/height = children bbox + padding 24px）
3. 在父层参与 phase 1–5
4. 最后 unroll：children 坐标 = cluster_offset + internal coord
5. Cluster 边界 rect 渲染在 children 后面（z-index 低），带 `data-cluster-id`、title label

**关键约束：跨 cluster edge 处理**
- Edge 起点/终点 = cluster 边界上最近的"port"（top/bottom/left/right 中点）
- Phase 5 routing 时，cluster bbox（+ padding）也作为 obstacle（M3）

---

## 8. Edge Label Positioning（Schematex 关键差异化）

### 8.1 Mermaid 的问题

Mermaid 把 label 放在 path midpoint，不检测与其他 label / node 的碰撞。大图上 label 会：
- 压在对面节点上
- 与其他 label 重叠
- 被长 edge 的折点切断

### 8.2 Schematex 算法

```
for each labeled edge e:
  candidates = [
    path.midpoint,
    path.pointAt(0.35),
    path.pointAt(0.65),
    path.pointAt(0.25),
    path.pointAt(0.75)
  ]
  for c in candidates:
    bbox = computeLabelBBox(c, label.text)
    if not collidesWith(bbox, allLabelBBoxes) and
       not collidesWith(bbox, allNodeBBoxes_excluding_endpoints):
      place label at c
      add bbox to allLabelBBoxes
      break
  else:
    place at midpoint with semi-transparent bg pill
```

### 8.3 Label 视觉规范

- Font: 12px, `font-weight: 400`, fill `var(--schematex-text)`
- Padding: 4px 水平 / 2px 垂直
- 背景 pill（始终渲染，保证 hover/collision 可读）：
  ```svg
  <rect rx=4 fill="var(--schematex-bg)" fill-opacity="0.9"
        stroke="var(--schematex-stroke-muted)" stroke-width="0.5"/>
  ```
- 对于 `|yes|` / `|no|` 等短 label，可选 **colored pill**（yes→positive, no→negative）

---

## 9. Subgraph / Cluster 嵌套规范

### 9.1 视觉规范

| 属性 | 默认 |
|------|------|
| Cluster border | rect rx=6, stroke=var(--schematex-stroke-muted), stroke-width=1.5, fill=var(--schematex-fill-muted) fill-opacity=0.4 |
| Title position | 左上角内嵌，padding 8px，font-weight=500 |
| Title background | `var(--schematex-bg)` 填充，避免 border 穿字 |
| Padding | 24px（children 到 cluster 边） |
| Nested 层 | 每深一层 bg 颜色加深 5%（通过 HSL L 下降） |

### 9.2 Direction 覆盖

Subgraph 内 `direction TB` 可覆盖父级 `LR`。布局时内部独立跑 phase 1–4，再以整体 bbox 嵌入父层。

### 9.3 跨 cluster edge

- **Port 选择：** edge 从 cluster 边界上最接近 target 方向的中点出发
- **Crossing cluster：** M3 的 A* routing 把 cluster bbox 作为 soft obstacle（穿越成本高但可接受），避免完全绕行

### 9.4 深度限制

推荐 ≤ 4 层（深过 4 层视觉难辨）。M1 不支持嵌套（flat subgraph），M2 支持 ≥ 3 层。

---

## 10. Theme 集成

### 10.1 BaseTheme 使用

Flowchart 只用 BaseTheme，不引入新语义 token 族（与 fishbone 的 `CausalityTokens` 区分）。

| 视觉元素 | BaseTheme token |
|----------|-----------------|
| Node fill | `fill` |
| Node stroke | `stroke` |
| Node text | `text` |
| Edge stroke | `stroke` |
| Edge label text | `text` |
| Edge label bg | `bg` |
| Cluster bg | `fillMuted` |
| Cluster border | `strokeMuted` |
| Cluster title | `textMuted` |
| Emphasized edge (`==>`) | `accent` |
| class critical | `negative` |
| class success | `positive` |
| class warn | `warn` |
| classDef palette (user class) | `palette[i]` cycle |

### 10.2 CSS Custom Properties

每个 flowchart SVG 的 `<defs><style>` 注入：

```css
.schematex-flowchart-node      { fill: var(--schematex-fill); stroke: var(--schematex-stroke); stroke-width: 1.5; }
.schematex-flowchart-node-text { fill: var(--schematex-text); font: 12px var(--schematex-font); }
.schematex-flowchart-edge      { fill: none; stroke: var(--schematex-stroke); stroke-width: 1.5; }
.schematex-flowchart-edge-thick  { stroke-width: 3; }
.schematex-flowchart-edge-dashed { stroke-dasharray: 4,3; }
.schematex-flowchart-edge-label  { fill: var(--schematex-text); font: 12px var(--schematex-font); }
.schematex-flowchart-edge-label-bg { fill: var(--schematex-bg); fill-opacity: 0.9; }
.schematex-flowchart-cluster   { fill: var(--schematex-fill-muted); fill-opacity: 0.4; stroke: var(--schematex-stroke-muted); stroke-width: 1.5; }
.schematex-flowchart-cluster-title { fill: var(--schematex-text-muted); font: 500 13px var(--schematex-font); }
```

### 10.3 classDef 映射

`classDef foo fill:#xxx,stroke:#yyy,color:#zzz` 生成 `class="foo"` + `<style>.foo .schematex-flowchart-node { ... }</style>`。消费者 CSS override 仍可工作。

---

## 11. AST 类型定义

这些类型将加入 `src/core/types.ts`，与现有图表并列。

```ts
// ── Flowchart ──────────────────────────────────────────────

export type FlowchartDirection = "TB" | "BT" | "LR" | "RL";

export type FlowchartShape =
  | "rect" | "round" | "stadium" | "diamond" | "parallelogram"
  | "parallelogram-alt" | "trapezoid" | "trapezoid-alt"
  | "subroutine" | "cylinder" | "circle" | "double-circle"
  | "hexagon" | "asymmetric" | "document" | "multi-document"
  | "delay" | "cloud" | "bolt" | "tagged-rect" | "stored-data"
  | "internal-storage" | "display" | "manual-input" | "card"
  | "punched-tape" | "summing-junction" | "or-gate" | "collate"
  | "sort" | "start" | "end" | "gateway" | "event" | "subprocess";

export type FlowchartEdgeKind =
  | "solid"        // -->
  | "none"         // ---
  | "dotted"       // -.->
  | "thick"        // ==>
  | "bidirectional"// <-->
  | "crossed"      // --x
  | "round-end";   // --o

export interface FlowchartNode {
  id: string;
  label: string;
  shape: FlowchartShape;
  icon?: string;
  classes?: string[];
  style?: Record<string, string>;
  /** Containing subgraph id (undefined = root) */
  parent?: string;
}

export interface FlowchartEdge {
  id?: string;
  from: string;
  to: string;
  kind: FlowchartEdgeKind;
  label?: string;
  /** Rendered arrowhead marker style */
  arrowStart?: "none" | "arrow" | "circle" | "cross";
  arrowEnd?: "none" | "arrow" | "circle" | "cross";
  classes?: string[];
  /** Reversed during cycle-removal (renderer must flip visual arrow) */
  isReversed?: boolean;
}

export interface FlowchartSubgraph {
  id: string;
  label: string;
  direction?: FlowchartDirection;
  /** Child node ids */
  children: string[];
  /** Child subgraph ids (recursive nesting) */
  subgraphs: string[];
  classes?: string[];
}

export interface FlowchartClassDef {
  id: string;
  props: Record<string, string>;
}

export interface FlowchartAST {
  type: "flowchart";
  title?: string;
  direction: FlowchartDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  subgraphs: FlowchartSubgraph[];
  classDefs: FlowchartClassDef[];
  /** linkStyle index → props */
  linkStyles: Map<number, Record<string, string>>;
  metadata?: Record<string, string>;
}

export interface FlowchartLayoutNode {
  node: FlowchartNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Layer index (0 = top for TB) */
  layer: number;
  /** Dummy node inserted during layering */
  isDummy?: boolean;
}

export interface FlowchartLayoutEdge {
  edge: FlowchartEdge;
  /** SVG path d attribute */
  path: string;
  /** Computed label anchor (x, y) */
  labelAnchor?: { x: number; y: number };
}

export interface FlowchartLayoutCluster {
  subgraph: FlowchartSubgraph;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Recursion depth (0 = root-level cluster) */
  depth: number;
}

export interface FlowchartLayoutResult {
  width: number;
  height: number;
  nodes: FlowchartLayoutNode[];
  edges: FlowchartLayoutEdge[];
  clusters: FlowchartLayoutCluster[];
}
```

`DiagramType` union 新增 `"flowchart"`。

---

## 12. SVG 结构

```xml
<svg class="schematex-flowchart" data-diagram-type="flowchart"
     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" role="graphics-document">
  <defs>
    <style><!-- CSS from §10.2 --></style>
    <marker id="sfc-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5"
            orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="context-stroke"/>
    </marker>
    <marker id="sfc-arrow-o" markerWidth="10" markerHeight="10" refX="9" refY="5"
            orient="auto">
      <circle cx="5" cy="5" r="4" fill="none" stroke="context-stroke"/>
    </marker>
    <marker id="sfc-arrow-x" markerWidth="10" markerHeight="10" refX="5" refY="5">
      <path d="M1,1 L9,9 M1,9 L9,1" stroke="context-stroke" stroke-width="2"/>
    </marker>
  </defs>

  <title>Flowchart — {title}</title>
  <desc>{text description}</desc>

  <!-- 1. Clusters (rendered first, lowest z) -->
  <g class="schematex-flowchart-clusters">
    <g data-cluster-id="Frontend" transform="translate(x,y)">
      <rect class="schematex-flowchart-cluster" width="w" height="h"/>
      <text class="schematex-flowchart-cluster-title" x="12" y="18">Frontend</text>
    </g>
  </g>

  <!-- 2. Edges -->
  <g class="schematex-flowchart-edges">
    <g data-edge-id="A->B" data-kind="solid">
      <path class="schematex-flowchart-edge" d="M..." marker-end="url(#sfc-arrow)"/>
      <g class="schematex-flowchart-edge-label" transform="translate(lx,ly)">
        <rect class="schematex-flowchart-edge-label-bg" x="-20" y="-9" width="40" height="18" rx="4"/>
        <text text-anchor="middle" dominant-baseline="central">yes</text>
      </g>
    </g>
  </g>

  <!-- 3. Nodes (highest z) -->
  <g class="schematex-flowchart-nodes">
    <g data-node-id="A" data-shape="diamond" class="sfc-node critical"
       transform="translate(x,y)">
      <polygon class="schematex-flowchart-node" points="..."/>
      <text class="schematex-flowchart-node-text" x="60" y="30"
            text-anchor="middle" dominant-baseline="central">Decision?</text>
    </g>
  </g>
</svg>
```

**data-* 属性规范：**
- `data-node-id`, `data-shape`, `data-classes` on node groups
- `data-edge-id`, `data-kind`, `data-from`, `data-to` on edge groups
- `data-cluster-id`, `data-depth` on cluster groups
- `data-layer` on node groups (用于 CSS 按层动画)

---

## 13. （已移除：原 Mermaid Compatibility Matrix）

> 本 standard v2 起不再承诺 Mermaid 兼容，也不提供转译器。DSL 借鉴语法（`-->` / `TD`）仅为降低 LLM 和人类学习成本。ChatDiagram 集成路径：直接改 prompt 让 LLM 输出 Schematex DSL。

---

## 14. 测试用例

### Case 1: Linear Chain（M1）
```
flowchart TD
  A[Start] --> B[Process] --> C[End]
```
**验证：** 3 节点垂直一列，边直线向下，无冗余。

### Case 2: Branching Decision（M1）
```
flowchart TD
  A[Start] --> B{Valid?}
  B -->|yes| C[Save]
  B -->|no| D[Reject]
  C --> E[Done]
  D --> E
```
**验证：** 菱形居中，yes/no label 在分支 edge midpoint 且带 bg pill，C 和 D 在同一 y，E 在下一层居中（merge point）。

### Case 3: Long Edge with Dummy Nodes（M1）
```
flowchart TD
  A --> B --> C --> D
  A --> D
```
**验证：** `A --> D` 跨 3 层，插入 2 dummy node，边沿直线（不穿 B/C），视觉上在 B/C 左侧或右侧绕行。

### Case 4: Cycle Handling（M1）
```
flowchart TD
  A --> B --> C --> A
```
**验证：** 布局无异常（greedy-FAS 选一条 feedback edge 反转），渲染时箭头方向还原为 `C → A`，视觉上形成明显回环。

### Case 5: Horizontal Direction LR（M1）
```
flowchart LR
  A --> B --> C --> D
```
**验证：** 4 节点水平一行，edge 水平向右。

### Case 6: All 5 M1 Shapes Gallery（M1）
```
flowchart LR
  S([Start]) --> P[Process] --> D{Decision}
  D --> I[/Input/] --> R(Round)
```
**验证：** 5 种 shape 正确渲染，stadium 圆角=30，diamond 尖角，parallelogram 斜边 20px。

### Case 7: Single Subgraph（M2）
```
flowchart TD
  A --> B
  subgraph "Core"
    C --> D
  end
  B --> C
  D --> E
```
**验证：** Core subgraph 围住 C/D，title "Core" 左上角，cluster padding 24px，跨边界 edge B→C 从 cluster 上边界进入。

### Case 8: Nested Subgraph 3 Levels（M2）
```
flowchart LR
  subgraph "App"
    subgraph "Frontend"
      subgraph "UI"
        Button --> Modal
      end
    end
    subgraph "Backend"
      API --> DB[(PG)]
    end
  end
  Modal --> API
```
**验证：** 3 层嵌套 cluster 正确绘制，每层 bg 颜色更深，Modal→API 跨多层 cluster 边界。

### Case 9: All 30 Shapes Gallery（M2）
```
flowchart LR
  r[rect] --> rd(round) --> s([stadium]) --> d{diamond}
  d --> p[/parallelogram/] --> h{{hexagon}} --> c((circle))
  c --> cy[(cylinder)] --> sr[[subroutine]]
  sr --> doc@{shape: document} --> cl@{shape: cloud} --> b@{shape: bolt}
  ...
```
**验证：** 所有 30 shape 渲染正确，label 居中，bbox 自适应 label 长度。

### Case 10: Edge Styles Gallery（M2）
```
flowchart TD
  A --> B
  B --- C
  C -.-> D
  D ==> E
  E <--> F
  F --x G
  G --o H
```
**验证：** 7 种 edge 渲染正确：solid/none/dashed/thick/bi-directional/crossed/round。

### Case 11: classDef + style（M2）
```
flowchart TD
  A --> B --> C
  classDef danger fill:#d32f2f,color:#fff,stroke-width:3
  class A danger
  style B fill:#e3f2fd,stroke:#1565c0
  linkStyle 0 stroke:#d32f2f
```
**验证：** A 红底白字粗边，B 淡蓝底蓝边，A→B edge 红色。

### Case 12: Edge Label Collision（M3）
构造一个 8 节点 × 多 label 密集场景，验证 label 不压节点、不互相重叠、必要时沿 path 滑动 + bg pill。

### Case 13: Smart Orthogonal Routing（M3）
```
flowchart LR
  A --> B --> C
  A --> D
  D --> C
  A --> E
  E --> C
  subgraph "Cluster"
    F --> G
  end
  A --> F
```
**验证：** 所有边正交，不穿越节点/cluster 内部；多条从 A 出发的边在 A 底部 port 平均分布；边之间 90° 转折圆角。

### Case 14: Large Disconnected Subgraph（M3）
50 个节点分 3 个完全不相连的子图，验证每个 component 独立 layout 后水平并排。

### Case 15: Real ChatDiagram Sample (CI/CD pipeline)
```
flowchart LR
  Dev[Dev Push] --> CI{CI Passes?}
  CI -->|yes| Build[Build Image]
  CI -->|no| Fail[Notify Dev]
  Build --> Test[Run Tests]
  Test --> Stage{Stage Deploy OK?}
  Stage -->|yes| Prod[Prod Deploy]
  Stage -->|no| Rollback[Rollback]
  Prod --> Done([Released])
  Rollback --> Fail
  Fail --> Done
```
**验证：** 10 节点真实 CI/CD 图，布局整齐，label 清晰，无边穿节点。回归用例：定期从 ChatDiagram 生产取样 100 个 mermaid flowchart，自动 diff Schematex 渲染 vs Mermaid baseline。

### Case 16 (bonus): Mermaid ↔ Schematex 等价性
取 Mermaid 官方 docs 的 20 个 flowchart example，确保 Schematex parser 产出一致 AST + 渲染视觉一致（允许坐标差异 ≤ 10%）。

---

## 15. Implementation Milestones

### M1 — Linear MVP（Month 1，ship to ChatDiagram 80% flowchart traffic coverage）

**Scope：**
- Parser: mermaid-compatible subset — `graph/flowchart TD/LR`, 5 shapes (rect/round/stadium/diamond/parallelogram), `-->` edge with optional `|label|`, chain syntax
- Layout: Sugiyama phase 1–4 (greedy-FAS, longest-path layering, median crossing min, Brandes-Köpf), dummy node insertion
- Edge routing: straight Manhattan (M path with 1–2 bends)
- Renderer: 5 shapes, solid edge + arrowhead, edge label at midpoint (no collision detection)
- Theme: BaseTheme (default/mono/dark) via `<defs><style>`
- Tests: Cases 1–6 (linear, branch, long edge, cycle, LR, shape gallery)

**Target metrics：**
- Pass 60% of sampled real ChatDiagram mermaid flowcharts (≤ 20 nodes, no subgraph, no class)
- Zero mermaid parse errors on the 5-shape subset
- Render time < 30ms for 20-node graph

**DoD：**
- `detect(text) → "flowchart"` 正确识别 `graph` / `flowchart` 开头
- `npm run test` 通过 Cases 1–6
- Visual diff 与 Mermaid 差异 ≤ 10% on the test cases
- TS strict mode 零 error

### M2 — Full Shape + Subgraph + Styling（Month 2）

**Scope：**
- Parser: 全部 30 shapes, 所有 edge kinds (dotted/thick/bi/crossed/round), `subgraph`/`end`, `classDef`/`class`/`style`/`linkStyle`, multi-source `&`, `%%{init}%%`
- Layout: recursive cluster layout (subgraph 嵌套), Coffman-Graham layering fallback 大图
- Renderer: 全部 30 shape SVG paths, 所有 edge markers, class/style CSS injection, cluster rect + title
- Parser tolerance improvements: Unicode 括号、unclosed subgraph auto-fix、diagnostics 输出

**Target metrics：**
- Pass 90% of sampled ChatDiagram mermaid flowcharts
- Subgraph depth 3+ 渲染正确
- Render time < 100ms for 100-node graph

**DoD：**
- Tests Cases 7–11 通过
- `mermaid2schematex` 初步 spec 可行性验证

### M3 — Smart Routing + Polish（Month 3）

**Scope：**
- Edge routing: grid-based A* orthogonal routing with obstacle avoidance
- Edge label placement: collision-aware with 5-candidate fallback + bg pill
- Long-edge smart bends (圆角 8px)
- Edge bundling (M3 stretch, optional)
- Animated edges `e1@{ animate: true }`
- Markdown label rendering（`**bold**` / `*italic*` / emoji）
- Click href support (`A click "https://..."` → wrap `<a>`)

**Target metrics：**
- Pass 95% of sampled ChatDiagram mermaid flowcharts
- Zero edge-through-node on stress tests
- Render time < 300ms for 200-node graph

**DoD：**
- Tests Cases 12–15 通过
- Visual regression suite (100 samples) passing ≥ 95%

### M4 — （已移除）

原 M4 "Mermaid Transpiler" 作为 non-goal 删除。ChatDiagram 通过改 prompt 直接让 LLM 输出 Schematex DSL，不需要转译层。M3 为 flowchart 终点里程碑。

---

## 16. Accessibility

- `<svg role="graphics-document">`
- 每个 node group 附加 `<title>{label}</title>`（screen reader reads label）
- 每个 edge group 附加 `<title>{from} → {to} {label?}</title>`
- Cluster group 附加 `role="graphics-symbol"` + `<title>`
- 纯 SVG `<text>` 不用 image 替代 label
- Keyboard navigation hooks: `tabindex="0"` on node groups (M3 feature)
- High-contrast mode: `monochrome` theme 保证 contrast ratio ≥ 7:1

---

## 17. Interaction Hooks (future)

| Attribute | Element | 用途 |
|-----------|---------|------|
| `data-node-id` | node group | 点击 / hover 定位 |
| `data-edge-id` | edge group | 高亮单条 edge |
| `data-cluster-id` | cluster group | fold/unfold cluster |
| `data-classes` | node / edge | CSS :hover 变色 |
| `data-from` / `data-to` | edge | 双向导航 |
| `data-layer` | node | 按层动画 reveal |

ChatDiagram 消费者可用这些 hook 实现：
- 点击 node 跳到对应代码 anchor
- hover edge 同时高亮 source/target node
- 折叠 subgraph 展示缩略图

---

## 18. Open Questions / ⚠️ NEEDS VICTOR INPUT

### 18.1 是否在 M1 直接做 subgraph？
**当前决策：** M1 不做，M2 再做。
**理由：** subgraph 需要 recursive layout + cluster-aware routing，复杂度高。M1 聚焦最大频率（无 subgraph 的简单 flowchart 占 ChatDiagram 60%）。
**⚠️ NEEDS VICTOR INPUT：** 若 ChatDiagram 数据显示 subgraph 使用率 ≥ 40%，需前置到 M1。

### 18.2 Edge label 带 bg pill vs 不带 bg？
**当前决策：** 默认带半透明 bg pill（`fill-opacity: 0.9`）。
**理由：** 保证所有场景可读。
**⚠️ NEEDS VICTOR INPUT：** 学术 / 打印场景（monochrome theme）是否允许 `fill: white fill-opacity: 1`？是否暴露 `labelBackground: "none" | "pill" | "solid"` 配置？

### 18.3 Direction 默认值
**当前决策：** `TB`（与 Mermaid 一致）。
**⚠️ NEEDS VICTOR INPUT：** ChatDiagram 英文用户更习惯 `LR`（更像 Lucidchart 默认），是否按 locale 智能切换？

### 18.4 classDef palette 冲突
**当前决策：** 用户 classDef 优先于 palette auto-assign。
**⚠️ NEEDS VICTOR INPUT：** 若 user 指定 `fill: red` 但 theme 是 dark，是否自动调整亮度？还是严格保留 user 意图？

### 18.5 Long-label 策略
**当前决策：** 超 `maxLineChars` 自动换行，node height 增加。
**⚠️ NEEDS VICTOR INPUT：** 超长 label（> 3 行）是否截断 + tooltip？ChatDiagram AI 经常生成 50+ 字符 label。

### 18.6 Mermaid init block 支持范围
**当前决策：** 仅解析 `theme` / `flowchart.curve` / `flowchart.nodeSpacing`。
**⚠️ NEEDS VICTOR INPUT：** Mermaid `themeVariables` 整块是否透传（可能带来无限 config surface）？

### 18.7 M1 是否支持 `classDef`
**当前决策：** M1 跳过 classDef（parser 识别但 ignore），M2 实现。
**理由：** M1 优先保证 layout 正确。
**⚠️ NEEDS VICTOR INPUT：** 若 ChatDiagram 生成端频繁用 classDef 做强调，可能需要 M1 就支持基础 `fill` / `stroke`。

### 18.8 Edge bundling 是否值得
**当前决策：** M3 stretch goal，非强制。
**⚠️ NEEDS VICTOR INPUT：** 大图（> 100 节点）视觉改进 vs 实现复杂度（2 周额外工作），是否优先级够？

### 18.9 与 Fishbone 类似，是否引入 FlowchartTokens 主题扩展？
**当前决策：** 不引入，仅用 BaseTheme + `palette`。
**理由：** Flowchart 视觉元素与 base tokens 基本对齐，不需要像 PersonTokens / CausalityTokens 那种特殊语义。
**⚠️ NEEDS VICTOR INPUT：** 未来若要做 BPMN 专用色板（event 绿 / gateway 橙 / task 蓝），可能需要 `ProcessTokens`。

### 18.10 （已移除）Mermaid transpiler
**决策（2026-04）：** 不做转译器。ChatDiagram 侧改 prompt 让 LLM 直接输出 Schematex DSL。

---

## 19. Coverage Matrix

| Feature | M1 | M2 | M3 | Implemented | Test Case |
|---------|:--:|:--:|:--:|:-----------:|-----------|
| Parse `graph/flowchart` + direction | ✓ | ✓ | ✓ | ✅ | 1, 5 |
| 5 core shapes (rect/round/stadium/diamond/parallelogram) | ✓ | ✓ | ✓ | ✅ | 6 |
| 9 additional shapes (cylinder/circle/double-circle/subroutine/hexagon/asymmetric/trapezoid×2/parallelogram-alt) | — | ✓ | ✓ | ✅ | parser test |
| 7 core edge types incl. round/crossed | ✓ | ✓ | ✓ | ✅ | 2, 10 |
| Edge labels (midpoint) | ✓ | ✓ | ✓ | ✅ | 2 |
| Edge labels (collision-aware) | — | — | ✓ | — | 12 |
| Fan-out `A & B --> C & D` | — | ✓ | ✓ | ✅ | parser test |
| Sugiyama layout phase 1–4 | ✓ | ✓ | ✓ | ✅ | 1–6 |
| Dummy node long-edge | ✓ | ✓ | ✓ | ✅ | 3 |
| Cycle removal (greedy-FAS) | ✓ | ✓ | ✓ | ✅ | 4 |
| Straight Manhattan routing | ✓ | ✓ | ✓ | ✅ | 1–6 |
| Orthogonal A* routing | — | — | ✓ | — | 13 |
| Subgraph parsing (flat, with id/label/direction) | — | ✓ | ✓ | ✅ | parser test |
| Subgraph cluster rendering (bbox + title) | — | ✓ | ✓ | ✅ | 7 |
| Subgraph nested 3+ | — | ✓ | ✓ | — | 8 |
| Cross-cluster edge routing | — | ✓ | ✓ | — | 7, 8 |
| classDef (parsed + CSS injection) | — | ✓ | ✓ | ✅ | 11 |
| `class` / `style` node statements | — | ✓ | ✓ | ✅ | 11, parser test |
| `linkStyle` | — | ✓ | ✓ | — | 11 |
| Markdown in label | — | — | ✓ | — | — |
| Animated edges | — | — | ✓ | — | — |
| Click href | — | — | ✓ | — | — |
| Disconnected components | — | ✓ | ✓ | — | 14 |
| Real ChatDiagram sample | ✓ | ✓ | ✓ | ✅ | 15 |

**结论：** 本 standard 定义的 Sugiyama 4-phase layout + 30 shape catalog + edge routing tiers + DSL grammar 共同驱动 M1/M2/M3 三个月的实现路径，目标是在 M3 完成后让 ChatDiagram 完全切换到 Schematex flowchart 渲染。Mermaid 兼容非目标，由 CD prompt 层直接输出 Schematex DSL 实现迁移。
