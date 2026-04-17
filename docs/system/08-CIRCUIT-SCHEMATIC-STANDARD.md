# 07 — Circuit Schematic Standard Reference

*IEEE 315 / ANSI Y32.2 符号标准 + IEC 60617 国际标准 + Schemdraw 位置式 DSL 方法。*

> **Primary References:**
> - IEEE Std 315-1975 (ANSI Y32.2): Graphic Symbols for Electrical and Electronics Diagrams
> - IEC 60617 (BS 3939): International graphical symbols for diagrams
> - Schemdraw documentation: https://schemdraw.readthedocs.io
> - SPICE netlist conventions (for declarative netlist DSL)

---

## 1. Component Symbol Set

### 1.1 DSL Approach: Positional + Declarative 混合

Circuit schematic 的 layout 与树/图类型有根本不同：

- **Schemdraw 方式（位置式）**: 每个元件指定放置方向，链式排列
- **Netlist 方式（声明式）**: 声明元件 + 连接，自动 layout

**Lineage 采用位置式 DSL（更直观，CC 实现更可控）**，元件按方向链式排列，通过 `at:` 锚点分支。

### 1.2 Passive Components

#### Resistor
- **ANSI 符号**: 锯齿线（6 个峰谷）
- **IEC 符号**: 矩形 20×8px + 两端连线
- **尺寸**: 40px wide × 16px tall（占据方向上 40px）
- **Pin**: `start`（左/入方向端）, `end`（右/出方向端）
- **SVG Path (ANSI, 水平)**:
  ```
  M 0,0 L 5,0 L 8,-8 L 12,8 L 16,-8 L 20,8 L 24,-8 L 28,8 L 32,-8 L 35,0 L 40,0
  ```
  其中 y 偏移 ±8px 为锯齿幅度

#### Capacitor (非极性)
- **符号**: 两条平行线，间距 4px，两端引线
- **尺寸**: 水平方向 16px（含引线）
- **SVG**:
  ```svg
  <!-- Left plate -->
  <line x1="8" y1="-12" x2="8" y2="12" stroke="#333" stroke-width="2"/>
  <!-- Right plate -->
  <line x1="12" y1="-12" x2="12" y2="12" stroke="#333" stroke-width="2"/>
  <!-- Lead wires -->
  <line x1="0" y1="0" x2="8" y2="0" stroke="#333" stroke-width="2"/>
  <line x1="12" y1="0" x2="20" y2="0" stroke="#333" stroke-width="2"/>
  ```

#### Capacitor (极性/电解)
- 右板改为弧形（curved plate）或标注 `+`
- 弧形右板: `<path d="M 12,-12 Q 16,0 12,12" fill="none"/>`
- `+` 标注: 在左板外侧添加 `+` 文字

#### Inductor
- **符号**: 4 个半圆弧（coils）
- **尺寸**: 水平方向 40px
- **SVG Path**:
  ```
  M 0,0 L 5,0
  A 5,5 0 0 1 15,0     # coil 1
  A 5,5 0 0 1 25,0     # coil 2
  A 5,5 0 0 1 35,0     # coil 3
  L 40,0
  ```
  弧形向上（y 方向为负半圆）

#### Transformer
- 两组 inductor，背靠背 + 中间 coupling 线
- Primary coils: 左侧，4 个半圆
- Secondary coils: 右侧，4 个半圆（对称）
- Core line: 两组之间垂直线（可选虚线表示铁芯）

### 1.3 Sources

#### Voltage Source
```svg
<!-- Circle Ø24px -->
<circle cx="12" cy="0" r="12" fill="white" stroke="#333" stroke-width="2"/>
<!-- Plus sign (upper half) -->
<text x="12" y="-3" font-size="10" text-anchor="middle">+</text>
<!-- Minus sign (lower half) -->
<text x="12" y="9" font-size="10" text-anchor="middle">−</text>
<!-- Lead wires (vertical) -->
<line x1="12" y1="-20" x2="12" y2="-12"/>
<line x1="12" y1="12" x2="12" y2="20"/>
```

#### Current Source
```svg
<!-- Circle Ø24px -->
<circle cx="12" cy="0" r="12" fill="white" stroke="#333" stroke-width="2"/>
<!-- Arrow inside (pointing up = conventional current direction) -->
<line x1="12" y1="8" x2="12" y2="-3"/>
<polygon points="12,-8 9,-3 15,-3"/>
```

#### AC Source
- Circle + sine wave symbol inside
- Sine: `<path d="M 4,0 Q 7,-6 10,0 Q 13,6 16,0" fill="none"/>`

#### Battery
- Series of long/short lines alternating (IEC convention)
- Long line = positive terminal, short line = negative
- 1-cell: one long + one short
- 多 cell: 3 对 long/short

#### Ground Symbols

| Type | 视觉 | 用途 |
|------|------|------|
| Earth Ground | 倒三角形 + 3 条递减水平线 | AC 电路公共参考 |
| Signal Ground | 倒三角形（实心）| 数字信号参考 |
| Chassis Ground | 倒梯形 + 斜线 | 机壳连接 |
| Digital Ground | 倒三角形（空心）| 数字电路 |

```svg
<!-- Earth Ground (标准三线式) -->
<line x1="0" y1="-5" x2="0" y2="8"/>
<line x1="-12" y1="8" x2="12" y2="8"/>
<line x1="-8" y1="12" x2="8" y2="12"/>
<line x1="-4" y1="16" x2="4" y2="16"/>
```

### 1.4 Semiconductor Symbols

#### Diode
- 三角形指向正向 + 阴极竖线
- **SVG**:
  ```svg
  <!-- Triangle (anode side) -->
  <polygon points="-12,8 -12,-8 8,0" fill="#333"/>
  <!-- Cathode bar -->
  <line x1="8" y1="-10" x2="8" y2="10" stroke-width="2.5"/>
  <!-- Lead wires -->
  <line x1="-20" y1="0" x2="-12" y2="0"/>
  <line x1="8" y1="0" x2="20" y2="0"/>
  ```

#### Zener Diode
- 同 Diode，阴极线两端加小横折（Z 形弯折）

#### LED
- 同 Diode，+ 两条斜向射线（光线 arrows）
  ```svg
  <line x1="12" y1="-8" x2="20" y2="-16" marker-end="url(#lt-arrow)"/>
  <line x1="10" y1="-5" x2="18" y2="-13" marker-end="url(#lt-arrow)"/>
  ```

#### NPN Bipolar Transistor (BJT)
```svg
<!-- Circle Ø32px -->
<circle cx="0" cy="0" r="16" fill="white" stroke="#333" stroke-width="1.5"/>
<!-- Base vertical line (left, inside circle) -->
<line x1="-5" y1="-14" x2="-5" y2="14" stroke-width="2.5"/>
<!-- Base wire -->
<line x1="-16" y1="0" x2="-5" y2="0"/>
<!-- Collector (upper right, going up-right) -->
<line x1="-5" y1="-8" x2="14" y2="-14"/>
<!-- Emitter (lower right, going down-right, with arrow pointing outward) -->
<line x1="-5" y1="8" x2="14" y2="14"/>
<polygon points="14,14 8,10 11,16"/> <!-- NPN arrow: pointing outward -->
```

#### PNP BJT
- 同 NPN，但 emitter arrow 指向内（指向 base line）

#### N-Channel MOSFET
```svg
<!-- Gate lead (left) -->
<line x1="-16" y1="0" x2="-8" y2="0"/>
<!-- Gate insulation (vertical line) -->
<line x1="-8" y1="-14" x2="-8" y2="14"/>
<!-- Channel (offset right of gate) -->
<line x1="-4" y1="-10" x2="-4" y2="10"/>
<!-- Drain -->
<line x1="-4" y1="-10" x2="16" y2="-10"/>
<line x1="16" y1="-14" x2="16" y2="-10"/>
<!-- Source with arrow -->
<line x1="-4" y1="10" x2="16" y2="10"/>
<line x1="16" y1="10" x2="16" y2="14"/>
<polygon points="-4,0 -8,-4 -8,4"/> <!-- Arrow pointing toward channel -->
```

### 1.5 Active Components

#### Op-Amp
- 三角形（指向右），差分输入在左侧（-/+），输出在右尖
- **尺寸**: 50px wide × 40px tall
- **SVG Path**: `M 0,40 L 0,0 L 50,20 Z`
- **Input (+)**: `(0, 10)` — upper left input (non-inverting)
- **Input (−)**: `(0, 30)` — lower left input (inverting)
- **Output**: `(50, 20)` — right vertex
- **Power (+V, −V)**: 三角形 top/bottom midpoints（可选显示）

---

## 2. Element Connection Model

### 2.1 Pin Anchors

每个元件有具名锚点：

| 锚点 | 含义 |
|------|------|
| `start` | 信号流入端（根据方向，通常为左/上） |
| `end` | 信号流出端（根据方向，通常为右/下） |
| `center` | 元件几何中心 |
| 元件专用 | 如 opamp: `plus`, `minus`, `out`, `supply+`, `supply-` |
| BJT 专用 | `base`, `collector`, `emitter` |
| Transformer 专用 | `p1`, `p2`（primary）, `s1`, `s2`（secondary）|

### 2.2 Direction Model

DSL 中每个元件指定放置方向（基于前一元件的 `end` 点）：

| Direction | 含义 | Start → End |
|-----------|------|-------------|
| `right` (default) | 向右延伸 | 左 → 右 |
| `left` | 向左延伸 | 右 → 左 |
| `down` | 向下延伸 | 上 → 下 |
| `up` | 向上延伸 | 下 → 上 |

### 2.3 Branching with `at:`

```
R1: resistor right label="1kΩ"
at: R1.end                          # 返回 R1 的 end 点
C1: capacitor down label="100nF"    # 从 R1.end 向下
```

---

## 3. Layout Rules

### 3.1 DSL-Driven Positioning (位置式)

电路元件坐标完全由 DSL 中的 `direction` + `at:` 决定：
- 第一个元件从 `(0, 0)` 开始（或指定 `origin`）
- 每个后续元件从前一元件的 `end` 点开始
- `at:` 切换起点到指定锚点（用于分支）
- `wire right {len}` 画一段裸线（无元件）

### 3.2 Default Element Lengths

| 元件 | 默认长度（沿方向轴） |
|------|----------------|
| Resistor | 40px |
| Capacitor (non-polar) | 20px |
| Inductor | 40px |
| Voltage source | 40px（圆形直径 + 引线）|
| Diode | 30px |
| BJT | 40px（含 circle）|
| Wire segment | 20px（默认）|

### 3.3 Coordinate System

- SVG 原点 `(0, 0)` = 第一个元件起点
- `right` = x+，`down` = y+（SVG 标准）
- Renderer 计算 bounding box 后自动添加 padding（20px all sides）

### 3.4 Node/Net Labels

Named nets 通过 `net:` 声明，允许非连续元件"隐式连接"（避免长绕线）：
```
net VOUT
R1: resistor right
net VOUT: dot        # 在 R1.end 打点并命名 net
C1: capacitor down at: VOUT   # 从同名 net 点出发
```

---

## 4. DSL Grammar (Circuit Schematic)

```ebnf
document      = header? statement*
header        = "circuit" quoted_string? NEWLINE

statement     = comment | component_stmt | wire_stmt | net_stmt | at_stmt | label_stmt

comment       = "#" [^\n]* NEWLINE

component_stmt = id ":" component_type direction? attrs? NEWLINE
component_type = "resistor" | "capacitor" | "inductor" | "diode" | "led"
               | "zener" | "npn" | "pnp" | "nmos" | "pmos"
               | "vsource" | "isource" | "acsource" | "battery"
               | "ground" | "opamp" | "transformer" | "switch" | "fuse"
               | "wire" | "dot"
direction      = "right" | "left" | "up" | "down"
attrs          = attr+
attr           = "label=" quoted_string
               | "value=" quoted_string
               | "length=" INT
               | "flip"             # flip symbol around axis
               | "reverse"          # reverse polarity direction
               | "dashed"           # dashed line (for RF/shield)

wire_stmt      = "wire" direction length_spec? NEWLINE
length_spec    = INT "px"

net_stmt       = "net" IDENTIFIER ":" NEWLINE    # declare net name at current point
               | "at:" anchor_ref NEWLINE        # jump to anchor
anchor_ref     = IDENTIFIER "." pin_name
               | IDENTIFIER                      # net name as anchor
pin_name       = "start" | "end" | "center" | "base" | "collector" | "emitter"
               | "plus" | "minus" | "out" | "p1" | "p2" | "s1" | "s2"

label_stmt     = "label" quoted_string direction? NEWLINE

id             = IDENTIFIER
IDENTIFIER     = /[a-zA-Z][a-zA-Z0-9_]*/
INT            = /[0-9]+/
quoted_string  = '"' /[^"]*/ '"'
NEWLINE        = /\n/
```

**DSL 示例：RC Low-Pass Filter**
```
circuit "RC Low-Pass Filter"

V1: vsource down label="Vin" value="5V"
wire right
R1: resistor right label="R1" value="1kΩ"
wire right 20px
dot
C1: capacitor down label="C1" value="100nF"
wire down 10px
ground

at: C1.start
wire right 20px
label "Vout" right
```

**DSL 示例：Inverting Op-Amp**
```
circuit "Inverting Amplifier"

V1: vsource down value="Vin"
wire right 20px
Rin: resistor right label="Rin" value="10kΩ"

at: Rin.end
dot
net: INV_IN

Rf: resistor right label="Rf" value="100kΩ" at: INV_IN

U1: opamp right
at: U1.minus
wire left 10px
at: INV_IN

at: U1.plus
wire down 10px
ground

at: U1.out
wire right 20px
label "Vout" right

at: Rf.end
wire down  # connect feedback from Vout back to Rf end
at: U1.out
```

---

## 5. SVG Structure

```xml
<svg class="lt-schematic" data-diagram-type="circuit">
  <defs>
    <style>
      .lt-component { stroke: #333; stroke-width: 2; fill: none; }
      .lt-wire      { stroke: #333; stroke-width: 2; fill: none; }
      .lt-label     { font: 11px sans-serif; fill: #333; }
      .lt-value     { font: italic 10px sans-serif; fill: #555; }
      .lt-node-dot  { fill: #333; }
      .lt-no-connect { stroke: #333; stroke-width: 1.5; }
    </style>
    <!-- Arrow markers for current source / direction -->
    <marker id="lt-circ-arrow" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#333"/>
    </marker>
  </defs>
  <title>Circuit Schematic — [name]</title>
  <desc>[description]</desc>

  <!-- Components (each in its own group with transform) -->
  <g id="lt-components">
    <g id="R1" data-type="resistor" data-value="1kΩ" transform="translate(x,y) rotate(0)">
      <path class="lt-component" d="..."/>
      <text class="lt-label" ...>R1</text>
      <text class="lt-value" ...>1kΩ</text>
    </g>
  </g>

  <!-- Wires -->
  <g id="lt-wires">
    <line class="lt-wire" x1="" y1="" x2="" y2=""/>
  </g>

  <!-- Net dots (junction points) -->
  <g id="lt-nodes">
    <circle class="lt-node-dot" cx="x" cy="y" r="3" data-net="VOUT"/>
  </g>

  <!-- Net labels -->
  <g id="lt-net-labels">
    <text class="lt-label" ...>VOUT</text>
  </g>
</svg>
```

---

## 6. Test Cases

### Case 1: Voltage Divider
```
circuit "Voltage Divider"
V1: vsource down value="12V"
wire right 20px
R1: resistor down label="R1" value="10kΩ"
dot
R2: resistor down label="R2" value="10kΩ"
wire down 10px
ground
at: V1.start
wire right 20px
at: R1.start
wire right 20px
label "Vout" right
```
验证：V1 在左，R1/R2 串联向下，Vout 从中点引出，ground 在底。

### Case 2: LED Circuit
```
circuit "LED Driver"
V1: vsource down value="5V"
wire right
R1: resistor right label="R1" value="220Ω"
D1: led right label="D1"
wire down 20px
ground
at: V1.start
wire right
at: V1.start
```
验证：LED 符号正确（三角形 + 射线），极性正确。

### Case 3: Common Emitter Amplifier
```
circuit "Common Emitter"
# Base resistor
Rb: resistor down label="Rb" value="100kΩ" at: (0, 0)
Q1: npn at: Rb.end
# Collector resistor to VCC
Rc: resistor up label="Rc" value="1kΩ" at: Q1.collector
wire up 10px
label "VCC" up
# Emitter to ground
at: Q1.emitter
wire down 10px
ground
```
验证：NPN BJT 符号正确（圆形 + base line + emitter arrow out）。

### Case 4: Inverting Op-Amp
（见 Section 4 DSL 示例）  
验证：Opamp 三角形，Rin 和 Rf 正确连接，feedback path 从 output 回到 inv input。

### Case 5: Simple LC Filter
```
circuit "LC Filter"
V1: acsource down value="Vs"
wire right
L1: inductor right label="L1" value="10mH"
wire right 10px
dot
C1: capacitor down label="C1" value="1µF"
wire down 10px
ground
at: L1.start
wire down
at: V1.start
```
验证：Inductor 有正确弧形 coil 符号，capacitor parallel plates。

---

## 7. Implementation Priority

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (MVP) | Resistor, Capacitor, Inductor, Voltage Source, Ground | Medium | Core — RC/RL 基础电路 |
| P0 | Wire segments + Node dot | Low | Core |
| P0 | Positional DSL parser (direction chaining) | Medium | Core |
| P0 | Component labels + values | Low | Core |
| P1 | Diode, LED, Zener | Medium | High |
| P1 | Battery, Current Source, AC Source | Medium | High |
| P1 | NPN/PNP BJT | Medium | High — 放大电路必须 |
| P1 | Op-Amp | Medium | High — 运放电路必须 |
| P2 | MOSFET (N/P channel) | Medium | High |
| P2 | Transformer | Medium | Medium |
| P2 | Named net labels (隐式连接) | Medium | Medium |
| P2 | `flip` / `reverse` modifiers | Low | Medium |
| P3 | Switch variants (SPST/SPDT) | Medium | Low |
| P3 | 555 timer / IC box | Medium | Low |
| P3 | IEC resistor symbol (rectangle) | Low | Low |
