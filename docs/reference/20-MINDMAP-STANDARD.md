# 20 — Mindmap Diagram Standard Reference

*XMind 经典三款式：平衡图 Map · 逻辑图 Logic-Right · 组织图 Org-Down。统一由 markdown-heading + bullet DSL 驱动，零运行时依赖，专注视觉清晰与实现可读。*

> **References:**
> - **Buzan, Tony (1974)** *Use Your Head* — 中心放射法
> - **XMind (MindManager Inc., 2007–今)** — "平衡图 / 逻辑图 / 组织结构图" 三大经典布局，de-facto 视觉参考
> - **markmap.js.org** — markdown-heading DSL 兼容约定
>
> 无 ISO/IEEE 标准；本文综合 XMind 三款式视觉规范 + markmap DSL 约定，形成可程序化实现的最小规范。

---

## 1. 设计原则

1. **可读性 > 特性** — 优先保证 layout 与 renderer 代码简单（< 300 行/文件）。
2. **抄 XMind 经典三款** — 不发明新样式，不做 360° radial / weighted sector / 8-segment taper。
3. **DSL 极简** — markdown heading + bullet + 极少 directive。无 icon / image / note / fold / link 等装饰。
4. **配色即层级** — 主干一色、子树继承；无需装饰语法即可区分。
5. **零依赖** — 不引入任何 runtime 包。

---

## 2. 三种款式（Style）

DSL 顶部 `%% style: <mode>` 选择款式，未指定默认 `map`。

| Style | 视觉 | 布局算法 | 典型场景 |
|-------|------|---------|---------|
| `map` | 中心居中，主干左右两侧分配，子树向外堆叠 | §5 Balanced Map | 头脑风暴、读书笔记、OKR、创意发散（XMind 默认） |
| `logic-right` | 根在左，全部向右展开的 tidy tree | §6 Horizontal Tree | 大纲、TOC、markmap 迁移、技术文档分解 |
| `org-down` | 根在顶，向下展开的 tidy tree | §6 Vertical Tree | 组织结构、分类树、决策流 |

---

## 3. DSL Grammar

### 3.1 Markdown 语法

```
%% style: map

# 中心主题

## 主干 A
- 子项 a1
- 子项 a2
  - 孙项
## 主干 B
- 子项 b1
```

**映射：**
- `#` = 中心主题（恰好 1 个）
- `##` = 主干（level-1），按声明顺序分配 palette 色
- `###` … = 深层小节点
- `- item` 每 2 空格缩进 = 深 1 层
- 支持 `*` / `+` 等价 `-`

### 3.2 Directives

顶部 `%% key: value`，均可选：

| Key | 值 | 默认 |
|-----|----|----|
| `style` | `map` / `logic-right` / `org-down` | `map` |
| `theme` | `default` / `monochrome` / `dark` | `default` |

### 3.3 EBNF

```ebnf
document   = directive* heading (heading | bullet)*
directive  = "%%" key ":" value NEWLINE
heading    = ("#"+) SPACE text NEWLINE
bullet     = INDENT ("-"|"*"|"+") SPACE text NEWLINE
INDENT     = /  */   # 2 空格 = 1 层
text       = /[^\n]+/
```

无属性块（`{color: ...}` 等），设计刻意从简。

---

## 4. AST

```ts
export type MindmapStyle = "map" | "logic-right" | "org-down";

export interface MindmapNode {
  id: string;
  label: string;
  depth: number;
  children: MindmapNode[];
}

export interface MindmapAST {
  type: "mindmap";
  style: MindmapStyle;
  root: MindmapNode;
  themeOverride?: string;
}
```

Layout output:

```ts
export interface MindmapLayoutNode {
  node: MindmapNode;
  x: number;
  y: number;
  /** For map style: "left" / "right" / "center" (root). For tree: always "right" (logic) or "down" (org). */
  side: "left" | "right" | "center" | "down";
  /** Main-branch index (0..N-1); -1 for root. Used for palette. */
  branchIndex: number;
  /** Label box (anchor at node x,y + side). */
  labelWidth: number;
  labelHeight: number;
}

export interface MindmapLayoutEdge {
  from: string;
  to: string;
  path: string;
  color: string;
  width: number;
}

export interface MindmapLayoutResult {
  width: number;
  height: number;
  style: MindmapStyle;
  nodes: MindmapLayoutNode[];
  edges: MindmapLayoutEdge[];
  title?: string;
}
```

---

## 5. Layout — Balanced Map（平衡图）

**核心思想：** 主干按声明顺序交替分配到中心点左右两侧（odd → right, even → left），每侧独立做垂直堆叠。

### 5.1 步骤

1. **分边：** 主干（root.children）按 index 奇偶分配 — 第一个到右，第二个到左，第三个到右，以此类推。若总数 ≤ 6 也可按 ceil(N/2) 右、其余左分配（更整齐）。当前实现用**前半右后半左**。
2. **每侧子树测高：** 对每个主干递归计算 `subtreeHeight = max(nodeHeight, Σ childSubtreeHeight + gaps)`，`siblingGap = 16px`。
3. **堆叠：** 每侧 y-cursor 从顶向下累加 `subtreeHeight + mainGap`（`mainGap = 28px`）。同侧所有主干总高度 = 右侧 / 左侧总高。
4. **列式 x：** 按 depth 分层等距 — main branch x 距中心 `levelGap = 160px`（右侧 `+`，左侧 `-`）；每深一层再 `+ levelGap`，左侧对称。
5. **root 位置：** x = canvas 中心，y = max(leftHeight, rightHeight) / 2。
6. **垂直居中每主干子树：** 父节点 y 设在其子节点 y 范围的中点（post-order）。

### 5.2 Edge

Bezier 三次曲线，横向 S 型：

```
M px,py C (px+dx/2),py (cx-dx/2),cy cx,cy
```

`dx = cx - px`。左侧主干时 dx < 0，自然方向反转。宽度固定：main edge = 2.5px，sub edge = 1.5px。

### 5.3 Label 与下划线

- Root：圆角矩形胶囊，填色 = theme.centralFill，白字加粗。
- Main branch：文字 + 底部 2px 色线（branch color），label anchor = 左侧为 `end`，右侧为 `start`。
- Sub / leaf：文字 + 1px 色线，color 继承主干色。

---

## 6. Layout — Tree Modes (Logic-Right / Org-Down)

共享简化版 Reingold-Tilford tidy tree（非严格 RT — 不做子树 contour merge，用"叶序列 + 父中点"近似，足够大多数 ≤ 100 节点场景）。

### 6.1 步骤

1. **Post-order 分配叶序号：** yCursor 从 0 开始，每遇 leaf 分配 `leafY = yCursor; yCursor += siblingGap`。
2. **父节点 y = 第一个子与最后一个子的 y 均值。**
3. **x 按 depth 分层：** `x = depth * levelGap`。
4. **方向转换：**
   - `logic-right`: (x, y) 保持；canvas 宽 = 最大 x + padding。
   - `org-down`: 交换 — 最终 canvas x = 上一步的 y，canvas y = 上一步的 x。

### 6.2 Edge

- `logic-right`: Bezier S 型（横向），公式同 §5.2。
- `org-down`: Bezier S 型（纵向）：`M x1,y1 C x1,(y1+y2)/2 x2,(y1+y2)/2 x2,y2`。

---

## 7. Theme

```ts
export interface MindmapTokens {
  centralFill: string;
  centralText: string;
  branchPalette: readonly string[]; // 8 色
  edgeMain: number;   // stroke-width
  edgeSub: number;
  underlineMain: number;
  underlineSub: number;
}
```

### 7.1 Default palette（XMind-inspired）

| i | Hex | 名称 |
|--:|-----|------|
| 0 | `#2D7FF9` | Blue |
| 1 | `#F59E0B` | Amber |
| 2 | `#10B981` | Green |
| 3 | `#EF4444` | Red |
| 4 | `#8B5CF6` | Purple |
| 5 | `#EC4899` | Pink |
| 6 | `#14B8A6` | Teal |
| 7 | `#F97316` | Orange |

### 7.2 Presets

- **default** — 白底 / palette 彩色。
- **monochrome** — 全黑线，仅缩进+字重区分层级。适合打印 / LaTeX。
- **dark** — 深色背景 (`#1e1e2e`)，palette 提亮。

---

## 8. SVG 结构

```xml
<svg viewBox="0 0 W H" role="graphics-document" aria-label="Mindmap: {title}">
  <title>{title}</title>
  <desc>{style} mindmap with {N} nodes</desc>
  <rect class="bg" .../>
  <g class="schematex-mindmap-edges">...</g>
  <g class="schematex-mindmap-nodes">
    <g class="schematex-mindmap-central" data-node-id="n0">...</g>
    <g class="schematex-mindmap-main" data-branch-idx="0">...</g>
    <g class="schematex-mindmap-leaf" data-branch-idx="0" data-depth="2">...</g>
  </g>
</svg>
```

---

## 9. Test Cases

### TC-MM-01 · Map minimal (3 branches)

```
%% style: map
# Project Plan
## Scope
- features
- non-goals
## Timeline
- milestones
## Team
- roles
```

验证：root 居中；`Scope` 在右上，`Timeline` 在右下（前半右），`Team` 在左侧。3 色 palette。

### TC-MM-02 · Map balanced 6-branch OKR

```
%% style: map
# Q2 OKRs
## Product
- ship v1
- API v2
## Engineering
- reliability
- tech debt
## Design
- system upgrade
## Marketing
- brand refresh
## Sales
- enterprise
## Ops
- finance
```

验证：3 右 / 3 左；root 垂直居中于两侧高度 max 处。

### TC-MM-03 · Map deep (5 levels)

```
%% style: map
# ML Roadmap
## Supervised
- Classification
  - Linear
    - Logistic
      - L1/L2
- Regression
## Unsupervised
- Clustering
```

验证：深度 5 路径无重叠；左右两侧独立堆叠。

### TC-MM-04 · Logic-Right (markmap-compat)

```
%% style: logic-right
# Migration Plan
## Phase 1
- audit
- baseline
## Phase 2
- refactor
  - module A
  - module B
## Phase 3
- ship
- monitor
```

验证：根在左；所有子向右展开；同层 y 等距。

### TC-MM-05 · Org-Down

```
%% style: org-down
# Animal Kingdom
## Vertebrata
- Mammals
- Birds
- Reptiles
## Invertebrata
- Arthropods
- Mollusks
```

验证：根在顶；子节点向下水平展开；Bezier 纵向 S。

### TC-MM-06 · Monochrome theme

TC-MM-01 + `%% theme: monochrome`。验证：全黑线、字重区分。

### TC-MM-07 · Dark theme

TC-MM-02 + `%% theme: dark`。验证：深底 + 高饱和 palette。

### TC-MM-08 · Unbalanced map

```
%% style: map
# Thinking Fast and Slow
## System 1
- intuition
- fast
- emotional
- biases
  - anchoring
  - availability
  - confirmation
  - loss aversion
  - framing
## System 2
- deliberate
## Two Selves
- experiencing
- remembering
```

验证：System 1 子树明显高于另两个，左右仍能堆叠，root y 仍居中。

---

## 10. Accessibility

- SVG `role="graphics-document"` + `aria-label="Mindmap: {title}"`
- 每节点 `<g>` 附 `<title>{label}</title>`
- Edge `aria-hidden="true"`

---

## 11. Out of Scope (明确砍掉)

以下能力**不在本 standard 范围**，若未来有明确需求再单独扩展：

- 360° radial 扇区均分 / weighted sector
- 碰撞检测回退循环
- 8-segment Bezier taper（锥形粗细）
- Icon / image / note / link / fold 节点属性
- Rotating labels（沿分支切线）
- Org compact narrow-sector mode
- Interactive fold/unfold
- `{color: ...}` 单节点配色覆盖

刻意保持最小实现；这些功能在 XMind 中也并非"经典款"。
