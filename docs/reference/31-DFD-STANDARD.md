# 31 — DFD (Data Flow Diagram) Standard Reference

*Yourdon/DeMarco (1979) and Gane–Sarson (1979) data flow notation — processes, data stores, external entities, and labelled data flows for documenting how information moves through a system. Schematex implements both notations behind a single `dfd` DSL keyword, with hierarchical leveling (context / level-1 / level-N), full validation of DFD well-formedness rules, and embeddable SVG output suitable for systems-analysis coursework, business-analyst deliverables, and security data-flow threat modelling.*

> **Primary References:**
> - **DeMarco, Tom** (1979). *Structured Analysis and System Specification.* Yourdon Press / Prentice Hall. ISBN 978-0138543808. — *The canonical Yourdon/DeMarco notation: process = circle, data store = open rectangle (two parallel horizontal lines), external entity = square, data flow = labelled arrow.*
> - **Yourdon, Edward** (1989). *Modern Structured Analysis.* Prentice Hall. ISBN 978-0135986240. — *Updates DeMarco with hierarchical leveling discipline and balancing rules.*
> - **Gane, Chris & Sarson, Trish** (1979). *Structured Systems Analysis: Tools and Techniques.* Prentice Hall. ISBN 978-0138545475. — *The alternative business-oriented notation: process = rounded rectangle with ID/name/location compartments, data store = open rectangle with ID column, external entity = shadowed square.*
> - **Yourdon, Edward & Constantine, Larry L.** (1979). *Structured Design: Fundamentals of a Discipline of Computer Program and Systems Design.* Prentice Hall. ISBN 978-0138544713.
> - **Page-Jones, Meilir** (1988). *The Practical Guide to Structured Systems Design*, 2nd ed. Yourdon Press. ISBN 978-0136907695. — *Standard treatment of leveling and balancing.*
> - **Kendall, Kenneth E. & Kendall, Julie E.** (2019). *Systems Analysis and Design*, 10th ed. Pearson. ISBN 978-0135172759. — *The textbook used in the majority of US IS undergraduate systems-analysis courses; codifies modern DFD conventions.*
> - **Hoffer, J. A., George, J. F. & Valacich, J. S.** (2017). *Modern Systems Analysis and Design*, 8th ed. Pearson. ISBN 978-0134204925.
> - **IIBA** (2015). *A Guide to the Business Analysis Body of Knowledge® (BABOK® Guide)*, v3. International Institute of Business Analysis. — *Lists DFD as a recognised analysis technique (§10.13 "Data Flow Diagrams").*
> - **Shostack, Adam** (2014). *Threat Modeling: Designing for Security.* Wiley. ISBN 978-1118809990. — *Adopts a DFD-derived notation (processes, data stores, external entities, data flows + trust boundaries) as the canonical artifact for STRIDE/Microsoft threat modeling.*
> - **OWASP Threat Dragon documentation** — https://owasp.org/www-project-threat-dragon/ — *Open-source threat-modeling tool whose canvas is essentially DFD + trust boundaries; the contemporary security-engineering use case.*
> - **NIST SP 800-154 (draft, 2016)** *Guide to Data-Centric System Threat Modeling* — references DFD-style notation for data-flow analysis in security contexts.
>
> *There is no single ISO standard for DFD.* The two competing 1979 books (DeMarco; Gane & Sarson) are the de-facto references, both still in print and both taught side-by-side in modern textbooks. Schematex treats them as interchangeable notations over the same underlying graph model.

---

**Positioning — paragraph 1.** Data Flow Diagrams are one of the oldest and most widely-taught artifacts in software/systems engineering. Forty-six years after DeMarco's book, the technique is still mandatory content in undergraduate Information Systems and Software Engineering programs (Hoffer/George/Valacich and Kendall/Kendall are the dominant textbooks). Outside of academia, DFD remains the lingua franca for business analysts mapping AS-IS information flow (IIBA BABOK §10.13), for compliance teams producing data-mapping artifacts under SOX and GDPR, and increasingly for security engineers building threat models — Shostack's *Threat Modeling: Designing for Security* (2014) adopted a DFD-derived notation as the canonical STRIDE artifact, and OWASP Threat Dragon ships a DFD canvas as its core authoring surface. Every one of these constituencies still draws DFDs by hand in Lucidchart, Visio, or draw.io because no widely-adopted text DSL exists for the notation. Mermaid does not support DFD. PlantUML has only stencil-level support. Schematex closes the gap.

**Positioning — paragraph 2.** Two notations compete for the title of "the" DFD. The Yourdon/DeMarco notation (circles for processes, open rectangles for data stores, squares for externals) is more common in CS academia and remains the default in Kendall & Kendall and Hoffer/George/Valacich. The Gane–Sarson notation (rounded rectangles with three compartments for processes, shadowed squares for externals, open rectangles with ID columns for data stores) is more common in enterprise/business analyst contexts and in commercial tooling such as Visual Paradigm and Visible Analyst. The two notations are technically equivalent: they encode the same four-element graph (process, data store, external entity, data flow). Schematex supports both behind a single DSL `style: yourdon | gane-sarson` option, defaulting to Yourdon for textbook parity. The DSL itself is identical across styles.

**Positioning — paragraph 3.** Schematex's DFD engine is deliberately scoped as a **renderer** rather than a workflow modelling environment. We implement the visual + structural rules — element shapes, labelled arrows, hierarchical IDs, balancing-aware leveling metadata, well-formedness validation — and we expose the result as embeddable SVG. We do not attempt physical DFDs (Gane–Sarson optional location compartment is honoured but its semantics are documentary), real-time extensions (Ward–Mellor 1985 / Hatley–Pirbhai 1987 add control-flow arrows and event stores; these are noted as future expansion), or multi-level decomposition browsing (v0.1 renders one level per diagram; the DSL records the level number, but cross-level navigation is a host-application concern). For threat modeling, we provide an optional `boundary` construct to draw trust-boundary dashed curves over the standard graph — a small extension that gives Schematex first-class support for the OWASP / STRIDE workflow without taking on the full Threat Dragon scope.

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why DFD is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision / architecture (Sugiyama DAG) | Flowchart edges encode **control flow** ("then go to step 5"); DFD edges encode **data movement** ("Order Details travel from Customer to process 1.1"). DFD has no diamonds, no merge points, no loops — every arrow carries a noun-phrase payload. Validation rules are sharper (every flow MUST be labelled, no store-to-store edges, etc.). |
| `bpmn` (§25) | OMG BPMN 2.0 business process | BPMN encodes the **process-execution perspective** with pools, lanes, gateways, events, sequence vs message flow. DFD ignores time and actors and focuses purely on **information**: what data exists, where it is stored, who/what produces and consumes it. DFD predates BPMN by 25 years and remains the default artifact in IS coursework precisely because it strips out process-execution detail. |
| `erd` (§27) | Chen / crow's-foot entity-relationship | ERD is the **static data model** (what entities exist, what attributes they have, what cardinalities relate them). DFD is the **dynamic data movement** (how data flows between processes). Both are taught in the same systems-analysis course; they are complements, not competitors. |
| `state` (§21) | UML / Harel statechart | State-centric (modes and transitions for a single object); DFD is data-movement centric (no modes, no guards). |
| `pid` (§22) | ISA-5.1 process & instrumentation | Physical material/energy flow in industrial plants; DFD models **information** flow in software systems. The arrow semantics are completely different. |
| `sld` (§11) | Single-line electrical | Electrical power flow; not data. |

Flowchart users on ChatDiagram and MyMap repeatedly ask for "DFD-style" output (especially security engineers asking for STRIDE-shaped threat models); `flowchart` cannot encode the labelled-noun-phrase-on-every-edge convention, the four canonical shape vocabulary, or the no-store-to-store validation. `dfd` is the right home for those requests.

---

## 2. Users & Needs

### 2.1 Personas

| Role | Scenario | Frequency | Why flowchart isn't enough |
|---|---|---|---|
| **CS / IS Undergraduate** | Systems-analysis homework; Kendall & Kendall chapter exercises; capstone projects | Term-paced, very high volume | Textbook DFD requires the four-shape vocabulary + balancing rules; grading rubrics reject "flowchart-with-labels" submissions. |
| **Systems Analyst / Business Analyst** | AS-IS / TO-BE data-mapping; IIBA BABOK §10.13 deliverable | Weekly | Pools/lanes aren't the right abstraction; analyst needs explicit data-store shapes and labelled flows. |
| **Compliance / Audit (SOX, GDPR, HIPAA)** | Data-flow mapping for regulatory artifacts ("Article 30 register" under GDPR) | Quarterly | Auditors expect DFD-style artifacts, not BPMN. |
| **Security Engineer (Threat Modeling)** | STRIDE / Microsoft Threat Modeling; OWASP Threat Dragon equivalents; SDL artifacts | Per-feature | Needs DFD shapes + **trust boundary** dashed curves; flowchart has neither vocabulary. Growing use case. |
| **Software Architect (Reverse Engineering)** | Legacy-system documentation; "what data crosses this microservice boundary?" | Per project | Needs the data-movement-only view; sequence diagrams and BPMN encode too much process detail. |
| **Technical Writer** | System documentation; onboarding diagrams in API reference docs | Weekly | DFD is the conventional artifact for "how data moves through the system" sections of architecture docs. |
| **LLM (ChatDiagram / MyMap generation side)** | "Describe how data flows through this system" prompts | Daily, thousands of times | Cannot reliably produce DFD via flowchart DSL — labels drop, validation fails, store-to-store edges appear. Native DSL eliminates entire failure classes. |

### 2.2 What Schematex must do better than the alternatives

1. **Both notations behind one DSL.** Authors should not have to rewrite their diagram to switch from Yourdon (academic) to Gane–Sarson (enterprise).
2. **First-class hierarchical IDs.** Process IDs are not labels — they are structural (`1.1`, `1.1.2`). The DSL must treat them as identifiers and reject malformed IDs.
3. **Validation that matches DFD semantics**, not generic graph rules: every data flow must carry a noun-phrase label; data stores cannot connect directly to data stores or to external entities; at level 0 (context diagram) no data stores are allowed; "black hole" and "magic" processes (input-only / output-only) are flagged.
4. **Trust-boundary overlays for threat modelling.** A `boundary "Internet"` construct draws a dashed curve grouping the elements inside it — the standard STRIDE adornment.
5. **Sugiyama LR layout with DFD-specific heuristics**: data stores placed beneath the processes they serve, external entities pinned to layer-edges, duplicated externals tolerated (DFDs conventionally duplicate the same external entity multiple times to reduce edge crossings).
6. **AI-friendly error messages.** When an LLM emits `D1 -> D2 : Records`, return *"Data flow on line 14 connects data store D1 directly to data store D2. In DFD semantics, data stores cannot exchange data without a process in between. Insert a process between D1 and D2."*

---

## 3. Market Need

### 3.1 Search-volume signal (Ahrefs)

| Term | US monthly | Global monthly | KD |
|---|---:|---:|---:|
| `data flow diagram` | 6,800 | **44,000** | 20 |
| `dfd diagram` | 600 | 14,000 | 14 |
| `data flow diagram example` | (subset of above) | — | — |
| `dfd level 0` / `context diagram` | (long tail; well-defined educational intent) | — | — |

Two contextual notes:

- **Educational volume is structural, not seasonal.** DFD is mandatory content in the IS / Software Engineering / Systems Analysis curriculum used by hundreds of US universities and many more globally; the search volume tracks the academic calendar but does not decay — Kendall & Kendall is on its 10th edition and Hoffer/George/Valacich on its 8th.
- **Security-engineering overlap.** A growing fraction of DFD authoring happens in the threat-modeling context (STRIDE, OWASP Threat Dragon, Shostack 2014). This audience does not always search for "DFD" directly — they search for "threat model diagram," "STRIDE diagram," "data flow threat model" — but they end up needing the same notation. This is an under-served secondary persona for Schematex.

### 3.2 Competitive landscape

| Product | Positioning | License | Key gap |
|---|---|---|---|
| **Lucidchart** | SaaS general diagramming with DFD shape library | $9–16/user/mo | Manual shape-dragging; no DSL; no validation. |
| **draw.io / diagrams.net** | Free web/desktop diagramming | Apache | Just shapes; no semantics; no validation; not a library. |
| **Visual Paradigm** | Commercial UML/BA desktop suite with DFD support | $99+ one-time / subscription | Heavy desktop install; GUI-only; proprietary file format. |
| **Smartdraw / Creately** | SaaS DFD authoring | Paid | Paywalled; closed export; no DSL. |
| **Visible Analyst** | Long-standing CASE tool with strong Gane–Sarson DFD support | Commercial, niche | Windows-only; legacy UX; expensive. |
| **Mermaid** | Markdown-native DSL | MIT | **Does NOT support DFD.** Flowchart-only. Documented gap. |
| **PlantUML** | DSL diagramming | GPL | Only via custom stencil files; no first-class DFD. |
| **OWASP Threat Dragon** | Open-source threat modeling | Apache | DFD canvas exists but is bound to the threat-modeling workflow; not a general-purpose DFD renderer; no embeddable SVG library. |
| **Microsoft Threat Modeling Tool** | Windows desktop, STRIDE-focused | Free (closed) | Windows-only; not embeddable; threat-modeling-specific shapes. |

**Schematex differentiation:**

- Only **text-DSL DFD with an embeddable zero-dependency SVG renderer.**
- Supports **both** Yourdon/DeMarco and Gane–Sarson behind one DSL.
- Hierarchical IDs and balancing-aware leveling as first-class concepts.
- Trust-boundary overlay built into the language — directly serves the OWASP / STRIDE persona that currently has no good text-DSL option.
- AGPL-3.0 with a commercial-license escape hatch for closed-source SaaS embedders.

---

## 4. Standard Compliance

### 4.1 What we implement (v0.1)

| Capability | Notation source |
|---|---|
| **Yourdon/DeMarco visual notation**: process = circle (r≈32); data store = open rectangle (two parallel horizontal lines, label between, ID at left); external entity = square (54×54). | DeMarco 1979 ch. 4–7; Yourdon 1989 ch. 9. |
| **Gane–Sarson visual notation**: process = rounded rectangle with three compartments (ID, name, optional location); data store = open rectangle with ID column; external entity = shadowed square. | Gane & Sarson 1979 ch. 3. |
| **Data flow**: labelled arrow (filled triangle arrowhead). Bi-directional rendered as two separate arrows in Gane–Sarson; rendered as a double-headed arrow in Yourdon when the DSL author requests it via `<->`. | Both. |
| **Hierarchical process IDs**: `1`, `1.1`, `1.1.2`. Data store IDs: `D1`, `D2`. External-entity IDs default to label-derived slugs. | Yourdon 1989 ch. 9 §"Leveling". |
| **Leveling metadata**: a `level:` header (0 / 1 / 2…) used in the rendered title and to switch on level-0-specific validation (no data stores allowed). | Yourdon 1989. |
| **Validation rules**: every flow labelled; no store-to-store; no external-to-external; no flow without source or sink; level-0 has no stores; black-hole/magic-process warnings; duplicated external entities permitted; unique IDs enforced. | Standard DFD semantics across both books and Kendall/Kendall. |
| **Trust-boundary overlay** (`boundary "..." { ids }`): dashed rounded-rectangle or freeform curve grouping the contained elements. Optional. | Shostack 2014 ch. 2; OWASP Threat Dragon. |
| **Sugiyama LR layered layout** with DFD-specific heuristics (data stores placed beneath processes via `near:` hint; externals pinned to layer-edges). | Reuses §14 flowchart layout primitives. |

### 4.2 What we deliberately omit (v0.1)

| Omitted | Why |
|---|---|
| **Multi-level decomposition browsing.** Each DSL document renders **one** level. | The DSL records the level number, but cross-level "click to descend" navigation is a host-application UX concern, not a renderer concern. |
| **Balancing-rule cross-document checker.** The renderer does not verify that flows entering process `1.1` in a level-1 diagram match those entering its decomposition in a hypothetical level-2 diagram. | Requires multi-document state — out of scope for a stateless renderer. The CLI may add this later. |
| **Physical DFDs.** Gane–Sarson's optional third compartment (location/medium) is accepted as a documentary string but the renderer does not distinguish physical from logical. | Physical DFD is largely a historical convention; most modern texts teach logical-only DFD. |
| **Real-time / control-flow extensions.** Ward–Mellor (1985) and Hatley–Pirbhai (1987) add dashed control-flow arrows, event stores, and control transformations. | Niche; deferred to a future `dfd-rt` variant. |
| **Event-partitioning notation.** McMenamin & Palmer (1984) event-partition lists. | Documentary artifact, not a rendered diagram element. |
| **Auto-decomposition from level-N to level-N+1.** | Renderer scope. |

### 4.3 Style adherence

The DSL is **notation-neutral**; the same source switches between Yourdon and Gane–Sarson via `style:`. Element shapes, ID compartments, drop shadows, and bidirectional-flow rendering are the only differences. Default is **Yourdon** (matching the dominant textbook tradition).

---

## 5. Symbol Catalog

All dimensions assume the default theme; the `BaseTheme` scale token uniformly multiplies them.

### 5.1 Process

| Property | Yourdon | Gane–Sarson |
|---|---|---|
| Shape | Circle | Rounded rectangle (corner radius 10px) |
| Default size | r = 32px | 120 × 72px |
| Compartments | One (ID + name centered, ID first line, name second) | Three: ID (top strip, height 18px), name (middle, fills remaining), location (bottom strip if provided, height 18px) |
| ID required | Yes | Yes |
| Fill token | `theme.fill` | `theme.fill` |
| Stroke token | `theme.stroke` | `theme.stroke` |
| Label font | `theme.font` 13px, name centered | `theme.font` 13px name; 11px ID; 10px location |

DSL: `process 1.1: Validate Order` (optionally `process 1.1 @ "Server"` for Gane–Sarson location).

### 5.2 Data Store

| Property | Yourdon | Gane–Sarson |
|---|---|---|
| Shape | Open rectangle: two parallel horizontal lines, label between | Open rectangle with a vertical line dividing an ID column (left, 24px wide) from the name (right) |
| Default size | width auto-fit (min 140px), height 32px | width auto-fit (min 160px), height 36px |
| ID location | Inside, prefixed before the name ("D1 / Customer Database") | In the left column ("D1"), name in the right area |
| Vertical strokes | None (open ends) | Right end is open; left has the ID-column divider |
| Fill | `theme.bg` (white-ish) | `theme.bg` |
| Stroke | `theme.stroke` | `theme.stroke` |

DSL: `datastore D1: Customer Database`.

### 5.3 External Entity (Source / Sink)

| Property | Yourdon | Gane–Sarson |
|---|---|---|
| Shape | Square | Square with drop shadow (4px offset down-right, same stroke color, no fill) |
| Default size | 54 × 54px | 54 × 54px (shadow extends an extra 4×4) |
| Label | Centered inside | Centered inside |
| Fill | `theme.fillMuted` | `theme.fillMuted` |
| Stroke | `theme.stroke` | `theme.stroke` |
| Duplication | Allowed: same external may appear at multiple positions; renderer marks each instance with a small asterisk in the bottom-right corner so the reader knows duplicates exist. | Same. |

DSL: `external: Customer`. Duplication via `external Customer @left` and `external Customer @right` on the same name.

### 5.4 Data Flow

| Property | Yourdon | Gane–Sarson |
|---|---|---|
| Line | Solid 1.5px | Solid 1.5px |
| Arrowhead | Filled triangle, 8px length | Filled triangle, 8px length |
| Label | **Mandatory** noun phrase, positioned at first-bend midpoint with 4px halo background | Mandatory, same placement |
| Bidirectional | Single arrow with double-head (`<->` in DSL) | **Two separate arrows** (Gane–Sarson convention); `<->` in DSL is expanded into two arrows at render time |
| Stroke token | `theme.stroke` | `theme.stroke` |
| Validation warning rendering | Offending edge re-coloured to `theme.warn` with a small `!` glyph at label position | Same |

DSL: `Customer -> 1.1 : Order Details`, `1.1 <-> Bank : Auth + Response`.

### 5.5 Trust Boundary (optional, threat-modelling extension)

| Property | Both notations |
|---|---|
| Shape | Dashed rounded rectangle enclosing the listed elements; corner radius 16px; stroke dash pattern 6-3 |
| Label | Bold label in a small filled tab attached to the top-left of the rectangle |
| Stroke | `theme.accent` (so it visually distinguishes from data flow) |
| Behaviour | Does **not** participate in layout connectivity; computed as a bounding box of the listed element rectangles + 12px padding after layout |

DSL: `boundary "Internet" { Customer, 1.1 }`.

### 5.6 Title / Legend

- The header `title:` renders as a centered title above the diagram. If `level:` is set, the rendered title is suffixed with `— Level N`.
- The legend (optional, `legend: bottom-inline | bottom-right | none`) shows the four element types and the trust-boundary glyph if any boundary is present.

---

## 6. DSL Grammar

### 6.1 Header

```
dfd
style: yourdon | gane-sarson      # default: yourdon
level: 0 | 1 | 2 | ...            # default: 1
layout: lr | td                   # default: lr
title: "Order Processing System"
legend: bottom-inline | bottom-right | none   # default: bottom-inline
```

### 6.2 Element declarations

```
external: Customer
external: Bank
external: Warehouse

datastore D1: Customer Database
datastore D2: Order Database
datastore D3: Inventory

process 1.1: Receive Order
process 1.2: Validate Payment
process 1.3: Fulfill Order
```

Optional Gane–Sarson location compartment:

```
process 1.2 @ "Payment Gateway": Validate Payment
```

Optional layout hint pinning a data store beneath the process it serves:

```
datastore D2: Order Database near: 1.1
```

Optional explicit external duplication:

```
external Customer @left
external Customer @right
```

### 6.3 Flow declarations

```
Customer -> 1.1 : Order Details
1.1 -> D2 : New Order
1.1 -> 1.2 : Order + Card Info
1.2 -> Bank : Auth Request
Bank -> 1.2 : Auth Response
1.2 -> D2 : Payment Status
1.2 -> 1.3 : Approved Order
1.3 -> D3 : Inventory Update
1.3 -> Warehouse : Pick List
D1 -> 1.1 : Customer Record
```

Bidirectional shorthand:

```
1.2 <-> Bank : Auth Exchange     # Yourdon: one double-headed arrow
                                  # Gane-Sarson: expanded to two arrows
```

### 6.4 Trust boundaries (optional)

```
boundary "Internet" { Customer, Bank }
boundary "DMZ" { 1.1, 1.2 }
boundary "Internal" { 1.3, D1, D2, D3 }
```

A single element may appear in at most one boundary (validation rule).

### 6.5 EBNF (compact)

```ebnf
diagram      = "dfd" newline header* element* flow* boundary* ;
header       = ("style" | "level" | "layout" | "title" | "legend") ":" value newline ;

element      = external | datastore | process ;
external     = "external" position? ":" label newline ;
position     = "@" ("left" | "right") ;
datastore    = "datastore" dsid ":" label hint? newline ;
dsid         = "D" digit+ ;
hint         = "near" ":" pid ;
process      = "process" pid location? ":" label newline ;
pid          = digit+ ("." digit+)* ;
location     = "@" string ;

flow         = endpoint arrow endpoint ":" label newline ;
endpoint     = pid | dsid | name ;
arrow        = "->" | "<->" ;

boundary     = "boundary" string "{" endpoint ("," endpoint)* "}" newline ;

label        = string-rest-of-line ;
```

### 6.6 Validation rules (parser-enforced)

| Rule | Severity | Message template |
|---|---|---|
| Every flow must have a label | **error** | *"Data flow on line N has no label. In DFD semantics every flow represents a named data packet."* |
| No store-to-store flows | **error** | *"Flow on line N connects data store D1 directly to data store D2. Insert a process between them."* |
| No external-to-external flows | **error** | *"Flow on line N connects external entity X directly to external entity Y. Externals can only communicate via a process."* |
| Flow source or sink unknown | **error** | *"Flow on line N references unknown element 'X'."* |
| At level 0, no data stores | **error** | *"Level-0 (context) diagrams must not contain data stores. Found D1 on line N."* |
| Process with only incoming or only outgoing flows | **warning** | *"Process 1.2 has incoming flows but no outgoing flows (a 'black hole')."* / *"Process 1.4 has outgoing flows but no incoming flows (a 'magic' process)."* |
| Duplicate IDs (processes / data stores) | **error** | *"Duplicate ID 'D1' declared on line N (first declared on line M)."* |
| Process ID malformed | **error** | *"Process ID '1.1.x' must be a dot-separated sequence of positive integers."* |
| Element listed in more than one trust boundary | **error** | *"Element 'D1' appears in boundaries 'DMZ' and 'Internal'. Each element may belong to at most one trust boundary."* |
| Boundary references unknown element | **error** | *"Boundary 'Internet' lists unknown element 'XYZ'."* |

Errors prevent SVG output; warnings emit a `<g class="dfd-warning">` overlay on the offending element with a `!` glyph and emit a console-friendly diagnostic.

### 6.7 Theme tokens

DFD reuses `BaseTheme` directly. The mapping is:

| Token | Used for |
|---|---|
| `theme.fill` | Process fill |
| `theme.fillMuted` | External-entity fill |
| `theme.bg` | Data-store fill |
| `theme.stroke` | All borders and data-flow arrows |
| `theme.font` | All labels |
| `theme.accent` | Trust-boundary dashed stroke |
| `theme.warn` | Validation-warning glyph and re-coloured edge |

No DFD-specific token extension is required for v0.1.

---

## 7. Layout Rules

### 7.1 Direction

- Default: **left-to-right** (`layout: lr`). External entities that are predominantly **sources** end up on the left; predominantly **sinks** on the right. Processes in the middle layers. Data stores rendered below their associated process by default (see §7.4).
- `layout: td` rotates the convention 90° (top-down). Same rules apply with vertical axis.

### 7.2 Layer assignment

- Reuse the §14 flowchart Sugiyama pipeline: cycle removal (DFS feedback-arc set) → longest-path layer assignment → barycenter ordering → Brandes-Köpf x-coordinate.
- **External entities** are pinned to the leftmost or rightmost layer based on whether their net flow direction is outbound (source → pinned left) or inbound (sink → pinned right). Mixed externals are placed on the side with greater flow count.
- **Data stores** participate in layering normally but are subject to the placement adjustment in §7.4.
- **Processes** occupy the middle layers.

### 7.3 Layer spacing

- Layer spacing default: 100px horizontal (LR) / 90px vertical (TD).
- Intra-layer spacing: 70px (LR vertical / TD horizontal).
- Data store and process sizes can differ substantially; layer height auto-fits the tallest element + 24px padding.

### 7.4 Data-store placement heuristic

DFD convention is to draw data stores either directly beneath the process that owns them or in a dedicated data-store band along the bottom. Schematex applies the following heuristic after Sugiyama layout completes:

1. If the DSL declares `near: <pid>` on a data store, the store is pinned to the same x-coordinate as `<pid>` and placed in a band 60px below the process row.
2. Otherwise, if a data store connects to exactly one process, it is placed in the band below that process.
3. If it connects to multiple processes, it is placed in the band below the **barycenter** of those processes.
4. The data-store band may not overlap external entities; layer width auto-grows if needed.

### 7.5 Duplicated external entities

Authors may declare the same external twice (`external Customer @left`, `external Customer @right`) to reduce edge crossings. Each instance is rendered as a separate square at the requested position, both annotated with a small `*` in the bottom-right corner so the reader knows duplicates exist. Validation does **not** dedupe — duplicates are intentional.

### 7.6 Flow routing

- Manhattan / orthogonal with right-angle bends, snapped to a 10px grid.
- Long edges (cross 3+ layers) use dummy-node insertion to keep bends clean.
- Bidirectional Yourdon arrows are rendered as a single orthogonal polyline with arrowheads at both ends.
- Bidirectional Gane–Sarson is rendered as two parallel polylines offset 8px apart.

### 7.7 Edge labels

- Positioned at the **first-bend midpoint** (matches §14 flowchart convention).
- Label has a 4px halo background in `theme.bg` to avoid overlap with crossing lines.
- Label font 11px; long labels wrap at 18 characters with hard-wrap on whitespace.

### 7.8 Trust boundary computation

- Computed **after** node layout completes.
- Bounding box of all member element rectangles, expanded by 12px padding, with corner radius 16px.
- Boundaries may nest; nested boundaries inset by 6px from the outer.
- Boundary label tab attached to the top-left, label text in `theme.accent`, 11px bold.

### 7.9 Title and legend

- Title rendered above the diagram, centered, 16px bold. Suffixed with `— Level N` when `level:` set.
- Legend rendered as a small horizontal strip at the bottom (default `bottom-inline`) showing four glyphs: process, data store, external, data flow. Trust-boundary glyph added if any `boundary` declared.

---

## 8. Canonical Test Cases

All five must round-trip through the rendering pipeline (parser → layout → SVG) without warnings.

### 8.1 Level-0 context diagram — "Order System"

The textbook hello-world. The entire system as one process (id `0`) surrounded by three external entities. No data stores (level 0 forbids them).

```
dfd
level: 0
title: Order System — Context Diagram

external: Customer
external: Bank
external: Warehouse

process 0: Order System

Customer -> 0 : Order
0 -> Customer : Confirmation
0 -> Bank : Payment Request
Bank -> 0 : Payment Response
0 -> Warehouse : Pick List
```

Exercises: single-process layout, externals on both sides, no data stores, bidirectional pairs rendered as separate flows.

### 8.2 Level-1 order processing (Yourdon, the DSL example)

```
dfd
style: yourdon
level: 1
title: Order Processing System — Level 1

external: Customer
external: Bank
external: Warehouse

datastore D1: Customer Database
datastore D2: Order Database
datastore D3: Inventory

process 1.1: Receive Order
process 1.2: Validate Payment
process 1.3: Fulfill Order

Customer -> 1.1 : Order Details
1.1 -> D2 : New Order
1.1 -> 1.2 : Order + Card Info
1.2 -> Bank : Auth Request
Bank -> 1.2 : Auth Response
1.2 -> D2 : Payment Status
1.2 -> 1.3 : Approved Order
1.3 -> D3 : Inventory Update
1.3 -> Warehouse : Pick List
D1 -> 1.1 : Customer Record
```

Exercises: full element vocabulary, three data stores placed under their owners, externals on both edges, both directions of flow to/from externals (Bank).

### 8.3 Same level-1 example in Gane–Sarson style

Identical source as 8.2 with `style: gane-sarson`. Validates:

- Processes render as rounded rectangles with ID compartment, not circles.
- Externals get drop shadows.
- Data stores get an ID column on the left.
- No `<->` arrows in the source; if present they would be expanded into two arrows.

### 8.4 Security threat-modelling DFD with trust boundaries

A web application broken into Internet / DMZ / Internal trust zones (Shostack-style STRIDE input).

```
dfd
style: yourdon
level: 1
title: Web App — Data Flow Threat Model
legend: bottom-right

external: User
external: Admin

datastore D1: User DB
datastore D2: Audit Log
datastore D3: Session Store

process 1.1: Web Server
process 1.2: Auth Service
process 1.3: Business Logic
process 1.4: Logger

User -> 1.1 : HTTPS Request
1.1 -> 1.2 : Login Credentials
1.2 -> D1 : Lookup
D1 -> 1.2 : User Record
1.2 -> D3 : Session Token
1.1 -> 1.3 : Authenticated Request
1.3 -> 1.4 : Audit Event
1.4 -> D2 : Log Entry
Admin -> 1.4 : Query Log
1.4 -> Admin : Log Result

boundary "Internet" { User }
boundary "DMZ" { 1.1, 1.2 }
boundary "Internal" { 1.3, 1.4, D1, D2, D3, Admin }
```

Exercises: trust-boundary overlay computation, nested layout that preserves boundary integrity, mixed-direction Admin (both source and sink).

### 8.5 Stress test — 12 processes, 5 data stores, 8 externals, duplicated entities

A synthetic stress case to validate the layout algorithm under realistic large-diagram conditions. Includes:

- 12 processes across three sub-numbering branches (`2.1.1` through `2.3.4`).
- 5 data stores, four with explicit `near:` hints, one without (forces barycenter placement).
- 8 distinct externals, two of which (`Customer`, `Auditor`) are explicitly duplicated on both sides.
- ~28 data flows.
- 3 trust boundaries (Internet / Application Tier / Data Tier).
- At least one intentional "black hole" process to confirm warning rendering.

Expected outcomes: deterministic layout (snapshot test), no edge-crossings violation of the Sugiyama bound, all boundaries render as non-overlapping rounded rectangles, the black-hole process shows a `!` glyph in `theme.warn` color and its warning text appears in the diagnostic output.

---

## 9. Pitfalls & Gotchas

DFD-specific footguns the parser and renderer must catch — accumulated from textbook errata and threat-modelling community lore:

1. **Unlabelled flows.** The single most common student error. DFD semantics require every flow to name the data it carries. Hard validation error.
2. **Store-to-store edges.** Tempting when the author is really modelling a database replication; in DFD this must always go through a process (typically a "Replicator" or "Sync" process). Hard validation error.
3. **External-to-external edges.** Same reasoning; the system under analysis is opaque to direct external-to-external flow. Hard validation error.
4. **Level-0 with data stores.** The context diagram must have zero data stores by definition (data stores are internal artifacts revealed by decomposition). Hard validation error.
5. **Black-hole / magic processes.** Input-only or output-only processes usually indicate a missing flow. Warning, not error, because they can be legitimate in narrow cases.
6. **Hierarchical ID drift.** Authors writing `process 1a` or `process 1.1.x` instead of `1.1.1`. Validator rejects non-numeric IDs.
7. **Duplicated externals as authoring tool.** Convention permits the same external entity at multiple positions to reduce edge crossings; this is **not** a bug but the validator must not treat duplicates as separate entities (flows to either instance are flows to the conceptual entity).
8. **Yourdon `<->` in Gane–Sarson rendering.** Gane–Sarson convention forbids double-headed arrows. Schematex expands `<->` into two arrows when rendering in `style: gane-sarson`.
9. **Boundary overlap.** Two trust boundaries enclosing overlapping element sets is meaningless (an element cannot be inside two zones simultaneously). Hard validation error.
10. **Legend confusion.** A diagram with `style: gane-sarson` must show Gane–Sarson glyphs in the legend, not Yourdon ones. Renderer reads `style` when emitting legend SVG.
11. **Process ID ambiguity in flows.** `1 -> 2` is ambiguous between "process 1 to process 2" and an undeclared identifier. Validator requires the ID to be declared via `process` before being referenced.
12. **Conflation with flowchart.** Authors arriving from Mermaid flowchart write `if/else` branches; DFD has no decisions, no merges, no loops. Parser does not accept flowchart-style branch syntax under `dfd`.
13. **Level metadata is documentary, not enforced cross-document.** The renderer does not check that `1.1` in the level-1 diagram balances with the decomposition in a hypothetical level-2 diagram. Authors must verify balancing manually (or via a future CLI command).
14. **Theme `warn` color appears in validation-error rendering.** A diagram with warnings still renders, with the offending element re-coloured. Reviewers must check the diagnostic output, not just visual sanity.

---

## 10. Future Expansion

| Feature | Source | Sketch |
|---|---|---|
| **Multi-level decomposition browsing.** | Yourdon 1989, Page-Jones 1988. | DSL gains an optional `decomposes: 1.2` header so a level-2 document declares which level-1 process it decomposes. A future CLI command `dfd balance` cross-checks balancing across documents. |
| **Ward–Mellor / Hatley–Pirbhai real-time extensions.** | Ward & Mellor 1985; Hatley & Pirbhai 1987. | Adds dashed control-flow arrows, event stores, and control-transformation circles. Likely delivered as a `dfd-rt` variant rather than complicating the base DSL. |
| **OWASP Threat Dragon adapter.** | OWASP Threat Dragon JSON schema. | Bidirectional converter between Threat Dragon's JSON model and Schematex DSL, so existing threat models can be rendered and existing Schematex DFDs can be enriched with STRIDE annotations in Threat Dragon. |
| **STRIDE annotation overlay.** | Shostack 2014. | Per-element STRIDE-letter annotations (S/T/R/I/D/E) rendered as small badges. DSL hint: `process 1.2 stride: STRID`. |
| **Physical DFD distinction.** | Kendall & Kendall ch. 7. | A `physical: true` flag that adds technology-medium annotations (e.g., "HTTPS", "JDBC") to data flow labels per Gane–Sarson physical-DFD convention. |
| **Event-partitioning helper.** | McMenamin & Palmer 1984. | A documentary block in the DSL listing events and the partition they exercise; renders as a sidebar table next to the diagram. |
| **CASE-tool ID renumbering.** | Visible Analyst, Visual Paradigm. | A CLI command that automatically renumbers process IDs after structural changes (insert process between 1.1 and 1.2 → all downstream IDs shift). |

---

## 11. Open Questions (NEEDS VICTOR INPUT)

1. **Trust-boundary nesting depth.** §7.8 allows nested boundaries, but real-world threat models sometimes overlap (e.g., "PCI Zone" and "DMZ" sharing a process). The current rule "each element in at most one boundary" forbids overlap. Should v0.1 instead allow overlap and render the second boundary with a different dash pattern? Or keep strict and revisit when a real user complains?  ⚠️ NEEDS VICTOR INPUT
2. **Default `style`.** I defaulted to **Yourdon** because (a) it dominates US CS / IS academia, and (b) the search-volume tail (`data flow diagram example`) overwhelmingly returns circle-based images. Enterprise / business-analyst users may expect Gane–Sarson. Should the default be configurable per-tenant (when integrated into ChatDiagram), or globally one or the other? ⚠️ NEEDS VICTOR INPUT
3. **`<->` semantics in Gane–Sarson.** I chose to expand `<->` into two parallel arrows when rendering Gane–Sarson, because Gane–Sarson textbooks reject double-headed arrows. An alternative is to forbid `<->` entirely under `style: gane-sarson` and emit a parse error. The expansion is friendlier to LLMs that don't know which style they're emitting; the error is more textbook-correct. ⚠️ NEEDS VICTOR INPUT
4. **Duplicated externals + flow references.** When `external Customer @left` and `external Customer @right` both exist, a flow `Customer -> 1.1` is ambiguous about which instance to attach to. Current plan: pick the instance closer to the flow's other endpoint (minimises edge length). Alternative: require explicit `Customer@left -> 1.1`. ⚠️ NEEDS VICTOR INPUT
5. **Black-hole / magic warnings as renderer overlay.** §6.6 emits warnings as both diagnostics and visual `!` glyphs. For threat-modelling exports going to executives, visual warnings may be confusing. Should there be a `warnings: silent | overlay | both` config? ⚠️ NEEDS VICTOR INPUT
6. **Process ID validation strictness.** Should we accept `1.0` as a synonym for `1` (some textbooks use `1.0` at level 1)? Current plan: reject; require canonical form. ⚠️ NEEDS VICTOR INPUT
7. **Level-0 single-process convention.** Should the parser auto-assign id `0` if the level-0 source declares only one process without an id (e.g., `process: Order System`)? Tempting for ergonomics, but may obscure the leveling discipline. ⚠️ NEEDS VICTOR INPUT

---

## 12. Implementation Status

**v0.1 — planned.** Yourdon and Gane–Sarson notations behind one DSL; hierarchical IDs; level header (0 / 1 / 2…); processes / data stores / externals / data flows; trust-boundary overlay; Sugiyama LR layout with data-store placement heuristic; duplicated-external handling; full validation rule set; SSR-safe SVG output; bottom-inline / bottom-right / none legend positions; default `BaseTheme` only (no DFD-specific token extension).

**v0.2+ — deferred.** Multi-level decomposition browsing; Ward–Mellor / Hatley–Pirbhai real-time extensions; OWASP Threat Dragon JSON adapter; STRIDE per-element annotations; physical-DFD distinction; event-partitioning helper; automatic ID renumbering.
