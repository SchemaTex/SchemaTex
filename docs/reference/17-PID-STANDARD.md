# 11b — Piping & Instrumentation Diagram (P&ID) Standard Reference

*ISA-5.1-2009 Instrumentation Symbols and Identification + ISO 10628-1:2014 Diagrams for the chemical and petrochemical industry + ISA-5.06.01 (digital control). Covers process equipment, piping, valves, in-line elements, instrument bubbles, tag letter codes, signal line types.*

> **Primary References:**
> - ANSI/ISA-5.1-2009: *Instrumentation Symbols and Identification*（美国主流标准，instrument bubbles + tag codes）
> - ISO 10628-1:2014: *Diagrams for the chemical and petrochemical industry — Part 1: General rules*（欧洲/国际 equipment 符号）
> - ISA-5.06.01-2007: *Functional Requirements Documentation for Control Software Applications*
> - PIP PIC001: Piping & Instrumentation Diagram Documentation Criteria（行业补充）

**Positioning:** P&ID 是化工/石化/制药/水处理/发电项目的**工程交付物**，受 OSHA PSM / EPA RMP / 保险审计约束。目前没有任何 JS 库按 ISA-5.1 正确渲染 P&ID（draw.io 有 stencil 但无 DSL，Lucidchart 闭源）。Schematex 目标：以 DSL 描述 P&ID 并按 ISA-5.1 合规渲染，面向过程工程师 + 安全工程师 + AI-assisted design review。

**与 SLD 的关系：** P&ID 和 SLD（§11）在布局思路上同源（top-down / L-R 流向 + 设备符号 + 仪表标签），Schematex 可复用 §11 的 voltage-hierarchy 布局引擎的通用部分（`src/diagrams/sld/layout.ts`），但 symbol 集完全独立（ISA vs IEEE 315）。

---

## 1. Equipment Symbol Set (ISO 10628 / ISA-5.1 Annex)

所有 equipment 符号基于 **120×100px 归一化 bbox**，具体尺寸因类型而异；所有符号默认有 **top / bottom / left / right** 四端 anchor（connection point）供 pipe 路由。

### 1.1 Pumps

| Type | 形状 | SVG 关键几何 |
|------|------|------------|
| **Centrifugal pump** | 圆 + 右侧三角出口 | `<circle r=25/>` + `<polygon points="25,-20 50,0 25,20"/>` |
| **Positive displacement (gear)** | 圆 + 内部两个相切小圆 | circle + 双 gear 圆 |
| **Reciprocating pump** | 圆 + 内部矩形活塞 | circle + rect |
| **Vacuum pump** | 圆 + `V` 标签 | circle + text |
| **Submersible pump** | 圆 + 上方垂直矩形轴 | circle + rect above |

连接点：入口左（suction），出口右或右上（discharge）。

### 1.2 Compressors & Turbines

| Type | 形状 |
|------|------|
| **Centrifugal compressor** | 梯形（左窄右宽） |
| **Axial compressor** | 梯形 + 内部斜线（表示 blade） |
| **Reciprocating compressor** | 矩形 + 双圆柱（activator） |
| **Turbine** | 梯形（左宽右窄，与 compressor 镜像） |
| **Blower / Fan** | 圆 + 内部三叶螺旋桨 |

### 1.3 Heat Exchangers

| Type | 形状 | 符号说明 |
|------|------|---------|
| **Shell & tube** | 圆柱体（横向） + 内部 tube bundle（水平线） | 4 connection points（shell in/out + tube in/out） |
| **Plate & frame** | 长矩形 + 内部密集竖线 | 2 + 2 connection points |
| **Double-pipe** | 两条同心圆柱 | 4 connection points |
| **Air-cooled (fin-fan)** | 矩形 + 顶部圆（fan） | top fan + 2 tube ports |
| **Reboiler / Kettle** | 横圆柱 + 底部开口 | connects to column底部 |
| **Condenser** | Shell & tube 水平 + 倾斜角度 | 区分加热/冷却方向 |

### 1.4 Vessels & Tanks

| Type | 形状 |
|------|------|
| **Vertical vessel** | 竖长圆柱 + 半球 top/bottom（2:1 elliptical heads） |
| **Horizontal vessel** | 横长圆柱 + 半球 caps |
| **Sphere** | 正圆（存储 LPG / ammonia） |
| **Atmospheric tank** | 矩形 + 顶部圆拱（dome roof） |
| **Floating roof tank** | 矩形 + 顶部内嵌矩形（浮顶） |
| **Cone-roof tank** | 矩形 + 三角顶 |
| **Open-top tank** | 矩形（顶部无封闭） |
| **Silo / hopper** | 矩形 + 底部倒三角 |

Nozzle annotations（N1, N2, ...）沿 vessel 边界点放置。

### 1.5 Columns (Distillation / Absorption)

| Type | 形状 | 内部 |
|------|------|------|
| **Tray column** | 高竖圆柱 + 内部水平短线（tray） | 按 tray 数量画水平线 |
| **Packed column** | 高竖圆柱 + 内部交叉阴影（packing） | 阴影填充 |
| **Stripping column** | 同 tray 但 feed 位置不同 | — |

Connection points: feed (左中), top (reflux), bottom (reboiler return), vapor out (top), liquid out (bottom)。

### 1.6 Reactors

| Type | 形状 |
|------|------|
| **Stirred tank reactor (CSTR)** | 圆柱 + 顶部 agitator 符号（竖轴 + 螺旋桨） |
| **Plug flow reactor (PFR)** | 长圆柱 horizontal |
| **Fixed-bed catalytic reactor** | 圆柱 + 内部填充（packed bed pattern） |
| **Fluidized-bed reactor** | 圆柱 + 内部点状模式 |

### 1.7 Other Process Equipment

- **Filter** — 矩形 + 斜线 hatch
- **Cyclone** — 倒锥形 + 顶部圆柱
- **Mixer (static)** — 圆柱 + 内部螺旋符号
- **Conveyor** — 长矩形 + 两端圆（pulley）
- **Cooling tower** — 沙漏形
- **Flare stack** — 高竖线 + 顶部火焰符号

---

## 2. Piping Line Conventions (ISA-5.1 §5)

### 2.1 Line Types

| Line | 用途 | SVG |
|------|------|-----|
| **Major process line** | 主工艺管道 | solid, `stroke-width=2.5` |
| **Minor / auxiliary process line** | 次要工艺 | solid, `stroke-width=1.5` |
| **Pneumatic signal** (ISA-5.1 §5.2) | 气动信号 | solid + 横向斜杠序列（每 30px 一个） |
| **Electric signal** | 电信号 | dashed `stroke-dasharray="6 4"` |
| **Hydraulic signal** | 液压信号 | solid + `L` 短横（每 30px） |
| **Capillary tube** | 毛细管（filled-system 仪表） | solid + 圆点序列（每 15px） |
| **Software / data link** | PLC/DCS 内部信号 | 圆泡点线（`stroke-dasharray="2 4"`）|
| **Mechanical link** | 机械联动 | solid + `×` 标记（每 25px） |
| **Heat-traced line** | 伴热管 | 主管线 + 平行虚线包围 |
| **Jacketed line** | 夹套管 | 双平行线 |
| **Future / existing** | 未来/既有 | Dashed，颜色区分 |

### 2.2 Line Number Tag

每条主 process line 需要 line number tag（按 PIP PIC001 格式）：
```
<size>"-<service>-<sequence>-<spec>
```
例：`4"-PG-101-A1B`（4 英寸 + process gas + line 101 + spec A1B）

渲染：小矩形标签，white fill，置于管线中段，文字黑色 sans-serif 9px。

### 2.3 Junction & Crossing

| 情况 | 视觉 |
|------|------|
| **T-branch (connected)** | 实心圆点，`r=3` |
| **Crossing (not connected)** | 下层管线在交叉处画半圆凸起（jumper） |
| **Reducer (concentric)** | 梯形（左粗右细对称） |
| **Reducer (eccentric)** | 梯形（顶平底斜） |

---

## 3. Valves (In-line Elements)

Valve 符号由**两个相接的三角形**构成（bowtie）作为基础 body，不同 type 通过附加元素区分。

所有 valve 默认 **30×24px bbox**，连接点在 left/right 中线。

### 3.1 Manual Valves

| Type | 附加元素 | SVG 描述 |
|------|---------|---------|
| **Gate** | 无附加 | 基础 bowtie |
| **Globe** | 顶部加小圆 | bowtie + `<circle cx=15 cy=-2 r=4/>` |
| **Ball** | 中心加实心圆 | bowtie + filled circle at center |
| **Butterfly** | 中心竖线 | bowtie + vertical line |
| **Plug** | 中心小梯形 | bowtie + trapezoid |
| **Diaphragm** | 顶部弧形 | bowtie + arc top |
| **Needle** | 中心尖三角 | bowtie + needle triangle |
| **3-way** | 三个三角 T 形 | Y-shaped bowtie |
| **4-way** | 四个三角交叉 | cross-shaped bowtie |

### 3.2 Automatic / Control Valves

所有 automatic valve 都是 **manual valve body + actuator**（置于 valve 上方），通过 actuator 类型区分驱动方式：

| Actuator | 符号 |
|----------|------|
| **Diaphragm (pneumatic)** | 倒拱形 + 顶部弹簧 `∧∧∧` |
| **Piston (pneumatic)** | 矩形 + 内部 `P` |
| **Motor (electric)** | 圆 + 内部 `M` |
| **Solenoid** | 矩形 + 内部 `S` 或对角线 |
| **Manual override** | 顶部小方向盘（圆 + 十字） |
| **Fail position** | 字母标注 `FC`/`FO`/`FL` 在 actuator 侧 |

### 3.3 Safety & Relief Valves

| Type | 形状 | 说明 |
|------|------|------|
| **Pressure relief valve (PSV)** | Valve + 右上角 45° 斜管（出口） + 顶部弹簧 | 弹簧示意 set pressure |
| **Pressure safety valve** | 同 PSV + 多一个 pilot 符号 | — |
| **Rupture disc** | 梯形 + 中间 `—×—` 或斜线 | 一次性 |
| **Vacuum breaker** | Valve + 字母 `V` | — |
| **Breather valve** | PSV + 双出口（压力 + 真空） | — |

### 3.4 Check Valves

| Type | 形状 |
|------|------|
| **Swing check** | Bowtie + 内部向心弧 |
| **Ball check** | Bowtie + 内部圆 |
| **Lift check** | Bowtie + 内部竖线 + 弹簧 |
| **Stop check** | Swing check + top actuator |

流向箭头叠在 valve 附近。

### 3.5 Other In-line Elements

- **Strainer** — 菱形 + 内部网格
- **Filter** — 矩形 + 内部斜线 hatch
- **Orifice plate** — 两条平行竖线 + 短横出口（ISA flow element，缩写 FE）
- **Venturi** — 两个梯形相接（收缩-扩张）
- **Flow nozzle** — 单梯形 + 尖端
- **Flame arrester** — 矩形 + 内部交叉网

---

## 4. Instrumentation Symbols (ISA-5.1 §4 — 核心)

### 4.1 Instrument Bubble (4 Accessibility + 2 Location Categories)

ISA-5.1 规定 instrument 符号为 **圆形 bubble**，根据**位置**（field/control room）和**类型**（discrete/shared/computer/logic）组合为 4×2 变体：

| Location \ Type | Discrete / Analog (one instrument) | Shared Display / Shared Control (DCS/SCADA) |
|---|---|---|
| **Field mounted** | 圆 `r=10`，无横线 | 圆 + 内接六边形 |
| **Main control panel — front** | 圆 + 水平穿线 | 圆 + 内接六边形 + 水平穿线 |
| **Main control panel — rear (aux)** | 圆 + 两条水平穿线 | 圆 + 六边形 + 双穿线 |
| **Local panel mounted** | 圆 + 虚线横线 | 圆 + 六边形 + 虚线横线 |

| Location \ Type | Computer Function | Programmable Logic (PLC) |
|---|---|---|
| **Field mounted** | 圆 + 内接菱形（45°方形） | 圆 + 内接正方形 |
| **Main control panel** | 菱形 + 水平穿线 | 正方形 + 水平穿线 |

**渲染：所有 bubble 直径统一 `r=12`**（便于布局对齐）；内部几何元素按上表插入。

```svg
<!-- Field discrete -->
<g class="lt-inst lt-field-discrete" data-tag="FT-101">
  <circle class="lt-inst-body" r="12"/>
  <text class="lt-inst-tag-letter" y="-2" text-anchor="middle">FT</text>
  <text class="lt-inst-tag-number" y="8" text-anchor="middle">101</text>
</g>

<!-- Control-room shared (DCS) -->
<g class="lt-inst lt-cr-shared" data-tag="FIC-101">
  <circle class="lt-inst-body" r="12"/>
  <polygon class="lt-inst-hex" points="..." />  <!-- hexagon inscribed -->
  <line class="lt-inst-cr-line" x1="-12" y1="0" x2="12" y2="0"/>
  <text>FIC</text><text>101</text>
</g>
```

### 4.2 Tag Letter Codes (ISA-5.1 Table 1)

仪表 tag 由 **首字母（被测变量）+ 后续字母（功能修饰 / 功能）** 组成。

**首字母（被测变量 / 启动变量）**：

| 字母 | 变量 |
|------|------|
| `A` | Analysis |
| `B` | Burner / combustion |
| `C` | User's choice |
| `D` | User's choice |
| `E` | Voltage |
| `F` | Flow rate |
| `G` | User's choice |
| `H` | Hand |
| `I` | Current |
| `J` | Power |
| `K` | Time / time schedule |
| `L` | Level |
| `M` | User's choice |
| `N` | User's choice |
| `O` | User's choice |
| `P` | Pressure / vacuum |
| `Q` | Quantity |
| `R` | Radiation |
| `S` | Speed / frequency |
| `T` | Temperature |
| `U` | Multivariable |
| `V` | Vibration / mechanical analysis |
| `W` | Weight / force |
| `X` | Unclassified |
| `Y` | Event, state, presence |
| `Z` | Position / dimension |

**后续字母（修饰符）**: `D`=differential, `F`=ratio, `M`=momentary, `K`=rate of change, `Q`=integrate, `S`=safety

**后续字母（功能）**: `I`=indicator, `R`=recorder, `C`=controller, `T`=transmitter, `E`=sensor/element, `V`=valve, `Y`=relay/converter, `Z`=driver, `A`=alarm, `S`=switch, `L`=lower (modifier on alarm/switch), `H`=higher

**组合示例**：
- `FT-101` = Flow Transmitter, loop 101
- `LIC-203` = Level Indicating Controller, loop 203
- `PSH-305` = Pressure Switch High, loop 305
- `TAHH-401` = Temperature Alarm High High, loop 401
- `FIQ-507` = Flow Indicator totalizing (Quantity), loop 507
- `PDT-612` = Pressure Differential Transmitter, loop 612

### 4.3 Signal Line Between Instruments

见 §2.1 line types — instrument signals 永远用 non-process line types（pneumatic / electric / capillary / software），主 process line 不能用作 signal。

### 4.4 Function Block Diagram (ISA-5.1 §6)

Control loop 可选展开为 function block：
- `Σ` summer (加法器)
- `Δ` subtractor
- `∫` integrator
- `PID` controller block
- `f(x)` function generator
- `LS` low selector / `HS` high selector
- `√` square root extractor

渲染为方形 block + 内部符号。

### 4.5 Interlock & Logic (ISA-5.06)

- **Interlock diamond** — 菱形内写 `I-###`（interlock number）
- **Permissive** — 圆内写 `P-###`
- **Logic gate overlay** — 仪表 loop 中可嵌入 logic gate（参考 §07-LOGIC-GATE-STANDARD.md）

---

## 5. Layout Conventions

### 5.1 Flow Direction

- **主工艺流向**: 左 → 右（feed 进入在最左，product 在最右）
- **辅助流**（utility, vent, drain）: 自上而下或自下而上接入
- **Control loops**: 仪表 bubble 置于其测量设备**附近**，signal 线连到 actuator（不必走 process pipe）

### 5.2 Equipment Placement

- **Vertical equipment**（columns, reactors）: 垂直方向占比大，在布局中独占一个 "column"
- **Horizontal equipment**（exchangers, pumps）: 沿 process flow 排列
- **Equipment tag**（如 `P-101A/B`, `V-201`）: 置于设备上方或内部

### 5.3 Instrument Placement

- **Primary element** (e.g. FE orifice) 在管线上
- **Transmitter** (FT) 通过 capillary / pneumatic / electric line 连到 primary element
- **Controller** (FIC) 位置取决于 location category：field / control room / local panel
- **Control valve** 在管线上，actuator 通过 signal 线连到 controller

### 5.4 Layout Algorithm

1. **Equipment layer**: 将 equipment 按 process flow 拓扑排序分层（参考 logic gate DAG 布局）
2. **Pipe routing**: Manhattan routing，主 process line 优先直线
3. **Instrument overlay**: 仪表 bubble 置于相关 equipment/pipe 的 attach point 附近（offset 30-50px）
4. **Signal line routing**: 独立于 pipe routing，用不同 line types 区分
5. **Tag placement**: 设备 tag 置于上方或内部；line tag 置于管线中段；instrument tag 在 bubble 内部

---

## 6. DSL Grammar (P&ID)

```ebnf
document    = header statement*
header      = "pid" quoted_string? props? NEWLINE
props       = "[" prop ("," prop)* "]"
prop        = "direction:" ("LR" | "TB")
            | "units:" ("imperial" | "metric")

statement   = comment
            | equipment_def
            | line_def
            | instrument_def
            | note_def

comment     = "#" [^\n]* NEWLINE

equipment_def = "equip" IDENT ":" equip_type attr_list? NEWLINE
equip_type    = "pump" | "pump_centrifugal" | "pump_pd" | "pump_reciprocating"
              | "compressor" | "turbine" | "blower"
              | "hx_shell_tube" | "hx_plate" | "hx_air_cooled" | "reboiler" | "condenser"
              | "vessel_v" | "vessel_h" | "sphere"
              | "tank_atm" | "tank_floating_roof" | "tank_cone_roof" | "silo"
              | "column_tray" | "column_packed"
              | "reactor_cstr" | "reactor_pfr" | "reactor_fixed_bed"
              | "filter" | "cyclone" | "mixer" | "cooling_tower" | "flare"

attr_list   = "[" attr ("," attr)* "]"
attr        = IDENT ":" attr_value
attr_value  = quoted_string | number | IDENT

line_def    = "line" IDENT "from" anchor "to" anchor line_attrs? NEWLINE
anchor      = IDENT ("." IDENT)?                # equipment.port, e.g. P-101.out
line_attrs  = "[" ("size:" quoted_string
                 | "service:" IDENT
                 | "type:" line_type
                 | "tag:" quoted_string)+ "]"
line_type   = "process" | "process_minor" | "pneumatic" | "electric"
            | "hydraulic" | "capillary" | "software" | "mechanical"
            | "heat_traced" | "jacketed"

instrument_def = "inst" tag ":" inst_category attr_list? NEWLINE
                 ("measures" anchor)?
                 ("controls" IDENT)?             # target valve tag
tag           = letter_code "-" INT              # e.g., FIC-101
letter_code   = /[A-Z]{2,5}/
inst_category = "field_discrete" | "field_shared" | "field_computer" | "field_plc"
              | "cr_discrete" | "cr_shared" | "cr_computer" | "cr_plc"
              | "local_discrete" | "local_shared"

note_def      = "note" IDENT ":" /[^\n]+/ NEWLINE

IDENT         = /[A-Za-z][A-Za-z0-9_\-]*/
INT           = /[0-9]+/
quoted_string = '"' /[^"]*/ '"'
NEWLINE       = /\n/
```

### Valve as in-line equipment

Valve 作为 equipment 的子类型（因为它在管线上）：

```
equip V-101 : valve_gate
equip V-102 : valve_control [actuator: "diaphragm", fail: "FC"]
equip V-103 : valve_psv [set_pressure: "150 psig"]
```

---

## 7. DSL Examples

### 7.1 Minimal — Pump with Control Loop

```
pid "Pump with Flow Control"

equip T-101 : tank_atm [tag: "Feed Tank"]
equip P-101 : pump_centrifugal
equip V-101 : valve_control [actuator: "diaphragm", fail: "FC"]
equip FE-101 : filter
equip V-100 : valve_gate

line L1 from T-101.bottom to P-101.in [size: "4\"", service: "water", type: "process"]
line L2 from P-101.out to V-101.in [size: "4\"", service: "water", type: "process"]
line L3 from V-101.out to FE-101.in [size: "4\"", type: "process"]

inst FT-101 : field_discrete
  measures L2
inst FIC-101 : cr_shared
  controls V-101

# signal lines
line s1 from FT-101 to FIC-101 [type: "electric"]
line s2 from FIC-101 to V-101 [type: "pneumatic"]
```

### 7.2 Distillation Column with Reboiler & Condenser

```
pid "Distillation T-201"

equip T-201 : column_tray [trays: 20, tag: "Stripper"]
equip E-201 : hx_shell_tube [tag: "Overhead Condenser"]
equip E-202 : reboiler [tag: "Reboiler"]
equip D-201 : vessel_h [tag: "Reflux Drum"]
equip P-201 : pump_centrifugal [tag: "Reflux Pump"]

line LF from feed to T-201.feed [size: "6\"", service: "hydrocarbon"]
line LOV from T-201.top to E-201.shell_in [size: "8\""]
line LC from E-201.shell_out to D-201.in [size: "8\""]
line LR from D-201.bottom to P-201.in
line LRL from P-201.out to T-201.reflux [size: "3\""]
line LBT from T-201.bottom to E-202.in
line LBR from E-202.out to T-201.bottom_return

inst TIC-201 : cr_shared
  measures T-201
  controls V-202
inst PT-201 : field_discrete
  measures LOV
inst LIC-201 : cr_shared
  measures D-201
```

### 7.3 Safety Interlock (ISA-5.06)

```
pid "High-Pressure Shutdown"

equip V-301 : vessel_v
equip V-302 : valve_control [fail: "FC"]
equip V-303 : valve_psv [set_pressure: "200 psig"]

inst PT-301 : field_discrete
  measures V-301
inst PSHH-301 : field_discrete   # pressure switch high high
  measures V-301
inst I-301 : interlock

line s1 from PT-301 to PSHH-301 [type: "electric"]
line s2 from PSHH-301 to I-301 [type: "electric"]
line s3 from I-301 to V-302 [type: "electric"]
```

---

## 8. SVG Structure

```xml
<svg class="lt-pid" data-diagram-type="pid">
  <defs>
    <style>
      /* Equipment */
      .lt-pid-equip      { fill: white; stroke: #222; stroke-width: 2; }
      .lt-pid-equip-tag  { font: bold 10px sans-serif; fill: #222; }

      /* Piping */
      .lt-pid-process      { stroke: #222; stroke-width: 2.5; fill: none; }
      .lt-pid-process-min  { stroke: #222; stroke-width: 1.5; fill: none; }
      .lt-pid-pneumatic    { stroke: #333; stroke-width: 1.5; fill: none; }
      .lt-pid-electric     { stroke: #333; stroke-width: 1.5; fill: none;
                             stroke-dasharray: 6 4; }
      .lt-pid-capillary    { stroke: #333; stroke-width: 1.5; fill: none;
                             stroke-dasharray: 2 6; stroke-linecap: round; }
      .lt-pid-software     { stroke: #666; stroke-width: 1.5; fill: none;
                             stroke-dasharray: 2 4; }

      /* Valves */
      .lt-pid-valve-body   { fill: white; stroke: #222; stroke-width: 1.5; }
      .lt-pid-actuator     { fill: white; stroke: #222; stroke-width: 1.5; }

      /* Instrument bubbles */
      .lt-inst-body        { fill: white; stroke: #222; stroke-width: 1.5; }
      .lt-inst-tag         { font: 9px sans-serif; fill: #222; text-anchor: middle; }
      .lt-inst-cr-line     { stroke: #222; stroke-width: 1; }
      .lt-inst-local-line  { stroke: #222; stroke-width: 1; stroke-dasharray: 2 2; }

      /* Tags */
      .lt-pid-line-tag     { fill: white; stroke: #222; stroke-width: 0.5; }
      .lt-pid-line-tag-text{ font: 9px sans-serif; fill: #222; }

      /* Junctions */
      .lt-pid-junction     { fill: #222; }
    </style>

    <!-- Pneumatic signal hatch pattern: parallel diagonal slashes -->
    <pattern id="pneumatic-hatch" x="0" y="0" width="30" height="8"
             patternUnits="userSpaceOnUse">
      <line x1="0" y1="8" x2="8" y2="0" stroke="#333" stroke-width="1.5"/>
    </pattern>
  </defs>

  <title>P&amp;ID — [name]</title>
  <desc>[description]</desc>

  <g id="lt-pid-equipment">
    <g class="lt-pid-equip" data-id="P-101" data-type="pump_centrifugal"
       transform="translate(x,y)">
      <!-- pump SVG -->
    </g>
  </g>

  <g id="lt-pid-lines">
    <path class="lt-pid-process" d="M x1,y1 L x2,y2"
          data-line-id="L1" data-service="water"/>
    <g class="lt-pid-line-tag" transform="translate(x,y)">
      <rect ...><text>4"-PG-101-A1B</text>
    </g>
  </g>

  <g id="lt-pid-valves">
    <g class="lt-pid-valve" data-id="V-101" data-kind="control"
       transform="translate(x,y) rotate(a)">
      <!-- bowtie body + actuator -->
    </g>
  </g>

  <g id="lt-pid-instruments">
    <g class="lt-inst" data-tag="FT-101" data-category="field_discrete"
       transform="translate(x,y)">
      <circle class="lt-inst-body" r="12"/>
      <text class="lt-inst-tag" y="-2">FT</text>
      <text class="lt-inst-tag" y="8">101</text>
    </g>
  </g>

  <g id="lt-pid-signals">
    <!-- instrument-to-instrument signal lines -->
  </g>
</svg>
```

---

## 9. Test Cases

### Case 1: Single Pump + Tank
```
pid
equip T-1 : tank_atm
equip P-1 : pump_centrifugal
line L1 from T-1.bottom to P-1.in [size: "2\""]
line L2 from P-1.out to dest [size: "2\""]
```
验证：tank 顶部 dome，pump 圆+右侧三角，管线 solid 粗线。

### Case 2: Control Loop
```
pid
equip V-1 : valve_control [actuator: "diaphragm", fail: "FC"]
inst FT-1 : field_discrete
inst FIC-1 : cr_shared
  controls V-1
line s1 from FT-1 to FIC-1 [type: "electric"]
line s2 from FIC-1 to V-1 [type: "pneumatic"]
```
验证：FT 圆无线，FIC 圆带中线；electric 虚线、pneumatic 斜杠线；FC 标注在 actuator 旁。

### Case 3: Safety Valve
```
pid
equip V-R : valve_psv [set_pressure: "150 psig"]
```
验证：bowtie + 右上 45° 出口 + 顶部弹簧；set pressure 标签在旁。

### Case 4: Shell & Tube HX with 4 nozzles
```
pid
equip E-1 : hx_shell_tube
```
验证：水平圆柱 + 内部 tube bundle 水平线 + 4 个连接端口（shell in/out top/bottom, tube in/out left/right）。

### Case 5: Distillation Column (20 trays)
```
pid
equip T-1 : column_tray [trays: 20]
```
验证：高竖圆柱 + 20 条等距水平 tray 线；top/bottom/feed 三个连接点可用。

### Case 6: All 4 Instrument Categories
```
pid
inst FT-101 : field_discrete
inst FIC-102 : cr_shared
inst FY-103 : cr_computer
inst FZ-104 : cr_plc
```
验证：圆、圆+穿线、菱形+穿线、方形+穿线，4 种几何清晰可辨。

### Case 7: All Line Types
```
pid
line a from A to B [type: "process"]
line b from A to B [type: "pneumatic"]
line c from A to B [type: "electric"]
line d from A to B [type: "capillary"]
line e from A to B [type: "software"]
```
验证：5 种 line types 渲染差异 CSS class 和 dash pattern。

### Case 8: Line Tag
```
pid
line L-101 from T-1 to P-1 [size: "4\"", service: "PG", tag: "4\"-PG-101-A1B"]
```
验证：line 中段有 white rect 标签，文字 `4"-PG-101-A1B`。

---

## 10. Implementation Priority

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (MVP) | 5 基础 equipment (pump, vessel_v, tank, hx_shell_tube, column_tray) | Medium | Core |
| P0 | 4 基础 valve (gate, globe, ball, check) + control valve 基础 | Medium | Core |
| P0 | 4 instrument bubble 变体 (field_discrete, cr_shared, cr_computer, cr_plc) | Medium | Core — ISA 核心 |
| P0 | Tag letter code parsing + bubble label 渲染 | Low | Core |
| P0 | Process line (major/minor) + Manhattan routing | Medium | Core |
| P0 | Electric / pneumatic signal line 区分 | Low | Core |
| P1 | 追加 equipment (compressor, reactor_cstr, reboiler, filter) | Medium | High |
| P1 | 剩余 valve (butterfly, plug, 3-way, PSV, rupture disc) | Medium | High |
| P1 | Actuator 细节 (diaphragm, piston, motor, solenoid) + fail position | Medium | High |
| P1 | Line tag (`4"-PG-101-A1B`) 渲染 | Low | High |
| P1 | Capillary + software line types | Low | Medium |
| P2 | 剩余 instrument 位置类别 (main cr front/rear, local panel) | Medium | Medium |
| P2 | Interlock diamond + permissive circle | Low | Medium |
| P2 | Function block (Σ, PID, f(x), selectors) | Medium | Medium |
| P2 | Nozzle annotation on vessels | Medium | Medium |
| P2 | Specialty equipment (cyclone, sphere, flare, cooling tower) | High | Low-Medium |
| P3 | Heat-traced / jacketed line rendering | Medium | Low |
| P3 | Reducer (concentric / eccentric) in-line | Low | Low |
| P3 | Logic gate overlay in instrument loop | Medium | Low |

---

## 11. 与 SLD 的布局复用

P&ID 和 SLD（§11）共享以下布局算法基元（`src/diagrams/sld/layout.ts` 部分可 extract 到 `src/core/layout-utils.ts`）：

- **Top-down equipment hierarchy layering**（SLD 用 voltage level，P&ID 用 process stage）
- **Vertical bus / horizontal rail alignment**（SLD bus vs P&ID main header）
- **Manhattan routing with crossing detection**
- **Symbol anchor / connection point model**

但以下**不共享**，各自独立：
- Symbol 集（ISA-5.1 vs IEEE 315）
- Tag code parsing（ISA loop number vs ANSI device number）
- Line type 语义（process/signal 类型 vs voltage level）
- Accessory 放置（instrument bubble vs relay label）

---

## 12. 开发工作量估计

- **P0 MVP**: ~40-50 个 SVG 符号 + parser + layout + renderer ≈ 120-160h
- **P1**: ~30 个追加符号 + actuator + line tag ≈ 60-80h
- **P2**: ~20 个符号 + interlock + function block ≈ 40-60h
- **合计完整实现**: 220-300h（比 SLD 多约 1.5×，比 circuit 少约 0.7×）

**建议切入方式**：先做 P0 覆盖**一个典型 control loop**（tank + pump + control valve + FT/FIC/FE）的完整 P&ID，拿到职业工程师反馈后再迭代 P1/P2。不要一口气实现所有符号——工程师对"不准确的符号"比"缺失的符号"容忍度更低。
