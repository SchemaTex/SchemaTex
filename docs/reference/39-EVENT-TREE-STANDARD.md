# 39 — Event Tree Analysis (ETA) Standard Reference

> **Status:** RESEARCHED — standard + reference images gathered by assistant on 2026-06-03; implementation pending (Victor). Items still needing Victor's call are in `## TODO`.

*The inductive, forward-looking complement to the fault tree — start from a single **initiating event** on the left, then branch at each **safety function / barrier** into binary success / failure outcomes, terminating in a set of **outcome states** (sequences) on the right. Each path's frequency is the **initiating-event frequency × the product of the branch probabilities along the path** (`P = P_IE · P₁ · P₂ · … · Pₙ`), and the convention is **upper branch = success, lower branch = failure**. Schematex's engine, exactly as `faulttree` computes minimal cut sets and `pert` computes the schedule, **computes the per-path outcome frequencies** and the aggregated outcome-state totals — the render is downstream of the arithmetic. ETA is the **right wing of a bowtie**: where the fault tree (left wing, `37`) deductively decomposes the causes of the central event, the event tree inductively propagates its consequences.*

> **Primary References:**
> - **IEC 62502:2010 Ed. 1.0** — *Analysis techniques for dependability — Event tree analysis (ETA).* International Electrotechnical Commission, Geneva; published 2010-10-27. — *The international standard. Per its published scope it (a) defines the essential terms and the usage of symbols and graphical representation, (b) specifies the procedural steps for constructing the event tree, (c) covers assumptions / limitations / benefits, (d) relates ETA to other dependability & risk techniques, (e) gives qualitative and quantitative evaluation guidelines, and (f) provides worked examples. When this doc says "the standard," IEC 62502 is the cross-industry baseline.* Scope confirmed via the iTeh / SIS / GlobalSpec catalogue entries and the Eisner Safety summary (2010-11-01). https://standards.iteh.ai/catalog/standards/iec/55f87cfb-5abe-48a5-90f7-043051f92f06/iec-62502-2010 <!-- TODO(Victor): the freely available IEC sample PDF is a binary/preview only; verify the exact clause numbers for symbols (graphical representation) and for quantitative evaluation against the purchased full text -->
> - **NUREG-0492** — Vesely, W.E.; Goldberg, F.F.; Roberts, N.H.; Haasl, D.F. (1981). *Fault Tree Handbook.* U.S. Nuclear Regulatory Commission, Washington DC. https://www.nrc.gov/docs/ML1007/ML100780465.pdf — *Companion to the fault-tree doc; introduces event trees as the inductive counterpart used in nuclear PRA, and is the source of the FT-linked ("system fault tree feeds each branch probability") convention Schematex mirrors.*
> - **NUREG/CR-2300** (January 1983). *PRA Procedures Guide: A Guide to the Performance of Probabilistic Risk Assessments for Nuclear Power Plants.* U.S. NRC. — *The canonical PRA reference where the event-tree / fault-tree linking (large-ETA, small-FT vs small-ETA, large-FT) is codified; defines the event-tree header (top-event / safety-function) structure, the success-up / failure-down branch convention, sequence labelling, and sequence-frequency quantification.* <!-- TODO(Victor): verify volume/section numbers against the full NUREG/CR-2300 text -->
> - **ISO 31010:2019** — *Risk management — Risk assessment techniques.* (IEC 31010.) — *Lists event tree analysis (Annex B) alongside FTA, bowtie and cause–consequence analysis as recommended techniques; the bridge between the engineering standards and the cross-industry risk-management vocabulary.* <!-- TODO(Victor): verify the exact Annex-B sub-clause for ETA -->
> - **CCPS** (2nd ed., 2008). *Guidelines for Hazard Evaluation Procedures.* Center for Chemical Process Safety / Wiley, New York. — *Process-industry ETA practice; the event-tree / bowtie linkage (ETA = the consequence wing of the bowtie) that Schematex mirrors.* <!-- TODO(Victor): verify edition/ISBN -->
> - **Wikipedia, "Event tree analysis."** https://en.wikipedia.org/wiki/Event_tree_analysis — *Standards landscape (IEC 62502 + NUREG PRA), the conventional left→right binary-branch drawing, the `1s/1f` sequence labels, and the `P = ∏ branch probabilities` arithmetic used here. Source of the canonical reference image (see `## Reference images`).*
>
> *Notes on the standard landscape.* Like FTA, ETA's **method** is well-standardised (IEC 62502 cross-industry; NUREG/CR-2300 for nuclear PRA) but the **graphics are light-touch** — IEC 62502 *describes* symbols and representation but, as with IEC 61025 for fault trees, the universally recognised drawing is a de-facto convention rather than a pixel-exact mandate. That convention, confirmed by every reference image gathered below, is: a horizontal tree growing **left→right**; the **initiating event** entering as a horizontal line on the far left; a **header row** naming each safety function / barrier in column order; at each header the path **forks upward for success and downward for failure**; and each leaf on the right carrying an **outcome state** plus its **computed path frequency** `P = P_IE · ∏ Pᵢ`. Schematex treats that convention as the visual baseline and documents deviations below.

---

## 0. Positioning

Event Tree Analysis is the **inductive half of quantitative risk assessment** — the forward "what happens next?" complement to the fault tree's backward "what caused this?". ETA was essentially invented for nuclear power PRA (WASH-1400 / Reactor Safety Study, 1975), is the workhorse of nuclear sequence quantification (NUREG/CR-2300), is standard in process-safety hazard evaluation (CCPS), and is codified cross-industry by IEC 62502 and ISO 31010. It belongs in Schematex's **🛡 Risk & Reliability** cluster, sitting directly beside `37-FAULT-TREE-STANDARD.md` and `38-BOWTIE-STANDARD.md` — indeed an event tree **is** the right wing of a bowtie, so the three share the `ReliabilityTokens` theme and the "compute, don't just draw" stance.

The differentiator is the **computed path frequencies**, not the binary fork. draw.io and Lucidchart can draw a forking ladder and stop there — the result is a picture, not a model. A *real* ETA engine knows that each leaf's frequency is `f₀ · ∏ branch-probabilities`, that the success branch at each header is the complement `1 − p_fail` of the declared failure probability, and that outcome states **aggregate across paths** (sum the frequencies of every sequence ending in "Core damage"). That arithmetic — complementation, per-path product, per-outcome roll-up, and a dominant-sequence highlight — is precisely the stance `pert` takes toward the critical path and `petri` toward the marking: the render is downstream of the semantics. Suggested keyword: **`eventtree`** (alias `eta`), following the single-lowercase-word convention and the `faulttree`/`fta` precedent. We reject `tree` (collides with phylo / decisiontree / taxonomy) and `et` (too cryptic).

**Relation to `decisiontree` (§17), the one genuinely adjacent engine.** Both are left→right probability trees with multiplied branch values, and both must stay sharply distinct. A *decision tree* mixes decision (□), chance (○) and outcome (△) nodes and does **expected-value rollback** (`EV(chance)=Σpᵢ·EVᵢ`, `EV(decision)=max`) to *choose an action*; its chance-node children must sum to 1 and it rolls **right→left**. An *event tree* has **no decision nodes and no rollback** — every fork is a binary success/failure conditional on a named safety function, the analyst declares only the *failure* probability (success is computed as `1−p`), and the deliverable rolls **left→right** into per-leaf frequencies and per-outcome totals, not an optimal decision. The header-row-of-named-functions, the rigid success-up/failure-down geometry, and the outcome+frequency leaf column are unique to ETA. `eventtree` reuses none of `decisiontree`'s rollback; it shares only the layered-tree layout skeleton.

---

## Element vocabulary

IEC 62502 / NUREG vocabulary. The notation column is the de-facto convention confirmed against the reference images (`## Reference images`). The **v0.1** column marks what the first release renders; everything else is specified so the DSL and types don't change to add it later (per the project's standard-completeness rule, v0.1 covers the complete *static binary* ETA vocabulary, deferring only multi-branch / dynamic / linked-FT variants in `## Deferred`).

| Concept | Meaning | Conventional notation | v0.1 |
|---|---|---|:--:|
| **Initiating event (IE)** | the single triggering event (e.g. "Pipe rupture", "LOCA"); the root, on the far left | labelled box / horizontal line entering from the left, with its frequency `f₀` (per-year or per-demand) | ✅ |
| **Function event (header / top event / node)** | a safety function, barrier or system queried at each branch column (e.g. "ECCS operates?"); often labelled with a single-letter id (A, B, C…) | text in the **column header band** across the top of the tree; columns are in chronological/response order, left→right | ✅ |
| **Branch (success / failure leg)** | the binary fork at each function event: **upper leg = success, lower leg = failure** (universal convention) | the line steps **up** for success, continues level/steps **down** for failure; only the *active* branch under a given upstream path is drawn | ✅ |
| **Branch probability** | conditional probability on that leg, *given the upstream path*; the analyst declares the **failure** probability `p`, success is `1 − p` | small label on the branch leg (e.g. `(1f)` / `Failure (4f)`, or a numeric `p`); often sourced from a linked **fault tree** | ✅ |
| **Sequence / path** | one root-to-leaf route, identified by its branch outcomes (e.g. `IE · A_s · B_s · C_f` → label `1s 2s 3f`) | the polyline of horizontal/vertical step segments from IE to the leaf | ✅ |
| **Sequence id / designator** | a short code or row number identifying the sequence (`1s`, `IE-A-B̄`, sequence #) | leaf-row label or a "Sequence" column | ✅ |
| **Outcome / end state** | the categorised end state of a sequence (e.g. "Safe", "Core damage", "Early release") | text at the leaf, right edge, in an **Outcome** column header | ✅ |
| **Path frequency** | `f₀ × ∏ branch probabilities` along the path | numeral at the leaf, often shown as the product `P=(P_IE)(P₁ₛ)(P₂ₛ)…` (the reference image literally writes it out) | ✅ |
| **Outcome aggregation** | sum of path frequencies sharing an outcome state (e.g. total Core-Damage Frequency) | per-state total in a roll-up table / `<desc>` | ✅ |
| **Dominant sequence** | the largest-frequency path(s) — the ETA analogue of the FT single-point-of-failure | highlighted (reserved red accent) | ✅ |
| **Pruned / pass-through branch** | a function event that is *not applicable* on a given upstream path (no fork) — the line passes straight through | no fork drawn at that column for that path | ✅ |
| **Multi-branch (non-binary) node** | a node with >2 discrete outcomes (e.g. valve 100% / 20% / 0% open) | a 3-way+ fork | ⬜ deferred — *NUREG notes it exists; v0.1 is binary* |

---

## Engine computation (the differentiator)

For each function event, the **failure**-branch probability `p` is declared (or imported from a fault tree); the **success**-branch is `1 − p` automatically — the engine never asks the author to state both. Then walk every root-to-leaf path:

1. **Start** each path at the initiating-event frequency `f₀` (per-year or per-demand; the engine carries the unit through unchanged).
2. **At each function-event column**, multiply the running value by the branch probability taken — `p` on the failure (lower) leg, `1 − p` on the success (upper) leg. If the node is *pruned* on this path (pass-through), multiply by 1 (no fork).
3. The leaf value is the **path frequency** `Pᵢ = f₀ · ∏ⱼ branchⱼ`. (For the worked four-header tree in the reference image: the all-success leaf is `P_A = (P_IE)(P_1s)(P_2s)(P_3s)(P_4s)`; the first-header-failure leaf short-circuits to `P_F = (P_IE)(P_1f)` because no later function is queried once the path has already terminated.)
4. **Aggregate** path frequencies by outcome state → per-state total frequency (e.g. Σ over all "Core damage" leaves = total core-damage frequency). Aggregation is a `Map<outcome, Σ frequency>` — straightforward, but it is the number risk engineers actually want, so the engine owns it.
5. **Rank** the dominant sequences (largest-frequency paths) and flag them — the reserved-red analogue of the fault tree's single-points-of-failure highlight.

**Independence and conditioning.** Standard ETA assumes the declared branch probability is *conditional on the upstream path* and otherwise independent — the engine multiplies along the path without correlation correction (common-cause coupling is deferred, see `## Deferred`). A branch probability may differ per upstream path (e.g. ECCS failure is higher if offsite power already failed); the DSL must allow a per-path override even though the default is one `p` per column (this is the main open design question — see `## TODO`).

**Validation.** Branch failure probabilities in `[0,1]`; success + failure = 1 per fork (enforced by complementation, so it can't drift); `f₀` present and ≥ 0; every realised leaf carries an outcome state; no header referenced that isn't declared; column count consistent. A header with `p` outside `[0,1]`, a missing `f₀`, or a leaf with no outcome is a readable, line-numbered error (the `petri`/`faulttree` stance — the structure must be sound for the arithmetic to mean anything).

---

## DSL sketch (draft — needs Victor)

Header keyword **`eventtree`** (alias `eta`), flat declaration like `faulttree`. Two candidate forms for outcome labelling are shown; the choice is an open `## TODO`.

```
eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4        # f₀, per reactor-year

  # header functions (safety systems), in left→right response order.
  # each declares its FAILURE probability; success = 1 - p is computed.
  function A "ECCS injects"            p: 0.001
  function B "Containment spray"       p: 0.01
  function C "Containment integrity"   p: 0.005

  # outcome mapping — Form 1: S/F pattern grammar (one row per leaf, * = wildcard).
  #   read left→right over the declared functions; s = success leg, f = failure leg.
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"      # C not queried once B fails → pruned
  outcome f * * -> "Core damage"        # A fails → sequence terminates early

  # outcome mapping — Form 2 (alternative): explicit per-sequence rows with id.
  # sequence 3 = s s f  outcome: "Late release"
```

*Draft only.* Open design choices (mirrored in `## TODO`): (1) **per-column vs per-sequence** branch-probability declaration — one `p` per `function` (above) is the clean common case, but conditional ETA needs a per-path override syntax (`function B p: 0.01  when A=f: 0.05`); (2) **outcome grammar** — the `s/f/*` pattern (above) vs explicit per-leaf rows vs auto-generating all `2ⁿ` leaves and only labelling the interesting ones; (3) **fault-tree linking** — `function A from-fta: "ECCS-FT"` to import `p` as the computed `P(top)` of a sibling fault tree (the NUREG large-ETA/small-FT pattern); (4) **pruning syntax** — how the author says "C is not queried once B fails" so the engine collapses that fork.

---

## Reference images (visual development targets)

These are the diagrams the renderer should be compared against during development. All URLs were fetched and confirmed to resolve (HTTP 200) on 2026-06-03.

1. **[Generic event tree — `Event_Tree_Diagram.JPG` (Wikimedia Commons, full res 835×635)](https://upload.wikimedia.org/wikipedia/commons/0/07/Event_Tree_Diagram.JPG)** — *the canonical reference, used on both the Wikipedia "Event tree analysis" article and the University of Idaho risk-assessment textbook.* A four-header tree (Event 1–4) from a single initiating event, with an explicit Outcome column and each leaf's path-probability written out as a product of factors. CC BY-SA 3.0 (by 570SJR).
   - Stable thumbnail (330px PNG-equivalent JPEG, if a smaller asset is wanted): https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Event_Tree_Diagram.JPG/330px-Event_Tree_Diagram.JPG
   - Commons file page (license + provenance): https://commons.wikimedia.org/wiki/File:Event_Tree_Diagram.JPG
   - **I downloaded and viewed this image via the Read tool.** What it actually shows (verified, not paraphrased from text): a horizontal **header band** across the very top with seven columns — `Initiating Event | Event 1 | Event 2 | Event 3 | Event 4 | Outcome` (the last spanning the leaf labels), separated by thin vertical dashed gridlines that drop down through the whole tree to align each fork with its column. On the far **left**, a short bold horizontal line labelled **"Initiating event (IE)"**. From it the tree forks: the line steps **up** to the **success** leg (labelled e.g. `Success (1s)`) and **down** to the **failure** leg (`Failure (1f)`), and this repeats at each Event column. All branches are drawn as **right-angle (orthogonal) step lines**, black, ~1px, on white — no curves. The full-success path climbs to the top-right; each terminated path ends at a leaf on the right. Every leaf carries a two-line label: an **outcome name** (`Success Outcome A`, `Failure Outcome B`, … down to `Failure Outcome F`) and below it the **path probability written as a product**, e.g. `P_A = (P_IE)(P_1s)(P_2s)(P_3s)(P_4s)`, while early-terminating paths show shorter products (`P_E = (P_IE)(P_1s)(P_2f)`, `P_F = (P_IE)(P_1f)`). Critically, **once a path fails early it terminates** — Failure Outcome F (header 1 fails) is a single long flat line straight to the leaf with no further forks; the tree is *not* a full balanced 2⁴ binary tree, it prunes. No colour is used at all (pure black-on-white).

2. **[Wikipedia "Event tree analysis" article](https://en.wikipedia.org/wiki/Event_tree_analysis)** — *the standards-and-method context that embeds image (1).* Confirms the `1s`/`1f` sequence-label convention, the `1 = P(success) + P(failure)` complementation rule, and `Overall path probability = ∏ event probabilities`.

3. **[University of Idaho — *Fault and Event Trees* chapter](https://uidaho.pressbooks.pub/riskassessment/chapter/fault-and-event-trees/)** — *an open textbook reusing image (1) as "Generic event tree" and walking through the left→right "forward, bottom-up" construction*, useful as a second-source confirmation of the same layout and the header/outcome column structure.

**Visual conventions our renderer must match** (distilled from image 1, cross-checked against 2–3):

- **Orientation:** strictly **left → right**. Initiating event on the far left as a short bold horizontal line/stub with its label and `f₀`.
- **Header band:** a single horizontal row of **column headers** across the top — `Initiating Event`, then one column per function event in response order, then a final `Outcome` column (and, for us, a `Frequency` column). Thin **vertical gridlines** (dashed in the reference) drop from each header down through the tree so every fork at that function sits on its column line.
- **Branch direction is fixed and load-bearing:** at each fork the **success leg goes UP, the failure leg goes DOWN**. This is not cosmetic — it is the convention readers rely on; the renderer must never invert it.
- **Edges are orthogonal step lines** (horizontal runs + vertical risers, right angles), uniform thin stroke. No Bézier curves, no diagonal lines.
- **Pruning / early termination:** a path that has already reached an end state does **not** keep forking at later columns — it runs flat to its leaf. The tree is generally *not* a full balanced 2ⁿ tree; the renderer must collapse non-applicable forks (this is the single biggest layout difference from a naive binary tree).
- **Branch labels** sit on the leg, short (`Success (3s)` / `Failure (3f)` or a bare `p`), placed above/beside the horizontal run.
- **Leaf column:** each terminal path ends aligned in the right-hand `Outcome` column with (a) an **outcome/end-state name** and (b) the **path frequency**, ideally shown both as the symbolic product `(P_IE)(P_1s)…` *and* the evaluated number. Leaves are vertically ordered top (all-success) to bottom (first-failure) following the up=success geometry.
- **Colour:** the textbook reference is **pure monochrome** (black on white) — so `monochrome` must reproduce it exactly. In `default`, per the house rule, the body stays neutral and the **reserved red accent marks only the computed dominant sequence(s) / highest-frequency adverse outcome**, mirroring `pert`'s critical path and `faulttree`'s cut sets. Probability numerals may use the house accent-blue (`probText`).
- **Alignment discipline:** all forks for a given function event share one x-position (the column line); all leaves share one x-position (the outcome column). Deterministic, grid-aligned — no force layout.

---

## TODO (Victor — open decisions)

Genuine ambiguities that need a call before implementation; the resolved/researched items have moved up into the body above.

- [ ] **Per-column vs per-sequence branch probability** (the big one). Default: one `p` per `function` header. But real conditional ETA needs a per-upstream-path override (ECCS failure prob rises if offsite power already failed). Pick a syntax — e.g. `function B p: 0.01  when A=f: 0.05` — or declare conditional ETA out of scope for v0.1.
- [ ] **Outcome-labelling grammar:** the `s/f/*` pattern rows (Form 1), explicit per-sequence rows with ids (Form 2), or auto-generate all leaves and only name the interesting ones? Affects parser + how wide-tree pruning is expressed.
- [ ] **Pruning syntax:** how does the author state "function C is not queried once B fails" so the engine collapses that fork and the tree isn't a full 2ⁿ? (Without this the reference image's early-termination behaviour can't be reproduced.)
- [ ] **Fault-tree linking:** support `function A from-fta: "ECCS-FT"` (import `p` = the linked fault tree's computed `P(top)`, the NUREG large-ETA/small-FT pattern) in v0.1, or defer?
- [ ] **Frequency vs probability units & display:** carry `f₀` units through (per-year vs per-demand), and show each leaf as symbolic product `(P_IE)(P_1s)…`, evaluated number, or both (the reference shows the product form).
- [ ] **Wide-tree display cap:** a full binary tree is `2ⁿ` leaves; with pruning it's usually far fewer, but set a leaf cap + readable warning past it (as `faulttree` caps cut-set expansion).
- [ ] **Theme tokens:** confirm ETA reuses `ReliabilityTokens` as-is, and that the reserved-red accent maps to *dominant sequence / worst outcome* (vs FT's cut sets).
- [ ] **Bowtie integration:** splice this event tree as the right wing of `38-BOWTIE-STANDARD.md` at the shared central event — confirm the shared-vocabulary boundary.
- [ ] **Canonical test cases:** author 3–5 fixtures with expected per-path and aggregated frequencies (mirror `37`'s TC style), including the reference image's four-header pruned tree and an outcome-aggregation case.
- [ ] **impl doc** in `../CoCEO/schematex/impl/`.
