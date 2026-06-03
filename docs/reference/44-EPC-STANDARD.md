# 44 — EPC (Event-driven Process Chain) Standard Reference

> **Status:** RESEARCHED — standard research + reference images gathered by assistant on 2026-06-03; DSL finalisation + implementation pending (Victor). See `## Reference images` and `## TODO (Victor)`.

*The ARIS business-process notation — a strict alternation of **events (hexagons)** and **functions (rounded rectangles)** wired by control flow, with **logical connectors AND (∧) / OR (∨) / XOR (×)** to split and join the chain. Schematex's engine, in the validation-first tradition of `dfd` and `usecase`, **validates the EPC well-formedness rules** — the event↔function alternation, the connector legality (e.g. an event must not be the source of an OR/XOR *split*, because an event cannot "decide"), and split/join balance. It belongs in the process-modelling family alongside `25-BPMN-STANDARD.md`: BPMN is the OMG token-flow execution standard; EPC is the ARIS semi-formal business view that dominated SAP and German enterprise modelling.*

> **Abstract.** The Event-driven Process Chain (EPC; German *Ereignisgesteuerte Prozesskette, EPK*) is the core control-flow notation of the ARIS framework (Architecture of Integrated Information Systems), introduced by Keller, Nüttgens & Scheer at Saarland University in 1992 and popularised through IDS Scheer's ARIS Toolset and its deep embedding in SAP R/3 reference models. An EPC is a directed, **bipartite** graph: **events** (passive states — "Order received") and **functions** (active tasks — "Check credit") strictly **alternate** along the control flow, and wherever the flow branches or merges it passes through a **logical connector** — **AND (∧)**, **OR (∨)**, or **XOR (×)** — drawn as a small circle. The notation is *semi-formal*: visually simple enough for business analysts, yet carrying enough structure that well-formedness can be checked mechanically. That checkability is Schematex's hook. EPC is **not** an ISO/OMG standard (unlike BPMN); it is a stable, thoroughly documented industry/academic convention. The **extended EPC (eEPC)** decorates functions with side-attached **organisational units**, **data / information objects**, and **application systems**, turning a bare control-flow chain into a richer process picture. The Schematex engine's differentiator is **structural validation** — enforcing the alternation rule and connector legality (most distinctively: *an event may never be the source of an OR- or XOR-split, because a passive event cannot make a decision*) — rather than any numeric computation.*

> **Primary References:**
> - **Keller, G.; Nüttgens, M.; Scheer, A.-W.** (1992). *Semantische Prozeßmodellierung auf der Grundlage „Ereignisgesteuerter Prozeßketten (EPK)".* Veröffentlichungen des Instituts für Wirtschaftsinformatik (IWi), Heft 89, Universität des Saarlandes. — *The original paper that introduced the EPC (EPK) notation; the foundational reference.* <!-- TODO(Victor): verify exact Heft number/title -->
> - **Scheer, August-Wilhelm** (2000). *ARIS — Business Process Modeling,* 3rd ed. Springer. ISBN 978-3540658351. — *The definitive ARIS reference; defines the EPC element set (events, functions, connectors), the control-flow rules, and the extended eEPC (organisational units, data, systems).* <!-- TODO(Victor): verify edition/ISBN -->
> - **Mendling, Jan** (2008). *Metrics for Process Models: Empirical Foundations of Verification, Error Prediction, and Guidelines for Correctness.* LNBIP 6, Springer. — *Formalises EPC soundness and the connector-legality rules the validator should enforce.* <!-- TODO(Victor): verify LNBIP volume -->
> - **van der Aalst, W.M.P.** (1999). "Formalization and verification of event-driven process chains." *Information and Software Technology* 41(10): 639–650. — *The standard formal-semantics treatment of EPC connectors and soundness.* <!-- TODO(Victor): verify volume/pages -->
> - **Wikipedia, "Event-driven process chain."** https://en.wikipedia.org/wiki/Event-driven_process_chain — *Verified 2026-06-03. Confirms: event = hexagon (passive state), function = rounded rectangle (active task), control flow = directed arrows, the three connectors AND ∧ / OR ∨ / XOR ×, the rule that an EPC starts and ends with events, the event/function alternation rule, and the eEPC elements (organisation unit = ellipse, information/material/resource object = rectangle, process path = compound symbol). Attributes the original notation to Keller, Nüttgens & Scheer (1992) and notes the "non-local semantics" of OR connectors (van der Aalst et al.).*
>
> *Notes on the standard landscape.* EPC is an **industry/academic convention** (Scheer/ARIS, IDS Scheer's ARIS Toolset, embedded in SAP R/3 reference models), **not** an ISO/OMG standard, but its element set and rules are stable and well-documented. The notation's defining discipline is the **bipartite event/function alternation**: control flow always alternates event → function → event, with logical connectors interposed where the chain splits or joins. **Colour convention (verified against Wikimedia reference images, see below):** events are drawn as **red / salmon-pink hexagons**, functions as **green rounded rectangles** — note this corrects an early guess that events were green; in the canonical ARIS/Wikipedia palette it is the *function* that is green and the *event* that is red/pink. Connectors are **small grey circles** carrying the operator glyph (∧ / ∨ / × ; XOR is also frequently rendered as the literal text "XOR").

---

## 0. Positioning

EPC was the dominant business-process notation in German-speaking enterprise IT and the SAP ecosystem for two decades (ARIS Toolset shipped tens of thousands of EPC models), and it is still taught in European business-informatics programs and used wherever ARIS lives. It belongs squarely beside `bpmn` (§25) in Schematex's process cluster: same audience, different notation. BPMN is the OMG executable-token standard with pools, lanes, gateways, and message flow; EPC is the older, lighter, semi-formal ARIS view whose whole identity is the **rigid event/function alternation** and the three logical connectors.

The differentiator is **structural validation**, not computation. Anyone can draw a hexagon and a rounded box; the value EPC tooling must deliver is enforcing the rules that make an EPC *sound*: events and functions strictly alternate; an **event may not be the source of an OR/XOR split** (only a function can make a decision); splits and joins must balance by connector type; the chain starts and ends with events. Suggested keyword: **`epc`**.

---

## Element vocabulary

Shapes and colours below are **verified against the two Wikimedia Commons reference images** (the *Elements of an EPC* legend and the *EPC diagram* worked example — see `## Reference images`). The control-flow core is the first six rows; the eEPC adornments (last four rows) hang off the *sides* of functions.

### Control-flow core (plain EPC)

| Element | Meaning | Conventional notation (verified) |
|---|---|---|
| **Event** | a passive state / trigger ("Order received", "Order confirmed"); a condition that has occurred | **elongated hexagon**, fill **red / salmon-pink**, black border, centred label |
| **Function** | an active task / activity ("Check customer order information", "Ship goods") that transforms one state into the next | **rounded rectangle**, fill **green**, black border, centred label |
| **Control flow** | the directed sequence event → function → event | **solid directed arrow** (single arrowhead). *Note:* Wikipedia's prose calls it "dashed", but every canonical reference image draws it solid; treat solid as the renderer default. |
| **AND connector (∧)** | split: all outgoing branches activate concurrently (fork); join: wait for / synchronise all (join) | **small circle** marked **∧** |
| **OR connector (∨)** | split: one-or-more branches activate; join: synchronise exactly those that were taken (this is the source of EPC's "non-local semantics") | **small circle** marked **∨** |
| **XOR connector (×)** | split: exactly one branch (decision); join: merge alternatives | **small circle** marked **×** (frequently rendered as the literal text **"XOR"**) |

A connector is a **split** (one in-arc, ≥2 out-arcs) or a **join** (≥2 in-arcs, one out-arc); the *same* glyph is used for both — direction of fan-out distinguishes them. The reference images label connector callouts as "XOR rozdělení" (split) vs "XOR sloučení" (join), "AND rozdělení" / "AND sloučení".

### Extended EPC (eEPC) adornments — attached to functions

| Element | Meaning | Conventional notation (verified) |
|---|---|---|
| **Organisational unit** | the department / role that *executes* the function ("Customer Support Center") | **rectangle with a vertical bar / ellipse-on-stem**; fill **orange / amber**; attached to the function by a plain (arrowless) line on its side. Wikipedia describes the classic ARIS shape as an **ellipse**; the modern legend image uses an amber rounded rectangle. |
| **Information / data object** | input consumed or output produced by the function ("Order Request Form" → in, "Order Confirmation" → out) | **rectangle**, fill **light grey**, often with a small folded-corner document glyph; linked to the function by a plain line (input on the left, output on the right) |
| **Application / supporting system** | the IT system supporting the function ("CRM") | **rectangle with double vertical side-bars**, fill **cyan / turquoise**; attached by a plain line |
| **Process interface / path** | hand-off to / from another EPC (a sub-process or continuation) | **compound symbol** — a function rounded-rectangle superimposed on an event hexagon |

---

## Engine computation (the differentiator)

The engine **validates structure**, it does not compute a number (contrast `32-PERT` which computes a schedule, or `37-FAULT-TREE` which computes cut sets). The rules below are the EPC well-formedness criteria as stated by Wikipedia, van der Aalst (1999) and Mendling (2008); they are confirmed by the reference images (e.g. every XOR-split in the worked example is preceded by a *function*, never an event).

1. **Bipartite alternation:** along any control-flow path, events and functions strictly alternate — **no event→event and no function→function directly**. A connector may sit between them, but it does not break the alternation: traversing through connectors, the next *node* must be of the opposite kind. (Wikipedia: "Functions and events have to alternate, either directly or when they are linked via one or more connectors.")
2. **Start / end:** the EPC begins with **at least one start event** (no incoming control flow) and ends with **at least one end event** (no outgoing control flow). Functions may not be start or end nodes.
3. **Connector legality — the signature rule:** an **event must not be the source of an OR-split or XOR-split** — a passive event cannot make a decision; only a **function** may precede an OR/XOR decision split. (An **AND-split after an event is allowed** — concurrency does not require a decision.) Symmetrically the literature also restricts which connectors may *follow* events; the v0.1 hard rule is the event→{OR,XOR}-split prohibition.
4. **Split / join balancing:** a split of type T should be closed by a join of type T in a sound model; report mismatches (e.g. an AND-split later merged by an XOR-join → lack-of-synchronisation; an XOR-split merged by an AND-join → deadlock). v0.1: **warn**, do not hard-error, since real-world EPCs are sometimes deliberately unbalanced.
5. **Single in / single out per event & function** — connectors carry all the multiplicity; an event or function with two outgoing control-flow arcs is malformed (the split belongs on a connector). No dangling arcs (every node reachable from a start event, every node reaching an end event).
6. (Deferred) **soundness check** — full reachability / no-deadlock / proper-completion analysis per van der Aalst's formalisation, including the non-local OR-join semantics. Out of scope for v0.1.

AI-friendly errors, e.g. *"Event 'Order received' on line 7 is the source of an XOR split — events cannot decide; insert a function before the split."* Layout is a **layered top-down process flow** matching the reference images (vertical event→function→event columns, connectors fanning out to parallel branches, loop-backs routed around the side); reuse the flowchart Sugiyama layering.

---

## DSL sketch (draft — needs Victor)

```
epc "Order fulfilment"
  layout: tb

  event   E1 "Order received"
  function F1 "Check credit"
  xor     X1                       # decision split after a function (legal)
  event   E2 "Credit OK"
  event   E3 "Credit rejected"
  function F2 "Ship goods"
  function F3 "Notify customer"
  event   E4 "Order shipped"
  event   E5 "Order cancelled"

  E1 -> F1
  F1 -> X1
  X1 -> E2
  X1 -> E3
  E2 -> F2 -> E4
  E3 -> F3 -> E5
```

*Draft only.* Open choices: whether connectors are declared **nodes** (above) or inline **edge operators** (`F1 ->xor (E2 | E3)`); how AND/OR/XOR **splits vs joins** are distinguished syntactically (or inferred purely from fan-in/fan-out, since the same glyph serves both); whether **eEPC adornments** (org unit / data / system on a function) are in v0.1 or deferred; CJK-quote support for labels. See `## TODO (Victor)` for the two decisions that gate the grammar.

---

## Reference images (visual development targets)

All URLs **verified to resolve 2026-06-03** (HTTP 200). Prefer the stable Wikimedia Commons originals.

1. **Elements of an EPC — the legend / Rosetta stone.** *(viewed)*
   - File page: https://commons.wikimedia.org/wiki/File:Elements_of_an_Event-driven_Process_Chain.svg
   - SVG: https://upload.wikimedia.org/wikipedia/commons/5/54/Elements_of_an_Event-driven_Process_Chain.svg
   - 960px PNG: https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Elements_of_an_Event-driven_Process_Chain.svg/960px-Elements_of_an_Event-driven_Process_Chain.svg.png
   - License: **public domain.** **What it shows:** a single function "Check Customer Order Information" (**green rounded rectangle**) in the centre, with one incoming event "Customer Order Received" and one outgoing event "Order Confirmed" (both **pink/magenta hexagons**) on the vertical control-flow axis. Hanging off the function's *sides* by plain (arrowless) lines: **Input** "Order Request Form" and **Output** "Order Confirmation" (grey data rectangles with a folded-corner doc glyph), a **Supporting System** "CRM" (cyan rectangle with double vertical side-bars), and an **Organization Unit** "Customer Support Center" (orange rectangle). Blue speech-bubble callouts name each element kind. This is the single best legend for our element palette.

2. **EPC worked example (Wikipedia editing process) — full chain with connectors.** *(viewed)*
   - File page: https://commons.wikimedia.org/wiki/File:EPC_diagram.png
   - PNG: https://upload.wikimedia.org/wikipedia/commons/3/3f/EPC_diagram.png
   - License: **CC BY-SA 3.0 / GFDL.** **What it shows:** a complete top-to-bottom EPC. Events are **red/salmon hexagons**, functions are **green rounded rectangles**. Connectors are **small grey circles**: XOR connectors render the literal text "XOR", AND connectors render the **∧** glyph. The flow runs vertically (event→function→XOR-split→alternative events→…); there is an **AND-split / AND-join** parallel block ("googling" ∥ "literature study") and a **loop-back** arc routed down the left margin ("article edited" feeding back). Square callout boxes annotate each connector as a split ("rozdělení") or join ("sloučení"). Confirms: connectors always sit *between* an event and a function, never event-adjacent on a decision.

3. **eEPK komplexes Beispiel — a dense real eEPC (org units + data).**
   - File page: https://commons.wikimedia.org/wiki/File:EPK_komplexes_Beispiel.svg
   - SVG: https://upload.wikimedia.org/wikipedia/commons/6/63/EPK_komplexes_Beispiel.svg
   - 330px PNG: https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/EPK_komplexes_Beispiel.svg/330px-EPK_komplexes_Beispiel.svg.png
   - License: **CC BY 2.5.** A tall (858×1842) complex example useful as a stress-test target for layout density and eEPC side-attachments once v0.1 control flow works.

**Visual conventions our renderer must match:**

- **Event = elongated hexagon, filled red / salmon-pink**, black border, centred label. (NOT green — correct the early scaffold guess.)
- **Function = rounded rectangle, filled green**, black border, centred label.
- **Logical connector = small circle** carrying the operator glyph: **∧** for AND, **∨** for OR, **×** (or literal "XOR") for XOR. Same circle for split and join; fan-out direction distinguishes them. Connectors are grey-filled in the reference palette.
- **Control flow = solid directed arrows**, single arrowhead, running **top-to-bottom** (vertical primary axis). A connector always sits between an event and a function — never directly between two events or two functions.
- **eEPC attachments hang off the function's left/right sides** by plain (arrowless) lines: data/information objects (grey rectangle + doc glyph, input on left / output on right), application/supporting systems (cyan rectangle with double side-bars), organisation units (orange rectangle / ellipse). They are *not* part of the control-flow chain and never carry arrowheads.
- **Loops** (e.g. rework cycles) are legal and routed around the margin, not through the main column.

## TODO (Victor — decisions + dev)

**Two decisions gate the grammar and the v0.1 scope — resolve these first:**

- [ ] **🔑 eEPC adornments in v0.1, or deferred?** A bare event/function/connector EPC is fully useful and matches reference image #2 exactly; the org-unit / data-object / application-system side-attachments (reference image #1) are what make it an *eEPC*. Recommendation to weigh: ship **plain EPC control flow + validation in v0.1** (the differentiator lives entirely in the control-flow rules), then add eEPC side-attachments in v0.2 — they are additive (side decorations on functions) and don't touch the validation engine. Standard-completeness memory says cover the full vocabulary; counter-argument is the side-attachments are a clean second layer, not a partial subset of the core.
- [ ] **🔑 Connector = node, or edge-operator?** Two viable DSL shapes: (a) connectors are **declared nodes** with ids (`xor X1`, then `F1 -> X1`, `X1 -> E2`, `X1 -> E3`) — closest to the graph model and to how ARIS stores them, makes split/join fall out of fan-in/out naturally; (b) connectors are **inline operators on edges** (`F1 ->xor (E2 | E3)`) — terser, more LLM-friendly, but needs sugar for joins and for a connector feeding another connector. Recommendation to weigh: **node form** as canonical (cleaner validation, handles nested/chained connectors), optional inline sugar later. This choice also settles how split-vs-join is expressed (infer from arc count vs explicit keyword).

**Remaining research / dev:**

- [ ] Confirm the original Keller/Nüttgens/Scheer 1992 Heft reference, Scheer *ARIS — Business Process Modeling* edition/ISBN, van der Aalst (1999) volume/pages, and Mendling (2008) LNBIP volume (citations still marked `<!-- TODO(Victor): verify -->`). Wikipedia content is verified; the book/paper bibliographic details are not.
- [ ] Lock the palette: event red/salmon hex, function green rounded-rect, grey connector circles, plus `monochrome` (shape-only, no fill) and `dark` variants per house theming. The reference images give the default colours.
- [ ] Layout rules: layered top-down process flow (reuse flowchart Sugiyama), split/join fan-out geometry, connector circle sizing/placement, deterministic branch ordering, margin-routed loop-backs (see reference image #2).
- [ ] Validation engine: alternation (through connectors), start/end events, the **event-cannot-OR/XOR-split** rule (signature check), split/join type balancing (warn), single-in/single-out, reachability; defer full soundness.
- [ ] Edge cases: nested splits, connector→connector chains, unbalanced connectors (warn vs error), multiple start/end events, loops in the chain.
- [ ] Contrast doc section vs BPMN (§25): when to use which; optional EPC↔BPMN mapping note (event↔nothing/condition, function↔task, XOR-connector↔exclusive gateway, AND↔parallel gateway, OR↔inclusive gateway).
- [ ] 3–5 canonical test cases including at least one rule-violation (event→XOR-split) asserting the readable error, and one with an AND-parallel block + loop-back (mirroring reference image #2).
- [ ] impl doc in `../CoCEO/schematex/impl/`.
