# 45 — IDEF0 Function Modeling Standard Reference

> **Status:** RESEARCHED — standard + reference images verified by assistant on 2026-06-03; implementation pending (Victor).

*The federal function-modeling notation — **boxes are functions/activities**, and the arrows around each box are positional by meaning: **I**nputs enter the **left**, **C**ontrols enter the **top**, **O**utputs exit the **right**, and **M**echanisms enter from the **bottom** (the "**ICOM**" rule). Models decompose hierarchically with disciplined **node numbering** (the top A0 box explodes into A1, A2, A3…, each of which explodes again into A11, A12…). Schematex's engine, in the validation-first tradition of `dfd` and `usecase`, **enforces the ICOM arrow placement and the decomposition numbering** — an output drawn entering the top, or a child node numbered out of sequence, is a structural error, not a silent drawing. IDEF0 is a genuine US federal standard (FIPS PUB 183), descended from SADT; it sits in the systems-engineering / process-modelling family near `dfd` (§31) and `bpmn` (§25).*

> **Primary References:**
> - **FIPS PUB 183** (1993-12-21). *Integration Definition for Function Modeling (IDEF0).* National Institute of Standards and Technology, U.S. Department of Commerce. — *The formal standard. Defines the box-and-arrow syntax, the ICOM arrow positions, arrow segmentation/branching/joining rules, tunneling, node numbering, and the decomposition discipline. This is "the standard" for this doc. Withdrawn as a Federal Standard 2008-09-02 but still the canonical IDEF0 spec.* PDF mirror: https://www.idef.com/wp-content/uploads/2016/02/idef0.pdf (verified resolves, 707 KB) — *Two verbatim definitions pulled from it are quoted below under Element vocabulary; deeper clause-by-clause (Annex C standard diagram form, §3.3.2 fork/join) still TODO.*
> - **Ross, Douglas T.** (1977). "Structured Analysis (SA): A Language for Communicating Ideas." *IEEE Transactions on Software Engineering* SE-3(1): 16–34. — *The SADT origin of IDEF0; Ross's Structured Analysis and Design Technique is the direct ancestor.* <!-- TODO(Victor): verify exact volume/pages -->
> - **Marca, David A. & McGowan, Clement L.** (1988). *SADT: Structured Analysis and Design Technique.* McGraw-Hill. ISBN 978-0070402355 (UNVERIFIED). — *The standard SADT/IDEF0 textbook; worked decomposition discipline and ICOM examples.* <!-- TODO(Victor): verify ISBN -->
> - **US Air Force ICAM Program** (late 1970s–1981). — *IDEF0 originated as "ICAM Definition" notation under the Integrated Computer-Aided Manufacturing program; the "IDEF" name traces here.* <!-- TODO(Victor): confirm exact program citation -->
> - **Wikipedia, "IDEF0."** https://en.wikipedia.org/wiki/IDEF0 (verified) — *Source of the verified reference images below and the conventional box / ICOM positions / A-node numbering used here.*
> - **Wikimedia Commons, "Category:IDEF0."** https://commons.wikimedia.org/wiki/Category:IDEF0 (verified) — *Stable image host for the reference targets.*
> - **ISO landscape:** *No direct ISO equivalent of IDEF0 is confirmed; IDEF0 is referenced in systems-engineering practice (e.g. INCOSE handbooks) but is not itself an ISO standard.* <!-- TODO(Victor): confirm there is no ISO IDEF0 -->
>
> *Notes on the standard landscape.* Unlike most diagrams in this batch, IDEF0 **is a real, formal standard** (FIPS PUB 183, 1993) with precise graphical rules — making it an excellent fit for Schematex's "standards-compliant, validating" stance. The notation is rigid by design: the ICOM arrow positions and the node-numbering scheme are not stylistic, they are the semantics.

---

## 0. Positioning

IDEF0 is the workhorse of **defence and government systems/process modelling** (it originated in the US Air Force ICAM program) and remains in active use in systems engineering, enterprise architecture, and manufacturing process documentation. It is taught in systems-engineering curricula and produced in tools like iGrafx, Microsoft Visio (IDEF0 stencil), Vitech CORE, and ConceptDraw. As a formal FIPS standard with a small, rigid symbol set and hard placement rules, it is an ideal "validating renderer" target. It sits in the systems-engineering / process-modelling family beside `dfd` (§31, data-movement) and `bpmn` (§25, executable process) — IDEF0 models **functions and their I/C/O/M interfaces and decomposition**, a different abstraction from both.

**Why this is a strong Schematex fit (the thesis).** Every general drawing tool will happily let you draw an IDEF0 "output" arrow into the top of a box, or number a child box `A7` under parent `A2`. Both are *standard violations* that no general tool catches. Schematex's differentiator is exactly this: the engine **knows the FIPS 183 rules and refuses to draw the diagram wrong**. The differentiator is **structural enforcement**, not numeric computation — there is no probability or eigenvector here, the value is the *discipline*. Concretely the engine validates that (a) every arrow occupies its ICOM-correct edge (inputs left, controls top, outputs right, mechanisms bottom), (b) arrows branch/join legally, (c) the decomposition node numbers are consistent (a child diagram `A2` contains exactly boxes `A21…A2n`), and (d) the child diagram's boundary ICOM arrows balance to the parent box's arrows. Suggested keyword: **`idef0`**.

---

## Element vocabulary

| Element | Meaning | Position / notation |
|---|---|---|
| **Function (activity) box** | a verb / verb-phrase function ("Manufacture part", "Approve claim") | rectangle with the function name centred; carries a **box number 0–6** in the **lower-right** corner |
| **Input arrow (I)** | data/objects the function **transforms** into output | enters the **left** edge, arrowhead pointing into the box |
| **Control arrow (C)** | conditions/constraints required to produce *correct* output (rules, plans, standards, schedules) | enters the **top** edge, pointing down into the box |
| **Output arrow (O)** | data/objects the function **produces** | exits the **right** edge, pointing away |
| **Mechanism arrow (M)** | the resource/agent (people, machines, systems) that **performs** the function | enters the **bottom** edge, pointing **up** into the box |
| **Call arrow** | a special mechanism arrow pointing **down** out of the bottom — references another model's function (detail sharing between models) | attaches bottom, points downward |
| **ICOM code** | "*A code that associates the boundary arrows of a child diagram with the arrows of its parent box*" (FIPS 183 §2.27) — `I1`, `C2`, `O1`, `M1` | small code where a boundary arrow meets the diagram frame |
| **Node number** | hierarchical id: context box `A-0` ("A minus zero"); its decomposition diagram `A0` holds boxes `A1…An`; box `A2` decomposes into `A21…A2m`; etc. | the **node number** labels the diagram; the **box number** (0–6) sits in each box's lower-right |
| **Arrow fork (branch)** | one arrow segment divides into two or more — often **unbundling** of meaning | fork junction; each branch may carry its own label |
| **Arrow join (merge)** | two or more segments merge into one — often **bundling** of meaning | join junction |
| **Arrow label** | noun / noun-phrase naming the arrow's meaning | placed beside the arrow segment |
| **Tunneled arrow** | "*An arrow (with special notation) that does not follow the normal requirement that each arrow on a diagram must correspond to arrows on related parent and child diagrams*" (FIPS 183 §2.x) — drawn with **parentheses** at one end | parentheses at the **connected** end = arrow not shown on the parent; parentheses at the **unconnected (boundary)** end = arrow not carried into the child |
| **Context (A-0) diagram** | the single top box bounding the whole model, with all external ICOM arrows and a Purpose + Viewpoint statement | one box, node `A-0` |
| **Standard diagram form** | every diagram sits in a frame with a bottom **title block**: `Node:` / `Title:` / `Number:` (C-number) | bottom strip of the page frame |

---

## Engine computation (the differentiator)

The engine **enforces structure** — there is nothing to "compute" numerically; the work is validation + correct-by-construction layout.

1. **ICOM placement enforcement.** Every arrow connecting to a box must attach on the correct edge for its role — Input→left, Control→top, Output→right, Mechanism→bottom, Call→bottom-pointing-down. An output drawn into the top, or a control into the left, is a **validation error** (reject, don't silently draw). This is the headline rule.
2. **Arrow continuity (fork / join).** Arrows may fork (one source → many destinations, unbundling) and join (many → one, bundling); the validator checks every segment resolves to a declared source/sink and that branch labels are consistent (an unlabelled branch inherits the parent label; a relabelled branch must be a valid sub-meaning).
3. **Decomposition numbering.** Context box is `A-0`; its decomposition diagram `A0` contains boxes numbered `1…n` with node ids `A1…An`; box `A2`'s child diagram contains `A21…A2m`. The validator checks numbering is **contiguous** (no gaps), **in range** (3–6 box guideline, see #5), and consistent with the parent (child of `A2` must be `A2x`, never `A3x`).
4. **ICOM balancing across levels.** The boundary arrows of a child diagram must correspond, by ICOM code, to the I/C/O/M arrows of the parent box it decomposes — every parent interface is accounted for in the child, and every child boundary arrow either maps to a parent arrow **or** is explicitly **tunneled** (parenthesised). Unbalanced interfaces that are *not* tunneled are an error.
5. **Box-count guideline.** Warn when a diagram has fewer than 3 or more than 6 boxes — FIPS 183's "3-to-6" decomposition recommendation. (Warning, not hard error.)

**Layout (correct-by-construction).** Boxes are arranged on a **diagonal staircase** from **upper-left to lower-right** (FIPS convention; confirmed in the reference images), so that the dominant flow runs along the diagonal and feedback/feedforward arrows route in the margins. ICOM arrows are routed to their mandated edges; box numbers are placed lower-right; the page gets the standard frame + bottom title block (Node / Title / Number). Boundary arrows are ICOM-coded along the frame.

---

## DSL sketch (draft — needs Victor)

```
idef0 "Manufacture product"
  node A0

  function A1 "Plan production"
  function A2 "Make parts"
  function A3 "Assemble product"

  # arrows by ICOM role: input | control | output | mechanism
  control A1.C "Production schedule"
  input   A1.I "Sales orders"
  A1 -> A2 : "Work plan"            # output of A1 becomes input of A2
  input   A2.I "Raw material"
  mechanism A2.M "CNC machines"
  A2 -> A3 : "Finished parts"
  control A3.C "Quality standard"
  output  A3.O "Product"
  mechanism A3.M "Assembly line"
```

*Draft only.* Open choices: how to express ICOM role per arrow (suffix `.I/.C/.O/.M` above vs explicit `arrow ... role: control`); how box-to-box flows declare whether the arrow is the source's output and the target's input vs control (a box's output is *very often* the next box's control, not input — the DSL must let the author say which edge it lands on); how decomposition into child diagrams is represented (one document per node vs nested blocks); ICOM-code auto-assignment for boundary arrows; tunnel notation (e.g. `(tunnel)` flag on an arrow); the Purpose/Viewpoint metadata of the A-0 diagram.

---

## Reference images (visual development targets)

All three verified to resolve and **viewed** by the assistant; hosted on stable Wikimedia Commons (`upload.wikimedia.org`). These are the pixel targets the renderer must match.

1. **The canonical ICOM box** — `IDEF_Box_Format.jpg`
   https://upload.wikimedia.org/wikipedia/commons/9/96/IDEF_Box_Format.jpg
   *Viewed:* a single light-grey rectangle labelled "Function Name" centred, with "Function Number" in the **lower-right** corner. Four arrows: **Input** enters from the left with a solid filled arrowhead into the box; **Control** descends from the top; **Output** exits the right; **Mechanism (Resources)** rises from the bottom into the box. Labels sit *outside* the box at the open end of each arrow. This is the atomic unit — get this exactly right first.

2. **The A-0 top-level context diagram** — `IDEF_Top-Level_Context_Diagram.jpg`
   https://upload.wikimedia.org/wikipedia/commons/c/c1/IDEF_Top-Level_Context_Diagram.jpg
   *Viewed:* one box "Plan New Information Program". Two **inputs** stacked on the left ("Issues", "Operations Data"), one **control** on top ("Program Charter"), one **output** on the right ("Program Plan"), one **mechanism** bottom ("Program Team"). Below the box: a **Purpose** line and a **Viewpoint** line. At the very bottom, the **title block** strip: left cell node `QA/A-0`, centre cell title `Manage Information Resources`, right cell (C-number) empty. Shows the standard page frame.

3. **A full A0 decomposition with staircase + tunneling** — `IDEF_Diagram_Example.jpg`
   https://upload.wikimedia.org/wikipedia/commons/3/31/IDEF_Diagram_Example.jpg
   *Viewed:* four boxes — "Remove and replace" (1), "Schedule into shop" (2), "Inspect or repair" (3), "Monitor and route" (4) — arranged on a clear **diagonal staircase** from upper-left to lower-right, each with its **box number in the lower-right**. Inter-box outputs feed downstream inputs/controls; long feedback arrows ("Replacement or original (repaired)", "Spare") route through the left/bottom margins. Several arrows carry **tunnel markers** (small lightning-bolt / parenthesised-style notation, e.g. "Asset (before repair)", "Asset (after repair)") where they enter/leave without a parent-level correspondence. Bottom title block: `Node: A0F` · `Title: Maintain Reparable Spares` · `Number: pg. 4–5`.

4. *(Optional, not downloaded)* SVG gallery on the same Wikipedia page — `3 Arrow Positions and Roles.svg`, `11 Arrow Fork and Join Structures.svg`, `20 Typical Node Tree.svg`, `21 Negative Node-Numbered Context.svg` — useful later for fork/join and the node-tree view. Resolve via `File:` lookup on Commons if needed.

**Visual conventions our renderer must match**
- **Box shape:** plain rectangle (reference uses a light-grey fill; Schematex house theme can re-tone), function name centred, **box number 0–6 in the lower-right interior corner**.
- **ICOM arrow sides + label placement:** Input → **left** edge, Control → **top** edge, Output → **right** edge, Mechanism → **bottom** edge (pointing **up** into the box); Call → bottom, pointing **down**. Each arrow's **label sits outside the box at the arrow's open (boundary) end**, not on the box.
- **Diagonal box arrangement:** boxes step **upper-left → lower-right** on a staircase; primary flow runs along the diagonal; feedback/feedforward arrows route in the margins (left and bottom), never through boxes.
- **Node-number corner & title block:** box number lower-right *inside* each box; the **page frame** carries a bottom **title block** with `Node` / `Title` / `Number` cells.
- **Tunneled-arrow notation:** parentheses at one end of the arrow (reference also shows a lightning-bolt-style tunnel glyph) — parentheses at the **connected** end mean "not shown on parent"; at the **unconnected/boundary** end mean "not carried into child". Renderer must support drawing this marker and the validator must understand it (see Engine #4).
- **ICOM boundary codes:** `I1/C1/O1/M1…` printed where each boundary arrow meets the frame, numbering down the relevant edge.

---

## TODO (Victor — standard research + dev)

- [ ] **Decomposition scope decision — the big one.** v0.1 = **single-level** (one diagram: boxes + ICOM arrows + staircase + numbering + the ICOM-placement validator). Multi-level (**parent box → child diagram with cross-level ICOM balancing**, Engine #4) is materially harder: it requires a multi-document/nested model, node-number propagation, and the parent↔child interface reconciliation including tunneled arrows. **Recommendation: ship single-level v0.1, defer multi-level + ICOM balancing to v0.2** — but the DSL and types should be designed *now* so the node/box numbering and tunnel flags don't need a breaking change later.
- [ ] Read FIPS 183 **Annex C (standard diagram form)** and **§3.3.2 (fork/join, arrow segments)** clause-by-clause — the WebFetch summary covered tunneling + ICOM-code definitions verbatim but not the exact fork/join and title-block field rules. (PDF mirror verified; needs a local poppler render or page-by-page read.)
- [ ] Confirm Ross 1977 volume/pages, Marca/McGowan ISBN, the ICAM program citation, and that **no ISO IDEF0 equivalent** exists.
- [ ] Full symbol set spec: box geometry + lower-right number, four ICOM edge attachments + call arrow, fork/join/bundle, tunneled-arrow glyph (parentheses vs lightning-bolt — pick one for the house style), ICOM boundary codes, the page frame + title block.
- [ ] Layout rules: formalise the staircase (spacing, diagonal step, margin routing for feedback arrows), deterministic box ordering, edge-routing so arrows never cross a box.
- [ ] Validation engine: ICOM placement (headline), fork/join continuity, numbering contiguity + range, the 3–6 box warning, and (v0.2) parent↔child ICOM balancing with tunnel exemptions.
- [ ] Edge cases: an output that lands on the next box's **control** vs **input** (very common — DSL must disambiguate); arrows that fork to both an input and a control; tunneled arrows at each end; the A-0 Purpose/Viewpoint metadata block.
- [ ] Cluster placement + `00-OVERVIEW.md` update; write the contrast section **IDEF0 vs DFD (§31)** (functions+ICOM+decomposition vs data-movement) and **vs BPMN (§25)**.
- [ ] 3–5 canonical test cases, including deliberate **ICOM-misplacement** (output into top) and **numbering-gap** error cases, plus the reparable-spares staircase from reference image 3 as a golden render.
- [ ] impl doc in `../CoCEO/schematex/impl/`.
