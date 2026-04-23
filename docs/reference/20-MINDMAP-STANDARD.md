# 20 — Mindmap Diagram Standard Reference

*XMind 经典两款式：平衡图 Map · 逻辑图 Logic-Right。统一由 markdown-heading + bullet + inline-markdown DSL 驱动，零运行时依赖，markmap 视觉风格，专注视觉清晰与实现可读。*

> **References:**
> - **Buzan, Tony (1974)** *Use Your Head* — 中心放射法
> - **XMind (MindManager Inc., 2007–今)** — "平衡图 / 逻辑图" 两大经典布局，de-facto 视觉参考
> - **markmap.js.org** — markdown-heading DSL 兼容约定、underline-node 视觉风格
>
> 无 ISO/IEEE 标准；本文综合 XMind 两款式视觉规范 + markmap DSL 约定，形成可程序化实现的最小规范。

---

## 1. 设计原则

1. **可读性 > 特性** — 优先保证 layout 与 renderer 代码简单（< 400 行/文件）。
2. **抄 XMind + markmap 经典** — 不发明新样式，不做 360° radial / weighted sector。
3. **DSL 极简 + Markdown inline** — heading + bullet + inline markdown（加粗、斜体、代码、链接、checkbox）。
4. **配色即层级** — 主干一色、子树继承；underline 宽度随深度递减。
5. **零依赖** — 不引入任何 runtime 包。

---

## 2. 款式（Style）

DSL 顶部 `%% style: <mode>` 选择款式，未指定默认 `map`。

| Style | 视觉 | 典型场景 |
|-------|------|---------|
| `map` | 中心居中，主干前半右 / 后半左分配，子树向外堆叠 | 头脑风暴、读书笔记、OKR、创意发散（XMind 默认） |
| `logic-right` | 根在左，全部向右展开的 tidy tree | 大纲、TOC、markmap 迁移、技术文档分解 |

---

## 3. DSL Grammar

### 3.1 基础结构

```
%% style: map
%% theme: default
%% maxLabelWidth: 240

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
- `- item`：每 2 空格缩进 = 深 1 层（支持 `*` / `+`）

### 3.2 Inline Markdown

每个节点的 `text` 支持内联 markdown，直接使用标准 markdown 语法：

| 语法 | 效果 |
|------|------|
| `**bold**` | 加粗 |
| `*italic*` | 斜体 |
| `` `code` `` | 等宽代码（带背景色） |
| `[text](url)` | 超链接（打开新标签） |
| `[x] text` | 已勾选的 checkbox（行首） |
| `[ ] text` | 未勾选的 checkbox（行首） |

组合示例：
```
- use `Bearer` tokens — see [RFC 6750](https://tools.ietf.org/html/rfc6750)
- **Rate limit**: 100 req/min
- [x] design review done
- [ ] implementation pending
```

### 3.3 Directives

顶部 `%% key: value`，均可选：

| Key | 值 | 默认 |
|-----|----|----|
| `style` | `map` / `logic-right` | `map` |
| `theme` | `default` / `monochrome` / `dark` | `default` |
| `maxLabelWidth` | `80`–`1000`（px） | `240` |

`maxLabelWidth` 控制节点文字换行宽度。根节点（中心主题）使用 1.5× 预算，因其字号（20pt）远大于叶节点（13pt）。

### 3.4 EBNF

```ebnf
document   = directive* heading (heading | bullet)*
directive  = "%%" key ":" value NEWLINE
heading    = ("#"+) SPACE text NEWLINE
bullet     = INDENT ("-"|"*"|"+") SPACE text NEWLINE
INDENT     = /  */   # 2 空格 = 1 层
text       = inline+
inline     = bold | italic | code | link | checkbox | plain
```

---

## 4. AST

```ts
type MindmapStyle = "map" | "logic-right";

// Inline token discriminated union
type InlineToken =
  | { kind: "text";     value: string; bold?: boolean; italic?: boolean }
  | { kind: "code";     value: string }
  | { kind: "link";     href: string; value: InlineToken[] }
  | { kind: "checkbox"; checked: boolean };

interface MindmapNode {
  id: string;
  label: string;          // raw text
  tokens: InlineToken[];  // parsed inline tokens
  depth: number;
  children: MindmapNode[];
}

interface MindmapAST {
  type: "mindmap";
  style: MindmapStyle;
  root: MindmapNode;
  maxLabelWidth: number;
  themeOverride?: string;
  title?: string;
}
```

Layout output:

```ts
interface MindmapLabelLine {
  tokens: InlineToken[];
  width: number;  // measured width of this line
}

interface MindmapLayoutNode {
  node: MindmapNode;
  x: number;         // horizontal center of label
  y: number;         // vertical center of label block
  side: "left" | "right" | "center";
  branchIndex: number;   // -1 for root
  labelWidth: number;    // equalized to max at this depth
  labelHeight: number;   // lines × lineHeight + UNDERLINE_GAP
  fontSize: number;
  lines: MindmapLabelLine[];
}

interface MindmapLayoutEdge {
  from: string;
  to: string;
  path: string;   // SVG path d= for cubic bezier
  color: string;
  width: number;
}

interface MindmapLayoutResult {
  width: number;
  height: number;
  style: MindmapStyle;
  nodes: MindmapLayoutNode[];
  edges: MindmapLayoutEdge[];
  title?: string;
}
```

---

## 5. Layout

### 5.1 字号与行高

| Depth | 角色 | 字号 |
|-------|------|------|
| 0 | Root（中心主题） | 20pt，bold |
| 1 | Main branch（主干） | 15pt，semi-bold |
| 2+ | Sub / leaf | 13pt，regular |

`lineHeight = fontSize + 4px`（LINE_GAP = 4px）

### 5.2 标签高度与 underline

```
labelHeight = lineCount × lineHeight + UNDERLINE_GAP
```

`UNDERLINE_GAP = 4px`，underline stroke 位于 `labelHeight` 底部 GAP 的中线，即：

```
underlineY = nodeY + labelHeight/2 - UNDERLINE_GAP/2
```

边（edge）的 bezier 终点与 underline stroke 对齐，视觉上无缝衔接。

### 5.3 等宽对齐

同一 depth 的所有节点共享最大 `labelWidth`（全树扫描取最大值），所以同层 underline 等长，bezier 水平跨度一致。

对 map 样式，左右两侧使用同一套 `maxLW`，保证 L/R 对称。

### 5.4 列间距（bezier gap）

| 目标节点 depth | 列间距 |
|--------------|-------|
| 1 | 90px |
| 2 | 60px |
| 3+ | 45px |

### 5.5 Bezier 边

横向 S 型三次 Bezier：

```
M x1,y1  C (x1+k),y1  (x2-k),y2  x2,y2
k = (x2-x1) × 0.55
```

从父节点 underline 的外侧端点出发，到子节点 underline 的内侧端点。

### 5.6 Stroke 宽度（随 depth 递减）

| Depth | Edge 宽 | Underline 宽 |
|-------|---------|-------------|
| 0 | — | 2.4px |
| 1 | 2.2px | 2.2px |
| 2 | 1.6px | 1.6px |
| 3+ | 1.2px | 1.2px |

Monochrome 主题所有宽度 × 0.7。

### 5.7 Map：左右分配

主干 index 0…N-1，前 `ceil(N/2)` 分配到右侧，其余到左侧。
每侧独立堆叠，`mainGap = 44px`，`siblingGap = 18px`。
Root y = `max(rightHeight, leftHeight) / 2`，居中对齐两侧。

### 5.8 Canvas

所有节点坐标归一化，四周留 `PADDING = 40px`。

---

## 6. Theme

```ts
interface MindmapTokens {
  bg: string;
  text: string;
  centralFill: string;
  branchPalette: readonly string[];
  // inline tokens
  codeFg: string;
  codeBg: string;
  linkColor: string;
  checkboxStroke: string;
  checkboxFill: string;
}
```

### 6.1 Default palette

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

### 6.2 Presets

- **default** — 白底 / 彩色 palette / 浅灰 codeBg。
- **monochrome** — 白底 / 全黑 centralFill + palette（单色）/ stroke × 0.7。适合打印。
- **dark** — 深色背景（`#1e1e2e`）/ 高饱和 palette / 深色 codeBg。

---

## 7. SVG 结构

```xml
<svg viewBox="0 0 W H" role="graphics-document" aria-label="Mindmap: {title}">
  <title>{title}</title>
  <desc>{style} mindmap with {N} nodes</desc>
  <rect fill="{bg}" .../>
  <g class="schematex-mindmap-edges" aria-hidden="true">
    <path d="M..." stroke="{color}" stroke-width="{w}" fill="none" stroke-linecap="round"/>
    ...
  </g>
  <g class="schematex-mindmap-nodes">
    <g class="schematex-mindmap-central" data-node-id="n0" data-depth="0" data-branch-idx="-1">
      <!-- decorations (code bg rects, checkbox rects/paths) -->
      <!-- <text> with <tspan>s for each token -->
      <!-- <line> underline -->
    </g>
    <g class="schematex-mindmap-main" data-node-id="n1" data-depth="1" data-branch-idx="0">...</g>
    <g class="schematex-mindmap-leaf" data-node-id="n2" data-depth="2" data-branch-idx="0">...</g>
  </g>
</svg>
```

每个节点 `<g>` 内渲染顺序：
1. decoration `<rect>` (code background、checkbox box)
2. decoration `<path>` (checkmark)
3. `<text>` with `<tspan>` per token
4. `<line>` underline

---

## 8. Test Cases

### TC-MM-01 · Map · Minimal 3-branch

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

验证：root 居中；Scope/Timeline 右侧，Team 左侧；3 色 palette。

### TC-MM-02 · Map · Balanced 6-branch OKR

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

验证：3 右 / 3 左；同层叶节点 underline 等长；root 垂直居中。

### TC-MM-03 · Map · Deep (5 levels)

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
- Dim reduction
```

验证：深度 5 无重叠；深层 stroke 宽度递减。

### TC-MM-04 · Map · Unbalanced (stress)

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
- slow
## Two Selves
- experiencing
- remembering
```

验证：System 1 子树高，左右仍能堆叠，root y 居中。

### TC-MM-05 · Logic-Right · markmap-compat

```
%% style: logic-right
# Migration Plan
## Phase 1
- audit
- baseline metrics
## Phase 2
- refactor
  - module A
  - module B
## Phase 3
- ship
- monitor
```

验证：根在左；所有子向右展开；同层 underline 等长。

### TC-MM-06 · Logic-Right · Tech Stack

```
%% style: logic-right
# Tech Stack
## Frontend
- React
- TypeScript
- Vite
## Backend
- Node
- Postgres
- Redis
## Infra
- Vercel
- Cloudflare
```

### TC-MM-07 · Monochrome theme

```
%% style: map
%% theme: monochrome
# Research Paper
## Introduction
- motivation
- prior work
## Method
- dataset
- model
## Results
- benchmarks
- ablation
## Discussion
- limitations
```

验证：全黑线 / stroke × 0.7；无彩色。

### TC-MM-08 · Dark theme

```
%% style: map
%% theme: dark
# Daily Routine
## Morning
- meditate
- exercise
## Work
- focus blocks
- meetings
## Evening
- reading
- family
```

验证：深底高饱和 palette。

### TC-MM-09 · Rich · Bold / italic / code / link

```
%% style: logic-right
# API **Design** Review
## Authentication
- use `Bearer` tokens in `Authorization` header
- see [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)
- *rotate* secrets quarterly
## Endpoints
- `GET /v1/users` — list users
- `POST /v1/users` — create
- **Rate limit**: 100 req/min
## Errors
- return `4xx` for client errors
- return `5xx` for server errors
```

验证：code 有灰色背景；link 蓝色带下划线；bold 加重；italic 斜体。

### TC-MM-10 · Rich · Checkbox task list

```
%% style: logic-right
# Q2 Roadmap
## Ship v1
- [x] design review
- [x] API spec frozen
- [ ] implementation
- [ ] QA sign-off
## Docs
- [x] overview page
- [ ] migration guide
- [ ] examples gallery
## Launch
- [ ] blog post
- [ ] HN thread
- [ ] newsletter
```

验证：`[x]` 渲染为填色勾选框；`[ ]` 为空心框。

### TC-MM-11 · Rich · Multi-line wrap (long labels)

```
%% style: map
%% maxLabelWidth: 220
# Product Strategy 2026
## Positioning
- Every diagram a doctor, engineer, or lawyer would actually use
- Free and fully open source — AGPL-3.0 with commercial dual license
- Made for AI — DSL designed for LLM output
## Differentiation
- Zero runtime dependencies — no D3, no dagre, no parser generator
- Semantic SVG with CSS-themable classes and data-* hooks
- 20 diagram families covering real professional standards
## Distribution
- npm package with tree-shakeable per-diagram imports
- Embedded in MyMap.ai and ChatDiagram.com as the rendering engine
```

验证：长文字按 220px 换行；多行节点 labelHeight 增大；不与相邻节点重叠。

### TC-MM-12 · Rich · Kitchen sink

```
%% style: logic-right
%% maxLabelWidth: 260
# **Schematex** launch checklist
## Code
- [x] `src/core/` stable
- [x] parser & renderer for all **20 diagram types**
- [ ] add *inline markdown* to remaining text-heavy diagrams
## Docs
- [x] [reference docs](https://schematex.js.org/docs)
- [ ] per-diagram tutorial with **at least 3 examples**
- [ ] video walkthrough on YouTube — *short form first*
## Distribution
- [x] publish to npm as `schematex`
- [ ] write [launch post](https://news.ycombinator.com)
- [ ] reply to every HN comment within **4 hours**
## Metrics
- track `npm_downloads` weekly
- monitor GitHub stars & forks
- collect feedback via [Discord](https://discord.gg/schematex)
```

验证：bold root 单行显示；checkbox + code + link + bold + italic 同时出现；换行正常。

### TC-MM-13 · Rich · Dark theme + rich content

```
%% style: map
%% theme: dark
%% maxLabelWidth: 220
# AI **Agent** Architecture
## Planning
- decompose goal into `subtasks`
- *maintain* a working memory graph
- [ ] add reflection loop
## Tools
- `web_search` with `[query](url)` citations
- `code_exec` in sandboxed VM
- `read_file` / `write_file` scoped to workspace
## Execution
- [x] ReAct prompting
- [x] tool-use streaming
- [ ] parallel tool calls
```

---

## 9. Accessibility

- SVG `role="graphics-document"` + `aria-label="Mindmap: {title}"`
- Edge group `aria-hidden="true"`
- 每节点 `<g>` 含 `data-node-id`、`data-depth`、`data-branch-idx`

---

## 10. Out of Scope（明确砍掉）

以下能力**不在本 standard 范围**：

- `org-down`（向下树）— 暂未实现
- 360° radial 扇区均分 / weighted sector
- 8-segment Bezier taper（锥形粗细）
- Image 节点（`![alt](url)`）
- Note / fold / 单节点配色覆盖（`{color: ...}`）
- Interactive fold/unfold
- Rotating labels（沿分支切线）

刻意保持最小实现；如有明确需求再单独扩展。
