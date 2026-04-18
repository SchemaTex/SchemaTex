# 12 — Entity Structure Standard Reference (Comprehensive)

*Corporate ownership / legal entity / tax structure 图表。面向法务、税务、M&A、VC/PE、家族办公室、遗产规划的标准化公司架构图。*

> **References (行业惯例 + 相关标准):**
> - **SEC Regulation S-K, Item 601(b)(21)** — 上市公司 Exhibit 21 子公司披露格式约定
> - **IRS Form 8832** — Entity Classification Election（C-Corp / pass-through / disregarded entity 分类）
> - **ISO 3166-1 alpha-2** — 国家/地区代码（用于 jurisdiction badge）
> - **ISO 20275:2017** — Legal Entity Identifier (LEI) 中的 Entity Legal Forms 分类框架
> - **OECD Transfer Pricing Guidelines (2022)** — 跨境 IP 许可 / royalty / service fee 在架构图中的表达惯例
> - **ACTEC Fundamentals of Estate Planning (2023)** — 信托 / grantor / trustee / beneficiary 角色在架构图中的标准表达
> - **Big 4 税务备忘录惯例**（EY / PwC / KPMG / Deloitte） — 跨境税务结构图的 de-facto 标准
> - **Carta / Pulley cap table visualization conventions** — 股权表可视化的现代实践
>
> 注：无单一 ISO/IEEE 标准统管 entity structure 图表，本 standard 综合上述来源 + 从业者实践，形成可程序化渲染的约定。

---

## 1. Structure

Entity structure diagram 表达 **法律实体之间的所有权 / 控制关系 / 角色关系**。由三层组成：

1. **Entity 节点** — 每个法律实体（公司、LLC、合伙、信托、基金会、自然人）
2. **关系边** — 所有权（%）、控制、管理、分配、许可、服务
3. **司法辖区分组（可选）** — 按 jurisdiction 将 entity 聚类显示

**典型用途：**
- 法务：公司架构尽职调查、股东结构梳理、合同相关方关系
- 税务：跨境税务规划、转移定价结构、pre/post transaction 对比
- M&A：交易步骤图、重组前后对比、blocker corp 结构
- VC/PE：股权表、fund structure、portfolio holdings
- 家族办公室：信托结构、遗产规划、资产隔离 LLC
- 上市公司：Exhibit 21 subsidiaries 可视化

**与其他图的区别：**
- 不是 genogram（genogram 是血缘关系 + 性别符号；entity structure 是法律/经济所有权 + 实体类型符号）
- 不是 org chart（org chart 是 HR 管理汇报关系；entity structure 是法律实体所有权）
- 不是 flowchart（flowchart 是流程，entity structure 是静态所有权快照）

---

## 2. Entity Types

Entity structure 的核心是 **视觉上区分实体类型**。同一画面可能出现 C-Corp、LLC、LP、Trust、Individual，每种法律形式有不同的税务处理和责任保护，视觉必须立刻可辨。

### 2.1 Entity Type 符号约定

| Entity Type | Shape | SVG 实现 | 默认填充 | DSL 关键字 |
|-------------|-------|----------|---------|-----------|
| **Corporation** (C-Corp, S-Corp, Inc., Ltd., SA, AG, KK) | 直角矩形 | `<rect>` 160×60, sharp corners | `#dbeafe` (蓝底) | `corp` |
| **LLC** (Limited Liability Company, LLP, GmbH, BV) | 圆角矩形 | `<rect>` 160×60, rx=8 | `#dcfce7` (绿底) | `llc` |
| **Limited Partnership** (LP, LLLP, Fund) | 带斜切角矩形 | `<polygon>` 切掉左上右上角 | `#fef9c3` (黄底) | `lp` |
| **Trust** | 椭圆 | `<ellipse>` rx=100, ry=40 | `#ede9fe` (紫底) | `trust` |
| **Individual / Natural Person** | 圆形 | `<circle>` r=30-35 | `#fed7aa` (橙底) | `individual` / `person` |
| **Foundation / NPO** | 上指五边形（盾形） | `<polygon>` pentagon | `#fef9c3` (金底) | `foundation` |
| **Disregarded Entity / Branch** | 虚线矩形 | `<rect>` + stroke-dasharray="5,3" | `#f5f5f5` (灰底) | `disregarded` / `branch` |
| **To-Be-Formed / Target** | 虚线边框 + 半透明 | `<rect>` + stroke-dasharray + opacity 0.6 | 原色 + alpha | `placeholder` / `tbf` |
| **Reserved Pool** (ESOP, option pool) | 虚线圆角矩形 | `<rect>` rx=6 + stroke-dasharray | `#f1f5f9` (灰底) | `pool` |

### 2.2 节点尺寸与内容

每个 entity 节点包含：
- **Shape**（见上表）
- **Entity name**（12px, 600 weight, centered）
- **Entity type label**（10px, 500 weight, centered below name）
- **Jurisdiction badge**（2-letter ISO 3166-1 alpha-2, 9px, 右上角 18×12 带边框）
- **Tax classification label**（可选，10px, 左下角）
- **Issuance/formation date**（可选，italic, 10px）

**默认尺寸：**
- Corp / LLC / LP / Disregarded: 160 × 60
- Trust: 椭圆 rx=100, ry=40
- Individual: 圆形 r=30（普通）/ r=35（grantor/主角）
- Foundation: 五边形 width 140, height 70

### 2.3 填充色（按税务分类）

颜色驱动由 `--lineage-entity-*` CSS custom properties，消费者可完全覆盖。默认 palette：

| CSS Variable | Default | 税务含义 |
|--------------|---------|----------|
| `--lineage-entity-ccorp` | `#dbeafe` | 课税主体（C-Corp） |
| `--lineage-entity-passthrough` | `#dcfce7` | 透过课税（LLC, LP, S-Corp） |
| `--lineage-entity-trust` | `#ede9fe` | 信托 |
| `--lineage-entity-individual` | `#fed7aa` | 自然人 |
| `--lineage-entity-disregarded` | `#f5f5f5` | 税务忽略实体（DRE） |
| `--lineage-entity-foundation` | `#fef9c3` | 非营利 / 基金会 |
| `--lineage-entity-pool` | `#f1f5f9` | 预留池（非独立实体） |

### 2.4 DSL for Entity Definition

```
entity <id> "<display name>" <type>@<jurisdiction> [properties]
```

示例：
```
entity parent "Acme Global, Inc." corp@DE
entity ie-holdco "Acme Ireland Holdings" corp@IE
entity ie-ip "Acme IP Ltd" corp@KY [tax: ccorp]
entity smith-trust "Smith Family Irrevocable Trust" trust@DE [est: "2024-03-15"]
entity alice "Alice Chen" individual [role: "CEO"]
entity esop "ESOP Pool" pool [note: "reserved, unissued"]
```

---

## 3. Jurisdiction Badge

### 3.1 Jurisdiction Code

2-letter codes per **ISO 3166-1 alpha-2**。常见缩写：

| Code | 全名 | Code | 全名 |
|------|------|------|------|
| US | United States (national) | IE | Ireland |
| DE | Delaware (US sub-national, special) | NL | Netherlands |
| CA | California / Canada (context) | LU | Luxembourg |
| NY | New York (US sub-national) | KY | Cayman Islands |
| UK | United Kingdom | BM | Bermuda |
| SG | Singapore | VG | British Virgin Islands |
| HK | Hong Kong | JE | Jersey |
| CN | China (mainland) | GG | Guernsey |
| JP | Japan | PA | Panama |
| BVI | BVI (3-letter exception) | CH | Switzerland |

**注：** US 州级（Delaware, Wyoming, Nevada）在美国法务/税务场景中极为常见，视为 "sub-national jurisdiction"，允许使用 2-letter 州代码（DE, WY, NV, NY, CA）作为 jurisdiction badge。DSL 必须明确标注是州还是国家，如 `@DE` 默认优先解析为 Delaware（法务场景最常见）。

### 3.2 Badge 渲染

- 位置：节点右上角
- 尺寸：18 × 12（2 字母）/ 24 × 12（3 字母，如 BVI）
- 背景：白色填充 + 1px muted stroke
- 字体：9px, 600 weight, letter-spacing 0.5px
- 圆角：rx=2

---

## 4. Ownership Edges

### 4.1 Edge Types

| Edge Type | Line Style | Arrow | DSL Syntax | 含义 |
|-----------|-----------|-------|-----------|------|
| **Ownership** (标准股权) | 实线 (1.5px) | End arrow | `parent -> child : 100%` | 持股，默认 |
| **Preferred / Special class** | 实线蓝色 | End arrow | `vc -> acme : 20% [class: "Series A Pref"]` | 优先股 |
| **Option Pool** | 虚线灰色 | End arrow | `esop -.-> acme : 10%` | 预留期权池 |
| **IP / Service License** | 紫色虚线 | End arrow | `ip -~-> opco [label: "IP License"]` | 非股权关系 |
| **Management / Trustee role** | 紫色虚线 | End arrow | `trustee -~-> trust [label: "Manages"]` | 非所有权角色 |
| **Distribution** (trust → beneficiary) | 绿色虚线 | End arrow | `trust --> beneficiary [label: "Distributions"]` | 资金/资产分配 |
| **Settlement** (grantor → trust) | 实线 | End arrow | `grantor -> trust [label: "Settles"]` | 设立、注资 |
| **Voting-only control** | 双线 | End arrow | `ctrl ==> target : V 100% / E 0%` | 仅投票权 |

### 4.2 Ownership Percentage Labels

- **默认显示**：所有 ownership edge 必须带 % 标签
- **100% 的显示**：默认显示 "100%"；可配置 `showHundredPercent: false` 隐藏（常见于 blocker 结构图，减少视觉噪音）
- **V / E 分离**（voting vs economic 权益分离）：
  ```
  parent -> sub : V 75% / E 50%
  ```
  渲染为 `V 75% / E 50%`，两行或一行由配置决定。
- **Share class**：
  ```
  vc -> acme : 20% [class: "Series A Pref"]
  ```
  渲染：主标签 `20%`，副标签 `Series A Pref`（10px muted）。

### 4.3 Edge Path Routing

继承 Lineage 的 **orthogonal routing** 惯例（与 genogram parent-child edge 相同）：

1. 从 parent 节点底部中心出发（`parent_x, parent_y + height/2`）
2. 垂直向下到 **branch Y**（介于 parent bottom 和 child top 的中点）
3. 水平移动到 child 中心 X
4. 垂直向下到 child 顶部（`child_x, child_y - height/2`）

多个 child 共享同一 branch Y，形成典型的 "E"-shape bus。

**特殊情况：**
- 若 child 与 parent X 对齐：退化为直线
- 若为 sibling 汇聚（多 source → 单 target，如 cap table）：反向路由，source 下接 branch bar，branch bar 汇到 target top
- 若为非层级（如 trustee 在 trust 右侧）：水平直线

### 4.4 Edge Label Rendering

- 位置：在 branch 水平段中心，上方 2px 处
- 背景：白色 fill，轻 muted stroke（防止与 edge 重叠时不可读）
- 字体：10px, 600 weight（主）/ 9px, 500 weight（sub label，如 share class）
- 圆角：rx=2-3
- Padding: 水平 4px, 垂直 2px

---

## 5. Jurisdiction Cluster (Optional)

当结构跨越多个司法辖区，用 **虚线矩形框** 分组同一辖区的实体，帮助读者立刻识别区域结构。

### 5.1 Cluster Rendering

- **Shape**: `<rect>` 虚线描边，stroke-dasharray="6,4", stroke 1.2px
- **Color**: 可按辖区大区分配（US = 蓝 / EU = 绿 / Asia = 红 / 其他 = 中性灰）
- **Label**: 左上角，11px, 600 weight, letter-spacing 0.5px；背景白色小矩形避免与 cluster border 重叠
- **Padding**: cluster 内 entity 四周留 20-30px

### 5.2 DSL

```
jurisdiction <code> "<display name>" [color: <hex>]
```

示例：
```
jurisdiction US "United States" [color: "#3b82f6"]
jurisdiction IE "Ireland" [color: "#059669"]
jurisdiction SG "Singapore" [color: "#dc2626"]

entity parent "Acme Global" corp@US
entity ie-holdco "Acme Ireland" corp@IE
...
```

当 entity 的 `@jurisdiction` 在声明过 `jurisdiction` 定义的辖区时，自动被纳入该 cluster 渲染。若 `jurisdiction` 未声明，则只显示 badge 不画 cluster。

### 5.3 混合辖区 Cluster

允许一个 cluster 包含多个 jurisdiction（例如 "Ireland / Cayman IP Structure" 包含 IE + KY entities）：

```
cluster "Ireland / Cayman IP" [members: ie-holdco, ie-ip, nl-bv, color: "#059669"]
```

---

## 6. Pre/Post-Transaction Comparison

M&A、重组、信托设立场景经常需要并排显示 **事件前 / 事件后** 的结构。

### 6.1 Rendering Modes

**Mode A: Side-by-side（外部 HTML 并排）**
- 两份独立 SVG，左侧 "Pre-Transaction"，右侧 "Post-Transaction"
- 标题区分

**Mode B: 单图 diff 注记（小型 delta）**
- 单 SVG，对变动实体加 delta 注记：
  - **新建 entity**：绿色描边 (stroke #059669) + 左上角 "NEW" 标签
  - **消灭 entity**：红色描边 + 对角线划掉 + "ELIMINATED" 标签
  - **变更所有权**：黄色描边 + 边旁标注 "was X% → now Y%"
  - **未变化**：默认样式

### 6.2 DSL for Transaction Delta

```
entity newsub "NewSubCo, LLC" llc@DE [status: new]
entity oldsub "OldSubCo, Inc." corp@DE [status: eliminated]
entity changed "ChangedCo" corp@DE [status: modified]

parent -> changed : was 50% -> 100%
```

---

## 7. Layout Rules

### 7.1 Tier-Based Hierarchy (默认)

1. **Topological sort** — 按所有权方向（parent → child）拓扑排序所有 entity；无环（所有权环由 Cross-ownership 专门处理，见 7.4）
2. **Tier 分配** — 每个 entity 的 tier = max(所有 parent 的 tier) + 1
3. **同 tier 水平居中** — 同 tier 内的 entity 按首次出现顺序从左到右排列，居中对齐
4. **Tier 间垂直间距** — 默认 130px（层间给足空间画 ownership % 标签）

### 7.2 Width Calculation

- 每个 entity 默认占 200px 宽度（含 padding 20px）
- Tier 宽度 = Σ entity 宽度
- Canvas 宽度 = max(所有 tier 宽度) + 2 × 50px padding

### 7.3 Horizontal Alignment

- 当 parent 有多个 child 时，parent 水平居中于 children 的中点
- 当 child 有多个 parent 时（cap table 场景），child 水平居中于 parents 的中点

### 7.4 Special Layouts

**Cap Table 模式（多 source → 单 target）**：
- 所有股东（individual + LP + pool）位于顶层 tier
- 目标公司位于底层，居中
- Branch bar 位于 tier 之间，汇聚多条 edge

**Trust 模式（核心 + 辐射）**：
- Grantor 位于 Top
- Trust 位于 Tier 2 正中（椭圆）
- Trustee 位于 Trust 右侧（同 tier，不在层级链条中）
- Beneficiaries 位于 Trust 左侧（同 tier，接收 distribution）
- Trust 下方 tier：Family LLC → Asset LLCs

**Cross-ownership（两实体互持）**：
- 特殊情形，用 **双向箭头** 或 **分两个 edge** 表达
- 不破坏 tier，用 S-curve 边路由绕行

### 7.5 Spacing Rules

| Parameter | Default | 含义 |
|-----------|---------|------|
| Tier vertical gap | 140px | Tier 之间垂直距离 |
| Entity horizontal gap | 50px | 同 tier 内 entity 水平间距 |
| Node width (Corp/LLC/LP) | 160-180px | 默认节点宽度 |
| Node height | 60px | 默认节点高度 |
| Trust ellipse rx / ry | 100 / 40 | 椭圆半径 |
| Individual circle radius | 30 (普通) / 35 (主角) | 圆形半径 |
| Jurisdiction badge | 18 × 12 | 右上角 badge 尺寸 |
| Canvas padding | 40px | 画布边距 |
| Cluster padding | 25px | Cluster 内部留白 |

---

## 8. DSL Grammar (EBNF)

```ebnf
document        = header (jurisdiction_def | cluster_def | entity_def | edge_def)* legend?
header          = "entity-structure" quoted_string NEWLINE
                | "entity-structure:" quoted_string NEWLINE

jurisdiction_def = "jurisdiction" CODE quoted_string properties? NEWLINE

cluster_def     = "cluster" quoted_string properties? NEWLINE

entity_def      = "entity" ID quoted_string ENTITY_TYPE ("@" CODE)? properties? NEWLINE

edge_def        = ID edge_op ID (":" percentage)? properties? NEWLINE

edge_op         = "->"       # standard ownership (solid arrow)
                | "==>"      # voting-only control (double line arrow)
                | "-.->"     # dashed ownership (pool, conditional)
                | "-~->"     # licensing / service / management (purple dashed)
                | "-->"      # distribution (green dashed, when context is trust)

ENTITY_TYPE     = "corp" | "llc" | "lp" | "trust" | "individual" | "person"
                | "foundation" | "disregarded" | "branch"
                | "placeholder" | "tbf" | "pool"

CODE            = /[A-Z]{2,3}/   # ISO 3166-1 alpha-2 or 3-letter exception (BVI)

percentage      = /[0-9]+(\.[0-9]+)?%/
                | "V" ws /[0-9]+%/ "/" "E" ws /[0-9]+%/   # V/E split

properties      = "[" property ("," property)* "]"
property        = "class:" quoted_string            # share class
                | "label:" quoted_string            # edge text label
                | "status:" STATUS                  # new | eliminated | modified
                | "tax:" TAX_CLASS
                | "est:" quoted_string              # formation date
                | "role:" quoted_string             # for individuals
                | "note:" quoted_string
                | "color:" HEX
                | "members:" "[" ID_LIST "]"        # for cluster def
                | kv_prop

STATUS          = "new" | "eliminated" | "modified" | "normal"
TAX_CLASS       = "ccorp" | "passthrough" | "scorp" | "trust"
                | "disregarded" | "foundation" | "individual"

ID              = /[a-zA-Z][a-zA-Z0-9_-]*/
HEX             = /#[0-9a-fA-F]{3,8}/
quoted_string   = '"' /[^"]*/ '"'
```

---

## 9. Test Cases

### Case 1: PE 控股结构（3 层 · 4 实体 · 全 Delaware）

对应 sample `01-pe-holding.svg`。演示 LP → Blocker Corp → 3 portfolios 的典型 PE 控股结构。

```
entity-structure "Acme Holdings Fund I — Portfolio Structure"

entity lp "Acme Holdings Fund I" lp@DE
entity blocker "Acme Blocker Corp" corp@DE
entity widgets "Acme Widgets, Inc." corp@DE
entity services "Acme Services, LLC" llc@DE
entity intl "Acme International, Inc." corp@DE

lp -> blocker : 100%
blocker -> widgets : 100%
blocker -> services : 100%
blocker -> intl : 100%
```

**验证要点：**
- LP 节点呈现斜切角矩形（区别于 Corp 直角、LLC 圆角）
- 所有节点带 "DE" jurisdiction badge
- 3 个 children 从 Blocker 的同一 branch bar 分叉
- 每个 edge 带 "100%" 标签

### Case 2: 初创公司股权表（Post-Series A · 5 类股东 → 1 C-Corp）

对应 sample `02-startup-captable.svg`。演示多 source → 单 target 的 cap table 布局。

```
entity-structure "Acme Technologies, Inc. — Cap Table (Post-Series A)"

entity alice "Alice Chen" individual [role: "Co-founder · CEO"]
entity bob "Bob Martinez" individual [role: "Co-founder · CTO"]
entity carol "Carol Wei" individual [role: "Co-founder · VP Eng"]
entity vc "Sequoia Fund XX" lp@DE
entity esop "ESOP Pool" pool [note: "reserved, unissued"]
entity acme "Acme Technologies, Inc." corp@DE [note: "Fully diluted: 10M shares"]

alice -> acme : 30% [class: "Common"]
bob -> acme : 25% [class: "Common"]
carol -> acme : 15% [class: "Common"]
vc -> acme : 20% [class: "Series A Pref"]
esop -.-> acme : 10% [class: "Option Pool"]
```

**验证要点：**
- 5 个 source 位于同一 tier（顶层）
- Individual 渲染为圆形 + 下方姓名 + 角色标签
- ESOP 为虚线圆角矩形（灰色填充）
- VC (LP) 为斜切角矩形
- Series A Pref 的 edge 和 label 为蓝色加粗（区别普通股）
- Option Pool 的 edge 为虚线
- 所有 edge 汇聚到底层 C-Corp

### Case 3: 跨境税务架构（5 辖区 · 带 IP licensing）

对应 sample `03-international-tax.svg`。演示 jurisdiction cluster + 非所有权关系。

```
entity-structure "Acme Global — International Holdings Structure"

jurisdiction US "United States" [color: "#3b82f6"]
jurisdiction IE "Ireland" [color: "#059669"]
jurisdiction KY "Cayman Islands" [color: "#059669"]
jurisdiction NL "Netherlands"
jurisdiction SG "Singapore" [color: "#dc2626"]

cluster "Ireland / Cayman IP" [members: [ie-holdco, ie-ip, nl-bv], color: "#059669"]
cluster "Singapore APAC" [members: [sg-holdco, sg-apac], color: "#dc2626"]

entity parent "Acme Global, Inc." corp@DE [note: "Ultimate Parent"]
entity ie-holdco "Acme Ireland Holdings" corp@IE
entity sg-holdco "Acme Singapore Pte" corp@SG
entity ie-ip "Acme IP Ltd" corp@KY [note: "holds group IP"]
entity nl-bv "Acme EU Distribution" corp@NL [note: "EMEA ops"]
entity sg-apac "Acme APAC Trading" corp@SG [note: "APAC ops"]

parent -> ie-holdco : 100%
parent -> sg-holdco : 100%
ie-holdco -> ie-ip : 100%
ie-holdco -> nl-bv : 100%
sg-holdco -> sg-apac : 100%

ie-ip -~-> nl-bv [label: "IP License · royalty"]
```

**验证要点：**
- US / Ireland-Cayman / Singapore 3 个 cluster 用虚线框包围，不同颜色
- 每个 entity 带正确 jurisdiction badge（DE / IE / SG / KY / NL）
- IP License 边为紫色虚线（区别所有权边的黑色实线）
- 3 tier 层级清晰，父子关系正确

### Case 4: 家族信托架构（Grantor + Trust + Trustee + Beneficiaries + Asset LLCs）

对应 sample `04-family-trust.svg`。演示 trust 模式 + 3 种语义边（ownership / distribution / management）。

```
entity-structure "Smith Family — Trust & Asset Holding Structure"

entity grantor "John Smith" individual [role: "Grantor / Settlor"]
entity trust "Smith Family Trust" trust@DE [est: "2024-03-15", note: "Irrevocable Dynasty Trust"]
entity trustee "Northern Trust" individual [role: "Independent Trustee"]
entity beneficiary1 "Emma Smith" individual [role: "Beneficiary (50%)"]
entity beneficiary2 "Liam Smith" individual [role: "Beneficiary (50%)"]
entity famllc "Smith Family Holdings" llc@DE
entity realestate "Smith Real Estate" llc@DE [note: "property holding"]
entity investment "Smith Investments" llc@DE [note: "liquid assets"]

grantor -> trust [label: "Settles · funds"]
trustee -~-> trust [label: "Manages"]
trust --> beneficiary1 [label: "Distributions"]
trust --> beneficiary2 [label: "Distributions"]
trust -> famllc : 100% [label: "100% Owner"]
famllc -> realestate : 100%
famllc -> investment : 100%
```

**验证要点：**
- Trust 为紫底椭圆，位于 tier 2 中心
- Grantor 为圆形 r=35（主角尺寸），tier 1
- Trustee 位于 Trust 右侧（非层级位置），dashed 紫线表示 management
- Beneficiaries 位于 Trust 左侧，dashed 绿线表示 distribution
- Family LLC 在 Trust 下方 tier 3
- 2 个 asset LLC 位于 tier 4，分别 100% 被 Family LLC 所有
- 3 种不同颜色的边（黑实线 / 紫虚线 / 绿虚线）清晰区分

### Case 5: Pre/Post Transaction 对比（M&A · 复用 Case 1）

```
entity-structure "Acme Holdings — Pre vs Post Acquisition"

# Pre-transaction
entity parent "Acme Holdings" corp@DE
entity target "TargetCo" corp@DE [status: normal]
parent -> target : 40%

# Post-transaction
entity newparent "Acme Holdings" corp@DE [status: normal]
entity newtarget "TargetCo" corp@DE [status: modified]
entity mergesub "MergeSub" llc@DE [status: new, note: "formed for merger"]
newparent -> mergesub : 100%
mergesub -> newtarget : was 40% -> 100%
```

**验证要点：**
- "MergeSub" entity 呈现绿色描边 + "NEW" 标签
- "TargetCo" 呈现黄色描边（modified）
- Edge label 明确标注 "was 40% → 100%"

---

## 10. Accessibility

- 每个 SVG 必须带 `<title>` + `<desc>`
- 每个 entity 节点带 `<title>` 说明（screen reader-friendly）
- Entity name 为纯文本 `<text>`，不用 image 替代
- ARIA roles: `role="graphics-document"` on SVG, `role="graphics-symbol"` on each entity

## 11. Interaction Hooks (future)

- `data-entity-id` on each entity node（外部交互基础）
- `data-from` / `data-to` on each edge
- `data-ownership-pct` on ownership edges
- `data-jurisdiction` on entity node
- `data-entity-type` on entity node
- `data-tax-class` on entity node
- CSS hover classes: `.lineage-entity-node:hover` 由消费者定制

---

## 12. Implementation Priority

| Priority | Feature | Complexity |
|----------|---------|------------|
| P0 (Phase 12.0) | Parser: entity + jurisdiction + edge DSL | Medium |
| P0 | Renderer: corp/llc/lp/individual/trust shapes | Medium |
| P0 | Layout: tier-based hierarchy + orthogonal edge routing | Medium |
| P0 | Ownership edge with % label | Low |
| P0 | Jurisdiction badge (top-right) | Low |
| P0 | Test cases 1, 2, 4 SVG 渲染通过视觉比对 | — |
| P1 | Jurisdiction cluster 虚线分组框 | Medium |
| P1 | Non-ownership edge 类型（IP license / distribution / management） | Low |
| P1 | Share class label on edge | Low |
| P1 | Test case 3 SVG（跨境 + cluster） | — |
| P1 | V / E split 百分比渲染 | Low |
| P2 | Disregarded entity 虚线矩形 | Low |
| P2 | Foundation pentagon | Low |
| P2 | Pool (ESOP) 虚线圆角矩形 | Low |
| P2 | Pre/Post transaction 差异标注（new/eliminated/modified） | Medium |
| P2 | Test case 5 SVG | — |
| P3 | Multi-cluster 混合辖区（cluster with mixed jurisdictions） | Medium |
| P3 | Cap table convergence 布局（多 source → 单 target）优化 | Medium |
| P3 | Cross-ownership (环状所有权) 边路由 | High |
| P3 | Auto-legend generation | Low |

---

## 13. Coverage Matrix

验证本 standard 对 4 个 sample case 的完整覆盖：

| Feature | Case 1 (PE) | Case 2 (Cap Table) | Case 3 (Intl Tax) | Case 4 (Trust) |
|---------|:-----------:|:------------------:|:-----------------:|:--------------:|
| Corp rectangle | ✓ | ✓ | ✓ | — |
| LLC rounded rectangle | ✓ | — | — | ✓ |
| LP notched polygon | ✓ | ✓ | — | — |
| Trust ellipse | — | — | — | ✓ |
| Individual circle | — | ✓ | — | ✓ |
| Pool (dashed rectangle) | — | ✓ | — | — |
| Jurisdiction badge | ✓ (DE) | ✓ (DE) | ✓ (DE/IE/KY/NL/SG) | ✓ (DE) |
| Ownership % edge | ✓ | ✓ | ✓ | ✓ |
| Share class label | — | ✓ (Common/Series A/Option) | — | — |
| Option pool dashed edge | — | ✓ | — | — |
| Multiple parents (cap table) | — | ✓ (5 → 1) | — | — |
| Jurisdiction cluster | — | — | ✓ (3 clusters) | — |
| IP license edge (purple dashed) | — | — | ✓ | — |
| Distribution edge (green dashed) | — | — | — | ✓ |
| Management edge (purple dashed) | — | — | — | ✓ |
| Settlement edge (grantor → trust) | — | — | — | ✓ |
| Non-hierarchical placement (trustee) | — | — | — | ✓ |
| Multi-tier hierarchy | ✓ (3) | ✓ (2) | ✓ (3) | ✓ (4) |
| Note / note-below-name | — | ✓ | ✓ | ✓ |

**结论：** 本 standard 定义的 entity types、edge types、layout rules、jurisdiction cluster、DSL grammar 共同覆盖 4 个 sample case 的全部视觉需求，可直接驱动 parser + renderer 实现。
