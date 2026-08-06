# 32 — PERT / CPM (Program Evaluation and Review Technique / Critical Path Method) Standard Reference

*PMI / PMBOK 7th Edition (2021) — Activity-on-Node (AON) project scheduling networks with computed Early Start, Early Finish, Late Start, Late Finish, slack, and the critical path. Schematex implements the visual subset of PERT/CPM that real-world project managers actually draw, with a text DSL designed for AI generation and — uniquely among text-DSL diagram tools — **the engine performs the forward-pass and backward-pass scheduling computation itself**, not just renders pre-computed shapes.*

> **Primary References:**
> - **PMI** (2021). *A Guide to the Project Management Body of Knowledge (PMBOK Guide), Seventh Edition* and *The Standard for Project Management*. Project Management Institute. ISBN 978-1628256642. — *De-facto authority for both AON / Precedence Diagramming Method (PDM) and PERT computation.*
> - **PMI** (2017). *A Guide to the Project Management Body of Knowledge (PMBOK Guide), Sixth Edition*. ISBN 978-1628251845. — *The last edition with a process-oriented schedule-management chapter; still cited in academic syllabi and PMP study guides.*
> - **Kerzner, Harold** (2022). *Project Management: A Systems Approach to Planning, Scheduling, and Controlling*, 13th ed. Wiley. ISBN 978-1119805373. — *Standard graduate-level textbook; chapters 12–13 on network planning are the most cited PERT/CPM treatment in education.*
> - **Malcolm, D. G.; Roseboom, J. H.; Clark, C. E.; Fazar, W.** (1959). "Application of a Technique for Research and Development Program Evaluation." *Operations Research* **7**(5): 646–669. — *The original PERT paper; US Navy Special Projects Office, Polaris missile program.*
> - **Kelley, James E.; Walker, Morgan R.** (1959). "Critical-Path Planning and Scheduling." *Proceedings of the Eastern Joint Computer Conference*, 160–173. — *The original CPM paper; Du Pont / Remington Rand collaboration.*
> - **Moder, J. J.; Phillips, C. R.; Davis, E. W.** (1983). *Project Management with CPM, PERT and Precedence Diagramming*, 3rd ed. Van Nostrand Reinhold. ISBN 978-0442254155. — *The canonical PDM reference; defines the four dependency types FS / SS / FF / SF and lag/lead conventions used in modern scheduling software.*
> - **ANSI/PMI 99-001-2017** — *Earned Value Management*. — *EVM standard; relevant to baselining a PERT schedule for performance measurement.*
> - **AACE International Recommended Practice 24R-03** — *Developing Activity Logic*. — *Industry guidance on dependency conventions used by Primavera and MS Project users.*
> - **Vanhoucke, Mario** (2012). *Project Management with Dynamic Scheduling: Baseline Scheduling, Risk Analysis and Project Control*, 2nd ed. Springer. ISBN 978-3642404375. — *Modern OR treatment, Monte Carlo and resource-constrained extensions.*
> - **Demeulemeester, Erik; Herroelen, Willy** (2002). *Project Scheduling: A Research Handbook*. Kluwer / Springer. ISBN 978-1402070518. — *Research-grade reference on RCPSP and scheduling theory.*
>
> *Notes on the standard landscape.* Unlike BPMN (OMG / ISO 19510) or PID (ISA-5.1), **PERT/CPM has no single ISO or ANSI rendering standard**. The PMBOK Guide is the de-facto authority for the algorithm and terminology; the visual conventions (six-field activity box, critical-path highlighting, lag/lead annotation) are described in textbooks (Kerzner, Moder) and in the documentation of MS Project, Oracle Primavera P6, and the AACE recommended practices, rather than in a formal standard. Schematex therefore treats **PMBOK 7 + Moder 1983 + the visual conventions used by Primavera P6** as the reference baseline, and documents every deviation explicitly in §7.

---

## 0. Positioning

**PERT and CPM are the two foundational network-scheduling techniques of modern project management**, both born in 1959 — PERT from the US Navy Polaris missile program (Malcolm et al.) for managing uncertainty in R&D durations, CPM from DuPont and Remington Rand (Kelley & Walker) for deterministic construction scheduling. Half a century of practice has converged the two: the **Precedence Diagramming Method (PDM)** taught by PMI subsumes both, using Activity-on-Node (AON) notation with four dependency types and optional three-point duration estimation. When people say "PERT chart" today they almost always mean an AON / PDM network, with PERT's three-point estimation as an optional add-on. Schematex follows that convention.

**Why this engine exists.** A search for "PERT chart generator" returns dozens of tools, but they fall into two camps. The professional camp (Microsoft Project at $10/user/month, Oracle Primavera P6 starting around $2,500/seat, Smartsheet, Asana, Monday.com) is Gantt-centric and expensive, and PERT is a secondary view; users still author tasks in a table and the tool computes the schedule. The DIY camp (Lucidchart, draw.io, Edraw, Creately, MindOnMap, plus countless template galleries) ships PERT *shape libraries*: the user draws the rectangles, hand-fills the six fields, and **manually computes ES / EF / LS / LF / slack with a calculator**. The boundary between the two is sharp and frustrating — there is no free, embeddable, programmatic, text-first PERT tool that actually does the scheduling math. Schematex closes that gap.

**The differentiator is the algorithm, not the box.** Anyone can render a six-field rectangle. What distinguishes a real PERT engine is that a user writes durations and dependencies, and the engine returns the computed Early Start, Early Finish, Late Start, Late Finish, slack, project duration, and critical path. That is what Schematex `pert` does. The render is downstream of the compute. This positions the engine as a serious project-management aid — useful for PMP study, real schedule sanity-checks, and LLM-generated project plans — rather than a shape library wrapped in a DSL.

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why PERT is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision / architecture (Sugiyama DAG) | No scheduling semantics; nodes have no duration, edges have no dependency type, no critical-path computation. |
| `bpmn` (§25) | Business process modelling (OMG BPMN 2.0.2) | Process-centric (activities, gateways, lanes); PERT is project-centric (one-off effort, finite end date, computed schedule). |
| `decision-tree` (§19) | Sequential decisions with expected values | Decision-theoretic; no time, no dependencies. |
| `sfc` (§24, IEC 61131-3) | PLC sequential function chart | Step/transition machine for industrial controllers; PERT is a one-off DAG, not a repeating cycle. |
| *(no Gantt engine yet)* | — | A PERT engine with `layout: timescaled` mode (§9.3) partially overlaps Gantt, but Schematex does **not** yet have a dedicated Gantt engine with calendar-aware time axis, resource histograms, or baseline tracking. See §13. |

**Layout reuse.** PERT inherits the layered-DAG layout primitives from `flowchart` (§14) — cycle removal, layer assignment, barycenter ordering, Brandes-Köpf x-coordinate. The difference is that layer assignment is **driven by the computed Early Start**, not by topological longest-path, so the x-axis carries time semantics (see §9). This is a small extension to the shared layout module, not a separate engine.

---

## 2. Users & Needs

### 2.1 Personas

| Role | Scenario | Frequency | Why a text-DSL PERT engine matters |
|---|---|---|---|
| **PMP-certified project manager** | Schedule baseline for a project charter, PMP recertification, status reporting | Weekly | MS Project licence not always available; PMO templates demand the six-field box; needs computed critical path on the spot |
| **Engineering / tech-lead manager** | Quarterly engineering plan, dependency check before sprint planning, on-boarding docs | Weekly | Wants to commit a plan to a Markdown PR review and let the renderer produce the chart; rejects per-seat tooling |
| **Construction / infrastructure PM** | Schedule risk review, contractor coordination, weekly subcontractor meeting | Weekly | Primavera P6 is the deliverable, but the *thinking* happens in text/whiteboard; needs a quick re-compute when a duration changes |
| **MBA / PM student** | Operations-management coursework, exam prep | Term-paced | Textbook problems quote ES/EF/LS/LF; needs a tool that computes them, not one that requires manual entry |
| **Operations researcher / scheduling academic** | Teaching, papers, small examples in slides | Monthly | Needs a reproducible, citable text representation of a sample network |
| **Government / defence PM** | Programme baseline, EVM reporting, integrated master schedule (IMS) | Monthly | Open-source, embeddable rendering avoids vendor lock-in; auditors expect the conventional six-field box |
| **PMO consultant** (Big-4, IBM, Accenture) | Client engagement schedule, recovery-plan rebaselining | Daily during engagements | Needs both the network view and the time-scaled view; needs the chart to fit inside a PowerPoint or a Confluence page |
| **LLM (ChatDiagram / MyMap generation side)** | "Plan this 12-task launch / migration / rollout" | Daily, thousands of times | Cannot author MS Project XML or Primavera XER; needs a compact DSL the model can produce reliably |

### 2.2 What Schematex Must Do Better Than the Alternatives

1. **Compute the schedule.** ES / EF / LS / LF / slack / project duration / critical path — automatically, on every parse. This is the headline feature. Most "PERT generators" are dumb shape libraries; the user fills the six fields by hand. Schematex never asks the user to compute scheduling fields.
2. **Treat the six-field rectangle as the canonical box.** PMBOK and every major PM textbook draw it this way; competing tools render only three fields (id, duration, description) and call it a PERT chart. Schematex defaults to the full six.
3. **Highlight the critical path automatically.** Red border, bold edges, optional `critical` data attribute on every node and edge. No manual annotation.
4. **Support PDM dependency types** (FS / SS / FF / SF) with optional lag/lead. Modern scheduling is unworkable without these; nearly every DIY PERT generator restricts to FS.
5. **Support PERT three-point estimation** as a first-class duration syntax, with computed expected duration `te = (O + 4M + P)/6` and variance `σ² = ((P − O)/6)²` carried through the schedule. The original PERT contribution.
6. **Offer a time-scaled layout mode** (`layout: timescaled`) where x-position is proportional to ES and width is proportional to duration — the bridge between network view and Gantt view, in the same DSL.
7. **AI-friendly errors.** Cyclic dependencies, undefined predecessors, contradictory lag/lead, terminal tasks with no successor — all detected, all reported in plain English with the offending DSL line.
8. **Embeddable SVG output**, zero runtime dependency, KB-scale bundle, SSR-safe. The same constraints as every other Schematex engine.

---

## 3. Market Need

### 3.1 Search Volume (Ahrefs, 2026 Q1)

| Keyword | US monthly | Global monthly | KD | Intent |
|---|---|---|---|---|
| `pert chart` | 4,500 | 20,000 | 14 | Educational + tool research |
| `pert diagram` | 800 | 5,000 | 10 | Educational |
| `pert chart maker` | 350 | 1,400 | 12 | Transactional |
| `pert chart generator` | 250 | 900 | 11 | Transactional |
| `pert chart example` | 600 | 2,500 | 8 | Educational |
| `pert vs cpm` | 1,200 | 5,500 | 12 | Educational |
| `critical path method` | 4,800 | 22,000 | 38 | Educational + tool research |
| `cpm scheduling` | 700 | 2,800 | 30 | Educational |
| `project network diagram` | 600 | 2,400 | 18 | Educational |
| `precedence diagram` | 450 | 1,900 | 14 | Educational |

The volume is modest compared with `flowchart` (≈100,000 US monthly) but the **keyword difficulty is low (KD 10–18)** and the audience is high-intent and well-monetised (PM training, PMP study, enterprise scheduling). Schematex's positioning as a *free open-source PERT chart generator that actually computes the schedule* targets a defined gap; long-tail keywords (`pert chart from text`, `pert chart calculator`, `pert critical path tool`) are nearly uncontested.

### 3.2 Competitive Landscape

| Product | Positioning | Licence | Computes ES/EF/LS/LF? | Critical path? | Three-point? | Text DSL? | Key gap |
|---|---|---|---|---|---|---|---|
| **Microsoft Project (online + desktop)** | Reference commercial PM tool | ~$10/user/mo (Plan 1) | Yes | Yes | Limited | No | Per-seat licence; not embeddable; XML-only |
| **Oracle Primavera P6** | Enterprise construction / EPC scheduling | ~$2,500–$3,000/seat | Yes | Yes | Yes (via Pertmaster / Risk Analysis) | No (XER text exists, not DSL) | Expensive; steep learning curve; closed |
| **Smartsheet / Asana / Monday.com** | Gantt-first work management | $10–25/user/mo | Yes (Gantt-side) | Limited | No | No | PERT view is secondary; no six-field network box |
| **Lucidchart** | General diagramming SaaS | $9–16/user/mo | **No** | No (manual) | No | No | Shape library; manual computation |
| **draw.io / diagrams.net** | Free web diagramming | Apache 2.0 | **No** | No | No | No | Shape library; manual |
| **Edraw Max / EdrawMind** | Diagramming + templates | $99/year+ | **No** | No | No | No | Shape library |
| **Creately** | Diagramming SaaS | $5–89/mo | **No** | No | No | No | Shape library |
| **MindOnMap** | Free online maker | Free | **No** | No | No | No | Shape library |
| **Visual Paradigm Online** | Diagramming SaaS | $6–35/mo | Partial | Partial | No | No | Mostly shapes; weak compute |
| **Mermaid `gantt`** | Markdown-native DSL | MIT | **No** | No | No | Yes (Gantt only) | No PERT view; no critical-path computation |
| **PlantUML** | Markdown DSL | GPL | No | No | No | Partial (limited Gantt) | No PERT |
| **NetworkX + matplotlib** | Python graph library | BSD | Yes (if user codes it) | Yes (if user codes it) | If coded | No | Library; no DSL; no SVG diagram conventions |
| **Open-source CPM packages on GitHub** | Mostly research / coursework | Various | Yes | Yes | Sometimes | No | No DSL; no embeddable SVG renderer |

**Schematex `pert` differentiation:**

- The **only text-DSL PERT generator that computes the schedule** (forward pass, backward pass, slack, critical path).
- Free, AGPL-3.0, embeddable as a TypeScript library, zero runtime dependency, KB-scale bundle.
- Native PDM (FS / SS / FF / SF + lag/lead), native three-point estimation, native time-scaled mode.
- AI-native: a 12-task plan is ~20 lines of DSL; LLMs produce it reliably first-try.
- Same theming and SVG semantics as the rest of Schematex (BaseTheme tokens, `data-*` attributes, `<title>` / `<desc>`).

---

## 4. Standard Compliance

### 4.1 What We Implement (v0.1)

- **Activity-on-Node (AON) / Precedence Diagramming Method** per PMBOK 7 and Moder 1983.
- **Six-field activity box** (ES | Duration | EF / Name + ID / LS | Slack | LF) per Kerzner ch. 12 and the convention used by Primavera P6 and MS Project's "Network Diagram" view.
- **Forward-pass scheduling** to compute ES and EF for every activity.
- **Backward-pass scheduling** to compute LS and LF for every activity.
- **Total slack** (= LS − ES = LF − EF) for every activity.
- **Critical-path identification** (every activity with slack ≤ ε where ε defaults to 0; configurable for floating-point tolerance).
- **PDM dependency types**: FS (default), SS, FF, SF, with optional integer lag (positive) or lead (negative) in the project's time unit.
- **PERT three-point duration estimation**: `te = (O + 4M + P)/6` (beta-distribution mean) with optional variance `σ² = ((P − O)/6)²` retained on each activity.
- **Project-level summary**: total duration (max EF over terminal tasks), critical-path length, count of activities, count of dependencies, count of critical activities.
- **Two layout modes**: `layout: network` (default, layered AON network) and `layout: timescaled` (x-axis proportional to ES, width proportional to duration, akin to a network-Gantt hybrid).

### 4.2 What We Deliberately Omit

| Omitted | Why |
|---|---|
| **Activity-on-Arrow (AOA / ADM) notation** | Largely abandoned in industry; PMBOK 6 already de-emphasised it, PMBOK 7 dropped it from the main treatment. We mention it historically only. |
| **Resource calendars** (weekends, holidays, shifts) | Belongs in a Gantt engine with a calendar model; PERT is unit-agnostic (`days`, `weeks`, abstract). |
| **Resource leveling and resource-constrained scheduling (RCPSP)** | Algorithmic depth and UI complexity beyond v0.1. See §13. |
| **Probabilistic / Monte Carlo PERT (Schedule Risk Analysis)** | Powerful and on-roadmap; v0.1 ships variance per activity but does **not** run Monte Carlo simulations. See §13. |
| **EVM (Earned Value) overlays** (PV / EV / AC, SPI, CPI) | Belongs in a project-controls dashboard, not the schedule renderer. |
| **Baselining and progress tracking** | A schedule renderer should render the current schedule; baseline-vs-actual is downstream tooling. |
| **MS Project (`.mpp` / XML) and Primavera (`.xer` / XML) import/export** | Verbose, vendor-specific; not the value-add. Future adapter possible. |
| **AOA renderer** | Effectively two graphs (events + activities) and a dummy-activity rule set; obsolete; not worth the implementation tax. |
| **Hammock activities and LOE (level-of-effort) tasks** | Niche; v0.2+. |

### 4.3 Deviations from "Pure" PMBOK

- We render the **six-field box** as a 3×2 grid (Kerzner / Primavera convention) rather than PMBOK Figure 6-13's specific layout. The fields and semantics are identical; the geometry is the most common one in industry practice.
- The **critical-path tolerance** defaults to ε = 0 (exact slack zero) but can be set per-diagram to handle floating-point three-point durations (`critical-tolerance: 0.001`).
- We render lag/lead **on the dependency edge label** (`FS+2d`, `SS−1d`) rather than as a separate "lag node," because every modern scheduling tool does this.

### 4.4 Terminology mapping

PMBOK, Kerzner, and the major scheduling tools each use slightly different terms for the same fields. Schematex picks one and notes the synonyms in error messages and docs:

| Schematex term | PMBOK term | Primavera term | MS Project term | Kerzner term |
|---|---|---|---|---|
| Early Start (ES) | Early Start | Early Start | Early Start | Earliest Start |
| Early Finish (EF) | Early Finish | Early Finish | Early Finish | Earliest Finish |
| Late Start (LS) | Late Start | Late Start | Late Start | Latest Start |
| Late Finish (LF) | Late Finish | Late Finish | Late Finish | Latest Finish |
| Total Slack | Total Float | Total Float | Total Slack | Slack / Float |
| Free Slack | Free Float | Free Float | Free Slack | Free Float |
| Critical Path | Critical Path | Longest Path | Critical Path | Critical Path |
| Duration | Duration | Original Duration | Duration | Activity Time |
| Lag | Lag | Lag | Lag | Lag |
| Lead | Lead (negative lag) | Negative Lag | Lead | Lead |

We prefer "slack" over "float" in user-facing copy (PMI usage in North American certifications); both should round-trip in documentation searches.

---

## 5. The Algorithm (Unique Value of This Engine)

This section specifies the scheduling computation precisely. It is the heart of the engine.

### 5.1 Input

A directed acyclic graph **G = (V, E)** where:

- **V** is the set of activities. Each activity *v* has:
  - an id `v.id`
  - a duration `v.d ∈ ℝ⁺` (deterministic) **or** a three-point estimate `(O_v, M_v, P_v)` with `O_v ≤ M_v ≤ P_v`, in which case `v.d := (O_v + 4·M_v + P_v) / 6` and the variance `v.σ² := ((P_v − O_v) / 6)²`.
- **E** is the set of dependencies. Each dependency *e* has:
  - source `e.src ∈ V`, target `e.tgt ∈ V`
  - type `e.type ∈ {FS, SS, FF, SF}` (default FS)
  - lag `e.lag ∈ ℝ` (positive = lag, negative = lead, default 0)

The parser also recognises two implicit terminal markers:

- **Start sentinel** (id `__start__`, duration 0): synthetic predecessor of every activity that has no real predecessor.
- **Finish sentinel** (id `__finish__`, duration 0): synthetic successor of every activity that has no real successor.

Both are added during parse so that the forward and backward passes have a single source and single sink.

### 5.2 Validation (Pre-Compute)

Before scheduling, the parser checks:

1. **Acyclicity.** A DFS detects any cycle. On cycle, throw a parse error naming each activity in the cycle.
2. **Defined references.** Every `after:` reference must resolve to a declared activity id; otherwise parse error.
3. **Duration validity.** `d > 0` (or `0` only for milestones); for three-point estimates, `O ≤ M ≤ P` and `O > 0` (or `O = 0` for milestones).
4. **Dependency type / lag consistency.** SS+positive lag, FS+positive lag, etc. are all legal; we only reject obviously invalid combinations (e.g. FS+lag larger than predecessor duration's negative is meaningless if it would make the successor finish before its predecessor starts — warned, not rejected).

### 5.3 Forward Pass

Topologically sort V; for each activity *v* in topological order:

```
ES(__start__) := 0
EF(__start__) := 0

for v in topological order, v ≠ __start__:
    ES(v) := max over each incoming dependency e from u to v of:
        case e.type = FS:  EF(u) + e.lag
        case e.type = SS:  ES(u) + e.lag
        case e.type = FF:  EF(u) + e.lag − v.d
        case e.type = SF:  ES(u) + e.lag − v.d
    ES(v) := max(0, ES(v))                    // clamp at project start
    EF(v) := ES(v) + v.d
```

The **project duration T** is `EF(__finish__) = max over terminal activities v of EF(v)`.

The FF and SF cases solve for `ES(v)` given the constraint on `EF(v)` or itself; both reduce to the same `ES(v) = constraint − v.d` form so that the standard `EF = ES + d` invariant is preserved.

### 5.4 Backward Pass

Reverse-topologically sort V; for each activity *v* in reverse order:

```
LF(__finish__) := T
LS(__finish__) := T

for v in reverse topological order, v ≠ __finish__:
    LF(v) := min over each outgoing dependency e from v to w of:
        case e.type = FS:  LS(w) − e.lag
        case e.type = SS:  LS(w) − e.lag + v.d
        case e.type = FF:  LF(w) − e.lag
        case e.type = SF:  LF(w) − e.lag + v.d
    LS(v) := LF(v) − v.d
```

### 5.5 Slack and Critical Path

For every *v*:

```
TS(v) := LS(v) − ES(v)        // total slack (= LF(v) − EF(v))
critical(v) := (TS(v) ≤ ε)    // ε defaults to 0
```

A dependency *e* from *u* to *v* is **critical** when both `u` and `v` are critical **and** the dependency is on the binding chain (i.e. without the lag, `ES(v)` would still be determined by this *e*). v0.1 implements the conservative rule: an edge is critical iff both its endpoints are critical. The corner case of two parallel zero-slack paths with non-binding edges is acknowledged but not specially marked in v0.1 (see §15 Open Questions).

### 5.6 Free Slack (Optional)

Free slack `FS(v) = min over each outgoing edge to w of (ES(w) − EF(v) − e.lag_if_FS)`. v0.1 computes total slack only; free slack is on the v0.2 roadmap and would be rendered as a fourth value in the box or surfaced in tooltips.

### 5.7 Three-Point Estimation: Variance and the Project Variance

For three-point activities, we retain `v.σ²`. The project-level standard deviation, under the classical PERT assumption that critical-path activities are mutually independent, is

```
σ²_project := Σ over critical activities v of v.σ²
σ_project  := √σ²_project
```

We surface `σ_project` and the per-activity variance in the rendered output as `data-` attributes and optionally in a project-summary footer. We **do not** in v0.1 run a Monte Carlo simulation, compute a probability of completing by a target date, or apply the central-limit-theorem cumulative distribution. Those are explicitly v0.2+ scope (§13).

### 5.8 Complexity

- Topological sort: **O(|V| + |E|)**.
- Forward and backward passes: **O(|V| + |E|)** each.
- Critical-path identification: **O(|V| + |E|)**.

Total scheduling cost is linear in graph size. The layout (Sugiyama-style) is O((|V| + |E|) · log) due to the barycenter ordering. For realistic project sizes (50–500 activities, common ceiling for one diagram) this is irrelevant; for >5,000 activities, see §15.

### 5.9 Numerical Considerations

Durations may be integer (`5`) or fractional (`6.33` from three-point estimation). All scheduling is performed in `number` (IEEE-754 double). For display, durations are formatted with `Number.prototype.toFixed(2)` and a trailing-zero trim. The critical-path tolerance default of ε = 0 is safe when all inputs are integers; users mixing three-point with deterministic durations should set `critical-tolerance: 0.001` to avoid spurious near-zero slacks displacing the visible critical path.

---

## 6. Symbol Catalog

PERT has a tiny symbol set compared with BPMN. The visual richness comes from typography inside the activity box and from edge annotation.

### 6.1 Activity Box (Six-Field Rectangle)

The canonical rectangle is a 3×2 grid:

```
┌──────────┬────────────┬──────────┐
│  ES      │  Duration  │   EF     │
├──────────┴────────────┴──────────┤
│         Task Name (ID)           │
├──────────┬────────────┬──────────┤
│  LS      │  Slack     │   LF     │
└──────────┴────────────┴──────────┘
```

**Geometry (default theme):**

- Outer rectangle: 180px × 90px.
- Three columns, equal width 60px.
- Top row and bottom row: 22px high each.
- Middle row (name + id): 46px high.
- Corner radius: 4px (slight rounding, professional).
- Border: 1.5px solid, theme `task.stroke`.
- Fill: theme `task.fill` (default near-white).
- Internal divider lines: 1px solid, theme `task.stroke` at 50% opacity.
- Text: theme typography token `BaseTheme.fontFamily`, size 11px for the six numeric fields, 13px for the task name, 10px for the id (set in a lighter weight or grey).

**Critical-path styling:**

- Border: 2.5px solid, theme `negative` (red by default).
- Fill: optionally tinted to `negative.fillSoft` (very pale red).
- The Slack field shows `0` in bold weight.
- Every critical activity carries `data-critical="true"` for CSS interactivity.

**Milestone variant** (`duration: 0`):

- Diamond shape (square rotated 45°) inscribed in the same 90×90 bounding box.
- Single field in the centre showing the milestone name and its scheduled date (= ES = EF).
- Optional `milestone: true` attribute for explicit declaration.

**Three-point variant** (when `duration: O/M/P` is used):

- The Duration field shows the computed `te` to 2 decimal places.
- An optional small `σ=…` annotation appears under the name in the middle row, font size 9px, theme `muted` colour.
- The full triple `O/M/P` is preserved in a `data-pert-triple` attribute on the node group.

### 6.2 Dependency Edges

| Dependency type | Line style | Arrowhead | Edge label | DSL |
|---|---|---|---|---|
| FS (Finish-to-Start, default) | solid | filled triangle | optional `FS+nd` if lag ≠ 0 | `after: A` or `after: A+2d` |
| SS (Start-to-Start) | solid | filled triangle | `SS` or `SS±nd` | `after: A SS` |
| FF (Finish-to-Finish) | solid | filled triangle | `FF` or `FF±nd` | `after: A FF` |
| SF (Start-to-Finish) | solid | filled triangle | `SF` or `SF±nd` | `after: A SF` |
| Critical edge | **bold** (2.5px) solid | filled triangle | as above | (computed, not declared) |

- All edges are **orthogonal** (right-angle bends), 1.5px stroke, theme `edge.stroke`.
- Edge label, when present, sits at the first bend midpoint with a 4px halo background to avoid overlap.
- Critical edges use 2.5px stroke and the theme `negative` colour. They carry `data-critical="true"`.
- Lag of 0 is unlabelled for FS (the most common case is "FS+0"); for SS/FF/SF the type label is always shown even at zero lag, to disambiguate from FS.

### 6.3 Sentinels (Optional Render)

The synthetic `__start__` and `__finish__` sentinels are **hidden by default** to avoid clutter. They can be opted in via `show-sentinels: true` in the header; when shown, they render as small filled circles (r=10) coloured by theme `event.startStroke` / `event.endStroke`, labelled "Start" / "Finish".

### 6.4 Time-Scaled Layout Annotations (when `layout: timescaled`)

In time-scaled mode, the chart adds:

- A horizontal time axis at the bottom: tick marks at every unit (day, week, etc.) and labels at major intervals (every 5 or 10 units depending on project length).
- A faint vertical gridline at each tick, theme `grid.stroke`.
- Activities are drawn as **stretched** boxes whose width is proportional to duration; the six fields adapt by truncating low-priority labels first (Slack and LS/LF) and showing tooltips on hover for the full set.

---

## 7. DSL Grammar

### 7.1 Header

```
pert
title: "Q3 Product Launch"
unit: days                       // days | weeks | hours | abstract; default days
direction: LR                    // LR (default) | TB
layout: network                  // network (default) | timescaled
critical-tolerance: 0            // numeric, default 0
show-sentinels: false            // default false
task kickoff "Project kickoff" duration: 1 milestone
```

### 7.2 Task declaration

```
task A "Market research"         duration: 5
task B "Design mockups"          duration: 8     after: A
task C "Backend API"             duration: 15    after: A
task D "Frontend build"          duration: 10    after: B, C
task E "QA / testing"            duration: 5     after: D
task F "Marketing collateral"    duration: 7     after: B
task G "Launch event"            duration: 2     after: E, F
```

**Form.** Each task is one line:

```
task <id> "<label>" duration: <d>  [after: <predecessor-list>]  [milestone]  [tags...]
```

- `<id>` is a single token (letters, digits, dashes, underscores). It must be unique across the diagram.
- `<label>` is a quoted string; CJK characters and Unicode quote variants are tolerated per the standard Schematex parser conventions.
- `duration: <d>` is either a non-negative number (deterministic) or `O/M/P` (three-point estimation, `O ≤ M ≤ P`).
- `after:` is a comma-separated list of predecessor references. Each reference is `<id>` or `<id><sign><lag><unit>` or `<id> <type>` or `<id> <type><sign><lag><unit>`.

### 7.3 Three-point estimation

```
task H "Beta program"            duration: 4/6/10   after: D
# te = (4 + 4·6 + 10)/6 = 6.333…
# σ² = ((10 − 4)/6)² = 1.0
```

### 7.4 Dependency types and lag/lead

```
task I "Documentation"           duration: 4    after: D+3        # FS with 3d lag
task J "Translation"             duration: 3    after: I SS-1     # SS with 1d lead
task K "Sign-off"                duration: 1    after: I FF       # FF, zero lag
task L "Press release"           duration: 2    after: G SF+1     # SF with 1d lag (rare)
```

**Reference grammar:**

```
predecessor    = id [WS dep-type] [lag-suffix]
dep-type       = "FS" | "SS" | "FF" | "SF"
lag-suffix     = ("+" | "-") number [unit-suffix]
unit-suffix    = "d" | "w" | "h" | ""   // optional shorthand; must match the header `unit:` or be omitted
```

- `A+2`, `A+2d`, `A FS+2d` are equivalent (FS+2 days).
- `B SS-1d` is SS with 1-day lead.
- When the `unit-suffix` is omitted, the diagram's `unit:` applies.
- Mixing units within one diagram is rejected as a parse error; convert to the diagram's base unit first.

### 7.5 Milestones

```
task M0 "Kickoff"                milestone                          # duration 0, no `after:`
task M1 "Go-live"                milestone           after: G
```

Milestones are rendered as diamonds and may appear at any point in the network.

### 7.6 Tags and theme overrides

```
task X "External vendor work"    duration: 10  after: A  tags: vendor, external
task Y "Internal"                duration: 5   after: A  class: secondary
```

Tags emit `data-tag="vendor external"` on the node group; classes emit `class="schematex-pert-task secondary"`. Theming hooks downstream consume these.

### 7.7 Notes and groups (optional, v0.2)

Out of scope for v0.1. Reserved DSL: `group "Phase 1" { D, E, F }` to render a named cluster around tasks; `note "..." -.- D` to attach an annotation.

### 7.8 Comments

`#` to end of line is a comment, anywhere a newline is legal.

### 7.9 Parser-enforced validation

In addition to the algorithmic validation in §5.2, the parser checks:

- `duration:` is required for non-milestone tasks.
- `after:` references must be declared somewhere in the file (forward references are legal as long as they resolve at end of parse).
- No duplicate task ids.
- No `after: <self>` (self-loop).
- `O ≤ M ≤ P` for three-point estimates.
- `unit:` declared once at most.
- `direction:` is `LR` or `TB`.

All errors are reported with the source line number and a plain-English explanation.

### 7.10 Reserved keywords

`pert`, `title`, `unit`, `direction`, `layout`, `task`, `duration`, `after`, `milestone`, `tags`, `class`, `critical-tolerance`, `show-sentinels`, `group`, `note`, `FS`, `SS`, `FF`, `SF`.

---

## 8. Theme Integration

PERT reuses `BaseTheme` and introduces a small extension `PertTokens`. Critical-path styling reuses the existing `BaseTheme.negative` token (red by default, configurable per theme preset).

```ts
interface PertTokens {
  task: { fill: string; stroke: string; nameColor: string; idColor: string; fieldDividerColor: string };
  milestone: { fill: string; stroke: string };
  critical: { stroke: string; fill: string; edgeStroke: string };   // mapped to BaseTheme.negative by default
  edge: { stroke: string; arrowFill: string; labelBg: string };
  axis: { stroke: string; labelColor: string };   // timescaled only
  grid: { stroke: string };                       // timescaled only
}
```

**Three presets** mirror the rest of Schematex:

- `default` — corporate blue-grey palette, near-white task fill, red critical path, light grey gridlines.
- `monochrome` — black / white / two greys for print; critical path becomes thick black border instead of red.
- `dark` — dark-charcoal task fill, light-grey text, brighter red critical path for contrast.

All colours are exposed as CSS custom properties (`--schematex-pert-task-fill`, etc.) for downstream override without re-rendering.

---

## 9. Layout Rules

### 9.1 Default mode (`layout: network`)

The default layout is a Sugiyama-style layered DAG, reusing the primitives in `flowchart` §14 (cycle removal — unnecessary here as the graph is already acyclic; layer assignment; barycenter ordering; Brandes-Köpf x-coordinate) with two PERT-specific tweaks:

1. **Layer assignment is driven by Early Start, not topological longest-path.** After the forward pass, each activity's layer is `floor(ES(v) / Δ)` where Δ is the smallest non-zero duration in the project — capped at a maximum of 24 layers to prevent runaway charts. The result is that the x-axis carries a *coarse* time signal: activities that can start at the same project time are in the same layer.
2. **Critical activities are routed first.** When the barycenter ordering ties, critical activities are placed higher (in LR direction) so that the critical path is visually unbroken across the chart, rather than zig-zagging through the middle.

**Defaults:**

- Layer (x) spacing: 60px between activity right edge and next activity left edge.
- Vertical (y) spacing: 30px between activity bottom and next activity top in the same layer.
- Activity box: 180px × 90px (as in §6.1).
- Edges: orthogonal Manhattan with right-angle bends; long edges use dummy-node insertion for clean routing.
- Edge labels (dependency type + lag) sit at the first bend midpoint.

### 9.2 Direction `TB`

Top-to-bottom layout. Layer is y-position, vertical spacing is y-spacing, etc. Activity box geometry is unchanged. Time axis (if shown in timescaled mode) is vertical.

### 9.3 Time-scaled mode (`layout: timescaled`)

In this mode:

- **x-position of each activity = ES(v) × scale**, where `scale = canvas_width / project_duration` (with margins).
- **width of each activity = duration(v) × scale**, with a configurable minimum (default 80px) so that very short activities remain legible.
- Activities in the same layer stack vertically as in the default mode; the layer assignment is the same.
- A horizontal time axis is rendered at the bottom, with tick marks at unit intervals and major labels at sensible step sizes (1, 2, 5, 10, 20 depending on project length).
- Critical-path activities and edges retain their visual styling.
- This mode partially overlaps a true Gantt chart but is **not** a Gantt — there is no calendar, no working-time mask, no resource swimlane. See §13.

### 9.4 SVG output structure

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" role="img"
     aria-labelledby="t d">
  <title id="t">Q3 Product Launch — PERT network</title>
  <desc id="d">7 activities, project duration 30 days, critical path A → C → D → E → G</desc>
  <g class="schematex-pert-edges">
    <g class="schematex-pert-edge" data-from="A" data-to="C"
       data-type="FS" data-lag="0" data-critical="true">
      <path d="…" />
      <polygon class="arrowhead" points="…" />
    </g>
    …
  </g>
  <g class="schematex-pert-tasks">
    <g class="schematex-pert-task" data-id="A"
       data-es="0" data-ef="5" data-ls="0" data-lf="5"
       data-slack="0" data-duration="5" data-critical="true">
      <rect class="task-box" … />
      <line class="divider-h" … />
      <line class="divider-v" … />
      <line class="divider-v" … />
      <text class="es">0</text>
      <text class="dur">5</text>
      <text class="ef">5</text>
      <text class="name">Market research</text>
      <text class="id">A</text>
      <text class="ls">0</text>
      <text class="slack">0</text>
      <text class="lf">5</text>
    </g>
    …
  </g>
</svg>
```

All output is **semantic SVG** per the Schematex hard rules: `<title>` and `<desc>` at the root; meaningful CSS classes; `data-*` attributes carrying every computed schedule field; no inline style (theming via CSS custom properties); fully SSR-safe.

---

## 10. Canonical Test Cases

Each test case must round-trip parser → scheduler → layout → SVG with zero warnings, and the computed ES/EF/LS/LF/slack and critical path must match the cited expected values exactly.

### 10.1 Minimal five-task linear chain

A pure FS chain to verify the forward and backward passes on trivial input.

```
pert
title: "Five-task linear chain"
unit: days
task A "A" duration: 3
task B "B" duration: 5 after: A
task C "C" duration: 2 after: B
task D "D" duration: 4 after: C
task E "E" duration: 1 after: D
```

Expected: project duration 15; every task on critical path; slack = 0 for all; ES values 0, 3, 8, 10, 14.

### 10.2 Diamond dependency

The smallest non-trivial network: two parallel paths with different lengths, exercising the `max` in the forward pass and the `min` in the backward pass.

```
pert
title: "Diamond"
unit: days
task A "Start" duration: 2
task B "Upper" duration: 6 after: A
task C "Lower" duration: 3 after: A
task D "Finish" duration: 4 after: B, C
```

Expected: project duration 12; critical path A → B → D; slack of A=B=D = 0, slack of C = 3 (= 6 − 3).

### 10.3 Kerzner / PMBOK textbook example

A nine-task network from Kerzner *Project Management* 13th ed. Chapter 13 (or the PMBOK 6 Practice Standard for Scheduling, Annex A.2). Used because students and PMP candidates already know the answer key.

```
pert
title: "Kerzner ch.13 example"
unit: weeks
task A "A" duration: 2
task B "B" duration: 3 after: A
task C "C" duration: 4 after: A
task D "D" duration: 6 after: B
task E "E" duration: 2 after: B, C
task F "F" duration: 3 after: D, E
task G "G" duration: 5 after: C
task H "H" duration: 1 after: F, G
task I "I" duration: 2 after: H
```

Expected: project duration 17; critical path A → B → D → F → H → I; slack on C = 2, E = 5, G = 1.

(Numbers above illustrate the structure; the exact textbook values should be re-validated against the cited edition during test authoring. This test case is `tests/pert/textbook-kerzner.test.ts` and the expected values are stored as JSON snapshot.)

### 10.4 Three-point estimation

Verifies the `te = (O+4M+P)/6` and per-activity variance computation, and the project-level critical-path variance under the classical PERT assumption.

```
pert
title: "Three-point project"
unit: days
critical-tolerance: 0.01
task A "Spec"        duration: 2/3/5     # te=3.17,  σ²=0.25
task B "Build"       duration: 5/8/14    # te=8.50,  σ²=2.25
task C "Test"        duration: 3/4/6     # te=4.17,  σ²=0.25  after: B
task D "Deploy"      duration: 1/2/3     # te=2.00,  σ²=0.11  after: C
```

Expected: project duration ≈ 17.83 days; critical path A → B → C → D (linear); project variance ≈ 0.25 + 2.25 + 0.25 + 0.11 = 2.86; σ_project ≈ 1.69.

### 10.5 Stress test: 20+ tasks, mixed FS/SS/FF + lag/lead

A realistic mid-size project network designed to exercise every dependency type, lag and lead, and the timescaled layout mode.

```
pert
title: "Migration plan"
unit: days
layout: timescaled

task A  "Inventory current systems"  duration: 5
task B  "Stakeholder interviews"     duration: 6  after: A SS+1
task C  "Vendor selection"           duration: 8  after: A, B
task D  "Architecture design"        duration: 10 after: C
task E  "Risk assessment"            duration: 4  after: D SS
task F  "Procurement"                duration: 12 after: C+2
task G  "Lab build"                  duration: 6  after: F
task H  "Code refactor"              duration: 15 after: D
task I  "Data migration tooling"     duration: 8  after: D
task J  "Pilot env setup"            duration: 5  after: G, H FF
task K  "Pilot run"                  duration: 7  after: J
task L  "Stakeholder review"         duration: 3  after: K
task M  "Production cutover plan"    duration: 4  after: L
task N  "Comms & training"           duration: 6  after: L SS-1
task O  "Dress rehearsal"            duration: 2  after: M, N
task P  "Cutover weekend"            duration: 1  after: O   milestone
task Q  "Hypercare"                  duration: 5  after: P
task R  "Decommission legacy"        duration: 4  after: Q
task S  "Lessons learned"            duration: 2  after: Q SS+2
task T  "Closeout report"            duration: 2  after: R, S
```

Expected: scheduler converges in <10ms on commodity hardware; critical path includes the longest chain through D → H → J → K → L → … → T; multiple non-critical sub-chains with positive slack; timescaled rendering produces a chart with no overlapping boxes and a readable bottom axis spanning ≈90 days.

---

## 11. Pitfalls & Gotchas

These are the PERT-specific footguns that parser, scheduler, and renderer must catch:

1. **Cycles in `after:` chains.** The most common LLM mistake. The scheduler is undefined on cyclic input; the parser must reject with a clear path-of-tasks message before scheduling runs.
2. **Forward references.** `task B after: A` may appear before `task A` is declared. Legal — the parser must accept and resolve at end-of-file.
3. **FS lag of zero is implicit.** `A`, `A+0`, `A FS`, `A FS+0` all mean the same thing. The renderer omits the label in all four cases.
4. **SS / FF / SF must always be labelled** on the edge, even at zero lag, because the visual distinction from FS would otherwise be invisible.
5. **FF and SF require care in the forward pass.** Both constrain `EF(v)` (FF) or `EF(v)` indirectly (SF), and v0.1 implements them by computing the implied `ES(v) = constraint − v.d`. A common bug is to apply the constraint to `EF` directly and then recompute `ES`, which double-applies the lag.
6. **Three-point with `O = M = P`** collapses to a deterministic duration with zero variance. Legal and useful as a default.
7. **Three-point ordering**: `O > M`, `M > P`, etc. is rejected. `O = M < P` and `O < M = P` are legal (skewed beta).
8. **Critical-path tolerance.** With three-point durations, accumulated floating-point error can give an activity a "true" slack of 0.0000001 that the renderer must treat as critical. `critical-tolerance: 0.001` is the right default for mixed-precision projects.
9. **Project duration is `max EF over terminal tasks`, not just the last declared task.** A common bug in DIY PERT generators is to take the final task's EF; this is wrong when there are multiple parallel terminal tasks.
10. **Hidden sentinels.** Internally we add `__start__` and `__finish__` to give the scheduler a unique source and sink. The renderer must hide them unless `show-sentinels: true`. A bug that leaks `__start__` into the diagram is immediately obvious but easy to introduce in refactors.
11. **Milestones have duration 0.** The scheduler treats them as ordinary zero-duration activities; the renderer must dispatch to the diamond shape, not the six-field box.
12. **Lag larger than predecessor duration** is legal (e.g. `A+10d` even if `d(A) = 5d`) and simply postpones the successor. Don't reject it.
13. **Lead (negative lag) larger than predecessor duration** in FS produces a successor that starts before the predecessor starts; we clamp `ES(v)` to ≥ 0 against the project start, and warn if the clamp is binding.
14. **Mixed units in one diagram** (e.g. `A+2d` and `B+1w` in the same project) is rejected; the user must convert to the diagram's base unit. The error message names both offending references.
15. **AON vs AOA confusion.** Users coming from older textbooks may write the network with arrows as activities. We do not implement AOA in v0.1; the parser does not silently misinterpret AOA syntax — it errors clearly if it sees signs of AOA (e.g. nodes declared as "events" without durations).
16. **Critical-edge ambiguity at zero-slack joins.** When two zero-slack predecessors join into a single critical successor, v0.1 marks **both** incoming edges as critical (conservative). A stricter rule would mark only the binding edge; this is an open question (§15).
17. **Performance ceiling.** Scheduling is linear, but the Sugiyama layout becomes cluttered above ≈100 nodes. For >100 nodes we recommend `layout: timescaled`, which lays out by time and avoids the layer-count explosion.

---

## 12. Worked Example (Tracing the Algorithm)

To make §5 concrete, here is the worked solution of the diamond test case (§10.2).

**Input:**

| Activity | Duration | Predecessors |
|---|---|---|
| A | 2 | — |
| B | 6 | A (FS) |
| C | 3 | A (FS) |
| D | 4 | B (FS), C (FS) |

**Forward pass:**

- ES(A) = 0; EF(A) = 0 + 2 = 2.
- ES(B) = EF(A) + 0 = 2; EF(B) = 2 + 6 = 8.
- ES(C) = EF(A) + 0 = 2; EF(C) = 2 + 3 = 5.
- ES(D) = max(EF(B), EF(C)) = max(8, 5) = 8; EF(D) = 8 + 4 = 12.

Project duration **T = 12**.

**Backward pass:**

- LF(D) = T = 12; LS(D) = 12 − 4 = 8.
- LF(C) = LS(D) − 0 = 8; LS(C) = 8 − 3 = 5.
- LF(B) = LS(D) − 0 = 8; LS(B) = 8 − 6 = 2.
- LF(A) = min(LS(B), LS(C)) = min(2, 5) = 2; LS(A) = 2 − 2 = 0.

**Slack and critical:**

| Activity | ES | EF | LS | LF | Slack | Critical? |
|---|---|---|---|---|---|---|
| A | 0 | 2 | 0 | 2 | 0 | ✓ |
| B | 2 | 8 | 2 | 8 | 0 | ✓ |
| C | 2 | 5 | 5 | 8 | 3 | — |
| D | 8 | 12 | 8 | 12 | 0 | ✓ |

Critical path: **A → B → D**. The edge A → C has critical source but non-critical target, so it is not critical; the edge C → D has non-critical source, also not critical.

This is the answer the parser-scheduler-renderer pipeline must produce for `tests/pert/diamond.test.ts`.

---

## 13. Future Expansion

Tracked here for visibility, deferred from v0.1:

- **Free slack.** Add `FS(v)` to the algorithm and surface a fourth slack field on the box, or expose via tooltip.
- **Resource leveling.** Add `resource: <name> <units>` per activity, and a heuristic leveler (Burgess / Brooks). Pairs with a Gantt engine for output.
- **Resource-constrained project scheduling (RCPSP).** True optimisation. Out of scope for any near-term version; mentioned for completeness.
- **Monte Carlo schedule risk analysis.** Sample each three-point duration from a beta or PERT distribution, run N=10,000 replications, compute the distribution of project completion times, surface percentile completion dates (P50, P80, P90). Pure JS, ~50 LOC, useful PMP-level feature.
- **Baseline tracking.** Allow `baseline:` and `actual:` overlays; render baseline as a faint outline, actual as a solid box; surface schedule variance per activity.
- **EVM overlay.** Planned Value / Earned Value / Actual Cost curves under the timescaled layout. Probably a dedicated engine, not a `pert` extension.
- **Calendar-aware durations.** Treat duration as working days, skip weekends and holidays. Belongs in a Gantt engine; PERT remains calendar-agnostic.
- **Gantt engine (`gantt`).** A separate Schematex engine for Gantt charts proper — calendar, working-time mask, resource swimlanes, baseline-vs-actual, milestones-on-the-bar. The `pert` engine's `layout: timescaled` mode is a stepping stone, not a substitute.
- **`.mpp` / `.xer` import-export adapters.** Bridge to MS Project and Primavera. Adapter-level, separate package (`@schematex/adapter-msproject`).
- **AOA renderer.** Out of scope, very low priority; if shipped, would be a separate `pert-aoa` keyword to avoid confusing the default DSL.

---

## 14. Implementation Status

**v0.1 — Planned.** AON / PDM with all four dependency types and lag/lead, deterministic and three-point durations, forward pass, backward pass, total slack, critical path, six-field box, milestone diamond, network layout (default) and timescaled layout, three theme presets (`default`, `monochrome`, `dark`), full validation (cycle detection, undefined refs, ordering checks), semantic SVG with `data-*` schedule attributes.

**v0.1 addendum — AOA implemented as an opt-in legacy view.** Although §4.2 / §15 Q8 originally scoped Activity-on-Arrow out permanently, it ships in v0.1 behind `layout: aoa` (numbered event circles + arrow activities + auto-inserted dummy activities, built by converting the AON model to an event graph). It is finish-to-start only — SS/FF/SF and lag/lead are flattened to FS with a warning — and is intended for teaching / textbook parity, not as the primary notation. AON remains the default and the recommended form.

**v0.2+ deferred.** Free slack, groups, notes, Monte Carlo SRA, baseline overlay, resource leveling, calendar-aware durations, MS Project / Primavera adapters, minimum-dummy AOA optimisation.

---

## 15. Open Questions (NEEDS VICTOR INPUT)

The following items deserve a decision before v0.1 implementation begins; each carries a recommended default in case Victor wants to defer.

1. **Critical-edge marking rule.** When two zero-slack predecessors join a zero-slack successor, mark both incoming edges critical (conservative) or only the binding one (strict)? **Recommended default: conservative** (both critical). Easier to implement and more visually conservative; consistent with what Primavera P6 displays by default.

2. **Variance display in three-point mode.** Show per-activity `σ²` in the rendered box, surface only in a footer/tooltip, or both? **Recommended default: surface in `data-pert-variance` attribute only; render in footer summary as `σ_project ≈ X.YY`**. Box already has six fields; adding variance crowds the layout.

3. **`unit:` semantics.** Is `days` calendar days or working days? **Recommended default: abstract** — the engine does not interpret. Add a non-normative note in the doc that calendar/working-day semantics belong to the future Gantt engine. This keeps PERT honest about being a scheduling-network engine, not a calendaring engine.

4. **Lag/lead unit suffix.** Permit `+2d`, `+2w`, `+2h`, or only `+2`? **Recommended default: permit the suffix, but only if it matches the diagram's `unit:` value; reject mixed units.** Familiar to Primavera users; safer than silent unit conversion.

5. **Default layout when project has >100 activities.** Should the engine warn and auto-switch to `layout: timescaled`, or render the layered network regardless? **Recommended default: render as requested, but emit a console warning at >100 activities suggesting timescaled mode.**

6. **Critical-path tolerance default.** Zero (exact) or a small positive number (e.g. 1e-6)? **Recommended default: 0**, with explicit documentation that mixed-precision projects (three-point durations) should set `critical-tolerance: 0.001`. Reproducible across runs.

7. **DSL keyword for milestone.** The current draft uses a `milestone` flag plus `duration: 0` interchangeably (the flag is sugar for duration 0 and a diamond shape). Confirm one canonical form? **Recommended default: accept both, render diamond when either is present.**

8. **AOA support.** Confirm AOA is fully out of scope, even as a future v0.x. **Recommended default: out of scope permanently** — the notation is effectively dead in industry; supporting it would double the rendering and serialization surface for no real-world benefit. Decision is reversible if a real user request appears.

9. **Three-point distribution.** Are O/M/P assumed to follow the beta-PERT distribution (Vose 2008) — relevant if/when Monte Carlo lands? **Recommended default: yes, beta-PERT**. Matches @RISK, Primavera Risk Analysis, and the Vanhoucke 2012 reference. Documented assumption only in v0.1 (no simulation yet).

10. **Edge label format for FS+0.** Always blank, or show "FS" with no lag? **Recommended default: always blank for FS+0**. Matches Primavera P6 default and what every PMBOK figure does.

---

*End of 32-PERT-STANDARD.md.*
