# 24 — Sequential Function Chart (SFC) Standard Reference

*IEC 61131-3:2013 §6.5 Sequential Function Chart language. Steps + transitions + actions for cyclic sequential PLC programs. Sister language to LD (ladder, §10) and FBD (§23); GRAFCET (IEC 60848) is a near-identical superset used in EU industrial automation.*

> **Primary References:**
> - **IEC 61131-3:2013 §6.5** — *Sequential Function Chart elements* (SFC). Defines steps, transitions, actions, parallel sequences, alternative sequences, jumps.
> - **IEC 60848:2013** — *GRAFCET specification language for sequential function charts*. The original French standard SFC derives from; covers the same graphical elements with stricter formal semantics.
> - **PLCopen** — Industry consortium reference shapes (https://plcopen.org).
> - **Allen-Bradley (Rockwell) Studio 5000 SFC** — North American convention. Supports the IEC subset plus vendor extensions (stop steps, manual mode forcing).
> - **Siemens TIA Portal S7-GRAPH** — European convention. Tracks GRAFCET semantics more strictly; named transitions optional but encouraged.
> - **CODESYS V3 SFC editor** — Cross-vendor open implementation reference.

**Positioning:** SFC is the **state-machine view** of cyclic PLC programs — what's happening *now* and what triggers the *next* phase. It complements LD/FBD (which describe per-scan combinational logic) by capturing **temporal sequencing** explicitly. In production PLC code roughly 10% of networks are written in SFC, but 100% of nontrivial sequential machines (batch reactors, robotic cells, packaging lines, assembly stations) have at least one SFC chart. **No good open-source SFC DSL exists** — vendor IDEs are the only option today.

**Relation to existing schematex engines:**
- `state` (§21, UML 2.5 / Harel statechart) — **~70% structural overlap.** Steps in SFC ≈ states in UML; transitions with conditions ≈ guards. SFC adds: action blocks attached to steps with a qualifier (N/S/R/L/D/P), simultaneous-vs-alternative branches with strict graphical conventions, double-line `===` simultaneous bars vs single-line `---` alternative bars. Layout reuses the layered approach from `state` but with rigid top-to-bottom orientation (no LR, no orthogonal regions).
- `ladder` (§10) — same audience (PLC programmers). Cross-sell story: SFC defines the sequence; each step's action references LD or FBD networks for the per-scan logic.
- `flowchart` (§14) — **superficially similar but semantically wrong**: flowchart has decision diamonds with text branches and a single active path; SFC has horizontal transition bars with boolean conditions and the active-step token semantics. Users who emit SFC as a flowchart get the visual pieces wrong (diamond instead of bar, missing parallel-branch double bars, no action blocks).

**GRAFCET vs SFC:** IEC 60848 GRAFCET is the formal model SFC derives from; IEC 61131-3 SFC is the engineering subset suitable for PLC code. ~95% identical visual grammar — same step shapes, same transition bars, same parallel/alternative conventions. Schematex implements the IEC 61131-3 SFC subset; GRAFCET-only conventions (e.g. forcing orders) are out of scope.

**Differentiation from `state` (§21):**

| Feature | `state` | `sfc` (this doc) |
|---|---|---|
| Step / state shape | Rounded rect | Rectangle (sharp corners — IEC 61131-3 §6.5.1) |
| Initial step | Solid black circle | **Double-bordered rectangle** (IEC §6.5.1.2) |
| Transition | Arrow with optional label | **Horizontal bar** with mandatory boolean condition |
| Direction | LR or TB | **Top-to-bottom only** (IEC mandate) |
| Branching | Choice diamond | **Bars** (single = alternative, double = simultaneous) |
| Action attached to step | Activity compartment (`do / ...`) | **Action block** rectangle attached to right of step, with qualifier letter |
| Concurrent regions | Orthogonal (`---` divider) | **Simultaneous sequence** (`===` double bar) |
| History pseudo-states | ✅ | ❌ (not in IEC 61131-3 SFC) |
| Reset / kill | ❌ | **Reset action qualifier (R)** |

---

## 1. Structure & Layout

### 1.1 Overall Diagram Structure

```
                ┌────────────────────────┐
                │ Step 0  (initial)      │  ← double border
                └────────────────────────┘
                            │
                ────────────┼────────────  ← transition bar (single)
                       Start_Btn
                            │
                ┌────────────────────────┐
                │ Step 1  Filling        │──┤Action: N FillValve_Open├─
                └────────────────────────┘
                            │
                ────────────┼────────────
                       Level >= 80%
                            │
                ┌────────────────────────┐
                │ Step 2  Mixing         │──┤Action: D Mixer_Run T#30s├─
                └────────────────────────┘
                            │
                ════════════╪════════════  ← simultaneous divergence (double bar)
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        │                                       │
   ┌─────────┐                            ┌─────────┐
   │ Step 3a │                            │ Step 3b │
   │ Drain   │                            │ Cool    │
   └─────────┘                            └─────────┘
        │                                       │
        └───────────────┬───────────────────────┘
                        │
                ════════╪════════           ← simultaneous convergence
                        │
                ┌────────────────────────┐
                │ Step 4  Done           │
                └────────────────────────┘
                            │
                            ▼  jump to Step 0 (label)
```

### 1.2 Layout Dimensions

| Parameter | Default | Meaning |
|---|---|---|
| `step_width` | 160px | Step rectangle width |
| `step_height` | 36px | Step rectangle height |
| `step_initial_offset` | 4px | Inner double-border offset for initial step |
| `transition_bar_w` | 24px | Half-width of transition bar (extends `2×` on each side of vertical wire) |
| `transition_bar_h` | 3px | Bar thickness |
| `simultaneous_bar_gap` | 4px | Gap between the two parallel lines of a simultaneous bar |
| `vertical_pitch` | 56px | Vertical distance from step to next transition midpoint |
| `branch_x_spacing` | 200px | Horizontal spacing between parallel branches |
| `action_block_w` | 200px | Default action block width |
| `action_block_h` | 28px | Action block height (one action per row) |
| `action_qualifier_w` | 24px | Width of qualifier compartment (left side of action block) |
| `wire_thickness` | 1.5px | Vertical and branch wires |
| `branch_wire_clearance` | 16px | Clearance from branch bar to nearest step rect |

---

## 2. Step Symbols (IEC 61131-3 §6.5.1)

### 2.1 Step (Initial)

The **initial step** is the entry point of the SFC. There must be exactly one per top-level chart, executed first when the program starts.

- **Shape:** rectangle with a **second border drawn 4px inside** the outer border (double-bordered rectangle)
- **Default size:** 160 × 36px
- **Label:** step name centered horizontally, vertically centered or top-anchored

```svg
<g class="lt-sfc-step lt-sfc-step-initial" data-step-id="S0">
  <rect class="lt-sfc-step-body" x="0" y="0" width="160" height="36"/>
  <rect class="lt-sfc-step-inner" x="4" y="4" width="152" height="28"/>
  <text class="lt-sfc-step-name" x="80" y="22" text-anchor="middle">S0_Idle</text>
</g>
```

### 2.2 Step (Normal)

Single-bordered rectangle with the step name centered.

```svg
<g class="lt-sfc-step" data-step-id="S1">
  <rect class="lt-sfc-step-body" x="0" y="0" width="160" height="36"/>
  <text class="lt-sfc-step-name" x="80" y="22" text-anchor="middle">S1_Filling</text>
</g>
```

### 2.3 Step Activity Indicator (optional)

When the runtime exposes "currently active" status, a **small filled circle** in the bottom-left corner of the step (`r=4`) indicates the active step (one of many possible visual conventions; off by default, enabled via theme).

### 2.4 Stop / Final Step (vendor extension)

Some vendors (Studio 5000) define a **stop step** as a triple-bordered rectangle, indicating chart termination. Schematex accepts this via `[final]` attribute but treats it as a normal step for layout — the third border is purely visual.

---

## 3. Transitions (IEC 61131-3 §6.5.2)

### 3.1 Single Transition

A **horizontal bar** drawn across the vertical wire connecting two consecutive steps. The transition's **boolean condition** is written **to the right of the bar**.

```
       │
   ────┼────       transition bar (3px tall × 48px wide, centered on the wire)
       │  Start_Btn AND ~EmergencyStop
       │
```

- **Shape:** horizontal line/rect, 3px thick, 48px wide
- **Condition:** any boolean expression involving variables and standard comparison operators
- **Position:** vertically centered between the source step and the destination step
- **Optional name:** for cross-referenced or named transitions, prefix with `T1: condition` (similar to action labels)

### 3.2 Transition Condition Syntax

The condition is a **structured-text expression** evaluating to BOOL. Schematex parses but does not evaluate; renders as text to the right of the bar.

Examples:
```
StartBtn
StartBtn AND NOT EmergencyStop
TankLevel >= 80.0
T1.Q                                # references TON timer Q output from action
ProductCount = 24
RIS(StartSensor)                    # rising-edge function
```

Operators recognized for parsing (precedence and associativity per IEC 61131-3 §6.6.2): `NOT`, `AND`, `&`, `OR`, `XOR`, `=`, `<>`, `<`, `>`, `<=`, `>=`, `+`, `-`, `*`, `/`, `MOD`. Lowercase aliases accepted.

### 3.3 Mandatory Condition Rule

**Every transition must have a non-empty condition.** A bar with no condition is a parse error. (For "always true" transitions in alternative branches with priority, use literal `TRUE`.)

---

## 4. Sequence Branching (IEC 61131-3 §6.5.4)

### 4.1 Alternative Sequence (Single Bar — OR semantics)

A single horizontal line marks an **alternative divergence**: only one outgoing branch fires per scan, determined by the first transition condition that evaluates true (left-to-right priority by default).

```
                ┌───────┐
                │ Step  │
                └───────┘
                    │
       ─────────────┴─────────────         ← alternative divergence (single line)
       │                       │
   ────┼────              ─────┼────       ← per-branch transitions
   Cond_A                      Cond_B
       │                       │
   ┌───────┐                ┌───────┐
   │  A    │                │  B    │
   └───────┘                └───────┘
       │                       │
       └─────────┬─────────────┘
                 │
       ──────────┴──────────                ← alternative convergence (single line)
                 │
             ┌───────┐
             │ Next  │
             └───────┘
```

**Priority:** by default, leftmost-first. Override with `[priority: N]` attribute on each branch.

**Convergence condition:** each branch ends with its own outgoing transition; the convergence is unconditional (no condition on the merging line itself).

### 4.2 Simultaneous Sequence (Double Bar — AND semantics)

**Two parallel horizontal lines** (gap 4px) mark a **simultaneous divergence**: all outgoing branches fire concurrently when the single shared transition above the bar evaluates true.

```
                ┌───────┐
                │ Step  │
                └───────┘
                    │
                ────┼────                    ← shared transition (single bar) ABOVE the simultaneous div
                Trigger
                    │
       ════════════════════════════           ← simultaneous divergence (DOUBLE bar)
       │                       │
   ┌───────┐                ┌───────┐
   │  A    │                │  B    │
   └───────┘                └───────┘
       │                       │
   ────┼────              ─────┼────         ← per-branch transitions (each branch finishes independently)
   A_Done                      B_Done
       │                       │
       ════════════════════════════           ← simultaneous convergence (DOUBLE bar)
                    │
                ────┼────                    ← shared transition AFTER the convergence
                TRUE
                    │
                ┌───────┐
                │ Next  │
                └───────┘
```

**Critical IEC rule:** the transition triggering simultaneous divergence appears **above** the double bar (single, shared); the transition exiting simultaneous convergence appears **below** the double bar (single, shared, often `TRUE`). This is the opposite of alternative sequences where transitions appear *between* the bar and each branch.

**Active-step semantics:** all simultaneous branches are active concurrently. A branch that finishes early waits at its last step until all sibling branches also finish before the convergence bar fires.

### 4.3 Loops (Jump)

A **jump** links a step back to an earlier step, forming a loop.

```
   ┌───────┐
   │ S5    │
   └───────┘
       │
   ────┼────
   Cond
       │
       ▼
       (jump arrow with target label)
       → S0
```

Two notations are accepted:

- **Inline jump:** transition exits to a labeled jump arrow rather than a step. Renders as a line ending in an arrow with the target step name in a small box.
- **Explicit `jump` statement** in DSL: `jump from: T5 to: S0`.

---

## 5. Actions (IEC 61131-3 §6.5.3)

Actions are blocks of code (LD network, FBD network, ST snippet, or variable assignment) **attached to the right side** of a step. They execute according to the **action qualifier**.

### 5.1 Action Block Shape

```
   ┌─────────┐  ┌────────────────────────┐
   │ Step 1  │──┤ N │ FillValve_Open      │
   └─────────┘  └────┴────────────────────┘
                  ↑    ↑
               qualifier  action name (or inline ST)
```

A single step can carry multiple actions, stacked vertically:

```
   ┌─────────┐  ┌────┬────────────────────┐
   │ Step 2  │──┤ N  │ Mixer_Run          │
   └─────────┘  ├────┼────────────────────┤
                │ D  │ Mixer_Speed := 50  │
                ├────┼────────────────────┤
                │ T#30s                   │   ← duration parameter for D-qualifier
                └────┴────────────────────┘
```

### 5.2 Action Qualifiers (IEC 61131-3 §6.5.3 Table 22)

| Qualifier | Name | Behavior |
|---|---|---|
| `N` | Non-stored | Active while step is active; auto-stops on step deactivate |
| `S` | Stored (Set) | Activates when step becomes active; **stays active** even after step deactivates, until reset by R-qualified action |
| `R` | Reset | Resets a previously-S-activated action |
| `L` | Time-Limited | Active while step is active, **but at most for time T** |
| `D` | Time-Delayed | Activates after delay T from step entry (still while step is active) |
| `P` | Pulse (one-scan) | Active for exactly one PLC scan when the step becomes active |
| `P0` | Pulse on deactivate | Active for one scan when step becomes inactive (vendor: Siemens) |
| `P1` | Pulse on activate | Synonym for `P` (vendor: Siemens) |
| `SD` | Stored & Delayed | S behavior, but action only starts after delay T |
| `DS` | Delayed & Stored | Same as SD with subtle ordering distinction (rarely used) |
| `SL` | Stored & Time-Limited | S behavior, action auto-resets after time T |

### 5.3 Action Body

The action body to the right of the qualifier letter is **either**:

1. **A name** referring to a separately-defined LD/FBD network or boolean variable (e.g. `FillValve_Open`)
2. **An inline ST assignment** for simple one-liners (e.g. `Mixer_Speed := 50`)

For purposes of schematex rendering, the body is opaque text. Schematex does not parse or evaluate actions — they are display-only.

### 5.4 Time Parameters (D, L, SD, SL Qualifiers)

Time-qualified actions take an **IEC duration literal** parameter, rendered on a third row inside the action block:

```
┌────┬─────────────────────┐
│ D  │ Mixer_Run           │
├────┴─────────────────────┤
│ T#30s                    │
└──────────────────────────┘
```

---

## 6. Variable Declarations

SFC reuses the variable declaration syntax from ladder (§10) and FBD (§23). Variables referenced in transitions and actions must be declared at the chart level.

```
sfc "Batch Reactor"

var StartBtn: bool
var EmergencyStop: bool
var TankLevel: real
var Mixer_Run: bool
var FillValve_Open: bool
var T1: timer
...
```

---

## 7. DSL Grammar (SFC)

```ebnf
document       = header statement*
header         = "sfc" quoted_string? props? NEWLINE
props          = "[" prop ("," prop)* "]"
prop           = "style:" ("iec" | "iec_with_jumps")    # default iec

statement      = comment | variable_decl | step_def | transition_def
               | branch_block | jump_def | action_def

comment        = "#" [^\n]* NEWLINE

variable_decl  = "var" id ":" data_type ("=" init_value)? NEWLINE
data_type      = "bool" | "int" | "real" | "time" | "timer" | "counter" | id
init_value     = "true" | "false" | INT | FLOAT | TIME_LIT | quoted_string

step_def       = "step" step_id step_attrs? action_list? NEWLINE
step_id        = IDENTIFIER
step_attrs     = "[" step_attr ("," step_attr)* "]"
step_attr      = "initial"                   # mark as initial (one allowed)
               | "final"                     # vendor: stop step
               | "label:" quoted_string      # display label override

action_list    = ":" NEWLINE INDENT action_def+ DEDENT
action_def     = qualifier action_body action_time? NEWLINE
qualifier      = "N" | "S" | "R" | "L" | "D" | "P" | "P0" | "P1" | "SD" | "DS" | "SL"
action_body    = id                          # named action / variable
               | quoted_string               # inline ST or text
action_time    = TIME_LIT                    # for D, L, SD, SL qualifiers

transition_def = "transition" transition_id? "from:" step_ref "to:" step_ref ":" condition NEWLINE
transition_id  = IDENTIFIER
step_ref       = step_id
condition      = /[^\n]+/                    # any boolean expression text

branch_block   = alternative_block | simultaneous_block

alternative_block =
    "alt" "from:" step_ref ":" NEWLINE INDENT
       alt_branch+
    DEDENT "merge_to:" step_ref NEWLINE
alt_branch     = "branch" alt_branch_attrs? ":" NEWLINE INDENT
                   "transition" ":" condition NEWLINE
                   step_def+
                   ("transition" ":" condition NEWLINE)?  # exit transition (optional if branch ends in jump)
                 DEDENT
alt_branch_attrs = "[" "priority:" INT "]"

simultaneous_block =
    "sim" "from:" step_ref ":" condition NEWLINE INDENT
       sim_branch+
    DEDENT "merge_to:" step_ref ":" condition NEWLINE
sim_branch     = "branch" ":" NEWLINE INDENT
                   step_def+
                 DEDENT

jump_def       = "jump" "from:" (step_ref | transition_ref) "to:" step_ref NEWLINE
transition_ref = IDENTIFIER

TIME_LIT       = "T#" /[0-9]+(ms|s|m|h)/+
IDENTIFIER     = /[a-zA-Z_][a-zA-Z0-9_]*/
INT            = /[0-9]+/
FLOAT          = /[0-9]+\.[0-9]+/
quoted_string  = '"' /[^"]*/ '"'
INDENT         = increase in whitespace
DEDENT         = decrease in whitespace
NEWLINE        = /\n/
```

### 7.1 DSL Example — Simple Linear Sequence

```
sfc "Bottle Filling"

var StartBtn: bool
var TankLevel: real
var Done: bool
var FillValve: bool

step S0 [initial]
  N FillValve_Closed

step S1 [label: "Filling"]
  N FillValve_Open

step S2 [label: "Done"]
  N Done

transition from: S0 to: S1: StartBtn
transition from: S1 to: S2: TankLevel >= 80.0
transition from: S2 to: S0: NOT StartBtn
```

### 7.2 DSL Example — Alternative Branch (OR)

```
sfc "Order Routing"

var ProductOrdered: bool
var IsExpressShipping: bool
var IsStandardShipping: bool
var Shipped: bool

step S0 [initial]

step S_Pick
  N PickFromBin

step S_Ship
  N CarrierPickup

transition from: S0 to: S_Pick: ProductOrdered

alt from: S_Pick:
  branch [priority: 1]:
    transition: IsExpressShipping
    step S_Express
      N PrepExpressBox
    transition: TRUE
  branch [priority: 2]:
    transition: IsStandardShipping
    step S_Standard
      N PrepStandardBox
    transition: TRUE
merge_to: S_Ship

transition from: S_Ship to: S0: Shipped
```

### 7.3 DSL Example — Simultaneous Branch (AND)

```
sfc "Bake & Cool Concurrently"

var BakeReady: bool
var Bake_Done: bool
var Cool_Done: bool

step S0 [initial]

step S_Heat
  N Heater_On

step S_Done

transition from: S0 to: S_Heat: BakeReady

sim from: S_Heat: TRUE
  branch:
    step S_Bake
      D Oven_Run T#15m
  branch:
    step S_Cool
      L Cooler_On T#5m
merge_to: S_Done: Bake_Done AND Cool_Done

transition from: S_Done to: S0: NOT BakeReady
```

### 7.4 DSL Example — All Action Qualifiers

```
sfc "Qualifier Demo"

var Trigger: bool

step S0 [initial]
step S1
  N Coil_N         # while step active
  S Latch_S        # latches on entry (until R elsewhere)
  R Latch_S2       # resets a different stored action
  L LimitedRun T#5s
  D DelayedRun T#2s
  P SinglePulse    # one scan only

transition from: S0 to: S1: Trigger
transition from: S1 to: S0: NOT Trigger
```

### 7.5 DSL Example — Loop (Jump Back)

```
sfc "Reset Loop"

var Reset: bool
var Counter: counter

step S0 [initial]
step S1
  N IncrementCounter
step S2
  N CheckResult

transition from: S0 to: S1: TRUE
transition from: S1 to: S2: TRUE

# Jump back to S0 when reset is asserted
transition T_Reset from: S2 to: S0: Reset

# Or alternatively continue if not reset
transition from: S2 to: S1: NOT Reset
```

---

## 8. SVG Structure

```xml
<svg class="lt-sfc" data-diagram-type="sfc">
  <defs>
    <style>
      .lt-sfc-step-body  { fill: #ffffff; stroke: #333; stroke-width: 1.5; }
      .lt-sfc-step-inner { fill: none;    stroke: #333; stroke-width: 1.5; }   /* initial */
      .lt-sfc-step-name  { font-family: monospace; font-size: 12px; font-weight: 600; }
      .lt-sfc-step-active { fill: #ffeb3b; }                                    /* runtime override */

      .lt-sfc-transition-bar { fill: #000; }
      .lt-sfc-transition-condition { font-family: monospace; font-size: 11px; fill: #555; }
      .lt-sfc-transition-id { font-family: monospace; font-size: 10px; fill: #888; }

      .lt-sfc-branch-bar-alt { stroke: #000; stroke-width: 1.5; fill: none; }  /* alternative */
      .lt-sfc-branch-bar-sim { stroke: #000; stroke-width: 1.5; fill: none; }  /* simultaneous = two parallel lines */
      .lt-sfc-branch-priority { font-family: monospace; font-size: 10px; fill: #c00; }

      .lt-sfc-wire { stroke: #000; stroke-width: 1.5; fill: none; }

      .lt-sfc-action-block { fill: #fafafa; stroke: #333; stroke-width: 1; }
      .lt-sfc-action-qualifier { fill: #f0f0f0; stroke: #333; stroke-width: 1; }
      .lt-sfc-action-qualifier-text { font-family: monospace; font-weight: 700; font-size: 11px; }
      .lt-sfc-action-body  { font-family: monospace; font-size: 11px; }
      .lt-sfc-action-time  { font-family: monospace; font-size: 10px; fill: #555; }

      .lt-sfc-jump-arrow { stroke: #000; stroke-width: 1.5; fill: none; marker-end: url(#sfc-arrow); }
      .lt-sfc-jump-target { fill: #fff; stroke: #333; stroke-width: 1; }
      .lt-sfc-jump-target-text { font-family: monospace; font-size: 10px; }
    </style>
    <marker id="sfc-arrow" .../>
  </defs>

  <title>SFC: {{title}}</title>
  <desc>Sequential Function Chart with N steps, M transitions.</desc>

  <!-- Steps -->
  <g class="lt-sfc-step lt-sfc-step-initial" data-step-id="S0">
    <rect class="lt-sfc-step-body" .../>
    <rect class="lt-sfc-step-inner" .../>           <!-- only on initial step -->
    <text class="lt-sfc-step-name" ...>S0_Idle</text>
  </g>

  <!-- Action blocks (may be 0, 1, or many per step) -->
  <g class="lt-sfc-action-block-g" data-step-id="S1" data-action-index="0">
    <rect class="lt-sfc-action-qualifier" .../>
    <text class="lt-sfc-action-qualifier-text">N</text>
    <rect class="lt-sfc-action-block" .../>
    <text class="lt-sfc-action-body">FillValve_Open</text>
  </g>

  <!-- Transitions -->
  <g class="lt-sfc-transition" data-transition-id="T1" data-from="S0" data-to="S1">
    <rect class="lt-sfc-transition-bar" .../>
    <text class="lt-sfc-transition-condition">StartBtn AND NOT EmergencyStop</text>
  </g>

  <!-- Vertical wires connecting step ↔ transition ↔ next step -->
  <line class="lt-sfc-wire" .../>

  <!-- Branch bars (alternative = single, simultaneous = two parallel) -->
  <g class="lt-sfc-branch-alt" data-from="S_Pick">
    <line class="lt-sfc-branch-bar-alt" x1="..." y1="..." x2="..." y2="..."/>
  </g>
  <g class="lt-sfc-branch-sim" data-from="S_Heat">
    <line class="lt-sfc-branch-bar-sim" x1="..." y1="..." x2="..." y2="..."/>
    <line class="lt-sfc-branch-bar-sim" x1="..." y1="..." x2="..." y2="..."/>   <!-- second parallel line -->
  </g>

  <!-- Jump arrow -->
  <g class="lt-sfc-jump-g" data-from="S5" data-to="S0">
    <path class="lt-sfc-jump-arrow" d="M ..."/>
    <rect class="lt-sfc-jump-target" .../>
    <text class="lt-sfc-jump-target-text">S0</text>
  </g>
</svg>
```

### 8.1 Required `data-*` attributes

| Element | Attribute | Value |
|---|---|---|
| Step group | `data-step-id` | Step identifier (unique per chart) |
| Step group | `data-step-kind` | `initial` / `normal` / `final` |
| Action block group | `data-step-id` | Owning step |
| Action block group | `data-action-index` | 0-based action position within step |
| Action block group | `data-qualifier` | `N` / `S` / `R` / `L` / `D` / `P` / `P0` / `P1` / `SD` / `DS` / `SL` |
| Transition group | `data-transition-id` | Generated or explicit |
| Transition group | `data-from`, `data-to` | Step IDs |
| Branch group | `data-branch-kind` | `alternative` / `simultaneous` / `merge` |
| Jump group | `data-from`, `data-to` | Step / transition IDs |

---

## 9. Layout Algorithm

SFC layout is **strictly top-to-bottom**, with horizontal expansion only inside branch regions. The algorithm is dominated by branch-region sizing.

### 9.1 Pipeline

```
AST
 ├─ Phase 1: Validation              (exactly one initial step; every transition has a condition;
 │                                    every step is reachable from initial; every branch closes)
 ├─ Phase 2: Topo-walk from initial  (build dominance tree of branch regions)
 ├─ Phase 3: Region sizing           (recursive: each branch region width = sum of sub-region widths)
 ├─ Phase 4: Y-coordinate assignment (depth-first walk; siblings in alt/sim branches share y-range)
 ├─ Phase 5: X-coordinate assignment (root chain centered; branch regions split horizontally)
 ├─ Phase 6: Action block placement  (right of each step, stacked vertically per step)
 ├─ Phase 7: Wire routing            (straight vertical between step↔transition↔step;
 │                                    branch wires are L-shapes from bar to each branch)
 └─ Phase 8: Jump routing            (curved path on the left or right margin to target step)
```

### 9.2 Region Sizing

For an alternative or simultaneous block with N branches:

```
region_width = sum(branch_width[i]) + (N - 1) × branch_x_spacing
branch_width[i] = max(step_width, region_width of any nested block in branch i)
region_height = max(branch_height[i])
```

The convergence/divergence bars span the full `region_width`.

### 9.3 Y-coordinate Stretch in Simultaneous Blocks

In a simultaneous block, all branches must reach the convergence bar **at the same y**. If branches have different lengths, shorter branches **extend their last step's wire** down to the shared convergence y (rendered as a continuation of the vertical wire).

### 9.4 Action Block Placement

Action blocks are placed **immediately to the right of their owning step**, with `8px` horizontal gap. Multiple actions stack vertically with the topmost action aligned to the step's top edge. The action block's **left edge** connects to the **right edge** of the step rectangle via a short horizontal wire stub.

### 9.5 Jump Routing

Jumps are drawn as **labeled arrows on the chart margin** (left or right, whichever has more space) rather than crossing through the chart body. The arrow ends at the target step's left or right edge.

---

## 10. Test Cases

### Case 1 — Linear three-step sequence
```
sfc
step S0 [initial]
step S1
step S2
transition from: S0 to: S1: A
transition from: S1 to: S2: B
transition from: S2 to: S0: C
```
**Expected:** Three rectangles stacked vertically, S0 with double border. Three transition bars (each with one-letter condition labels). Vertical wire connecting all three. Last transition wraps back to S0 via a jump arrow on the right margin.

### Case 2 — Alternative branch (OR)
```
sfc
step S0 [initial]
step S1
alt from: S1:
  branch [priority: 1]:
    transition: P
    step Sa
    transition: TRUE
  branch [priority: 2]:
    transition: Q
    step Sb
    transition: TRUE
merge_to: S2
step S2
transition from: S0 to: S1: TRUE
transition from: S2 to: S0: TRUE
```
**Expected:** Single horizontal divergence line below S1, two parallel branches (Sa on left, Sb on right), single horizontal convergence line above S2. Per-branch transitions `P` and `Q` rendered between the divergence and each branch step. Priority numbers `1` and `2` in small red font near the branch entries.

### Case 3 — Simultaneous branch (AND)
```
sfc
step S0 [initial]
step S1
sim from: S1: TRUE
  branch:
    step Sa
  branch:
    step Sb
merge_to: S2: A_done AND B_done
step S2
transition from: S0 to: S1: Trigger
```
**Expected:** Single shared transition (`TRUE`) above the divergence. Two parallel horizontal lines (the double bar) below it. Two branches Sa and Sb side-by-side. Two parallel horizontal lines (convergence) below them. Single shared transition (`A_done AND B_done`) below the convergence, leading into S2.

### Case 4 — Step with multiple actions
```
sfc
step S0 [initial]
step S1
  N FillValve_Open
  D Mixer_Run T#10s
  P StartChime
transition from: S0 to: S1: Start
```
**Expected:** S1 step rectangle with three action blocks stacked vertically on its right side. Qualifier letters N, D, P in left-side compartments. Action body text right of qualifiers. The D-action shows `T#10s` on a third row inside its block.

### Case 5 — Stored action and reset
```
sfc
step S0 [initial]
step S1
  S MotorRun
step S2
step S3
  R MotorRun
transition from: S0 to: S1: Start
transition from: S1 to: S2: TRUE
transition from: S2 to: S3: Stop
transition from: S3 to: S0: TRUE
```
**Expected:** S1 carries an `S MotorRun` action, S3 carries `R MotorRun`. Renderer may optionally draw a dashed connecting line between the two action blocks to visually pair the S/R; if not, both render normally.

### Case 6 — Nested alternative inside simultaneous
```
sfc
step S0 [initial]
step S_Start
sim from: S_Start: TRUE
  branch:
    alt from: S_PrepLeft:
      branch:
        transition: ColdMode
        step S_Cool_L
        transition: TRUE
      branch:
        transition: HotMode
        step S_Heat_L
        transition: TRUE
    merge_to: S_Done_L
  branch:
    step S_Right
merge_to: S_End: TRUE
step S_End
transition from: S0 to: S_Start: GO
```
**Expected:** Outer simultaneous block with two branches. Left branch contains a nested alternative block with two sub-branches (cool / heat) and its own merge into S_Done_L. Right branch is a single step. Both outer branches reach the simultaneous convergence at the same y (left branch is taller, so right branch's wire extends down).

### Case 7 — Jump back to earlier step
```
sfc
step S0 [initial]
step S1
step S2
transition from: S0 to: S1: A
transition from: S1 to: S2: B
transition T_Reset from: S2 to: S0: Reset
transition from: S2 to: S1: NOT Reset
```
**Expected:** Two outgoing transitions from S2. `T_Reset` (labeled with id) goes back to S0 — drawn as a margin jump arrow. The other transition continues to S1 — drawn the normal way (margin jump on the opposite side or inline if space).

### Case 8 — All qualifiers rendered
```
sfc
step S0 [initial]
step S1
  N Action_N
  S Action_S
  R Action_R
  L Action_L T#5s
  D Action_D T#2s
  P Action_P
  P0 Action_P0
  P1 Action_P1
  SD Action_SD T#1s
  DS Action_DS T#1s
  SL Action_SL T#10s
transition from: S0 to: S1: TRUE
```
**Expected:** All eleven qualifiers render correctly. Time-parameterized qualifiers (L, D, SD, DS, SL) show their time literal on a third row inside the action block. Compact stacking — total height of action stack ≈ 11 × `action_block_h`.

---

## 11. Implementation Priority

| Priority | Feature | Complexity | User value |
|---|---|---|---|
| P0 (MVP) | Step (initial + normal) shape rendering | Low | Core |
| P0 | Single transition with condition text | Low | Core |
| P0 | Vertical wire connecting steps | Low | Core |
| P0 | Top-down layered layout (no branches) | Low | Core |
| P0 | DSL parser for linear sequences | Medium | Core |
| P0 | N (non-stored) action qualifier + action block rendering | Low | Core — most actions are N |
| P1 | Alternative branch (single bar divergence/convergence) | Medium | High |
| P1 | Simultaneous branch (double bar divergence/convergence) | Medium | High |
| P1 | S / R stored qualifier pair | Low | High |
| P1 | D / L time-qualified actions with `T#...` rendering | Medium | High |
| P1 | Jump arrows (margin routing) | Medium | High |
| P1 | Multi-action stacking on a single step | Low | High |
| P2 | P / P0 / P1 pulse qualifiers | Low | Medium |
| P2 | SD / DS / SL combined qualifiers | Low | Medium |
| P2 | Branch priority annotations | Low | Medium |
| P2 | Nested branches (alt-in-sim, sim-in-alt) | High | Medium |
| P2 | Final step (triple border, vendor) | Low | Low |
| P3 | Active-step runtime indicator (yellow fill) | Low | Low — only useful for debugging integrations |
| P3 | S/R action-pair dashed connector | Medium | Low |
| P3 | Forcing orders (GRAFCET-only feature) | High | Low (out of scope) |

**MVP target (~2 weeks effort):** P0 + most of P1 — covers linear sequences, alternative + simultaneous branches, the seven most-used qualifiers (N, S, R, L, D, P), jump-back loops, multi-action steps. Defer pulse-on-deactivate, combined qualifiers, nested branches, vendor extensions to a follow-up.

---

## 12. DSL Design Tradeoffs (consistent with other Schematex diagrams)

- **Condition text is opaque.** Schematex parses the DSL syntax around conditions but stores conditions as raw strings; no type checking or simulation. This matches how `state` (§21) handles guard/action text.
- **Strict top-to-bottom only.** SFC has no LR mode. This matches IEC 61131-3 §6.5.1 mandate. (GRAFCET technically allows other orientations but vendor practice is universally TB.)
- **Branches must close.** Every alternative or simultaneous block must declare its `merge_to:` step. An unclosed branch is a parse error. This avoids ambiguity in layout.
- **Variables are referenced, not validated.** Conditions and actions can reference any identifier; schematex doesn't verify the variable was declared. This is a tradeoff: validation here would require a real ST expression parser, which is out of scope.
- **Action body is opaque text.** Either an identifier (referencing a separately-defined LD/FBD network) or a quoted ST snippet. No interpretation.
- **Initial step is required.** An SFC chart with no `[initial]` step is a parse error. Multiple initial steps is also an error.

---

## 12b. Implementation Status — v0.1 (shipped 2026-05-04)

**Implemented (P0 + most of P1):**

- ✅ Step shape rendering: initial (double-bordered), normal (single-bordered), final (parses `[final]`)
- ✅ Single transitions with mandatory boolean condition text (rendered to right of bar)
- ✅ Named transitions (e.g. `transition T_Reset from: ... to: ...: cond`) — id rendered to left of bar
- ✅ Vertical wires connecting linearly-adjacent body steps
- ✅ Top-down strict layout per IEC mandate (no LR mode)
- ✅ Indent-sensitive DSL parser
- ✅ Action blocks with all eleven qualifiers: N, S, R, L, D, P, P0, P1, SD, DS, SL
- ✅ Time-parameterized actions (L/D/SD/DS/SL with `T#...` literals rendered in a third row inside the action block)
- ✅ Multi-action stacking on a single step (rendered vertically on right side)
- ✅ Alternative branch (single-bar OR) divergence + convergence with per-branch entry/exit transitions
- ✅ Simultaneous branch (double-bar AND, 4px gap between parallel lines) divergence + convergence with shared transitions above/below
- ✅ Branch priority annotations (`[priority: N]`)
- ✅ Jump-back transitions render as margin arrows (alternates left/right side) with target id label
- ✅ Variable declarations (reuses LD/FBD primitive types: bool/int/real/time/timer/counter/string)
- ✅ Auto-promote first-declared step to `initial` when none is marked
- ✅ Multi-initial detection (parser error when two `[initial]` markers present)

**Deferred to follow-up:**

- ❌ Active-step runtime indicator (small filled circle in step's bottom-left corner; useful only for runtime-debugging integrations)
- ❌ S/R action-pair dashed connector (visually link a stored action with its matching reset)
- ❌ Final-step triple border — currently parsed via `[final]` but rendered identically to initial
- ❌ Forcing orders (out-of-scope per IEC 60848-only feature)
- ❌ Deeper-nested branches (alt-in-sim-in-alt) — parses but layout heuristics get loose for deep nests; recommend keeping nesting to ≤ 2 levels in v0.1

**Engineering tradeoffs in v0.1:**

- Condition text and action body text are stored as **opaque strings** — Schematex parses the surrounding DSL but never tries to evaluate or type-check the IEC structured-text expressions. This matches how `state` (§21) handles guards/actions.
- A transition whose `from`/`to` doesn't match a linearly-adjacent body pair is automatically routed as a margin jump arrow. This handles the vast majority of cycle/loop patterns; pathological cases (multiple back-edges per step) may overlap in v0.1.
- Indentation is normalized (tab = 4 spaces). Mixed-tabs-and-spaces in the same file works but is discouraged.

---

## 13. Differences from Other Schematex Diagrams

| Aspect | state (§21) | flowchart (§14) | ladder (§10) | **sfc (this)** |
|---|---|---|---|---|
| Domain | UML state machine | Generic process flow | PLC ladder | **PLC sequential control** |
| Primitive | State (rounded) | Node (varied shapes) | Rung (rail-to-rail) | **Step (rectangle)** |
| Branching | Choice diamond | Decision diamond | Parallel rungs | **Bars: single (alt) / double (sim)** |
| Direction | LR or TB | LR or TB | TB (rungs stack) | **TB only (IEC mandate)** |
| Concurrent paths | Orthogonal regions | n/a (single path) | n/a | **Simultaneous branches (==)** |
| Action attached to node | Activity compartment | n/a | (rung body is the "action") | **Action block to right, with qualifier** |
| Edge condition | Trigger [guard] / action | Pipe label `\|cond\|` | Element on rung | **Bar with boolean expression** |
| Active-instance semantics | One state at a time per region | Single token | Cyclic scan | **Multi-token (simultaneous branches)** |

**Cross-sell with ladder + FBD:** an automation engineer using `ladder` for per-scan logic and `fbd` for combinational blocks gains `sfc` to express the temporal sequencing across them. The actions of an SFC step often *are* an LD or FBD network. Together these three engines cover the visual half of IEC 61131-3 — what real PLC programmers draw daily.
