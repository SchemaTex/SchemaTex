# 08 — Block Diagram (EE / Control Systems) Standard Reference

*控制系统框图标准：Laplace 域传递函数表示 + 信号流规范 + 反馈回路布局。*

> **Primary References:**
> - Ogata, K. (2010). *Modern Control Engineering*, 5th ed. — 经典控制系统框图规范
> - Franklin, G.F., Powell, J.D., Emami-Naeini, A. (2018). *Feedback Control of Dynamic Systems*, 8th ed.
> - Nise, N.S. (2020). *Control Systems Engineering*, 8th ed.
> - IEEE Std 91-1984: Logic symbol conventions (arrowhead style)
> - ISO 1219-1: Fluid power systems (block diagram influence)

---

## 1. Elements & Symbols

### 1.1 Core Element: Block (Transfer Function Box)

所有系统元件（controller, plant, sensor 等）用矩形盒表示。

**标准尺寸**: 80px wide × 50px tall（默认）

```svg
<!-- Standard block -->
<rect x="0" y="0" width="80" height="50"
      fill="white" stroke="#333" stroke-width="2"
      class="lt-block" data-id="G1"/>
<!-- Transfer function label (inside, centered) -->
<text x="40" y="22" font-size="14" font-family="serif" font-style="italic"
      text-anchor="middle" dominant-baseline="central" class="lt-tf-label">G(s)</text>
<!-- Block name/description (optional, below TF) -->
<text x="40" y="38" font-size="10" text-anchor="middle" class="lt-block-name">Plant</text>
<!-- Input pin (left center) -->
<!-- x=0, y=25 -->
<!-- Output pin (right center) -->
<!-- x=80, y=25 -->
```

**系统角色颜色编码（可选 theme）：**

| 角色 | Fill | 含义 |
|------|------|------|
| Plant / Process | white | 受控对象 G(s) |
| Controller | `#E3F2FD` (light blue) | 控制器 C(s) |
| Sensor / Transducer | `#F3E5F5` (light purple) | 传感器 H(s) |
| Actuator | `#E8F5E9` (light green) | 执行器 |
| Filter / Compensator | `#FFF8E1` (light yellow) | 滤波/补偿 |

### 1.2 Summing Junction（求和节点）

**最重要的 EE 专用符号**，与通用 flowchart 的关键区别。

```svg
<!-- Summing junction: circle Ø24px -->
<circle cx="12" cy="12" r="12" fill="white" stroke="#333" stroke-width="2"
        class="lt-summing-junction"/>
<!-- Plus (+) and minus (−) signs at input quadrants -->
<!-- Typical: + at left input, − at top/bottom input (negative feedback) -->
<text x="3" y="14" font-size="11" font-weight="bold">+</text>
<text x="16" y="14" font-size="11" font-weight="bold">−</text>
<!-- Sigma symbol alternative (some textbooks) -->
<!-- <text x="8" y="16" font-size="14" font-family="serif">Σ</text> -->
```

**Summing junction 的 Pin 位置**（以圆心为参考）：

| Pin 位置 | 坐标（偏移圆心） | 典型信号 | 典型极性 |
|---------|----------------|---------|---------|
| Left | `(-12, 0)` | Reference input r(t) | `+` |
| Top | `(0, -12)` | Disturbance / feedforward | `+` 或 `−` |
| Bottom | `(0, 12)` | Feedback signal y_m(t) | `−` |
| Right | `(12, 0)` | Error signal e(t) = output | 无符号（输出） |

**多输入 summing junction**：同一圆，4个输入方向均可使用。输入符号 (`+`/`−`) 位于相应输入线末端，圆外侧 3px 处。

### 1.3 Branch Point / Pickoff Point（信号分支点）

输出信号分叉处，表示同一信号流向多处：

```svg
<!-- Small filled circle at branch point -->
<circle cx="x" cy="y" r="4" fill="#333" class="lt-branch-point"/>
```

**规则**：Branch point 总是在连线上；不需要额外的分支 junction。

### 1.4 Signal Lines & Arrows

所有信号线必须有**箭头标明方向**（与通用 flowchart 不同，EE 框图箭头是语义的：传递函数定义了输入/输出方向）。

```xml
<defs>
  <!-- Solid filled arrowhead (standard for control systems) -->
  <marker id="lt-bd-arrow" markerWidth="10" markerHeight="8"
          refX="9" refY="4" orient="auto">
    <polygon points="0 0, 10 4, 0 8" fill="#333"/>
  </marker>
  <!-- Open arrowhead (for disturbance / uncertain signals) -->
  <marker id="lt-bd-arrow-open" markerWidth="10" markerHeight="8"
          refX="9" refY="4" orient="auto">
    <polygon points="0 0, 10 4, 0 8" fill="none" stroke="#333" stroke-width="1.5"/>
  </marker>
</defs>

<!-- Continuous signal line -->
<line x1="x1" y1="y" x2="x2" y2="y"
      stroke="#333" stroke-width="2"
      marker-end="url(#lt-bd-arrow)"
      class="lt-signal-line"/>

<!-- Discrete/sampled signal (dashed) -->
<line x1="x1" y1="y" x2="x2" y2="y"
      stroke="#333" stroke-width="2" stroke-dasharray="6,4"
      marker-end="url(#lt-bd-arrow)"
      class="lt-discrete-line"/>
```

### 1.5 Signal Labels

信号标签紧贴信号线上方 6px，serif 字体（传递函数风格）：

```svg
<text x="x_mid" y="y_line-8" font-size="12" font-family="serif" font-style="italic"
      text-anchor="middle" class="lt-signal-label">e(t)</text>
```

**标准信号名命名约定（Laplace 域）：**

| 符号 | 含义 |
|------|------|
| `R(s)` | 参考输入 (reference) |
| `E(s)` | 误差信号 (error) = R − Y_m |
| `U(s)` | 控制输入 (control input) |
| `Y(s)` | 系统输出 (output) |
| `Y_m(s)` | 测量输出 (measured output) |
| `D(s)` | 干扰信号 (disturbance) |
| `N(s)` | 噪声 (noise) |

### 1.6 System Boundary Box

系统边界用虚线矩形表示子系统范围：

```svg
<rect x="x" y="y" width="w" height="h"
      fill="none" stroke="#333" stroke-width="1.5"
      stroke-dasharray="8,5" rx="4"
      class="lt-system-boundary"/>
<text x="x+10" y="y+16" font-size="12" font-weight="bold"
      class="lt-boundary-label">Closed-Loop System</text>
```

---

## 2. Layout Rules

### 2.1 Primary Signal Flow Direction

- **前向路径**: 左 → 右（standard）
- **反馈路径**: 右 → 左（在前向路径的下方绕行）
- **干扰输入**: 从上方 → 下方进入（垂直进入前向路径）

### 2.2 Block Alignment

- 所有前向路径上的 block 中心线对齐（same y-coordinate）
- Summing junction 中心与 block 中心等高
- 水平间距：block 之间信号线 ≥ 40px

### 2.3 Standard Closed-Loop Layout

```
                    d(t)
                     ↓
R(s) → [Σ] → [C(s)] → [G(s)] → Y(s)
         ↑←←←←←[H(s)]←←←←←←←←←←←
         −
```

坐标布局（典型 600px 宽画布）：

| 元素 | x-center | y-center |
|------|----------|----------|
| 参考输入标签 | 30 | 100 |
| Summing junction | 80 | 100 |
| Controller C(s) | 200 | 100 |
| Plant G(s) | 360 | 100 |
| Output branch | 480 | 100 |
| Sensor H(s) | 360 | 220 |
| Feedback return | — | 220→100 |

### 2.4 Feedback Path Routing

反馈路径必须绕过前向路径，不直接穿越：

**标准四段路由（output → bottom → left → summing junction）**：
```svg
<!-- Segment 1: Vertical down from output pickup -->
<line x1="x_out" y1="y_fwd" x2="x_out" y2="y_fb"/>
<!-- Segment 2: Horizontal left (feedback path) -->
<line x1="x_out" y1="y_fb" x2="x_sum_x" y2="y_fb"/>
<!-- Segment 3: Vertical up to summing junction bottom -->
<line x1="x_sum_x" y1="y_fb" x2="x_sum_x" y2="y_sum"
      marker-end="url(#lt-bd-arrow)"/>
```

**Bridge notation（反馈线与前向路径交叉但不连接）**：
```svg
<!-- Forward path line (continuous) -->
<line x1="..." y1="y_fwd" x2="..." y2="y_fwd" stroke="#333" stroke-width="2"/>
<!-- Feedback line: white gap at crossing, then continue -->
<!-- White gap to create visual bridge -->
<rect x="x_cross-6" y="y_fb-4" width="12" height="8" fill="white"/>
<!-- Feedback line continues through gap area -->
<line x1="x_cross-8" y1="y_fb" x2="x_cross+8" y2="y_fb" stroke="#333" stroke-width="2"/>
```

### 2.5 Multi-Loop Systems

嵌套控制回路（内环 + 外环）：

- 内环：更小的 block group，position 更靠近 plant
- 外环：包含整个内环，summing junction 在更左
- 各 feedback path 分层（y 间距 ≥ 50px）

### 2.6 Cascade (Series) Blocks

串联 blocks（前向路径上多个 blocks 依次）：
- 等间距水平排列
- 单一信号线穿行，不需要额外 summing junction
- 等效传递函数 = 所有 blocks 传递函数之积

---

## 3. DSL Grammar (Block Diagram)

```ebnf
document      = header statement*
header        = "block" quoted_string? NEWLINE

statement     = comment | block_def | signal_def | connect_def
              | summing_def | boundary_def

comment       = "#" [^\n]* NEWLINE

block_def     = IDENTIFIER "=" "block" "(" tf_label ")" block_attrs? NEWLINE
tf_label      = quoted_string              # e.g., "G(s)", "C(s)", "H(s)"
block_attrs   = "[" block_attr ("," block_attr)* "]"
block_attr    = "name:" quoted_string      # descriptive name
              | "role:" role_type          # visual color coding
              | "width:" INT
              | "height:" INT
role_type     = "plant" | "controller" | "sensor" | "actuator" | "filter"

signal_def    = IDENTIFIER "=" "signal" "(" quoted_string ")" signal_attrs? NEWLINE
signal_attrs  = "[" "discrete" "]"        # dashed line

summing_def   = IDENTIFIER "=" "sum" "(" sum_input+ ")" NEWLINE
sum_input     = ("+" | "-") IDENTIFIER    # polarity + signal/block output

boundary_def  = "boundary" quoted_string ":" NEWLINE INDENT
                  block_def*
                DEDENT

connect_def   = IDENTIFIER "->" IDENTIFIER label_clause? NEWLINE
              | "in" "->" IDENTIFIER label_clause? NEWLINE   # external input
              | IDENTIFIER "->" "out" label_clause? NEWLINE  # external output
label_clause  = "[" quoted_string "]"

IDENTIFIER    = /[a-zA-Z][a-zA-Z0-9_]*/
INT           = /[0-9]+/
quoted_string = '"' /[^"]*/ '"'
NEWLINE       = /\n/
INDENT        = increase in whitespace
DEDENT        = decrease in whitespace
```

**DSL 示例：经典 PID 闭环控制**
```
blockdiagram "PID Closed-Loop Control System"

# System components
C = block("C(s)") [name: "PID Controller", role: controller]
G = block("G(s)") [name: "Plant", role: plant]
H = block("H(s)") [name: "Sensor", role: sensor]

# Signals
r = signal("r(t)")   # reference input
e = signal("e(t)")   # error
u = signal("u(t)")   # control input
y = signal("y(t)")   # output
ym = signal("y_m(t)") # measured output

# Summing junction (negative feedback)
err = sum(+r, -ym)

# Forward path connections
in -> r
r -> err ["R(s)"]
err -> C ["E(s)"]
C -> G ["U(s)"]
G -> out ["Y(s)"]

# Feedback path
G -> H ["Y(s)"]
H -> err ["Y_m(s)"]
```

**DSL 示例：Cascaded Blocks with Disturbance**
```
blockdiagram "Process with Disturbance"

C = block("C(s)") [role: controller]
G1 = block("G1(s)") [role: actuator]
G2 = block("G2(s)") [role: plant]
H = block("H(s)") [role: sensor]

d = signal("d(t)")    # disturbance

err = sum(+r, -ym)
dist = sum(+G1, +d)

in -> err ["R(s)"]
err -> C
C -> G1
d -> dist             # disturbance enters between G1 and G2
dist -> G2
G2 -> H
G2 -> out ["Y(s)"]
H -> err ["-"]
```

---

## 4. SVG Structure

```xml
<svg class="lt-blockdiagram" data-diagram-type="block">
  <defs>
    <style>
      .lt-block           { fill: white; stroke: #333; stroke-width: 2; }
      .lt-block-plant     { fill: white; }
      .lt-block-controller{ fill: #E3F2FD; }
      .lt-block-sensor    { fill: #F3E5F5; }
      .lt-tf-label        { font: italic 14px serif; fill: #333; }
      .lt-block-name      { font: 10px sans-serif; fill: #666; }
      .lt-signal-line     { stroke: #333; stroke-width: 2; fill: none; }
      .lt-discrete-line   { stroke: #333; stroke-width: 2;
                            stroke-dasharray: 6,4; fill: none; }
      .lt-signal-label    { font: italic 12px serif; fill: #333; }
      .lt-summing-jxn     { fill: white; stroke: #333; stroke-width: 2; }
      .lt-sum-sign        { font: bold 11px sans-serif; fill: #333; }
      .lt-branch-pt       { fill: #333; }
      .lt-boundary        { fill: none; stroke: #333; stroke-width: 1.5;
                            stroke-dasharray: 8,5; }
      .lt-boundary-label  { font: bold 12px sans-serif; fill: #333; }
    </style>
    <!-- Signal direction arrows -->
    <marker id="lt-bd-arrow" markerWidth="10" markerHeight="8"
            refX="9" refY="4" orient="auto">
      <polygon points="0 0, 10 4, 0 8" fill="#333"/>
    </marker>
    <marker id="lt-bd-arrow-open" markerWidth="10" markerHeight="8"
            refX="9" refY="4" orient="auto">
      <polygon points="0 0, 10 4, 0 8" fill="none" stroke="#333" stroke-width="1.5"/>
    </marker>
  </defs>
  <title>Block Diagram — [name]</title>
  <desc>[description]</desc>

  <!-- System boundary (if specified) -->
  <g id="lt-boundaries">...</g>

  <!-- Signal lines (drawn first, underneath blocks) -->
  <g id="lt-signals">
    <g data-from="C" data-to="G">
      <line class="lt-signal-line" ... marker-end="url(#lt-bd-arrow)"/>
      <text class="lt-signal-label" ...>U(s)</text>
    </g>
  </g>

  <!-- Blocks -->
  <g id="lt-blocks">
    <g id="G" data-type="block" data-role="plant" transform="translate(x,y)">
      <rect class="lt-block lt-block-plant" width="80" height="50"/>
      <text class="lt-tf-label" ...>G(s)</text>
      <text class="lt-block-name" ...>Plant</text>
    </g>
  </g>

  <!-- Summing junctions -->
  <g id="lt-summing-junctions">
    <g id="err" data-type="summing" transform="translate(x,y)">
      <circle class="lt-summing-jxn" cx="12" cy="12" r="12"/>
      <text class="lt-sum-sign" x="3" y="14">+</text>
      <text class="lt-sum-sign" x="16" y="14">−</text>
    </g>
  </g>

  <!-- Branch points -->
  <g id="lt-branch-points">
    <circle class="lt-branch-pt" cx="x" cy="y" r="4"
            data-signals="Y_G,Y_H"/>
  </g>
</svg>
```

---

## 5. Test Cases

### Case 1: Simple Open-Loop
```
blockdiagram "Open Loop"
G = block("G(s)") [role: plant]
in -> G ["R(s)"]
G -> out ["Y(s)"]
```
验证：单 block，左入右出，信号线有箭头。

### Case 2: Unity Feedback (Negative)
```
blockdiagram "Unity Feedback"
C = block("C(s)") [role: controller]
G = block("G(s)") [role: plant]
err = sum(+r, -y)
in -> err ["R(s)"]
err -> C ["E(s)"]
C -> G ["U(s)"]
G -> out ["Y(s)"]
G -> err ["-"]
```
验证：summing junction 在左，反馈路径从 G output 绕到 err 下方输入，负号正确。

### Case 3: Two-Block Cascade
```
blockdiagram "Cascade"
G1 = block("G1(s)")
G2 = block("G2(s)")
in -> G1 -> G2 -> out
```
验证：两个 block 水平串联，信号线连续。

### Case 4: PID with Sensor (Full System)
（见 Section 3 DSL 示例）  
验证：5 个元素（summing junction + C + G + H + branch point），反馈路径在下方，所有信号标签正确。

### Case 5: Discrete-Time System
```
blockdiagram "Digital Control"
C = block("C(z)") [role: controller]
G = block("G(s)") [role: plant]
ZOH = block("ZOH") [role: actuator]
H = block("H(s)") [role: sensor]
err = sum(+r, -ym)
r = signal("r[k]") [discrete]
in -> err
err -> C -> ZOH
ZOH -> G -> out
G -> H -> err
```
验证：r, err→C 为虚线（discrete），ZOH→G 为实线（continuous）。

---

## 6. Implementation Priority

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (MVP) | Block (transfer function box) + signal lines + arrows | Low | Core |
| P0 | Simple unidirectional connection (`->`) | Low | Core |
| P0 | Signal labels on lines | Low | Core |
| P1 | Summing junction with +/− signs | Medium | High — 控制系统核心 |
| P1 | Branch point (filled dot) | Low | High |
| P1 | Feedback path auto-routing (below forward path) | Medium | High |
| P1 | Block role colors (plant/controller/sensor) | Low | Medium |
| P2 | System boundary dashed box | Low | Medium |
| P2 | Disturbance input (vertical injection) | Medium | Medium |
| P2 | Discrete signal lines (dashed) | Low | Medium |
| P2 | Multi-loop (nested feedback) layout | High | Medium |
| P3 | Transfer function fraction display (numerator/denominator) | Medium | Low |
| P3 | Signal flow graph (Mason's gain) | High | Low |

---

## 7. Phase 2 — Advanced Layout (Planned)

Phase 0/1 cover SISO control systems with forward + feedback/feedforward loops.
Phase 2 addresses **stress-test patterns** that current 1D column layout handles
poorly: nested multi-input blocks (MIMO), bus-level signals, and diagrams that
need explicit 2D placement rather than auto-derived columns. These features
are **not yet implemented** — DSL shapes below are design targets.

### 7.1 Named Input Ports (Multi-Input Blocks)

Real systems (CRT TV, aircraft attitude, power electronics) have blocks with
multiple distinguishable inputs — not just sum-of-signals. Today `A -> B` only
picks a side by feedback heuristic. We need:

```
crt = block("C.R.T.") [ports: video=left, horiz=top, vert=bottom, power=right]
video_out -> crt.video
line_out  -> crt.horiz
ew_mod    -> crt.vert
degauss   -> crt.power
```

Parser: `[ports: name=side,...]` where `side ∈ {left, top, bottom, right}`.
Layout allocates multiple anchors per edge on the named block. Edge syntax
`A -> B.port` addresses a specific pin.

### 7.2 Explicit 2D Grid Placement

When BFS columns produce awkward layouts (multi-input convergence nodes,
side-by-side independent subsystems), allow explicit `row` + `col`:

```
G1 = block("G1") [col: 2, row: 0]
G2 = block("G2") [col: 2, row: 1]
merger = block("merge") [col: 3, row: 0.5]
G1 -> merger
G2 -> merger
```

Layout: when `col/row` present, skip BFS for that node; mix with auto-placed
nodes by treating explicit rows as hints that push auto columns outward.

### 7.3 Bus Signals

A bus carries multiple parallel lines (e.g., RGB, 3-phase power, state vector).
Visually: thicker stroke + slash-with-count annotation.

```
rgb = signal("RGB") [bus: 3]
in -> video_out ["RGB", bus: 3]
```

Renderer: stroke-width ≥ 3px; draw a short diagonal slash at midpoint with
count label above it. Bus edges do not merge into non-bus endpoints without
an explicit `demux` block.

### 7.4 Orthogonal Routing with Obstacle Avoidance

Current routing is right-angle but naive — long feedback paths can cross
forward blocks. Phase 2 routing:

- Compute node bounding boxes as obstacles.
- Route feedback/feedforward lanes in reserved corridors (one track per
  `fbRow`, already allocated in Phase 1 layout).
- For cross-row jumps, pick the corridor side (above/below) that minimizes
  crossings using a simple A*-like grid search at 10px resolution.
- Junction dots rendered wherever two edges share a point.

### 7.5 Disturbance Injection (Vertical)

Disturbances inject at a sum junction from above, visually offset:

```
d = disturbance("d(t)")
sum1 = sum(+u, +d)
d -> sum1
```

Parser adds `disturbance("label")` primitive. Layout places disturbance label
directly above the target sum's `top` pin (small text, no block border).

### 7.6 System Boundary (Grouping)

Draw a dashed box around a named subsystem:

```
boundary "Plant" { G1, G2, H1 }
```

Layout computes bbox of grouped nodes + padding; renderer emits a dashed
`<rect>` with the boundary label in the top-left.

### 7.7 Phase 2 Acceptance Tests

| Pattern | Currently | Phase 2 target |
|---------|-----------|----------------|
| CRT TV (MIMO C.R.T. block) | Inputs pile on left pin | Named ports, 4 sides used |
| 3-phase inverter bus | Three parallel edges | One bus signal, slash = 3 |
| Smith predictor (forward + model feedback) | Overlap | Separate corridors, no crossings |
| Nested boundary (controller vs plant) | No grouping | Dashed boxes, labels |
