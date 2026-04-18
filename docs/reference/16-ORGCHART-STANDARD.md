# 16 — Org Chart Standard Reference (Comprehensive)

*Organizational chart / reporting structure / team diagram。面向 HR / People Ops / 创始人 / 咨询 / M&A / 新员工 on-boarding 场景的标准化公司汇报结构图。*

> **References (行业惯例 + 相关研究):**
> - **Reingold, E. M., & Tilford, J. S. (1981)** *Tidier Drawings of Trees*. IEEE Trans. on Software Engineering — 经典 tidy tree 布局算法（父节点居中于子节点群之上）
> - **Walker, J. Q. (1990)** *A node-positioning algorithm for general trees*. Software: Practice and Experience 20(7) — Reingold-Tilford 推广到任意度树 + 线性时间
> - **Buchheim, C., Jünger, M., & Leipert, S. (2002)** *Improving Walker's algorithm to run in linear time*. Graph Drawing LNCS 2528 — 修正 Walker 的二次最坏情形，确保 O(n)
> - **Mintzberg, H. (1979)** *The Structuring of Organizations*. Prentice-Hall — organizational design 经典文献，定义 line / staff / matrix 汇报概念
> - **Galbraith, J. R. (1971)** *Matrix organization designs*. Business Horizons 14(1) — matrix / dotted-line report 的原始定义
> - **Lucidchart / Pingboard / Organimi / OrgPlus / ChartHop / BambooHR org chart export 惯例** — 现代 SaaS 工具的 de-facto 渲染约定（compact 布局、photo 卡片、open position highlighting）
> - **SHRM (Society for Human Resource Management)** *Organizational Charts: Tips and Templates* — HR 行业的 org chart 内容约定（name + title + dept 三元组标配）
> - **SEC EDGAR proxy statements** *Officer & director disclosure tables* — 上市公司领导层结构的披露格式惯例
>
> 注：无单一 ISO / IEEE 标准统管 org chart 外观。本 standard 综合学术布局算法 + HR 行业惯例 + 主流 SaaS 工具约定，形成可程序化渲染的约束。

---

## 1. 用户与需求（第一性原理）

Org chart 是 Schematex 覆盖的所有图表中**商业意图最强**的品类之一（Ahrefs: `organizational chart` 美国 31K / 全球 110K 月搜，KD 55，CPC **$3.00**）。Mermaid 没有专用 org chart 语法，用户现状是用 `flowchart TD` 勉强模拟 —— 结果丑、没照片槽、没 title/dept 语义、宽度失控。这是一个**空白市场**。

### 1.1 用户画像

| 画像 | 场景 | 对"好"org chart 的要求 |
|------|------|----------------------|
| **HR Leaders / People Ops** | 发布在公司官网 / 年报 / 新员工手册 | 照片 + 职位 + 部门 + 可打印 + 品牌 theme |
| **新员工** | 入职 week 1 搞清楚 "谁向谁汇报"、"我的 skip-level 是谁" | 可搜索、高亮本人、展示 team 边界 |
| **创始人 / CEO（融资）** | Pitch deck 的 "The Team" slide | 清爽、照片精美、可展示投资人或顾问 |
| **M&A / 重组规划** | 展示 pre / post acquisition 组织结构 | 支持 vacant role、draft role（虚线） |
| **咨询 / OD specialist** | 组织设计、span-of-control 分析、重组方案 | 支持 matrix / dotted-line、支持 assistant、可导出 |
| **投资人 / 董事会** | 尽调、关键人风险评估 | 可见 open position、key-person dependency |

### 1.2 "好"的 org chart 必备特征

1. **视觉身份标识** — 每个 person 有明确可视锚点（头像/图标/首字母圆），不能只是一堆方块
2. **三元组 (name + title + department)** — 单独 name 信息量不足
3. **Dotted-line / matrix report** — 现代组织普遍矩阵化，纯树形失真
4. **Open position 高亮** — 招聘用、投资人看风险用
5. **Compact for large orgs** — 100+ 人的图不能一行排到天边
6. **Printable** — 许多 HR 场景仍要打印
7. **Semantic zoom / LOD** — 高层给 exec 看、下钻给部门看

### 1.2.1 身份标识策略：内置 Icon System（不做照片）

**决策（2026-04）：** v0.2 不做真实人像照片加载。理由：① 零 runtime dep 硬约束拒绝网络请求 ② 隐私敏感 ③ 打印 / SSR 场景不可用 ④ 大部分场景不需要真人脸，只需可辨识的视觉锚点。

改用**三级 icon system**，全部内置 SVG，零网络依赖：

| 层级 | 内容 | 来源 | 适用 |
|------|------|------|------|
| **L1 — Initials Avatar**（默认） | 彩色圆 + 2 字母首字母（从 name 取），背景色从 `palette` 按 name hash 确定性分配 | 自动生成 | 99% 场景，默认值 |
| **L2 — Role Icon** | 内置 ~15 个职能图标：CEO 皇冠 / CTO 齿轮 / CFO 美元符 / Engineer 扳手 / Designer 画笔 / Sales 手提包 / HR 人群 / Legal 天平 / Ops 齿轮组 / Marketing 喇叭 / Product 灯泡 / Data 柱状图 / Advisor 星 / Intern 学士帽 / Vacant 虚线头 | Schematex 内置 SVG symbol library | 想强调职能、看板风格、简化视觉 |
| **L3 — Gender Silhouette** | 男 / 女 / 中性 person 头像 | **直接复用 `src/diagrams/genogram/symbols.ts` 已有 SVG**（零增量开发） | 社工 / HR / 教育场景 |

**真人照片推迟到 v0.3+。** 真要做时，做法是：ChatDiagram 侧做 upload → CDN → data-URL，再把 data-URL 注入 DSL，Schematex 本身不触碰文件系统、不发网络请求。

**DSL 用法：**
```
CEO : "Alice Chen" | CEO | Executive [role: CEO]              # L2 (role icon)
CTO : "Bob Park"   | CTO | Engineering                        # L1 (initials BP fallback)
HR  : "Carol Liu"  | HR Director | People [icon: hr]          # L2 explicit icon
Admin : "Dan"      | Admin | Ops [silhouette: male]           # L3
```

### 1.3 与其他图的区别

- 不是 flowchart（flowchart 表达流程 / 逻辑分支；org chart 表达静态汇报树）
- 不是 genogram（genogram 是血缘关系 + 医学条件；org chart 是职务 / 汇报关系）
- 不是 entity structure（entity structure 是法律实体所有权；org chart 是自然人雇佣 + 管理关系）
- 不是 mindmap（mindmap 无结构约束；org chart 强制层级 + tidy tree）

---

## 2. 市场需求数据

| 关键词 | US 月搜 | 全球 月搜 | KD | CPC |
|--------|:-------:|:---------:|:---:|:----:|
| organizational chart | 31,000 | 110,000 | 55 | **$3.00** |
| org chart | 18,000 | 70,000 | 50 | $2.50 |
| org chart template | 8,500 | 25,000 | 40 | $3.20 |
| org chart maker | 4,400 | 14,000 | 45 | $4.10 |
| company organizational chart | 2,900 | 9,000 | 35 | $2.80 |
| org chart software | 1,600 | 6,000 | 55 | $8.50 |

**解读：** CPC $3.00 代表强商业意图（B2B SaaS 关键词的典型区间）。同时 Mermaid 无对应语法 + Lucidchart / OrgPlus 等工具都付费 —— Schematex 开源 + text-DSL + zero-dep 的组合，构成差异化切入。SEO landing page（`/organizational-chart-maker`、`/free-org-chart-template`）ROI 估计强。

这是 Schematex 新品类机会 **#2**（仅次于 Venn），实施成本 ~**2 周**。

---

## 3. Node 类型

Org chart 的核心是 **"人"** 这个单位，但不止人。同一张图可能出现 person、vacant role、team cluster、external advisor，视觉必须一眼可辨。

### 3.1 Node Type 汇总

| Node Type | Shape | 默认填充 | DSL 关键字 | 含义 |
|-----------|-------|----------|-----------|------|
| **Person** | 直角矩形（`<rect>` rx=6） | `--schematex-orgchart-person-bg` | `person` / 默认 | 在职员工 |
| **Vacant / Open Role** | 虚线圆角矩形 | `--schematex-orgchart-vacant-bg`（浅黄 + dashed border） | `role` / `open` | 空缺职位（招聘中） |
| **To-Be-Hired / Draft** | 虚线 + 半透明 opacity 0.6 | 同 person，但虚线边 | `draft` / `tbh` | 规划中、尚未开招 |
| **External Advisor / Contractor** | 虚线边框 + 灰底 | `--schematex-orgchart-external-bg` | `external` / `advisor` | 非正式雇员 |
| **Team / Group Cluster** | 包围型圆角矩形虚线框 | 透明，仅描边 | `team` / `cluster` | 部门 / 职能边界 |
| **Multi-Person Box** | 单卡片内叠 2-N 名字 | 同 person，高度扩展 | `group` | 多助理 / 同职级平行岗位压缩 |
| **Department Header** | 彩色条形卡片（pill） | palette 分配 | `department` | 部门名字头（非具体 person） |

### 3.2 Person 节点内容

**Full Card（宽度 200-240px，高度 110-140px）：**
- **Identity slot** — 左上 56px 圆形 icon（L1 initials / L2 role icon / L3 silhouette 三选一，见 §1.2.1）
- **Name** — 14px, 600 weight
- **Title** — 12px, 500 weight, `--schematex-orgchart-title`
- **Department** — 11px, 500 weight, 染色（按 department palette）
- **Metadata row（可选）** — 10px muted，显示 email / phone / start date / location
- **Status pill（可选）** — 右上角小 badge，如 "NEW"、"HIRING"、"PTO"

**Compact Card（宽度 160-180px，高度 64-80px）：**
- Identity icon 40px + name + title（一行）

**Mini Card（宽度 120-140px，高度 40px）：**
- 仅 name + 一行 title（无 icon，靠卡片 department 左侧色条区分）

**Icon-only Circle（直径 56px）：**
- 仅 identity icon + `<title>` hover tooltip 显示 name/title

见 §7 的 auto-downgrade 规则。

### 3.3 DSL for Node Definition

```
<id> : "<display name>" | <title> | <department?> [properties]
```

或 hierarchical（推荐，见 §6）：

```
CEO : "Alice Chen" | CEO | Executive [role: CEO]
  CTO : "Bob Park" | CTO | Engineering [role: CTO]
    EngMgr1 : "Carol Liu" | Eng Manager | Engineering
  CFO : "Dan Wei" | CFO | Finance [role: CFO]
```

**Vacant / Open Role:**
```
role OpenHead : "Head of Design" | Design [open: true, reports: CEO]
```

**External:**
```
advisor Jane : "Jane Smith" | Board Advisor [external: true]
```

---

## 4. 关系类型（Edge Types）

| Edge Type | Line Style | Arrow | DSL | 含义 |
|-----------|-----------|-------|-----|------|
| **Direct report** | 实线 1.5px | 可选 end arrow（默认无） | `A -> B` 或 hierarchy indent | 直属汇报 |
| **Dotted / matrix report** | 虚线 1.2px `stroke-dasharray="5,3"` | 可选 | `A -.-> B` 或 `matrix: A` | 矩阵 / dotted-line 汇报 |
| **Co-leaders** | 双线（两条水平线，gap 3px） | — | `A === B` | 联席 CEO / 轮值 |
| **Assistant / Staff** | 短水平分支 + 实线 | — | `A assistant-of B` | 助理侧挂（见 §5） |
| **Team cluster membership** | 无线，包围框 | — | `cluster "Team X" { ... }` | 归属同 team |

### 4.1 Label on Edge

- **Matrix edge** 可附 label 说明矩阵维度，如 "Product line"、"Regional"：
  ```
  CMO -.-> EUMarketingLead [label: "Regional matrix"]
  ```
- Label 位置：edge 中点，`10px, 500 weight`，白底 rx=2 轻 muted stroke 背景

### 4.2 Edge Routing

- **Primary tree**: orthogonal routing（绕直角拐弯），同一 parent 的 children 共享 branch Y（"E"-shape bus），与 entity-structure 一致
- **Matrix overlay**: 在主树之上用 **Bezier 曲线** 或带 corner-radius 的 orthogonal 路径绘制，**layer 位于主树之下**（mask 出 person card），避免视觉主导权争抢
- **Co-leader**: 两节点水平邻接，中间画双线

---

## 5. Layout Algorithms

Org chart 的核心布局是 **Tidy Tree**（tidy 二字指"不交叉、不重叠、子树居中于父节点下方"）。本 standard 采用 **Buchheim 2002 的线性时间 tidy tree** 作为主算法，并在其上提供若干布局变体。

### 5.1 Primary: Tidy Tree (Buchheim-Walker, O(n))

**算法两步走：**

1. **First walk（postorder）**: 自底向上递归，为每个子树计算：
   - `preliminary x`（相对父节点的初步 x 坐标）
   - `modifier`（子树整体要被 shift 的量）
   - `thread`（当子树深度不等时，用于 contour 比较的"虚拟兄弟"指针）
   - `ancestor`（用于 subtree shift 的 apportion 算法）
   - 核心子过程：`apportion(v, defaultAncestor)` 比较左侧兄弟的右轮廓 vs 当前子树的左轮廓，若冲突则水平 shift 当前子树并分摊（spread）给中间子树

2. **Second walk（preorder）**: 自顶向下累加 modifier，得到每个节点的最终 `x = preliminary + ancestor_modifiers_sum`

**Y 坐标：** 每个 tier 固定 y = `root_y + depth × tierGap`。`tierGap` 默认 140px（与 entity-structure 对齐）。

**关键 invariants：**
- 同 parent 的 children 水平居中于 parent 下方
- 同 tier 节点不重叠（通过 sibling separation ≥ `siblingGap`）
- 不同 subtree 不重叠（通过 subtree separation ≥ `subtreeGap`）
- 父节点居中于 extreme children 的中点（`x_parent = (x_leftmost_child + x_rightmost_child) / 2`）

**复杂度：** O(n)，n = 节点数。Walker 原始算法最坏 O(n²)，Buchheim 修复到 O(n)。对于 1000 人 org，布局耗时 < 50ms。

### 5.2 Top-Down Tree（默认方向）

- 根节点在顶部（CEO）
- Y 向下递增
- 适用：<50 人、层级 ≤ 5 的常见公司

### 5.3 Left-Right Tree（`direction: LR`）

- 根节点在左侧
- X 向右递增
- Tidy tree 算法同上，只是 x / y 互换
- 适用：**tall narrow org**（例如工厂层级深但每层窄）、文档竖向装订（A4 portrait）

### 5.4 Compact / Stacked Layout（关键：解决 wide org 问题）

**触发条件：** 某 parent 的 children 数量 > `compactThreshold`（默认 6）。

**变体 A: 2-Column Stack（Lucidchart / OrgPlus 惯例）**
- 12 个 children 在 parent 下方分为左右两列，每列 6 个垂直排列
- 每个 children 作为 **左挂 / 右挂的水平 branch**（不是向下的树边），parent 下方画一条中心垂直 "spine"，左右 children 水平挂在 spine 上
- 父→子边为 **orthogonal**：spine → 水平段 → children left/right edge
- 占用宽度从 `12 × nodeWidth` 压到 `~2.5 × nodeWidth`，压缩比 ~5×

**变体 B: List Stack（深度压缩）**
- 当超过 12 个 children 时，将其转为一列 vertical list（无缩进，同 tier 视觉堆叠）
- 每个 children 通过水平短线挂到 spine 上
- 适合展示扁平 team（如 "40 名工程师直属 CTO" 这种病态但真实的结构）

**变体 C: Grid Stack（网格压缩）**
- N 个 children 排为 `⌈√N⌉ × ⌈√N⌉` 网格
- parent→grid 单根引线
- 适合同质化 IC 团队快照

**选择策略：** 默认 Variant A（2-column）。DSL 可显式指定：
```
config : stackMode = "2col" | "list" | "grid"
```

### 5.5 Assistant Layout（侧挂）

灵感来自 Microsoft Organization Chart 的 "Assistant" shape 和 Lucidchart 的 "Assistant" layout。

**定义：** Assistant（EA / Chief of Staff / 秘书）**不作为 manager 的直属下属** 排列，而是 **水平侧挂在 manager 的一侧**。

**渲染：**
- Manager 节点正常
- Assistant 节点画在 manager **右侧**（默认）或左侧，y 相同或稍低（offset 0.3 × tierGap）
- 连接线：一条短水平线从 manager 右边中点出发到 assistant 左边中点
- **Assistant 不占用 manager 的 children row** —— 它的 direct reports 仍然横向展开（不被 assistant 吃掉空间）

**DSL：**
```
CEO : "Alice" | CEO
  assistant-of CEO : ChiefOfStaff "Rachel" | Chief of Staff
  CTO : "Bob" | CTO
  CFO : "Dan" | CFO
```

或 properties：
```
Rachel : "Rachel Kim" | Chief of Staff [assistant-of: CEO]
```

### 5.6 Multi-Parent / Matrix Layout（矩阵汇报）

**核心设计选择：主汇报（solid）决定 tidy tree 结构；matrix 汇报（dashed）作为 overlay 边**，不改变节点位置。

**原因：** 多父节点会破坏 tidy tree 单父假设。若把每个 matrix edge 视为等价父子关系，layout 退化为 DAG 布局（dagre / Sugiyama），失去 tidy tree 的视觉清晰。现代工具（Pingboard、ChartHop）全部采用 "一主多虚" 方案。

**渲染：**
1. 先按 solid edges 做 tidy tree 布局
2. 对每条 matrix edge `A -.-> B`，在主树之上绘制 Bezier 曲线
3. Bezier control points：
   - start = A 节点底中心（或最近边中点）
   - end = B 节点顶中心（或最近边中点）
   - control = (start.x, (start.y + end.y) / 2) 和 (end.x, (start.y + end.y) / 2)
4. Matrix edges 有独立的 z-order 层（在 person cards 之下 + solid edges 之上），用 mask 避开 card 区域
5. Matrix edges 建议 stroke-opacity 0.6 + dashed，视觉权重低于 solid

**复杂场景（多个 matrix edge 指向同一 target）：**
- 按 source 的 tier 排序，错开 control point 以避免线束重叠
- 可选 auto-bundling（边聚类）-- P3 优先级

---

## 6. DSL Grammar

### 6.1 设计原则

支持 **两种语法互通**：
1. **Hierarchical（indentation-based，YAML-like）** — 适合快速手写、直观表达层级
2. **Explicit edge list** — 适合从外部数据（CSV / HRIS export / JSON）生成，或需要 matrix edge 时

两种语法可混用：用 hierarchical 表达主树，用 explicit edge 表达 matrix / cross edges。

### 6.2 Hierarchical Syntax

```
<id> : "<name>" | <title> | <department> [properties]
  <child_id> : "<name>" | <title> | <department> [properties]
    <grandchild_id> : ...
```

**字段用 `|` 分隔**，前三字段有默认顺序：`name | title | department`。字段可省略，从右往左省略（即只写 name 也可）。

**示例：**
```
orgchart "Acme Tech · Q1 2026"

CEO : "Alice Chen" | CEO | Executive [role: CEO]
  CTO : "Bob Park" | CTO | Engineering [role: CTO]
    EngMgr1 : "Carol Liu" | Eng Manager, Platform | Engineering
      IC1 : "Dev A" | Senior SWE | Engineering
      IC2 : "Dev B" | SWE II | Engineering
    EngMgr2 : "Diana Zhu" | Eng Manager, Mobile | Engineering
  CFO : "Dan Wei" | CFO | Finance
  CMO : "Eve Lee" | CMO | Marketing
```

### 6.3 Explicit Edge Syntax

```
<parent_id> -> <child_id>         # direct report
<boss_id> -.-> <subordinate_id>   # matrix / dotted-line
<a> === <b>                       # co-leaders
<manager_id> <- assistant <id>    # assistant sidecar
```

**混合示例（主 tree 用 hierarchical，matrix 用 explicit）：**
```
CEO : "Alice" | CEO
  CTO : "Bob" | CTO
    EngMgrEU : "Fiona" | Eng Mgr EU | Engineering
  VPIntl : "Gwen" | VP International | Ops

VPIntl -.-> EngMgrEU [label: "Regional matrix"]
```

### 6.4 Properties

```
[property1, property2, ...]
```

| Property | 类型 | 含义 |
|----------|------|------|
| `role` | `CEO` \| `CTO` \| `CFO` \| `Engineer` \| `Designer` \| `Sales` \| `HR` \| `Legal` \| `Ops` \| `Marketing` \| `Product` \| `Data` \| `Advisor` \| `Intern` \| `Vacant` | 内置 role icon（L2），见 §1.2.1 |
| `icon` | string | 显式指定 icon 名（覆盖 `role`） |
| `silhouette` | `male` \| `female` \| `neutral` | 使用 genogram 的 gender silhouette（L3） |
| `initials` | string | 覆盖默认 initials（默认取 name 首字母 × 2） |
| `avatarColor` | hex | 覆盖 L1 initials avatar 的背景色（默认 hash(name) → palette） |
| `email` | string | 展示在 metadata row |
| `phone` | string | 同上 |
| `start` | ISO date | 入职日期 |
| `location` | string | "SF"、"Remote"、"Tokyo" |
| `open` | boolean | 空缺职位 → vacant shape |
| `draft` | boolean | 规划中 → 虚线 + opacity 0.6 |
| `external` | boolean | 非雇员 → 虚线灰底 |
| `assistant-of` | id | 侧挂到某 manager |
| `reports` | id | 显式 direct report 父节点（覆盖 hierarchy） |
| `matrix` | id 或 id list | 矩阵汇报目标（产生 dotted edge） |
| `department` | string | 部门（override `|` 字段） |
| `dept-color` | hex | 覆盖部门默认颜色 |
| `status` | `"new"` \| `"leaving"` \| `"on-leave"` | 右上角 pill |
| `label` | string | edge 上的说明（用于 matrix 边） |

### 6.5 Config Directives

```
config : direction = "TD" | "LR"          # top-down 或 left-right，默认 TD
config : cardMode = "full" | "compact" | "mini" | "auto"   # 默认 auto
config : compactThreshold = 6              # children 数超过几时触发 compact
config : stackMode = "2col" | "list" | "grid"  # 默认 2col
config : iconTier = "auto" | "initials" | "role" | "silhouette"   # 强制使用某一级 icon，默认 auto（优先 role → silhouette → initials）
config : departmentPalette = ["#...", ...] # 部门配色
config : highlightOpen = true              # 空缺职位是否黄色高亮
```

### 6.6 EBNF

```ebnf
document        = header? (config_def | cluster_def | node_def | edge_def)*
header          = "orgchart" quoted_string NEWLINE
                | "orgchart:" quoted_string NEWLINE

config_def      = "config" ":" config_key "=" config_value NEWLINE

cluster_def     = "cluster" quoted_string "{" NEWLINE node_def+ "}" NEWLINE

node_def        = (node_kind)? ID ":" node_fields properties? NEWLINE indented_children?
node_kind       = "person" | "role" | "advisor" | "external" | "draft"
                | "department" | "team"
node_fields     = quoted_string ( "|" field_text )*
field_text      = /[^|\[\n]+/

indented_children = INDENT node_def+ DEDENT

edge_def        = ID edge_op ID properties? NEWLINE
edge_op         = "->"       # direct report
                | "-.->"     # matrix / dotted-line
                | "==="      # co-leaders
                | "<-"       # reverse direct report
                | "<- assistant"  # assistant sidecar

properties      = "[" property ("," property)* "]"
property        = kv_prop
kv_prop         = IDENTIFIER ":" VALUE

ID              = /[a-zA-Z][a-zA-Z0-9_-]*/
IDENTIFIER      = /[a-zA-Z][a-zA-Z0-9_-]*/
VALUE           = quoted_string | /[^,\]\n]+/
quoted_string   = '"' /[^"]*/ '"'
INDENT          = /  +/      # ≥ 2 空格
```

---

## 7. Person Node Rendering（Card Layout）

### 7.1 四种 Card Mode

| Mode | Width × Height | 内容 | 适用规模 | Auto-trigger |
|------|:--------------:|------|:--------:|:------------:|
| **Full** | 220 × 130 | icon 56px + name + title + dept + 1-2 metadata | < 30 人 | n ≤ 30 |
| **Compact** | 180 × 72 | icon 40px + name + title（同行或两行） | 30 – 100 人 | 30 < n ≤ 100 |
| **Mini** | 140 × 44 | name + title（单行 12px，无 icon，dept 色条左侧） | 100 – 400 人 | 100 < n ≤ 400 |
| **IconOnly** | 56 × 56（circle） | 仅 icon + `<title>` tooltip | 400+ 或 overview | n > 400 |

### 7.2 Auto-Downgrade 规则

默认 `cardMode = "auto"`。算法：

1. 计算初步 tidy tree 布局（full card 假设）
2. 若 canvas width > `maxCanvasWidth`（默认 4000px）→ 降级到 compact
3. 再布局；若仍超宽 → 降级到 mini
4. 仍超宽 → 降级到 iconOnly
5. 全局统一一个 mode（不局部混合，避免视觉混乱）

用户可显式覆盖 `config : cardMode = "full"` 强制不降级（溢出由 viewBox + 滚动处理）。

### 7.3 Identity Slot（三级 icon system）

- **Shape**: 圆形 56px / 40px（full / compact），circle clip + 单色背景
- **Position**: 卡片左上角，距 card 左边 12px、上边 12px
- **三级 fallback 决策顺序**（见 §1.2.1）：
  1. 若 DSL 指定 `silhouette: male/female/neutral` → 渲染 **L3 gender silhouette**（复用 `src/diagrams/genogram/symbols.ts`）
  2. 若 `role` 或 `icon` 属性匹配内置 library → 渲染 **L2 role icon**（15 个 SVG symbol，如 CEO 皇冠 / Engineer 扳手）
  3. 否则 → 渲染 **L1 initials avatar**（首字母 × 2，背景按 name hash 或 dept palette）
- `config: iconTier` 可强制锁定某一级
- 所有 icon 都是内置 SVG，**不 fetch 任何网络资源**
- Mini / IconOnly mode 的处理：mini 无 icon，iconOnly 只有 icon + `<title>` tooltip

### 7.4 Department Color Coding

- 每个 unique department 从 palette 分配一个颜色
- 体现在 **3 处**：
  1. Card 左边 accent bar（4px 宽）
  2. Department label 文字色
  3. L1 initials avatar 背景色（若未显式指定 `avatarColor`，从 dept palette 取而非 name hash）
- Palette 默认 8 色（继承 `BaseTheme.palette`），超过 8 部门循环 + 适度扰动 hue
- 用户 DSL 可覆盖：`config : departmentPalette = ["#...", ...]`

### 7.5 Status Pill

右上角 12-16px 小 badge：
- `NEW` — 绿色，新入职 < 30 天（根据 `start` 属性或 `status: new`）
- `HIRING` — 用于 vacant role 的 card
- `LEAVING` — 灰色
- `ON LEAVE` — 灰底斜体

---

## 8. Theme 集成

沿用 `src/core/theme.ts` 的 **两层架构**（BaseTheme + Semantic Extension）。新增 **OrgchartTokens** 扩展：

```
OrgchartTokens {
  personCardBg         // card 背景
  personCardBorder     // card 边
  personCardTitle      // title 文字色
  personCardSubtitle   // department / metadata 文字色
  personCardAccent     // 左边 accent bar（继承 department color）
  vacantDash           // 空缺卡片的虚线 + 黄底 highlight
  vacantFill           // 空缺卡片填充
  matrixEdgeStroke     // matrix 边颜色
  matrixEdgeDash       // matrix 边 dash pattern，默认 "5,3"
  coLeaderGap          // 双线 co-leader 间距
  assistantEdgeStroke  // assistant 侧挂边颜色

  // Icon System (L1/L2/L3) — 见 §1.2.1
  initialsAvatarPalette   // L1 initials avatar 8 色 palette（按 name hash 分配）
  initialsAvatarFg        // L1 initials 文字色（通常 white 或 dark，按 bg 对比度自动）
  roleIconFg              // L2 role icon 前景色
  roleIconBg              // L2 role icon 背景圆色（通常 muted）
  silhouetteFill          // L3 gender silhouette 填充（复用 genogram PersonTokens）

  departmentPalette    // 部门 8 色 palette（可继承 BaseTheme.palette）
}
```

### 8.1 CSS Custom Properties

每个 token 暴露一个 `--schematex-orgchart-*` CSS variable：

| CSS Var | Default | 用途 |
|---------|---------|------|
| `--schematex-orgchart-card-bg` | `#ffffff` | person card 背景 |
| `--schematex-orgchart-card-border` | `#e5e7eb` | card 边 |
| `--schematex-orgchart-card-title` | `#111827` | name + title |
| `--schematex-orgchart-card-subtitle` | `#6b7280` | dept / metadata |
| `--schematex-orgchart-vacant-bg` | `#fef9c3` | 空缺黄底 |
| `--schematex-orgchart-vacant-border` | `#eab308` | 空缺黄边 |
| `--schematex-orgchart-matrix-stroke` | `#6b7280` | matrix 虚线色 |
| `--schematex-orgchart-dept-[N]` | palette[N] | 部门色 |

### 8.2 Resolver

- `resolveOrgchartTheme(name)` → 基于 `default` / `monochrome` / `dark` preset 的三个主题
- `monochrome` preset（黑白 / 学术 / 打印场景）：所有 dept 颜色变为灰阶 + hatched pattern 区分

---

## 9. 测试用例

### Case 1: 10-Person Startup Flat Org

```
orgchart "Acme Seed · 10 people"

CEO : "Alice Chen" | CEO | Executive
  CTO : "Bob Park" | CTO | Engineering
    Dev1 : "Carol" | Senior SWE | Engineering
    Dev2 : "Dan" | SWE | Engineering
    Dev3 : "Eve" | SWE | Engineering
  Ops : "Frank" | Head of Ops | Operations
    Ops1 : "Grace" | Ops Associate | Operations
  Sales : "Hank" | Head of Sales | Sales
    Sales1 : "Ivy" | AE | Sales
    Sales2 : "Jack" | SDR | Sales
```

**验证：**
- 1 root + 3 tier-2 + 6 tier-3
- 所有节点在 full card mode
- Engineering / Operations / Sales 三色 accent

### Case 2: Classic CEO → C-Suite → VP（30 人）

```
orgchart "Acme Series B · Leadership"

CEO : "Alice Chen" | CEO
  CTO : "Bob Park" | CTO
    VPEng : "Carol" | VP Engineering
    VPData : "Dan" | VP Data
  CFO : "Eve Li" | CFO
    VPFin : "Frank" | VP Finance
    Controller : "Grace" | Controller
  CMO : "Hank Wu" | CMO
    VPGrowth : "Ivy" | VP Growth
    VPBrand : "Jack" | VP Brand
  COO : "Kate" | COO
    VPOps : "Leo" | VP Ops
    VPSupport : "Mia" | VP Support
```

**验证：** 4 C-suite 均匀居中于 CEO 下方；每 C-suite 有 2 VP。tidy tree 不重叠、不交叉。

### Case 3: Wide Org（1 manager + 12 直接下属 → 触发 2-col compact）

```
orgchart "Engineering IC team under VP Eng"

VPEng : "Carol" | VP Engineering
  IC1 : "Dev 1" | SWE | Eng
  IC2 : "Dev 2" | SWE | Eng
  IC3 : "Dev 3" | SWE | Eng
  IC4 : "Dev 4" | SWE | Eng
  IC5 : "Dev 5" | SWE | Eng
  IC6 : "Dev 6" | SWE | Eng
  IC7 : "Dev 7" | SWE | Eng
  IC8 : "Dev 8" | SWE | Eng
  IC9 : "Dev 9" | SWE | Eng
  IC10 : "Dev 10" | SWE | Eng
  IC11 : "Dev 11" | SWE | Eng
  IC12 : "Dev 12" | SWE | Eng
```

**验证：** 12 > 6 threshold → 切换到 2-col stack；IC1-6 左列，IC7-12 右列，VPEng 上方中心 spine 下引。Canvas 宽度 ≈ 2.5 × cardWidth 而非 12 ×。

### Case 4: Matrix Report Overlay

```
orgchart "Matrix · Product × Region"

CEO : "Alice" | CEO
  CPO : "Bob" | CPO
    PMUS : "Carol" | PM US | Product
    PMEU : "Dan" | PM EU | Product
  COO : "Eve" | COO
    RegUS : "Frank" | Regional Head US | Ops
    RegEU : "Grace" | Regional Head EU | Ops

RegUS -.-> PMUS [label: "Regional matrix"]
RegEU -.-> PMEU [label: "Regional matrix"]
```

**验证：** 主 tree 由 `->` 构成；2 条 dashed Bezier overlay；label 在曲线中点白底。

### Case 5: Assistant Layout

```
orgchart "Exec + EA"

CEO : "Alice" | CEO
  CoS : "Rachel" | Chief of Staff [assistant-of: CEO]
  CTO : "Bob" | CTO
  CFO : "Dan" | CFO
```

**验证：** Rachel 渲染在 CEO 右侧（水平侧挂），不占用 CTO / CFO 的兄弟空间；CTO / CFO 居中于 CEO 下方。

### Case 6: Vacant Position Highlighted

```
orgchart "Open Head of Design"

CEO : "Alice" | CEO
  CTO : "Bob" | CTO
  CFO : "Dan" | CFO
  role OpenDesign : "Head of Design" | Design [open: true]
```

**验证：** OpenDesign 呈现黄底 + 虚线边 + "HIRING" pill；其他节点正常；layout 不为此节点保留特殊空间。

### Case 7: Multi-Branch Executive（2 C-Suite 子树对齐）

```
orgchart "Two-branch exec"

CEO : "Alice" | CEO
  CTO : "Bob" | CTO
    EngMgr1 : "C" | Eng Mgr
      Dev1 : "D" | SWE
      Dev2 : "E" | SWE
    EngMgr2 : "F" | Eng Mgr
  CMO : "G" | CMO
    GrowthLead : "H" | Growth Lead
    BrandLead : "I" | Brand Lead
```

**验证：** CTO 子树深度 3，CMO 子树深度 2；tidy tree 正确处理不等深度（thread pointer 发挥作用），两子树不重叠。

### Case 8: Co-Leaders

```
orgchart "Co-CEO structure"

CEO1 : "Alice" | Co-CEO
CEO2 : "Bob" | Co-CEO
CEO1 === CEO2

CEO1 -> CTO : "Carol" | CTO
CEO1 -> CFO : "Dan" | CFO
```

**验证：** CEO1 与 CEO2 水平邻接 + 中间双线；subtree 挂 CEO1（或共享）；layout 对称。

### Case 9: External Advisor

```
orgchart "Acme with advisors"

CEO : "Alice" | CEO
  CTO : "Bob" | CTO
  CFO : "Dan" | CFO

advisor Jane : "Jane Smith" | Board Advisor [external: true]
advisor Peter : "Peter Teel" | Board Advisor [external: true]
```

**验证：** Jane / Peter 以虚线灰底卡片浮在 CEO 同 tier 或侧面，明显区分正式员工。

### Case 10: Team Cluster

```
orgchart "Engineering teams"

cluster "Platform Team" {
  PlatLead : "Alice" | Eng Mgr | Platform
  PlatDev1 : "Bob" | SWE | Platform
  PlatDev2 : "Carol" | SWE | Platform
}

cluster "Mobile Team" {
  MobLead : "Dan" | Eng Mgr | Mobile
  MobDev1 : "Eve" | iOS SWE | Mobile
  MobDev2 : "Frank" | Android SWE | Mobile
}

CTO : "Gina" | CTO -> PlatLead
CTO -> MobLead
```

**验证：** 2 个 cluster 用虚线框包围，label 左上；CTO 挂两个 team 的 lead。

### Case 11: Department Color Coding

```
orgchart "Colored by dept"

CEO : "Alice" | CEO | Executive
  CTO : "Bob" | CTO | Engineering
  CFO : "Dan" | CFO | Finance
  CMO : "Eve" | CMO | Marketing
  CPO : "Frank" | CPO | Product
```

**验证：** 5 个部门分到 palette 前 5 色，每 card 左 accent bar 色对应；Executive / Engineering / Finance / Marketing / Product 文字色匹配。

### Case 12: Compact Mode（40 人 → auto downgrade）

```
orgchart "Series B · 40 people"
config : cardMode = "auto"
# ... 40 个 node ...
```

**验证：** n > 30 触发降级到 Compact（180×72），icon 40px。

### Case 13: Mini Mode（150 人）

```
orgchart "Series C · 150 people"
config : cardMode = "auto"
```

**验证：** 降级到 Mini（140×44），无 icon，靠 dept 色条区分。

### Case 14: IconOnly Mode（500 人 overview）

```
orgchart "Enterprise · 500 people"
config : cardMode = "iconOnly"
```

**验证：** 全部为 56px 圆形 icon（优先 role icon，fallback initials）；`<title>` 内含 name + title；canvas 可控。

### Case 15: Draft Future Org（M&A Post-Transaction）

```
orgchart "Acme Post-acquisition Org"

CEO : "Alice" | CEO
  CTO : "Bob" | CTO
  draft NewCRO : "TBD" | Chief Revenue Officer [draft: true]
  draft NewCPO : "TBD" | Chief People Officer [draft: true]
```

**验证：** NewCRO / NewCPO 虚线 + opacity 0.6；展示 "规划中尚未招聘"。

### Case 16: Left-Right Direction

```
orgchart "Tall narrow org · LR direction"
config : direction = "LR"

CEO : "Alice" | CEO
  VP : "Bob" | VP
    Dir : "Carol" | Director
      Mgr : "Dan" | Manager
        IC : "Eve" | SWE
```

**验证：** 树从左到右展开；每 tier 右移 `tierGap`；适合打印 portrait。

---

## 10. Implementation Plan（~2 weeks）

| Phase | Feature | 时长 | 依赖 |
|-------|---------|:----:|------|
| **P0.1** | Parser：hierarchical + explicit edge + properties | 2d | — |
| **P0.2** | AST + types 扩展：`PersonNode`, `RoleNode`, `TeamCluster`, `MatrixEdge`, `AssistantEdge` | 0.5d | P0.1 |
| **P0.3** | Tidy Tree Layout（Buchheim-Walker O(n)）— first walk + apportion + second walk | 4d | P0.2 |
| **P0.4** | Layout variants：top-down / left-right / 2-col stack / list / grid | 2d | P0.3 |
| **P0.5** | Assistant side-mount layout | 1d | P0.3 |
| **P0.6** | Card Renderer — full / compact / mini / iconOnly modes + auto-downgrade | 2d | P0.3 |
| **P0.7** | Icon System（L1 initials avatar + L2 role icon library 15 个 + L3 reuse genogram silhouette） | 1.5d | P0.6 |
| **P0.8** | Matrix edge overlay（Bezier + mask 避 card） | 2d | P0.3, P0.6 |
| **P0.9** | Department color + theme tokens + CSS vars | 0.5d | P0.6 |
| **P0.10** | Vacant / draft / external / status pill rendering | 0.5d | P0.6 |
| **P0.11** | Team cluster 虚线包围框 | 0.5d | P0.6 |
| **P0.12** | Co-leader double line | 0.5d | P0.6 |
| **P0.13** | Tests — 16 cases 视觉 + 结构断言 | 1d | All |
| **P0.14** | Docs + README example + landing page 文案种子 | 0.5d | All |

**Milestone breakdown:**
- **Week 1**: Parser + Layout（tidy tree + variants） + 基本 card renderer（P0.1 – P0.7）
- **Week 2**: Matrix edges + theme + specialized shapes + tests + polish（P0.8 – P0.14）

**Risk：** Buchheim apportion 算法实现坑较多（thread pointer、ancestor、first / default ancestor 逻辑）。预留 1 天 buffer 调试。

---

## 11. Open Questions / ⚠️ NEEDS VICTOR INPUT

### 11.1 ✅ Icon System 决策（2026-04 已锁定）

原 "Photo loading strategy" 问题关闭。v0.2 **不支持真实照片**，改用三级内置 icon system（见 §1.2.1）。零网络依赖、零隐私风险、符合硬约束、复用 genogram 资产。

**未解决的次级问题：**
- **Role icon 命名 convention：** DSL 里 `role: CEO` vs `role: ceo` vs `role: "Chief Executive"` — 倾向 case-insensitive + 预设白名单 15 个。自定义 role 走 `icon: <custom-name>` 通道（L2 的扩展）。
- **L1 initials 的 fallback**：name 含非拉丁字符（中文、日文、emoji）时，initials 怎么取？倾向：中文取第一个字（单字 avatar），日文同理，emoji 直接保留为 avatar。需要测试 case 覆盖。
- **v0.3+ 真实照片怎么接入：** 建议 ChatDiagram 侧做 upload workflow，把图片转成 data-URL 注入 DSL 的 `photo: data:image/png;base64,...`。Schematex 本身只支持 data-URL 一种来源，拒绝 http(s) URL（强制零网络）。

### 11.2 Privacy — 已简化

v0.2 无真实照片，无 GDPR/CCPA/肖像权风险。v0.3+ 接 data-URL 时，再加入 README 一句"图片来源由集成方负责合规"即可。

### 11.3 "Too big" 阈值

Auto-downgrade 到 mini / iconOnly 的触发阈值 30 / 100 / 400 是经验值。实际测试前需调整。

**⚠️ NEEDS VICTOR INPUT：**
- 阈值应以 **节点数** 还是 **canvas 宽度** 为主？（建议：双条件 OR，canvas > 4000px 或 n > 100 → mini）
- 移动端（< 768px viewport）是否强制 mini mode？（建议：是，但由消费者 config）

### 11.4 Data Import Format

若要让 HR 用户从 BambooHR / Workday / Rippling / Google Sheets 导入，需要定义 **CSV → DSL** 转换约定。

**⚠️ NEEDS VICTOR INPUT：** CSV import 功能是否纳入 Schematex 核心？还是作为 ChatDiagram / MyMap 上层能力？（建议：后者，保持零依赖）

### 11.5 Export

- SVG → PNG（print）：是否开箱即用？（需要 server-side 或 canvas polyfill）
- SVG → PDF：同上
- 可打印 A3 / A4 / 横版拼接（大 org）

**⚠️ NEEDS VICTOR INPUT：** 打印 / 导出是 library 还是集成产品的职责？（建议：集成产品。Library 确保输出的 SVG 是 print-friendly：所有 color 可 monochrome 化、text 不依赖 web font fallback）

### 11.6 Interactivity Hooks

对标 Pingboard 的 "click person → side panel"：

- `data-person-id` on card
- `data-manager-id` on card
- `data-department` on card
- CSS `.schematex-orgchart-person:hover` 由消费者定制

**⚠️ NEEDS VICTOR INPUT：** 是否内置 search / filter JS helper？（建议否，保持零 runtime）

---

## 12. Accessibility

- 每个 SVG 必须带 `<title>` + `<desc>`
- 每个 person card 附加 `<title>`，screen reader 读出 "Name, Title, Department"
- Identity icon `<g>` 必须有 `<title>` / `aria-label="{name}, {title}"`
- ARIA: `role="graphics-document"` on SVG，`role="graphics-symbol"` on each card
- Matrix edge 附 `<title>` 描述关系（"Matrix report: X to Y"）
- 颜色 **不可单独承载语义**（部门色必须搭配文字 label；open role 必须搭配 "HIRING" pill）

---

## 13. Coverage Matrix

验证本 standard 对 16 个 test case 的完整覆盖：

| Feature | C1 Startup | C2 C-Suite | C3 Wide | C4 Matrix | C5 Assist | C6 Vacant | C7 Multi | C8 Co-CEO | C9 Advisor | C10 Cluster | C11 Dept | C12 40p | C13 150p | C14 500p | C15 Draft | C16 LR |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Person full card | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | ✓ | ✓ |
| Compact card | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| Mini card | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — |
| IconOnly mode | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — |
| Tidy tree layout | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| 2-col stack compact | — | — | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Assistant sidecar | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| Vacant role | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| Draft / TBH | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| External advisor | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| Team cluster | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Co-leader double line | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — |
| Matrix edge overlay | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| Department color | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — |
| Identity icon (L1/L2/L3) | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |
| Status pill (HIRING) | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| Left-right direction | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ |
| Multi-depth subtrees | — | ✓ | — | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — | ✓ |

**结论：** 本 standard 定义的 node types / edge types / 4 种 card mode / tidy tree + 变体 / matrix overlay / assistant sidecar / theme tokens / DSL grammar 共同覆盖 16 个 test case 的全部视觉与布局需求，可直接驱动 parser + layout + renderer 实现 `src/diagrams/orgchart/`。

---

## 14. Interaction Hooks (future)

- `data-person-id` / `data-manager-id` / `data-department` on each card
- `data-matrix-source` / `data-matrix-target` on matrix edges
- `data-open="true"` on vacant roles
- `data-card-mode="full|compact|mini|iconOnly"` on SVG root
- CSS: `.schematex-orgchart-person:hover`, `.schematex-orgchart-dept-{name}`, `.schematex-orgchart-matrix-edge:hover`
- 预留 search hook：消费者可通过 `data-person-id` 选择并高亮 `[data-matches="search"]`

---

## 15. 商业化备注（Non-Normative）

- **Landing page 建议：** `/organizational-chart-maker`、`/free-org-chart-template`、`/mermaid-alternative-for-org-chart`
- **Key differentiators vs Mermaid flowchart hack：**
  1. 真正的 tidy tree 布局（不是 dagre 的 "flowchart 模拟 tree"）
  2. 内置 icon(L1/L2/L3) / title / department 三元组语义
  3. Compact / 2-col stack auto-layout for wide orgs
  4. Matrix / dotted-line 原生支持
  5. 零 runtime dep → 可嵌入任何前端
- **Key differentiators vs Lucidchart / Organimi / Pingboard：**
  1. Text DSL + diff-friendly（git commit 友好）
  2. 开源 MIT
  3. ChatDiagram / MyMap AI 生成无缝集成
- **集成路径：** ChatDiagram `/org-chart` 作为付费用户专属高级图表类型；MyMap "团队页" 视觉。
