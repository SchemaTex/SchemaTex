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

---

## 6. Expanded Professional Symbol Library (v2)

*以下符号是 v1 标准的扩展，覆盖工程实践中高频使用的元件。所有路径均为 rightward 方向（direction="right"），实现时通过 SVG rotate 变换处理其他方向。坐标原点在组件左侧中心线。*

---

### 6.1 Passive Variants

#### Potentiometer
- **Pins**: 3-pin — `start` (left), `wiper` (center/top), `end` (right)
- **尺寸**: 60px long × 24px tall（含 wiper 箭头）
- **SVG Path**:
  ```
  /* 基础 zigzag (与 resistor 相同) */
  M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0
  /* wiper 箭头从顶部指向中心 */
  M 25,-22 L 25,-10   /* 垂直线 */
  M 20,-22 L 25,-16 L 30,-22  /* 箭头头部 */
  ```
- **Wiper pin**: `(25, -22)` 即 center X, above body

#### Rheostat (可变电阻，2-pin)
- **Pins**: 2-pin — `start`, `end`
- **SVG Path**: 与 potentiometer 相同，但 wiper 指向 end terminal（斜向箭头贯穿 zigzag）
  ```
  M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0
  /* 斜穿箭头 */
  M 5,-12 L 45,12  /* 对角线 */
  M 40,8 L 45,12 L 41,7   /* 箭头 */
  ```

#### Thermistor NTC
- **Pins**: 2-pin — `start`, `end`
- **SVG Path**: Resistor zigzag + 右上角 "-t°" 文字标注
  ```
  M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0
  /* 符号标记 — 在 renderer 中作为 <text> 元素 */
  /* text: "-t°" at (44, -6), font-size: 8px */
  ```

#### Thermistor PTC
- **同 NTC**，文字标记改为 "+t°"

#### LDR (Light Dependent Resistor)
- **Pins**: 2-pin — `start`, `end`
- **SVG Path**: Resistor zigzag + 两个向内的光箭头
  ```
  M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0
  /* 左侧光箭头 (从左上到右下) */
  M 2,-18 L 14,-6   M 11,-6 L 14,-6 L 14,-9   /* arrow1 */
  /* 右侧光箭头 */
  M 10,-20 L 22,-8  M 19,-8 L 22,-8 L 22,-11  /* arrow2 */
  ```

#### Varistor (MOV)
- **Pins**: 2-pin — `start`, `end`
- **SVG Path**: Resistor zigzag in a rounded box，带 "V" 文字
  ```
  M 0,0 H 8  M 8,-10 H 42 V 10 H 8 V -10  /* box */
  /* zigzag inside box — scaled down */
  M 10,0 L 13,-6 L 17,6 L 21,-6 L 25,6 L 29,-6 L 33,6 L 37,0
  M 42,0 H 50
  /* "V" 文字 in renderer at (44, -14) */
  ```

#### Fuse
- **Pins**: 2-pin — `start`, `end`
- **IEEE 315 符号**: 小矩形（表示熔断元件）
  ```
  M 0,0 H 14  /* left wire */
  M 14,-6 H 36 V 6 H 14 V -6  /* fuse body rect */
  M 36,0 H 50  /* right wire */
  ```

#### Fuse (Slow-Blow)
- **同 Fuse**，矩形内额外加 "T" 文字标注

#### Electrolytic Capacitor (极性电容)
- **Pins**: 2-pin — `start` (negative), `end` (positive)
- **SVG Path**:
  ```
  M 0,0 H 18   /* lead to negative plate */
  M 18,-12 V 12  /* negative plate (straight line) */
  M 22,-12 Q 26,-12 26,0 Q 26,12 22,12  /* positive plate (curved) */
  M 26,0 H 40   /* positive lead */
  /* Polarity marks */
  /* "+" text at (30, -15), font-size: 9px */
  /* "−" text at (14, -15), font-size: 9px */
  ```

#### Variable Capacitor
- **Pins**: 2-pin — `start`, `end`
- **SVG Path**: 两平行板 + 对角箭头
  ```
  M 0,0 H 17  M 17,-12 V 12  M 23,-12 V 12  M 23,0 H 40
  /* diagonal arrow */
  M 10,-16 L 32,8   M 28,6 L 32,8 L 30,4
  ```

#### Crystal (石英晶体)
- **Pins**: 2-pin — `start`, `end`
- **IEEE 符号**: 两条线 + 矩形体 + 两条线
  ```
  M 0,0 H 14
  M 14,-10 V 10  /* left plate */
  M 18,-8 H 32 V 8 H 18 V -8  /* crystal body rect */
  M 32,-10 V 10  /* right plate */
  M 36,0 H 50
  ```

#### Ferrite Bead (磁珠)
- **Pins**: 2-pin — `start`, `end`
- **符号**: 填充小矩形叠加在导线上
  ```
  M 0,0 H 50   /* continuous wire */
  /* filled rect overlay */
  M 20,-5 H 30 V 5 H 20 V -5  fill="#555"
  ```

#### Inductor (Iron Core)
- **同 inductor**，追加双平行线 (core):
  ```
  /* same 4-hump arcs as inductor */
  M -2,-14 H 52   /* core line 1 */
  M -2,-10 H 52   /* core line 2 */
  ```

#### Inductor (Ferrite Core)
- **同 inductor**，追加单填充线:
  ```
  M -2,-12 H 52   stroke-width:3 fill="none"
  ```

#### Variable Inductor
- **同 inductor** + 对角箭头（与 rheostat 相同方式）

---

### 6.2 Power Semiconductors

#### IGBT (Insulated Gate Bipolar Transistor)
- **Pins**: 3-pin — `gate` (left), `collector` (top-right), `emitter` (bottom-right)
- **标准**: IEC/IEEE N-channel IGBT = MOSFET gate + BJT collector/emitter structure + body diode
- **SVG Path** (centered at origin, 60×60px body):
  ```
  /* Gate lead */
  M -20,0 H -8   /* gate input wire */
  /* Gate insulation line */
  M -8,-20 V 20   stroke-width:2
  /* Channel lines */
  M -4,-18 V -4   /* upper channel segment */
  M -4,4 V 18    /* lower channel segment */
  /* Collector/Emitter base line */
  M -4,-18 H 8   M -4,18 H 8
  /* Collector wire (top) */
  M 8,-18 V -30  /* upward */
  /* Emitter wire (bottom, with arrow) */
  M 8,18 V 30    /* downward */
  /* Emitter arrow (outward = N-type) */
  M 2,14 L 8,18 L 2,22
  /* Body diode (anti-parallel) */
  M 8,-18 L 8,18   /* diode series with emitter path */
  /* diode symbol: small triangle + bar at midpoint */
  M 12,-4 L 12,4 L 20,0 Z   /* triangle */
  M 20,-5 V 5    /* bar */
  ```

#### SCR / Thyristor
- **Pins**: 3-pin — `anode` (left), `cathode` (right), `gate` (bottom)
- **符号**: 二极管 + gate lead 从 cathode 侧引出
  ```
  M 0,0 H 16   /* anode lead */
  M 16,-14 L 32,0 L 16,14 Z   /* triangle */
  M 32,-12 V 12   /* cathode bar */
  M 32,0 H 50   /* cathode lead */
  M 32,8 L 32,20 H 50  /* gate lead from cathode junction downward */
  ```

#### TRIAC
- **Pins**: 3-pin — `T1` (left), `T2` (right), `gate` (bottom)
- **符号**: 两个 SCR 反向并联 (头对头三角形)
  ```
  M 0,0 H 14
  /* Upper triangle (T1→T2 direction) */
  M 14,-12 L 30,0 L 14,12  /* triangle outline */
  M 14,-12 V 12  /* left bar */
  /* Lower triangle (T2→T1 direction, inverted) */
  M 30,-12 L 14,0 L 30,12  /* inverted triangle */
  M 30,-12 V 12  /* right bar */
  M 30,0 H 44
  /* Gate */
  M 30,8 L 44,20   /* gate lead from right junction */
  ```

#### DIAC
- **Pins**: 2-pin — `T1` (left), `T2` (right)
- **符号**: 两三角背靠背，无 gate
  ```
  M 0,0 H 14
  M 14,-12 L 28,0 L 14,12  M 14,-12 V 12
  M 28,-12 L 14,0 L 28,12  M 28,-12 V 12
  M 28,0 H 42
  ```

#### JFET N-Channel
- **Pins**: 3-pin — `gate` (left), `drain` (top), `source` (bottom)
- **符号**: 垂直 channel bar + gate arrow pointing in
  ```
  /* Channel bar */
  M 20,-20 V 20   stroke-width:2
  /* Drain connection (top) */
  M 20,-20 H 40 V -30  /* horizontal + upward */
  /* Source connection (bottom) */
  M 20,20 H 40 V 30
  /* Gate with arrow */
  M -20,0 H 10  /* gate wire */
  M 10,-5 H 16  /* upper gate segment */
  M 10,5 H 16   /* lower gate segment */
  /* Arrow: pointing toward channel (N-type) */
  M 10,0 L 16,-4 L 16,4 Z   fill
  ```

#### JFET P-Channel
- **同 JFET N**，gate arrow 方向反转（pointing away from channel）

#### Darlington NPN
- **Pins**: `base` (left), `collector` (top), `emitter` (bottom)
- **符号**: 两个 NPN 嵌套，外框矩形
  ```
  M 0,-20 H 60 V 60 H 0 Z   stroke-dashed  /* outer box */
  /* inner NPN1 */
  /* inner NPN2 — emitter of NPN1 feeds base of NPN2 */
  /* simplified: show "Darlington" label inside */
  ```
  *实现建议：使用 generic_ic 变体 + "Q" label，在 attrs 中指定 darlington=true*

#### Bridge Rectifier
- **Pins**: 4-pin — `ac1`, `ac2` (left side), `dc_pos` (top), `dc_neg` (bottom)
- **符号**: 4个二极管菱形排列
  ```
  /* Rotated 45° diamond outline */
  M 0,0 L 20,-20 L 40,0 L 20,20 Z   stroke dashed (envelope)
  /* 4 diodes — simplified: arrows pointing from AC to DC rail */
  /* D1: bottom-left→top (ac1→dc_pos) */
  /* D2: bottom-right→top (ac2→dc_pos) */
  /* D3: bottom→bottom-left (dc_neg→ac1) */
  /* D4: bottom→bottom-right (dc_neg→ac2) */
  /* In renderer: draw as 40×40px diamond with internal arrows */
  ```

---

### 6.3 Optoelectronics

#### Photodiode
- **Pins**: 2-pin — `anode` (left), `cathode` (right)
- **符号**: 标准二极管 + 两个向内指的箭头（表示接收光）
  ```
  M 0,0 H 14
  M 14,-12 L 28,0 L 14,12 Z   /* triangle */
  M 28,-12 V 12   /* bar */
  M 28,0 H 42
  /* incoming light arrows (from upper-left) */
  M 0,-22 L 10,-10   M 8,-10 L 10,-10 L 10,-13
  M 6,-26 L 16,-14   M 14,-14 L 16,-14 L 16,-17
  ```

#### Phototransistor
- **Pins**: 3-pin — `collector` (top), `base` (optional, left), `emitter` (bottom)
- **符号**: NPN BJT 形状 + 两个向内箭头（光替代 base 偏置）
  ```
  /* NPN BJT paths (same as npn) */
  /* incoming light arrows — same as photodiode */
  M -6,-22 L 4,-10   M 2,-10 L 4,-10 L 4,-13
  M -2,-26 L 8,-14   M 6,-14 L 8,-14 L 8,-17
  ```

#### Optocoupler
- **Pins**: 4-pin — `a` (LED anode), `k` (LED cathode), `c` (transistor collector), `e` (transistor emitter)
- **符号**: LED + 光箭头 + phototransistor，包围在虚线矩形中
  ```
  /* dashed isolation box */
  M 0,-20 H 80 V 60 H 0 V -20   stroke-dasharray:4,3
  /* LED symbol at x=15 */
  /* light arrows between LED and transistor */
  M 30,-5 L 50,15   /* arrow1 */
  M 30,5 L 50,25    /* arrow2 */
  /* arrowheads */
  /* phototransistor at x=55 */
  ```
  *尺寸: 80×80px body，比普通元件大*

---

### 6.4 Switches

#### Switch SPST (Normally Open)
- **Pins**: 2-pin — `start`, `end`
- **符号**: 导线 + 45° 倾斜臂 + 缺口
  ```
  M 0,0 H 14   /* left wire */
  M 14,0 L 34,-12  /* contact arm (open position, 35° tilt) */
  /* contact point */
  M 36,0 H 50  /* right wire */
  /* contact dot: circle r=2 at (14,0) */
  /* contact dot: circle r=2 at (36,0) */
  ```

#### Switch SPDT
- **Pins**: 3-pin — `common` (left), `nc` (top-right), `no` (bottom-right)
- **符号**: 公共接触 + 两个输出端
  ```
  M 0,0 H 14   /* common wire */
  M 14,0 L 36,-14  /* arm pointing to NC position */
  M 38,-16 H 50   /* NC output */
  M 38,8 H 50    /* NO output (open gap) */
  /* dots at connection points */
  ```

#### Push Button NO (常开按钮)
- **Pins**: 2-pin — `start`, `end`
- **IEEE 符号**: 圆圈代表按钮机构 + 水平间断接触
  ```
  M 0,0 H 14
  M 14,0 H 22  /* left contact */
  /* gap (NO state) */
  M 28,0 H 36  /* right contact */
  M 36,0 H 50
  /* actuator (vertical line above gap) */
  M 25,-4 V -14  /* push rod */
  M 18,-14 H 32  /* button top */
  ```

#### Push Button NC (常闭按钮)
- **同 Push NO**，接触点连通（实线），按下时断开，plus slash through contact

#### Switch DPDT
- **Pins**: 6-pin — `com1`, `com2`, `nc1`, `nc2`, `no1`, `no2`
- **符号**: 两个 SPDT 机械连动（用虚线连接两个 arm）
  ```
  /* Upper SPDT */
  /* Lower SPDT */
  /* Mechanical link: dashed line connecting both arms */
  M 16,-20 V 40   stroke-dasharray:3,2  /* actuator shaft */
  ```

---

### 6.5 Relays

> **注意**: Relay 线圈和触点是**分开的独立元件**，用参考标号关联（如 K1 coil + K1 contacts）。

#### Relay Coil
- **Pins**: 2-pin — `start` (pos/A1), `end` (neg/A2)
- **IEEE 符号**: 矩形 + 波浪线（线圈）
  ```
  M 0,0 H 8
  M 8,-10 H 42 V 10 H 8 V -10  /* coil body rect */
  /* coil symbol inside */
  M 10,0 Q 12,-7 14,0 Q 16,7 18,0 Q 20,-7 22,0 Q 24,7 26,0 Q 28,-7 30,0
  M 42,0 H 50
  ```

#### Relay Contact NO
- **Pins**: 2-pin — `start`, `end`
- **符号**: 完全等同于 switch_spst（arm open）—— 但 data-relay 属性携带 K1 等标号
  ```
  /* Identical to switch_spst SVG */
  /* Label shown as "K1" or "K1-1" (relay tag + contact number) */
  ```

#### Relay Contact NC
- **符号**: Switch SPST arm + 对角斜线（表示常闭）
  ```
  /* switch_spst paths */
  M 16,-8 L 34,8   /* NC diagonal slash */
  ```

---

### 6.6 Measurement Symbols

#### Ammeter
- **Pins**: 2-pin — `start`, `end`
- **符号**: Circle + "A"
  ```
  M 0,0 H 10
  <circle cx="25" cy="0" r="14"/>
  <text x="25" y="5" text-anchor="middle" font-size="12" font-weight="bold">A</text>
  M 40,0 H 50
  ```

#### Voltmeter
- **Pins**: 2-pin — `start`, `end` (placed in parallel with component under test)
- **符号**: Circle + "V"
  ```
  /* same as ammeter, text: "V" */
  ```

#### Wattmeter
- **Pins**: 4-pin (2 voltage + 2 current)
- **符号**: Circle + "W"

#### Oscilloscope Probe
- **Pins**: 1-pin — `signal`
- **符号**: 探针形状
  ```
  M 0,0 H 30 L 40,8 L 40,-8 L 30,0  /* probe tip */
  /* ground clip: small line below */
  ```

---

### 6.7 Special Symbols

#### Antenna
- **Pins**: 1-pin — `feed`
- **符号**: 垂直线 + 向上辐射斜线
  ```
  M 0,30 V 0   /* vertical mast */
  M 0,0 L -12,-16  /* left element */
  M 0,0 L 12,-16   /* right element */
  M 0,8 L -8,-4
  M 0,8 L 8,-4
  ```

#### Test Point
- **Pins**: 1-pin — `signal`
- **符号**: 小圆圈 + "TP" 标注
  ```
  <circle cx="0" cy="0" r="5" fill="white" stroke-width="1.5"/>
  /* TP label via renderer */
  ```

#### No-Connect
- **Pins**: 0 (annotation only)
- **符号**: X 形标记
  ```
  M -5,-5 L 5,5   M 5,-5 L -5,5
  ```

#### Voltage Regulator (三端稳压)
- **Pins**: 3-pin — `in` (left), `gnd` (bottom), `out` (right)
- **符号**: 矩形 block + "REG" label + 三引脚
  ```
  M -30,0 H -10  /* input wire */
  M -10,-20 H 10 V 20 H -10 V -20  /* body rect 20×40px */
  M 10,0 H 30    /* output wire */
  M 0,20 V 40    /* ground pin */
  /* "REG" text inside body */
  /* IN/OUT/GND labels in renderer */
  ```

#### DC-DC Converter
- **Pins**: 4-pin — `vin+`, `vin−` (left), `vout+`, `vout−` (right)
- **符号**: 矩形 block + "DC/DC" label + 波浪箭头（表示转换）
  ```
  M -40,-15 H -15  M -40,15 H -15
  M -15,-25 H 15 V 25 H -15 V -25  /* body 30×50px */
  M 15,-15 H 40  M 15,15 H 40
  /* "DC/DC" label in renderer */
  /* internal arrow: M -8,0 L 8,0 with arrowhead */
  ```

#### Comparator
- **Pins**: 5-pin — `in_pos` (top-left), `in_neg` (bottom-left), `out` (right), `vcc`, `gnd`
- **符号**: 完全等同于 op-amp 三角形，但 out 引脚连接 open-collector 符号
  ```
  /* identical to op-amp triangle */
  /* output: add open-circle at tip */
  <circle cx="50" cy="0" r="3" fill="white" stroke-width="1.5"/>
  ```

---

### 6.8 Updated Implementation Priority Table

| Priority | Symbols | Est. Hours |
|----------|---------|------------|
| P0 (MVP) | resistor, capacitor, inductor, voltage_source, current_source, battery, ground, vcc, wire, dot, label, port | 2h |
| P0 | diode, led, zener, schottky, npn, pnp, opamp | 1h |
| P0 | nmos, pmos, transformer, fuse, electrolytic_cap | 1h |
| P1 | potentiometer, rheostat, thermistor_ntc/ptc, varistor, crystal | 1h |
| P1 | ferrite_bead, ldr, photodiode, phototransistor, optocoupler | 1h |
| P1 | switch_spst, switch_spdt, push_no, push_nc | 0.5h |
| P1 | relay_coil, relay_no, relay_nc | 0.5h |
| P1 | igbt, scr, triac, jfet_n, jfet_p | 1h |
| P1 | ammeter, voltmeter, test_point, no_connect, antenna | 0.5h |
| P2 | voltage_regulator, dc_dc_converter, comparator, schmitt_buffer | 1h |
| P2 | bridge_rectifier, diac, variable_cap, variable_inductor | 0.5h |
| P2 | motor, speaker, microphone, buzzer | 0.5h |
| P2 | generic_ic, 555_timer, ac_source, wattmeter | 0.5h |
| P3 | switch_dpdt, darlington_npn/pnp, inductor_iron/ferrite | 1h |
| P3 | tri_state_buffer, instrumentation_amp, dc_dc_converter | 0.5h |

**Total symbol count (v2): 64 symbols (P0: 19, P1: 24, P2: 14, P3: 7)**
