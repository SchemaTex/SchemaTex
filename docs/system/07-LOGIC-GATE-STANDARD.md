# 06 — Logic Gate Diagram Standard Reference

*IEEE Std 91-1984/91a-1991 (ANSI 独特形状符号) + IEC 60617-12 (矩形符号) 双标准支持。*

> **Primary References:**
> - IEEE Std 91-1984 / ANSI Y32.14: Logic Symbol Standard (Distinctive-Shape)
> - IEEE Std 91a-1991: Supplement for distinctive-shape symbols
> - IEC 60617-12: Graphical symbols for diagrams — binary logic elements
> - Schemdraw Logic module: https://schemdraw.readthedocs.io/en/stable/classes/logic.html

---

## 1. Gate Symbol Set

### 1.1 Symbol Style Options

两种标准并存，Lineage 通过 render config `style` 参数支持：

| Style | 标准 | 特点 | 主要使用场景 |
|-------|------|------|------------|
| `ansi` (default) | IEEE 91 | Distinctive curved shapes | 美国教育 + 工业 |
| `iec` | IEC 60617-12 | Uniform rectangles + symbol | 国际 + 欧洲 |

### 1.2 Combinational Gate Symbols (ANSI Distinctive Shape)

所有坐标基于 **100×60px 归一化空间**（宽×高），可通过 scale 参数缩放。

#### AND Gate
- **形状**: 平背（左） + 半圆前（右），D 形
- **SVG Path**: `M 20,60 L 20,0 Q 80,0 80,30 Q 80,60 20,60 Z`
- **输入 Pin 1**: `(20, 15)` — left edge, upper
- **输入 Pin 2**: `(20, 45)` — left edge, lower
- **输出 Pin**: `(80, 30)` — right center
- **Wire 延伸**: 输入向左 10px，输出向右 10px
- **IEC Symbol**: 矩形 `(10,5)→(90,55)` + 文字 `&` 居中

#### OR Gate
- **形状**: 弧形背面（左）+ 尖形前（右），月牙状
- **SVG Path**: `M 15,60 Q 10,30 15,0 Q 30,15 70,30 Q 30,45 15,60 Z`
- **输入 Pin 1**: `(15, 15)` — curved left, upper
- **输入 Pin 2**: `(15, 45)` — curved left, lower
- **输出 Pin**: `(70, 30)` — right point
- **IEC Symbol**: 矩形 + 文字 `≥1`

#### NOT Gate (Inverter)
- **形状**: 三角形 + 输出端小圆（bubble）
- **SVG Path**: `M 10,55 L 55,30 L 10,5 Z` (triangle)
- **Bubble**: `<circle cx="60" cy="30" r="5"/>`
- **输入 Pin**: `(10, 30)` — left
- **输出 Pin**: `(65, 30)` — after bubble
- **IEC Symbol**: 矩形 + 文字 `1` + 输出端 bubble circle

#### NAND Gate
- AND Gate 形状 + 输出端 bubble
- **输出 Pin**: `(85, 30)` (AND output + bubble radius 5)
- **IEC Symbol**: 矩形 + `&` + 输出 bubble

#### NOR Gate
- OR Gate 形状 + 输出端 bubble
- **输出 Pin**: `(75, 30)` (OR output + bubble radius 5)
- **IEC Symbol**: 矩形 + `≥1` + 输出 bubble

#### XOR Gate
- OR Gate + 额外弯曲背线（parallel to back curve）
- **额外路径**: `M 8,60 Q 3,30 8,0` (parallel arc, offset 7px left of OR back)
- **输入 Pin 1**: `(8, 15)` — from extra arc
- **输入 Pin 2**: `(8, 45)` — from extra arc
- **输出 Pin**: `(70, 30)` — same as OR
- **IEC Symbol**: 矩形 + `=1`

#### XNOR Gate
- XOR Gate + 输出端 bubble
- **IEC Symbol**: 矩形 + `=1` + 输出 bubble

#### Buffer (Non-inverting)
- 三角形（无 bubble）
- **SVG Path**: `M 10,55 L 55,30 L 10,5 Z`
- **输入 Pin**: `(10, 30)`，**输出 Pin**: `(55, 30)`
- **IEC Symbol**: 矩形 + `1`（无 bubble）

#### Tri-State Buffer
- Buffer + enable 输入（底部控制线）
- Enable 输入 Pin: `(30, 55)` — bottom center
- 当 enable = 0 时，输出为 Z（高阻抗）

### 1.3 3-Input Gate Variants

3-input 版本将第三个 pin 添加在中心高度：
- **AND3 Pin 3**: `(20, 30)` — left edge, center
- **OR3 Pin 3**: `(15, 30)` — curved left, center
- 4-input 类推（均匀分布在左侧边）

### 1.4 Bubble (Active-Low) Notation

输入端 bubble = 输入端 active-low，圆圈在 pin 与 gate 之间：
```svg
<circle cx="x_pin_end" cy="y_pin" r="4" fill="white" stroke="#333" stroke-width="1.5"/>
```
输入 pin 延伸 8px 额外（bubble 直径），输入从 `(x_pin_end - 4, y_pin)` 引入。

### 1.5 Clock Input Triangle

在 Flip-Flop 类元件中，clock 输入用小三角标识：
```svg
<!-- 三角形 pointing right, at clock pin position (x_clk, y_clk) -->
<polygon points="x_clk,y_clk-5 x_clk+8,y_clk x_clk,y_clk+5"
         fill="#333" stroke="none"/>
```

---

## 2. Sequential Logic Symbols

### 2.1 D Flip-Flop

矩形盒 `(0,0)→(60,80)` + 以下 pin：

| Pin | 位置 | 符号 | 方向 |
|-----|------|------|------|
| D (Data) | `(0, 20)` | `D` | Input |
| CLK (Clock) | `(0, 40)` | `▷` triangle | Input |
| S (Set, optional) | `(30, 0)` | `S` | Input active-low |
| R (Reset, optional) | `(30, 80)` | `R` | Input active-low |
| Q | `(60, 20)` | `Q` | Output |
| Q̄ (Q-not) | `(60, 60)` | `Q̄` + bubble | Output |

Clock triangle SVG（在盒子左边，CLK pin 处）：
```svg
<polygon points="0,35 8,40 0,45" fill="#333"/>
```

Q̄ bubble（在盒子右边，Q̄ pin 处）：
```svg
<circle cx="64" cy="60" r="4" fill="white" stroke="#333" stroke-width="1.5"/>
```

### 2.2 JK Flip-Flop

矩形盒 `(0,0)→(60,80)` + 以下 pin：

| Pin | 位置 | 符号 |
|-----|------|------|
| J | `(0, 15)` | `J` |
| K | `(0, 55)` | `K` |
| CLK | `(0, 35)` | triangle |
| S, R | top / bottom | active-low |
| Q, Q̄ | right side | same as DFF |

### 2.3 SR Latch (无时钟)

矩形盒 `(0,0)→(50,60)` + pin：

| Pin | 位置 |
|-----|------|
| S | `(0, 15)` |
| R | `(0, 45)` |
| Q | `(50, 15)` |
| Q̄ | `(50, 45)` + bubble |

### 2.4 T Flip-Flop

矩形盒 `(0,0)→(60,60)`:

| Pin | 位置 |
|-----|------|
| T | `(0, 20)` |
| CLK | `(0, 40)` + triangle |
| Q | `(60, 20)` |
| Q̄ | `(60, 50)` + bubble |

### 2.5 Register (N-bit)

较大矩形盒，高度根据位宽缩放：
- Input bus: 左侧，带 `/N` bus 标注
- CLK: 左侧，triangle 标识
- Output bus: 右侧，带 `/N` 标注
- Bus 线用粗线（stroke-width: 3）+ slash 标注位宽

---

## 3. Connection & Wiring Conventions

### 3.1 Wire Routing

- **正交路由** (Manhattan routing)：所有连线为水平或垂直，不斜线
- **信号流方向**：左 → 右（inputs 在左，outputs 在右）
- **反馈路径**：在主信号流上方或下方绕行

### 3.2 Junction & Crossing

| 情况 | 视觉 | SVG |
|------|------|-----|
| T 型交叉（连接） | 实心圆点 | `<circle r="3" fill="#333"/>` |
| 十字交叉（不连接） | 无点，线互相越过 | 两条独立 `<line>` |
| 桥接（一条跨越另一条） | 白色间隙 | 在底层线上覆盖白色矩形再画上层线 |

```svg
<!-- Junction dot at (x, y) -->
<circle cx="x" cy="y" r="3" fill="#333" class="lt-junction"/>

<!-- Bridge: bottom line has gap at crossing -->
<!-- 1. Draw bottom line with gap (two segments) -->
<line x1="x1" y1="y" x2="x_cross-5" y2="y" stroke="#333" stroke-width="2"/>
<line x1="x_cross+5" y1="y" x2="x2" y2="y" stroke="#333" stroke-width="2"/>
<!-- 2. Draw top line continuously -->
<line x1="x" y1="y1" x2="x" y2="y2" stroke="#333" stroke-width="2"/>
```

### 3.3 Bus Notation

多位总线用粗线 + slash 标注：
```svg
<!-- Bus line (thick) -->
<line x1="x1" y1="y" x2="x2" y2="y" stroke="#333" stroke-width="4"/>
<!-- Bit-width annotation slash + text -->
<line x1="x_mid-6" y1="y+8" x2="x_mid+6" y2="y-8" stroke="#333" stroke-width="1.5"/>
<text x="x_mid+8" y="y-6" font-size="9">8</text>
```

### 3.4 Signal Labels on Wires

Wire label 置于线段中点上方 5px：
```svg
<text x="x_mid" y="y_wire-6" font-size="10" text-anchor="middle"
      class="lt-wire-label">SIGNAL_NAME</text>
```

### 3.5 Power Symbols

```svg
<!-- VCC (power, pointing up) -->
<polygon points="x,y x-6,y+10 x+6,y+10" fill="#333"/>
<text x="x" y="y+20" font-size="9" text-anchor="middle">VCC</text>

<!-- GND (ground, pointing down) -->
<line x1="x" y1="y" x2="x" y2="y+10" stroke="#333" stroke-width="2"/>
<line x1="x-10" y1="y+10" x2="x+10" y2="y+10" stroke="#333" stroke-width="2"/>
<line x1="x-6" y1="y+14" x2="x+6" y2="y+14" stroke="#333" stroke-width="2"/>
<line x1="x-2" y1="y+18" x2="x+2" y2="y+18" stroke="#333" stroke-width="2"/>
```

---

## 4. Layout Conventions

### 4.1 Signal Flow Direction

- **Primary axis**: 左 → 右（inputs 最左，outputs 最右）
- **Vertical axis**: 信号依逻辑层次排列（inputs 在上/下，outputs 在中间）
- **Feedback**: 在主信号路径上方或下方绕行，不与主路径重叠

### 4.2 Gate Placement

- **水平间距**: 相邻 gate 中心间距 ≥ 120px（100px gate + 20px wire）
- **垂直间距**: 相邻 gate 中心间距 ≥ 80px
- **层次对齐**: 同一逻辑深度的 gate 对齐在同一垂直列

### 4.3 Layout Algorithm (DAG-based)

Logic gate diagram 的 layout 是 DAG（有向无环图）拓扑排序问题：

1. **拓扑排序**: 按信号依赖关系分层（深度 = 层级）
2. **层级分配**: 每个 gate 分配到最大深度层（critical path）
3. **垂直排列**: 同层 gate 从上到下排列，均匀间距
4. **坐标赋值**: `x = layer × 120 + name_column_width`, `y = position_in_layer × 80`
5. **连线路由**: Manhattan routing，绕过 gate 边界

### 4.4 Label Positioning

- Gate 类型标签（如 AND, OR）: gate 内部居中，10px sans-serif
- Pin 标签（D, J, K, Q）: pin 旁边，9px，距离 pin 5px
- Wire 标签: 线段中点上方 6px，10px，居中

---

## 5. DSL Grammar (Logic Gate Diagram)

```ebnf
document    = header statement*
header      = "logic" quoted_string? props? NEWLINE
props       = "[" prop ("," prop)* "]"
prop        = "style:" ("ansi" | "iec")
            | "scale:" FLOAT

statement   = comment | input_def | output_def | gate_def | wire_def

comment     = "#" [^\n]* NEWLINE

input_def   = "input" id_list NEWLINE
id_list     = IDENTIFIER ("," IDENTIFIER)*

output_def  = "output" id_list NEWLINE

gate_def    = IDENTIFIER "=" gate_type "(" input_list ")" NEWLINE
gate_type   = "and" | "or" | "not" | "nand" | "nor" | "xor" | "xnor"
            | "buf" | "tri"
            | "and3" | "or3" | "and4" | "or4"
            | "dff" | "jkff" | "srff" | "tff"
gate_type_3 = "and3" | "or3" | "nand3" | "nor3" | "xor3"
input_list  = (IDENTIFIER | neg_input) ("," (IDENTIFIER | neg_input))*
neg_input   = "~" IDENTIFIER    # active-low / inverted input

wire_def    = IDENTIFIER "->" IDENTIFIER label_clause? NEWLINE
            | IDENTIFIER "~>" IDENTIFIER label_clause?  # bus connection
label_clause = "[" quoted_string "]"

IDENTIFIER  = /[a-zA-Z][a-zA-Z0-9_]*/
FLOAT       = /[0-9]+(\.[0-9]+)?/
INT         = /[0-9]+/
quoted_string = '"' /[^"]*/ '"'
NEWLINE     = /\n/
```

**DSL 示例（Full Adder）：**
```
logic "1-bit Full Adder" [style: ansi]

input A, B, Cin
output Sum, Cout

# First XOR for sum intermediate
s1 = xor(A, B)

# Second XOR for final sum
Sum = xor(s1, Cin)

# AND gates for carry
c1 = and(A, B)
c2 = and(s1, Cin)

# OR for carry out
Cout = or(c1, c2)
```

**DSL 示例（D Flip-Flop with enable）：**
```
logic "D FF with Enable"

input D, CLK, EN
output Q

# Gate-level enable logic
d_in = and(D, EN)
Q = dff(d_in, CLK)
```

---

## 6. SVG Structure

```xml
<svg class="lt-logic" data-diagram-type="logic">
  <defs>
    <style>
      .lt-gate-body  { fill: white; stroke: #333; stroke-width: 2; }
      .lt-gate-label { font: bold 10px sans-serif; fill: #333; }
      .lt-pin-label  { font: 9px sans-serif; fill: #555; }
      .lt-wire       { stroke: #333; stroke-width: 2; fill: none; }
      .lt-bus        { stroke: #333; stroke-width: 4; fill: none; }
      .lt-wire-label { font: 10px sans-serif; fill: #333; }
      .lt-junction   { fill: #333; }
      .lt-bubble     { fill: white; stroke: #333; stroke-width: 1.5; }
      .lt-clock-tri  { fill: #333; }
    </style>
    <!-- Arrowhead for signal direction (optional) -->
    <marker id="lt-logic-arrow" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#333"/>
    </marker>
  </defs>
  <title>Logic Gate Diagram — [name]</title>
  <desc>[description]</desc>

  <!-- Gates -->
  <g id="lt-gates">
    <g id="gate-AND1" data-type="and" data-id="AND1" transform="translate(x, y)">
      <path class="lt-gate-body" d="..."/>
      <!-- pin wires -->
      <line class="lt-wire" .../>
    </g>
  </g>

  <!-- Wires -->
  <g id="lt-wires">
    <path class="lt-wire" d="M x1,y1 L x_bend,y1 L x_bend,y2 L x2,y2" .../>
  </g>

  <!-- Labels -->
  <g id="lt-labels">...</g>

  <!-- Junctions -->
  <g id="lt-junctions">
    <circle class="lt-junction" cx="x" cy="y" r="3"
            data-signals="A,B" />
  </g>
</svg>
```

---

## 7. Test Cases

### Case 1: Simple AND Gate
```
logic
input A, B
output Y
Y = and(A, B)
```
验证：AND gate 居中，两输入线从左，输出线向右，坐标正确。

### Case 2: Half Adder
```
logic "Half Adder"
input A, B
output S, C
S = xor(A, B)
C = and(A, B)
```
验证：XOR 和 AND 并排，两者共享输入 A、B（有 junction dots）。

### Case 3: Full Adder
```
logic "Full Adder"
input A, B, Cin
output Sum, Cout
s1 = xor(A, B)
Sum = xor(s1, Cin)
c1 = and(A, B)
c2 = and(s1, Cin)
Cout = or(c1, c2)
```
验证：5 个 gate，信号复用正确，s1 扇出到两个 gate（junction dot）。

### Case 4: D Flip-Flop
```
logic
input D, CLK
output Q
Q = dff(D, CLK)
```
验证：DFF 矩形盒渲染，clock triangle 在 CLK pin，Q̄ 有 bubble。

### Case 5: IEC Style
```
logic [style: iec]
input A, B
output Y
Y = nand(A, B)
```
验证：NAND gate 渲染为矩形 + "&" 文字 + 输出 bubble（IEC 风格）。

### Case 6: Active-Low Input
```
logic
input A, ~B
output Y
Y = and(A, ~B)
```
验证：B 输入有 bubble 在输入端，wire 从 bubble 左侧引入。

---

## 8. Implementation Priority

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (MVP) | AND, OR, NOT, NAND, NOR, XOR, XNOR (ANSI style) | Medium | Core — 基础数字逻辑 |
| P0 | Manhattan wire routing + junction dots | Medium | Core |
| P0 | DAG layout (topological sort + layer assignment) | Medium | Core |
| P1 | Buffer, Tri-state buffer | Low | High |
| P1 | 3-input gate variants | Low | High |
| P1 | Active-low bubble on inputs | Low | High |
| P1 | D Flip-Flop | Medium | High — sequential logic 必须 |
| P2 | JK/SR/T Flip-Flops | Medium | Medium |
| P2 | IEC rectangular style | Low | Medium |
| P2 | Bus notation (thick line + slash) | Low | Medium |
| P2 | N-bit Register | Medium | Medium |
| P3 | Feedback path routing (above/below main path) | High | Medium |
| P3 | Complex IC box (MUX, DEMUX) | Medium | Low |
