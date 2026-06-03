# 41 — Causal Loop Diagram (CLD) Standard Reference

> **Status:** RESEARCH (notation + reference images gathered 2026-06-03); implementation pending (Victor).

*The qualitative language of **system dynamics** — variables connected by causal links, each carrying a **polarity (+ / −)**, that close into **feedback loops** labelled **R (reinforcing)** or **B (balancing)**, with **delay marks (‖)** on links that act slowly. Schematex's engine, in the "compute, don't just draw" tradition of `faulttree` and `pert`, **detects the feedback loops and auto-classifies each as R or B by counting the negative links around it** (even number of "−" → reinforcing; odd → balancing). It sits in the 🐟 Causality / Analysis cluster, the system-dynamics complement to `13-FISHBONE-STANDARD.md` (Ishikawa's qualitative cause spine) — where fishbone enumerates causes of one effect, the CLD captures the closed feedback structure that generates dynamic behaviour over time.*

> **Primary References:**
> - **Sterman, John D.** (2000). *Business Dynamics: Systems Thinking and Modeling for a Complex World.* Irwin/McGraw-Hill. ISBN 978-0072389159. — *The definitive modern text. Chapter 5 ("Causal Loop Diagrams") defines link polarity, the even/odd loop-polarity rule, the R/B labelling convention, the loop-identifier curved arrow, and delay marks. The canonical reference for everything in this doc.* <!-- TODO(Victor): verify ISBN -->
> - **Meadows, Donella H.** (2008). *Thinking in Systems: A Primer.* Chelsea Green Publishing. ISBN 978-1603580557. — *The accessible standard for reinforcing vs balancing feedback, stocks/flows, and the system-archetype vocabulary.* <!-- TODO(Victor): verify ISBN -->
> - **Forrester, Jay W.** (1961). *Industrial Dynamics.* MIT Press. ISBN 978-1614275336 (Martino reprint, 2013). — *The origin of system dynamics; the intellectual root of feedback-loop modelling.* <!-- TODO(Victor): verify ISBN of in-print edition -->
> - **Kim, Daniel H.** (1992). *Systems Archetypes I: Diagnosing Systemic Issues and Designing High-Leverage Interventions.* Pegasus Communications. — *Catalogues the standard CLD archetypes (Limits to Growth, Shifting the Burden, Fixes that Fail, Tragedy of the Commons) that good CLD tooling should render cleanly.* <!-- TODO(Victor): verify edition/ISBN -->
> - **Sterman, John D.** "Fine-Tuning Your Causal Loop Diagrams." *The Systems Thinker* (2 parts). https://thesystemsthinker.com/fine-tuning-your-causal-loop-diagrams-part-i/ — *Sterman's own checklist of CLD drawing conventions; the source for "use + / − not s / o", "links are causation not correlation", and explicit-goal balancing loops.*
> - **Wikipedia, "Causal loop diagram."** https://en.wikipedia.org/wiki/Causal_loop_diagram — *The conventional notation (signed arrows, R/B loop labels with a directional curved arrow, delay hash marks) and the canonical Adoption / bank-balance examples used below.*
>
> *Notes on the standard landscape.* CLD has **no ISO/IEC standard** — it is a discipline convention crystallised by Forrester (origin), Sterman (the canonical text), and Meadows (the popular primer). The notation is remarkably stable across the field: signed curved arrows; a circular-arrow loop identifier labelled `R`/`B` whose **arc direction matches the loop's circulation** (clockwise vs counter-clockwise); and two short hash marks across a slow link to denote delay. Older texts sometimes label loop polarity `+`/`−` instead of `R`/`B`, or use a snowball (reinforcing) / seesaw-balance (balancing) glyph; `R`/`B` with a curved arrow is the modern norm.

---

## 0. Positioning

Causal loop diagrams are the entry-point notation of **system dynamics** — taught in every systems-thinking course, used by policy analysts, organisational strategists, epidemiologists, and sustainability modellers to capture *why* a system behaves as it does. They are drawn constantly in Vensim, Kumu, Loopy, AnyLogic, and on whiteboards, but there is no clean text-DSL with loop analysis. CLD belongs in Schematex's **🐟 Causality / Analysis** cluster beside fishbone: fishbone is an open, one-directional cause taxonomy; the CLD is the *closed-loop* structure where causes feed back on themselves.

The differentiator is **loop detection + polarity classification**. A picture of arrows is not a system model; the insight is *which loops exist and whether each amplifies (R) or stabilises (B)*. The engine finds the cycles in the signed digraph and classifies each: an even count of negative links → **reinforcing**; an odd count → **balancing**. That auto-labelling — plus consistent polarity rendering and delay marks — is what the engine owns. Suggested keyword: **`causalloop`** (aliases `cld`, `systemdynamics`?).

---

## Element vocabulary

| Concept | Meaning | Conventional notation |
|---|---|---|
| **Variable** | a quantity that can rise or fall, named as a *neutral noun phrase* ("Population", "Adoption rate") — never "increase in X" or "low morale", because the variable must be able to move in both directions | text label, usually no box (or a soft node); no enclosing shape in Sterman/Wikipedia style |
| **Causal link** | "a change in X causes a change in Y" (causation, never mere correlation) | curved arrow X → Y, single arrowhead |
| **Positive polarity (+)** | X and Y move in the *same* direction (more X → more Y; less X → less Y, all else equal) | `+` beside the arrowhead end of the link (or `s` for "same") |
| **Negative polarity (−)** | X and Y move in *opposite* directions (more X → less Y) | `−` beside the arrowhead end (or `o` for "opposite") |
| **Reinforcing loop (R)** | a feedback loop that amplifies change — the "snowball"; even number of negative links (0 counts as even) | curved circular arrow labelled `R` (and an index, `R1`) near the loop centre; arc curls in the loop's circulation direction |
| **Balancing loop (B)** | a feedback loop that counteracts change and seeks a goal; odd number of negative links | curved circular arrow labelled `B` (`B1`); arc curls in the loop's circulation direction |
| **Delay mark** | a causal link that acts with significant lag (so the loop can oscillate / overshoot) | two short hash marks `‖` drawn across the link line |
| **Loop identifier** | name/number for a loop, used to reference it in text | `R1`/`B1` plus an optional descriptive phrase ("Word of mouth", "Market saturation") beside the loop glyph |

Notation choice (Sterman, canonical): **use `+` / `−`, not `s` / `o`.** Sterman recommends `+`/`−` because it applies equally to ordinary causal links *and* to the flow-to-stock links of full stock-and-flow models, whereas `s`/`o` does not. We will **render `+`/`−`** but **accept `s`/`o` (and same/opposite) as input aliases** for AI/author friendliness.

---

## Engine computation (the differentiator)

1. Build the **signed directed graph**: nodes = variables, edges = causal links each tagged `+` (= sign +1) or `−` (= sign −1).
2. **Enumerate the feedback loops** (simple directed cycles). Johnson's algorithm (1975) enumerates all elementary cycles in `O((n + e)(c + 1))` for `c` cycles; a plain DFS back-edge cycle search is simpler and adequate for the small graphs CLDs typically have. Choice deferred — see TODO.
3. **Classify each loop by counting negative links.** Let `k` = number of `−` links in the cycle.
   - `k` **even** (including `0`) → **Reinforcing (R)**.
   - `k` **odd** → **Balancing (B)**.

   Rationale: the loop's net effect is the *product* of its link signs. An even number of negatives → product `+1` → a small change feeds back to reinforce itself (R). An odd number → product `−1` → the change comes back inverted and is opposed (B). This is exactly Sterman's even/odd rule, and it is equivalent to his "trace a small change around the loop" method.

   Concrete worked example (the Adoption model below):
   - *Word of mouth* loop: Adoption rate `→+` Adopters `→+` Adoption rate. `k = 0` negatives → **R1**.
   - *Market saturation* loop: Adoption rate `→−` Potential adopters `→+` Adoption rate. `k = 1` negative → **B1**.
4. **Label** each loop `R`/`B` + index (`R1`, `B1`, …), placing the circular loop glyph near the cycle's centroid, with the curved arrow drawn in the loop's circulation direction.
5. Optionally **detect archetypes** (e.g. a B loop carrying a delay → oscillation; an R coupled to a B sharing a variable → Limits-to-Growth) — deferred, but the loop inventory is the data needed for it.

**Validation:** every link must carry a polarity (reject unpolarised links); flag self-loops (X → X); report the loop inventory (count, each loop's variables, sign-count, R/B verdict) in `<desc>`. Note disconnected variables and links that participate in **no** loop — open causal chains are legal (not every link is in a cycle) but should be surfaced so the author knows they contribute no feedback.

---

## DSL sketch (draft — needs Victor)

```
causalloop "Adoption model"
  # links: X -> Y with polarity; ~ marks a delay on the link
  # polarity: ->+  / ->-   (aliases: ->s same, ->o opposite)

  "Adoption rate" ->+ Adopters
  Adopters        ->+ "Adoption rate"          # R loop: 0 negatives -> Reinforcing

  "Adoption rate" ->- "Potential adopters"
  "Potential adopters" ->+ "Adoption rate"     # B loop: 1 negative -> Balancing

  # optional explicit loop naming (else auto R1/B1/...)
  loop R1 "Word of mouth"
  loop B1 "Market saturation"
```

Delayed link example (life-insurance style):
```
  "Training and coaching quality" ->+ "Salesperson skills" ~delay
```

*Draft only.* Open choices: polarity syntax (`->+` / `->-` vs `-->|+|` vs trailing `: +`); whether loops are auto-named (`R1`,`B1` by detection order) or author-named via `loop`; how delay is marked (`~delay`, `//`, a trailing flag); whether variables need declaration or are implicit from first mention in a link; whether to accept `s`/`o`/same/opposite aliases (recommended yes, for AI-friendliness); CJK-quote handling for labels.

---

## Reference images (visual development targets)

All URLs verified resolving 2026-06-03 (HTTP 200); the first two were downloaded and viewed.

1. **Adoption model CLD** *(viewed — primary development target)*
   `https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Adoption_CLD.svg/960px-Adoption_CLD.svg.png`
   Source: [Wikipedia "Causal loop diagram"](https://en.wikipedia.org/wiki/Causal_loop_diagram). The cleanest canonical example: a left **B (Market saturation)** loop and a right **R (Word of mouth)** loop sharing the central variable "Adoption rate". What it shows concretely:
   - **Variables** are plain black text labels — *no boxes, no nodes* — laid out roughly horizontally (Potential adopters · Adoption rate · Adopters).
   - **Links** are smooth, strongly **curved black arrows** with a single arrowhead; the two loops form a figure-eight, each link bowing outward to keep the loop area open and readable.
   - **Polarity glyph** (`+` / `−`) sits **right next to the arrowhead end** of each link (the `−` is at the head of Adoption-rate→Potential-adopters; the `+` signs cluster near the heads feeding back into Adoption rate). Black, same size as label text.
   - **Loop identifier** is a **blue circular arrow** with a blue `R` / `B` letter inside it, placed in the open centre of each loop, with a **blue descriptive phrase** ("Word of mouth", "Market saturation") below it. The curved arrow's direction matches the loop's circulation (the B arc and R arc curl opposite ways).
   - No delay marks in this example.

2. **Life-insurance company growth/decline CLD** *(viewed — density + delay-mark target)*
   `https://upload.wikimedia.org/wikipedia/commons/f/f6/Causal_Loop_Diagram_of_a_Model.png`
   A dense real-world model (~30 variables). Shows what a *busy* CLD looks like: many crossing curved links, `+`/`−` at arrowheads, small circled-`C` loop markers, and — importantly — **delay hash marks**: short double tick marks (`‖`) drawn across several links (e.g. into "Lapses", "Orphaned policies"). Good stress test for link routing and crossing minimisation.

3. **Bank balance ↔ earned interest** (positive reinforcing two-variable loop) *(animated GIF, not viewed statically)*
   `https://upload.wikimedia.org/wikipedia/commons/4/43/CLD_positive_ANI.gif`
   The textbook minimal R loop: Bank balance `→+` Earned interest `→+` Bank balance (0 negatives → R). The simplest possible golden test.

4. **Positive and negative links** (notation primer) *(animated GIF, not viewed statically)*
   `https://upload.wikimedia.org/wikipedia/commons/d/d8/CLD_links_ANI.gif`
   Illustrates a single `+` link and a single `−` link in isolation — the atomic polarity notation.

### Visual conventions our renderer must match

- **Variable labels:** plain text, no enclosing box by default (Sterman/Wikipedia house style). Neutral noun phrases, centred on their layout point.
- **Curved links:** smooth single-arrowhead curves (not straight segments) that bow *outward* from the loop interior, keeping each loop's centre open for its identifier glyph. Minimise crossings.
- **Polarity `+`/`−` placement:** beside the **arrowhead (target) end** of each link, not the midpoint — this is consistent across both viewed images. Render `+`/`−`; accept `s`/`o` input.
- **R/B loop glyph:** a small **circular arrow** with the `R`/`B` letter (and index) inside, placed at the **loop centroid** in the open interior; the arc must curl in the **loop's circulation direction** (clockwise vs counter-clockwise). An accent colour (the Adoption example uses blue) distinguishes loop annotations from the black causal structure — fits Schematex's "house colour + monochrome fallback" pattern.
- **Loop name phrase:** optional short descriptive label adjacent to the glyph.
- **Delay hash marks:** two short parallel ticks (`‖`) drawn across the link, perpendicular to its tangent at the crossing point.
- **Layout:** must keep loops visually closed and uncluttered — the whole point of a CLD is that a reader can *see* the feedback loops. Crossings and overlapping labels destroy readability.

---

## TODO (Victor — standard research + dev)

- [ ] **Layout — the hard part / central tension.** CLDs are inherently *circular and aesthetic*: the canonical look (figure-eight Adoption model) is produced by force-directed or hand-tuned placement so that loops sit open and readable. But Schematex forbids randomness — golden-string tests require a **deterministic, force-free** layout. Need a loop-aware deterministic algorithm: e.g. detect the dominant cycle(s) first, place each cycle's variables on a ring/ellipse by traversal order, share variables that belong to multiple loops, then route the non-loop ("open chain") links. Radial/loop-aware placement with optional author position hints is the likely path. **This is the single biggest open question — confirm the approach before writing layout tests.**
- [ ] Confirm Forrester edition/ISBN, Meadows/Sterman ISBNs, and Kim archetype reference; finalise citation block (TODO markers inline above).
- [ ] Loop detection + R/B classification algorithm choice (Johnson's all-cycles vs DFS back-edge) and loop-glyph centroid + circulation-direction computation.
- [ ] Loop-glyph arc direction: compute clockwise vs counter-clockwise from the laid-out cycle's winding; decide rendering (full circular arrow vs the older snowball/seesaw glyphs — recommend plain `R`/`B` circular arrow).
- [ ] Polarity input aliases: accept `s`/`o` / same/opposite and normalise to `+`/`−`; decide whether to *render* the author's chosen symbol or always normalise to `+`/`−` (recommend always render `+`/`−` per Sterman).
- [ ] Validation rules: every link polarised; self-loop handling; disconnected variables; links-in-no-loop surfaced in `<desc>`.
- [ ] Edge cases: multi-edges between the same pair; parallel loops sharing links; nested loops; very dense graphs (life-insurance example); a variable in 2+ loops (shared-node placement).
- [ ] Decide whether **stock-and-flow** (the quantitative SD notation — stocks as boxes, flows as valves/pipes) is a separate future diagram or an extension here (recommend **separate** diagram; CLD stays qualitative).
- [ ] Decide whether to render variables boxless (Sterman default) or offer an optional soft-node box theme.
- [ ] 3–5 canonical test cases asserting detected loops and R/B labels: **Bank balance** (1 R loop, 0 negatives), **Adoption model** (R1 + B1), **Population** (births R / deaths B), **Limits-to-Growth** archetype (R coupled to delayed B), optionally **Shifting-the-Burden**.
- [ ] impl doc in `../CoCEO/schematex/impl/`.
