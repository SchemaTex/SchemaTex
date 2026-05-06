# 23 — Function Block Diagram (FBD) Standard Reference

*IEC 61131-3:2013 Function Block Diagram language. Boxes (function blocks) wired through named ports, evaluated in declared / data-flow order. Sister language to LD (ladder, §10) and SFC (§24); together these three form the visual half of IEC 61131-3.*

> **Primary References:**
> - **IEC 61131-3:2013** — *Programmable controllers, Part 3: Programming languages*. §6.4 *Function Block Diagram (FBD) language* defines the graphical conventions; §2.5 defines the **standard function block library**.
> - **IEC 60617-12:1997** — Graphical symbols for diagrams, Part 12: Binary logic elements (AND, OR, XOR, etc. — shared with logic-gate diagrams, §07).
> - **PLCopen** — Industry consortium maintaining the IEC 61131-3 reference symbol shapes (https://plcopen.org).
> - **Allen-Bradley (Rockwell) Studio 5000** — North American FBD conventions: same symbol library, named-instance tagging, EN/ENO power-flow rails.
> - **Siemens TIA Portal (SCL/FBD)** — European FBD conventions: identical symbols, slightly different tag prefix conventions (`#var` for instance-local).
> - **OPC UA Companion Specification for IEC 61131-3** — function-block instance metadata for runtime introspection.

**Positioning:** FBD is, after LD, the **second-most-drawn IEC 61131-3 language** in production PLC code (rough industry split: LD ~45%, FBD ~35%, SFC ~10%, ST ~10%). Existing tools (Studio 5000, TIA Portal, CODESYS) own FBD authoring inside vendor IDEs; **no good open-source DSL exists**. Schematex covers the same ground as the vendor tools, browser-renderable, with a text DSL designed for AI generation.

**Relation to existing schematex engines:**
- `logic` (§07, logic gates IEEE 91 / IEC 60617-12) — covers the pure-Boolean subset (AND/OR/NOT/NAND/NOR/XOR/XNOR/BUF). FBD is a **superset**: it adds timers, counters, math, comparison, selection, instance-tracked function blocks, and the EN/ENO power-flow convention.
- `block` (§09, control-systems block diagram) — structurally similar (named-port boxes wired together) but semantically a **continuous-time control system** (transfer functions, summing junctions, integrators). FBD is **discrete cyclic execution** (every PLC scan).
- `circuit` (§08, electrical schematic) — shares the named-port + wires topology pattern. FBD layout reuses ~50% of `logic`/`block` layout primitives.

**Differentiation from `logic`:**

| Feature | `logic` (§07) | `fbd` (this doc) |
|---|---|---|
| Boolean gates (AND/OR/NOT/NAND/NOR/XOR/XNOR/BUF) | ✅ | ✅ (same shapes) |
| EN / ENO power-flow ports | ❌ | ✅ (IEC 61131-3 §6.4.4) |
| Timer blocks (TON/TOF/TP/RTO) | ❌ | ✅ |
| Counter blocks (CTU/CTD/CTUD) | ❌ | ✅ |
| Math blocks (ADD/SUB/MUL/DIV/MOD/MOVE/...) | ❌ | ✅ |
| Comparison blocks (EQ/NE/GT/GE/LT/LE) | ❌ | ✅ |
| Selection blocks (SEL/MUX/MIN/MAX/LIMIT) | ❌ | ✅ |
| User-defined function blocks (instance tags) | ❌ | ✅ |
| Negation bubble on any input/output port | partial | ✅ (any port) |
| Connector / page-link (cross-page wires) | ❌ | ✅ |
| Inline constants (`5`, `T#10s`, `100`) on input ports | ❌ | ✅ |

`logic` stays as the simpler, gate-focused engine for digital logic teaching and combinational design. `fbd` is the engineering tool for live PLC programming.

---

## 1. Structure & Layout

### 1.1 Overall Diagram Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────┐                  ┌──────┐                        │
│   │ AND  │                  │ TON  │                        │
│   │      │      ┌──────┐    │      │      ┌──────────┐      │
│   │ IN1 ─┤  ┌───┤ OR   │    │ IN ──┼──────┤ MotorOut │      │
│   │ IN2 ─┤──┘   │      │    │ PT  ─┤T#5s  └──────────┘      │
│   │  Q ──┼──────┤ IN1  │    │  Q ──┘                        │
│   └──────┘      │ IN2 ─┤    │  ET                           │
│                 │  Q  ─┤────┘                               │
│                 └──────┘                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
   network 1 — Motor start latch + 5-second hold
```

A **network** (also called a *rung* in the Studio 5000 dialect, or *FBD-Sheet* in TIA Portal) is one independent piece of data flow — left-to-right by convention, evaluated top-to-bottom across networks per scan. Each network is one tracked entity (with optional title, comment, execution-order index).

### 1.2 Layout Dimensions

| Parameter | Default | Meaning |
|---|---|---|
| `block_min_width` | 60px | Minimum width of any function block body |
| `block_min_height` | 40px | Minimum height (header + 1 input row) |
| `port_pitch` | 18px | Vertical spacing between ports on the same block side |
| `port_stub_length` | 12px | Wire stub from block edge to first wire bend |
| `block_padding_x` | 8px | Inside-block padding (port label inset) |
| `block_padding_y` | 6px | Inside-block padding (top/bottom) |
| `block_header_h` | 18px | Block-name header bar height |
| `network_gap_y` | 32px | Vertical gap between networks |
| `network_padding` | 16px | Network frame inner padding |
| `wire_grid` | 10px | Manhattan routing snap |
| `wire_min_clearance` | 8px | Minimum wire-to-block distance |
| `negation_bubble_r` | 4px | Radius of port-negation circle |
| `power_rail_x` | 0 | EN / ENO left rail x (only when ENed networks present) |

---

## 2. Function Block Symbol Set

All blocks are rectangular with a **header bar** (block name) on top, **input ports on the left**, **output ports on the right**, evaluated **left to right**. Ports are named per IEC 61131-3 §2.5.1 standard names (uppercase, max 8 chars typically).

### 2.1 Boolean Logic Blocks (IEC 61131-3 §2.5.1.5)

These are the same shapes as `logic` (§07), but rendered as IEC-style rectangles by default with an internal symbol (≥1, =1, ...) per IEC 60617-12.

| Block name | IEC symbol | Inputs | Outputs | Notes |
|---|---|---|---|---|
| `AND` | `&` | IN1..INn (≥2) | OUT | Schematex default n=2; `inputs=N` attr extends |
| `OR` | `≥1` | IN1..INn | OUT | |
| `NOT` | `1` (with output bubble) | IN | OUT | Single-input |
| `NAND` | `&` (with output bubble) | IN1..INn | OUT | |
| `NOR` | `≥1` (with output bubble) | IN1..INn | OUT | |
| `XOR` | `=1` | IN1, IN2 | OUT | Always 2-input |
| `XNOR` | `=1` (with output bubble) | IN1, IN2 | OUT | |

**ANSI/IEEE 91 distinctive shape** is also accepted via `[shape: ansi]` header attr (matches `logic` engine output).

### 2.2 Edge Detectors (IEC 61131-3 §2.5.1.5.4)

| Block | Symbol | Pins | Notes |
|---|---|---|---|
| `R_TRIG` | `R_TRIG` text | CLK → Q | Rising-edge: Q is true for one scan after CLK rises |
| `F_TRIG` | `F_TRIG` text | CLK → Q | Falling-edge: same on falling |

### 2.3 Bistable / Latch Blocks (IEC 61131-3 §2.5.2.1.1)

| Block | Pins | Behavior |
|---|---|---|
| `SR` | S1, R → Q1 | Set-dominant: S1 wins when both are true |
| `RS` | S, R1 → Q1 | Reset-dominant: R1 wins when both are true |

Header label is `SR` or `RS`; priority pin is suffixed `1`.

### 2.4 Timer Blocks (IEC 61131-3 §2.5.2.2)

All timers have a **TIME-typed PT input** (preset, e.g. `T#5s`) and a **TIME-typed ET output** (elapsed). Output `Q` is BOOL.

| Block | Pins | Behavior |
|---|---|---|
| `TON` | IN, PT → Q, ET | On-delay: Q goes true PT after IN goes true |
| `TOF` | IN, PT → Q, ET | Off-delay: Q stays true PT after IN goes false |
| `TP` | IN, PT → Q, ET | Pulse: Q true for exactly PT after rising edge of IN |
| `RTO` (vendor extension) | IN, PT, RES → Q, ET | Retentive on-delay (Studio 5000) |

PT values use **IEC 61131 duration literals**: `T#10ms`, `T#5s`, `T#3m20s`, `T#1h`. Schematex parses these as opaque string values for display.

### 2.5 Counter Blocks (IEC 61131-3 §2.5.2.3)

| Block | Pins | Behavior |
|---|---|---|
| `CTU` | CU, R, PV → Q, CV | Up-counter; Q=true when CV≥PV |
| `CTD` | CD, LD, PV → Q, CV | Down-counter; Q=true when CV≤0 |
| `CTUD` | CU, CD, R, LD, PV → QU, QD, CV | Bidirectional |

### 2.6 Numeric Function Blocks (IEC 61131-3 §2.5.1.4)

These are **functions** (stateless), not function blocks (stateful), but render identically.

| Block | Pins | Notes |
|---|---|---|
| `ADD` / `SUB` / `MUL` / `DIV` / `MOD` | IN1..INn → OUT | n=2 default; ADD/MUL accept up to 8 inputs per spec |
| `ABS`, `SQRT`, `LN`, `LOG`, `EXP` | IN → OUT | Single-input math |
| `SIN`, `COS`, `TAN`, `ASIN`, `ACOS`, `ATAN` | IN → OUT | Trigonometry |
| `MOVE` | EN, IN → ENO, OUT | Assignment with conditional EN |
| `NEG` | IN → OUT | Unary minus |

### 2.7 Comparison Blocks (IEC 61131-3 §2.5.1.5.7)

| Block | Pins | Returns |
|---|---|---|
| `EQ`, `NE`, `GT`, `GE`, `LT`, `LE` | IN1, IN2 → OUT | BOOL |

`EQ` and `NE` may take more than 2 inputs (chained equality / pairwise inequality per §2.5.1.5.7).

### 2.8 Selection Blocks (IEC 61131-3 §2.5.1.5.6)

| Block | Pins | Behavior |
|---|---|---|
| `SEL` | G, IN0, IN1 → OUT | Boolean multiplexer: OUT = G ? IN1 : IN0 |
| `MUX` | K, IN0..INn → OUT | K-indexed multiplexer (K is INT) |
| `MAX` / `MIN` | IN1..INn → OUT | Numeric max / min |
| `LIMIT` | MN, IN, MX → OUT | Clamp IN to [MN, MX] |

### 2.9 Bit-String Blocks (IEC 61131-3 §2.5.1.5.4)

| Block | Pins | Notes |
|---|---|---|
| `SHL`, `SHR` | IN, N → OUT | Logical shift left / right |
| `ROL`, `ROR` | IN, N → OUT | Rotate left / right |
| `AND_BIT`, `OR_BIT`, `XOR_BIT`, `NOT_BIT` | IN1..INn → OUT | Bitwise |

(`AND` etc. without `_BIT` are reserved for the BOOL versions.)

### 2.10 User-Defined Function Blocks

User blocks render as plain rectangles with **the type name in the header** and **the instance name above the header bar** (or inside if rendered in “compact” mode).

```
       MyMotorCtrl     ← instance tag
      ┌──────────┐
      │  Motor   │     ← block type
      ├──────────┤
   ───┤ Start    Run├──── ← input on left, output on right
   ───┤ Stop  Fault├────
      │       Speed├────
      └──────────┘
```

Instance tag rendering convention: instance name above header, italicized; type name in header bar; ports declared via `pins_in=` and `pins_out=` attrs (similar to `circuit` `generic_ic`).

### 2.11 EN / ENO Power-Flow Ports (IEC 61131-3 §6.4.4)

Any function block may carry **`EN`** (enable input) and **`ENO`** (enable output). These render as the **topmost-left input** and **topmost-right output**, on a horizontal "power flow" rail at the top of each network. EN/ENO is optional per block; the parser accepts `en=true` to enable rendering.

```
power rail ━━━━┳━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━ rail end
              EN       EN          EN
            ┌─────┐  ┌─────┐    ┌─────┐
            │ MOV │  │ ADD │    │ TON │  ...
```

When EN/ENO is rendered, FBD networks gain a **left/right power rail** like ladder logic, except the rail carries enable propagation rather than power.

### 2.12 Negation Bubbles

Any port (input or output) may have a **negation bubble** (small unfilled circle, `r=4px`) on its outer end. This represents a single-bit inversion of the signal at that port — equivalent to placing a `NOT` block on that wire, but rendered inline.

```
   IN ───●┤ AND ├───── OUT
                 ●     (output negation = NAND equivalent)
```

DSL syntax: `~varName` on the wire endpoint, e.g. `MyAnd.IN1 = ~Switch1`.

---

## 3. Wires & Connections

### 3.1 Wire Types (IEC 61131-3 §6.4.3)

Each wire carries a **declared data type** (BOOL, INT, REAL, TIME, ...). Schematex infers the type from the source port; mismatches at sinks are a parse error.

| Wire data type | Render style |
|---|---|
| `BOOL` | Solid black, 1.5px |
| `INT` / `DINT` / `UINT` / `UDINT` | Solid blue, 1.5px |
| `REAL` / `LREAL` | Solid orange, 1.5px |
| `TIME` / `DATE` / `TOD` | Solid magenta, 1.5px |
| `STRING` / `WSTRING` | Solid green, 1.5px |
| `BYTE` / `WORD` / `DWORD` (bit strings) | Dashed black `5 3` |
| Power flow (EN/ENO) | Bold black 2.5px (rendered as the rail) |

Color coding follows TIA Portal default conventions (closest to a de-facto standard); themable.

### 3.2 Junction Nodes (Fan-out)

A wire fanning out to multiple sinks renders a **filled circle** at the branch point (like circuit junctions, §08).

### 3.3 Inline Constants

Input ports may take inline constants instead of wire connections:

```
TON.PT = T#10s          ← time constant, no wire
ADD.IN2 = 5             ← integer constant
SEL.G = TRUE            ← boolean constant
```

The constant renders as a **boxed text** to the left of the input port, no wire stub.

### 3.4 Connectors (Page Links)

For wires that span pages or are otherwise hard to draw inline, IEC 61131-3 §6.4.3 defines **labeled connectors**. Two forms:

```
  ──┤ ConnectorOut┐
  ┌─ ConnectorIn ├──
```

DSL: `connector "TankLevel"` and `connector_in "TankLevel"`. The renderer matches by name and renders both ends without a continuous wire.

### 3.5 Execution Order

FBD evaluation is **data-flow driven**: the output of any block is computed once all its inputs are stable in the current scan. For purely combinational networks this is unambiguous. For networks with feedback (a block's output wired back to its own input), the parser requires an **execution-order index** on every block in the cycle.

DSL: `[order: 1]`, `[order: 2]`, etc. Rendered in the top-right corner of the block as a small superscript number.

---

## 4. Variable Declarations

FBD diagrams typically declare their variables at the top, like ladder. Reuses the same syntax as §10 (ladder).

```
fbd "Motor Control"

var Start: bool
var Stop: bool
var EmergencyStop: bool
var MotorOut: bool
var RunTimer: timer
var CycleCount: counter

network 0 "Start logic":
  ...
```

### 4.1 Variable Scope Annotations (IEC 61131-3 §2.4.3)

Optional scope prefix (defaults to local):

| Scope | Meaning |
|---|---|
| `var_input` | Function-block input parameter |
| `var_output` | Function-block output parameter |
| `var_in_out` | Bidirectional (passed by reference) |
| `var_global` | Globally-scoped tag (PLC tag database) |
| `var_external` | External reference to a global |
| `var` | Local (default) |

```
var_global SystemReady: bool
var Motor1: MotorCtrl                  # instance of user-defined FB
```

---

## 5. DSL Grammar (FBD)

```ebnf
document       = header statement*
header         = "fbd" quoted_string? props? NEWLINE
props          = "[" prop ("," prop)* "]"
prop           = "shape:" ("iec" | "ansi")
               | "rail:" ("on" | "off")           # default off; on draws EN/ENO power rails

statement      = comment | variable_decl | network_def | connector_decl

comment        = "#" [^\n]* NEWLINE

variable_decl  = scope? "var" id ":" data_type ("=" init_value)? NEWLINE
scope          = "var_input" | "var_output" | "var_in_out" | "var_global" | "var_external" | "var"
data_type      = "bool" | "int" | "dint" | "uint" | "udint"
               | "real" | "lreal" | "time" | "date" | "tod"
               | "string" | "wstring"
               | "byte" | "word" | "dword"
               | "timer" | "counter"
               | id                                # user-defined FB type
init_value     = "true" | "false" | INT | FLOAT | TIME_LIT | quoted_string

network_def    = "network" INT? network_label? props? ":" NEWLINE INDENT
                   block_stmt+
                 DEDENT
network_label  = quoted_string
network_props  = "[" ("order:" INT)? "]"

block_stmt     = block_call
               | wire_stmt

block_call     = (instance_id "=")? block_type "(" port_args ")" block_props? NEWLINE
instance_id    = IDENTIFIER                        # user-given instance tag
block_type     = standard_block | id
standard_block = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "BUF"
               | "R_TRIG" | "F_TRIG" | "SR" | "RS"
               | "TON" | "TOF" | "TP" | "RTO"
               | "CTU" | "CTD" | "CTUD"
               | "ADD" | "SUB" | "MUL" | "DIV" | "MOD"
               | "ABS" | "SQRT" | "LN" | "LOG" | "EXP"
               | "SIN" | "COS" | "TAN" | "ASIN" | "ACOS" | "ATAN"
               | "MOVE" | "NEG"
               | "EQ" | "NE" | "GT" | "GE" | "LT" | "LE"
               | "SEL" | "MUX" | "MAX" | "MIN" | "LIMIT"
               | "SHL" | "SHR" | "ROL" | "ROR"
               | "AND_BIT" | "OR_BIT" | "XOR_BIT" | "NOT_BIT"
port_args      = port_arg ("," port_arg)*
port_arg       = (port_name ":")? port_value      # named OR positional
port_name      = IDENTIFIER                        # IN, IN1, CLK, PT, S1, etc.
port_value     = wire_ref | constant | "~" wire_ref
wire_ref       = id ("." id)?                      # var name OR instance.port
constant       = INT | FLOAT | "true" | "false" | TIME_LIT | quoted_string

block_props    = "[" prop_list "]"
prop_list      = block_prop ("," block_prop)*
block_prop     = "en"                              # show EN/ENO ports
               | "order:" INT                      # execution order in feedback cycle
               | "inputs:" INT                     # extend variadic input count
               | "pins_in:" quoted_csv             # for user FBs, declare input ports
               | "pins_out:" quoted_csv

wire_stmt      = wire_ref "=" port_value NEWLINE  # explicit wire (rare; usually auto)

connector_decl = ("connector_out" | "connector_in") quoted_string "=" wire_ref NEWLINE

TIME_LIT       = "T#" /[0-9]+(ms|s|m|h)/+         # e.g. T#10s, T#1m30s
IDENTIFIER     = /[a-zA-Z_][a-zA-Z0-9_]*/
INT            = /[0-9]+/
FLOAT          = /[0-9]+\.[0-9]+/
quoted_string  = '"' /[^"]*/ '"'
quoted_csv     = '"' /[^",]+(,[^",]+)*/ '"'
INDENT         = increase in whitespace
DEDENT         = decrease in whitespace
NEWLINE        = /\n/
```

### 5.1 DSL Example — Motor Start/Stop Latch

```
fbd "Motor Control"

var Start: bool
var Stop: bool
var EmergencyStop: bool
var MotorOut: bool
var Latch: bool

network 0 "Start latch":
  Latch = OR(Start, AND(Latch, ~Stop, ~EmergencyStop))

network 1 "Drive output":
  MotorOut = MOVE(Latch)
```

The `OR(Start, AND(...))` form is **inline functional notation** — a pure expression tree resolves to a chain of standard blocks during parsing. Each named output (left of `=`) becomes an output port wire; each call creates one block.

### 5.2 DSL Example — Equivalent in expanded (instance-named) notation

```
fbd "Motor Control"

var Start: bool
var Stop: bool
var EmergencyStop: bool
var MotorOut: bool
var Latch: bool

network 0 "Start latch":
  AndHold = AND(Latch, ~Stop, ~EmergencyStop)
  Latch   = OR(Start, AndHold.OUT)

network 1 "Drive output":
  MotorOut = MOVE(Latch)
```

Each block has a named instance `AndHold`. Access output via `AndHold.OUT`.

### 5.3 DSL Example — Timer + Counter

```
fbd "Bottle Counter"

var ConveyorRunning: bool
var BottleSensor: bool
var BatchDone: bool
var BottlesInBatch: counter
var DwellTimer: timer

network 0 "Debounce sensor with 50ms dwell":
  Dwell = TON(IN: BottleSensor, PT: T#50ms)

network 1 "Count one bottle on rising edge of debounced signal":
  Pulse = R_TRIG(CLK: Dwell.Q)
  BottlesInBatch = CTU(CU: Pulse.Q, R: BatchDone, PV: 24)

network 2 "Batch done":
  BatchDone = MOVE(BottlesInBatch.Q)
```

### 5.4 DSL Example — Comparison + Selection (PID setpoint range)

```
fbd "Tank Level Setpoint Limiter"

var DesiredSetpoint: real
var SafeSetpoint: real
var Alarm: bool

network 0 "Clamp setpoint to safe range":
  SafeSetpoint = LIMIT(MN: 0.0, IN: DesiredSetpoint, MX: 95.0)

network 1 "Alarm on out-of-range request":
  OutOfRange = OR(LT(DesiredSetpoint, 0.0), GT(DesiredSetpoint, 95.0))
  Alarm = MOVE(OutOfRange.OUT)
```

### 5.5 DSL Example — User-Defined Function Block instance

```
fbd "Pumping Station"

var StartCmd: bool
var StopCmd: bool
var TankLow: bool
var TankHigh: bool
var Pump1: MotorCtrl                          # user-defined FB type
var Pump1Run: bool

network 0 "Pump 1 control":
  Pump1 = MotorCtrl(
    Start: AND(StartCmd, ~TankHigh),
    Stop: OR(StopCmd, TankLow),
    Reset: false
  ) [pins_in: "Start,Stop,Reset", pins_out: "Run,Fault"]
  Pump1Run = MOVE(Pump1.Run)
```

### 5.6 DSL Example — EN / ENO Power Flow

```
fbd "Conditional Math" [rail: on]

var Enable: bool
var X: real
var Y: real
var Result: real
var ResultValid: bool

network 0:
  Mul = MUL(IN1: X, IN2: 2.0) [en]
  Add = ADD(IN1: Mul.OUT, IN2: Y) [en]
  Result      = MOVE(Add.OUT)
  ResultValid = MOVE(Add.ENO)
```

When `rail: on` is set, `[en]` blocks are wired into the top-of-network EN/ENO power rail. Disabled (`Enable=false`) propagates ENO=false, halting the chain.

---

## 6. SVG Structure

```xml
<svg class="lt-fbd" data-diagram-type="fbd">
  <defs>
    <style>
      /* Themable styles — see src/core/theme.ts */
      .lt-fbd-block-body { fill: #ffffff; stroke: #333; stroke-width: 1.5; }
      .lt-fbd-block-header { fill: #f0f0f0; }
      .lt-fbd-block-name { font-family: monospace; font-size: 12px; font-weight: 700; }
      .lt-fbd-port-label { font-family: monospace; font-size: 10px; }
      .lt-fbd-instance-tag { font-style: italic; font-size: 10px; }

      /* Wire colors by data type */
      .lt-fbd-wire-bool   { stroke: #000;     stroke-width: 1.5; fill: none; }
      .lt-fbd-wire-int    { stroke: #1976d2; stroke-width: 1.5; fill: none; }
      .lt-fbd-wire-real   { stroke: #f57c00; stroke-width: 1.5; fill: none; }
      .lt-fbd-wire-time   { stroke: #c2185b; stroke-width: 1.5; fill: none; }
      .lt-fbd-wire-string { stroke: #2e7d32; stroke-width: 1.5; fill: none; }
      .lt-fbd-wire-bits   { stroke: #000;    stroke-width: 1.5; stroke-dasharray: 5 3; fill: none; }
      .lt-fbd-wire-power  { stroke: #000;    stroke-width: 2.5; fill: none; }

      .lt-fbd-junction { fill: #000; }
      .lt-fbd-negation { fill: #fff; stroke: #333; stroke-width: 1; }
      .lt-fbd-rail { stroke: #000; stroke-width: 3; fill: none; }
      .lt-fbd-network-frame { fill: none; stroke: #888; stroke-dasharray: 4 3; }
      .lt-fbd-network-title { font-size: 11px; fill: #555; }
    </style>
  </defs>

  <title>FBD: {{title}}</title>
  <desc>Function Block Diagram with N networks, M blocks.</desc>

  <!-- One <g> per network -->
  <g class="lt-fbd-network" data-network="0" data-title="Start latch">
    <rect class="lt-fbd-network-frame" .../>
    <text class="lt-fbd-network-title" ...>0 — Start latch</text>

    <!-- Blocks -->
    <g class="lt-fbd-block" data-block-type="AND" data-instance="AndHold">
      <rect class="lt-fbd-block-body" .../>
      <rect class="lt-fbd-block-header" .../>
      <text class="lt-fbd-block-name">AND</text>
      <!-- Instance tag (italic, above header) -->
      <text class="lt-fbd-instance-tag">AndHold</text>
      <!-- Ports -->
      <g class="lt-fbd-port" data-port="IN1" data-side="in">
        <line class="lt-fbd-port-stub" .../>
        <text class="lt-fbd-port-label">IN1</text>
      </g>
      <!-- ... -->
    </g>

    <!-- Wires -->
    <path class="lt-fbd-wire-bool" data-wire-id="..." d="M ..."/>
    <circle class="lt-fbd-junction" cx="..." cy="..." r="3"/>

    <!-- Negation bubbles -->
    <circle class="lt-fbd-negation" cx="..." cy="..." r="4"/>
  </g>

  <!-- Power rail (only if rail: on) -->
  <path class="lt-fbd-rail" d="M 0,Y H W"/>

  <!-- Connector references -->
  <g class="lt-fbd-connector" data-name="TankLevel" data-direction="out">
    <path d="..."/>
    <text>TankLevel</text>
  </g>
</svg>
```

### 6.1 Required `data-*` attributes (interaction layer)

| Element | Attribute | Value |
|---|---|---|
| Block group | `data-block-type` | Standard name (`AND`, `TON`, ...) or user-defined FB type |
| Block group | `data-instance` | Instance tag (when present) |
| Block group | `data-network` | Network index |
| Port group | `data-port` | Port name (`IN1`, `OUT`, `EN`, `ENO`, `PT`, ...) |
| Port group | `data-side` | `in` / `out` |
| Port group | `data-port-type` | Data type (`bool`, `int`, `real`, ...) |
| Wire path | `data-wire-id` | `{network}-{from-block}.{from-port}->{to-block}.{to-port}` |
| Wire path | `data-wire-type` | Data type — must match source port |
| Junction | `data-junction-of` | Wire id this junction belongs to |
| Network group | `data-execution-order` | Index for top-to-bottom evaluation |

---

## 7. Layout Algorithm

FBD layout is a **layered DAG with named ports**, similar to flowchart and `logic` (§07) but with named multi-port nodes.

### 7.1 Pipeline

```
AST
 ├─ Phase 1: Network grouping        (each network is independent; layout in isolation)
 ├─ Phase 2: Cycle detection         (find feedback cycles, validate execution order)
 ├─ Phase 3: Layer assignment        (Coffman-Graham, source nodes at layer 0)
 ├─ Phase 4: Within-layer ordering   (median heuristic, alternate sweep — same as flowchart)
 ├─ Phase 5: Block sizing            (height = max ports per side × port_pitch + padding)
 ├─ Phase 6: Coordinate assignment   (x = layer × layer_spacing, y = packed)
 ├─ Phase 7: Port-aware wire routing (Manhattan; respect port y on source/sink)
 └─ Phase 8: Network packing         (stack networks vertically with network_gap_y)
```

### 7.2 Block Sizing Rules

Each block's bbox is computed as:

```
height = max(block_min_height,
             block_header_h
             + max(input_count, output_count) × port_pitch
             + 2 × block_padding_y)

width  = max(block_min_width,
             max(left_label_widths) + center_gap + max(right_label_widths)
             + 2 × block_padding_x)
```

`center_gap` is at least 16px so the block name and instance tag fit between port labels.

### 7.3 Port Y-coordinate Assignment

Within a block, ports are **top-to-bottom in declaration order**, with EN as the topmost input and ENO as the topmost output (when present).

```
EN  → y = block_header_h + port_pitch * 0.5
IN1 → y = block_header_h + port_pitch * 1.5
IN2 → y = block_header_h + port_pitch * 2.5
...
```

Same for outputs on the right side.

### 7.4 Wire Routing

Per-wire Manhattan path with up to 2 bends:

1. Source port → horizontal segment to a **column-x** between layers
2. Vertical segment to align with sink port y
3. Horizontal segment into sink port

When multiple wires share a column-x, they're spread by `wire_grid` (10px) to avoid overlap. Junctions are inserted where one wire splits to multiple sinks.

### 7.5 Power Rail (EN/ENO networks)

When any block in a network has `[en]`:

- Two horizontal rails are added: one at network top (`y = -wire_grid`) and the EN port y, one at network top mirroring on the right side for ENO
- Each `[en]` block's EN port connects up to the left rail; its ENO connects to the right rail
- The right ENO rail terminates wherever the last block consumes it (or extends to network end if no consumer)

---

## 8. Test Cases

### Case 1 — Single AND gate
```
fbd
network 0:
  Out = AND(A, B)
```
**Expected:** one AND block, two input wires from declared variables `A` and `B`, one output wire to `Out`. No power rail.

### Case 2 — Inline expression tree
```
fbd
network 0:
  Out = OR(A, AND(B, ~C))
```
**Expected:** AND block to the left, OR block to the right, AND.OUT wire feeds OR.IN2, `~C` renders an input-side negation bubble. Layered layout: layer 0 = inputs A,B,C; layer 1 = AND; layer 2 = OR; layer 3 = output Out.

### Case 3 — TON timer
```
fbd
var DwellTimer: timer
network 0:
  Done = TON(IN: Trigger, PT: T#5s)
```
**Expected:** TON block with IN/PT input ports, Q/ET output ports. PT shows `T#5s` as inline boxed constant. Done variable connects from Q output (BOOL wire). ET output is unconnected (renders as a dangling stub).

### Case 4 — CTU counter with feedback cycle
```
fbd
network 0 "Cycle counter":
  Pulse = R_TRIG(CLK: Sensor) [order: 1]
  Count = CTU(CU: Pulse.Q, R: Reset, PV: 100) [order: 2]
  Done  = GE(IN1: Count.CV, IN2: 100) [order: 3]
```
**Expected:** R_TRIG → CTU → GE chain; execution-order superscripts 1, 2, 3 in top-right of each block. Wires: BOOL from R_TRIG.Q to CTU.CU, INT from CTU.CV to GE.IN1, BOOL constant 100 inline at GE.IN2, BOOL output Done from GE.OUT.

### Case 5 — User-defined FB instance
```
fbd
var Pump1: MotorCtrl
network 0:
  Pump1 = MotorCtrl(Start: A, Stop: B) [pins_in: "Start,Stop", pins_out: "Run,Fault"]
  RunSig = MOVE(Pump1.Run)
```
**Expected:** Custom block sized to fit "MotorCtrl" header + Start/Stop on left + Run/Fault on right. Instance tag `Pump1` rendered italicized above the header. MOVE block on right reads `Pump1.Run`.

### Case 6 — EN/ENO power rail
```
fbd "rail demo" [rail: on]
network 0:
  M = MUL(IN1: X, IN2: 2) [en]
  A = ADD(IN1: M.OUT, IN2: Y) [en]
  Out = MOVE(A.OUT)
```
**Expected:** Top horizontal power rail across the network, MUL.EN and ADD.EN tap into it, MUL.ENO connects to ADD.EN (via the rail), ADD.ENO terminates the rail. MOVE has no `[en]` and is wired below the rail with a normal IN/OUT pair.

### Case 7 — Connectors (page links)
```
fbd
network 0:
  Lvl = MUL(IN1: RawSensor, IN2: 0.1)
  connector_out "TankLevel" = Lvl.OUT

network 1:
  connector_in "TankLevel" = Inflow
  Alarm = GT(IN1: Inflow, IN2: 95.0)
```
**Expected:** Two networks. Network 0 ends with connector arrow `─┤TankLevel┐`. Network 1 starts with connector tail `┌TankLevel├─`. No continuous wire between networks; renderer matches by name and may emit a hyperlink between them.

### Case 8 — All boolean gates rendering
```
fbd
network 0:
  A1 = AND(A, B)
  O1 = OR(A, B)
  N1 = NOT(A)
  Na = NAND(A, B)
  No = NOR(A, B)
  X  = XOR(A, B)
  Xn = XNOR(A, B)
```
**Expected:** Seven blocks, each with the IEC distinctive symbol (`&` / `≥1` / `1` / etc.); NOT/NAND/NOR/XNOR have output negation bubbles.

---

## 9. Implementation Priority

| Priority | Feature | Complexity | User value |
|---|---|---|---|
| P0 (MVP) | AND / OR / NOT 3-block engine + ports + wires | Low | Core — covers boolean logic |
| P0 | Variable declarations + parser | Low | Core |
| P0 | Layered DAG layout (reuse from logic / flowchart) | Medium | Core |
| P0 | Inline expression tree (`Out = OR(A, AND(B, C))`) | Medium | High — DSL ergonomics |
| P0 | Single-input gates: NOT / BUF | Low | Core |
| P1 | NAND, NOR, XOR, XNOR | Low | High |
| P1 | Negation bubbles on any port (`~`) | Low | High |
| P1 | TON / TOF timers | Medium | High |
| P1 | CTU / CTD counters | Medium | High |
| P1 | R_TRIG / F_TRIG edge detectors | Low | High |
| P1 | Inline constants (`PT: T#5s`, `IN2: 5`) | Low | High |
| P1 | Comparison blocks (EQ, NE, GT, GE, LT, LE) | Low | High |
| P1 | Math blocks (ADD, SUB, MUL, DIV, MOVE) | Low | High |
| P1 | Wire data-type coloring | Low | Medium |
| P1 | Junction nodes for fan-out | Low | High |
| P2 | SR / RS bistable | Low | Medium |
| P2 | Selection blocks (SEL, MUX, MAX, MIN, LIMIT) | Medium | Medium |
| P2 | TP / RTO timers | Low | Medium |
| P2 | CTUD bidirectional counter | Medium | Medium |
| P2 | User-defined FB with `pins_in` / `pins_out` | Medium | High (industry users need this) |
| P2 | Network titles + execution-order superscript | Low | Medium |
| P2 | EN / ENO power rail (`rail: on`) | High | Medium — vendor-specific |
| P3 | Connectors (page links) | Medium | Low |
| P3 | Trigonometric / extended math (SIN, COS, SQRT, ...) | Low | Low |
| P3 | Bit-string blocks (SHL, ROL, AND_BIT) | Low | Low |
| P3 | ANSI distinctive shape mode (`shape: ansi`) | Medium | Low — IEC default is sufficient |

**MVP target (~2 weeks effort):** P0 + most of P1 — covers the standard PLC-programmer toolkit (boolean logic + timers + counters + comparison + math). Defer user-defined FBs, EN/ENO rails, and bit-string operators to a follow-up.

---

## 10. DSL Design Tradeoffs (consistent with other Schematex diagrams)

- **No type annotations on individual wires.** Inferred from source port. Mismatches at sinks are parse errors.
- **Inline expression notation `Out = OR(A, AND(B, C))` is preferred** over instance-named expansion when the network is purely combinational. Combinational FBD scales poorly without it.
- **Instance tags are required only when needed:** a block's outputs are accessed via the instance tag (`AndHold.OUT`). For single-output blocks used inline (`OR(A, B)` directly inside another expression), no instance tag is needed.
- **Standard block names are uppercase, reserved.** Lowercase identifiers are always variable / instance / user-FB-type names. This matches IEC 61131-3 convention and avoids ambiguity.
- **Time literals are pass-through strings.** The DSL accepts and stores `T#10s` / `T#1m30s` verbatim; renderer displays as-is. No semantic time arithmetic — schematex is a renderer, not a simulator.

---

## 10b. Implementation Status — v0.1 (shipped 2026-05-04)

**Implemented (P0 + most of P1):**

- ✅ Boolean blocks: AND, OR, NOT, NAND, NOR, XOR, XNOR, BUF — IEC distinctive symbols (`&` / `≥1` / `=1` / `1`) + automatic output bubble for negated outputs
- ✅ Edge detectors: R_TRIG, F_TRIG
- ✅ Bistable: SR (set-dominant), RS (reset-dominant)
- ✅ Timers: TON, TOF, TP
- ✅ Counters: CTU, CTD
- ✅ Math: ADD, SUB, MUL, DIV, MOD, ABS, NEG, MOVE
- ✅ Comparison: EQ, NE, GT, GE, LT, LE
- ✅ Selection: SEL, MUX, MAX, MIN, LIMIT
- ✅ Inline expression notation: `Out = OR(A, AND(B, ~C))` recursively expands to a layered DAG of blocks
- ✅ Named instances and `Inst.Port` references
- ✅ Variadic input expansion (AND/OR/ADD/MUL/MAX/MIN with N-input arity)
- ✅ Inline constants on input ports: time literals (`T#5s`), numbers (`5`, `0.0`), booleans (`true`/`false`)
- ✅ Negation bubbles via `~` prefix on any input argument
- ✅ Variable declarations with all IEC primitive types + scope prefixes (`var`/`var_input`/`var_output`/etc.)
- ✅ Multiple networks per program (top-to-bottom evaluation order)
- ✅ Wire data-type coloring (BOOL black, INT blue, REAL orange, TIME magenta, STRING green, bit-strings dashed)
- ✅ Junction nodes for fan-out
- ✅ Variable terminals on left/right of each network frame
- ✅ Layered DAG layout (longest-path layering + per-layer y-packing)
- ✅ Manhattan wire routing with column-offset spreading

**Deferred to follow-up:**

- ❌ EN/ENO power-flow rails (`[en]` block attribute, `[rail: on]` header) — Studio 5000 / TIA Portal vendor convention
- ❌ User-defined function blocks with `pins_in:` / `pins_out:` declarations
- ❌ Page connectors (`connector_out` / `connector_in`)
- ❌ Bit-string blocks: SHL, SHR, ROL, ROR, AND_BIT, OR_BIT, XOR_BIT, NOT_BIT
- ❌ Extended math: SQRT, LN, LOG, EXP, SIN, COS, TAN, ASIN, ACOS, ATAN
- ❌ ANSI distinctive shape mode (`[shape: ansi]`) — the `logic` engine (§07) already provides this for pure-Boolean designs
- ❌ CTUD bidirectional counter, RTO retentive on-delay timer
- ❌ Execution-order superscript for feedback cycles
- ❌ Network-level frame styling beyond the dashed border

**Engineering tradeoffs in v0.1:**

- The parser is lenient: undeclared variable names referenced in calls are auto-declared as BOOL (mirrors the `logic` engine playbook for LLM-generated DSL).
- Timing literal pattern (`T#10s`, `T#1m30s`) is preserved verbatim — Schematex is a renderer, not a simulator.
- Layered layout uses longest-path (one block per column maximum unless multiple blocks share an input depth); this differs from Sugiyama median-heuristic ordering used in `flowchart`. Cleaner for typical FBD networks (2–6 blocks per network); may produce wider layouts than necessary for dense graphs — to be refined in v0.2.

---

## 11. Differences from Other Schematex EE-Family Diagrams

| Aspect | logic (§07) | block (§09) | ladder (§10) | **fbd (this)** |
|---|---|---|---|---|
| Domain | Combinational digital logic | Continuous-time control system | PLC ladder (IEC 61131-3 LD) | **PLC FBD (IEC 61131-3 FBD)** |
| Primitive | Logic gate (8 fixed) | Transfer function block | Contact / coil | **Function block (50+ standard + user-defined)** |
| Wires carry | Boolean signals | s-domain signal w/ summing | Power flow (rail-to-rail) | **Typed signals (BOOL/INT/REAL/TIME/...)** |
| Stateful elements | None | Integrator only | Latches, timers, counters | **Same as ladder + extensible** |
| Layout | Layered DAG | Fixed L-R + feedback path | Fixed power rails, one rung at a time | **Layered DAG per network** |
| Vendor IDE equivalent | Quartus / Logisim | MATLAB Simulink | Studio 5000 / TIA Portal LD | **Studio 5000 / TIA Portal FBD** |

**Cross-sell with ladder:** an automation engineer who comes for `ladder` can use `fbd` for the same PLC project — same variables, same timer/counter primitives, complementary visualization. A complete IEC 61131-3 PLC project routinely contains both LD and FBD networks.
