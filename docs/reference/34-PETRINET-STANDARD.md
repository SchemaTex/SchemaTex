# 34 — Petri Net Standard Reference

*Carl Adam Petri's place/transition nets (P/T nets) and their common extensions — bipartite directed graphs of **places** (circles, holding tokens) and **transitions** (bars, firing events) connected by weighted **arcs**, with an initial **marking** that the engine can step. Schematex implements the visual subset that researchers, control engineers, and workflow modellers actually draw, with a text DSL designed for AI generation and — like `pert` computes the schedule — **the engine computes which transitions are enabled and can fire a marking forward**, not just render static shapes.*

> **Primary References:**
> - **Petri, Carl Adam** (1962). *Kommunikation mit Automaten* (Communication with Automata). PhD dissertation, Technische Universität Darmstadt / Schriften des IIM Nr. 2, Bonn. — *The origin of the formalism.*
> - **Murata, Tadao** (1989). "Petri Nets: Properties, Analysis and Applications." *Proceedings of the IEEE* **77**(4): 541–580. doi:10.1109/5.24143. — *The canonical survey; its figures are the de-facto reference for P/T-net visual notation (place circle, transition bar, token dot, weighted arc, the back-edge routing). When this doc says "the standard notation", it means Murata's figures.*
> - **Reisig, Wolfgang** (2013). *Understanding Petri Nets: Modeling Techniques, Analysis Methods, Case Studies*. Springer. ISBN 978-3642332777. — *Modern textbook treatment; standard for teaching.*
> - **ISO/IEC 15909-1:2019** — *Systems and software engineering — High-level Petri nets — Part 1: Concepts, definitions and graphical notation.* — *The international standard. Defines P/T nets and high-level (coloured/symmetric) nets, and the graphical conventions.*
> - **ISO/IEC 15909-2:2011** — *Part 2: Transfer format* (**PNML**, the Petri Net Markup Language). — *XML interchange format; the import/export target.*
> - **Jensen, Kurt; Kristensen, Lars M.** (2009). *Coloured Petri Nets: Modelling and Validation of Concurrent Systems*. Springer. ISBN 978-3642002830. — *The CPN reference; typed tokens, arc inscriptions, guards (deferred past v0.1, see §11).*
> - **Marsan, M. Ajmone; Balbo, G.; Conte, G.; Donatelli, S.; Franceschinis, G.** (1995). *Modelling with Generalized Stochastic Petri Nets*. Wiley. ISBN 978-0471930594. — *GSPN; the source of the immediate-bar vs timed-box transition distinction Schematex renders.*
> - **van der Aalst, Wil M. P.** (1998). "The Application of Petri Nets to Workflow Management." *Journal of Circuits, Systems and Computers* **8**(1): 21–66. — *Workflow nets (WF-nets): single source place, single sink place, soundness.*
>
> *Notes on the standard landscape.* Unlike BPMN (OMG / ISO 19510) or P&ID (ISA-5.1), the **graphical notation for Petri nets is light-touch in the formal standards** — ISO/IEC 15909-1 fixes the meaning (places are circles, transitions are rectangles/bars, arcs are directed, markings are token dots) but leaves rendering detail to convention. Schematex therefore treats **Murata 1989's figures as the visual baseline** for ordinary P/T nets, **Marsan 1995 (GSPN)** for the immediate/timed transition distinction, **van der Aalst** for workflow-net source/sink conventions, and documents every deviation explicitly in §10.

---

## 0. Positioning

**Petri nets are the foundational formalism for modelling concurrency, synchronisation, and resource flow in discrete-event systems** — invented by Carl Adam Petri in 1962 and used continuously since across computer science, control engineering, manufacturing, business-process modelling, and systems biology. They are taught in essentially every graduate concurrency, formal-methods, and operations-research course. The notation is small and instantly recognisable: a *place* is a circle, a *transition* is a bar, an arc carries a weight, and the dynamic state of the system is a sprinkle of *tokens* sitting in the places.

**Why this engine exists.** A search for "Petri net editor" returns three camps. The **academic-tool camp** (PIPE2, TINA, CPN Tools, GreatSPN, WoPeD, Snoopy) is desktop Java/C++ software with rich analysis but no embeddability, no text DSL, and a dated UI; you cannot drop a Petri net into a Markdown doc or a web page. The **general-diagramming camp** (draw.io, Lucidchart, yEd) ships a *shape library*: the user hand-draws circles and bars and there is no notion of a marking, an enabled transition, or firing — it is a picture, not a model. The **text-DSL camp** is nearly empty: Mermaid has no Petri net; PlantUML has no Petri net; the only text formats in wide use are PNML (verbose XML, not hand-authorable) and a few research-grade `.ndr`/`.cpn` formats. **There is no free, embeddable, text-first Petri net tool that both renders the standard notation *and* understands the dynamics.** Schematex closes that gap.

**The differentiator is the marking, not the box.** Anyone can draw a circle and a bar. What distinguishes a real Petri-net engine is that it knows a *marking* (which places hold how many tokens), can compute which transitions are *enabled* (every input place has at least the arc-weight of tokens), and can *fire* an enabled transition to produce the next marking. Schematex `petri` does this: it validates the bipartite structure, highlights the enabled transitions under the declared initial marking, and (optionally) plays a firing sequence forward to render any reachable marking. The render is downstream of the semantics — exactly the stance `pert` takes toward scheduling.

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why Petri net is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision DAG (Sugiyama) | A flowchart is a single thread of control; a Petri net is **concurrent** — multiple tokens, multiple transitions enabled at once. Nodes are one kind; Petri nets are **bipartite** (two node kinds that must alternate). No marking, no firing. |
| `state` (§21, UML/Harel) | Single active state, event-driven transitions | A statechart has **one** active state (or one per orthogonal region); a Petri net's "state" is a *distribution* of tokens — naturally models true concurrency and resource counts that statecharts cannot. |
| `sfc` (§24, IEC 61131-3) | PLC sequential function chart | SFC is a *restricted* safe Petri net (steps = places, one initial token, structured alt/parallel branches) for industrial controllers. Petri net is the general formalism: arbitrary topology, arc weights, inhibitor arcs, unbounded markings. SFC ⊂ Petri net. |
| `bpmn` (§25) | Business process modelling (OMG) | BPMN's token semantics are *defined by reduction to* workflow Petri nets (van der Aalst). Petri net is the underlying math; BPMN is the business-facing skin. |
| `pert` (§32) | Project scheduling (AON) | Both are computed networks, but PERT is acyclic and time-valued; Petri nets are cyclic, concurrent, and token-valued. |

**Layout reuse.** Petri net inherits the layered-DAG layout primitives from `flowchart` (§14) — greedy cycle removal (FAS), longest-path layering, barycenter crossing reduction, Brandes-Köpf x-coordinate, orthogonal/curved back-edge routing. The bipartite constraint is a *free* simplification: places and transitions land on alternating layers, so the alternation falls out of layering with a parity tweak rather than a separate algorithm. This is a small extension to the shared layout module, not a new engine.

---

## 2. The Vocabulary (what "the standard" actually contains)

This is the full notation. The **v0.1 column** marks what the first release renders; everything else is specified here so the DSL and types don't have to change to add it later. Per the project rule, **v0.1 covers the complete ordinary-P/T-net vocabulary plus the four most common extensions** (inhibitor, read/test, reset arcs; capacity), not a partial subset.

### 2.1 Core elements (ordinary P/T net — Murata 1989, ISO/IEC 15909-1)

| Concept | Meaning | Notation | v0.1 |
|---------|---------|----------|:----:|
| **Place** | a condition / state / resource pool; holds tokens | **circle** ○ | ✅ |
| **Transition** | an event / action; fires to move tokens | **bar** (thin filled rectangle) ▮ — *immediate*; or hollow **box** ▭ — *timed* | ✅ |
| **Arc** | directed flow; **place→transition** or **transition→place** only (never P→P or T→T — bipartite) | arrow → | ✅ |
| **Token** | a unit of marking sitting in a place | filled **dot** ● (1–4 dots laid out in a grid); numeral **n** when count is large | ✅ |
| **Marking** `M` | the assignment of token counts to all places; `M₀` is the initial marking | the set of token dots across the net | ✅ |
| **Arc weight** `w` | multiplicity: tokens consumed/produced per firing (default 1, drawn only when > 1) | numeral on the arc | ✅ |
| **Place label / name** | identifier + optional human label | text beside the circle | ✅ |
| **Transition label / name** | identifier + optional human label (often the action, or `λ`/rate for timed) | text beside the bar | ✅ |
| **Source place** | place with no incoming arcs (WF-net input) | circle, drawn at the start | ✅ (computed + tagged) |
| **Sink place** | place with no outgoing arcs (WF-net output) | circle, drawn at the end | ✅ (computed + tagged) |

### 2.2 Computed dynamics (the differentiator)

| Concept | Meaning | Rendering | v0.1 |
|---------|---------|-----------|:----:|
| **Enabled transition** | every input place `p` has `M(p) ≥ w(p,t)` | highlighted (accent ring / fill) + `data-enabled="true"` | ✅ |
| **Dead transition** | can never be enabled from `M₀` (no input, or an input that can never hold enough) | muted + `data-enabled="false"` | ✅ |
| **Fire a transition** | render the marking *after* firing transition `t` | `fire: T1, T2, …` replays the sequence; the rendered marking is the result | ✅ |
| **Conflict** | two enabled transitions share an input place's tokens (firing one disables the other) | both shown enabled; conflict is annotated in `<desc>` | ✅ (detected) |
| **Reachability graph** | the state space of all reachable markings | a *separate* derived diagram | ⬜ deferred (§11) |
| **Boundedness / safeness / liveness** | analysis properties | reported as warnings in `<desc>` | ⬜ deferred (§11) |

### 2.3 Arc-type extensions

| Arc type | Meaning | Notation | v0.1 |
|----------|---------|----------|:----:|
| **Standard arc** | consume/produce per weight | line, **filled arrowhead** at the target | ✅ |
| **Inhibitor arc** | transition enabled only if the place holds **fewer** than `w` tokens (default: is empty) | line ending in a small **hollow circle** ○ at the transition — *place→transition only* | ✅ |
| **Read / test arc** | tests token presence **without consuming**; bidirectional enabling condition | line with **no arrowhead** (or arrowheads at both ends) | ✅ |
| **Reset arc** | empties the input place when the transition fires, regardless of count | line with a **double / hollow arrowhead** — *place→transition only* | ✅ |
| **Equal / threshold arc** | enabled iff place holds **exactly** `w` (rare; CPN-adjacent) | annotated arc | ⬜ deferred |

### 2.4 Place / transition extensions

| Concept | Meaning | Notation | v0.1 |
|---------|---------|----------|:----:|
| **Capacity** `K(p)` | place may hold at most `K` tokens; firing that would exceed `K` is disabled | `K=n` label; dashed circle border | ✅ |
| **Immediate transition** (GSPN) | fires in zero time, has priority over timed | thin **filled bar** ▮ (the default) | ✅ |
| **Timed / stochastic transition** (GSPN/SPN) | fires after a delay; optional rate `λ` or weight | hollow/white **box** ▭, optional rate label | ✅ |
| **Transition priority** | tie-break among simultaneously-enabled immediate transitions | `prio=n` annotation | ✅ (parsed; affects fire order) |
| **Transition guard** (CPN) | boolean condition gating the firing | `[guard]` beside the bar | ⬜ partial — parsed & rendered as a label, not evaluated |
| **Coloured / typed token** (CPN) | tokens carry a typed value; arcs carry inscriptions | coloured dots; arc expressions | ⬜ deferred (visual colouring in scope, ML inscriptions deferred — §11) |
| **Subnet / page** (hierarchical CPN) | a transition substitutes for a whole subnet | double-bordered substitution transition | ⬜ deferred |

### 2.5 Restricted classes (recognised & validated, not separate render modes)

These are *subclasses* of P/T nets defined by structural constraints. The engine can **detect and tag** them (useful in `<desc>` and for teaching) but renders them with the normal vocabulary:

- **State machine (SM)** — every transition has exactly one input and one output arc (conflict, no concurrency).
- **Marked graph (MG)** — every place has exactly one input and one output arc (concurrency, no conflict).
- **Free-choice (FC)** — shared input places imply shared transition sets (balanced).
- **Workflow net (WF-net)** — one source place, one sink place, every node on a path between them.

---

## 3. Symbol Table

```
Place (0 tokens)     Place (1 token)     Place (3 tokens)     Place (n tokens)
     ╭───╮               ╭───╮               ╭───╮               ╭───╮
     │   │               │ ● │               │● ●│               │ n │
     ╰───╯               ╰───╯               │ ● │               ╰───╯
                                             ╰───╯
   P1 "Ready"

Transition (immediate)   Transition (timed)        Capacity place (K=2)
        ▮                    ┌──┐                       ╭┄┄┄╮
        ▮  ◀ thin bar        │  │  ◀ hollow box         ┆ ● ┆   K=2
        ▮                    └──┘    (rate λ beside)     ╰┄┄┄╯
      T1                    T2 λ=0.5

Standard arc        P ─────────────▶ T        filled arrowhead
Weighted arc        P ──────3──────▶ T        weight numeral (only if > 1)
Inhibitor arc       P ─────────────○ T        hollow circle at transition
Read / test arc     P ─────────────── T       no arrowhead (bidirectional test)
Reset arc           P ════════════▶▶ T        double / hollow arrowhead

Enabled transition  highlighted (accent ring + tint)
Dead transition     muted (low-contrast)

Source place ──▶ … net … ──▶ Sink place      (WF-net: one in, one out)
```

CSS class prefix: `sx-petri-*`. All strokes/fills come from the theme; no inline styles (hard constraint #3).

---

## 4. DSL Grammar

Hand-authorable, indentation-tolerant, AI-friendly. Header keyword is **`petri`** (also accepts `petrinet`). `detect()` matches a first non-comment line beginning with `petri`.

### 4.1 Worked example — the classic example (Wikipedia figure 1)

```
petri "P1 T1 P2/P3 T2 P4"
  place P1 *1
  place P2
  place P3 *2
  place P4 *1
  transition T1
  transition T2

  P1 -> T1
  T1 -> P2
  T1 -> P3
  P2 -> T2
  P3 -> T2
  T2 -> P4
  P4 -> T1          # feedback arc — routes around as a back-edge
```

*Under M₀ = {P1:1, P3:2, P4:1}, T1 is enabled (P1 and P4 both ≥ 1); T2 is not (P2 is empty). The renderer rings T1.*

### 4.2 Producer–consumer with weights, capacity and an inhibitor

```
petri "Producer / Consumer (bounded buffer)"
  layout: lr

  place Produce  *1   "producer ready"
  place Buffer   capacity: 3        "buffer slots"
  place Consume       "consumer ready"
  place Done

  transition put   "deposit"
  transition take  timed rate: 0.8  "withdraw"

  Produce -> put
  put -> Buffer  weight: 1
  put -> Produce               # producer loops back
  Buffer -> take
  take -> Consume
  Consume -> Done
  Full -o put                  # inhibitor: can't deposit while Full is marked
```

### 4.3 EBNF

```ebnf
diagram      = header , { directive | place | transition | arc | marking | fire | comment } ;
header       = "petri" | "petrinet" , [ string ] , newline ;     (* optional title *)

directive    = "layout:" , ("lr" | "tb") , newline
             | "tokens:" , ("dots" | "count" | "auto") , newline ;   (* token render style; default auto *)

(* ---- places ---- *)
place        = "place" , id , [ marking_lit ] , [ "capacity:" , number ]
                       , [ label ] , newline ;
marking_lit  = "*" , number                  (* *3  → 3 tokens            *)
             | "tokens:" , number             (* tokens: 3                 *)
             | dots ;                         (* •••  → 3 tokens (CJK ok)  *)
dots         = ( "•" | "●" ) , { "•" | "●" } ;

(* ---- transitions ---- *)
transition   = "transition" , id , [ kind ] , { trans_attr } , [ label ] , newline ;
kind         = "immediate" | "timed" ;        (* default immediate (filled bar) *)
trans_attr   = "rate:" , number               (* timed firing rate λ        *)
             | "prio:" , number               (* priority among immediates  *)
             | guard ;                         (* [boolean] — rendered only  *)
guard        = "[" , text , "]" ;

(* ---- arcs ---- *)
arc          = id , arrow , id , { arc_attr } , newline ;
arrow        = "->"        (* standard directed arc (P→T or T→P)        *)
             | "-o"        (* inhibitor arc (P→T only): hollow circle    *)
             | "--"        (* read / test arc (no consumption)           *)
             | "=>" ;      (* reset arc (P→T only): empties the place    *)
arc_attr     = "weight:" , number             (* weight: 2                  *)
             | "*" , number                    (* *2  → weight 2             *)
             | label ;                          (* short arc label            *)

(* ---- compact initial marking (alternative to per-place *n) ---- *)
marking      = "marking:" , pair , { "," , pair } , newline ;
pair         = id , "=" , number ;             (* P1=1, P3=2                 *)

(* ---- firing sequence (renders the resulting marking) ---- *)
fire         = "fire:" , id , { "," , id } , newline ;   (* replay T1,T2,…    *)

comment      = ( "#" | "//" ) , text , newline ;

id           = letter , { letter | digit | "_" } ;
label        = string | bareword ;
string       = '"' , { char } , '"' | "「" , { char } , "」" ;   (* CJK quotes ok *)
number       = digit , { digit } ;
```

### 4.4 AI-friendliness rules

Mirrors the project-wide "Made for AI" pillar:

- **CJK quotes** (`「…」`, `『…』`, `"…"`) accepted wherever `"…"` is, and `●`/`•` token dots may be CJK-fullwidth.
- **Auto-declared nodes** are *opt-in but typed by arc role*: an undeclared id can't have its kind inferred safely (is `X` a place or a transition?), so an arc referencing an unknown id is a **readable error** naming the id and line — *not* a silent guess. This is the one place Petri net is stricter than `sequence`, because the bipartite contract must hold.
- **Bipartite check is a first-class error**: a `P -> Q` arc where both are places (or both transitions) reports *"arc connects two places — a Petri net arc must go place→transition or transition→place"* with the offending line.
- **Inhibitor/reset direction check**: `T -o P` (transition→place inhibitor) is rejected — inhibitor and reset arcs are place→transition only — with an explanatory message.
- **Forgiving arrows**: surrounding whitespace optional (`P1->T1` == `P1 -> T1`).
- **Weight and capacity must be positive integers**; `weight: 0` and negative values report a plain-English error.

---

## 5. Layout Rules

Layout is deterministic — no force simulation, no randomness (so golden-string e2e tests are stable). It reuses the `flowchart` layered-DAG primitives with a bipartite parity constraint.

### 5.1 Coordinate model

```
Constants (px):
  PLACE_R              = 18      place circle radius
  TRANS_BAR_W          = 8       immediate-transition bar width
  TRANS_BAR_H          = 44      immediate-transition bar height
  TRANS_BOX_W          = 26      timed-transition box width
  TRANS_BOX_H          = 40      timed-transition box height
  LAYER_GAP            = 70      gap between adjacent layers (flow direction)
  RANK_GAP             = 46      gap between siblings within a layer
  TOKEN_R              = 3.5     token dot radius
  TOKEN_GRID_GAP       = 4       spacing between dots in the 2×2 grid
  TOKEN_COUNT_MAX_DOTS = 4       > 4 tokens render as a numeral
  ARC_WEIGHT_OFFSET    = 7       weight label perpendicular offset from arc
  LABEL_GAP            = 6       node-to-label gap
  ARROW_LEN            = 8       arrowhead length
```

### 5.2 Direction & layering

1. **Flow axis**: `layout: lr` (default, left→right — matches the Wikipedia figures) or `layout: tb` (top→bottom).
2. **Cycle removal**: greedy FAS picks a feedback arc set; reversed arcs are restored as back-edges in routing (the `P4 -> T1` curve in §4.1).
3. **Layer assignment**: longest-path layering on the acyclic remainder. Because the graph is bipartite, layers naturally alternate place / transition. A **parity pass** enforces strict alternation: if layering puts two places on adjacent layers (possible after cycle removal), an invisible routing layer is inserted so a place is never edge-adjacent to a place across a single arc visually.
4. **Within-layer ordering**: barycenter / median crossing reduction (shared with flowchart).
5. **Coordinate assignment**: Brandes-Köpf for the cross-axis; layers are evenly spaced `LAYER_GAP` on the flow axis.

### 5.3 Node rendering

1. **Place** → circle radius `PLACE_R`. Capacity-constrained places get a **dashed** border and a `K=n` label.
2. **Transition** → immediate = filled **bar** (`TRANS_BAR_W × TRANS_BAR_H`); timed = hollow **box** (`TRANS_BOX_W × TRANS_BOX_H`) with the rate label. The long axis of the bar/box is **perpendicular** to the flow axis (vertical bar in `lr`, horizontal bar in `tb`) so arcs meet its broad face — the conventional look.
3. **Tokens** → 1–4 tokens render as dots in a centered grid; > `TOKEN_COUNT_MAX_DOTS` render as the numeral `n` (theme `tokens:` directive can force `dots`/`count`).
4. **Labels** → id and optional human label placed `LABEL_GAP` outside the node on the side that doesn't collide with arcs (above for `lr`, right for `tb`).

### 5.4 Arc routing

1. Arcs attach to node boundaries (circle edge / bar face), not centers.
2. **Forward arcs** route straight or with a single orthogonal bend (shared flowchart router).
3. **Back-edges** (reversed during cycle removal) route as a smooth curve around the outside of the layered band — the characteristic Petri-net feedback loop.
4. **Weight labels** sit at the arc midpoint, offset `ARC_WEIGHT_OFFSET` perpendicular, drawn **only when weight > 1**.
5. **Arrowhead by arc type**: filled triangle (standard), hollow circle (inhibitor), none (read/test), double/hollow triangle (reset).

### 5.5 Enabled-transition highlight

After layout, the engine evaluates `M₀` (or the marking after a `fire:` sequence): a transition is ringed/tinted with the enabled token when every input place satisfies its arc weight (and, for inhibitor inputs, holds *fewer* than the inhibitor weight; for capacity, firing wouldn't overflow an output). Dead transitions are muted.

---

## 6. Styles & Theme Design

> This is the section Victor asked for: how Petri net visuals are derived from the existing Schematex token system, consistently with the other 33 diagrams.

### 6.1 Where Petri net sits in the theme taxonomy

Schematex has two visual stances (see `00-OVERVIEW.md` §Theme System):

- **`IndustrialTokens`** — circuit / ladder / SLD / logic / FBD / SFC: *forced monochrome* under IEEE 315 / IEC 61131-3, no colourful variant by design.
- **`BaseTheme` + a semantic extension** — most others (timeline, flowchart, venn, pert): a tasteful house palette in `default`, true black/white in `monochrome`, Catppuccin in `dark`.

**Petri net belongs to the second group, not the first.** It is a CS/mathematics formalism, not an IEC/IEEE compliance drawing. The canonical reference (Murata 1989) *is* black-and-white — so `monochrome` must reproduce the textbook look faithfully — but academic and industrial tools (PIPE green transitions, CPN Tools coloured tokens, GreatSPN) freely use colour, so a tasteful `default` colour theme is legitimate and useful for the web gallery. This mirrors exactly how **`pert`** handles it: house-blue body with one reserved semantic accent (red = critical path there; here, **green = enabled, red = inhibitor/dead**).

### 6.2 The `PetriTokens` semantic extension

Add to `src/core/theme.ts`, alongside `TimelineTokens` / `FlowchartTokens`:

```ts
export interface PetriTokens {
  placeFill: string;        // circle interior
  placeStroke: string;      // circle border
  transitionBarFill: string;// immediate transition (solid bar) — the "ink" colour
  transitionBoxFill: string;// timed transition (hollow box) interior
  transitionStroke: string; // transition border
  tokenFill: string;        // marking dot colour
  /** Enabled (fireable) transition highlight. Green = "go". Reserved accent #1. */
  enabledStroke: string;
  enabledFill: string;      // tint behind an enabled transition
  /** Dead / disabled transition — muted. */
  deadStroke: string;
  /** Inhibitor + reset arcs and the dead-token marker. Red = "blocks". Reserved accent #2. */
  inhibitorStroke: string;
  arcStroke: string;        // standard arc colour (= base stroke)
  weightLabel: string;      // arc-weight numerals
  /** Coloured-token (CPN) palette — reuses BaseTheme.palette. */
  tokenPalette: readonly string[];
}
```

`resolvePetriTheme(name)` follows the established pattern: `{ ...BASE_THEMES[name], ...PETRI_TOKENS[name] }`.

### 6.3 Per-theme values

**`default`** — house blue-grey, derived from `DEFAULT_THEME` tokens (no new magic hex):

| Token | Value | Rationale |
|-------|-------|-----------|
| `placeFill` | `#ffffff` (`fill`) | clean white circle |
| `placeStroke` | `#334155` (`stroke`) | slate body line |
| `transitionBarFill` | `#334155` (`stroke`) | solid "ink" bar — reads as the canonical filled transition |
| `transitionBoxFill` | `#ffffff` (`fill`) | hollow timed box |
| `transitionStroke` | `#334155` (`stroke`) | |
| `tokenFill` | `#0f172a` (`text`) | dark, high-contrast marking dot |
| `enabledStroke` | `#059669` (`positive`) | **green = enabled** |
| `enabledFill` | `#ecfdf5` (positive 50, soft tint) | |
| `deadStroke` | `#94a3b8` (`neutral`) | muted |
| `inhibitorStroke` | `#dc2626` (`negative`) | **red = inhibitor / blocks** |
| `arcStroke` | `#334155` (`stroke`) | |
| `weightLabel` | `#2563eb` (`accent`) | weights pop in house blue, like net labels elsewhere |
| `tokenPalette` | `DEFAULT_PALETTE` | CPN coloured tokens |

**`monochrome`** — faithful Murata 1989 textbook (the compliance-grade / print stance):

| Token | Value |
|-------|-------|
| `placeFill` | `#ffffff` |
| `placeStroke` | `#000000` |
| `transitionBarFill` | `#000000` (solid black bar) |
| `transitionBoxFill` | `#ffffff` |
| `transitionStroke` | `#000000` |
| `tokenFill` | `#000000` |
| `enabledStroke` | `#000000` — *colour can't carry meaning in mono*, so **enabled is shown by a doubled/bold ring**, not green |
| `enabledFill` | `none` |
| `deadStroke` | `#888888` |
| `inhibitorStroke` | `#000000` — inhibitor is shown by its **hollow-circle head**, not colour |
| `arcStroke` | `#000000` |
| `weightLabel` | `#000000` |
| `tokenPalette` | `MONOCHROME_PALETTE` |

> Note the principle (shared with `venn`/`industrial`): in `monochrome`, semantics that ride on colour in `default` must fall back to a **shape/weight** distinction — bold ring for enabled, the hollow-circle arrowhead for inhibitor — so a black-and-white print is still unambiguous.

**`dark`** — Catppuccin Mocha, mirroring `DARK_THEME`:

| Token | Value |
|-------|-------|
| `placeFill` | `#313244` (`fill`) |
| `placeStroke` | `#cdd6f4` (`stroke`) |
| `transitionBarFill` | `#cdd6f4` (light bar on dark) |
| `transitionBoxFill` | `#313244` |
| `transitionStroke` | `#cdd6f4` |
| `tokenFill` | `#cdd6f4` |
| `enabledStroke` | `#a6e3a1` (`positive` green) |
| `enabledFill` | `rgba(166,227,161,0.15)` |
| `deadStroke` | `#6c7086` (`neutral`) |
| `inhibitorStroke` | `#f38ba8` (`negative` red) |
| `arcStroke` | `#cdd6f4` |
| `weightLabel` | `#89b4fa` (`accent`) |
| `tokenPalette` | `DARK_PALETTE` |

### 6.4 Stroke & type scale (reuse `theme.ts` constants)

- Place / transition / arc body strokes: `STROKE_WIDTH.normal` (2).
- Enabled-ring emphasis: `STROKE_WIDTH.thick` (3) — same emphasis convention as proband/critical-path elsewhere.
- Capacity dashed border: `STROKE_WIDTH.thin` (1), dash `4 3`.
- Node id label: `FONT_SIZE.label` (12); arc weight & rate: `FONT_SIZE.small` (9); title: `FONT_SIZE.title` (16).
- Font: `DEFAULT_FONT_FAMILY`.

### 6.5 House-style rule (one sentence to remember)

**Body in `stroke`/`text` neutrals; green (`positive`) reserved for "enabled", red (`negative`) reserved for "inhibitor / dead"; blue (`accent`) only for weight & rate annotations; colour falls back to shape in `monochrome`.** This keeps Petri net visually a member of the `pert`/`flowchart`/`timeline` family rather than the forced-mono industrial family.

---

## 7. Legend

By the project's auto-derive legend rules (`LEGEND-SYSTEM.md`): the universal conventions — circle = place, bar = transition, dot = token, arrow = arc — are textbook common knowledge and **not** listed. The legend auto-derives entries **only** for encodings actually used and non-obvious:

- enabled-transition highlight (green ring) — when any transition is enabled;
- inhibitor arc (hollow-circle head) — when one is present;
- reset / read arc — when present;
- timed transition (hollow box + rate) — when present;
- capacity (dashed border) — when present;
- coloured-token classes (CPN) — when present.

DSL controls follow the shared system: `legend: on/off/<position>`, `legend.title:`, etc. Default position `bottom-inline`.

---

## 8. Output Contract

- Root `<svg>` carries `data-diagram-type="petri"`, `role="img"`, `aria-label` = title or "Petri net".
- `<title>` / `<desc>` summarise place / transition / arc counts, the initial marking, the enabled-transition set, and any detected subclass (state machine / marked graph / free-choice / workflow net) and conflicts.
- Places: `<g class="sx-petri-place" data-id="…" data-tokens="n" [data-capacity="K"] [data-source] [data-sink]>`.
- Transitions: `<g class="sx-petri-transition" data-id="…" data-kind="immediate|timed" data-enabled="true|false" [data-rate] [data-prio]>`.
- Arcs: `<g class="sx-petri-arc" data-from="…" data-to="…" data-type="standard|inhibitor|read|reset" data-weight="n">`.
- Tokens: `<g class="sx-petri-tokens">` with one `<circle class="sx-petri-token">` per dot, or `<text>` for the numeral.
- Theme via `resolvePetriTheme`; strokes/fills from tokens only — no inline styles.

---

## 9. Canonical Test Cases

Fixtures the implementation must satisfy (parser + layout + golden-string e2e). Each lists the DSL and the assertions that matter.

### TC-1 — Minimal P→T→P, marking & enablement
```
petri
  place P1 *1
  transition T1
  place P2
  P1 -> T1
  T1 -> P2
```
*Assert:* 2 places, 1 transition, 2 arcs, bipartite valid; P1 renders 1 token dot; T1 is **enabled** (P1 ≥ 1) → green ring + `data-enabled="true"`; layout places P1, T1, P2 on 3 alternating layers in `lr`.

### TC-2 — The Wikipedia classic (concurrency + feedback)
```
petri "classic"
  place P1 *1
  place P2
  place P3 *2
  place P4 *1
  transition T1
  transition T2
  P1 -> T1
  T1 -> P2
  T1 -> P3
  P2 -> T2
  P3 -> T2
  T2 -> P4
  P4 -> T1
```
*Assert:* `P4 -> T1` detected as a cycle, reversed for layering, routed as a back-edge curve; T1 enabled (P1, P4 ≥ 1), T2 dead under M₀ (P2 empty); P3 shows 2 dots; no weight labels (all weight 1).

### TC-3 — Weights, capacity, timed transition
```
petri
  place Buffer capacity: 3
  place Src *5
  transition gen
  transition timed_take timed rate: 0.8
  place Out
  Src -> gen
  gen -> Buffer weight: 1
  Buffer -> timed_take
  timed_take -> Out
```
*Assert:* Buffer has a dashed border + `K=3` and `data-capacity="3"`; `timed_take` renders as a hollow box with `λ=0.8`, `data-kind="timed"`; Src shows numeral `5` (> 4 dots); `gen` enabled.

### TC-4 — Inhibitor arc + bipartite error guard
```
petri
  place Lock
  place Work *1
  transition run
  place Done
  Work -> run
  run -> Done
  Lock -o run
```
*Assert:* `Lock -o run` renders with a hollow-circle head, `data-type="inhibitor"`; `run` is **enabled** because Lock is empty (inhibitor satisfied) and Work ≥ 1. *Negative test:* adding `run -o Lock` (transition→place inhibitor) raises the directional error; adding `Work -> Lock` (place→place) raises the bipartite error, each naming the offending line.

### TC-5 — Fire sequence renders the resulting marking
```
petri
  place P1 *1
  transition T1
  place P2
  transition T2
  place P3
  P1 -> T1
  T1 -> P2
  P2 -> T2
  T2 -> P3
  fire: T1
```
*Assert:* after firing T1, the rendered marking is {P1:0, P2:1, P3:0}; P1 shows 0 dots, P2 shows 1; now **T2** is the enabled one (not T1); `<desc>` records the fired sequence and resulting marking.

---

## 10. Deviations From the Standard

- **Transition shape default.** ISO/IEC 15909-1 allows both a thin bar and a rectangle for transitions. Schematex defaults the *immediate* transition to a thin filled **bar** (Murata's figures, and the most recognisable) and reserves the hollow **box** for *timed* transitions (GSPN convention), so the two are visually distinct in one net. A net with no timed transitions is therefore all-bars — the textbook look.
- **Token rendering threshold.** Tokens render as dots up to 4, then as a numeral. The standard is silent on the cutoff; 4 is the common tool convention (PIPE, CPN Tools) and keeps the 2×2 dot grid legible.
- **Weight 1 hidden.** Per universal convention, weight-1 arcs draw no numeral. Only weights > 1 are labelled.
- **No formal analysis in v0.1.** The engine computes *enablement* and *one-step firing* (cheap, local, high-value). Full reachability-graph construction, boundedness/liveness/safeness analysis, and invariants (P-/T-invariants) are deferred (§11) — they are exponential in general and belong to a separate analysis pass, not the renderer.
- **Inhibitor/reset are P→T only.** Mathematically these only make sense from a place to a transition; the parser enforces it rather than silently rendering a meaningless reversed arc.

---

## 11. Deferred (post-v0.1)

Each has a slot in §2 so adding it is additive — no DSL or type breakage:

- **Coloured Petri nets (CPN, ISO/IEC 15909-1 high-level nets)** — typed/coloured tokens beyond palette colouring, arc inscriptions, and *evaluated* guards (CPN-ML). v0.1 renders coloured token dots and a guard *label* but does not evaluate them.
- **Reachability graph** — the derived state-space diagram (markings as nodes, firings as edges); a separate diagram product.
- **Property analysis** — boundedness, safeness, liveness levels (L0–L4), deadlock detection, P-/T-invariants; reported as `<desc>` warnings.
- **Hierarchical / substitution transitions** (CPN pages) — a transition standing for a whole subnet.
- **Stochastic analysis** — converting a GSPN to its underlying Markov chain for steady-state probabilities.
- **PNML import/export** (ISO/IEC 15909-2) — round-trip with the XML interchange format.
- **Threshold / equal arcs** — the rarer arc semantics.
- **Time/duration constraints on timed transitions** beyond a scalar rate label (intervals, deterministic delays).
```
