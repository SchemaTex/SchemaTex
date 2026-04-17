# 04 — Phylogenetic Tree Standard Reference (Comprehensive)

*进化生物学系统发育树——展示物种、基因或序列之间的进化关系和分歧距离。*

> **References:**
> - Felsenstein, J. (2004). *Inferring Phylogenies.* Sinauer Associates.
> - Baum, D.A. & Smith, S.D. (2013). *Tree Thinking: An Introduction to Phylogenetic Biology.* Roberts & Company.
> - Letunic, I. & Bork, P. (2024). iTOL v6: Interactive Tree Of Life. *Nucleic Acids Res*, 52(W1), W78-W82.
> - Huson, D.H. et al. (2007). Dendroscope: An interactive viewer for large phylogenetic trees. *BMC Bioinformatics*, 8, 460.
> - Cardona, G. et al. (2008). Extended Newick: it is time for a standard representation of phylogenetic networks. *BMC Bioinformatics*, 9, 532.
> - Newick format specification: https://phylipweb.github.io/phylip/newicktree.html
> - Xu, S. et al. (2022). ggtree: Data Integration, Manipulation and Visualization of Phylogenetic Trees. R package.

---

## 1. Key Differences from Other Lineage Diagram Types

| 方面 | Genogram / Pedigree | Phylogenetic Tree |
|------|-------------------|-------------------|
| 主要用途 | 家庭关系 + 医疗/遗传 | 物种/基因进化关系 |
| 节点含义 | 真实个体（人） | 物种、基因、序列或分类单元 (OTU) |
| 边的含义 | 家庭/情感关系 | 进化分歧（时间或突变距离） |
| 分支长度 | 无含义（等距排列） | **核心信息**：代表进化距离或时间 |
| 关系方向 | 水平（夫妻）+ 垂直（亲子） | Root → Tip（祖先 → 后代） |
| 输入格式 | 自定义 DSL | Newick 标准 + Lineage 扩展 DSL |
| 标注重点 | 个体属性（性别/状态/条件） | Bootstrap 支持度 + clade 着色 + 分歧时间 |
| 布局方向 | 上→下（固定） | 多种：rectangular / circular / radial / unrooted |

**核心区别：** Phylogenetic tree 是唯一一个 **branch length 承载定量信息** 的 Lineage diagram 类型——它是 phylogram 不是 cladogram（除非用户明确选择 cladogram 模式）。

---

## 2. Tree Components & Terminology

### 2.1 Node Types

| Node | 含义 | SVG | DSL |
|------|------|-----|-----|
| **Root** | Most Recent Common Ancestor (MRCA) | 无特殊符号或小 `<circle>` | tree root (implicit) |
| **Internal node** | Hypothetical ancestor (推测的分歧点) | `<circle r="3">` 或 省略 | 括号嵌套 `(A,B)` |
| **Leaf / Tip** | Observed taxon（物种/基因/序列） | `<text>` label, optional `<circle r="4">` | terminal name |
| **Polytomy** | Multifurcation (>2 children，表示不确定或同时分歧) | 从一点分出 3+ 分支 | `(A,B,C)` |

### 2.2 Branch (Edge) Properties

| Property | 含义 | 视觉编码 | 单位 |
|----------|------|---------|------|
| **Length** | 进化距离或分歧时间 | 分支水平长度成比例 | substitutions/site 或 millions of years (Mya) |
| **Support value** | Bootstrap / posterior probability | 内部节点上的数字或圆点颜色 | 0-100 (bootstrap) 或 0-1 (Bayesian PP) |
| **Label** | 分支注释 | `<text>` 在 branch 中点 | 任意字符串 |

### 2.3 Tree Semantics

| 概念 | 定义 | DSL 表达 |
|------|------|---------|
| **Rooted tree** | 有明确 root → 所有分支有方向性（祖先→后代） | `phylo "title"` (默认 rooted) |
| **Unrooted tree** | 只表达距离关系，无祖先方向 | `phylo "title" [unrooted]` |
| **Clade** | 一个祖先及其所有后代（monophyletic group） | 括号 `(A,(B,C))` |
| **Outgroup** | 用于确定 root 位置的外群 | `[outgroup: taxon_id]` |
| **Bifurcating** | 每个内部节点恰好 2 个子节点 | (default) |
| **Multifurcating** | 某些节点 >2 个子节点（polytomy） | `(A,B,C,D)` |

---

## 3. Tree Representation Modes

Lineage 支持 3 种 tree representation，决定 branch length 的视觉含义：

### 3.1 Phylogram（默认）
- **Branch length 成比例**于进化距离（substitutions/site）
- 每条分支的 SVG 水平长度 = `branchLength × scale`
- Tips 不一定对齐（因为进化速率不同）
- 底部必须有 **scale bar**（如 "0.05 substitutions/site"）
- 这是最信息密集的模式，是默认选择

### 3.2 Cladogram
- **Branch length 无含义**——只展示拓扑结构（谁和谁更近）
- 所有 tips 对齐到同一垂直线
- 内部节点等距排列
- 适合只关心分支顺序的场景
- 用 `[mode: cladogram]` 激活

### 3.3 Chronogram (Time Tree)
- **Branch length 成比例于分歧时间**（单位：Mya 或 years）
- 所有 tips 对齐到 "present"（右侧）
- X 轴是时间轴（从左 = 过去 → 右 = 现在）
- 底部显示 **geological time scale** 或数字时间轴
- 用 `[mode: chronogram]` 激活
- 需要在 Newick 中提供 branch length + `[mrsd: "2026"]`（most recent sampling date）

---

## 4. Layout Types

### 4.1 Rectangular Layout（默认）

最标准的布局：branches 走 L 形路径（先水平再垂直转弯）。

```
Root ─┬── Taxon_A
      │
      └─┬── Taxon_B
        │
        └─┬── Taxon_C
          │
          └── Taxon_D
```

- Root 在左，tips 在右
- 水平分支 = 进化距离
- 垂直线 = 纯连接（无长度含义）
- 最适合 ≤100 tips 的中小型 tree

**SVG 实现：**
- 水平分支：`<line x1 y1 x2 y2>` 或 `<path d="M x1,y1 H x2">`
- 垂直连接线：`<line>` from 最上子节点到最下子节点
- 分支为 step path：`M x1,y H x2 V y2`（先水平走 branch length，再垂直连到子节点）

### 4.2 Slanted (Diagonal) Layout

与 rectangular 相同拓扑，但用斜线代替 L 形：

```
Root ──── Taxon_A
    \
     ──── Taxon_B
      \
       ─── Taxon_C
        \
         ── Taxon_D
```

- 分支是直线（从 parent 斜向 child）
- `<line>` or `<path d="M x1,y1 L x2,y2">`
- 视觉更紧凑
- 用 `[layout: slanted]` 激活

### 4.3 Circular (Fan) Layout

以 root 为圆心，tips 分布在圆弧上：

- 角度分配：每个 tip 占 `360° / numTips`
- Internal nodes 按 children 的角度中点定位
- Branches 沿径向延伸
- 非常适合 **大型 tree**（50-500+ tips）——空间利用效率最高
- 用 `[layout: circular]` 激活

**SVG 实现：**
- 径向分支：`<path>` with `M` + arc segments
- 垂直连接线 → 弧线 `<path d="M ... A ...">`
- Tip labels 沿切线方向旋转 `transform="rotate(angle)"`

**参数：**
- `openAngle`: 扇形开口角度（默认 0 = 完整 360°；设为如 30 可留缺口用于 legend）

### 4.4 Unrooted (Radial Equal-Angle) Layout

无根树——强调距离关系而非祖先方向：

- **Equal-angle 算法：** 每个子树分配的角度 ∝ 该子树的 tip 数量
- 选一个任意 internal node 为绘图中心，从中心向外辐射
- 适合展示 **进化距离的网络关系**，不强调方向
- 用 `[layout: unrooted]` 激活

**Daylight improvement（可选优化）：**
- 在 equal-angle 基础上迭代调整：访问每个 internal node，旋转子树使 "daylight"（相邻子树间的空隙角度）均等
- 减少 tip 聚集现象

---

## 5. Visual Encoding Conventions

### 5.1 Branch Styling

| Feature | 默认 | 可选 | DSL |
|---------|------|------|-----|
| Line width | 1.5px | 0.5-4px by user | `[branch-width: 2]` |
| Line color | `#333` (dark gray) | Per-clade coloring | `clade C1 = (A,B) [color: "#E53935"]` |
| Line style | solid | dashed (uncertain) | `[style: dashed]` |

### 5.2 Node Decoration

| Element | 何时显示 | SVG | 默认大小 |
|---------|---------|-----|---------|
| **Leaf dot** | 可选（off by default） | `<circle r="3" fill="#333">` | r=3px |
| **Internal node dot** | 当 support value 存在时 | `<circle>` with color-mapped fill | r=4px |
| **Root marker** | Rooted tree 的 root node | `<circle r="5" fill="none" stroke="#333">` | r=5px |

### 5.3 Bootstrap / Support Value Display

Bootstrap 值是 phylogenetic tree 的关键视觉元素，有两种显示模式：

**Mode A: Numbers on branches（默认）**
- 数字标注在 internal node 旁（branch 中点偏上）
- Font: 9px, class="lineage-support-label"
- 只显示 ≥50 的值（<50 通常不可靠，省略）
- 颜色编码（可选）：≥95 green, 75-94 yellow, 50-74 orange

**Mode B: Colored dots on nodes**
- Internal node 用圆点显示，颜色 = support 强度
- 渐变色标：红(低) → 黄(中) → 绿(高)
- Circle size 可 fixed 或 proportional to support

**Support value 阈值（标准约定）：**

| Range | 含义 | 默认颜色 |
|-------|------|---------|
| ≥95 (or ≥0.95 PP) | Strong support | `#43A047` (green) |
| 75-94 (0.75-0.94) | Moderate support | `#FDD835` (yellow) |
| 50-74 (0.50-0.74) | Weak support | `#FB8C00` (orange) |
| <50 (<0.50) | Very weak (hidden by default) | `#E53935` (red, if shown) |

### 5.4 Tip Labels

| Feature | 默认 | 说明 |
|---------|------|------|
| Font | 12px, font-family inherit | class="lineage-tip-label" |
| Alignment | Left-aligned after tip point | 留 6px gap |
| Italic | Species names 自动斜体 | 遵循生物学命名法（如 *Homo sapiens*） |
| Truncation | None（full label） | 对长名可 tooltip |
| Coloring | Inherit from clade color or #333 | 与 branch color 联动 |

**Circular layout 的 label 旋转：**
- 右半圆（0-180°）：正常方向，label 朝外
- 左半圆（180-360°）：label 翻转 180°，保持可读性
- `text-anchor`: 右半圆 "start"，左半圆 "end"

### 5.5 Scale Bar

Phylogram 和 chronogram **必须** 有 scale bar：

- 位置：底部左侧
- Phylogram: 显示 substitution distance（如 `── 0.05`）
- Chronogram: 显示时间（如 `── 10 Mya`）
- SVG: `<line>` + `<text>`, class="lineage-scale-bar"
- 长度：自动计算为 round number（0.01, 0.05, 0.1, 0.5, 1.0...）占 tree width 的 ~15-25%

### 5.6 Clade Highlighting

Clade 高亮是 phylogenetic tree 的核心视觉特性——用颜色块标记 monophyletic group：

**Mode A: Background shading**
- 半透明矩形（rectangular）或扇形（circular）覆盖整个 clade
- `<rect>` with `fill-opacity: 0.15` 或 `<path>` (arc sector)
- 右侧 clade label（bold, 12px）

**Mode B: Branch coloring**
- Clade 内所有 branch 染同一色
- 继承到 tip labels
- 最简洁的视觉方式

**DSL:**
```
clade Mammals = (Human, Mouse, Dog) [color: "#1E88E5", label: "Mammals"]
clade Birds = (Chicken, Eagle) [color: "#43A047", label: "Aves"]
```

---

## 6. Newick Format Support

Lineage 的 phylogenetic parser 必须原生支持 Newick 格式——它是进化生物学的通用语言。

### 6.1 Newick Grammar (Standard)

```ebnf
tree       = subtree ";" 
subtree    = leaf | internal
leaf       = name
internal   = "(" branchset ")" name
branchset  = branch ("," branch)*
branch     = subtree length
name       = EMPTY | UNQUOTED_STRING | QUOTED_STRING
length     = EMPTY | ":" NUMBER

UNQUOTED_STRING = /[^\s():,;\[\]']+/
QUOTED_STRING   = "'" /([^']|'')*/ "'"
NUMBER          = /[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/
```

### 6.2 Newick Examples (Parser 必须全部通过)

```
# 最简拓扑——无名无长度
(,,(,));

# 只有 leaf 名
(A,B,(C,D));

# 所有节点命名
(A,B,(C,D)E)F;

# 带 branch length（最常见格式）
(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);

# Internal node 有 name + length
(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;

# 只有 length 无名
(:0.1,:0.2,(:0.3,:0.4):0.5);

# 多叉树 (polytomy)
(A,B,C,D);

# 单 leaf (degenerate)
(A);

# Quoted label (含特殊字符)
('Homo sapiens':0.1,'Mus musculus':0.2);
```

### 6.3 Extended Newick (NHX) — Optional 支持

```
(A:0.1[&&NHX:B=100],B:0.2[&&NHX:B=85],(C:0.3,D:0.4)E:0.5[&&NHX:B=72])F;
```
- `[&&NHX:key=value:...]` 附加在 node name 后
- `B` = bootstrap, `T` = taxonomy, `S` = species name
- **P1 支持：** 解析 `B` (bootstrap) 字段即可

### 6.4 Lineage DSL (Extended Syntax)

Newick 简洁但不好读。Lineage 提供扩展 DSL 添加视觉配置：

```
phylo "Tree of Life"
  newick: "(((Human:0.1,Chimp:0.08):0.03,Gorilla:0.12):0.15,Dog:0.35,(Cat:0.30,Mouse:0.45):0.2);"
  
  # 或者用 Lineage 原生 DSL（小型 tree）
  # 见 Section 8

  clade Primates = (Human, Chimp, Gorilla) [color: "#1E88E5"]
  clade Carnivora = (Dog, Cat) [color: "#E53935"]
  
  style [layout: rectangular, mode: phylogram]
  scale [label: "substitutions/site"]
```

---

## 7. Lineage Native DSL (Alternative to Newick)

对于小型 tree 或手写场景，Lineage 提供一种缩进式 DSL 作为 Newick 的可读替代：

```
phylo "Vertebrate Evolution" [layout: rectangular, mode: phylogram]

# 缩进 = 嵌套（parent-child），冒号后 = branch length
root:
  :0.15
    :0.03
      Human: 0.1
      Chimp: 0.08
    Gorilla: 0.12
  Dog: 0.35
  :0.2
    Cat: 0.30
    Mouse: 0.45

scale "substitutions/site"
clade Primates = (Human, Chimp, Gorilla) [color: "#1E88E5"]
```

**缩进 DSL 规则：**
- 每层缩进 = tree 的一层嵌套（等同于 Newick 的括号）
- `Name: length` = leaf node with branch length
- `:length` = unnamed internal node with branch length
- `Name:` (无 length) = leaf node，cladogram 模式
- 注释 `#` 忽略

---

## 8. DSL Grammar (Complete EBNF)

```ebnf
document       = header config* tree_def annotation* 
header         = "phylo" quoted_string? header_props? NEWLINE
header_props   = "[" header_prop ("," header_prop)* "]"
header_prop    = layout_prop | mode_prop | root_prop | misc_prop

layout_prop    = "layout:" LAYOUT_TYPE
LAYOUT_TYPE    = "rectangular" | "slanted" | "circular" | "unrooted"

mode_prop      = "mode:" TREE_MODE
TREE_MODE      = "phylogram" | "cladogram" | "chronogram"

root_prop      = "unrooted"
misc_prop      = "branch-width:" NUMBER
               | "openAngle:" NUMBER
               | "mrsd:" quoted_string

config         = scale_def | outgroup_def
scale_def      = "scale" quoted_string? NEWLINE
outgroup_def   = "outgroup:" IDENTIFIER NEWLINE

tree_def       = newick_def | indent_def
newick_def     = "newick:" NEWICK_STRING NEWLINE
indent_def     = "root:" NEWLINE (INDENT tree_node+ DEDENT)

tree_node      = (IDENTIFIER | EMPTY) ":" NUMBER? support? NEWLINE
               (INDENT tree_node+ DEDENT)?
support        = "[" NUMBER "]"

annotation     = clade_def | label_def | comment
clade_def      = "clade" IDENTIFIER "=" "(" id_list ")" clade_props? NEWLINE
id_list        = IDENTIFIER ("," IDENTIFIER)*
clade_props    = "[" clade_prop ("," clade_prop)* "]"
clade_prop     = "color:" quoted_string | "label:" quoted_string
               | "highlight:" HIGHLIGHT_MODE
HIGHLIGHT_MODE = "branch" | "background" | "both"

label_def      = "label" IDENTIFIER "=" quoted_string label_props? NEWLINE
label_props    = "[" kv_prop ("," kv_prop)* "]"

comment        = "#" [^\n]* NEWLINE

IDENTIFIER     = /[a-zA-Z_][a-zA-Z0-9_.-]*/
NUMBER         = /[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/
quoted_string  = '"' /[^"]*/ '"'
NEWICK_STRING  = /[^;]+;/
INDENT         = increase in leading whitespace
DEDENT         = decrease in leading whitespace
NEWLINE        = /\n/
```

---

## 9. Rendering Details

### 9.1 Color Palette (Default Clade Colors)

当用户不指定颜色时，按声明顺序从 palette 自动分配：

| Order | Color | Hex | 用途参考 |
|-------|-------|-----|---------|
| 1 | Blue | `#1E88E5` | 第一个 clade |
| 2 | Red | `#E53935` | 第二个 clade |
| 3 | Green | `#43A047` | 第三个 clade |
| 4 | Purple | `#8E24AA` | 第四个 clade |
| 5 | Orange | `#FB8C00` | 第五个 clade |
| 6 | Teal | `#00897B` | 第六个 clade |
| 7 | Pink | `#D81B60` | 第七个 clade |
| 8 | Indigo | `#3949AB` | 第八个 clade |
| 9+ | Cycle | — | 从第 1 个色重新循环 |

### 9.2 SVG Structure

```svg
<svg class="lineage-phylo" viewBox="0 0 {W} {H}">
  <defs>
    <!-- clip paths, markers if needed -->
  </defs>
  
  <g class="lineage-branches" transform="translate({padL},{padT})">
    <!-- All branch paths: <path> or <line> elements -->
    <path class="lineage-branch" d="M ..." stroke="#333" />
    <!-- Clade-colored branches override stroke -->
    <path class="lineage-branch lineage-clade-Primates" d="..." stroke="#1E88E5" />
  </g>
  
  <g class="lineage-clade-highlights">
    <!-- Background shading rectangles/arcs -->
    <rect class="lineage-clade-bg" ... fill="#1E88E5" fill-opacity="0.12" />
  </g>
  
  <g class="lineage-nodes">
    <!-- Internal node support dots -->
    <circle class="lineage-support-dot" cx="..." cy="..." r="4" fill="#43A047" />
    <!-- Tip dots (if enabled) -->
  </g>
  
  <g class="lineage-labels">
    <!-- Tip labels -->
    <text class="lineage-tip-label" x="..." y="..." font-style="italic">Homo sapiens</text>
    <!-- Support value text (if mode A) -->
    <text class="lineage-support-label" x="..." y="...">98</text>
  </g>
  
  <g class="lineage-scale-bar" transform="translate({x},{y})">
    <line x1="0" y1="0" x2="{len}" y2="0" stroke="#333" stroke-width="1.5" />
    <line x1="0" y1="-4" x2="0" y2="4" stroke="#333" stroke-width="1" />
    <line x1="{len}" y1="-4" x2="{len}" y2="4" stroke="#333" stroke-width="1" />
    <text x="{len/2}" y="16" text-anchor="middle">0.05</text>
  </g>
  
  <g class="lineage-legend">
    <!-- Clade legend entries -->
  </g>
</svg>
```

### 9.3 CSS Classes

| Class | 用途 |
|-------|------|
| `.lineage-phylo` | Root SVG |
| `.lineage-branch` | All branch paths |
| `.lineage-branch-internal` | Internal (horizontal) branch segment |
| `.lineage-branch-connector` | Vertical connector line |
| `.lineage-clade-{id}` | Per-clade scoped class |
| `.lineage-clade-bg` | Background highlight rect/arc |
| `.lineage-tip-label` | Leaf text labels |
| `.lineage-support-label` | Bootstrap/PP text |
| `.lineage-support-dot` | Bootstrap colored dot |
| `.lineage-scale-bar` | Scale bar group |
| `.lineage-root-marker` | Root node circle |

---

## 10. Layout Algorithm Details

### 10.1 Rectangular Phylogram Layout

**Input:** Rooted tree with branch lengths
**Output:** (x, y) for each node

**Step 1 — Leaf Y-coordinates:**
```
leaves = collectLeaves(root)  // in-order traversal
for i, leaf in leaves:
    leaf.y = i * tipSpacing    // tipSpacing default = 20px
```

**Step 2 — Internal node Y-coordinates:**
```
function assignY(node):
    if node.isLeaf: return node.y
    children_ys = [assignY(child) for child in node.children]
    node.y = mean(children_ys)   // center between first and last child
```

**Step 3 — X-coordinates (distance from root):**
```
root.x = 0
function assignX(node):
    for child in node.children:
        child.x = node.x + child.branchLength * scale
        assignX(child)
```

**Step 4 — Scale factor:**
```
maxRootToTip = max distance from root to any tip
scale = availableWidth / maxRootToTip
```

### 10.2 Circular Layout

**Step 1 — Angle allocation:**
```
totalAngle = 360 - openAngle  // openAngle default = 0
leaves = collectLeaves(root)
for i, leaf in leaves:
    leaf.angle = (i / numLeaves) * totalAngle + startAngle
```

**Step 2 — Internal node angles:**
```
node.angle = mean of children angles
```

**Step 3 — Radial distance (from center):**
```
node.radius = node.distanceFromRoot * scale
// Convert to Cartesian:
node.x = centerX + node.radius * cos(node.angle)
node.y = centerY + node.radius * sin(node.angle)
```

**Step 4 — Arc paths for connectors:**
```
// Parent connects to children via:
// 1. Arc from min(child.angle) to max(child.angle) at parent.radius
// 2. Radial line from parent.radius to child.radius at child.angle
```

### 10.3 Unrooted (Equal-Angle) Layout

```
function layoutUnrooted(node, startAngle, arcAngle, parentX, parentY):
    node.x = parentX + node.branchLength * scale * cos(startAngle + arcAngle/2)
    node.y = parentY + node.branchLength * scale * sin(startAngle + arcAngle/2)
    
    if node.isInternal:
        totalTips = sum(child.numTips for child in node.children)
        currentAngle = startAngle
        for child in node.children:
            childArc = arcAngle * (child.numTips / totalTips)
            layoutUnrooted(child, currentAngle, childArc, node.x, node.y)
            currentAngle += childArc
```

### 10.4 Cladogram Mode Adjustment

当 `mode: cladogram`：
- 忽略所有 branch lengths
- Tips 对齐到右边界：`leaf.x = maxX`
- Internal nodes 等距分布：`node.x = maxX - (node.depth * stepWidth)`

---

## 11. Design Principles for Beautiful Phylogenetic Trees

### 11.1 Spacing & Proportions
- **Tip spacing**: 18-24px（rectangular），12-16px（circular for large trees）
- **Aspect ratio**: Width ≥ Height × 1.5 for rectangular（给 tip labels 留空间）
- **Label gap**: 6px between tip point and label start
- **Margin**: 左 20px（scale bar），右 auto（longest label + 20px），上下 20px

### 11.2 Typography
- **Tip labels**: 正体 12px for common names，*italic* 12px for species binomials
- **Support values**: 9px, `fill: #666`
- **Scale bar label**: 10px, `text-anchor: middle`
- **Clade labels**: 13px bold, color = clade color

### 11.3 Color Strategy
- **Branches**: 默认 `#333`——足够深但不刺眼
- **Clades**: 使用 Section 9.1 的 8-color palette——饱和度适中，accessible（通过 WCAG AA）
- **Support dots**: Green → Yellow → Orange → Red 渐变，符合直觉（green = good）
- **Background highlight**: 同 clade color 但 `opacity: 0.10-0.15`——不干扰 branch 可读性
- **Never** 用 >8 种 clade color——太多颜色是噪音不是信息

### 11.4 Readability Rules
1. **Branch lines 永远在 label 之上**（z-order: branches → highlights → labels）
2. **避免 label overlap**: 如果 tips 太密，truncate 或增加 tipSpacing
3. **Circular layout 的 label 翻转**：左半圆 labels 必须 rotate 180° 保持可读
4. **Scale bar 不要太长也不要太短**: 目标占 tree width 的 15-25%
5. **Support values 只显示 ≥50**: 低于 50 的是噪音

---

## 12. Test Cases

### Case 1: Basic Phylogram (Newick Input)
```
phylo "Simple Vertebrates"
  newick: "((Human:0.1,Mouse:0.3):0.05,(Chicken:0.4,(Zebrafish:0.6,Frog:0.5):0.15):0.1);"
  scale "substitutions/site"
```
验证：branch length 成比例，Mouse 的 branch 是 Human 的 3 倍长，底部有 scale bar。

### Case 2: Cladogram with Clades
```
phylo "Animal Kingdom" [mode: cladogram]
  newick: "(((Cat,Dog)Carnivora,(Human,Chimp)Primates)Mammalia,(Chicken,Eagle)Aves);"
  clade Mammals = (Cat, Dog, Human, Chimp) [color: "#1E88E5", label: "Mammalia"]
  clade Birds = (Chicken, Eagle) [color: "#43A047", label: "Aves"]
```
验证：所有 tips 右对齐（cladogram），Mammalia 和 Aves 用不同颜色高亮。

### Case 3: Bootstrap Support Values
```
phylo "Primate Phylogeny"
  newick: "((Human:0.02,Chimp:0.03):0.01[&&NHX:B=100],(Gorilla:0.05,(Orangutan:0.08,Gibbon:0.10):0.04[&&NHX:B=72]):0.03[&&NHX:B=95]);"
  scale "substitutions/site"
```
验证：root 附近的 node 显示 95（green dot），Human-Chimp 的 node 显示 100（green），Orangutan-Gibbon 的 node 显示 72（orange）。

### Case 4: Circular Layout (Large Tree)
```
phylo "Bacterial Diversity" [layout: circular]
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05,Vibrio:0.2):0.08,((Bacillus:0.15,Staph:0.18):0.06,Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12,(Strepto:0.25,Lactobacillus:0.2):0.08):0.2);"
  
  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]
  
  scale "substitutions/site"
```
验证：circular layout，3 个 clade 用不同颜色，labels 在外围且可读（左半圆 flipped），有 radial scale bar。

### Case 5: Unrooted Tree
```
phylo "Gene Family" [layout: unrooted]
  newick: "(A:0.3,B:0.4,(C:0.35,D:0.2):0.15,(E:0.5,F:0.45):0.25);"
```
验证：无 root marker，所有 branches 从中心向外辐射，角度按 tip 数量均分。

### Case 6: Chronogram (Time-Scaled)
```
phylo "Mammal Divergence" [mode: chronogram, mrsd: "0"]
  newick: "((Human:6.4,Chimp:6.4):1.1,((Dog:52,Cat:52):12,(Mouse:75,Rat:75):10):5);"
  scale "Million years ago (Mya)"
```
验证：所有 tips 对齐到右侧（present = 0 Mya），X 轴从左到右 = 过去到现在，Human-Chimp 分歧点在 ~6.4 Mya，Mouse-Rat 在 ~75 Mya。底部时间轴。

### Case 7: Lineage Native DSL (Indent-Based)
```
phylo "Simple Tree"

root:
  :0.15
    :0.03
      Human: 0.1
      Chimp: 0.08
    Gorilla: 0.12
  Dog: 0.35

clade Apes = (Human, Chimp, Gorilla) [color: "#1E88E5"]
scale "substitutions/site"
```
验证：等同于 Newick `((Human:0.1,Chimp:0.08):0.03,Gorilla:0.12):0.15,Dog:0.35);`，DSL 格式更可读。

### Case 8: Polytomy (Multi-furcation)
```
phylo "Rapid Radiation"
  newick: "((A:0.1,B:0.1,C:0.1,D:0.1):0.5,E:0.6);"
```
验证：内部节点有 4 个子节点（不是 2 个），表示 "hard polytomy" 或 unresolved topology。

### Case 9: Species Names with Special Characters
```
phylo "Hominids"
  newick: "('Homo sapiens':0.02,'Pan troglodytes':0.03,'Gorilla gorilla':0.05,'Pongo pygmaeus':0.08);"
```
验证：quoted labels 正确解析，species names 以 italic 显示（*Homo sapiens*）。

---

## 13. Implementation Priority

| Priority | Feature | Complexity | 说明 |
|----------|---------|------------|------|
| P0 | Newick parser (standard format, all examples in 6.2) | Medium | 基础——不支持 Newick 就没意义 |
| P0 | Rectangular phylogram layout + scale bar | Medium | 最标准的可视化模式 |
| P0 | Tip labels (positioned, italic for species) | Low | 基本可读性 |
| P1 | Cladogram mode (ignore branch lengths, align tips) | Low | 只需改 X 计算 |
| P1 | Bootstrap support values (text on branches) | Low | Parse NHX `B=` field + render text |
| P1 | Clade coloring (branch color + background highlight) | Medium | 需要 clade definition → node set mapping |
| P1 | Slanted layout | Low | 改 path 从 step 到 diagonal |
| P2 | Circular layout | High | Arc 计算 + label rotation |
| P2 | Chronogram mode + time axis | Medium | Tips 对齐 + X 轴 reversed |
| P2 | Support dots (colored by confidence) | Low | 在 P1 基础上加 circle + color mapping |
| P2 | Lineage native indent DSL parser | Medium | Alternative to Newick for handwritten trees |
| P3 | Unrooted layout (equal-angle) | High | 最复杂的布局算法 |
| P3 | Unrooted daylight optimization | Medium | 在 equal-angle 基础上迭代优化 |
| P3 | Extended Newick (NHX full support) | Low | 在 P1 NHX bootstrap 基础上扩展 |
| P3 | Clade legend box | Low | 复用 genogram/pedigree legend 逻辑 |
