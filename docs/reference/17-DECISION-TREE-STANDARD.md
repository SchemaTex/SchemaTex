# 17 — Decision Tree Standard Reference

*Decision tree 图表 — 覆盖三个互相独立的用户场景：决策分析（Howard-Raiffa EV rollback）、ML 决策树可视化（sklearn / XGBoost 训练结果）、分类 / 教学层级树（taxonomy）。一个 DSL，通过 `type:` header 分派三种渲染模式。*

> **References (学科惯例 + 相关标准):**
> - **Howard, Ronald A. (1966)** *Decision Analysis: Applied Decision Theory*. Stanford — 原始文献定义 square（decision）/ circle（chance）/ triangle（end）三符号约定
> - **Raiffa, Howard (1968)** *Decision Analysis: Introductory Lectures on Choices under Uncertainty*. Addison-Wesley — 决策树 EV rollback / fold-back 计算范式
> - **Breiman, L., Friedman, J., Olshen, R., Stone, C. (1984)** *Classification and Regression Trees (CART)*. Wadsworth — ML 决策树的鼻祖，定义 feature split / gini impurity / sample count
> - **Quinlan, J.R. (1986)** *Induction of Decision Trees*. Machine Learning 1(1) — ID3 / entropy 信息增益
> - **scikit-learn `sklearn.tree.plot_tree` convention** — feature + threshold + impurity + samples + value + class 的节点内部布局（[scikit-learn.org/stable/modules/tree.html](https://scikit-learn.org/stable/modules/tree.html)）
> - **Chen, T. & Guestrin, C. (2016)** *XGBoost: A Scalable Tree Boosting System*. KDD — Booster tree 的 cover / gain 注释
> - **R `rpart.plot` package** (Milborrow, 2022) — CART 树的标准 R 可视化，影响本 standard 的节点内容布局
> - **Graphviz `dot` tree layout** — L-R / T-B tidy tree 的 de-facto 排版参考
> - **Reingold, E.M. & Tilford, J.S. (1981)** *Tidier Drawings of Trees*. IEEE TSE 7(2) — 本 standard 层次布局算法基础
> - **Walker, J.Q. (1990)** *A Node-Positioning Algorithm for General Trees*. Software: Practice and Experience — 改良 Reingold-Tilford，支持 n-ary tree
> - **Lucidchart / SmartDraw / decisiontree.io decision tree template conventions** — SaaS 工具的 de-facto 渲染约定
>
> 注：无单一 ISO/IEEE 标准统管 decision tree 外观。Howard-Raiffa 符号学是决策分析教科书公认约定（MBA / consulting / operations research 领域）；CART + sklearn.plot_tree 是 ML 领域公认约定。本 standard 合并两派约定 + 第三个轻量 taxonomy 分支，形成可程序化渲染的统一规范。

---

## 1. 用户与需求（第一性原理）

Decision tree 名义上是同一种 "树" 图表，但真正使用这个名词的用户群体 **互相不重叠**。任何把三者压成一个渲染模式的设计都会同时得罪三方。本 standard 首先声明这点。

### 1.1 三类用户

| 用户 | 场景 | 核心诉求 | 关键视觉元素 |
|------|------|---------|-------------|
| **Decision analyst / MBA / consultant** | 投资决策、新产品 Go/No-Go、诉讼策略、A/B 方案比较 | 用 Howard-Raiffa 规范画决策树，EV 自动 rollback，probability 可编辑后实时重算 | 方形 / 圆形 / 三角形三符号，branch 上标概率 / choice name，节点附 EV 数字 |
| **Data scientist / ML practitioner** | 可视化训练好的 sklearn / XGBoost / LightGBM 决策树，做模型解释 / stakeholder demo | 节点内展示 feature + threshold + impurity + samples + class distribution；big tree 可压缩 | 矩形节点带多行内容 + 下方 class distribution mini-bar，分支标 "True / False" 或 "≤ / >"，可按 class 着色 |
| **Educator / classifier** | 生物分类、机器学习教学、医疗分诊、决策支持系统、"is-it-a-mammal" 风格知识树 | 清晰可读的 yes/no 二叉树，节点放问题，叶子放结论 | 椭圆 / 矩形节点带简短文本，分支标 yes / no 或自定义标签，深度 3–6 |

### 1.2 为什么不能统一

- **Decision analyst** 关心的是概率与期望值，节点造型必须按 Howard 符号区分 decision / chance / outcome；ML 场景没有这些符号。
- **ML practitioner** 节点内容多行且内部有 mini-bar，几何上是 160 × 90 矩形；decision analyst 的 chance 节点是 ø 20 的圆，几何不兼容。
- **Educator** 节点简短，要求深层 + 整齐视觉；不需要 EV 也不需要 impurity。

三者共用的只是 "树" 的 **布局算法**（tidy tree）和 **DSL 缩进语法**。Renderer 必须按模式分派。

### 1.3 商业动机

- Mermaid / Graphviz 画 flowchart-diamond 可以模拟决策点，但 **没有 dedicated 的 decision tree 类型**，更没有 probability 标注 / EV rollback / ML 内容布局。
- sklearn `plot_tree` 输出的是 matplotlib PNG，无 SVG，无交互，配色业界公认丑陋，stakeholder demo 不能直接用。
- Lucidchart 的决策树模板需要手动排版，无 DSL，AI 生成结果不可用。

Schematex 的定位：**Text DSL 驱动 + 零依赖 + 合规视觉** → 填补 Mermaid 和 sklearn 之间的空白。AI 生成尤其适合：LLM 输出 indented DSL 比输出 matplotlib 代码更可靠。

---

## 2. 市场需求数据

| Keyword | US Volume | Global | KD | CPC | 来源 |
|---------|----------:|-------:|---:|----:|------|
| decision tree | 18,000 | 78,000 | 60 | $0.70 | Ahrefs 2026-04 |
| machine learning decision tree | 9,500 | 25,000+ | 44 | $2.10 | Ahrefs |
| probability tree | 14,000 | 35,000 | 32 | $0.40 | Ahrefs |
| decision tree maker | 2,800 | 7,200 | 38 | $4.80 | Ahrefs |
| decision tree template | 3,400 | 9,100 | 42 | $5.20 | Ahrefs |
| sklearn decision tree | 4,100 | 14,000 | 22 | $0.90 | Ahrefs |
| decision tree analysis | 1,600 | 5,400 | 44 | $3.60 | Ahrefs |

### 2.1 竞争格局

| 工具 | 优点 | 缺点 |
|------|------|------|
| **sklearn `plot_tree`** | ML 行业标准，开箱即用 | 配色丑陋、matplotlib only、无 SVG / 无交互 / 非 web 友好 |
| **Graphviz dot + sklearn export** | 漂亮、SVG 输出 | 需安装 graphviz 二进制、不可控节点样式、DSL 冗长 |
| **Lucidchart / SmartDraw** | 拖拽 UI，商业模板多 | 收费、无 DSL、AI 难生成、无 EV 自动计算 |
| **dtreeviz (python)** | ML 专用，视觉好 | Python only，web 集成需要 SVG export pipeline |
| **decisiontree.io** | 专注 decision analysis，EV rollback | 闭源、UI 驱动、无 embed |
| **Mermaid flowchart** | 免费、DSL | 无概率标注 / 无 EV / 无 ML 节点内容 / 无 CART 符号 |

### 2.2 Schematex 差异化

1. **三模式一体** — 同一库覆盖三种用户，避免他们分别装三个工具
2. **SVG + 零依赖** — 可直接嵌入 React / Vue / Obsidian / Notion-like
3. **DSL-first** — AI 友好，LLM 输出结构化决策树或直接从 sklearn JSON 导入
4. **EV 自动计算** — decision analysis 模式下，branch 改概率后 EV 回传
5. **合规视觉** — Howard 符号 + CART 惯例都被严格遵守，不发明新记号

---

## 3. 标准合规

Schematex decision tree 严格遵循下列既定惯例（不发明新符号）：

### 3.1 Decision Analysis 模式（Howard 1966 / Raiffa 1968）

- **Decision node = 方形**（square, `<rect>`）— 决策者可控的选择点
- **Chance node = 圆形**（circle, `<circle>`）— 随机事件，子分支概率和 = 1.0
- **End / Outcome node = 三角形**（triangle, `<polygon>`）— 终端 payoff
- **Branch from decision**: 标签 = choice name（无概率）
- **Branch from chance**: 标签 = probability p ∈ [0, 1]
- **EV rollback**: 从叶子向根计算，chance 节点 EV = Σ(p × child_EV)，decision 节点 EV = max(child_EV)，最优选择用粗线或 `data-optimal="true"` 标记

### 3.2 ML 模式（CART / sklearn plot_tree 惯例）

- **Internal split node = 圆角矩形**（rounded rect），内部 5 行文字：
  1. 第 1 行：`feature <op> threshold`（如 `petal_width <= 0.8`）
  2. 第 2 行：`impurity_name = value`（`gini = 0.337` 或 `entropy = 0.918` 或 `mse = 12.4`）
  3. 第 3 行：`samples = n`
  4. 第 4 行：`value = [n0, n1, ...]`（训练集到达本节点的 class count）
  5. 第 5 行：`class = winner_class` 或 `predicted = mean_value`（regression）
  6. 底部：class distribution mini-bar（可选）
- **Leaf node**: 同样矩形，但无第 1 行（无 split），填充色按 majority class / prediction value 取色（sklearn 用 majority class 纯度 → 不透明度）
- **Branch label**: 左支 "True" 或 "≤ threshold"，右支 "False" 或 "> threshold"（二者等价，由 DSL `branchLabels: boolean|relation` 切换）
- **Coloring**: sklearn 约定 — 节点填充 = majority class 对应的 palette color，alpha 随 majority class 纯度线性变化（0.1 → 1.0）

### 3.3 Taxonomy 模式

无单一标准，沿用生物分类书 + flashcard 教材惯例：

- **Node = 圆角矩形**（与 entity structure / fishbone header 视觉一致）
- **Branch label = 自定义**（默认 "yes" / "no"，可指定）
- **Leaf = 叶子**（与内部节点同形状但填充色区分，或加 `<title>` = "leaf"）

---

## 4. Node 类型

### 4.1 汇总

| Mode | Node Kind | Shape | 默认尺寸 | 填充 | DSL 关键字 |
|------|-----------|-------|---------|------|-----------|
| decision | Decision | `<rect>` 直角 | 50 × 30 | `--schematex-dtree-decision-fill` (`#dcfce7` green tint) | `decision` |
| decision | Chance | `<circle>` | r = 14 | `--schematex-dtree-chance-fill` (`#dbeafe` blue tint) | `chance` |
| decision | Outcome / End | `<polygon>` 三角形 | 24 × 24 | `--schematex-dtree-outcome-fill` (`#f1f5f9` gray) | `end` / `outcome` |
| ml | Split | `<rect>` rx=6 | 180 × 90 | class-driven (见 §3.2) | `split` |
| ml | Leaf | `<rect>` rx=6 | 180 × 70 | class-driven | `leaf` |
| taxonomy | Internal | `<rect>` rx=8 | 140 × 44 | `--schematex-dtree-taxon-fill` (`#eef2ff`) | `q` / `question` |
| taxonomy | Leaf | `<rect>` rx=8 | 140 × 44 | `--schematex-dtree-taxon-leaf-fill` (`#f0fdf4`) | `a` / `answer` / `leaf` |

### 4.2 Decision-analysis 节点详情

**Decision 节点（方形）**
- 纯方形 50 × 30，`<rect>` stroke 1.5px
- 标签在节点右侧或上方（可配 `labelPosition: right|above`）
- 可附 `EV: <num>` 在节点上方小字（10px, muted）
- 最优分支用 2.5px 粗线 + `data-optimal="true"` 标记

**Chance 节点（圆）**
- `<circle>` r=14, stroke 1.5px
- 子分支必须有 probability，Σp = 1.0（parser 校验）
- EV 数字显示在节点右上 (12px)

**Outcome 节点（三角形）**
- `<polygon points="0,0 24,12 0,24"/>`（右指三角）
- 右侧紧贴 payoff 数字 + 可选 description
- Payoff 格式支持：`$1,200` / `-$500` / `0.85` / 纯 label

### 4.3 ML 节点详情

节点内部布局（180 × 90 为例，padding 8px）：

```
┌──────────────────────────────┐
│ petal_width <= 0.8           │ ← 14px, 500 weight
│ gini = 0.337                 │ ← 11px, muted
│ samples = 120                │ ← 11px, muted
│ value = [50, 50, 20]         │ ← 11px, mono font
│ class = setosa               │ ← 12px, 500 weight, colored
│ ▓▓▓▓▓▓░░░░░░░                │ ← class distribution mini-bar, 6px tall
└──────────────────────────────┘
```

- Regression tree：第 2 行变 `mse = 12.4`，第 4 行变 `value = 42.3`，第 5 行变 `predicted = 42.3`，无 mini-bar（可用色温表示）
- Mini-bar 宽度按 samples 归一化，分段按 class count 比例，色板 = class palette

### 4.4 Taxonomy 节点

- 简洁矩形，单行或两行文本（自动 wrap，≤ 20 汉字 / 30 英文）
- Leaf 填充色略异，视觉上仍与 internal 同形状
- 可选 icon slot（左侧 16 × 16 预留区）

---

## 5. Edge 类型

### 5.1 几何与样式

| Mode | Edge Type | 标签位置 | 标签内容 | 线型 |
|------|-----------|---------|---------|------|
| decision | decision→child | mid-branch, above | choice name | 1.5px, 最优支 2.5px |
| decision | chance→child | mid-branch, above | probability (e.g. `0.35`) | 1.5px, 可选粗细按 p |
| ml | split→child | mid-branch, above | `True` / `False` 或 `≤ 0.8` / `> 0.8` | 1.2px |
| taxonomy | internal→child | mid-branch, above | `yes` / `no` / 自定义 | 1.2px |

### 5.2 路径形状

所有 edge 使用 **L-shaped orthogonal path**（与 entity structure / phylo rectangular 一致）：
- 从父节点下/右边缘出发，走 90° 折线到子节点上/左边缘
- 折线拐点在父子 y 中点（top-down）或 x 中点（left-right）
- 不使用 bezier 或 dagre diagonal（保持视觉工整，便于教学打印）

### 5.3 概率加粗（可选）

`edgeWeight: probability` 开启后，chance → child 分支 stroke-width = `0.5 + 3 × p`。这个功能对条件概率树（Bayes 题）尤其有用，视觉上立刻看出主导路径。

### 5.4 采样流加粗（ML 可选）

`edgeWeight: samples` 开启后，ml split → child stroke-width 按流入 samples 比例，类似 Sankey。帮助理解 imbalanced tree 的主流路径。

---

## 6. DSL Grammar

### 6.1 通用结构

```
<type-header>
"<title>"

<config-block>?

<tree-body>
```

**Type header** 选择模式：
- `decisiontree:decision` 或 `decisiontree:da` — 决策分析
- `decisiontree:ml` — ML 可视化
- `decisiontree:taxonomy` 或 `decisiontree:tax` — 分类树
- 只写 `decisiontree` 等价于 `decisiontree:taxonomy`（最常见的教学场景）

### 6.2 Decision-analysis DSL

```
decisiontree:decision "New Product Launch"

direction: left-right

decision "Launch strategy"
  choice "Soft launch"
    chance "Market response"
      prob 0.6 end payoff=150000 "Good reception"
      prob 0.3 end payoff=40000  "Mixed"
      prob 0.1 end payoff=-30000 "Poor"
  choice "Full launch"
    chance "Market response"
      prob 0.5 end payoff=300000 "Good reception"
      prob 0.3 end payoff=80000  "Mixed"
      prob 0.2 end payoff=-120000 "Poor"
  choice "No launch"
    end payoff=0 "Status quo"
```

**EV auto-rollback**（渲染时计算）：
- `end` 节点 EV = payoff
- `chance` 节点 EV = Σ (prob_i × child_EV_i)
- `decision` 节点 EV = max(child_EV)；最优 choice 在其 edge 添加 `data-optimal="true"` + 粗线
- 渲染在每个节点右上小字 `EV=123,400`

**校验规则**：
- 每个 chance 节点下 prob 之和必须 ∈ [0.999, 1.001]，否则 parser error
- decision 节点的子必须都是 `choice`
- chance 节点的子必须都是 `prob`
- 所有路径必须以 `end` 结尾

### 6.3 ML DSL（两种输入方式）

**方式 A — 直接手写**：

```
decisiontree:ml "Iris classification"

classes: setosa, versicolor, virginica
impurity: gini
branchLabels: relation

split feature=petal_width op=<= threshold=0.8
  samples=120 value=[50, 35, 35] gini=0.66
  true leaf samples=50 value=[50, 0, 0] gini=0 class=setosa
  false split feature=petal_width op=<= threshold=1.75
    samples=70 value=[0, 35, 35] gini=0.5
    true split feature=petal_length op=<= threshold=4.95
      samples=36 value=[0, 32, 4] gini=0.198
      true leaf samples=32 value=[0, 32, 0] gini=0 class=versicolor
      false leaf samples=4 value=[0, 0, 4] gini=0 class=virginica
    false leaf samples=34 value=[0, 3, 31] gini=0.162 class=virginica
```

**方式 B — 从 sklearn JSON 导入**：

```
decisiontree:ml "Iris classification" [source: sklearn-json]

classes: setosa, versicolor, virginica
impurity: gini

import <<<
{
  "feature_names": ["sepal_length","sepal_width","petal_length","petal_width"],
  "tree_": { ... sklearn.tree.DecisionTreeClassifier.tree_ attributes serialized ... }
}
>>>
```

Importer 实现：消费 `sklearn.tree.export_text(..., show_weights=True)` JSON dump 或用户自己序列化的 `tree_` 字段（`feature`, `threshold`, `children_left`, `children_right`, `impurity`, `n_node_samples`, `value`）。Importer 生成等价的手写 DSL AST。

### 6.4 Taxonomy DSL

缩进决定结构，`:` 分隔 question 与 label：

```
decisiontree "Is it a mammal?"

q "Has fur or hair?"
  yes: q "Produces milk?"
    yes: a "Mammal"
    no:  a "Unknown — investigate further"
  no: q "Lays eggs?"
    yes: q "Has feathers?"
      yes: a "Bird"
      no:  a "Reptile / Fish / Amphibian"
    no: a "Invertebrate"
```

缩进为 2 空格，`yes:` / `no:` 为预留分支关键字；自定义标签通过 `label "custom text"`：

```
q "Credit score"
  label ">= 700": a "Auto-approve"
  label "600-699": q "Income verified?"
  label "< 600": a "Reject"
```

### 6.5 DSL EBNF

```ebnf
document        = type_header NEWLINE title NEWLINE
                  config_block?
                  tree_body

type_header     = "decisiontree" (":" mode)?
mode            = "decision" | "da" | "ml" | "taxonomy" | "tax"

title           = quoted_string

config_block    = (config_line)+
config_line     = key ":" value NEWLINE

tree_body       = node (NEWLINE INDENT tree_body)*

# Decision analysis
node_decision   = ("decision" | "chance" | "choice" | "prob" PROB | "end")
                  property_list? quoted_string?

# ML
node_ml         = ("split" | "leaf" | "true" | "false")
                  kv_list? quoted_string?

# Taxonomy
node_tax        = ("q" | "question" | "a" | "answer" | "leaf"
                  | ("yes" | "no" | "label" quoted_string) ":")
                  quoted_string?

kv_list         = (KEY "=" VALUE)+
VALUE           = NUMBER | BRACKETED_LIST | QUOTED | IDENT
PROB            = NUMBER                       # 0.0 – 1.0
INDENT          = "  "                         # 2 spaces per level
```

---

## 7. Layout Algorithm

### 7.1 选型

复用 **Reingold-Tilford tidy tree**（Walker 1990 改良版，支持 n-ary）：
- 与 phylo rectangular layout 同一家族（可复用 `src/diagrams/phylo/layout.ts` 的骨架）
- 与 entity structure 同一家族（tier-based 是 tidy tree 的特例）
- 复杂度 O(n)，无需力导向

### 7.2 方向

| Direction | DSL | 适用 |
|-----------|-----|------|
| `top-down` (default) | `direction: top-down` | 所有模式；taxonomy 首选 |
| `left-right` | `direction: left-right` | decision analysis 首选（Howard 教科书惯例）；大 ML 树（高度 ≤ 宽度） |
| `right-left` | `direction: right-left` | 罕见，RTL 场景 |

### 7.3 间距参数

| 参数 | Default | 说明 |
|------|---------|------|
| `siblingGap` | 24 | 同层兄弟节点最小间距（沿 layout 横向） |
| `subtreeGap` | 40 | 不同父的兄弟子树最小间距 |
| `levelGap` | 80 | 父子层之间距离（沿 layout 纵向） |
| `nodeWidth` (ml) | 180 | ML split/leaf 节点宽度 |
| `nodeHeight` (ml) | 90 / 70 | ML split 高度 / leaf 高度 |

### 7.4 概率加权分支长度（可选）

`branchLength: probability` 模式下（仅 decision mode），chance → child 的 levelGap 按 p 缩放（`levelGap × (0.5 + p)`），使高概率路径视觉更显著。默认关闭，避免破坏 tidy 布局的整齐感。

### 7.5 叶子对齐

所有模式默认 **叶子深度对齐**（所有 leaf 落在同一 level line）—— 与 phylo cladogram 一致，视觉整齐，教学友好。可通过 `leafAlign: false` 关闭（让深度参差的分支展现自然高度差）。

### 7.6 大树处理

对于 ML tree > 50 leaves：

- **Depth cutoff**（默认）— `maxDepth: 5` 超过的子树折叠成 `...` 节点，保留 `data-truncated="true"`
- **Sample threshold** — `minSamples: 50` 小于阈值的叶子折叠
- **Collapsible subtree**（交互式，P2）— `data-collapsed="true"` + CSS 控制

---

## 8. Rendering

### 8.1 分派架构

```
renderer.ts
  ├── renderDecision(layout) → decision-mode SVG
  ├── renderML(layout)       → ml-mode SVG
  └── renderTaxonomy(layout) → taxonomy-mode SVG
    
common/
  ├── renderEdges(layout, labelFn) → L-shaped paths + mid-branch text
  ├── renderFrame() → title / desc / bg
  └── scaleBar? (decision mode 无，ml optional)
```

### 8.2 Decision mode

- Decision rect：stroke color = `accent`，fill = `decisionFill`
- Chance circle：stroke = `strokeMuted`，fill = `chanceFill`
- End triangle：stroke = `strokeMuted`，fill = `outcomeFill`
- Probability label 在 edge 中点，10px, muted
- Choice name label 在 edge 中点，12px, 500
- EV 数字悬浮在节点右上，10px, mono font，`data-ev=<num>`
- 最优路径：stroke 2.5px + stroke 颜色 = `positive`
- Payoff 在三角节点右侧，11px mono

### 8.3 ML mode

- 节点 rect 填充按 sklearn 算法：
  - 取 majority class index → palette color
  - 纯度 = max(value) / sum(value)
  - alpha = 0.1 + 0.9 × (纯度 − 1/n_classes) / (1 − 1/n_classes)
  - 公式确保 "完全随机节点" alpha=0.1，"纯节点" alpha=1.0
- 节点内 5 行文字按 §4.3 布局
- Mini-bar：最后一行下方 6px tall 水平条，分段按 value 比例，各段颜色 = class palette
- Branch label：`True`/`False`（默认）或 `≤ threshold`/`> threshold`，10px
- Regression tree：无 mini-bar，节点填充按 predicted value 在 viridis / cool-warm 连续色板映射

### 8.4 Taxonomy mode

- 内部节点：fill = `taxonFill`，stroke = `strokeMuted`
- 叶子：fill = `taxonLeafFill`（略不同），可选 stroke = `positive`
- 标签：text-anchor middle, `dominant-baseline="central"`
- 分支标签：mid-branch，10px, muted
- 支持 icon slot（左 16×16 预留）

### 8.5 共用

- 所有模式 SVG 带 `<title>` + `<desc>`（accessibility）
- 根节点 `data-root="true"`
- 叶子 `data-leaf="true"`
- 节点 `data-node-id="<id>"`，边 `data-edge="from→to"`
- ML 节点额外 `data-class="<class>"`, `data-samples="<n>"`, `data-impurity="<v>"`

---

## 9. Theme 集成

### 9.1 新 semantic tokens（添加到 `src/core/theme.ts`）

```ts
export interface DecisionTreeTokens {
  // decision-analysis mode
  decisionFill: string;
  decisionStroke: string;
  chanceFill: string;
  chanceStroke: string;
  outcomeFill: string;
  outcomeStroke: string;
  optimalEdge: string;        // highlighted EV-max path
  evText: string;             // EV number color

  // ml mode
  mlClassPalette: string[];   // 10 categorical classes default
  mlRegressionRamp: [string, string];  // [cold, hot] for regression
  mlImpurityText: string;     // muted gray for gini/entropy/mse numbers
  mlSamplesText: string;
  mlMiniBarBg: string;        // fallback when no class data

  // taxonomy mode
  taxonFill: string;
  taxonStroke: string;
  taxonLeafFill: string;
  taxonLeafStroke: string;

  // shared
  branchLabelText: string;
  probabilityEdgeStyle: "uniform" | "weighted";  // default uniform
}
```

### 9.2 三 preset 取值

| Token | default | monochrome | dark |
|-------|---------|------------|------|
| decisionFill | `#dcfce7` | `#ffffff` | `#1b3a1c` |
| chanceFill | `#dbeafe` | `#ffffff` | `#102a43` |
| outcomeFill | `#f1f5f9` | `#ffffff` | `#1e1e1e` |
| optimalEdge | `#16a34a` | `#000000` | `#4ade80` |
| mlClassPalette | Tailwind "sky/emerald/amber/rose/violet/teal/pink/lime/cyan/orange" 500 | grayscale 10 steps | Catppuccin accent 10 |

### 9.3 CSS custom properties

所有 token 通过 `--schematex-dtree-*` 暴露：
- `--schematex-dtree-decision-fill`
- `--schematex-dtree-chance-fill`
- `--schematex-dtree-outcome-fill`
- `--schematex-dtree-optimal-edge`
- `--schematex-dtree-class-0` … `--schematex-dtree-class-9`
- `--schematex-dtree-impurity-text`
- `--schematex-dtree-branch-label`
- `--schematex-dtree-taxon-fill`
- `--schematex-dtree-taxon-leaf-fill`

### 9.4 Resolver

```ts
export function resolveDecisionTreeTheme(name: ThemeName): BaseTheme & DecisionTreeTokens
```

---

## 10. 测试用例

共 15 个，覆盖三模式 × 常见场景 + edge cases。

### Case 1 — Umbrella decision（教科书经典，decision mode）

```
decisiontree:decision "Should I take the umbrella?"

decision "Take umbrella?"
  choice "Yes"
    chance "Weather"
      prob 0.4 end payoff=-2  "Rains (slight annoy)"
      prob 0.6 end payoff=-1  "No rain (carry burden)"
  choice "No"
    chance "Weather"
      prob 0.4 end payoff=-10 "Rains (soaked)"
      prob 0.6 end payoff=0   "No rain (free)"
```

验证：EV(Yes)=-1.4, EV(No)=-4；optimal = Yes，branch 加粗。

### Case 2 — Investment decision (3-branch chance, decision mode)

Launch soft / full / none，每策略下 3 概率分支（参见 §6.2 原例）。验证 EV rollback 正确：soft EV=$103k, full EV=$150k（optimal），no=$0。

### Case 3 — Oil drilling classic（Raiffa 例）

```
decisiontree:decision "Oil drilling decision"
direction: left-right

decision "Drill or sell?"
  choice "Drill"
    chance "Seismic test first?"
      ...
```

4 层嵌套 decision-chance-decision-chance，测试多层 EV rollback。

### Case 4 — Iris ML tree（sklearn 直译，ml mode）

见 §6.3 方式 A DSL。验证：
- 4 leaves，3 classes
- 每节点内容 5 行
- class distribution mini-bar
- Setosa leaf 纯度 1.0 → alpha 1.0
- Split node alpha < 1.0

### Case 5 — Iris from sklearn JSON import

同 Case 4 数据但用方式 B（JSON import）。验证 importer 产生与 Case 4 视觉一致的 SVG。

### Case 6 — Regression tree（Boston housing 风格）

```
decisiontree:ml "Housing price regression"
impurity: mse

split feature=RM op=<= threshold=6.94
  samples=506 value=22.5 mse=84.4
  true split feature=LSTAT op=<= threshold=14.4
    samples=430 value=19.9 mse=40.2
    true leaf samples=255 value=23.3 mse=26.0
    false leaf samples=175 value=14.9 mse=23.3
  false leaf samples=76 value=37.2 mse=79.7
```

验证：无 mini-bar；节点填充按 value 从冷到暖；`predicted = 22.5` 显示在第 5 行。

### Case 7 — Mammal taxonomy（教学基础，4 层）

见 §6.4 DSL。验证：
- 所有 leaf 对齐到同一深度（leafAlign: true 默认）
- yes/no label 位置
- 深度 4

### Case 8 — Medical triage taxonomy（custom labels）

```
decisiontree:taxonomy "ED triage level"

q "Airway compromise?"
  yes: a "Level 1 — Resuscitation"
  no: q "Vital signs unstable?"
    yes: a "Level 2 — Emergent"
    no: q "Multiple resources needed?"
      yes: a "Level 3 — Urgent"
      no: q "One resource needed?"
        yes: a "Level 4 — Less urgent"
        no: a "Level 5 — Non-urgent"
```

深度 5，验证 left-right 布局更紧凑。

### Case 9 — Bayesian probability tree

```
decisiontree:decision "COVID test Bayesian" [branchLength: probability]

chance "Has disease?"
  prob 0.01 chance "Test result (infected)"
    prob 0.95 end payoff=1 "True positive"
    prob 0.05 end payoff=0 "False negative"
  prob 0.99 chance "Test result (healthy)"
    prob 0.03 end payoff=0 "False positive"
    prob 0.97 end payoff=1 "True negative"
```

验证 `branchLength: probability` 效果（0.99 分支比 0.01 分支明显长）。

### Case 10 — Imbalanced large ML tree（50+ leaves，performance test）

程序生成：模拟 sklearn 训练深度 10 的树，约 60 leaves。验证：
- Layout 时间 < 50ms
- SVG 渲染不崩
- 默认 maxDepth=5 时显示 `...` truncation 节点
- 关闭 maxDepth 时整树完整输出

### Case 11 — XGBoost booster tree（gain / cover 注释）

```
decisiontree:ml "XGBoost booster tree #0"
impurity: gain

split feature=age op=< threshold=35 gain=120.5 cover=500
  true split feature=income op=< threshold=50000 gain=45.3 cover=220
    ...
```

验证 impurity=gain 模式下文字行变为 `gain = 120.5` + `cover = 500`。

### Case 12 — 4-class ML tree（class palette 循环）

4 classes 的 ML tree，验证 class 0/1/2/3 分别使用 palette 前 4 色。

### Case 13 — Taxonomy with icons（P2 feature preview）

```
decisiontree "Is it a bird?"

q "Has feathers?" [icon: "feather"]
  yes: q "Can fly?" [icon: "wing"]
    yes: a "Flying bird" [icon: "bird"]
    no:  a "Flightless bird (e.g., penguin)" [icon: "penguin"]
  no: a "Not a bird"
```

icon slot 预留，无 icon set 时回退纯文本。

### Case 14 — Decision tree with multi-stage sensitivity（嵌套 decision）

决策 → 结果 → 另一决策。验证 decision 节点可出现在非 root 位置，EV rollback 递归正确。

### Case 15 — Edge case: chance node with prob sum ≠ 1.0

```
chance "Bad input"
  prob 0.4 end payoff=100 "A"
  prob 0.4 end payoff=50  "B"
```

验证 parser 报 error `probabilities do not sum to 1.0 (got 0.8)`。

---

## 11. Implementation Plan (~3 weeks)

| Phase | Days | Scope | DoD |
|-------|:----:|-------|-----|
| **P0.0 Parser** | 4 | 3 模式通用递归下降；type dispatch；EBNF §6.5 全量；sklearn JSON importer 简化版（接受 `feature_names` + `tree_` 结构） | AST 类型定义、15 test cases 全部 parse 成功、错误信息带行号 |
| **P0.1 Layout** | 2 | 复用 tidy tree（Walker 1990）；top-down / left-right；叶子对齐；`branchLength: probability` 支持 | 所有 15 case layout 结果 snapshot test 通过 |
| **P0.2 EV Rollback** | 2 | decision mode 后序遍历计算 EV；校验 Σprob=1；最优 choice 标记 | Case 1/2/3/9 EV 数值精确（±0.001） |
| **P0.3 Renderers** | 5 | renderDecision（3 节点形状 + EV + payoff）；renderML（5 行内部布局 + mini-bar + alpha coloring）；renderTaxonomy（矩形 + yes/no label） | Case 1/4/7 视觉对齐 reference SVG；通过 DOMPurify 验证（合法 SVG） |
| **P0.4 Theme** | 1 | DecisionTreeTokens 定义；3 preset 映射；resolver；CSS custom properties | `resolveDecisionTreeTheme('default'|'monochrome'|'dark')` 返回完整 token；CSS var 在 SVG `<style>` 中注入 |
| **P0.5 sklearn Importer** | 2 | 接受 `export_text` JSON 或用户自序列化 tree_ ；转为内部 AST；支持 feature_names / class_names | Case 5 与 Case 4 snapshot 相同 |
| **P0.6 Tests** | 1 | 15 cases 覆盖；performance (Case 10) < 50ms layout；视觉 3 case 目视 | `npm run test` 全绿 |
| **P1** (optional) | +3 | Icon slot、branchWeight=samples ML 模式、regression color ramp、collapsible subtree data-hook、XGBoost gain/cover 变体 | — |

### 总计

- **P0 刚好发布（MVP for 三模式）**：~17 天 ≈ 3 周（含 buffer）
- **P1 增强**：+3 天

### 风险

- **sklearn JSON 格式不稳定** — `tree_` 是 C 结构体序列化，官方无稳定 JSON schema。Importer 需基于常见社区序列化（`export_text` / user dump）设计，记录为限制。
- **ML big tree 可读性** — 50+ leaves 的 SVG 可能超出可用屏幕，需要 maxDepth / truncation 默认策略（见 §7.6）。
- **EV rollback float 精度** — 深嵌套树累积浮点误差；使用 `number` 不引入 decimal library，DoD 容差 ±0.001。

---

## 12. Open Questions / ⚠️ NEEDS VICTOR INPUT

### 12.1 Interactive pruning display for ML

Q：ML big tree 是否支持 client-side 交互式折叠（点击节点展开 / 收起子树）？

- **Option A — 只出 data-attribute，CSS / 消费者 JS 自行实现** ✅ 推荐，零依赖原则
- **Option B — 内置 vanilla JS snippet** — 违反零依赖；不推荐
- **Option C — 提供 hook API，但不带 JS** — 在 SVG 里内嵌 `<script>` with opt-in flag

⚠️ **NEEDS VICTOR INPUT**：确认 A 策略 —— renderer 只保证 `data-collapsed` / `data-depth` 属性齐全，由消费者（如 MyMap.ai）实现 interaction。

### 12.2 Truly massive ML trees（>500 leaves）

Q：是否支持 500+ leaves 的 ML tree 渲染？

考量：
- sklearn 不限深度时，一棵树可能数千 leaves（尤其无剪枝）
- 一个 SVG 文件几 MB，DOM 节点数万，浏览器性能差
- 实际 stakeholder demo 场景 > 200 leaves 已经不可读

⚠️ **NEEDS VICTOR INPUT**：
- **建议方案**：默认 `maxDepth: 6` + `minSamples: <5% of total>`，超过阈值折叠为 `...` 节点。用户可显式 `maxDepth: unlimited` override，但 renderer 输出 warning comment。
- 不支持虚拟滚动 / lazy rendering（违反 SVG 静态 string 输出的产品定位）。
- 若用户真需要 10k-leaves tree，他们应该用 Python + matplotlib 或专门工具，不是 Schematex。

### 12.3 Regression 节点的颜色映射

Q：Regression tree 节点填充应如何映射 predicted value？

- **A — Viridis 连续色板**（ML 社区熟悉）
- **B — Cool-warm divergent**（低值蓝、高值红，比较直观）
- **C — 用户指定 min/max + 色板**（灵活但 DSL 冗长）

⚠️ **NEEDS VICTOR INPUT**：推荐 B，加 `regressionRamp: "cool-warm" | "viridis" | "custom"` DSL 选项，默认 cool-warm。

### 12.4 `decisiontree` vs `tree` 作为 type header

Q：type keyword 用 `decisiontree` 还是更短的 `tree`？

- `tree` 与 phylo / taxonomy / hierarchy 等场景都相关，过于宽泛
- `decisiontree` 明确，但打字稍长
- SEO 角度 `decisiontree` 更直接命中关键词

⚠️ **NEEDS VICTOR INPUT**：推荐 `decisiontree`（含别名 `dtree`）。

### 12.5 sklearn JSON schema 稳定性

Q：官方无稳定 schema，是否自定义 Schematex 的 intermediate JSON 格式？

建议：定义 `SchematexMLTreeJSON`（与 `export_text` + `tree_` 核心字段 1:1 映射），在文档给出 Python helper snippet：

```python
def schematex_export(clf):
    return {
        "feature_names": list(clf.feature_names_in_),
        "class_names": list(clf.classes_),
        "nodes": [...],  # 标准化后的 node array
    }
```

⚠️ **NEEDS VICTOR INPUT**：是否值得在 `docs/examples/` 附 Python helper？（倾向 yes，SEO 友好 + 降低集成摩擦）

---

## 13. Accessibility

- 每个 SVG 带 `<title>` + `<desc>`（desc 包含 mode + node count + optimal path 摘要）
- 每个 decision / chance / end 节点附 `<title>` 含 label + EV（screen reader 友好）
- ML leaf 节点 `<title>` 含 `class=X, samples=n, confidence=p`
- ARIA: `role="graphics-document"` on SVG，`role="graphics-symbol"` on 节点
- 纯 `<text>` 渲染，无 image 替代
- Branch label 颜色对比度 ≥ 4.5:1（WCAG AA）

---

## 14. Interaction Hooks (future)

- `data-mode="decision|ml|taxonomy"` on root SVG
- `data-node-id`, `data-node-kind` on 所有 node
- `data-ev`, `data-optimal`, `data-payoff` on decision-mode 节点
- `data-samples`, `data-class`, `data-impurity`, `data-value`, `data-depth` on ml 节点
- `data-branch-label`, `data-prob` on edge
- CSS hover classes: `.schematex-dtree-node:hover`, `.schematex-dtree-edge.optimal`
- 折叠：`data-collapsed="true"` → CSS `display:none` 子树；renderer 保留骨架

---

## 15. Coverage Matrix

验证本 standard 对 15 个测试用例的覆盖：

| Feature | Case 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Mode: decision | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | ✓ | ✓ |
| Mode: ml | — | — | — | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | — | — | — |
| Mode: taxonomy | — | — | — | — | — | — | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| Square/circle/triangle | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | ✓ | ✓ |
| EV rollback | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| Probability edge label | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | ✓ | ✓ |
| Optimal path highlight | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| ML 5-line node layout | — | — | — | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | — | — | — |
| class distribution mini-bar | — | — | — | ✓ | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — |
| Regression (mse) | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| sklearn JSON import | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| Yes/no branch label | — | — | — | — | — | — | ✓ | — | — | — | — | — | ✓ | — | — |
| Custom branch label | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| Top-down layout | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Left-right layout | — | — | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| Leaf alignment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Depth truncation (big tree) | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — |
| branchLength:probability | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Parse error handling | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ |
| Icon slot | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — |
| XGBoost gain/cover | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |

**结论：** 本 standard 定义的三模式节点形状 / edge 标签 / EV rollback / ML 内部布局 / tidy tree layout / DSL grammar / theme token 共同覆盖 15 个 sample case 的全部视觉与语义需求，可驱动 `src/diagrams/decisiontree/` 的实现。
