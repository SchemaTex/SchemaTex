# 18 — Matrix / Quadrant / Heat-Map Diagram Standard Reference

*2x2 quadrant、3x3 matrix、N×M heat map、bubble quadrant 的统一标准。面向战略咨询、产品优先级、风险管理、HR 绩效、研究对比、教学场景的结构化二维（+可选第三维）评估图。*

> **References (行业约定 + 经典文献):**
> - **Eisenhower, Dwight D. (1954)** Address at Northwestern University — Urgent × Important 四象限原理
> - **Covey, Stephen R. (1989)** *The 7 Habits of Highly Effective People*, Habit 3 — Eisenhower Matrix 工业化传播
> - **Henderson, Bruce (1970)** *The Product Portfolio*. BCG Perspectives — Growth-Share Matrix（BCG Matrix）
> - **McKinsey & Company / GE (1970s)** GE–McKinsey Nine-Box Matrix — 3×3 portfolio framework
> - **Ansoff, H. Igor (1957)** *Strategies for Diversification*. HBR 35(5) — Product × Market 2×2
> - **Luft & Ingham (1955)** The Johari Window — Known/Unknown × Self/Others 四象限
> - **Intuit / Michael Lombardo (1970s)** 9-Box Performance × Potential Grid（HR talent review 标准）
> - **Sean McClure et al. — RICE scoring (Intercom 2017)** — Reach × Impact × Confidence × Effort（2x2 视图为 Impact × Effort）
> - **ISO 31000:2018 Risk Management** §6.4 — 5×5 Likelihood × Impact Risk Matrix
> - **NIST SP 800-30 Rev.1** — 风险热力矩阵等级定义
> - **Tufte, Edward (1983)** *The Visual Display of Quantitative Information* — bubble size 应 area-proportional，非 radius-proportional
> - **Mermaid `quadrantChart`（de-facto baseline 的反例）** — Schematex 需修正其 label overlap、无 label、无 bubble size、仅支持 2×2 的核心缺陷
>
> 注：2×2 / 3×3 / 热力矩阵无单一权威标准统管渲染细节，本 standard 综合上述文献 + 主流 SaaS 工具惯例（Miro、Lucidchart、ProductPlan、Notion、Airfocus、Mural），并针对 Mermaid quadrantChart 的已知失败模式给出明确改进点（见 §5 Layout）。

---

## 1. 用户与需求（第一性原理）

Matrix / 2x2 / quadrant 是**通用性最强的分析框架**——同一几何外壳承载截然不同的语义。Schematex 须覆盖四类用户画像：

| 画像 | 典型场景 | 关键需求 |
|------|----------|---------|
| **PM / 产品策略** | Eisenhower、Impact-Effort、RICE prioritization | 有限条目（5–20）+ 项目名 label + 颜色分类（owner / team） |
| **管理咨询师** | BCG Growth-Share、McKinsey GE 9-box、Ansoff | bubble size 表第三维（revenue / market share）+ 品牌感视觉 |
| **风险管理 / QMS** | ISO 31000 5×5 risk heat map、FMEA | 离散格子 + heat ramp + 每格可承载多条目 |
| **HR / Coach** | Johari、Skill-Will、9-box talent review | 预设 axis 标签 + 象限注释（"Stars"、"Question Marks"）+ 照片/头像 slot |
| **UX / Research** | Feature comparison grid、qualitative 2D mapping | 自由 axis + 高密度点位（>30）+ label 无重叠 |

**用户需求差异**：
- 有些要 **preset templates**（Eisenhower 立即要 4 个象限标签）
- 有些要 **free-form axes**（用户自定义坐标轴含义）
- 有些要 **第 3 维 bubble size**（BCG 的 revenue、RICE 的 reach）
- 有些要 **>50 项目**（feature prioritization → 必须聚类或引导线）
- 有些要 **离散 N×M cells**（风险矩阵 5×5，每格 heat color）

**Schematex 相比 Mermaid `quadrantChart` 的核心改进：**

| Mermaid 失败模式 | 月错误数（ChatDiagram） | Schematex 对策 |
|------------------|:-------:|----------------|
| 点密集时 label 相互遮挡 | — | Force-based label offset + leader lines（§5.3） |
| 无法给点加名字（仅坐标） | — | DSL 支持 `"Name" at (x,y)` |
| 仅支持 2×2 | — | 2×2 / 3×3 / N×M 统一 grammar |
| 无 bubble size | — | `size: N` 第三维 + area-proportional 映射 |
| 无 template（每次手写轴） | — | `template: eisenhower\|bcg\|rice\|...` |
| 点溢出坐标轴崩坏 | — | Clamp + "+N off-chart" 注释 |
| 轴反转（Low→High 方向）歧义 | — | 显式 `x-axis: Low → High` 箭头语法 |
| **Total errors / month** | **1,942** | — |

---

## 2. 市场需求数据

**Ahrefs keyword volume (US, 2025 Q4)：**

| Keyword | Volume/mo | KD |
|---------|-----------|:--:|
| eisenhower matrix | ~60,000 | 12 |
| bcg matrix | ~40,000 | 18 |
| priority matrix | ~15,000 | 8 |
| 2x2 matrix | ~5,000 | 5 |
| impact effort matrix | ~4,000 | 4 |
| risk matrix | ~25,000 | 20 |
| 9 box grid / 9-box talent | ~8,000 | 10 |
| johari window | ~30,000 | 14 |
| mckinsey matrix / ge matrix | ~12,000 | 15 |

**累计 matrix-template 关键词族 > 200K 月搜索**，强于 Schematex 其他垂类（genogram 4.7K、sociogram 1.4K）。

**ChatDiagram 内部 signal：** Mermaid `quadrantChart` 1,942 errors/month，排名第二高错误率的 Mermaid 图表类型。错误分布：label 遮挡 42% / 坐标越界 23% / 语法不支持 label 文字 18% / 其他 17%。

**竞品横向对比：**

| 工具 | 2×2 | 3×3 | N×M heat | bubble | template 库 | zero-dep |
|------|:---:|:---:|:------:|:------:|:-----------:|:--------:|
| Mermaid quadrantChart | 部分 | ✗ | ✗ | ✗ | ✗ | ✓ |
| Miro | ✓ | ✓ | ✓ | ✓ | 数十套 | ✗（整套 SaaS） |
| Lucidchart | ✓ | ✓ | ✓ | ✓ | 多 | ✗ |
| ProductPlan / Airfocus | ✓ | ✗ | ✗ | ✓ | RICE/Impact | ✗ |
| **Schematex** | ✓ | ✓ | ✓ | ✓ | 8 preset（P0） | ✓ |

---

## 3. 类型分级

Schematex matrix 系列按照结构复杂度分五档，DSL 层统一，渲染层分支：

### 3.1 2×2 Quadrant（canonical，最高使用率）

两根坐标轴（连续值或离散 Low/High），4 个象限。所有 template 的基础形态。

### 3.2 3×3 Matrix

McKinsey GE 的 Industry Attractiveness × Business Unit Strength，九格每格可承载多条目。

### 3.3 N×M Matrix / Heat Map

离散 cell 结构，每个 cell 有数值 + heat color（risk 5×5、feature comparison 7×12）。不承载"点"，承载"格"。

### 3.4 Bubble Quadrant（x, y, size）

2×2 或 3×3 外壳 + 每个点带 size（第三维），area ∝ value（**非** radius ∝ value，§5.5）。BCG、RICE 的标配。

### 3.5 Template Library（preset axis + annotation）

内置 8 个 preset（§8），用户只提供 items，axis 标签/象限注释自动填充。

---

## 4. DSL Grammar

### 4.1 三种写法

**(A) Template mode**（最短）：

```
matrix eisenhower
  "Fix prod bug"      at (0.9, 0.9)
  "Weekly planning"   at (0.2, 0.9)
  "Random Slack ping" at (0.9, 0.1)
  "Browse Twitter"    at (0.2, 0.1)
```

Template 名决定 axis 标签、4 象限注释、背景 tint：

| Template | X | Y | Q1 / Q2 / Q3 / Q4 |
|----------|---|---|-------------------|
| `eisenhower` | Urgent → Not Urgent | Important → Not Important | Do First / Schedule / Delegate / Delete |
| `impact-effort` | Effort → | Impact ↑ | Quick Wins / Major Projects / Fill-ins / Thankless |
| `rice` | Effort → | Impact × Reach ↑ | High RICE / … |
| `bcg` | Market Share → | Growth Rate ↑ | Stars / Question Marks / Cash Cows / Dogs |
| `ansoff` | Product (existing→new) | Market (existing→new) | Penetration / Development / Diversification / Dev. |
| `johari` | Known to others (X) | Known to self (Y) | Open / Hidden / Blind / Unknown |
| `9-box` | Performance (Low→High) | Potential (Low→High) | 九格 3×3 |
| `risk-matrix` | Likelihood (1–5) | Impact (1–5) | 5×5 heat ramp |

**(B) Custom 2×2 mode**（自定义 axis）：

```
matrix "Feature Prioritization Q4"

x-axis: Low Effort → High Effort
y-axis: Low Impact → High Impact

"Dark mode"       at (0.3, 0.9) size: 5 category: design
"OAuth rewrite"   at (0.9, 0.6) size: 3 category: infra
"Tooltip fix"     at (0.1, 0.3)         category: ux
```

**(C) Heatmap / N×M mode**：

```
matrix heatmap 5x5
title: "Risk register 2026-Q1"

rows:    [Rare, Unlikely, Possible, Likely, Certain]     # y-axis (bottom → top)
cols:    [Negligible, Minor, Moderate, Major, Severe]    # x-axis (left → right)

cell (3,4) value: 9 label: "Data breach"
cell (2,2) value: 4 label: "Minor outage"
cell (4,5) value: 16 label: "Ransomware"
# or shorthand single-axis populate:
row Certain: [_, _, _, "Ransomware", "Ransomware"]
```

### 4.2 通用项属性

```ebnf
point           = quoted_string "at" "(" FLOAT "," FLOAT ")" properties? NEWLINE
properties      = ( "size:" NUMBER           # bubble size (第三维)
                  | "category:" ID            # 颜色分组
                  | "color:" HEX              # 显式颜色
                  | "note:" quoted_string     # tooltip
                  | "shape:" ( "circle"|"square"|"triangle"|"diamond" )
                  | "highlight: true"         # 加粗 stroke
                  )*
```

**坐标规范**：`(x, y)` 范围 **[0, 1]** 归一化浮点（**强制**，禁止 pixel 值）。
- `(0, 0)` = 左下；`(1, 1)` = 右上
- **Clamp**：超出 `[0, 1]` 的值被 clamp 到边界并渲染 "↗" 溢出徽标
- 3×3 / N×M mode 用 cell index 而非浮点（§4.1C）

### 4.3 Config 块

```
config:
  quadrantBg: true               # 4 象限背景 tint
  gridLines: true                # 显示网格
  axisArrows: true               # axis 末端箭头
  labelCollision: "offset"       # "offset" | "leader" | "cluster" | "off"
  bubbleScale: "area"            # "area"（默认，Tufte 合规）| "radius"
  quadrantAnnotations: true      # 象限注释文字
  legendPosition: "bottom-right" # "bottom-right" | "right" | "none"
  offChartPolicy: "clamp-badge"  # "clamp-badge" | "drop" | "edge-marker"
```

### 4.4 Grammar (EBNF)

```ebnf
document     = header (config_block | axis_def | annotation_def | point | cell | row_decl)* NEWLINE

header       = "matrix" template_id? quoted_string? NEWLINE
             | "matrix" "heatmap" dims NEWLINE
template_id  = "eisenhower" | "impact-effort" | "rice" | "bcg" | "ansoff"
             | "johari" | "9-box" | "risk-matrix"
dims         = INT "x" INT                      # e.g. 5x5, 3x3, 7x12

axis_def     = ( "x-axis:" | "y-axis:" ) axis_label ( "→" axis_label )? NEWLINE
             | "rows:" "[" label_list "]" NEWLINE
             | "cols:" "[" label_list "]" NEWLINE

annotation_def = "quadrant" ID quoted_string NEWLINE      # override Q-label
               | "annotate" "(" FLOAT "," FLOAT ")" quoted_string NEWLINE

cell         = "cell" "(" INT "," INT ")" value_clause? label_clause?
value_clause = "value:" NUMBER
label_clause = "label:" quoted_string
row_decl     = "row" ID ":" "[" cell_shorthand_list "]" NEWLINE
```

---

## 5. Layout Algorithm

### 5.1 Canvas & Grid

```
canvas_width  = 680 (default)
canvas_height = 560
padding       = 80 (all sides, for axis labels + legend)
plot_x0 = padding
plot_y0 = padding
plot_w  = canvas_width  - 2*padding  # 520
plot_h  = canvas_height - 2*padding  # 400
```

Grid division：
- **2×2**：midlines at `plot_x0 + plot_w/2`, `plot_y0 + plot_h/2`
- **3×3**：thirds at `plot_x0 + plot_w * k/3` for k ∈ {1,2}
- **N×M**：`plot_x0 + plot_w * k/N` for k ∈ {1..N-1}

### 5.2 Point Placement（Quadrant / Bubble mode）

对 normalized `(nx, ny)`：

```
px = plot_x0 + nx * plot_w
py = plot_y0 + (1 - ny) * plot_h     # SVG y-axis 向下翻转
```

Clamp：`nx, ny ∈ [0.02, 0.98]`，保留 2% 边距防止点贴边；原值 > 1 或 < 0 时记录 `offChart: true` 并绘 §5.6 的 badge。

### 5.3 Label Placement with Collision Avoidance（核心！Mermaid 失败点）

Mermaid 的缺陷在此：所有 label 硬编码在点的右侧 fixed offset。当点密集时 label 相互遮挡。

**Schematex 算法**（force-based iterative offset）：

```
1. 初始化每个 label 的 anchor at point + (8, -4) 右上
2. 测量每个 label 的 bbox (label 文字 + 4px padding)
3. 迭代 30 轮：
   for each pair (A, B):
     if A.bbox overlaps B.bbox:
       compute overlap vector v = B.center - A.center
       push A by -v * 0.5, push B by +v * 0.5 (normalized, max step 3px)
   for each label L:
     if L.bbox 越出 plot 边界：
       反射回边界内（rebound）
4. 若移动距离 > 20px，切换到 "leader line" 模式：
   - label 放到点的外围（最近的 plot 边缘外 12px）
   - 画细线 (stroke 0.5px, opacity 0.5) 从 point 到 label 锚点
```

**`labelCollision` 配置**：
- `"offset"`（默认）：force-based offset only
- `"leader"`：强制 leader line（适合 >30 点）
- `"cluster"`：点数 > 50 时聚类（§5.4）
- `"off"`：直接硬编码右上 8px（向 Mermaid 对齐，不推荐）

### 5.4 Clustering for Dense Quadrants（> 50 points）

当单个象限内点数超过阈值（默认 50），启用 k-means-lite：

1. 在该象限内取 `ceil(sqrt(n)/2)` 个 cluster
2. 以象限中心 + 随机扰动初始化
3. 迭代 10 轮 k-means（Euclidean）
4. 渲染 cluster center 为大 circle（radius = `6 + 2*log(count)`），内写 count
5. 点击/hover 展开（`data-cluster-members` 属性记录成员 id 供下游交互）

### 5.5 Bubble Sizing（Tufte 合规）

第三维 `size` 映射到 bubble radius：

```
area = size / max(size) * max_area        # max_area = π * (plot_h * 0.08)²
radius = sqrt(area / π)
```

**不可** 使用 `radius ∝ size`（会使大 bubble 视觉面积夸张 size² 倍，Tufte §3 明确禁止）。

Min bubble radius = 4px（保证可见），max = `0.08 * plot_h`（防止盖住象限 > 40%）。

### 5.6 Off-Chart Policy

`offChartPolicy`：
- `"clamp-badge"`（默认）：clamp 到边界 + 小箭头徽标（↗/↘/↖/↙）+ `<title>` 提示原始值
- `"drop"`：静默丢弃（不推荐，掩盖数据）
- `"edge-marker"`：在 plot 边界外 4px 处画小 triangle 指向 off-direction

### 5.7 Heatmap Cell Layout

```
cell_w = plot_w / cols
cell_h = plot_h / rows
cell_x(i) = plot_x0 + i * cell_w
cell_y(j) = plot_y0 + (rows - 1 - j) * cell_h     # SVG flip
```

每 cell 文字居中；若 `value > 0` 且 `heatmapScale` 启用，背景 fill = `heatmapScale[clamp(value / max, 0, 1)]`（color ramp，§7）。

---

## 6. Rendering

### 6.1 SVG Structure

```xml
<svg class="sx-matrix" data-diagram-type="matrix" data-mode="quadrant|heatmap">
  <defs>
    <style>…CSS custom properties…</style>
    <marker id="sx-axis-arrow" …/>        <!-- axis 末端箭头 -->
  </defs>
  <title>Matrix — {title}</title>
  <desc>{human desc}</desc>

  <!-- 1. Quadrant background tints (4 rect) -->
  <g id="sx-quadrant-bg">…</g>

  <!-- 2. Grid lines -->
  <g id="sx-grid" class="sx-matrix-grid">…</g>

  <!-- 3. Axes + arrows + labels -->
  <g id="sx-axes">
    <line class="sx-axis-line" …/>
    <text class="sx-axis-label" …>Low Effort → High Effort</text>
  </g>

  <!-- 4. Quadrant annotations (e.g. "Do First") -->
  <g id="sx-quad-annot">…</g>

  <!-- 5. Heatmap cells (if heatmap mode) -->
  <g id="sx-heat-cells">…</g>

  <!-- 6. Points / bubbles -->
  <g id="sx-points">
    <g data-point-id="…" data-category="…">
      <circle class="sx-bubble" cx=".." cy=".." r=".."/>
      <title>{label} · ({x}, {y}){size?}</title>
    </g>
  </g>

  <!-- 7. Leader lines (if collision = leader) -->
  <g id="sx-leaders" class="sx-leader">…</g>

  <!-- 8. Point labels -->
  <g id="sx-labels">…</g>

  <!-- 9. Off-chart badges -->
  <g id="sx-off-chart">…</g>

  <!-- 10. Legend -->
  <g id="sx-legend">…</g>
</svg>
```

### 6.2 Quadrant Background Tints

4 个象限 distinct but muted tints，确保 **不干扰 point 视觉**（opacity 0.08–0.12）：

| Quadrant | Default tint | 语义色（可 override by template） |
|----------|--------------|------------------------------------|
| Q1 (top-right) | accent @ 10% | "positive / do first" |
| Q2 (top-left) | positive @ 8% | "important but not urgent" |
| Q3 (bottom-left) | neutral @ 6% | "deprioritized" |
| Q4 (bottom-right) | warn @ 8% | "delegate / avoid" |

3×3 / N×M 不使用 quadrant tint，改用 heatmap ramp（§7）或 uniform bg。

### 6.3 Axis Rendering

- `<line>` stroke `--sx-axis-line` 1.5px
- `<marker>` 末端箭头（`axisArrows: true` 时）
- Axis label 居中于轴外侧 24px，12px font
- 显式方向文字：`Low Effort → High Effort`（不用 "X axis" 这种语义空词）

### 6.4 Points / Bubbles

- Default `<circle>` radius 6（无 size 时）
- Bubble：`r = sqrt(area/π)`（§5.5）
- stroke `--sx-bubble-stroke` 1.5px，fill `category color` @ 0.5 opacity + solid border
- shape 非 circle 时用 `<polygon>` / `<rect>` 同等 bounding area

### 6.5 Labels

- Font 11px，`text-anchor="start"` 或 "end"（取决于 offset 方向）
- **永不 truncate**。长 label 处理见 §11.1 锁定策略（L1 force-offset → L2 leader line → L3 cluster pill）
- Multi-line：中文 ≥ 8 字 或 英文 ≥ 14 字自动 wrap 至 2 行；超 3 行触发 L2 leader line 将 label 外推到 plot 外

### 6.6 Quadrant Annotations

Template mode 自动注入（例：Eisenhower 的 "Do First"）：
- 位于每象限内角 12px padding 处
- Font 14px，weight 600，opacity 0.3（水印风格，不抢 point 视觉）
- Color = quadrant tint 的 darker variant

### 6.7 Legend

`category` 分组对应 legend：
- 每个 category 一行：colored dot + 名称 + optional count
- Position 默认 bottom-right，12px font
- Heatmap mode：legend 为 color ramp gradient bar + 数值刻度

---

## 7. Theme 集成

扩展 `src/core/theme.ts`，新增 `MatrixTokens` semantic 层：

```ts
export interface MatrixTokens {
  /** 4 象限背景 tint（已应用 low-opacity） */
  quadrantBg: readonly [string, string, string, string];
  /** Axis line stroke */
  axisLine: string;
  /** Grid line stroke */
  gridLine: string;
  /** Bubble stroke (border) */
  bubbleStroke: string;
  /** Bubble default fill */
  bubbleFill: string;
  /** Leader line stroke */
  leaderLine: string;
  /** Off-chart badge color */
  offChartBadge: string;
  /** Heatmap color ramp (低→高，5–9 stops) */
  heatmapScale: readonly string[];
  /** Quadrant annotation text color (watermark) */
  quadAnnotText: string;
}
```

### Default theme

```ts
const DEFAULT_MATRIX: MatrixTokens = {
  quadrantBg: ["#dbeafe22", "#dcfce722", "#f3f4f622", "#fed7aa22"],
  axisLine:    "#37474f",
  gridLine:    "#e0e0e0",
  bubbleStroke:"#1565c0",
  bubbleFill:  "#1e88e5",
  leaderLine:  "#90a4ae",
  offChartBadge:"#e65100",
  heatmapScale: ["#f0f9ff","#bae6fd","#60a5fa","#2563eb","#1e40af","#fb923c","#ef4444","#b91c1c","#7f1d1d"],
  quadAnnotText:"#607d8b",
};
```

### Monochrome theme

所有 stroke = `#000`，quadrant tint = greyscale `[#f7,#f0,#e8,#e0]`，heatmapScale = 9 级 `#f0→#000`。

### Dark theme

遵循 Catppuccin Mocha：axisLine `#cdd6f4`, heatmapScale 改用 `[#1e1e2e, #313244, …, #f38ba8]` 冷→暖。

Resolver：

```ts
export function resolveMatrixTheme(name: string): ResolvedTheme<MatrixTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...MATRIX_TOKENS[themeName] };
}
```

CSS custom properties：`--schematex-matrix-quad-0`, `--schematex-matrix-axis`, `--schematex-matrix-heatmap-N`, `--schematex-matrix-leader`, …

---

## 8. Template Library (Preset Specifications)

每个 preset 提供：axis 标签、4 个象限名、背景 tint override、典型 `size` 语义。

### 8.1 Eisenhower（Urgent × Important）

```
x-axis: Urgent → Not Urgent       # 反直觉但经典：左 urgent 右 not
y-axis: Not Important ↓ Important
quadrants: [Schedule, Do First, Delete, Delegate]   # [Q2 TL, Q1 TR, Q3 BL, Q4 BR]
bg: [positive tint, accent tint, neutral tint, warn tint]
```

**注意**：Covey 原版 urgent 在左、important 在上。部分 template 反转，Schematex 默认 Covey orientation，可 `orientation: flipped`。

### 8.2 Impact / Effort

```
x-axis: Low Effort → High Effort
y-axis: Low Impact ↑ High Impact
quadrants: [Quick Wins, Major Projects, Fill-ins, Thankless]
```

TL = Quick Wins（highest priority），TR = Major Projects，BL = Fill-ins，BR = Thankless Tasks。

### 8.3 RICE（2×2 projection）

RICE = Reach × Impact × Confidence ÷ Effort。完整四维不可视化，standard projection：
- x = Effort → (low to high)
- y = Impact × Reach ↑
- size = Confidence (0–100%)

Q 注释同 Impact/Effort。size 编码第三维 bubble（confidence）。

### 8.4 BCG Growth-Share

```
x-axis: High Market Share ← Low Market Share    # 反向！BCG 约定 share 从右到左递减
y-axis: Low Growth ↑ High Growth
quadrants: [Stars (TL), Question Marks (TR), Cash Cows (BL), Dogs (BR)]
size: revenue (USD)
```

**关键约定**：BCG 的 x 轴从右到左（因为高市占率在左）。DSL 需支持反转：`x-axis: High → Low`（箭头方向决定语义）。

### 8.5 Ansoff

```
x-axis: Existing Products → New Products
y-axis: Existing Markets ↓ New Markets
quadrants: [Market Development (TL), Diversification (TR),
            Market Penetration (BL), Product Development (BR)]
```

### 8.6 Johari Window

```
x-axis: Known to Self ← Not Known to Self      # 左: known to self
y-axis: Not Known to Others ↓ Known to Others  # 上: known to others
quadrants: [Open (TL), Blind (TR), Hidden (BL), Unknown (BR)]
```

Items 为 adjective/trait words（非数值），可无 `(x,y)`，自动填充到对应象限中心 + jitter。

### 8.7 9-Box（Performance × Potential）

```
3x3 mode
rows:    [Low, Medium, High]         # Potential bottom → top
cols:    [Low, Medium, High]         # Performance left → right
cell-labels:
  (2,2): "Stars / High Impact Performer"
  (2,1): "High Potential"
  (2,0): "Enigma"
  (1,2): "High Performer"
  (1,1): "Core Player"
  (1,0): "Inconsistent Player"
  (0,2): "Solid Performer"
  (0,1): "Average"
  (0,0): "Risk / Under-performer"
```

Items 通常为员工姓名。每 cell 可多人。

### 8.8 Risk Matrix (ISO 31000 5×5)

```
heatmap 5x5
rows: [Rare, Unlikely, Possible, Likely, Certain]
cols: [Negligible, Minor, Moderate, Major, Severe]
heatmapScale: ISO 31000 5-band ramp (green→yellow→orange→red→crimson)
cell value = likelihood_index * impact_index   # 1..25
```

Cell value 决定 heat tint。每 cell 可承载多个 risk item（list），超过 3 个自动 "…+N more" 折叠。

---

## 9. Test Cases

### Case 1：Eisenhower（template，8 tasks，2×2 canonical）

```
matrix eisenhower "Victor's Week of 2026-04-15"

"Ship Paddle fix"          at (0.95, 0.95)
"Security audit"           at (0.2, 0.9)
"Team 1:1"                 at (0.3, 0.85)
"Slack triage"             at (0.9, 0.2)
"LinkedIn scroll"          at (0.8, 0.05)
"Twitter DMs"              at (0.7, 0.1)
"Quarterly strategy"       at (0.15, 0.95)
"Inbox zero"               at (0.85, 0.3)
```

**验证：** 4 象限 tint 正确 / 注释 "Do First" 等在四角 / 8 label 无重叠 / axis 箭头方向正确。

### Case 2：Custom Impact-Effort（15 items，free-form）

```
matrix "Feature Backlog Q2"
x-axis: Low Effort → High Effort
y-axis: Low Impact ↑ High Impact

"Dark mode"            at (0.3, 0.9)  category: design
"OAuth v2"             at (0.9, 0.7)  category: infra
"Tooltip polish"       at (0.1, 0.3)  category: ux
… (12 more)
```

**验证：** 自定义轴标签正确 / category legend 在右下 / 颜色区分。

### Case 3：BCG with bubble size（6 products）

```
matrix bcg "Product Portfolio 2026"

"MyMap.ai"        at (0.2, 0.8) size: 1800000
"ChatDiagram"     at (0.4, 0.9) size: 600000
"ConceptMap"      at (0.6, 0.75) size: 150000
"ContractMaker"   at (0.8, 0.6)  size: 40000
"Legacy app A"    at (0.2, 0.2)  size: 900000
"Experiment B"    at (0.85, 0.3) size: 10000
```

**验证：** bubble area ∝ size / BCG x 轴从右到左递减（High share 在左） / 4 象限注释 Stars/Question Marks/Cash Cows/Dogs。

### Case 4：McKinsey 3×3 GE Matrix

```
matrix "GE–McKinsey Portfolio"
x-axis: Low Strength → High Strength
y-axis: Low Attractiveness ↑ High Attractiveness
grid: 3x3

"Business Unit A" at (0.85, 0.85)
"Business Unit B" at (0.5, 0.8)
"Business Unit C" at (0.15, 0.5)
…
```

**验证：** 9 格均等 / 每格可含多 item / 默认 "invest / selective / harvest" tint。

### Case 5：Risk Matrix 5×5 Heatmap

```
matrix heatmap 5x5
title: "ContractMaker 2026-Q2 Risk Register"
rows: [Rare, Unlikely, Possible, Likely, Certain]
cols: [Negligible, Minor, Moderate, Major, Severe]

cell (3,4) label: "Customer data breach"
cell (2,2) label: "CI flaky"
cell (4,5) label: "Ransomware"
cell (1,3) label: "Compliance delay"
cell (5,1) label: "CSS regression"
```

**验证：** 5×5 heat ramp green→crimson / label 在 cell 内居中换行 / legend 为 color bar。

### Case 6：Dense Quadrant Stress Test（60 points in Q1）

```
matrix "Feature Vote Dump"
x-axis: Low ... High
y-axis: Low ... High

# 60 个 items 全部 at (0.7..1.0, 0.7..1.0)
```

**验证：** 触发 `cluster` 模式 / 聚合成 ~4 个 cluster circle / count in center / 无 label 遮挡。

### Case 7：Overlapping Label Stress（10 点聚簇，offset mode）

```
"A" at (0.5, 0.5)
"B" at (0.51, 0.49)
"C" at (0.49, 0.51)
…（10 个在 5% 半径内）
```

**验证：** force-based offset 触发 / 某些切换到 leader line / 最终无 bbox 重叠。

### Case 8：Bubble Size 10× Variation

```
"A" size: 1
"B" size: 10
"C" size: 100
```

**验证：** radius(C) / radius(A) ≈ sqrt(100) = 10（area ∝ size，非 radius） / min radius 4px enforced。

### Case 9：Johari Window（adjectives，无坐标）

```
matrix johari
# auto-placed by quadrant
"confident"   quadrant: open
"creative"    quadrant: hidden
"impatient"   quadrant: blind
"???"         quadrant: unknown
…
```

**验证：** 无显式坐标，按 quadrant 自动散布 + jitter。

### Case 10：9-Box Performance × Potential

```
matrix 9-box "Team Talent Review 2026-Q1"
# items placed by (performance, potential) cell

"Alice"  at (2, 2)
"Bob"    at (1, 2)
"Carol"  at (0, 0)
…
```

**验证：** 3×3 网格 / cell 注释 "Stars" / "Risk" 等 / 多人挤到同 cell 时垂直堆叠。

### Case 11：Off-Chart Clamp Badge

```
"Outlier A" at (1.3, 1.2)    # 越界
"Outlier B" at (-0.1, 0.5)
```

**验证：** clamp 到 `(0.98, 0.98)` 和 `(0.02, 0.5)` / 绘 "↗" 和 "←" badge / tooltip 显示原始值。

### Case 12：Ansoff（2×2，4 item）

```
matrix ansoff
"Current business"   at (0.2, 0.2)
"New markets"        at (0.2, 0.8)
"New products"       at (0.8, 0.2)
"Diversification"    at (0.8, 0.8)
```

**验证：** axis 标签 "Existing → New"、4 象限注释 "Penetration / Development / Diversification"。

### Case 13：Single Point（edge case）

```
matrix "Solo" at (0.5, 0.5)
```

**验证：** 不崩溃，single point 居中，legend 省略。

### Case 14：Empty 2×2（axis only）

```
matrix "Template"
x-axis: Low → High
y-axis: Low → High
```

**验证：** 只有 axes + grid，无 data 不 error。

### Case 15：Heatmap 7×12（feature comparison grid）

```
matrix heatmap 12x7      # 12 features × 7 competitors
rows: [Notion, Obsidian, Roam, Logseq, Coda, Airtable, Miro]
cols: [Export, API, Mobile, Offline, Price, Collab, AI, ..., Perf]   # 12 items

cell (0,0) value: 3
cell (0,1) value: 5
… (全矩阵覆盖)
```

**验证：** 12×7 heat grid 正确 / cell 长宽比自适应 / heatmapScale 9 级渐变。

---

## 10. Implementation Plan（2 weeks）

| Day | 任务 | Complexity |
|-----|------|-----------|
| D1  | Parser：template + 2×2 custom DSL | Low |
| D2  | Parser：heatmap + N×M + cell shorthand | Medium |
| D3–4 | Layout：grid division + point placement + clamp + off-chart | Medium |
| D5–6 | **Label collision avoidance（force-based + leader line）** | High |
| D7  | Clustering（> 50 points） | Medium |
| D8  | Template library（8 preset 的 axis + quadrant annotation） | Low |
| D9–10 | Renderer：quadrant bg / axes / points / bubbles / labels | Medium |
| D11 | Heatmap renderer + color ramp | Low |
| D12 | Theme integration（MatrixTokens + 3 presets + CSS vars） | Low |
| D13 | Test cases 1–15 实施 + 视觉对齐 | Medium |
| D14 | Edge cases（empty / single / off-chart / dense） + docs | Low |

**文件结构：**

```
src/diagrams/matrix/
  ├── index.ts        # DiagramPlugin
  ├── parser.ts       # DSL → MatrixAST
  ├── templates.ts    # 8 preset definitions
  ├── layout.ts       # grid + point placement + collision + clustering
  ├── bubble.ts       # area-proportional sizing
  └── renderer.ts     # SVG builder calls
```

---

## 11. Open Questions / ⚠️ NEEDS VICTOR INPUT

1. **✅ Label overflow policy — 已锁定（2026-04）：永不截断文本，三级 graceful degradation**

   核心原则：**保持视觉好看 + 数据不丢失**。文本永不 truncate，靠动态 layout + 可选 hover 消化所有情况。

   | Level | 触发条件 | 策略 | 占比 |
   |-------|----------|------|:----:|
   | **L1 — Force-based offset**（默认启用） | 相邻 label bbox 重叠 | 力导向迭代偏移 label anchor，保持 label 完整可读。算法见 §5.3 | ~80% |
   | **L2 — Leader line** | L1 后仍有碰撞 / label 偏移距离 > 40px | label 外推到 plot 边缘 + 细 leader line 指回 point（0.5px, opacity 0.5） | ~15% |
   | **L3 — Cluster pill**（极端密度） | 单区域 overlap ≥ 5 个 point 且 L1/L2 解不开 | 合并为 "+N" 圆形 pill，`<g>` 上附 `<title>` 列出所有成员 + `data-cluster-items` 存原始数据 | ~5% |

   **永不 truncate 文本。** 长 label 的视觉冲突通过上述 3 级消化；Schematex 自身不做 hover UI（保持"输出静态 SVG"边界），但 L3 cluster pill 上提供：
   - `<title>` 原生 tooltip（浏览器零 JS 即可显示）
   - `data-cluster-items="[...]"` 属性供 CD/CM React 层接 custom hover 卡片

   配置 `labelCollision: "auto" | "offset-only" | "leader-only" | "cluster-only" | "off"` 可锁定某一级或关闭。默认 `auto`（L1→L2→L3 自动升级）。

2. **✅ Interactive hover — 已锁定：Schematex 产静态 SVG + `data-*` + `<title>`，hover UI 由集成方实现**

   Schematex 侧：
   - 所有 point / cluster `<g>` 带 `<title>` 和 `data-point-id` / `data-cluster-items`
   - **不生成任何 `<script>` 或内联事件处理器**
   - 原生 `<title>` 在浏览器里是零 JS tooltip（足够简单场景）

   ChatDiagram / MyMap 侧：用 React + 这些 data-* 构建自定义 hover 卡片（包含 bubble 细节、成员列表、跳转链接等）。

3. **BCG 反向 x 轴** — 学术 BCG 约定 high share 在左（x 轴反向）。DSL 支持 `x-axis: High → Low` 语法；但 Eisenhower 也有 urgent 在左的反直觉约定。**是否统一采纳 "箭头方向即语义方向" 原则？** 建议：是，强制箭头显式写出方向，避免歧义。

4. **Heatmap diverging vs sequential ramp** — Risk matrix 是 sequential（低→高危险），但 performance heatmap 可能 diverging（negative ↔ positive）。**是否需要双 ramp 模式？** 默认 sequential；diverging 通过 `heatmapScale: diverging` config 切换。

5. **3×3 是否复用 2×2 template system** — 9-box 和 GE matrix 结构相似但语义不同。是否：
   - (A) `9-box` 和 `mckinsey-ge` 两个独立 preset
   - (B) 统一 `grid-3x3` + 用户指定轴含义
   - **倾向 (A)** 与其他 preset 保持一致。

6. **✅ Bubble overlap — 已锁定：数据忠实 + 视觉可控**

   策略顺序（同 label overflow 原则：永不丢数据）：
   - **默认** bubble fill-opacity 0.4 + stroke 1px（重叠时底下的仍可见）
   - 若 overlap 严重（>3 bubble 重叠）→ 升级为 **cluster pill**（同 L3 label policy），`data-bubble-members` 记录原始值
   - 不做 force-based 推开 center（会 distort 数据位置，违反 matrix 的空间语义）

7. **Off-chart 符号** — clamp-badge 的箭头方向用哪套？Unicode ↗↘↖↙ vs 自绘 SVG triangle。**倾向自绘**（字体依赖问题）。

---

## 12. Accessibility

- SVG `role="graphics-document"` + `<title>` + `<desc>`
- 每 point `<g role="graphics-symbol">` + `<title>` 写 label + coordinates + size
- Heatmap cell `<title>` 写 row/col/value
- Color 不作为唯一编码（category 同时用 shape + color）
- 对比度：label 与 quadrant bg 满足 WCAG AA（4.5:1）

---

## 13. Coverage Matrix

| Feature | C1 Eisenhower | C2 Custom | C3 BCG | C4 McKinsey | C5 Risk | C6 Dense | C7 Overlap | C8 Bubble | C15 Feature |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2×2 quadrant | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | — |
| 3×3 matrix | — | — | — | ✓ | — | — | — | — | — |
| N×M heatmap | — | — | — | — | ✓ | — | — | — | ✓ |
| Template preset | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Custom axes | — | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Bubble size (3rd dim) | — | — | ✓ | — | — | — | — | ✓ | — |
| Category color legend | — | ✓ | — | — | — | — | — | — | — |
| Label collision avoidance | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — |
| Clustering (>50) | — | — | — | — | — | ✓ | — | — | — |
| Off-chart clamp-badge | — | — | — | — | — | — | — | — | — |
| Quadrant annotations | ✓ | — | ✓ | — | — | — | — | — | — |
| Area-proportional bubble | — | — | ✓ | — | — | — | — | ✓ | — |
| Heatmap color ramp | — | — | — | — | ✓ | — | — | — | ✓ |

**结论：** 本 standard 定义的 DSL grammar / layout algorithm / collision avoidance / bubble sizing / heatmap ramp / template library 共同覆盖 Case 1–15 的全部视觉需求，可直接驱动 parser + layout + renderer 实现 `src/diagrams/matrix/`。相比 Mermaid quadrantChart 的 1,942 错误/月，本 standard 明确给出 7 类失败模式的对策（§1），为 Schematex 在此垂类的竞争力建立标准层面的技术护城河。
