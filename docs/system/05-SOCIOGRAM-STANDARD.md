# 05 — Sociogram Standard Reference (Comprehensive)

*Moreno (1934) sociometry model + modern social network analysis conventions + 多领域应用扩展。群体内社会关系的可视化与分析。*

> **Primary References:**
> - Moreno, J.L. (1934). *Who Shall Survive? Foundations of Sociometry, Group Psychotherapy and Sociodrama.* Beacon House.
> - Moreno, J.L. & Jennings, H.H. (1938). Statistics of social configurations. *Sociometry*, 1(3/4), 342-374.
> - Brandes, U. et al. (2011). Effects of sociogram drawing conventions and edge crossings in social network visualization. *J Graph Algorithms Appl.* 15(1), 157-176.
> - Hanneman, R.A. & Riddle, M. (2005). *Introduction to Social Network Methods.* UC Riverside.
> - FBI Law Enforcement Bulletin (2014). Social Network Analysis: A Systematic Approach for Investigating.

---

## 1. What is a Sociogram?

Sociogram 是由 Jacob L. Moreno 于 1934 年开发的**群体社会关系可视化工具**。与 ecomap（个人↔外部系统）不同，sociogram 关注的是**群体内部成员之间**的关系网络——谁选择了谁、谁被孤立、谁是核心、哪些人形成了小圈子。

核心区别：
| 维度 | Ecomap | Sociogram |
|------|--------|-----------|
| 焦点 | 一个人/家庭 vs 外部系统 | 群体内所有成员互相之间 |
| 布局 | 径向（中心-外围） | 网络图（force-directed / circular） |
| 连线含义 | 关系质量（强/弱/压力） | 社会选择（选择/拒绝/相互） |
| 用途 | 临床评估 | 群体动力学分析 |

---

## 2. Who Uses Sociograms — User Segments

### 2.1 Education（最大用户群）

**教师 + 学校心理咨询师**是 sociogram 的第一大用户群。典型场景：

| 场景 | 方法 | 目的 |
|------|------|------|
| 课堂社交评估 | 让每个学生列出 2 名想合作的同学 | 识别 stars（受欢迎）、isolates（被孤立）、cliques（小圈子） |
| 座位/分组安排 | 基于 sociogram 数据优化 | 确保 isolates 被纳入、打破排他性 cliques |
| 霸凌预防 | 定期 sociogram 追踪 | 发现关系变化、早期干预 |
| 夏令营/班级分配 | 师生关系映射 | 平衡组间社交动力 |

**关键词信号：** "sociogram classroom"、"sociogram maker"（教师工具意图）

### 2.2 Clinical / Social Work（专业用户）

**社工 + 群体治疗师 + 心理剧治疗师**：

| 场景 | 方法 | 目的 |
|------|------|------|
| Group therapy 动力评估 | 治疗师观察 + 成员问卷 | 识别联盟、冲突、权力结构 |
| Social atom（社会原子） | 个人画出最重要的人际关系 | Moreno 的核心技术，warm-up for psychodrama |
| 家庭系统动力 | 家庭成员间的选择/排斥 | 补充 genogram 的动力维度 |
| 社区评估 | 机构间关系映射 | 识别服务gap、资源集中度 |

**与 Lineage 现有用户的重叠：** 使用 genogram + ecomap 的社工/治疗师也是 sociogram 的天然用户。

### 2.3 Organizational Development（企业用户）

**HR 专家 + 组织发展顾问 + 团队 lead**：

| 场景 | 方法 | 目的 |
|------|------|------|
| 非正式影响力映射 | "你遇到问题会找谁帮忙？" | 发现隐性领导者 vs 正式 org chart |
| 团队组建 | 跨部门社交网络分析 | 优化跨职能团队组合 |
| 信息流分析 | "你从谁那里获取工作信息？" | 识别信息瓶颈和孤岛 |
| 合并后文化整合 | 两个团队的交叉连接 | 评估整合进度 |

### 2.4 Law Enforcement / Intelligence（高价值专业用户）

**执法分析师 + 情报分析师**：

| 场景 | 方法 | 目的 |
|------|------|------|
| 犯罪网络分析 | 电话记录、社交媒体、监控数据 → link analysis | 识别组织核心人物、中间人、外围 |
| 帮派结构映射 | 逮捕记录、同车记录 | 理解帮派层级和领地 |
| 嫌疑人社交圈 | 1-2 度关系网络 | 追踪逃犯、预测行为 |
| 反恐网络分析 | 通讯模式 + 资金流 | 识别 cell 结构 |

**注意：** 执法场景通常使用 Palantir、i2 Analyst's Notebook 等专业工具，但基础的 sociogram 可视化能力（轻量、可嵌入、Text DSL 输入）是差异化机会。

### 2.5 Academic Research（长尾用户）

社会学、人类学、政治学研究中的社会网络分析。通常使用 Gephi、NetworkX、Pajek 等重型工具。Lineage 的机会在于**轻量快速可视化**——论文插图、教学演示。

---

## 3. Sociogram Structure

Sociogram 由三层组成：
1. **节点 (Nodes)** — 群体中的个体成员
2. **连线 (Edges)** — 成员之间的社会关系/选择
3. **结构模式 (Patterns)** — 从节点+连线中涌现的群体结构

---

## 4. Node Types & Symbols

### 4.1 Standard Node Shape

| Element | Shape | SVG | 含义 |
|---------|-------|-----|------|
| Default member | Circle (r=20) | `<circle>` | 群体中的个体 |
| Star (popular) | Circle + star marker | `<circle>` + `<polygon>` overlay | 被多人选择的核心人物 |
| Isolate | Circle + dashed border | `<circle stroke-dasharray>` | 无人选择/未选择他人 |
| Ego (focal person) | Double circle (concentric) | 两个 `<circle>`，gap=3px | 分析的焦点人物（egocentric 视图） |

**Auto-detection rules（基于数据自动标记）：**
- **Star:** in-degree ≥ mean + 1.5 × SD，或 in-degree ≥ group_size × 0.4
- **Isolate:** in-degree = 0 AND out-degree = 0
- **Neglectee:** in-degree = 0 但 out-degree > 0
- **Rejected:** 收到 rejection 数 ≥ 2

### 4.2 Node Sizing

节点大小可以反映社会计量指标：

| Mode | Size Rule | 含义 |
|------|-----------|------|
| Uniform (default) | 所有节点相同大小 (r=20) | 中性展示 |
| By in-degree | r = 14 + in_degree × 4 (min: 14, max: 40) | 越受欢迎越大 |
| By betweenness | r = 14 + normalized_betweenness × 26 | 桥接角色越重要越大 |

DSL: `config: sizing = in-degree` 或在节点上 `[size: large]`

### 4.3 Node Coloring

| Mode | Color Rule | 含义 |
|------|-----------|------|
| Default | All `#42A5F5` (blue) | 中性 |
| By group/category | 按 group 属性着色 | 区分子组（班级、部门、性别等） |
| By role | Star=gold, Isolate=gray, Normal=blue | 突出社会地位 |
| By custom attribute | 用户自定义 | 任意分类维度 |

Default color palette for groups (最多 8 组):
```
group1: #42A5F5 (blue)
group2: #66BB6A (green)
group3: #FFA726 (orange)
group4: #AB47BC (purple)
group5: #EF5350 (red)
group6: #26C6DA (cyan)
group7: #FFEE58 (yellow)
group8: #8D6E63 (brown)
```

### 4.4 Node Labels

| Element | Position | Font | 含义 |
|---------|----------|------|------|
| Name/ID | Below node center, 4px gap | 11px, `font-family: sans-serif` | Primary identifier |
| Role badge | Top-right corner | 9px | Optional: ★ star, ● isolate |
| Details | Below name | 9px, gray | Optional: age, title, etc. |

---

## 5. Edge Types (Connection Lines)

### 5.1 Relationship Direction

| Type | Line Style | DSL Syntax | SVG | 含义 |
|------|-----------|------------|-----|------|
| One-way choice | Arrow → | `A -> B` | `<line>` + `marker-end="url(#arrow)"` | A 选择了 B |
| Mutual choice | Double arrow ↔ | `A <-> B` | `<line>` + both markers | 相互选择 |
| Undirected | Plain line — | `A -- B` | `<line>` without markers | 已知关系，方向未知 |

### 5.2 Relationship Valence (正/负)

| Type | Line Style | DSL Syntax | SVG | 含义 |
|------|-----------|------------|-----|------|
| Positive/attraction | Solid line | `->` / `<->` / `--` | `<line>` solid, color: `#388E3C` (green) | 选择/喜欢/信任 |
| Negative/rejection | Dashed red line | `-x>` / `<x->` / `-x-` | `<line>` dashed, color: `#D32F2F` (red) | 拒绝/冲突/回避 |
| Neutral/indifferent | Dotted gray line | `-.>` / `<.->` / `-.-` | `<line>` dotted, color: `#9E9E9E` (gray) | 中性/无明确态度 |

### 5.3 Edge Weight (Relationship Strength)

| Weight | Line Width | DSL Syntax | 含义 |
|--------|-----------|------------|------|
| Weak (1) | 1px | `A -> B [weight: 1]` | 弱连接 |
| Normal (2, default) | 2px | `A -> B` | 一般连接 |
| Strong (3) | 3.5px | `A -> B [weight: 3]` 或 `A ==> B` | 强连接 |
| Very strong (4+) | 5px | `A -> B [weight: 4]` 或 `A ===> B` | 非常强连接 |

### 5.4 Edge Labels

```
A -> B [label: "best friend"]
C -x> D [label: "bullying"]
E <-> F [label: "study partners"]
```

### 5.5 Combined DSL Examples

```
# One-way positive choice
alice -> bob

# Mutual strong positive
alice <==> carol

# One-way rejection
dave -x> eve

# Mutual neutral
frank <.-> grace

# Weighted with label
alice -> bob [weight: 3, label: "trusted advisor"]
```

---

## 6. Structural Patterns (Auto-Detected)

Lineage 应自动检测并可选标注以下经典社会计量结构：

### 6.1 Individual-Level Patterns

| Pattern | Detection Rule | Visual Annotation |
|---------|---------------|-------------------|
| **Star** | in-degree ≥ mean + 1.5σ | Gold fill / ★ badge |
| **Isolate** | in-degree = 0 AND out-degree = 0 | Dashed border, gray fill |
| **Neglectee** | in-degree = 0, out-degree > 0 | Dashed border, blue fill |
| **Rejected** | rejection count ≥ 2 | Red dashed border |

### 6.2 Pair-Level Patterns

| Pattern | Detection Rule | Visual Annotation |
|---------|---------------|-------------------|
| **Mutual pair** | A→B AND B→A | Thicker bidirectional line |
| **Asymmetric pair** | A→B but NOT B→A | Standard arrow |

### 6.3 Group-Level Patterns

| Pattern | Detection Rule | Visual Annotation |
|---------|---------------|-------------------|
| **Clique** | Subgroup where all members mutually choose each other (≥3 members) | Shaded convex hull background |
| **Chain** | A→B→C→... (unidirectional sequence, no mutual) | Sequential arrow path highlighted |
| **Bridge** | Node connecting two otherwise separate clusters | Diamond shape overlay or highlight ring |

DSL 控制: `config: highlight = stars, isolates, cliques` (默认: `stars, isolates`)

---

## 7. Layout Rules

### 7.1 Layout Algorithm Options

Sociogram 支持多种布局，不同场景适用性不同：

| Layout | 算法 | 适用场景 | 复杂度 |
|--------|------|---------|--------|
| **Force-directed** (default) | Fruchterman-Reingold / spring model | 通用群体网络，自动聚类 | O(n² × iterations) |
| **Circular** | 均匀排列在圆周上 | 小组（≤15人），强调谁连接了谁 | O(n) |
| **Concentric** | 按 in-degree 分层圆环 | 强调核心-边缘结构 | O(n log n) |
| **Group-based** | 按 group 属性分区 | 跨组关系可视化 | O(n) + force within group |

### 7.2 Force-Directed Layout (Default)

Fruchterman-Reingold 算法实现：

```
初始化：节点随机放置在画布内
循环 max_iterations 次：
  对每对节点计算 repulsive force (f_rep = k²/d)
  对每条边计算 attractive force (f_att = d²/k)
  更新节点位置（clamp to canvas bounds）
  逐步降低 temperature（模拟退火）
```

| Parameter | Default Value | 含义 |
|-----------|--------------|------|
| k (optimal distance) | `sqrt(canvas_area / node_count)` | 节点间理想距离 |
| max_iterations | 300 | 收敛步数 |
| initial_temperature | canvas_width / 10 | 初始位移上限 |
| cooling_rate | 0.95 | 每步温度衰减 |
| min_distance | 60px | 节点最小间距（硬约束） |

### 7.3 Circular Layout

```
角度间隔 = 2π / node_count
第 i 个节点位置：
  x = center_x + radius × cos(i × 角度间隔 - π/2)
  y = center_y + radius × sin(i × 角度间隔 - π/2)
```

| Parameter | Default Value | 含义 |
|-----------|--------------|------|
| Radius | max(120, node_count × 20) | 圆的半径 |
| Start angle | -π/2 (12 o'clock) | 第一个节点的起始位置 |

**排序优化：** 按 group 属性聚集相邻位置，减少跨组连线交叉。

### 7.4 Concentric Layout

按社会地位分层：
```
Ring 0 (center):  Stars (in-degree 最高)
Ring 1:           Above-average in-degree
Ring 2:           Average in-degree
Ring 3 (outer):   Below-average + isolates
```

| Parameter | Default Value |
|-----------|--------------|
| Ring 0 radius | 0px (单个 star 放中心) 或 40px (多个) |
| Ring gap | 80px |
| Outer ring radius | ring_count × 80px |

### 7.5 Spacing & Canvas Rules

| Parameter | Default | 含义 |
|-----------|---------|------|
| Node radius | 20px (uniform) | 默认节点大小 |
| Min node-to-node gap | 60px | 避免重叠 |
| Edge-to-node gap | 2px | 线不穿入节点 |
| Canvas padding | 50px | 边缘留白 |
| Label gap below node | 4px | 标签与节点间距 |
| Arrow marker size | 8px | 箭头大小 |

### 7.6 Responsive Sizing

| Group Size | Recommended Layout | Canvas Size |
|------------|-------------------|-------------|
| ≤ 8 | Circular | 400 × 400 |
| 9-20 | Force-directed 或 Circular | 600 × 600 |
| 21-40 | Force-directed | 800 × 800 |
| 41+ | Force-directed + group clustering | 1000 × 1000+ |

---

## 8. DSL Grammar (Sociogram)

```ebnf
document        = header config* group_def* node_def* edge_def*
header          = "sociogram" quoted_string? NEWLINE

config          = "config:" config_key "=" config_value NEWLINE
config_key      = "layout" | "sizing" | "highlight" | "coloring"
config_value    = /[a-zA-Z0-9_, -]+/

group_def       = "group" ID properties? NEWLINE
                  INDENT node_ref+ DEDENT

node_def        = ID properties? NEWLINE
properties      = "[" property ("," property)* "]"
property        = "label:" quoted_string
               | "group:" ID
               | "size:" SIZE
               | "role:" ROLE
               | kv_prop

SIZE            = "small" | "medium" | "large"
ROLE            = "star" | "isolate" | "bridge"

edge_def        = ID edge_op ID edge_props? NEWLINE
edge_op         = "->" | "<->" | "--"          (* positive *)
               | "-x>" | "<x->" | "-x-"       (* negative/rejection *)
               | "-.>" | "<.->" | "-.-"        (* neutral *)
               | "==>" | "<==>" | "==="        (* strong positive *)
               | "===>" | "<===>"              (* very strong positive *)
edge_props      = "[" edge_prop ("," edge_prop)* "]"
edge_prop       = "label:" quoted_string
               | "weight:" NUMBER

ID              = /[a-zA-Z][a-zA-Z0-9_-]*/
quoted_string   = '"' /[^"]*/ '"'
NUMBER          = /[0-9]+/
kv_prop         = IDENTIFIER ":" VALUE
```

---

## 9. Test Cases

### Case 1: Basic Classroom Sociogram (Directed Choices)
```
sociogram "Mrs. Chen's 4th Grade Class"
  alice [label: "Alice"]
  bob [label: "Bob"]
  carol [label: "Carol"]
  dave [label: "Dave"]
  eve [label: "Eve"]
  frank [label: "Frank"]
  alice -> bob
  alice -> carol
  bob -> alice
  bob -> dave
  carol -> alice
  carol -> eve
  dave -> bob
  dave -> frank
  eve -> carol
  eve -> alice
  frank -> dave
```
验证：alice 是 star（in-degree 3），frank 是 neglectee（in-degree 1, 仅被 dave 选）。alice ↔ bob 和 alice ↔ carol 是 mutual pairs。

### Case 2: With Groups and Rejection (Bullying Analysis)
```
sociogram "Playground Dynamics"
  config: layout = force-directed
  config: highlight = stars, isolates, cliques
  config: coloring = group

  group boys [label: "Boys", color: "#42A5F5"]
    tom
    jack
    mike
    leo

  group girls [label: "Girls", color: "#EF5350"]
    anna
    beth
    chloe
    diana

  tom <-> jack
  tom -> mike
  jack -> leo
  mike -x> leo [label: "conflict"]
  anna <-> beth
  anna <-> chloe
  beth <-> chloe
  anna -> diana
  diana -.- tom
  leo -.- anna
```
验证：anna-beth-chloe 形成 clique（三人互选）。leo 接近 isolate（仅 jack 单向选择）。mike → leo 是 rejection（红色虚线）。diana 和 tom 之间是 neutral。

### Case 3: Organizational Influence Map
```
sociogram "Engineering Team Informal Influence"
  config: layout = concentric
  config: sizing = in-degree

  ceo [label: "CEO", group: leadership]
  vp [label: "VP Eng", group: leadership]
  lead1 [label: "Tech Lead A", group: team-a]
  lead2 [label: "Tech Lead B", group: team-b]
  dev1 [label: "Senior Dev", group: team-a]
  dev2 [label: "Dev", group: team-a]
  dev3 [label: "Dev", group: team-b]
  dev4 [label: "Junior Dev", group: team-b]
  ops [label: "DevOps", group: infra]

  dev1 -> lead1
  dev2 -> lead1
  dev2 -> dev1
  dev3 -> lead2
  dev4 -> dev3
  lead1 -> vp
  lead2 -> vp
  vp -> ceo
  dev1 -> ops [label: "deployment help"]
  dev3 -> ops [label: "infra questions"]
  lead1 <-> lead2 [label: "weekly sync"]
  dev4 -> dev1 [label: "mentorship"]
```
验证：concentric 布局中 lead1 和 vp 应在内圈（高 in-degree），dev4 在外圈。ops 是 bridge（连接 team-a 和 team-b）。

### Case 4: Group Therapy Sociogram (Social Atom)
```
sociogram "Group Therapy Session 5 - Trust Network"
  config: layout = circular

  therapist [label: "Dr. Park", role: star]
  james [label: "James"]
  maria [label: "Maria"]
  lee [label: "Lee"]
  sarah [label: "Sarah"]
  tom [label: "Tom"]
  nina [label: "Nina"]

  james -> therapist
  james <-> maria [weight: 3, label: "strong bond"]
  james -> lee
  maria -> therapist
  maria -> sarah
  lee -> therapist
  lee -.- nina
  sarah <-> nina
  sarah -> therapist
  tom -> therapist
  nina -> maria
```
验证：circular 布局，therapist 是 star。james ↔ maria 是 strong mutual pair（粗线）。tom 接近 isolate（只连接了 therapist）。lee 和 nina 之间是 neutral。

### Case 5: Criminal Network Analysis
```
sociogram "Operation Sunset - Communication Network"
  config: layout = force-directed
  config: sizing = betweenness

  boss [label: "Subject Alpha"]
  lt1 [label: "Lieutenant 1"]
  lt2 [label: "Lieutenant 2"]
  courier1 [label: "Courier A"]
  courier2 [label: "Courier B"]
  contact1 [label: "External Contact 1"]
  contact2 [label: "External Contact 2"]
  associate1 [label: "Associate"]
  associate2 [label: "Associate"]

  boss <-> lt1 [weight: 4]
  boss <-> lt2 [weight: 4]
  lt1 -> courier1
  lt1 -> courier2
  lt2 -> associate1
  lt2 -> associate2
  courier1 -> contact1 [label: "supplier"]
  courier2 -> contact2 [label: "distributor"]
  lt1 <-> lt2 [weight: 2]
  associate1 -.- courier1
```
验证：boss 和 lt1 的 betweenness 最高（节点最大）。courier1 是 bridge（连接 lt1 和 contact1）。层级结构应在 force-directed 中自然呈现。

### Case 6: Large Group Stress Test (30 nodes)
```
sociogram "Conference Networking"
  config: layout = force-directed

  p1 [label: "Person 1", group: a]
  p2 [label: "Person 2", group: a]
  p3 [label: "Person 3", group: a]
  p4 [label: "Person 4", group: a]
  p5 [label: "Person 5", group: a]
  p6 [label: "Person 6", group: b]
  p7 [label: "Person 7", group: b]
  p8 [label: "Person 8", group: b]
  p9 [label: "Person 9", group: b]
  p10 [label: "Person 10", group: b]
  p11 [label: "Person 11", group: c]
  p12 [label: "Person 12", group: c]
  p13 [label: "Person 13", group: c]
  p14 [label: "Person 14", group: c]
  p15 [label: "Person 15", group: c]
  p16 [label: "Person 16", group: d]
  p17 [label: "Person 17", group: d]
  p18 [label: "Person 18", group: d]
  p19 [label: "Person 19", group: d]
  p20 [label: "Person 20", group: d]
  p21 [label: "Person 21"]
  p22 [label: "Person 22"]
  p23 [label: "Person 23"]
  p24 [label: "Person 24"]
  p25 [label: "Person 25"]
  p26 [label: "Person 26"]
  p27 [label: "Person 27"]
  p28 [label: "Person 28"]
  p29 [label: "Person 29"]
  p30 [label: "Person 30"]
  p1 <-> p2
  p1 <-> p3
  p2 <-> p4
  p3 <-> p5
  p4 <-> p5
  p6 <-> p7
  p6 <-> p8
  p7 <-> p9
  p8 <-> p10
  p11 <-> p12
  p11 <-> p13
  p12 <-> p14
  p13 <-> p15
  p16 <-> p17
  p16 <-> p18
  p17 <-> p19
  p18 <-> p20
  p1 -> p6 [label: "cross-group"]
  p6 -> p11 [label: "cross-group"]
  p11 -> p16 [label: "cross-group"]
  p21 -> p1
  p22 -> p6
  p23 -> p11
  p24 -> p16
  p25 -- p26
  p27 -- p28
  p29 -- p30
```
验证：30 节点 → 自动 800×800 canvas。4 个 group 应通过 force-directed 自然聚类。p1、p6、p11、p16 是 cross-group bridges。p25-p30 是独立 pairs。

---

## 10. SVG Implementation Details

### 10.1 Arrow Markers

```xml
<defs>
  <!-- Positive arrow (dark gray) -->
  <marker id="sociogram-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>
  </marker>
  <!-- Rejection arrow (red) -->
  <marker id="sociogram-arrow-reject" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#D32F2F"/>
  </marker>
  <!-- Neutral arrow (gray) -->
  <marker id="sociogram-arrow-neutral" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9E9E9E"/>
  </marker>
</defs>
```

### 10.2 Edge Rendering

**Edge-to-edge calculation (同 ecomap)：**
- 线从节点边缘到节点边缘，不是中心到中心
- 计算方式：`(center_A, center_B)` 连线上，减去各自 radius + marker size

**Bidirectional edges：**
- Mutual choice (`<->`)：两端都有 marker，用单条线
- 避免重叠：如果 A→B 和 B→A 都是单向但不是 mutual，画两条略微弯曲的线（offset ±3px）

**Self-referential edges：**
- 不支持（sociogram 不需要自指关系）

### 10.3 Clique Highlighting

当 `config: highlight = cliques` 时：
1. 检测所有 cliques（完全子图，≥3 nodes）
2. 对每个 clique，计算 convex hull
3. 渲染半透明背景 `<polygon>` + 圆角处理

```xml
<polygon points="..." fill="#42A5F5" fill-opacity="0.08"
         stroke="#42A5F5" stroke-opacity="0.2" stroke-width="1"
         class="lineage-sociogram-clique"/>
```

### 10.4 CSS Classes

```css
.lineage-sociogram-node { }
.lineage-sociogram-node-star { }
.lineage-sociogram-node-isolate { }
.lineage-sociogram-edge { }
.lineage-sociogram-edge-positive { }
.lineage-sociogram-edge-negative { }
.lineage-sociogram-edge-neutral { }
.lineage-sociogram-label { }
.lineage-sociogram-clique { }
.lineage-sociogram-group-label { }
```

---

## 11. Sociogram Variants (Future Phases)

### 11.1 Social Atom (Moreno)
个人版 sociogram，一个人画出自己周围最重要的关系。可复用 ecomap radial layout。

### 11.2 Spectrogram
线性排列，成员在一条线上按某个维度排位。布局极简（一维）。

### 11.3 Target Sociogram
靶心布局——焦点人物在中心，关系越近的人越靠近靶心。类似 concentric layout 但以单人为中心。

---

## 12. Implementation Priority

| Priority | Feature | Complexity | 复用 |
|----------|---------|------------|------|
| P0 (Phase 3) | Circular layout + directed edges + 3 valence types | Medium | Arrow markers 复用 ecomap |
| P0 | Node auto-detection (star/isolate) | Low | 纯数据计算 |
| P1 | Force-directed layout (Fruchterman-Reingold) | High | 新算法，但公式明确 |
| P1 | Group coloring + group-based node clustering | Medium | Color palette 复用 ecomap |
| P1 | Edge weight → line thickness | Low | |
| P2 | Concentric layout | Medium | 基于 radial 改造 |
| P2 | Clique detection + convex hull highlighting | High | 图论算法 |
| P2 | Node sizing by metric (in-degree/betweenness) | Medium | |
| P3 | Edge labels | Low | 复用 ecomap |
| P3 | Social Atom variant (egocentric view) | Low | 复用 ecomap radial |
| P3 | Bridge detection | Medium | Betweenness centrality |
