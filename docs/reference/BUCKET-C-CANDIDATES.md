# Bucket C — Diagram expansion candidates (mark / research)

> Status doc, mirrors the role `bucket-b-standards-research` played before PR #28.
> It **marks** the next diagram families worth building, classifies each by build
> cost (reuse vs new layout engine), and records the standard + the engine
> differentiator (what the engine *computes*, per value pillar 1).
>
> Selection passes **two filters**: (1) DSL-amenable = typed parts + rules/relations
> + algorithmic layout; (2) on-brand = a published professional standard a real
> doctor / engineer / lawyer uses. Things that pass (1) but fail (2) — commodity
> bar/line charts, educational astronomy, pictographic illustration — are excluded
> on purpose; they are red-ocean or non-defensible.

---

## Legend

| Tier | Meaning | Precedent |
|------|---------|-----------|
| **A — extend engine** | New `mode`/`template` on an existing engine, no new layout code | PR #27 (phylo→dendrogram, matrix→sipoc/qfd, …) |
| **B — light new type** | New `DiagramType`, but **no graph-layout algorithm** — just a symbol catalog + rule-based placement | sld / circuit symbol catalogs |
| **C — new engine** | Requires a brand-new layout/coordinate engine the repo does not have | PR #28 (8 new engines) |

---

## A — Extend an existing engine

| Candidate | Host engine | Standard | Engine computes (differentiator) | Status |
|-----------|-------------|----------|----------------------------------|--------|
| **Punnett square** | `matrix` (new `punnett` mode) | Mendelian genetics (Punnett 1905) | gametes (cartesian product per locus) → offspring grid → **genotype + phenotype ratios** (3:1, 9:3:3:1) reduced to lowest terms; case = dominance; optional trait names | ✅ **implemented + previewed** (this branch) — awaiting surface wiring + commit |

> Punnett is the only clean tier-A candidate found. Everything else below is net-new.

---

## B — Light new type (symbol catalog, no graph layout)

| Candidate | Standard | Engine computes / differentiator | Why no layout engine |
|-----------|----------|----------------------------------|----------------------|
| **Welding symbols** | AWS A2.4 / ISO 2553 | parses a joint + weld spec → places weld symbols on the **reference line** (arrow-side below, other-side above), fillet/groove/bevel sizes, tail notes; validates side/symbol legality | It's annotation on one horizontal reference line — placement is rule-fixed, no node-edge layout. Sits next to the EE cluster (sld/circuit/ladder). **Top B priority — fills the EE cluster's only gap.** |

---

## C — New layout engine required

### C1 · Value-axis charts (build the axis/scale base once, 3 figures share it)

The repo has **no tick/scale value axis** today (confirmed: timing draws its grid inline,
matrix uses normalized [0,1] only). These three are *standards-bound clinical/research*
figures — not commodity charts — and all attach to the existing PRISMA / evidence-synthesis cluster.

| Candidate | Standard | Engine computes |
|-----------|----------|-----------------|
| **Forest plot** | Cochrane / PRISMA meta-analysis | per-study effect + CI whiskers on a log/linear axis; **pooled diamond** (fixed/random effects), weight-scaled boxes, heterogeneity line |
| **Kaplan–Meier survival curve** | CONSORT / clinical-trial convention | step function from survival data, censoring ticks, **number-at-risk table**, optional median-survival line |
| **Funnel plot** | Cochrane publication-bias | effect vs precision scatter + **pseudo-95% CI funnel**, optional Egger line |

> Sequencing: build the axis/scale primitive with the forest plot; KM + funnel reuse it.

### C2 · Rule-following technical structure diagrams

| Candidate | Standard | Engine computes | New engine |
|-----------|----------|-----------------|------------|
| **Feynman diagram** | particle-physics convention | vertex placement + line styling (fermion arrow / photon wave / gluon spiral) from particle declarations | custom vertex layout + propagator edge styles (no generic node-edge engine exists to reuse) |
| **Free-body diagram** | classical-mechanics convention | force-vector placement around a body, axis decomposition, optional resultant | parametric vector layout |
| **Energy-level diagram** | spectroscopy / chemistry | level lines by energy value + electron-transition arrows | 1-D value-positioned levels (shares ideas with C1 axis) |
| **Lewis / skeletal structure** | IUPAC nomenclature | atoms + bonds + valence/lone-pair check → 2-D molecular layout | molecular layout (template/force-directed) — **biggest C-tier lift** |

### C3 · Schematic & grid-structured spatial (from floor-plan feasibility study)

The floor-plan research (see below) found these are the only DSL-feasible spatial subtypes,
because their layout is **rule-derivable**, not arbitrary:

| Candidate | Standard | Engine computes | New engine |
|-----------|----------|-----------------|------------|
| **Electrical riser diagram** | NEC / one-line convention | floor-stack × distribution tree (schematic, *not to scale*) — feeders, panels per floor | **best spatial first pick** — extends the SLD/one-line mental model, layout is a stacked tree |
| **Building elevation / stacked floors** | architectural convention | 1-D vertical stack of floors by level + floor-height | trivial 1-D stacking |
| **Warehouse rack-and-aisle** | — | tile racks on a grid from pitch/aisle/bay params inside a bounding box | grid-tiling-in-box |
| **Event / table seating** | — | tile tables in a room with clearances (sibling product already proves this) | grid-tiling-in-box |

---

## Floor-plan verdict (does DSL even work here?)

**Researched (web + algorithm review). Verdict: DSL is a bad fit for *general/architectural*
floor plans, good for a few schematic/grid subtypes.** The clean boundary:

> **Tile-in-box = feasible. Derive-the-box = hopeless.**

- A deterministic DSL **can** tile contents inside a bounding box whose layout is rule-derivable
  (riser stacks, elevations, warehouse racks, table seating). The engine owns the contents.
- A DSL **cannot** derive an arbitrary building shell. The academic auto-layout algorithms
  (rectangular dualization, VLSI floorplanning, squarified treemaps) only emit *some* valid
  blocky topology — never *the* real to-scale building. Not every adjacency graph is even
  rectangularly realizable without L/T/Z rooms. There is **no published "layout standard"** an
  engine could satisfy the way Newick or IEC 61131-3 pin down the others.
- Real egress / HVAC-routed / office-against-a-shell plans are **HYBRID at best** — they need the
  user to hand-supply the shell geometry, at which point the DSL adds little over a GUI/CAD tool.

**Recommendation:** do **not** attempt general floor plans. If pursuing the spatial area, build
**electrical riser diagrams first** (schematic, on-brand next to SLD), then elevation, then the
grid-tiled subtypes. Hard rule to encode: the engine tiles contents in a box; it must never try
to derive the box's own irregular shape.

Sources: OSHAMap (egress = upload, not generated); Mermaid architecture (no spatial auto-layout);
D2 grid/containers (closest DSL prior art); rectangular-dualization & VLSI floorplanning &
squarified-treemap papers (topology only, not architect output).

---

## Priority (ROI order)

1. **Punnett (A)** — done; wire surfaces + ship.
2. **Welding (B)** — fills EE cluster gap, no layout engine, clear standard.
3. **Forest / KM / Funnel (C1)** — build the value-axis base once; high-value medical/research market.
4. **Electrical riser (C3)** — first spatial, extends SLD.
5. **Feynman / free-body / energy-level (C2)** — physics structure figures.
6. **Lewis chemistry (C2)** — deepest moat, biggest engine lift; schedule after axis base lands.
7. **Excluded:** general/architectural floor plans, commodity statistical charts (bar/line/pie),
   educational astronomy, pictographic illustration (organs/cells/virus → asset library, not DSL).
