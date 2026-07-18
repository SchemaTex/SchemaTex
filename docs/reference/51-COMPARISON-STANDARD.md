# 51 — Comparison & Decision-Matrix Standard Reference

*One engine for the "compare, contrast, and decide" family: **T-chart**, **Y-chart**, **pros/cons**, **comparison matrix**, the **Pugh / weighted-scoring decision matrix** (the engine computes the winner), and the **Thinking-Maps double-bubble**. Header `comparison` (aliases `tchart`, `pugh`); the `mode:` directive selects the presentation.*

> **References (published methods + de-facto conventions):**
> - **Pugh, Stuart (1991)** *Total Design: Integrated Methods for Successful Product Engineering*. Addison-Wesley — the **controlled-convergence / decision-matrix method** (concept selection against weighted criteria with a datum). The canonical engineering source.
> - **Pugh, S. (1981)** "Concept selection: a method that works." *Proc. Int. Conf. on Engineering Design (ICED 81)* — the original paper.
> - **ASQ — "Decision Matrix" (Pugh / problem / selection grid)** — quality-society codification of the weighted criteria × options grid. Six-Sigma DMAIC standard tool.
> - **Hauser, J. & Clausing, D. (1988)** "The House of Quality." *HBR* 66(3) — weighted-criteria scoring lineage (the QFD relative is `matrix`'s House-of-Quality mode, §18; this engine is the *table*, not the roof).
> - **Hyerle, David (1996)** *Visual Tools for Constructing Knowledge*. ASCD — **Thinking Maps**; the **Double-Bubble Map** is the standard compare/contrast organizer (shared attributes in the middle, unique attributes outside).
> - **Graphic-organizer convention (K-12 + business)** — the **T-chart** (two-column compare/contrast, pros/cons, fact/opinion) and **Y-chart** (three-zone: *looks like / sounds like / feels like*) are centuries-old visual-organizer conventions with no single normative spec; this standard codifies the de-facto rendering.
>
> 注：comparison/decision 没有单一权威渲染规范。本 standard 综合上述方法（Pugh decision matrix 为计算核心、Thinking Maps double-bubble 为认知科学锚点、T/Y-chart 为通用 graphic-organizer 惯例）+ 主流工具惯例（Lucidchart、Miro、Notion、Canva 的 comparison table / pros-cons / decision matrix 模板），并明确与 `matrix`（§18，2×2/BCG/象限 *定位* 图）的边界。

---

## 1. 用户与需求（第一性原理）

"把东西并排比一比" 是 LLM 出图请求里最高频的几类之一，但它其实是**两类完全不同的图被混为一谈**：

| 真实意图 | 正确的图 | 引擎 |
|---------|---------|------|
| 把条目按**两个连续轴**摆到平面上（紧急×重要、增长×份额、影响×成本） | **2×2 / 象限 / 热力矩阵** | `matrix`（§18）— *定位* |
| 把若干**选项**按若干**维度**并排成**表**，或做对比/正反/决策 | **comparison / decision** | `comparison`（本标准）— *制表 + 计算* |

`comparison` 服务四类用户：

| 画像 | 场景 | 关键需求 |
|------|------|---------|
| **工程师 / PM（决策）** | 方案选型、供应商评估、trade study | 加权打分 → **引擎算出赢家**（Pugh）。手算总分是错误来源，必须由引擎做 |
| **产品 / 市场** | feature comparison、定价对比、竞品表 | options × criteria 网格，cell 支持 ✓/✗/~ 与自由文本 |
| **写作 / 决策记录** | pros-cons、要不要做某事 | 语义化正反两列（绿✓ / 红✗） |
| **教师 / 学生** | compare & contrast、T-chart、Y-chart、double-bubble | 符合课堂发布惯例的 graphic organizer（Thinking Maps / T-chart） |

**核心差异化（护城河）= `decision` 模式的计算**：和 `pert`（算排程）、`faulttree`（跑 MOCUS）、`rbd`（算可靠度）同一立场——**引擎替你算答案**，不是画个空表让你自己填总分。这是任何"画对比表"的通用工具都不做的。

---

## 2. 五种 mode

| mode | 别名 | 结构 | 计算 |
|------|------|------|------|
| `tchart` | `ychart`（3 列） | N 个 `column`，每列若干 `- item` | 无 |
| `pros-cons` | `proscons` | `pro` / `con` 行 | 无（仅语义着色 ✓/✗） |
| `matrix` | — | `option`（列）× `criterion`（行），cell = 文本 / yes/no/partial | 无 |
| `decision` | `pugh` | 同 matrix，criterion 带 `weight:`，cell 为数值 score，可选 `baseline:` 数据基准 | **加权总分 Σ(w·s)、排名、赢家、vs-datum 增量** |
| `double-bubble` | `compare-contrast` | `left` / `right` 双中心，`shared` 共性，`left-only` / `right-only` 差异 | 无 |

mode 由 `mode:` 显式指定；省略时按所用关键字推断（见 §4.6）。`tchart` / `pugh` 作为 header 关键字时直接定 mode。

---

## 3. 元素词汇

```
comparison "Title"           # header（别名 tchart / pugh / compare / vs）
mode: <mode>                 # 见 §2；省略则推断
legend: on | off
baseline: "OptionLabel"      # decision：Pugh 数据基准列

# tchart / ychart
column "Label"               # 一列（别名 col）
- item text                  # 当前列的一个要点（也可 `item "…"`）

# pros-cons
pro "positive point"
con "negative point"

# matrix / decision
option "Label"               # 一个选项 = 一列（别名 opt）
criterion "Label" weight: N  # 一个维度 = 一行（别名 criteria / row；weight 仅 decision 用）
  OptionLabel: value         # 缩进的 cell：value = number | yes/no/partial/na | "text"
criterion "Label" | v1 | v2  # 等价 pipe 形式（按 option 声明顺序定位）

# double-bubble
left "A"                     # 左中心
right "B"                    # 右中心
shared "common trait"        # 中间共性气泡（连到两个中心）
left-only "unique to A"      # 左侧专属气泡
right-only "unique to B"     # 右侧专属气泡
```

**cell value 归一化**：`yes`/`y`/`true`/`✓` → ✓（绿）；`no`/`n`/`false`/`x`/`✗` → ✗（红）；`partial`/`~`/`maybe` → ~（琥珀）；`na`/`-`/`none` → —；纯数字 → score；引号文本 → 原样。

CJK 引号 `「」""『』` 全部接受。注释 `#` 与 `//`。

---

## 4. DSL 语法

### 4.1 Header
`comparison "Title"`。别名 header：`tchart`（定 mode=tchart）、`pugh` / `decision-matrix`（定 mode=decision）、`compare` / `vs`。Title 可省略。

### 4.2 tchart
```
tchart "TCP vs UDP"
column "TCP"
- Connection-oriented (handshake)
- Guaranteed, ordered delivery
column "UDP"
- Connectionless, fire-and-forget
- Minimal header, low latency
```
`-`/`*`/`•` 开头的行归属**最近声明的 column**。Y-chart = 三列；语义上的"看起来/听起来/感觉" 用三个 column 即可。

### 4.3 pros-cons
```
comparison "Adopt Kubernetes?"
mode: pros-cons
pro "Auto-scaling out of the box"
con "Steep operational learning curve"
```
`pro`/`con` 顺序无关，分别堆到左/右列。

### 4.4 matrix
```
comparison "Cloud providers"
mode: matrix
option "AWS"
option "GCP"
criterion "Free tier"
  AWS: "12 months"
  GCP: "Always-free"
criterion "Managed Postgres"
  AWS: yes
  GCP: yes
```
先声明全部 `option`，再每个 `criterion` 后缩进 `OptionLabel: value`。option 名必须**精确匹配**（大小写不敏感）；不匹配 → warning（不静默丢弃）。

### 4.5 decision（计算核心）
```
comparison "CI/CD platform"
mode: decision           # 或 header 直接写 `pugh`
baseline: "Jenkins"      # 可选 Pugh datum
option "GitHub Actions"
option "Jenkins"
criterion "Ease of setup" weight: 5
  GitHub Actions: 5
  Jenkins: 2
criterion "Cost" weight: 4
  GitHub Actions: 4
  Jenkins: 5
```
- 每个 `criterion` 给 `weight:`（省略 = 1）。
- 每个 cell 给数值 score（glyph 也接受：yes=1 / partial=0.5 / no=0）。
- 引擎追加一行 **Weighted total** 并标 `#rank`，赢家绿色高亮；声明 `baseline:` 时该列标 "datum" 并追加 **vs datum** 增量行。

### 4.6 mode 推断（省略 `mode:` 时）
按出现的关键字：`bubble` 元素 → double-bubble；`pro`/`con` → pros-cons；`option`+`criterion` 且有 weight 或数值 score 或 baseline → decision，否则 matrix；其余 → tchart。**建议显式写 `mode:`**（AI 生成更稳）。

---

## 5. 布局（§5）

所有 mode 产出同一个 `ComparisonLayout`（`cells` + `ellipses` + `connectors` + 可选 `caption`），renderer 与 mode 无关。几何全部预定、确定性，无求解器。

- **列宽/行高内容自适应**：用无 DOM 的字符宽度估计（CJK/全角≈字号，普通≈0.56×字号）做 word-wrap 与列宽 clamp。
- **tchart**：header 行 + 每列要点 cell 纵向堆叠；带边框形成 T 形网格。
- **pros-cons**：固定双列，绿/红色头。
- **matrix/decision**：第一列为 criterion 行头（decision 额外显示 `×weight` 角标），其后每 option 一列；decision 末尾追加 Weighted-total（+ 可选 vs-datum）行。
- **double-bubble**：五列布局 `leftOnly | leftCenter | shared | rightCenter | rightOnly`，绕中线垂直居中；`shared` 气泡同时连两个中心，`left-only`/`right-only` 只连各自中心。连接线从椭圆边缘出发。

---

## 6. 计算：Pugh / 加权打分（§6）

`decision` 模式下，引擎而非作者计算：

1. **加权总分**：每个 option `total = Σ_criteria (weightᵢ × scoreᵢ)`，weight 默认 1。
2. **排名**：按总分降序，标准竞赛排名（并列同名次，下一名次跳过）→ `1,1,3`。
3. **赢家**：最高分（并列时取第一个声明的）；渲染为绿底 + 重边框 + `#1` 角标 + caption。
4. **vs datum**：声明 `baseline:` 时，每个 option 计算 `total − baselineTotal`，正绿负红。

> 这是质的差异：Mermaid / 通用画表工具只能画出空网格让你自己填 "Total" 这一行；这里 total/rank/winner 是**计算结果**，写错分数会立即反映在赢家上。

---

## 7. 渲染（§7）

语义 SVG：`<title>` + `<desc>`（含算出的赢家句）、class 主题化、`data-diagram-type="comparison"` + `data-mode`、每个 cell `data-variant`（+ glyph 时 `data-glyph`）。无 inline style。house blue 头；绿/红/琥珀承载正反与 yes/no/partial；绿色同时标 decision 赢家。`monochrome` 去色——正反靠 ✓/✗/~ 字形、赢家靠重边框（B&W 复印友好）；`dark` 为 Schematex slate/blue。

---

## 8. 校验

| 触发 | 级别 |
|------|------|
| tchart 无 column | error |
| pros-cons 无 pro/con | error |
| matrix/decision 无 option 或无 criterion | error |
| double-bubble 缺 left 或 right | error |
| cell 引用未声明 option（typo） | warning（不丢弃，提示加 `option` 或改名） |
| decision 模式无任何数值 score | warning（建议加分数或改 matrix） |
| baseline 不在 option 集合 | warning（忽略该 baseline） |
| pipe 值数量超过 option 数 | warning |

error 抛 `ComparisonParseError`；warning 进 `ast.warnings` 与 `<desc>`。

---

## 9. 测试用例（canonical）

- **TC-1 decision**：DB 选型（PostgreSQL/MongoDB/DynamoDB；3 加权 criteria）→ PG=49、Mongo=40、Dynamo=39，赢家 PG，vs-datum −9/−10。
- **TC-2 decision tie**：A=5,B=5,C=2（w1）→ 排名 1,1,3，caption "Tie at the top"。
- **TC-3 matrix**：cloud providers，cell 含 yes/partial/文本，归一化为 ✓/~/原文。
- **TC-4 pros-cons / tchart / double-bubble**：基本结构 + 校验（缺列、缺 side 报错）。
- **TC-5 pipe form**：`criterion "c" | yes | no` 按 option 顺序定位。
- **TC-6 typo**：cell `Typo: yes` → warning "not a declared option"。

实现见 `tests/comparison/e2e.test.ts`。

---

## 10. Deferred（v0.1 不做，按需再加）

- 经典 Pugh **+ / 0 / −**（相对 datum 的符号打分）与 Σ+/Σ0/Σ− 汇总（当前用加权数值打分 + vs-datum 增量近似）。
- cell 级**着色梯度**（按 score 高低热力填充）。
- **加权归一化视图**（总分 ÷ Σweight 的百分比）。
- 单元格**多行富文本 / 图标库**、列分组表头。
- double-bubble 之外的 Thinking Maps（bubble / brace / bridge map）——若做属独立引擎。
- 与 `matrix` 的 House-of-Quality（QFD）合流（受众不同，暂保持分离）。
