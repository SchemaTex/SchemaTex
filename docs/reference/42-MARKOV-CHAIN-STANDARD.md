# 42 — Markov Chain (State-Transition Diagram) Standard Reference

> **Status:** RESEARCHED SCAFFOLD — standard research + reference images filled in by assistant on 2026-06-03; implementation pending (Victor). Citations marked `<!-- TODO(Victor): verify -->` are unverified printings/editions to confirm before they are treated as canonical.

*The canonical stochastic-process diagram — a set of **states** drawn as circles with **directed transition arcs** each labelled by a **transition probability**, where the out-edges of every state sum to 1 (the row-stochastic property). Schematex's engine, exactly as `petri` computes the marking and `faulttree` the cut sets, **computes the answer rather than just drawing the picture**: the **stationary distribution** `π` (the long-run fraction of time spent in each state, via the left eigenvector / power iteration), a **state classification** (recurrent / transient / absorbing, from the strongly-connected components of the digraph), and for absorbing chains the **fundamental matrix** `N = (I−Q)⁻¹` (expected visits, absorption probabilities, expected steps to absorption). It is the probabilistic sibling of the `state` engine (§21, deterministic Harel/UML state machines) and the `petri` engine (§34, concurrency): the same "states + directed transitions" skeleton, but the transitions carry probabilities and the engine answers the probabilistic question.*

> **Primary References:**
> - **Norris, J. R.** (1997). *Markov Chains.* Cambridge Series in Statistical and Probabilistic Mathematics. Cambridge University Press. ISBN 978-0521633963. — *The standard graduate text. Defines discrete-time Markov chains, the transition matrix, communicating/recurrent/transient/absorbing/periodic classification, and stationary distributions. When this doc says "the theory," Norris is the baseline.* <!-- TODO(Victor): verify printing -->
> - **Kemeny, John G. & Snell, J. Laurie** (1976). *Finite Markov Chains.* Springer, Undergraduate Texts in Mathematics. ISBN 978-0387901923. — *The classic reference for finite chains and the canonical source of the absorbing-chain machinery used here: the canonical form `P = [[Q, R],[0, I]]`, the fundamental matrix `N = (I−Q)⁻¹`, absorption probabilities `B = NR`, and expected absorption times `t = N·1`.* <!-- TODO(Victor): verify printing/edition -->
> - **Grinstead, Charles M. & Snell, J. Laurie** (1997). *Introduction to Probability,* ch. 11 "Markov Chains." American Mathematical Society. — *Free, accessible treatment of state classification and stationary/absorbing analysis used widely in teaching; the absorbing-chain worked examples (drunkard's walk, gambler's ruin) and the `N`, `B`, `t` formulas appear here verbatim.* https://stats.libretexts.org/Bookshelves/Probability_Theory/Introductory_Probability_(Grinstead_and_Snell)/11:_Markov_Chains <!-- TODO(Victor): verify AMS edition vs the open LibreTexts mirror -->
> - **Ross, Sheldon M.** (2014). *Introduction to Probability Models,* 11th ed. Academic Press. ISBN 978-0124079489. — *The engineering-applications standard; Markov chains for reliability/availability, queueing, and performance modelling — the world Schematex's industrial users live in.* <!-- TODO(Victor): verify edition/ISBN -->
> - **Wikipedia, "Markov chain"** — https://en.wikipedia.org/wiki/Markov_chain · **"Examples of Markov chains"** — https://en.wikipedia.org/wiki/Examples_of_Markov_chains · **"Absorbing Markov chain"** — https://en.wikipedia.org/wiki/Absorbing_Markov_chain — *The conventional state-bubble + labelled-arc drawing, the row-stochastic-matrix conventions, the canonical weather two-state example (steady state ≈ 83.3 % sunny / 16.7 % rainy), and the absorbing-chain `N`/`B`/`t` definitions used in §"Engine computation." These pages also host the reference images in §"Reference images."*
>
> *Notes on the standard landscape.* A Markov chain is a **mathematical object, not a standardised diagram** — there is no ISO/IEC/IEEE notation, no governing body, no compliance figure. But the drawing is nonetheless **universally recognised and remarkably consistent** across every textbook, lecture note, and tool: a directed graph of **state circles** joined by **probability-labelled directed arcs**, self-loops allowed, the **row-stochastic constraint** (each state's out-edges sum to 1) being the defining property. There is no single "the standard" PDF to cite the way `faulttree` cites NUREG-0492; instead the convention is established by *convergent practice* across Norris / Kemeny-Snell / Grinstead-Snell and the canonical Wikipedia figures, which is what §"Reference images" pins down. Schematex targets **discrete-time, finite, time-homogeneous** chains (DTMC) in v0.1; continuous-time chains (CTMC, rate-labelled generator `Q`) and hidden Markov models are deferred.

---

## 0. Positioning

Markov chains appear everywhere quantitative: reliability/availability modelling, queueing theory, NLP (n-gram / PageRank), finance (regime models), population genetics, MCMC, and every probability course. They are drawn in TikZ, Graphviz, draw.io, and by hand — but **no text-DSL computes the analysis**; they all stop at the picture. Schematex slots the Markov chain beside its two structural cousins:

| Engine | Skeleton | What its transitions mean | What the engine computes |
|---|---|---|---|
| `state` (§21, Harel/UML) | states + directed transitions | **deterministic** mode changes with guards/events | (structural; no numeric payload) |
| `petri` (§34) | places/transitions + tokens | **concurrent** firing of enabled transitions | the marking after a firing sequence; enabled set |
| **`markov` (this doc)** | states + directed transitions | **probabilistic** one-step moves, `P(next \| current)` | **stationary `π`, state classification, absorbing `N`/`B`/`t`** |

The differentiator is the **computed linear-algebra payload**, not the labelled arcs. Drawing circles with `0.6` on the arrows is trivial — draw.io ships a stencil and stops. The value Schematex owns is `π = πP` (the long-run distribution), the recurrent/transient/absorbing partition (which states the process eventually leaves forever, which it returns to infinitely often, which trap it), and absorbing-chain results (how likely each absorbing outcome is, how many steps until you're trapped). That payload — rendered as annotations on the states plus a `<desc>` summary — is precisely the stance `pert` takes toward scheduling and `petri` toward the marking: **the render is downstream of the semantics.**

**Keyword: `markov`** (alias `markovchain`). Single lowercase word, matches the project convention (`petri`, `bpmn`, `sld`), SEO-aligned with "markov chain." `detect()` matches a first non-comment line beginning with `markov`.

**Cluster placement is open** — the natural homes are the existing **🐟 Causality/Analysis** cluster (it is an analytical engine like `faulttree`/`decisiontree`) or a **new Stochastic/Probability grouping** if Victor wants to seed one (Markov chain + future CTMC + HMM + decision-process diagrams). See §TODO.

---

## Element vocabulary

| Concept | Meaning | Conventional notation | Engine status |
|---|---|---|---|
| **State** | a value the process can occupy at a time step | **circle** with a label inside | declared |
| **Transition arc** | a possible one-step move `i → j` | **directed arrow**, source→target | declared |
| **Transition probability** `pᵢⱼ` | `P(next = j \| current = i)`; the out-edges of each state sum to 1 | numeric label **on the arc**, in `[0,1]` | declared; validated row-sum = 1 |
| **Self-loop** | probability of staying put, `pᵢᵢ` | arc from a state **back to itself**, label on the loop | declared |
| **Initial distribution** `π₀` | optional starting probability over states | annotation / vector (not always drawn) | optional declaration |
| **Communicating class** | maximal set of mutually-reachable states (an SCC of the digraph) | engine-computed grouping | **computed** (Tarjan SCC) |
| **Recurrent state** | (almost surely) revisited infinitely often — a state in a *closed* class with no escaping edges | engine-computed tag | **computed** |
| **Transient state** | eventually left forever (return probability < 1) | engine-computed tag | **computed** |
| **Absorbing state** | once entered, never left — a singleton recurrent class with `pᵢᵢ = 1` | engine-computed tag; **double-ring** circle convention | **computed** |
| **Stationary distribution `π`** | long-run fraction of time per state; `πP = π`, `Σπ = 1` | engine-computed; annotated per state | **computed** (power iteration / linear solve) |
| **Fundamental matrix `N`** | for absorbing chains, `N = (I−Q)⁻¹`; `Nᵢⱼ` = expected visits to transient `j` starting from transient `i` | engine-computed (reported, not drawn on the graph) | **computed** when absorbing states exist |
| **Absorption probability `B`** | `B = NR`; `Bᵢⱼ` = probability of ending in absorbing `j` starting from transient `i` | engine-computed | **computed** |
| **Expected steps to absorption `t`** | `t = N·1` (row sums of `N`); expected number of steps before absorption | engine-computed | **computed** |
| **Period** | period of a recurrent class = gcd of return-step lengths; period 1 = aperiodic | engine-computed (optional) | **computed** (optional) |

---

## Engine computation (the differentiator)

The whole point of the engine — the equivalent of `pert`'s critical path and `petri`'s enabled set. All four are concrete, hand-implementable, dependency-free linear algebra over small dense matrices.

### 1. Assemble + validate the transition matrix `P`

Build the `n × n` row-stochastic matrix `P` from the arcs (`P[i][j]` = probability `i → j`, `0` where no arc). **Validate**: every probability ∈ `[0,1]`; every row sums to 1 within tolerance (default `±1e-9`); no transition references an undeclared state. The row-sum policy (hard-error vs auto-normalise) is the **biggest open DSL question** — see §TODO.

### 2. State classification (Tarjan SCC on the digraph)

1. Treat the chain as a directed graph (states = nodes, arcs with `p > 0` = edges). Run **Tarjan's strongly-connected-components** algorithm → the **communicating classes** (each SCC = one class of mutually-reachable states).
2. Build the **condensation DAG** (one node per SCC). A class is **recurrent (closed)** iff it has **no outgoing edges** in the condensation (the process can never escape it); otherwise it is **transient**.
3. A recurrent class that is a **singleton with a self-loop of probability 1** is **absorbing**.
   *(This is exactly the standard result: communicating classes = SCCs of the transition digraph; a class is recurrent iff it is closed.)*

### 3. Stationary distribution `π` (solve `πP = π`, `Σπ = 1`)

`π` is the **left eigenvector of `P` for eigenvalue 1**, normalised to a probability vector. Two interchangeable methods (both dependency-free):

- **Power iteration** (default): start from uniform `π₀`, iterate `π_{k+1} = π_k P`, stop when `‖π_{k+1} − π_k‖₁ < tol` or an iteration cap is hit. Converges for an **irreducible aperiodic** chain; convergence rate is governed by the magnitude of the second-largest eigenvalue `|λ₂|`. (Cap + tolerance are tunables — see §TODO.)
- **Linear solve** (exact, robust for small `n`): solve the singular system `πP = π` ⇔ `π(P − I) = 0` with the normalisation `Σπ = 1` replacing one redundant equation, via Gaussian elimination on the augmented system. Preferred for small chains and for **periodic** chains where power iteration oscillates instead of converging.

**Reducibility handling.** A unique stationary `π` exists iff the chain has **exactly one recurrent class**. For a **reducible** chain (multiple recurrent classes), report a **per-recurrent-class stationary vector** (each class solved independently, transient states getting long-run probability 0), and note in `<desc>` that the global `π` is not unique. For a **periodic** recurrent class the stationary distribution still exists (and is reported) even though the *limiting* distribution `lim P^k` does not — flag the period.

### 4. Absorbing-chain analysis (when absorbing states exist)

Reorder states into the **canonical form** with transient states first, absorbing last:

```
P = [ Q  R ]      Q = t×t  transient → transient
    [ 0  I ]      R = t×r  transient → absorbing
```

Then (Kemeny-Snell):

- **Fundamental matrix** `N = (I − Q)⁻¹` (`= Σ_{k≥0} Qᵏ`); `Nᵢⱼ` = expected number of visits to transient state `j` before absorption, starting from `i`. Computed by Gaussian elimination / matrix inverse of the small `t × t` matrix `(I − Q)`.
- **Expected steps to absorption** `t = N·1` (the row sums of `N`).
- **Absorption probabilities** `B = N·R`; `Bᵢⱼ` = probability of being absorbed in absorbing state `j`, starting from transient `i`.

These are reported (in `<desc>` / `data-*`), not crammed onto the graph; absorbing states are visually marked with the **double-ring** convention.

### 5. Periodicity (optional)

For each recurrent class compute the **period** = gcd of the lengths of all cycles returning to a state (period 1 ⇒ aperiodic). Used to warn when a unique *limiting* distribution does not exist even though the stationary one does.

**Output of the analysis** is rendered as state annotations (per-state `π`, classification tag), absorbing-state ring marking, and a `<desc>` summary carrying `π`, the class partition, and the absorbing `N`/`B`/`t` tables.

---

## DSL sketch (draft — needs Victor)

```
markov "Weather"
  analysis: stationary, classify

  state Sunny
  state Rainy
  state Cloudy

  Sunny  -> Sunny  : 0.6
  Sunny  -> Rainy  : 0.1
  Sunny  -> Cloudy : 0.3
  Rainy  -> Rainy  : 0.5
  Rainy  -> Cloudy : 0.5
  Cloudy -> Sunny  : 0.4
  Cloudy -> Rainy  : 0.3
  Cloudy -> Cloudy : 0.3
```

Canonical **two-state** form (matching the Wikipedia reference image, §"Reference images"):

```
markov "Weather (2-state)"
  analysis: stationary
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Rainy : 0.5
  Rainy -> Sunny : 0.5
  # engine reports π ≈ { Sunny: 0.833, Rainy: 0.167 }
```

**Absorbing** example (gambler's ruin — the engine reports `N`, `B`, `t`):

```
markov "Gambler's ruin"
  analysis: classify, absorbing
  state Broke   absorbing      # or inferred from the 1.0 self-loop
  state One
  state Two
  state Rich    absorbing
  One -> Broke : 0.5
  One -> Two   : 0.5
  Two -> One   : 0.5
  Two -> Rich  : 0.5
  # B reports P(ruin) vs P(rich) from One and from Two;
  # t reports expected rounds to absorption.
```

*Draft only.* Open syntax choices: arc-probability form (`: 0.6` vs `[0.6]` vs `--0.6-->`); whether `absorbing` is **declared** or always **inferred** from a `1.0` self-loop (recommend: inferred, with `absorbing` as an optional assertion that the engine validates); whether rows that don't sum to 1 **hard-error or auto-normalise** (§TODO — the load-bearing decision); how to express the **initial distribution** `π₀` (e.g. `init: Sunny=0.5, Rainy=0.5` or `start Sunny`); whether `state` declarations are mandatory or auto-created from first arc mention (like `petri` auto-creating referenced places vs `faulttree`'s strict declare-first). The `analysis:` directive selects which computed blocks to run (`stationary`, `classify`, `absorbing`, `period`) — mirroring `faulttree`'s `analysis: cutsets, probability`.

---

## Reference images (visual development targets)

Real, stable, canonical state-transition diagrams to develop the renderer against. All on Wikimedia Commons / Wikipedia (CC-licensed). **Verified to resolve and viewed** where noted.

### A. Canonical two-state weather chain — *viewed* ✅

- **Page:** https://en.wikipedia.org/wiki/Examples_of_Markov_chains
- **Direct PNG:** `https://upload.wikimedia.org/wikipedia/commons/7/7a/Markov_Chain_weather_model_matrix_as_a_graph.png`
- **What it shows (viewed):** Two circles labelled **Sunny** and **Rainy**. A `0.1` arc Sunny→Rainy and a `0.5` arc Rainy→Sunny are drawn as **two separate curved arcs bowing apart** between the same pair of nodes (the standard way to keep opposite-direction transitions from overlapping). Each state has a **self-loop**: Sunny carries `0.9` as a small loop curling off the **top-left**, Rainy carries `0.5` as a loop off the **right**. Probabilities sit as plain numerals **beside the midpoint of each arc / next to each loop**. Plain black strokes, open arrowheads, thin circle outlines, label centred inside each circle. This is the single most canonical Markov diagram and the primary golden target.

### B. Three-state finance regime chain (bull / bear / stagnant) — *viewed* ✅

- **Page:** https://commons.wikimedia.org/wiki/File:Finance_Markov_chain_example_state_space.svg (used in the en.wikipedia "Markov chain" article)
- **Direct SVG:** `https://upload.wikimedia.org/wikipedia/commons/9/95/Finance_Markov_chain_example_state_space.svg`
- **What it shows (viewed):** Three circles — **Bull market**, **Bear market**, **Stagnant market** — laid out as a **triangle**. Every ordered pair has its own arc (six directed arcs total), each pair drawn as **two gently-curved arcs bowing apart** so the `i→j` and `j→i` probabilities never overlap (e.g. Bull→Bear `0.075` on the upper arc, Bear→Bull `0.15` on the lower arc). Each state has a **self-loop** with its stay-probability (`0.9` Bull top-left, `0.8` Bear right, `0.5` Stagnant bottom). Probabilities are plain numerals centred on each arc. TikZ-drawn, thin black strokes, open arrowheads. The ideal *three-node* golden target (tests curved-arc separation + self-loop placement on every side).

### C. Absorbing-chain example (string-generation / coin-flip "HTH") — *referenced*

- **Page:** https://en.wikipedia.org/wiki/Absorbing_Markov_chain
- **File:** `Markov_Chain_for_String_Generation_Example.png` (4-state chain; the `HTH` state is absorbing, `t = N·1 = [10, 8, 6]`).
- **Why it matters:** a worked **absorbing** chain whose computed answer (expected 10 flips to first see H-T-H) is exactly the `N`/`t` payload the engine produces. Good correctness fixture even if the drawing style is reused from A/B. *(URL listed for development reference; confirm exact upload path before relying on it.)*

### Visual conventions our renderer must match

- **States are circles** with the label centred inside; uniform radius; thin neutral outline. (Not boxes — the circle is near-universal for Markov states; rounded-box is acceptable only as an explicit variant.)
- **Transitions are directed arcs with an open arrowhead** at the target; one arc per non-zero `pᵢⱼ`.
- **Opposite-direction pairs (`i→j` and `j→i`) are drawn as two separate curved arcs that bow apart**, never as one overlapping line — this is the dominant convention in both viewed images and the single most important geometric requirement. (Bidirectional curvature.)
- **Self-loops are small loops attached to the state and curling outward** (top, side, or bottom — placed where there is free space), carrying the stay-probability `pᵢᵢ`. They are first-class, not optional decoration.
- **The probability label sits as a plain numeral at/near the midpoint of its arc**, and beside the loop for self-loops — readable, not boxed, not on the arrowhead.
- **Absorbing states use the double-ring (concentric-circle) convention** — the textbook way to mark "terminal/accepting" states (shared with automata / final-state notation). This is the one place to *add* visual semantics beyond the plain references, since the engine *computes* absorption.
- **No colour is required** for correctness — the canonical figures are pure black-and-white; colour (house palette, stationary-π emphasis, absorbing accent) is Schematex value-add layered on top, with a faithful `monochrome` that reproduces the textbook look.

---

## TODO (Victor — standard research + dev)

- [ ] **Cluster home** — decide 🐟 Causality/Analysis vs a **new Stochastic/Probability cluster** (seeding Markov + future CTMC/HMM/MDP); update `00-OVERVIEW.md` either way.
- [ ] **Row-sum ≠ 1 policy (load-bearing).** Two defensible options: **(a) hard-error** *"state Sunny: out-edges sum to 0.95, must be 1.0 (line N)"* — strict, matches the `petri`/`faulttree` "structure must be sound for the math to mean anything" stance; **(b) auto-normalise** each row to sum 1 and emit a `<desc>` note — friendlier for LLM-generated input that rounds. Recommendation: **default hard-error, opt-in `normalize: true`** — so the computed `π` is never silently based on fudged input, but authors can ask for leniency. Needs Victor's call.
- [ ] **Absorbing-state syntax** — infer from `1.0` self-loop (recommended) vs require explicit `absorbing` keyword; if both, `absorbing` becomes a validated assertion.
- [ ] **State declaration** — mandatory `state X` vs auto-create from first arc mention.
- [ ] **Initial distribution `π₀`** — syntax (`init:` vector / `start X`) and whether it feeds an n-step `π₀ Pᵏ` display.
- [ ] Confirm Norris / Kemeny-Snell / Grinstead-Snell / Ross **editions/ISBNs/printings**; resolve the LibreTexts-vs-AMS Grinstead-Snell citation.
- [ ] **Symbol set & theme**: circle radius, **double-ring absorbing** glyph, self-loop arc geometry (which side, radius), curved bidirectional-arc separation, per-state `π` annotation style, `MarkovTokens` (or reuse an analysis token set) for `default`/`monochrome`/`dark`.
- [ ] **Layout**: deterministic placement for stable golden strings — **circular/shell layout** (states on a ring, matching the finance triangle) vs **layered** (good for absorbing chains that flow toward sinks); self-loop side selection; curved bidirectional arc geometry. No force simulation.
- [ ] **Computation tunables**: power-iteration tolerance + iteration cap; when to fall back to the exact linear solve (periodic/reducible chains); reducible per-class `π` reporting; absorbing `N`/`B`/`t` path; optional period computation.
- [ ] **Validation rules**: probabilities ∈ `[0,1]`; row-sum policy above; dangling transition refs (readable, id+line); empty chain; self-loop = 1 with other out-edges (contradiction).
- [ ] **Edge cases**: periodic chains (stationary exists, limiting does not); multiple recurrent classes (no unique global `π`); transient-only sinks; near-1 self-loops; a single absorbing state vs several.
- [ ] **Scope**: DTMC only in v0.1; **defer** continuous-time Markov chains (rate-labelled arcs, generator matrix `Q`, embedded chain) and hidden Markov models (emission probabilities) — both are additive extensions.
- [ ] **3–5 canonical test cases** asserting computed `π` (weather 2-state → `{0.833, 0.167}`; finance 3-state), SCC classification (absorbing/transient partition), and absorbing `B`/`t` (gambler's ruin; the "HTH" chain → `t = [10,8,6]`).
- [ ] **impl doc** in `../CoCEO/schematex/impl/`.
