# 15 — Venn / Euler Diagram Standard Reference

*集合论与 Euler-Venn 图可视化。面向逻辑教学、系统综述（PRISMA）、受众重叠分析、特征对比、分类学可视化等场景的集合关系图。*

> **References (学科惯例 + 相关标准):**
> - **Venn, John (1880).** *On the Diagrammatic and Mechanical Representation of Propositions and Reasonings.* Philosophical Magazine 5(10), 1-18 — 原始 2/3-set 圆形定义。
> - **Venn, John (1881).** *Symbolic Logic.* Macmillan — 首次提出 4-set 椭圆构造与 "every set combination must be representable" 的定义性约束。
> - **Euler, Leonhard (1768).** *Lettres à une Princesse d'Allemagne.* — Euler 圆（仅绘制实际存在的交集子集）。
> - **Edwards, Anthony W.F. (1989).** *Venn diagrams for many sets.* New Scientist 1646, 51-56 — Edwards-Venn（cogwheel）n=5,6,7 对称构造。
> - **Ruskey, Frank & Weston, Mark (2005).** *A Survey of Venn Diagrams.* Electronic Journal of Combinatorics, Dynamic Survey DS5 — 标准综述，几何证明。
> - **Chow, Stirling & Ruskey, Frank (2004).** *Drawing Area-Proportional Venn and Euler Diagrams.* Graph Drawing 2003, LNCS 2912 — 面积比例构造的数学基础。
> - **Wilkinson, Leland (2012).** *Exact and Approximate Area-Proportional Circular Venn and Euler Diagrams.* IEEE Trans. Visualization & Computer Graphics 18(2), 321-331 — venn.js 算法背后的论文。
> - **venn.js (Ben Frederickson, 2014–present)** — 开源 area-proportional Venn JavaScript 实现的 de-facto 参考。
> - **UpSetR (Lex, Gehlenborg et al., 2014).** *UpSet: Visualization of Intersections.* IEEE InfoVis — n ≥ 5 时 Venn 的降级替代方案（matrix-plot）。
> - **PRISMA 2020 Statement (Page et al., BMJ 2021).** — 系统综述报告规范，研究筛选去重阶段广泛使用 2/3-set Venn。
> - **R `VennDiagram` package (Chen & Boutros, 2011)** BMC Bioinformatics 12:35 — 生物信息学 de-facto 工具。
> - **Meta-Chart / Venngage / Lucidchart Venn templates** — 消费级工具的渲染约定。
>
> 注：Venn / Euler 无单一 ISO 标准。本文件综合数学文献、开源工具（venn.js、VennDiagram R）和主流 SaaS 模板，形成可程序化渲染的统一约定。

---

## 1. 用户与需求（第一性原理）

### 1.1 Venn vs Euler — 本质区别

两种图经常被混用为 "Venn 图"，但数学意义和 rendering 约束截然不同：

| 维度 | **Venn diagram** | **Euler diagram** |
|------|------------------|-------------------|
| 定义 | 必须展示 **所有可能的** 集合交集区域（对 n 个集合共 2ⁿ 个区域） | 只展示 **实际存在的** 子集关系，空交集不绘制 |
| 例：A ⊂ B | 仍画成两个相交圆，标注 `A \ B = ∅` | 画成一个小圆嵌在大圆内 |
| 例：A ∩ B = ∅ | 仍画成两个相交圆，标注交集为 0 | 画成两个分离的圆 |
| 数学用途 | 穷举所有逻辑命题（∀ combinations） | 可视化实际数据结构 |
| 对 n 的容忍 | 差（n=4 需椭圆；n=5 需 Edwards-Venn 变形） | 好（任意拓扑都可画） |

**工程含义：** parser 必须接受两种意图。同一段 DSL，用户可能想表达 "完整 Venn" 也可能想表达 "只显示实际子集关系的 Euler"。默认选择：

- 如果所有 2ⁿ − 1 个非空区域都有标签 / 计数 → Venn
- 如果存在空交集声明或明显的 subset / disjoint → Euler

用户可通过 `config: diagram = venn` 或 `diagram = euler` 强制。

### 1.2 五个用户场景

| 画像 | 场景 | 关键需求 |
|------|------|---------|
| **逻辑 / 数学教师 + 学生** | 集合论入门、条件概率、布尔代数 | 固定 2/3-set 经典构图、区域标签（`A`, `A∩B`, `A∩B∩C`）、清晰颜色 |
| **系统综述研究员（PRISMA meta-analysis）** | 数据库去重（PubMed ∩ Embase ∩ Cochrane）、筛选阶段文献数报告 | **整数计数标签**、可截图入 PRISMA flow 附录、export 到论文 |
| **增长 / 营销分析师** | 受众重叠（Facebook users ∩ Google users）、跨渠道归因 | **面积比例**（看得出哪个群体更大）、百分比标签、品牌色 |
| **产品经理 / 竞品分析** | 特征矩阵（Notion ∩ Obsidian ∩ Roam 功能对比） | 区域内 **文字列表**（每格列出功能名），而非数字 |
| **数据分析师 / 生物信息** | Gene set overlap（3-way / 4-way）、聚类结果对比 | 5–6 个集合的 Edwards-Venn 或 UpSet 替代方案 |

**每个场景对同一个图的期望不同**，standard 必须支持：
- 只要区域名（教学）
- 只要计数（PRISMA、生物信息）
- 计数 + 面积比例（营销）
- 每格任意富文本（产品经理）

### 1.3 ChatDiagram 集成动因

Venn / Euler 是 **Mermaid 最大的市场空白**：Ahrefs keyword data 显示 `venn diagram` **121K US / 333K 全球月搜，KD 48，CPC $0.05**；对比之下 Mermaid **无原生支持**（需用户转 flowchart 或 vendor 模板）。ChatDiagram 的 "PRISMA researcher" paying persona 付费率是基线的 3.3×，而 PRISMA 的首选可视化正是 2/3-set Venn。

**商业定位：** Venn 是 Schematex 进入 ChatDiagram 主流量的 #1 流量入口。Engineering 预算 ~1 周。

---

## 2. 市场需求数据

| 指标 | 数值 | 来源 |
|------|------|------|
| `venn diagram` US 月搜 | 121,000 | Ahrefs Keyword Explorer |
| 全球月搜 | 333,000 | Ahrefs |
| Keyword Difficulty | 48 | Ahrefs |
| CPC | $0.05 | Ahrefs（低，意味着信息型查询为主） |
| Mermaid 原生支持 | 无 | mermaid.js.org docs, Nov 2025 snapshot |
| 主要商业竞品 | Venngage, Meta-Chart, Lucidchart, Canva, Miro | 各家都有 template 但无 text-DSL |
| 开源对手 | venn.js（MIT，主流 JS 实现）、R VennDiagram、Python matplotlib-venn | 无 "text-to-SVG" 工具 |

**Schematex 差异化：**
1. Text DSL → SVG（所有竞品都是 GUI）
2. 零 runtime dependency（venn.js + D3 打包约 80KB，Schematex < 10KB）
3. 与其他 Schematex 图表共享 theme / accessibility 系统
4. 可被 LLM 可靠生成（这是 ChatDiagram 核心价值）

---

## 3. 类型分级

### 3.1 n = 2（trivial）

两个相交圆，三个区域（A only, B only, A∩B）。任何工具、任何布局都能画。Schematex 默认：两圆等半径，水平排列，重叠面积占单圆 ~40%。

### 3.2 n = 3（canonical，最常用）

**最重要的类型 — 覆盖 PRISMA、教学、大部分商业场景的 > 70% 用例。**

三圆对称排列，圆心构成等边三角形，共 7 个非空区域：`A`, `B`, `C`, `A∩B`, `A∩C`, `B∩C`, `A∩B∩C`。这是 John Venn 1880 原始构造。

标准坐标（单位圆，r=1）：
```
Circle A: center = (-0.5, -0.289), r = 1
Circle B: center = ( 0.5, -0.289), r = 1
Circle C: center = ( 0.0,  0.577), r = 1
```
三圆心构成等边三角形，边长 = r，中心交集是中心附近的 Reuleaux-triangle-like region。

### 3.3 n = 4（需要椭圆）

**关键约束：4 个圆不能构成 Venn diagram**（数学事实：3 个以上圆无法使所有 2⁴=16 区域可表示）。必须使用 **4 个椭圆**。

Venn 1881 原始 4-ellipse 构造：4 个长轴平行、等大的椭圆，旋转 45°/90°/135°/180° 叠加，形成 15 个非空区域（外加背景）。

**视觉识别度下降：** 用户经常误看成 "蝴蝶"，区域难读。Schematex 在 n=4 时会 warn suggesting Euler 或 UpSet。

### 3.4 n = 5–6（Edwards-Venn 或 降级）

**Edwards-Venn（1989）：** 将前 3 个集合画成球面上的 3 正交大圆（投影为矩形 + 两个半椭圆），后续集合作为 "cogwheel" 齿轮状曲线叠加。n=5 有 31 区域、n=6 有 63 区域，视觉 extremely dense，仅适合学术插图。

**UpSet plot 替代方案（Lex 2014）：** 当 n ≥ 5 且需要实际可用性时，自动切换为 matrix-plot：
- 上方：bar chart，每 bar = 一个 "intersection size"
- 下方：dot matrix，行 = set，列 = intersection，填充 dot 表示该 set 参与该交集

UpSet 在 n=5..20 时远优于 Venn。Schematex 在 n ≥ 5 时默认 `fallback: upset`，可通过 `layout: edwards-venn` 强制。

### 3.5 Area-proportional Venn（面积比例）

常规 Venn 圆等大、位置固定；**proportional Venn** 让每个区域的几何面积 ∝ 其基数（元素数）。

**应用：** 受众重叠分析最需要 — 看图一眼判断 "Facebook 独占 > Instagram 独占"。

**算法：** 梯度下降优化圆心 `(xᵢ, yᵢ)` 和半径 `rᵢ`，objective = Σ(actual_area − target_area)²。venn.js 是开源参考实现（见 §6.4）。n=2 有解析解，n=3 大多数情况可达 ε < 1%，n ≥ 4 通常有不可满足约束，Schematex 退回到 **best-fit Euler approximation**。

### 3.6 Euler diagrams（非 Venn）

三种标准 Euler 关系：
- **Subset（A ⊂ B）：** 小圆嵌在大圆内部
- **Disjoint（A ∩ B = ∅）：** 两圆分离
- **Partial overlap：** 标准 Venn 两圆相交

Euler 支持混合：`A ⊂ B`, `C` disjoint from both — 三集合不一定形成完整 Venn。Parser 检测关系后 Layout 选 Euler 模式。

---

## 4. 数学 / 几何基础

### 4.1 Two-circle intersection

给定圆 A（中心 `Cₐ`，半径 `rₐ`）和圆 B（中心 `C_b`，半径 `r_b`），间距 `d = |Cₐ − C_b|`：

- 若 `d ≥ rₐ + r_b` → disjoint
- 若 `d ≤ |rₐ − r_b|` → subset
- 否则交集面积（lens area）：
  ```
  area = rₐ² · acos((d² + rₐ² − r_b²) / (2·d·rₐ))
       + r_b² · acos((d² + r_b² − rₐ²) / (2·d·r_b))
       − 0.5 · √((-d+rₐ+r_b)(d+rₐ-r_b)(d-rₐ+r_b)(d+rₐ+r_b))
  ```

### 4.2 Three-circle classic coordinates

令 canvas 中心 `(cx, cy)`，半径 `r`，圆心偏移 `o = r · 0.6`（经验值，使 central triple-overlap 区域 ~r·0.15 宽度）：
```
A: (cx − o·cos(30°), cy + o·sin(30°))  = (cx − 0.52r, cy + 0.30r)
B: (cx + o·cos(30°), cy + o·sin(30°))  = (cx + 0.52r, cy + 0.30r)
C: (cx,              cy − o)           = (cx,          cy − 0.60r)
```

这是 VennDiagram R package 和 D3-venn 共用的约定。

### 4.3 Four-ellipse standard arrangement

Venn 原始构造使用 4 个 congruent 椭圆，长轴 / 短轴比 `a/b ≈ 2.0`：

```
Ellipse i (i=1..4):
  center: (cx + kᵢ · cos(θᵢ), cy + kᵢ · sin(θᵢ))
  rotation: αᵢ (degrees)
  
  i=1: θ=135°, α=45°,  k=0.18·W
  i=2: θ=45°,  α=−45°, k=0.18·W
  i=3: θ=−45°, α=45°,  k=0.18·W  
  i=4: θ=−135°,α=−45°, k=0.18·W
  semi-major a = 0.45·W, semi-minor b = 0.25·W
```
（W = canvas width；确切系数见 Ruskey & Weston 2005 Fig 4.1。）

### 4.4 Proportional Venn — constraint optimization

**目标函数：**
```
loss = Σ_r (area_r(x, y, radii) − target_r)²
```
其中 `r` 遍历所有非空区域，`target_r` 是 DSL 指定的计数 / 比例。

**算法（基于 Wilkinson 2012 / venn.js）：**
1. 初始化：用 pairwise intersection sizes 得到 pairwise distances `d_ij`（解析求逆 §4.1），作为圆间距约束。
2. 用 MDS（multi-dimensional scaling）把 pairwise distances embedded 到 2D 平面，得初始 `(xᵢ, yᵢ)`。
3. 梯度下降 refine：step size `1e-3`, max iter `500`, early stop 当 `loss < 1e-5 · Σtarget`.
4. 若 n ≥ 4 且 final loss > 5% 阈值 → 自动降级为 Euler approximation（保留 subset / disjoint 关系，放弃精确面积）。

Schematex 实现应手写此算法，**不引入 d3 / numeric.js**（零依赖约束）。算法本身约 200 行。

### 4.5 Label placement

标签放置是 Venn 图可读性的核心：

- **Region center-of-mass：** 对每个非空区域数值积分 centroid，label 默认放在此处。
- **Collision detection：** 若两 label bbox 重叠，其中较小区域的 label 推至 outside + leader line（细曲线 + dot）。
- **Small region rule：** 若区域面积 < 60 px²（约可容纳 1 字符），强制 outside label。
- **Outside label placement：** 取区域 centroid → canvas 边界方向延长 20 px，放置 label，`text-anchor` 根据方位动态设置。

---

## 5. DSL Grammar

Schematex 支持 **一种 primary DSL + 两种 alternate shorthand**，共同覆盖 §1.2 的五类用户。

### 5.1 Primary syntax — Declarative set + intersection

```
venn "<title>"
set A "<display label>"
set B "<display label>"
set C "<display label>"

A only     : <value>
B only     : <value>
A & B      : <value>
A & C      : <value>
B & C      : <value>
A & B & C  : <value>
```

其中 `<value>` 可以是：
- **Integer**（`1234`） — 用于计数 / PRISMA / 集合大小
- **Percentage**（`15%`） — 用于营销 overlap
- **Quoted string**（`"Feature list..."`） — 富文本，会进入区域内
- **List**（`[apple, banana, cherry]`） — 用于教学 / 集合枚举

**示例（PRISMA）：**
```
venn "Systematic review — database deduplication"
set pubmed   "PubMed"
set embase   "Embase"
set cochrane "Cochrane"

pubmed only              : 412
embase only              : 289
cochrane only            : 67
pubmed & embase          : 134
pubmed & cochrane        : 23
embase & cochrane        : 19
pubmed & embase & cochrane : 78
```

### 5.2 Alternate syntax 1 — Set enumeration (教学场景)

```
venn "Set operations example"
A = { 1, 2, 3, 4, 5 }
B = { 4, 5, 6, 7, 8 }
C = { 2, 4, 6, 8, 10 }
```

Parser 自动计算所有 intersections。元素作为 region labels 渲染。仅在 enumeration 模式下合法（所有集合都用 `=` 定义）。

### 5.3 Alternate syntax 2 — Region-labeled (产品经理场景)

```
venn "Note-taking app feature overlap"
set notion   "Notion"
set obsidian "Obsidian"
set roam     "Roam Research"

region notion only              : "Databases, Teamspaces, AI"
region obsidian only            : "Local-first, Plugins, Graph view"
region roam only                : "Block refs, Daily notes"
region notion & obsidian        : "Markdown, Backlinks"
region notion & roam            : "Web clipper"
region obsidian & roam          : "Bi-directional links"
region notion & obsidian & roam : "Wiki-style, Tags, Search"
```

### 5.4 Euler-explicit syntax

当用户要 Euler 而非 Venn：
```
venn "Biology taxonomy" [diagram: euler]
set mammals "Mammals"
set dogs    "Dogs"
set cats    "Cats"

dogs subset mammals
cats subset mammals
dogs disjoint cats
```

`subset` / `disjoint` / `overlap` 是关系关键字。

### 5.5 Config

```
config: diagram = venn | euler | auto      (default: auto)
config: proportional = true | false        (default: false)
config: fallback = upset | edwards-venn    (default: upset, 当 n ≥ 5)
config: palette = default | brand | mono
config: blendMode = multiply | screen | none   (default: multiply)
config: showCounts = true | false          (default: auto based on value type)
config: showPercent = true | false
```

### 5.6 EBNF Grammar

```ebnf
document        = header (set_def | region_def | enum_def | euler_rel | config_def)*
header          = "venn" quoted_string properties? NEWLINE

set_def         = "set" ID quoted_string properties? NEWLINE
enum_def        = ID "=" "{" value_list "}" NEWLINE

region_def      = region_key ":" value properties? NEWLINE
                | "region" region_key ":" value properties? NEWLINE
region_key      = set_ref ("only" | ("&" set_ref)+)
set_ref         = ID

value           = INTEGER | PERCENTAGE | quoted_string | value_list
value_list      = "[" (value ("," value)*)? "]"

euler_rel       = ID ("subset" | "disjoint" | "overlap") ID NEWLINE

config_def      = "config:" config_key "=" config_value NEWLINE

properties      = "[" property ("," property)* "]"
property        = "color:" HEX
                | "label:" quoted_string
                | "fill:" HEX
                | kv_prop

ID              = /[a-zA-Z][a-zA-Z0-9_-]*/
INTEGER         = /[0-9]+/
PERCENTAGE      = /[0-9]+(\.[0-9]+)?%/
HEX             = /#[0-9a-fA-F]{3,8}/
quoted_string   = '"' /[^"]*/ '"'
```

---

## 6. Layout Algorithm

### 6.1 Overview

Layout 选择基于 `n`（集合数）+ `config` flags：

| n | Default | Proportional | Fallback when too complex |
|---|---------|--------------|----------------------------|
| 2 | Classic 2-circle | Analytic proportional | — |
| 3 | Classic 3-circle | Gradient descent proportional | Best-fit Euler |
| 4 | 4-ellipse Venn | Gradient descent (often fails) → Euler | Euler or UpSet |
| 5 | UpSet plot | — | Edwards-Venn (if forced) |
| 6 | UpSet plot | — | Edwards-Venn (if forced) |
| 7+ | UpSet plot | — | — |

### 6.2 n=2 fixed layout

```
canvas: 480 × 320
Circle A: center = (180, 160), r = 110
Circle B: center = (300, 160), r = 110
overlap ratio: ~0.4 (d = 120)
```

### 6.3 n=3 fixed layout

```
canvas: 520 × 480
Circles use §4.2 formula with cx=260, cy=240, r=130, offset o=78
  A: (202, 279)
  B: (318, 279)
  C: (260, 162)
```

### 6.4 n=4 ellipse layout

Four ellipses using §4.3 formula:
```
canvas: 640 × 480
cx=320, cy=240, W=480
ellipse param (a, b) = (216, 120)
Rotate each by -30°, 30°, -30°, 30° around centers derived from θᵢ.
```

细节见 Ruskey & Weston 2005 §4 的精确坐标表。Schematex 实现打表。

### 6.5 Proportional algorithm (n=2, n=3)

**n=2 analytic closed-form：**
给定 `|A|`, `|B|`, `|A∩B|`, 计算 `rₐ = √(|A|/π)`, `r_b = √(|B|/π)`, 解 §4.1 面积方程求 `d`。Newton-Raphson 约 5 轮收敛。

**n=3 gradient descent：**
```
inputs: |A|, |B|, |C|, |A∩B|, |A∩C|, |B∩C|, |A∩B∩C|
initialize: MDS of pairwise intersection distances
parameters: 6 DOF (3 centers × 2 coord) — radii fixed by |set| area
loop 500 iter:
  for each region r:
    compute actual_area via Monte Carlo sampling (5000 samples) or analytic 3-circle formula
    residual = actual - target
  loss = Σ residual²
  gradient: finite-difference (Δ=0.5 px) — or closed-form for 3-circle
  update: x -= lr × gradient  (lr = 0.002)
  early stop: loss < 1e-5 × Σtarget
output: adjusted centers
```

Analytic 3-circle area formula exists but 很复杂（见 Chow & Ruskey 2004）；Schematex v0.2 用 Monte Carlo（精度 ±0.2% 即可，用户无感）。

### 6.6 Label placement pipeline

```
for each non-empty region r:
  sample 1000 points within region (rejection sampling)
  centroid = mean(points)
  bbox = measure_text(label, font_metrics)
  候选位置 = centroid
若 (region area < 60 px²) OR (bbox collides with other label):
  choose outside placement:
    direction = centroid - canvas_center
    pos = intersect_boundary + direction × 20
    add leader line from centroid to pos
```

---

## 7. 渲染

### 7.1 SVG Primitives

| 元素 | SVG |
|------|-----|
| Circle set | `<circle cx cy r class="schematex-venn-set"/>` |
| Ellipse set | `<ellipse cx cy rx ry transform="rotate(α cx cy)"/>` |
| Subset outline | Nested circle/ellipse |
| Complex region outline (Edwards) | `<path d="M... A..."/>` |
| Region label | `<text>` + optional `<tspan>` for count |
| Leader line (outside label) | `<path>` curve + `<circle r=1.5>` dot |
| UpSet bar | `<rect>` |
| UpSet dot matrix | `<circle r=6>` filled vs open |

### 7.2 Fill opacity stacking

默认 `mix-blend-mode: multiply` 使重叠区域颜色自然混合：
```xml
<g style="mix-blend-mode: multiply">
  <circle class="set-a" fill="#e15759" fill-opacity="0.45"/>
  <circle class="set-b" fill="#4e79a7" fill-opacity="0.45"/>
  <circle class="set-c" fill="#59a14f" fill-opacity="0.45"/>
</g>
```
浏览器兼容性：Safari 14+, Chrome 74+, Firefox 72+（Schematex 最低支持范围）。`config: blendMode = none` 退回到 solid fill + alpha-only。

### 7.3 Region-specific classes（可 CSS 定制）

```
.schematex-venn-set              # 所有圆/椭圆
.schematex-venn-set-0            # 第 0 个集合
.schematex-venn-region-A         # 仅 A
.schematex-venn-region-AB        # A ∩ B
.schematex-venn-region-ABC       # A ∩ B ∩ C
.schematex-venn-label
.schematex-venn-count
.schematex-venn-leader
.schematex-venn-upset-bar
.schematex-venn-upset-dot
.schematex-venn-upset-dot-active
```

### 7.4 Accessibility

- 每 SVG 带 `<title>` + `<desc>`
- 每 `<circle>` / `<ellipse>` 带 `<title>` 描述 "Set A: Label (N elements)"
- Regions 在 `<g role="graphics-symbol">` 包裹，title = "Intersection of A and B: 134 elements"
- Leader line `<path>` 附 `aria-hidden="true"`

---

## 8. Theme 集成

新增 `VennTokens` semantic extension 到 `src/core/theme.ts`：

```typescript
export interface VennTokens {
  /** Set colors palette — first N entries used for N sets */
  vennSetColors: string[];
  /** Overlap blend mode: how intersections display */
  vennBlendMode: "multiply" | "screen" | "none";
  /** Fill opacity for set fills (stacked) */
  vennSetOpacity: number;
  /** Stroke color for set outline */
  vennSetStroke: string;
  /** Label colors */
  vennLabelColor: string;
  vennCountColor: string;
  /** UpSet specific */
  vennUpsetBarFill: string;
  vennUpsetMatrixDot: string;
  vennUpsetMatrixDotInactive: string;
}
```

### 8.1 Default palette (8 sets)

复用 BaseTheme `palette`，但针对 Venn 重新 tuning（稍偏柔和以便 multiply blend）：

| Index | Role | Hex |
|-------|------|-----|
| 0 | Set A | `#4E79A7` (blue) |
| 1 | Set B | `#F28E2B` (orange) |
| 2 | Set C | `#E15759` (red) |
| 3 | Set D | `#76B7B2` (teal) |
| 4 | Set E | `#59A14F` (green) |
| 5 | Set F | `#EDC948` (yellow) |
| 6 | Set G | `#B07AA1` (purple) |
| 7 | Set H | `#FF9DA7` (pink) |

Fill opacity 默认 `0.45`，blend mode `multiply` — 重叠区域呈深色天然混合。

### 8.2 `brand` preset (营销场景)

允许用户通过 `config: palette = brand` + CSS 自定义 `--schematex-venn-set-0-fill` 等变量覆盖。

### 8.3 `monochrome` preset (学术 / 打印)

全部集合用灰度 + dashed / dotted / solid stroke 区分：
```
set 0: fill=#999 opacity=0.25, stroke-dasharray=none
set 1: fill=#999 opacity=0.25, stroke-dasharray=4 2
set 2: fill=#999 opacity=0.25, stroke-dasharray=1 2
```

### 8.4 `dark` preset

用 Catppuccin Mocha palette，fill opacity 提高到 0.55 以在深背景可读。

---

## 9. 测试用例

以下 15+ fixtures 覆盖所有 §3 的 diagram types、§1.2 的 5 个 persona 和 §5 的多种 DSL syntax。

### Case 1: 2-set basic (教学)

```
venn "Set operations: A ∪ B"
set A "Even numbers ≤ 10"
set B "Multiples of 3 ≤ 10"

A only  : [2, 4, 8, 10]
B only  : [3, 9]
A & B   : [6]
```

**验证：** n=2 classic layout，region 内显示元素枚举，无计数 chip。

### Case 2: 3-set canonical (教学)

```
venn "Programming paradigms"
set A "Object-oriented"
set B "Functional"
set C "Imperative"

A only      : "Java, Smalltalk"
B only      : "Haskell, Elm"
C only      : "Assembly"
A & B       : "Scala"
A & C       : "C++"
B & C       : "F# scripts"
A & B & C   : "Python, JavaScript, Rust"
```

**验证：** 三圆等边三角形坐标精确匹配 §4.2；7 个 region 标签全部居中；textual labels 启用 text-wrap。

### Case 3: 3-set with integer counts (PRISMA)

```
venn "PRISMA 2024 — systematic review database overlap"
set pubmed   "PubMed (n=624)"
set embase   "Embase (n=520)"
set cochrane "Cochrane (n=187)"

pubmed only                 : 412
embase only                 : 289
cochrane only               : 67
pubmed & embase             : 134
pubmed & cochrane           : 23
embase & cochrane           : 19
pubmed & embase & cochrane  : 78
```

**验证：** count chip 在区域 centroid，14pt semi-bold；set 标签在圆外顶部（避开 circle stroke）。

### Case 4: 3-set proportional (营销)

```
venn "Social media audience overlap — Q3 2025" [proportional: true]
set fb  "Facebook"
set ig  "Instagram"
set tw  "Twitter"

fb only          : 2400000
ig only          : 1800000
tw only          : 600000
fb & ig          : 900000
fb & tw          : 200000
ig & tw          : 150000
fb & ig & tw     : 300000
```

**验证：** proportional layout 收敛，area ratio error < 1%；FB 圆显著大于 TW 圆；每 region 显示计数（auto-format K/M）。

### Case 5: 4-set standard (特征对比)

```
venn "Note-taking app features"
set notion   "Notion"
set obsidian "Obsidian"
set roam     "Roam"
set logseq   "Logseq"

notion only                               : "Databases"
obsidian only                             : "Local plugins"
roam only                                 : "Block refs (original)"
logseq only                               : "Outliner UI"
notion & obsidian                         : "Markdown"
notion & roam                             : "Templates"
notion & logseq                           : "Tasks"
obsidian & roam                           : "Backlinks"
obsidian & logseq                         : "Local-first"
roam & logseq                             : "Daily notes"
notion & obsidian & roam                  : "Graph view"
notion & obsidian & logseq                : "Plugins"
notion & roam & logseq                    : "Queries"
obsidian & roam & logseq                  : "Bi-links"
notion & obsidian & roam & logseq         : "Wiki-style tags"
```

**验证：** 4-ellipse Venn 布局，15 regions 全部可读（small region 用 outside label + leader）。

### Case 6: Euler subset

```
venn "Biology classification" [diagram: euler]
set animals "Animals"
set mammals "Mammals"
set dogs    "Dogs"

mammals subset animals
dogs subset mammals
```

**验证：** 嵌套三圆，`dogs ⊂ mammals ⊂ animals`，无相交；label 在各自圆内 top。

### Case 7: Euler disjoint

```
venn "Plant kingdom sample" [diagram: euler]
set conifers  "Conifers"
set flowering "Flowering plants"
set mosses    "Mosses"

conifers disjoint flowering
conifers disjoint mosses
flowering disjoint mosses
```

**验证：** 三个不相交的圆水平排列，每圆独立 label。

### Case 8: Mixed Euler (subset + disjoint)

```
venn "Transport vehicles" [diagram: euler]
set vehicles  "Vehicles"
set cars      "Cars"
set bicycles  "Bicycles"
set motorbikes "Motorbikes"

cars subset vehicles
motorbikes subset vehicles
bicycles disjoint vehicles
cars disjoint motorbikes
```

**验证：** vehicles 大圆内嵌 cars + motorbikes 两分离圆；bicycles 在外部独立。

### Case 9: 5-set UpSet fallback

```
venn "Gene expression — five tissue samples"
set liver  "Liver"
set lung   "Lung"
set heart  "Heart"
set brain  "Brain"
set kidney "Kidney"

liver only                      : 1240
lung only                       : 890
heart only                      : 567
brain only                      : 1456
kidney only                     : 789
liver & lung                    : 234
liver & heart                   : 123
liver & brain                   : 56
lung & heart                    : 345
brain & kidney                  : 234
liver & lung & heart            : 89
liver & lung & heart & brain    : 45
liver & lung & heart & brain & kidney : 23
```

**验证：** 自动切换到 UpSet plot；上方 horizontal bars 按 size 降序，下方 matrix 显示参与的 set；所有 5-set combinations 按值 > 0 筛选后渲染。

### Case 10: 5-set Edwards-Venn (强制)

```
venn "Five sets demo" [fallback: edwards-venn]
set A "Set A"
set B "Set B"
set C "Set C"
set D "Set D"
set E "Set E"

A only : 10
B only : 10
... (all 31 regions)
```

**验证：** Edwards cogwheel geometry；31 region colors 来自 multiply blending of 5 base colors；label 仅渲染有值区域。

### Case 11: Set enumeration syntax

```
venn "Math sets"
A = { 1, 2, 3, 4, 5, 6 }
B = { 4, 5, 6, 7, 8, 9 }
C = { 2, 4, 6, 8, 10 }
```

**验证：** Parser 自动计算所有 intersections；region 内列出元素；count chip 显示 `|A∩B|=3`。

### Case 12: Region-labeled (产品经理)

同 Case 5，换用 `region ...` 语法代替 `A & B :`。**验证：** 两种语法产生完全一致的 AST。

### Case 13: 2-set proportional (受众重叠)

```
venn "iOS vs Android users — mobile-only" [proportional: true]
set ios     "iOS users"
set android "Android users"

ios only         : 32
android only     : 58
ios & android    : 10
```

**验证：** n=2 analytic solver；圆半径比 `rₐ / r_b = √(42/68) ≈ 0.786`；overlap lens area = 10 (±1% tolerance).

### Case 14: Text-heavy labeled regions

```
venn "Team skill matrix"
set frontend "Frontend devs"
set backend  "Backend devs"
set design   "Designers"

region frontend only             : "React, CSS, a11y, animation"
region backend only              : "Go, Postgres, Kafka, k8s"
region design only               : "Figma, typography, brand"
region frontend & backend        : "TypeScript, testing, CI"
region frontend & design         : "Prototype, UX spec"
region backend & design          : "Data viz tooling"
region frontend & backend & design : "Product mindset"
```

**验证：** 多行 wrapping，长 label 自动分行 + font-size down-scale。

### Case 15: PRISMA 2-set simple

```
venn "Pilot search — two databases"
set pm "PubMed"
set eb "Embase"

pm only  : 84
eb only  : 52
pm & eb  : 36
```

**验证：** 最常见的 meta-analysis pilot 场景；count 在区域中心，set 标签在圆顶。

### Case 16: Monochrome print style

```
venn "Scientific figure — greyscale" [palette: monochrome]
set a "Group A"
set b "Group B"
set c "Group C"

a only : 24
... (7 regions)
```

**验证：** 全灰度填充 + dashed / dotted / solid stroke 区分三集合；count chip 黑色 12pt。

---

## 10. Implementation Plan

### 10.1 Milestone breakdown (约 1 周, 单人)

| Phase | Tasks | Days |
|-------|-------|------|
| **Parser (2d)** | Lexer + recursive-descent parser for Primary / Enumeration / Region-labeled syntaxes; Euler relations; config options; AST = `VennAST { sets: Set[], regions: RegionValue[], relations: EulerRel[], config }` | 2 |
| **Layout (3d)** | 1) n=2/3 fixed layouts; 2) n=4 ellipse lookup table; 3) Proportional solver (n=2 analytic + n=3 gradient descent + Monte Carlo area); 4) UpSet plot layout for n ≥ 5; 5) Label placement with collision detection + leader lines | 3 |
| **Renderer (2d)** | SVG primitives; `mix-blend-mode` handling; CSS class hierarchy; `<title>` / `<desc>` accessibility; Monochrome + Dark preset rendering; UpSet bar + dot matrix | 2 |

### 10.2 v0.2 scope

**In-scope:**
- n = 2, 3, 4 classic Venn (fixed layouts)
- Proportional for n = 2, 3
- Euler: subset, disjoint, mixed
- UpSet plot fallback for n ≥ 5
- 3 DSL variants (primary / enum / region-labeled)
- 3 theme presets (default / mono / dark) + brand via CSS vars
- All 16 test cases above

**Deferred (v0.3+):**
- n ≥ 5 proportional Venn（数学上常不可解；defer until user demand）
- Edwards-Venn n = 6, 7（rarely needed; requires precomputed geometry tables）
- Area-proportional ellipses（n=4 proportional 几乎总 fail，暂只做 best-fit approximation warning）
- Animated transitions（e.g. Venn → Euler when user toggles exactness）
- Clickable regions with drill-down（interaction layer, v0.3）
- Export to R `VennDiagram` compatible data format（迁移路径）

### 10.3 Quality gates

- 16 fixture SVGs rendered + 人工 diff vs reference PNGs (stored in `examples/venn/`)
- 数学 property tests：对 random input set sizes，proportional solver 的 area residual < 2% for n=2/3
- Accessibility: Every rendered SVG passes `axe-core` / `pa11y` (title + desc + per-region labels)
- Performance: n=3 render < 10 ms; n=4 ellipse < 30 ms; UpSet for n=10 < 50 ms
- Zero runtime dependency (verified by `package.json` dependencies = `{}`)

---

## 11. Open Questions / ⚠️ NEEDS VICTOR INPUT

以下决策点需 Victor 拍板后再动代码：

1. **n=5+ 默认：UpSet vs Edwards-Venn？**  
   推荐：默认 UpSet（实用性碾压，生物信息 / SaaS 分析主流）。但学术 / 教学场景会认得 Edwards-Venn。提议 default = upset；通过 `config: fallback = edwards-venn` opt-in。  
   ⚠️ 需 Victor 确认：是否接受这个默认？ChatDiagram LLM prompt 应如何提示用户？

2. **Proportional Venn 失败时 fallback 策略？**  
   当 n=3 梯度下降收敛到 loss > 5% × target（数学上不可满足的面积组合，如 `|A∩B| > min(|A|, |B|)`），三个选项：  
   (a) 返回 best-fit + 渲染 warning overlay  
   (b) 回退到 non-proportional Venn + warning  
   (c) 直接 render error  
   建议 (a)。但 warning 会污染 SVG 可导出性。  
   ⚠️ 需 Victor 定方向。

3. **富文本 region labels 最大长度？**  
   Case 5 / Case 14 的 region 里放多行文字，但 n=3 中心 triple-overlap 面积很小（≈ r·0.15²），放不下 10 个词。  
   提议：每 region 硬上限 3 行 × 15 char，超限自动截断 + `...` + `<title>` 里存完整文本（hover reveals）。  
   ⚠️ 需产品 / 设计 sense 确认。

4. **DSL `A only` vs `A not B not C` 显式写法？**  
   Primary syntax 中 `A only` 是 `A \ B \ C`（对 n=3）。当 n=4，`A only` = `A \ B \ C \ D`，但用户可能只想要 `A ∩ ¬B`（含 C, D）。  
   提议：保持 `A only` 语义 = 完全独占（i.e. set-complement w.r.t. 所有其他 sets）；需要部分否定用 `A & !B` 语法（v0.3 引入）。  
   ⚠️ 需 Victor 确认语义默认。

5. **是否提供 `diagram = auto` 启发式？**  
   §1.1 建议"有 subset / disjoint 声明 → Euler, 否则 → Venn"。但用户可能混用。  
   建议：默认 auto，但 parse 阶段给出友好 hint 日志。  
   ⚠️ hint 应该 log 到 console 还是写入 SVG `<desc>`？

6. **ChatDiagram LLM prompt 需要多详细？**  
   LLM 需要能从 "draw a Venn diagram of cats and dogs" 自动生成合法 DSL。是否需为 Venn 单独写 few-shot prompts？  
   ⚠️ 需协同 ChatDiagram 团队决定 prompt 策略。

7. **Area-proportional 是否默认开启？**  
   营销场景极欲，但教学场景不需要（会扭曲教学意图）。  
   提议：默认 `proportional: false`，LLM 根据 value 类型（integer count）自动建议 `proportional: true`。  
   ⚠️ 需 Victor 确认。

8. **UpSet plot 在 ChatDiagram 是否作为独立 `diagramType`？**  
   目前 §3.4 是 Venn 的 fallback。但 UpSet 本身在生物信息 / data viz 社区有独立地位。是否值得后续 promote 为 top-level `upset` 类型？  
   ⚠️ 商业判断。

9. **Types.ts 新增类型命名空间：**  
   建议新增 `VennAST`, `VennSet`, `VennRegion`, `EulerRelation`, `VennTokens`。是否作为独立 branch 还是与 fishbone 类似直接加入 `types.ts`？

10. **示例 SVG reference：** 本 standard **未附带** 原始 reference SVG（不同于 Fishbone）。需要 Victor / 设计师先 draft 3 个参考 SVG（n=2, n=3, n=3 proportional）作为 pixel-level benchmark。  
    ⚠️ 阻塞实现进度。

---

*End of 15-VENN-STANDARD.md — Schematex 进入 ChatDiagram 主流量的 #1 流量入口，也是 Mermaid 空白中最显著的一块。实现优先级：P0.*
