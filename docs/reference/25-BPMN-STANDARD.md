# 25 — BPMN (Business Process Model and Notation) Standard Reference

*OMG BPMN 2.0 / ISO/IEC 19510:2013 — pools and lanes, events, gateways, tasks, and message flows for documenting business processes. Schematex implements the visual subset of BPMN that real-world business analysts actually draw, with a text DSL designed for AI generation rather than the verbose BPMN 2.0 XML serialization.*

> **Primary References:**
> - **OMG.** *Business Process Model and Notation (BPMN), Version 2.0.* Document **formal/2011-01-03**, January 2011 — https://www.omg.org/spec/BPMN/2.0/
> - **OMG.** *BPMN 2.0.2.* Document **formal/2013-12-09** with errata **formal/2014-01-04** — https://www.omg.org/spec/BPMN/2.0.2/
> - **ISO/IEC 19510:2013** — *Information technology — Object Management Group Business Process Model and Notation* (July 2013, technically equivalent to BPMN 2.0.1) — https://www.iso.org/standard/62652.html
> - **Silver, Bruce** (2011). *BPMN Method and Style, 2nd Edition, with BPMN Implementer's Guide*. Cody-Cassidy Press. ISBN 978-0982368114. — *De-facto modelling style guide; cited more in practice than the spec itself.*
> - **Freund, Jakob & Rücker, Bernd** (2019). *Real-Life BPMN: Includes an Introduction to DMN*, 4th ed., Camunda. ISBN 978-1086302097.
> - **Dumas, La Rosa, Mendling, Reijers** (2018). *Fundamentals of Business Process Management*, 2nd ed., Springer. ISBN 978-3662565087.
> - **Allweyer, Thomas** (2016). *BPMN 2.0: Introduction to the Standard for Business Process Modeling*, 2nd ed., Books on Demand. ISBN 978-3837535044.
> - **Chinosi, M. & Trombetta, A.** (2012). "BPMN: An introduction to the standard." *Computer Standards & Interfaces* **34**(1), 124–134.
> - **Wohed et al.** (2006). "On the suitability of BPMN for business process modelling." BPM 2006 — workflow-pattern coverage analysis.
> - **bpmn.io / bpmn-js** (Camunda) — MIT-licensed reference renderer at https://bpmn.io.
> - **Ivanchikj & Pautasso** (2019). *Sketching process models by mining participant stories*, BPM Forum — closest academic prior art for text-input BPMN (BPMN Sketch Miner).

**Positioning.** BPMN is the dominant notation for modelling business processes in enterprises (banking, insurance, healthcare, supply chain, government, audit/compliance). Every major BPM tool (Camunda, Bizagi, Signavio, Activiti, Flowable, jBPM, Bonita, IBM, Trisotech) reads and writes it. **No widely-adopted text DSL exists** — the only canonical serialization is BPMN 2.0 XML, which is verbose, namespace-heavy, and hostile to LLM generation. Schematex closes that gap.

**Relation to existing schematex engines.**

| Engine | Coverage | Why BPMN is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision / architecture (Sugiyama DAG) | No pools/lanes, no event taxonomy, no message-flow distinction, no gateway taxonomy beyond "diamond". |
| `state` (§21, UML 2.5 / Harel) | State machines | State-centric (modes, transitions); BPMN is activity-centric (actions, gateways, swim lanes). |
| `pid` (§22, ISA-5.1) | Industrial process & instrumentation | Physical equipment; BPMN models **organizational** processes. |
| `sfc` (§24, IEC 61131-3) | Sequential function chart for PLCs | Step/transition machine for programmable controllers; BPMN is for human + system business processes. |

`flowchart` users repeatedly ask for pools/lanes, event types and message flows; `bpmn` is the right home for those.

---

## 1. Users & Needs

### 1.1 Personas

| Role | Scenario | Frequency | Why flowchart isn't enough |
|---|---|---|---|
| **Business Analyst** | AS-IS / TO-BE process documentation, requirements elicitation | Daily | Needs pools (departments) + lanes (roles) + start/end event semantics |
| **BPM Consultant** (Capgemini, Accenture, EY, Deloitte) | Client process maps, ISO 9001 audits | Daily | Needs BPMN-conformant export for client deliverables |
| **Enterprise Architect** | AS-IS landscape, integration blueprints | Weekly | Needs message flows between systems, not just sequence flows |
| **Compliance / Audit** (SOX, ISO 27001, HIPAA) | Process documentation for regulators | Monthly–quarterly | Auditors expect BPMN, not generic flowchart |
| **RPA Designer** (UiPath, Automation Anywhere, Blue Prism) | Human-readable layer above bot scripts | Weekly | Needs user/service task distinction |
| **ERP Integrator** (SAP, Oracle, Workday) | Change-management process maps | Weekly | Needs gateway taxonomy (XOR vs OR vs AND) for branch logic |
| **Process-Mining User** (Celonis, ProcessGold) | Visualize discovered processes | Weekly | Output of mining is BPMN by convention |
| **OR/IS Researcher / Student** | Coursework, papers | Term-paced | Textbook BPMN required |
| **LLM (ChatDiagram generation side)** | "Generate the loan approval process" | Daily, thousands of times | Cannot produce 200-line BPMN XML reliably; needs compact DSL |

### 1.2 What Schematex must do better than the alternatives

1. **Compact text DSL.** A 12-element process should be ~15 lines, not 200 lines of XML.
2. **Pools + lanes as first-class.** Single biggest friction with Mermaid flowchart.
3. **Full event taxonomy** (start / intermediate / end × thirteen trigger types × catch/throw).
4. **Sequence flow vs message flow** as distinct connector types.
5. **Gateway taxonomy** (exclusive / inclusive / parallel / complex / event-based).
6. **AI-friendly error messages** — when `gateway type=parallel` is followed by a conditional flow, report the violation in plain English.
7. **Validation that matches OMG semantics** — sequence flow does not cross pool boundaries, black-box pools have no internal flow, etc.
8. **Embeddable SVG output** — no Java applet, no desktop install, no XML round-trip with broken DI.

---

## 2. Market Need

### 2.1 Search-volume signal (qualitative)

I do not quote precise keyword-tool numbers in this doc; magnitudes below are training-corpus impressions and should be re-validated with Ahrefs before any go-to-market decision.

| Term cluster | Volume tier | Intent |
|---|---|---|
| `bpmn`, `bpmn diagram`, `bpmn 2.0` | High six-figure monthly globally | Educational + tool research |
| `bpmn online`, `bpmn editor`, `bpmn tool` | Tens of thousands monthly | Transactional |
| `free bpmn tool` | Low thousands monthly | Cost-sensitive transactional |
| `bpmn ai`, `bpmn from text` | Rising; small but steep slope | AI-era opportunity |

The volume is roughly **2–5× larger than `flowchart`** because BPMN is taught as a professional skill (BPM certifications, university IS programs) and required for many compliance deliverables.

### 2.2 Competitive landscape

| Product | Positioning | License | Key gap |
|---|---|---|---|
| **Camunda Modeler / bpmn.io** | Best-in-class GUI authoring | MIT (bpmn-js) | XML-only; no DSL; not embeddable as a library |
| **Bizagi Modeler** | Free Windows authoring | Freemium | Windows-only; GUI-only |
| **Signavio Process Manager** | Enterprise SaaS | Commercial (SAP) | Paywalled; closed |
| **Microsoft Visio (BPMN stencil)** | Diagramming + BPMN shapes | Commercial | Hand-drawn; no validation |
| **draw.io BPMN shapes** | Free shape library | Apache | Just shapes; no semantics |
| **IBM Blueworks Live, Trisotech** | Enterprise BPM suites | Commercial | Closed; expensive |
| **Yaoqiang BPMN Editor** | Open-source desktop | LGPL | Dated UX |
| **Mermaid `flowchart`** | Markdown-native DSL | MIT | No pools/lanes/events/messages — it's a flowchart, not BPMN |
| **PlantUML** | Markdown DSL | GPL | No native BPMN |

**Schematex differentiation:**
- Only **BPMN-conformant text DSL** with a free, embeddable renderer.
- Zero runtime dependency, KB-scale bundle, SSR-safe.
- AI-native: a 12-element process is ~15 lines of DSL.
- Output-only renderer (no XML round-trip), avoiding the chronic DI-portability bugs.

---

## 3. Standard Compliance

### 3.1 What we implement

**OMG BPMN 2.0.2 visual subset** — the elements listed in §4 below — rendered with conformant geometry, line styles, and fill conventions. Schematex is a **rendering library**, not an execution engine; we do not implement the BPMN 2.0 execution semantics, the meta-model, or the DI (Diagram Interchange) layer.

### 3.2 What we deliberately omit

| Omitted | Why |
|---|---|
| BPMN 2.0 XML import/export | Verbose; not the value-add. Future export adapter possible but not v1. |
| Choreography diagrams (BPMN ch.11) | Niche; <5% of real-world BPMN |
| Conversation diagrams (BPMN ch.12) | Even more niche |
| CMMN / DMN | Sister OMG standards; deserve their own engines |
| Execution semantics (token flow simulation) | Out of scope for a renderer |

### 3.3 Style adherence

We follow Bruce Silver's **BPMN Method & Style** by default — these are the conventions enforced/encouraged in DSL and rendering:

- Sequence flow stays inside its pool (validation error if violated).
- Black-box pools have no internal flow (validation error if violated).
- Exclusive gateway is rendered with the **X glyph** by default (Silver's preference; spec allows empty diamond too).
- Filled vs unfilled event glyph correctly distinguishes throw vs catch.
- One start event per process by default; multiple ends are fine but warn on dangling sub-processes.

---

## 4. Symbol Catalog

All elements are categorised per OMG spec §10 *Process Diagram*: **Flow Objects, Connecting Objects, Swimlanes, Artifacts, Data**.

### 4.1 Events (Flow Objects, circles)

Stroke weight encodes lifecycle role:

| Event | Stroke | Geometry | DSL keyword |
|---|---|---|---|
| **Start** | thin single line (1px) | circle r=18 | `start` |
| **Intermediate** | thin double line (2 concentric, gap 3px) | r=18 outer | `intermediate` |
| **End** | thick single line (3px) | r=18 | `end` |
| **Event Subprocess Start (interrupting)** | thin single | r=18 | `event-start interrupting` |
| **Event Subprocess Start (non-interrupting)** | thin **dashed** single | r=18 | `event-start non-interrupting` |
| **Boundary (interrupting)** | thin double, attached to activity edge | r=14 | `boundary` (default) |
| **Boundary (non-interrupting)** | thin **dashed** double | r=14 | `boundary non-interrupting` |

**Trigger types** (the inner glyph):

| Trigger | Inner glyph | Start | Intermediate | End | Catch / throw |
|---|---|---|---|---|---|
| None | empty | ✓ | rare | ✓ | n/a |
| **Message** | envelope | ✓ | ✓ | ✓ | both (filled = throw) |
| **Timer** | clock | ✓ | catch only | — | catch |
| **Error** | lightning bolt | event-subproc only | catch (boundary) | throw | both |
| **Escalation** | up arrow | event-subproc | both | throw | both |
| **Cancel** | × | — | catch (transaction boundary) | throw | both |
| **Compensation** | rewind ◀◀ | event-subproc | both | throw | both |
| **Conditional** | lined paper | ✓ | catch | — | catch |
| **Link** | arrow-in-circle | — | both (off-page connector) | — | both |
| **Signal** | triangle | ✓ | both | ✓ | both (filled = throw) |
| **Terminate** | filled disk | — | — | ✓ | throw |
| **Multiple** | pentagon | ✓ | both | ✓ | both |
| **Parallel-Multiple** | + | ✓ | catch | — | catch |

**Catch vs throw rule:** unfilled inner glyph = catch; **filled (solid black) inner glyph = throw**. Easiest mistake LLMs make.

### 4.2 Activities (rounded rectangles, corner radius 10px)

| Activity | Border | DSL keyword |
|---|---|---|
| Task | thin single | `task` |
| Subprocess (collapsed) | thin single + `+` marker bottom-center | `subprocess` |
| Subprocess (expanded) | thin single, contains nested flow | `subprocess { ... }` |
| Call activity | **thick** single border | `call` |
| Transaction | **double** thin border | `transaction` |
| Event subprocess | **dashed** border | `event-subprocess` |
| Ad-hoc subprocess | `~` marker bottom-center | `subprocess adhoc` |

**Task type marker** (small icon top-left):

| Marker | Icon | DSL |
|---|---|---|
| User | bust silhouette | `task user` |
| Service | gears | `task service` |
| Send | filled envelope | `task send` |
| Receive | unfilled envelope | `task receive` |
| Manual | hand | `task manual` |
| Business Rule | horizontal-lined table | `task rule` |
| Script | scroll | `task script` |
| Abstract | none | `task` |

**Activity loop / instance markers** (bottom-center, can combine with subprocess `+`):

| Marker | Icon | DSL |
|---|---|---|
| Loop | circular arrow | `loop` |
| Multi-instance parallel | three vertical bars | `multi parallel` |
| Multi-instance sequential | three horizontal bars | `multi sequential` |
| Compensation | rewind ◀◀ | `compensation` |

(Multi-instance and loop are mutually exclusive on the same activity — validation enforced.)

### 4.3 Gateways (diamonds, ~50px)

| Gateway | Inner glyph | Semantics | DSL |
|---|---|---|---|
| Exclusive (XOR) | thin **X** (Silver default) or empty | one-of-N, data-based | `gateway xor` |
| Inclusive (OR) | **O** | one-or-more | `gateway or` |
| Parallel (AND) | **+** | all branches | `gateway and` |
| Complex | **\*** | custom condition | `gateway complex` |
| Event-based | pentagon in single circle | one-of-N, event-based | `gateway event` |
| Exclusive Event-based (instantiate) | pentagon in **single** circle, double border | starts new instance | `gateway event-start xor` |
| Parallel Event-based (instantiate) | + in **single** circle, double border | starts instance, all events | `gateway event-start and` |

### 4.4 Connecting Objects

| Connector | Line | Arrowhead | Notes | DSL |
|---|---|---|---|---|
| Sequence flow | solid | solid filled triangle | within a pool only | `-->` |
| Conditional sequence flow | solid | filled triangle + small **diamond** at source | only when leaving an activity directly (not gateway) | `--?-->` |
| Default flow | solid | filled triangle + **slash** at source | one per gateway | `--*-->` |
| Message flow | **dashed** | **open** triangle + small unfilled circle at source | crosses pool boundaries — only legal cross-pool connector | `~~>` |
| Association | dotted | none / open line arrow | links artifacts to flow objects | `-..-` |
| Data association | dotted | open line arrow | data-flow direction | `-..->` |

### 4.5 Swimlanes

- **Pool** — large rectangle, name on left edge rotated 90°. Represents one participant (organisation, role, system). DSL: `pool "Customer" { ... }`.
- **Lane** — subdivision inside a pool. Lanes can nest. DSL: `lane "Clerk" { ... }`.
- **Black-box pool** — empty rectangle, no internal flow. Used for external participants whose process is unknown. DSL: `pool "Customer" blackbox`.
- Orientation — horizontal is the convention (LTR flow). Vertical pools (TTB flow) supported via `direction: TB`.

### 4.6 Artifacts and Data

| Element | Shape | DSL |
|---|---|---|
| Data Object | rectangle with folded top-right corner | `data "Order"` |
| Data Object Collection | + three vertical bars at bottom | `data "Orders" collection` |
| Data Input | data object with **unfilled** small arrow top-left | `data "Form" input` |
| Data Output | data object with **filled** small arrow top-left | `data "Receipt" output` |
| Data Store | cylinder | `store "OrderDB"` |
| Group | rounded rect, **dashed** border, no flow effect | `group "Phase 1" { ... }` |
| Text Annotation | open square bracket `[` + text, dotted association | `note "..."` |

---

## 5. DSL Grammar

### 5.1 Header

```
bpmn
direction: LR | TB        // default LR
title: "Loan Application Approval"
```

### 5.2 Pools and lanes

```
pool "Customer" blackbox

pool "Bank" {
  lane "Clerk" {
    A: start "Application received"
    B: task user "Check completeness"
    G1: gateway xor "Complete?"
  }
  lane "Underwriter" {
    C: task service "Risk score"
    D: task user "Review"
    G2: gateway xor "Decision"
  }
  lane "System" {
    E: end "Approved"
    F: end "Rejected"
  }
}
```

Each element starts with an **id : kind "label"** triple. The id is referenced by flow lines.

### 5.3 Flow lines (after the pool block)

```
flows
A --> B
B --> G1
G1 --? "yes" --> C
G1 --? "no" --> F
C --> D
D --> G2
G2 --? "approve" --> E
G2 --* "default" --> F     // default flow (slash)
```

Conditional flow `--?-->` carries a label expression; default flow `--*-->` is the no-condition branch (one per gateway).

### 5.4 Message flows (cross-pool)

```
flows
"Customer" ~~> A : "Submit application"
E ~~> "Customer" : "Notify approval"
```

Message flow source/target may be a pool name (black-box) or a flow object id.

### 5.5 Boundary events

```
B: task user "Review"
B@boundary: timer "48h" non-interrupting --> notify
```

`@boundary` attaches a boundary event to its parent activity. `non-interrupting` makes it a dashed double-circle.

### 5.6 Subprocesses

```
S: subprocess "Verify identity" {
  S.start: start
  S.t1:    task service "OCR"
  S.t2:    task service "Match face"
  S.end:   end
  S.start --> S.t1 --> S.t2 --> S.end
}
```

Collapsed form: `S: subprocess "Verify identity" collapsed`.
Expanded form: as above.

### 5.7 Markers

```
T: task service "Send invoice" multi parallel
S: subprocess "Process item" multi sequential loop
```

### 5.8 Artifacts

```
data "Application form" input -.- B
data "Decision letter" output -.- E
group "Decision phase" { D, G2 }
note "SLA: 24h" -.- D
```

### 5.9 Validation rules (parser-enforced)

- Sequence flow source and target must be in the same pool.
- Message flow source and target must be in different pools (or a pool and its black-box counterpart).
- A black-box pool must contain zero flow objects.
- A gateway has at most one default flow.
- Multi-instance and loop markers are mutually exclusive on the same activity.
- Boundary events must reference an existing activity id.
- Every flow element id must be unique within its enclosing pool.

### 5.10 Theme tokens

Beyond `BaseTheme`, BPMN uses a small extension `BpmnTokens`:

```ts
interface BpmnTokens {
  pool: { fill: string; stroke: string; labelBg: string };
  lane: { fill: string; stroke: string };
  task: { fill: string; stroke: string };
  gateway: { fill: string; stroke: string };
  event: { startStroke: string; intermediateStroke: string; endStroke: string };
  messageFlow: { stroke: string; dashArray: string };
  dataObject: { fill: string; stroke: string };
}
```

Three presets: `default` (corporate blue), `monochrome` (BW/print), `dark`.

---

## 6. Layout Rules

### 6.1 Pools

- Horizontal pools stacked vertically (default LR).
- Pool label rotated 90° on left edge, padding 8px.
- Lane partitions are horizontal lines inside the pool; lane height auto-fits its tallest element + 20px padding; lane label rotated 90° at lane left edge inside pool label column.

### 6.2 Flow objects within a lane

- Sugiyama-layered LR layout (same primitives as `flowchart` §14): cycle removal → layer assignment → barycenter ordering → Brandes-Köpf x-coordinate.
- Layer spacing default: 90px horizontal.
- Inter-element vertical spacing default: 60px.
- Gateway centers align with predecessor activity centers.

### 6.3 Sequence-flow routing

- Manhattan / orthogonal with right-angle bends.
- Snap to 10px grid.
- Long edges use dummy-node insertion for clean bends.
- Conditional flow diamond at source end (offset 6px from activity edge).
- Default flow slash at source end (8px stroke, 45° angle).
- Edge labels positioned at first-bend midpoint with 4px halo background to avoid line overlap.

### 6.4 Message-flow routing

- Always crosses pool boundaries.
- Dashed stroke (4-2 pattern), open arrowhead.
- Small unfilled circle (r=3) at source end.
- Routed orthogonally; vertical segment lengths balance pool gaps.

### 6.5 Boundary events

- Positioned on the **bottom edge** of the parent activity by default; user can specify `@boundary top|bottom|left|right`.
- Visually overlap activity edge by 50% of event diameter.
- Outgoing flow exits from the event center, not the activity edge.

### 6.6 Subprocess (expanded)

- Drawn as a container box; contained nodes laid out recursively with the same algorithm.
- Container grows to fit content + 16px padding.
- Subprocess `+` marker shown only when collapsed.

---

## 7. Canonical Test Cases

All five must round-trip through the rendering pipeline (parser → layout → SVG) without warnings.

### 7.1 Pizza order (the OMG tutorial classic)

Two pools — Customer (black-box) and Pizzeria (lanes: Order Clerk / Chef / Delivery). 5 tasks, 2 message flows (order placed / pizza delivered), 1 timer intermediate event ("60 min"), 1 exclusive gateway (pizza ok? rework / accept). ~12 elements. *The* hello-world for BPMN.

### 7.2 Loan application approval

Single pool, two lanes (Clerk, Underwriter). Start → Receive Application → Check Completeness (XOR: incomplete → return / complete → continue) → Risk Score (service task) → Underwriter Review (user task) → XOR (approve / reject) → 2 end events. ~10 elements. Exercises user vs service task markers and gateway joins.

### 7.3 Travel booking with compensation

Single pool, transaction subprocess containing Book Flight → Book Hotel → Book Car (parallel via AND gateway). Each task has a compensation boundary event linked to a "Cancel Booking" compensation task. End with cancel end event on transaction failure. ~14 elements. Exercises transaction boundary, compensation, parallel gateway.

### 7.4 Customer support ticket with escalation timer

Single pool, three lanes (L1, L2, Manager). User task "Triage" → XOR (simple / complex) → simple resolves; complex routes to L2 with a non-interrupting timer boundary event ("48h elapsed" → notify Manager via signal throw). Message flow to external Customer (black-box pool) on resolution. ~13 elements. Exercises non-interrupting boundary timer, signal events, black-box pool.

### 7.5 E-commerce checkout with payment retries

Single pool. Start (message) → Validate Cart → Reserve Inventory → Charge Card (service task) with error boundary event → loop subprocess "Retry Payment" (max 3) → XOR (success → confirm; final fail → release inventory via compensation, end with error). ~15 elements. Exercises message start, error boundary, loop marker, compensation, error end event.

---

## 8. Pitfalls & Gotchas

These are the BPMN-specific footguns that a parser and a renderer must catch:

1. **Filled vs unfilled event glyph** = throw vs catch. The number-one mistake LLMs make. Validator rejects throw events with downstream incoming edges.
2. **Sequence flow must not cross pool boundaries.** Use message flow. Hard validation error.
3. **Exclusive gateway has two visual forms** (empty diamond, X-marked). Same semantics. Schematex picks **X by default** (Silver style); `gateway xor empty` is an opt-out alias.
4. **Conditional-flow diamond marker** is at the source end, **only when leaving an activity directly** (not when leaving a gateway). At a gateway, the condition is a label, not a glyph.
5. **Default-flow slash** is at the source end, not the target end. One default flow per gateway maximum.
6. **Black-box pools must contain zero internal elements.** Validators reject internal nodes inside `pool ... blackbox`.
7. **Boundary events** are positionally attached to an activity's edge; moving the activity moves the boundary event. Schematex tracks them as child elements of their parent activity.
8. **Interrupting vs non-interrupting boundary events** are distinguished only by **solid vs dashed double-circle stroke**. Visually subtle, semantically major (interrupting cancels the activity; non-interrupting does not).
9. **Multi-instance and loop markers are mutually exclusive** on the same activity.
10. **Pool labels are rotated 90° on the left edge.** Layout bug if you forget.
11. **The `+` glyph means three different things** depending on shape: parallel gateway (diamond), expanded-subprocess collapse marker (rounded-rect bottom), parallel multi-instance event (circle inside event-based gateway). Disambiguate by host shape.
12. **Spec is ~530 pages.** Most modelling guidance comes from Silver and Freund/Rücker, not the spec. The reference doc author should not pretend to read the spec cold.
13. **OMG terminology drift.** The spec uses "Activity" as the supertype of Task and Subprocess; lay people say "task" for any rectangle. Schematex DSL is strict (`task` vs `subprocess`), but error messages are forgiving.
14. **DI (Diagram Interchange) layer** in BPMN 2.0 XML is what carries layout coordinates; round-trip portability is notoriously broken between tools. Schematex sidesteps this by **computing layout from DSL**, not consuming external DI.

---

## 9. Out of Scope (Deferred)

- BPMN 2.0 XML import / export adapter (post-v1)
- Choreography diagrams (BPMN ch.11)
- Conversation diagrams (BPMN ch.12)
- Token-flow simulation / execution semantics
- DMN (separate engine, future `dmn` plugin)
- CMMN (separate engine, future `cmmn` plugin)

---

## 10. Implementation Status

**v0.1 — Implemented (2026-05-04).** Pools / lanes / black-box pools, start &middot; intermediate &middot; end events with `none` / `message` / `timer` triggers, tasks with 6 markers (`user` / `service` / `send` / `receive` / `manual` / `script`) + collapsed subprocess, gateways `xor` / `or` / `and` / `event`, connectors `-->` / `--?` / `--*` / `~~>`, with parser-side validation of pool-boundary and default-flow rules. Layout uses longest-path layering with DFS-based cycle break; routing is orthogonal Manhattan with mid-channel bends.

**v0.2+ deferred.** Boundary events (timer / error / escalation / compensation), expanded subprocesses, transaction & call activities, the rare event triggers (cancel / signal / link / conditional / multiple / parallel-multiple / terminate / compensation), loop and multi-instance markers, artifacts (data object / store / group / annotation), BPMN 2.0 XML import/export.
