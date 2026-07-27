# 28 — PRISMA (Preferred Reporting Items for Systematic reviews and Meta-Analyses) Flow Diagram Standard Reference

*PRISMA 2020 — the four-row flow diagram (Identification → Screening → Eligibility → Included) that every systematic review, meta-analysis, scoping review, and IPD review published in BMJ, Lancet, JAMA, Cochrane, JBI, and Campbell is required to include. Schematex implements the rigid four-row layout with mandatory record counts, parallel exclusion boxes, and the dual-pipeline variant (databases & registers vs other methods) introduced by the PRISMA 2020 update.*

> **Primary References:**
> - **Page MJ, McKenzie JE, Bossuyt PM, Boutron I, Hoffmann TC, Mulrow CD, et al.** (2021). *The PRISMA 2020 statement: an updated guideline for reporting systematic reviews.* **BMJ** 372:n71. DOI: [10.1136/bmj.n71](https://doi.org/10.1136/bmj.n71) — **the canonical document**. CC-BY 4.0.
> - **Page MJ, Moher D, Bossuyt PM, et al.** (2021). *PRISMA 2020 explanation and elaboration: updated guidance and exemplars for reporting systematic reviews.* **BMJ** 372:n160. DOI: [10.1136/bmj.n160](https://doi.org/10.1136/bmj.n160) — item-by-item rationale; defines the flow diagram items.
> - **Haddaway NR, Page MJ, Pritchard CC, McGuinness LA.** (2022). *PRISMA2020: An R package and Shiny app for producing PRISMA 2020-compliant flow diagrams.* **Campbell Systematic Reviews** 18(2):e1230. DOI: [10.1002/cl2.1230](https://doi.org/10.1002/cl2.1230) — reference renderer, gold-standard tooling.
> - **Tricco AC, Lillie E, Zarin W, O'Brien KK, et al.** (2018). *PRISMA Extension for Scoping Reviews (PRISMA-ScR): Checklist and Explanation.* **Annals of Internal Medicine** 169(7):467–473. DOI: [10.7326/M18-0850](https://doi.org/10.7326/M18-0850) — the ScR variant.
> - **Stewart LA, Clarke M, Rovers M, et al.** (2015). *Preferred Reporting Items for Systematic Review and Meta-Analyses of individual participant data: the PRISMA-IPD Statement.* **JAMA** 313(16):1657–1665. DOI: [10.1001/jama.2015.3656](https://doi.org/10.1001/jama.2015.3656) — IPD variant.
> - **Rethlefsen ML, Kirtley S, Waffenschmidt S, et al.** (2021). *PRISMA-S: an extension to the PRISMA Statement for Reporting Literature Searches in Systematic Reviews.* **Systematic Reviews** 10:39. DOI: [10.1186/s13643-020-01542-z](https://doi.org/10.1186/s13643-020-01542-z) — search-strategy reporting.
> - **Moher D, Liberati A, Tetzlaff J, Altman DG, PRISMA Group.** (2009). *Preferred reporting items for systematic reviews and meta-analyses: the PRISMA statement.* **BMJ** 339:b2535. DOI: [10.1136/bmj.b2535](https://doi.org/10.1136/bmj.b2535) — the 2009 predecessor, still widely used.
> - **Equator Network — PRISMA reporting hub.** [https://www.equator-network.org/reporting-guidelines/prisma/](https://www.equator-network.org/reporting-guidelines/prisma/) — central registry of PRISMA extensions (PRISMA-A, PRISMA-Children, PRISMA-DTA, PRISMA-Equity, PRISMA-Harms, PRISMA-NMA, PRISMA-Search, PRISMA-P, etc.).
> - **Cochrane Handbook for Systematic Reviews of Interventions, v6.4** (2023), Chapter 4 §4.6.5 — operational guidance on PRISMA flow diagram counts within Cochrane reviews.
> - **JBI Manual for Evidence Synthesis** (2024), §11 — PRISMA-ScR adaptation for JBI scoping reviews.

**Positioning.** PRISMA is **the** required reporting standard for evidence synthesis. Endorsed by 200+ journals, mandated by Cochrane and the Campbell Collaboration, and instructed for use by ICMJE, the EQUATOR Network, AHRQ, NICE, and WHO. The PRISMA 2020 flow diagram is a *single, rigid, four-row* figure — Identification → Screening → Eligibility → Included — that every review must contain at submission. It is conceptually a flowchart, but the layout, mandatory fields, and dual-pipeline variant are prescribed; a generic flowchart engine cannot produce a compliant figure without contortions. Schematex ships `prisma` as a separate, opinionated engine so the author writes counts and exclusion reasons, and the diagram is correct by construction.

**Scope of this engine.** The PRISMA *flow diagram* only (Item 16a-d in PRISMA 2020). The PRISMA checklist (the 27-item table) and PRISMA-S search-strategy reporting are out of scope; they are textual artefacts, not diagrams.

---

## 1. Relation to existing schematex engines

| Engine | What it does | Why PRISMA needs its own engine |
|---|---|---|
| `flowchart` (§14) | Generic layered DAG (Sugiyama), boxes + arrows, free-form labels | No notion of mandatory stages, mandatory record counts, parallel exclusion side-boxes, or dual-pipeline merge; produces a *flowchart-shaped* diagram, not a PRISMA-shaped one. PRISMA reviewers will reject the figure. |
| `bpmn` (§25) | Pools, lanes, events, gateways for business processes | Wrong semantics — PRISMA is data-flow, not process-flow; no `n =` counts, no exclusion-box concept. |
| `sankey` (planned) | Quantitative flow widths proportional to counts | PRISMA counts are reported numerically inside fixed-size boxes, not visualised as flow width; Sankey is the wrong abstraction. |
| `decision-tree` (§17) | Binary or n-ary decision branching | Different semantics; not a count-tracking pipeline. |

`prisma` shares geometric primitives with `flowchart` (rectangles, vertical arrows, edge labels) but enforces the four-row structure, mandates count fields, and renders the parallel exclusion boxes that distinguish a PRISMA figure from a generic flowchart. It uses the same `BaseTheme` tokens and SVG primitives.

---

## 2. Users & Needs

### 2.1 Personas

| Role | Scenario | Frequency | What is broken without `prisma` |
|---|---|---|---|
| **Systematic review researcher** (Cochrane, Campbell, JBI reviewer) | Producing the mandatory flow diagram for every review | Per review (2–6 reviews/yr per senior researcher) | Forced into R (PRISMA2020 package) or PowerPoint templates; both break LLM-assisted authoring |
| **Medical librarian / information specialist** | Author of search strategy; co-author on most SRs in their institution | Weekly | Search-result counts need updating across drafts; manual figure edits are error-prone |
| **Public-health / epi grad student** | Thesis / dissertation chapter is a systematic review | Once or twice in a PhD | Templates from supervisors are stale (often PRISMA 2009); easy to submit wrong variant |
| **Journal editor / production editor** (BMJ, Lancet, JAMA, NEJM, PLOS Med) | Enforces PRISMA at submission and copy-edit | Daily across journal queue | Receives diagrams in inconsistent formats (PNG screenshots, Word shapes, Visio export); cannot validate counts |
| **Health technology assessment (HTA) analyst** (NICE, CADTH, IQWiG, AHRQ) | Living systematic reviews — flow diagram regenerated as searches refresh | Weekly to monthly | Existing tools require manual regeneration; no DSL/diff workflow |
| **Clinical guideline panel** (WHO, NICE, USPSTF) | Each recommendation backed by an SR with a PRISMA figure | Quarterly | Multiple PRISMA figures per guideline; need consistent style |
| **Scoping review author** (JBI methodology) | PRISMA-ScR diagram | Per review | PRISMA-ScR has different terminology (sources of evidence, not studies); generic tools mislabel |
| **Living-review platform** (Cochrane Living Evidence, COVID-NMA, L-OVE) | Auto-regenerated diagrams on search refresh | Continuous | No programmable, embeddable renderer in JS today |
| **LLM (ChatDiagram / MyMap generation side)** | "Make me a PRISMA diagram from this methods section" | Daily, thousands of times | No compact DSL; LLM produces invalid flow diagrams or hallucinates counts |

### 2.2 What Schematex must do better than the alternatives

1. **Counts are first-class.** Every stage box has a mandatory `n = …` field; the parser refuses to lay out a diagram with missing counts, and the renderer can verify arithmetic consistency (records identified − duplicates removed = records screened) and warn when it does not balance.
2. **Dual-pipeline support is native.** The PRISMA 2020 update added a second "Identification via other methods" column; supporting it in a generic flowchart requires manual lane construction. In `prisma` the author writes `identification.databases:` and `identification.other:`; the layout engine produces the two columns and the merge into Screening automatically.
3. **Exclusion side-boxes are a built-in stage modifier.** The "Records excluded (n = X)" box sitting to the right of Screening, and the "Reports excluded with reasons" list to the right of Eligibility, are part of every PRISMA figure and are awkward to author in a generic flowchart. `prisma` makes them a property of the stage, not a separate box-plus-edge.
4. **PRISMA-ScR vocabulary swap.** A flag `kind: scoping-review` swaps "studies included" → "sources of evidence included" and re-labels stages per Tricco et al. 2018 without changing geometry.
5. **AI-friendly errors.** When counts do not balance ("you said 1,234 identified and 200 duplicates removed but 1,000 screened — discrepancy of 34"), report it in plain English with a fix suggestion, in the same spirit as the rest of Schematex.
6. **Embeddable, zero-dep, SSR-safe.** No R runtime, no Shiny server, no Java. A single `<script>` or `import { renderPrisma } from "schematex"`.
7. **Theme tokens.** Inherits `BaseTheme` so a journal-house style (BMJ blue, Lancet red) can be applied without touching DSL.

---

## 3. Market Need

### 3.1 Search volume (Ahrefs, US + Global, KD = Keyword Difficulty 0-100)

| Keyword | US monthly | Global monthly | KD | Intent |
|---|---:|---:|---:|---|
| `prisma flow diagram` | 1,500 | 20,000 | 47 | Transactional + educational |
| `prisma diagram` | 1,000 | 6,000 | 25 | Transactional |
| `prisma 2020` | — | — | — | Methodology lookup (not measured here) |
| `prisma flow chart` | — | — | — | Variant spelling, additive volume |
| `prisma flowchart template` | — | — | — | Strong transactional signal (template hunting) |

Two cells deserve emphasis. `prisma flow diagram` runs **20,000 global searches/month**; that is a research-niche keyword in the same order of magnitude as `flowchart maker` (88,000), driven by mandatory inclusion in evidence-synthesis publication workflows. The Keyword Difficulty 47 indicates moderate competition — well below `flowchart` (KD 70) and within reach for an open-source dev-tool blog with backlinks from health-research repos. `prisma diagram` (KD 25) is essentially undefended SERP real estate.

A second-order signal: the **PRISMA 2020 R package** (Haddaway et al. 2022) has been cited ~2,000 times on Google Scholar as of writing, all from authors who had no better tool. That citation count is a lower bound on the addressable population.

### 3.2 Competitive landscape

| Product | Positioning | License | Stack | Key gap |
|---|---|---|---|---|
| **PRISMA2020 R package** (Haddaway et al.) | Gold-standard generator | MIT | R + DiagrammeR + Shiny | R-only; not embeddable in JS apps; output is PNG/PDF, not interactive SVG |
| **prisma-flowdiagram.org** (Haddaway-hosted Shiny app) | Web UI wrapping the R package | MIT (app), CC-BY (output) | R Shiny server | Form-driven UI only; no API, no embed, no DSL |
| **Covidence** | Commercial SR management SaaS | Commercial ($$$) | Closed | Paywalled; figure generation tied to platform lock-in |
| **Rayyan** | Commercial SR screening tool | Freemium | Closed | Screening tool; figure generation is afterthought |
| **EPPI-Reviewer** | Commercial SR platform (UCL) | Commercial | Closed | Paywalled |
| **DistillerSR** | Commercial SR platform | Commercial | Closed | Paywalled |
| **draw.io / Lucidchart / Visio PRISMA templates** | Manual shape libraries | Various | GUI | Hand-drawn; no validation; counts edited by clicking |
| **PowerPoint PRISMA templates** (downloadable from PRISMA-statement.org) | Free .pptx | Public domain | PowerPoint | Manual; offline; no count arithmetic |
| **Mermaid `flowchart`** | Markdown-native DSL | MIT | JS | Generic flowchart only; no PRISMA semantics, no dual pipeline, no exclusion-box convention |
| **PlantUML** | DSL diagrams | GPL | Java | No PRISMA support |
| **Quarto / R Markdown chunks calling PRISMA2020** | Reproducible-reporting workflow | MIT | R | R-only; ties documents to R toolchain |

**Schematex differentiation:**
- The **only embeddable JS library** with PRISMA 2020 semantics.
- Zero runtime dependencies, KB-scale bundle, SSR-safe — usable in a Next.js journal portal or a static MkDocs site.
- AI-native DSL — a complete PRISMA diagram is ~25 lines.
- Output is semantic SVG with `<title>`/`<desc>` and `data-*` for interactivity; renderable to PNG/PDF via headless Chromium for journal submission.
- AGPL-3.0 + commercial licence dual-track aligns with academic/non-profit use; commercial vendors (Covidence et al.) can take a commercial licence to embed.

---

## 4. Standard Compliance

### 4.1 What we implement

- **PRISMA 2020 flow diagram, single-pipeline mode** — Identification via databases and registers only.
- **PRISMA 2020 flow diagram, dual-pipeline mode** — Identification via databases and registers **plus** Identification via other methods (citation searching, hand searches, expert recommendations, grey literature, regulators).
- **PRISMA 2020 with previous-studies stage** — for updated reviews; an optional top stage feeding into Identification.
- **PRISMA-ScR (Scoping Review) terminology overlay** — same geometry, swapped labels per Tricco et al. 2018.
- **PRISMA-IPD note variant** — note line for IPD reviewers indicating studies *and* participants counts.
- **Mandatory count fields** — `n = …` rendered in every box; missing values are a parse error.
- **Mandatory exclusion side boxes** — at Screening (records excluded) and Eligibility (reports excluded with reasons). Reasons rendered as breakdown lines.
- **Arithmetic validation** — optional but enabled by default; warns when sums do not reconcile across stages.

### 4.2 What we deliberately omit

| Omitted | Why |
|---|---|
| PRISMA 2009 diagram as default | Superseded; available via `mode: 2009` for journals that still require it but not the default. |
| The 27-item PRISMA checklist (table) | Textual artefact; not a diagram. |
| PRISMA-S search strategy reporting | Textual artefact. |
| Free-form box positioning / drag-and-drop | A PRISMA diagram has a rigid layout *by design*; allowing repositioning defeats the standard. |
| Sankey-style proportional widths | Not part of PRISMA 2020; would mislead readers familiar with the canonical figure. |
| Branding overlays inside the diagram | Diagram is for the methods section; journal branding belongs at the page level. |

### 4.3 Style adherence

We follow the **PRISMA2020 R package** rendering conventions as the de facto visual baseline (Haddaway et al. 2022), with these defaults:

- Stage boxes (Identification / Screening / Eligibility / Included) are plain rectangles, **not** rounded, **not** filled — light fill (theme `bgMuted`) is acceptable and matches the R package default.
- Exclusion side boxes share the same rectangle style with theme `bgMuted` and are connected by a **horizontal** arrow.
- Vertical arrows between main stages are solid, filled triangle arrowheads.
- The "Identification of studies via databases and registers" / "Identification of studies via other methods" headers are bold and span their column.
- Stage names are inside the left-most box of their row; subsequent boxes in the row carry the count text.
- Font hierarchy: stage header > box label > count > exclusion reason (smallest readable size).

---

## 5. Symbol Catalog

PRISMA boxes are intentionally minimal — plain rectangles holding text. The "vocabulary" is in the text layout inside each box and in the connection geometry between boxes.

### 5.1 Stage box anatomy

```
┌──────────────────────────────────────────┐
│  Records identified from:                │   ← box label (mandatory)
│    Databases (n = 1,234)                 │   ← source breakdown (optional)
│    Registers (n = 184)                   │
│  Total (n = 1,418)                       │   ← total count (mandatory)
└──────────────────────────────────────────┘
```

| Field | Required | Notes |
|---|---|---|
| Box label | yes | The PRISMA-prescribed wording for the stage (e.g. "Records screened"); engine supplies the wording, author cannot override casually. |
| Source breakdown | optional | One line per source; rendered indented; allowed only on Identification stages. |
| Total count | yes | The mandatory `n = X` reported in the PRISMA item. Refused if absent. |
| Subtitle / note | optional | A single italic line below the count; used for PRISMA-IPD participants count. |

### 5.2 Exclusion side-box anatomy

```
┌─────────────────────────────────────┐
│  Records excluded (n = 750)         │   ← header
│    Duplicate records (n = 120)      │   ← reason lines
│    Irrelevant title (n = 500)       │
│    Non-English (n = 130)            │
└─────────────────────────────────────┘
```

| Field | Required | Notes |
|---|---|---|
| Header | yes | "Records excluded" or "Reports excluded with reasons" depending on the stage. |
| Reason lines | optional but strongly recommended | Each line is `reason name (n = …)`. PRISMA 2020 recommends listing reasons at Eligibility; at Screening it is conventional to report a single total. |

### 5.3 Connector geometry

| Connector | Where | Style | Notes |
|---|---|---|---|
| Vertical stage arrow | Between any two adjacent main rows | Solid, 1.5px stroke, filled triangle arrowhead | The "main pipeline" |
| Horizontal exclusion arrow | From a main box to its right-hand exclusion box | Solid, 1.5px stroke, filled triangle arrowhead | One per excluding stage |
| Merge arrow (dual pipeline) | From the second-column Identification box into the Screening row | Solid; can be diagonal or step-routed | Only used in `mode: 2020-dual` |
| Previous-studies arrow | From the optional top stage into Identification | Solid | Only when `previous-studies:` block present |

No other connector types exist. Edge labels are not used; the diagram is read top-to-bottom and counts are inside the boxes, not on the arrows.

### 5.4 Mandatory fields per stage

| Stage | Mandatory fields |
|---|---|
| Identification (databases) | `n = total identified`, optional source breakdown, optional `duplicates-removed: n` |
| Identification (other methods) | `n = total identified from other methods`, optional source breakdown |
| Screening | `n = records screened`, `n = records excluded` (and recommended reasons) |
| Eligibility | `n = full-text reports assessed`, `n = reports excluded`, **mandatory reason breakdown** (PRISMA 2020 explicitly asks for reasons here) |
| Included | `n = studies included`, `n = reports of included studies` (one study may yield multiple reports) |
| Previous studies (optional top) | `n = studies` and/or `n = reports` from prior review |

---

## 6. DSL Grammar

### 6.1 Compact EBNF

```
prisma-document   = header, { newline }, body ;
header            = "prisma" ;
body              = { meta-line }, stage-block, { stage-block } ;

meta-line         = "mode:" mode-value
                  | "title:" string
                  | "review-id:" string
                  | "kind:" review-kind
                  | "direction:" "TB" | "TD"        (* the only legal values; horizontal is non-standard *)
                  | "validate-counts:" "strict" | "warn" | "off" ;

mode-value        = "2020-single" | "2020-dual" | "2009" ;
review-kind       = "systematic-review" | "scoping-review" | "ipd" | "nma" ;

stage-block       = previous-block? identification-block screening-block eligibility-block included-block ;

previous-block    = "previous-studies:" newline, indent, count-line, { source-line }, dedent ;

identification-block = "identification:" newline,
                       indent,
                       "databases:" newline, indent, count-line,
                                                    { source-line },
                                                    [ "duplicates-removed:" count ],
                                                    [ "ineligible-automation:" count ],
                                                    [ "other-removed:" count ], dedent,
                       [ "other:" newline, indent, count-line,
                                                   { source-line }, dedent ],
                       dedent ;

screening-block   = "screening:" newline,
                    indent,
                    "records-screened:" count,
                    "excluded:" newline, indent, count-line, { reason-line }, dedent,
                    [ "reports-sought:" count ],
                    [ "reports-not-retrieved:" count ],
                    dedent ;

eligibility-block = "eligibility:" newline,
                    indent,
                    "full-text-assessed:" count,
                    "excluded:" newline, indent, count-line, { reason-line }, dedent,
                    dedent ;

included-block    = "included:" newline,
                    indent,
                    "studies:" integer,
                    [ "reports:" integer ],
                    [ "participants:" integer ],
                    dedent ;

count-line        = "n:" integer ;
source-line       = "sources:" source-pair, { "," source-pair } ;
source-pair       = string "=" integer ;
reason-line       = "reasons:" reason-pair, { "," reason-pair } ;
reason-pair       = string "=" integer ;
count             = integer ;
integer           = digit, { digit | "," } ;     (* commas accepted and stripped: 1,234 == 1234 *)
```

`indent` and `dedent` are significant-whitespace markers — two spaces per level, mirroring the rest of Schematex (genogram, sld). The parser accepts trailing commas in `sources:` and `reasons:` and is tolerant of `n=` vs `n =`.

### 6.2 Worked example — minimal PRISMA 2020 single-pipeline

```prisma
prisma
mode: 2020-single
title: Effect of exercise on chronic low-back pain — SR

identification:
  databases:
    n: 1418
    sources: PubMed=600, Embase=450, Cochrane=184, Web of Science=184
    duplicates-removed: 318

screening:
  records-screened: 1100
  excluded:
    n: 870
    reasons: irrelevant title=750, non-English=120

eligibility:
  full-text-assessed: 230
  excluded:
    n: 195
    reasons: wrong population=80, wrong intervention=60, wrong outcome=55

included:
  studies: 35
  reports: 38
```

### 6.3 Worked example — full PRISMA 2020 dual-pipeline

```prisma
prisma
mode: 2020-dual
title: Effect of yoga on chronic back pain — SR
kind: systematic-review

identification:
  databases:
    n: 1234
    sources: PubMed=600, Embase=450, Cochrane=184
    duplicates-removed: 254
    ineligible-automation: 0
  other:
    n: 56
    sources: citation-search=30, hand-search=20, expert-recommendation=6

screening:
  records-screened: 980
  excluded:
    n: 750
    reasons: duplicate=120, irrelevant title=500, non-English=130
  reports-sought: 230
  reports-not-retrieved: 12

eligibility:
  full-text-assessed: 218
  excluded:
    n: 195
    reasons: wrong population=80, wrong intervention=60, wrong outcome=55

included:
  studies: 23
  reports: 25
```

### 6.4 Worked example — updated review with previous-studies stage

```prisma
prisma
mode: 2020-dual
title: Updated SR — Statins for primary prevention (2024 update of 2018 review)

previous-studies:
  n: 19
  sources: previous review=19

identification:
  databases:
    n: 612
    sources: PubMed=280, Embase=220, Cochrane=112
    duplicates-removed: 142
  other:
    n: 18
    sources: citation-search=12, hand-search=6

screening:
  records-screened: 488
  excluded:
    n: 410
    reasons: irrelevant title=380, non-English=30

eligibility:
  full-text-assessed: 78
  excluded:
    n: 65
    reasons: wrong design=40, wrong outcome=15, ongoing=10

included:
  studies: 32        # 19 previously included + 13 new
  reports: 41
```

### 6.5 Worked example — PRISMA-ScR

```prisma
prisma
mode: 2020-single
kind: scoping-review
title: Mapping AI-assisted diagnostic tools in emergency medicine — Scoping Review

identification:
  databases:
    n: 2104
    sources: MEDLINE=900, Embase=700, CINAHL=304, IEEE Xplore=200
    duplicates-removed: 412

screening:
  records-screened: 1692
  excluded:
    n: 1480
    reasons: not AI=600, not emergency=500, not diagnostic=380

eligibility:
  full-text-assessed: 212
  excluded:
    n: 154
    reasons: wrong setting=60, no full text=40, wrong concept=54

included:
  studies: 58         # rendered as "Sources of evidence" because kind=scoping-review
  reports: 58
```

### 6.6 Worked example — stress test with 10+ exclusion reasons

```prisma
prisma
mode: 2020-dual
title: Stress test — long exclusion-reason lists

identification:
  databases:
    n: 5000
    sources: PubMed=2000, Embase=1500, Cochrane=500, CINAHL=400, PsycINFO=300, Scopus=300
    duplicates-removed: 1200
  other:
    n: 80
    sources: citation-search=50, hand-search=20, regulator=10

screening:
  records-screened: 3880
  excluded:
    n: 3100
    reasons: irrelevant=1500, non-English=400, animal study=350, conference abstract=300, editorial=200, news=120, duplicate=100, retracted=80, protocol only=30, preprint duplicate=20

eligibility:
  full-text-assessed: 780
  excluded:
    n: 612
    reasons: wrong population=120, wrong intervention=110, wrong comparator=80, wrong outcome=90, wrong design=70, wrong setting=40, no full text=30, ongoing=30, retracted=22, language=20

included:
  studies: 168
  reports: 184
```

When a reason list grows beyond what a side box can hold at default width, the renderer:
1. Sorts reasons in descending-count order.
2. Renders up to 8 lines explicitly.
3. Aggregates the remainder as `Other (n = …)`.
4. Emits a warning in stderr (during build) listing the aggregated reasons so the author can shorten the DSL.

### 6.7 Parser tolerances

- `n: 1,234` and `n: 1234` are equivalent.
- Commas in source/reason pairs may be followed by a newline + indent.
- Reason and source names containing spaces or punctuation can be quoted: `"wrong study design"=70`.
- Trailing commas allowed.
- Unknown keys inside a stage block are a parse error (not warning) — keeps stages well-defined.
- **A common leading margin is stripped before indent levels are measured.** Only *relative* indentation is meaningful, so a block indented wholesale — pasted from a markdown fence, a JSX template literal, or an LLM reply that indents its whole answer — parses identically to the flat form, at any margin width including odd ones. The `prisma` header must still be the least-indented line in the block; a header sitting deeper than the body is a parse error naming the indentation, not the keyword.

---

## 7. Layout Rules

### 7.1 Rigid four-row vertical layout

The diagram is **always** vertical (top-to-bottom). The author cannot change direction; horizontal PRISMA diagrams exist in the wild but are non-standard and rejected by most journals.

Rows, from top to bottom:

1. **Optional previous-studies row** (only when `previous-studies:` present).
2. **Identification row** — one column (`2020-single`, `2009`) or two columns (`2020-dual`).
3. **Screening row** — always one column; merges the dual pipeline.
4. **Eligibility row** — always one column.
5. **Included row** — always one column.

Inter-row vertical gap: `2 × ROW_GAP_UNIT` (default 48px). Intra-row exclusion-box gap: `1 × COLUMN_GAP_UNIT` (default 96px) to the right.

### 7.2 Column geometry (single-pipeline)

```
                   ┌──────────────────────────┐
                   │ Identification           │
                   │  databases: n = 1418     │
                   │  duplicates removed: 318 │
                   └──────────────┬───────────┘
                                  ▼
            ┌──────────────────────────┐   ┌────────────────────────┐
            │ Records screened (1100)  │──▶│ Records excluded (870) │
            └──────────────┬───────────┘   │   reasons …            │
                           ▼               └────────────────────────┘
            ┌──────────────────────────┐   ┌────────────────────────┐
            │ Full-text assessed (230) │──▶│ Reports excluded (195) │
            └──────────────┬───────────┘   │   reasons …            │
                           ▼               └────────────────────────┘
                   ┌──────────────────┐
                   │ Included: 35 / 38│
                   └──────────────────┘
```

Main-pipeline boxes are horizontally centred on the page x-axis. Exclusion side boxes hang off to the right (LTR locales) or to the left (RTL — see §7.6).

### 7.3 Column geometry (dual-pipeline)

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Identification via databases │   │ Identification via other     │
│ n = 1234                     │   │ n = 56                       │
│ duplicates removed: 254      │   │                              │
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │                                  │
               └──────────────┬───────────────────┘
                              ▼
            ┌──────────────────────────┐   ┌────────────────────────┐
            │ Records screened (980)   │──▶│ Records excluded (750) │
            └──────────────┬───────────┘   │   …                    │
                           ▼               └────────────────────────┘
                          (eligibility row, then included)
```

In dual-pipeline, the two Identification columns are placed at:
- Left column centre: `-COLUMN_GAP_UNIT / 2` from page centre.
- Right column centre: `+COLUMN_GAP_UNIT / 2` from page centre.

The merge into Screening is rendered as a Y-junction: each identification box drops a vertical arrow to a horizontal midline at `Identification.bottom + ROW_GAP_UNIT / 2`, then a single vertical arrow continues down to Screening.

### 7.4 Box width allocation

| Box | Width strategy |
|---|---|
| Main-pipeline box | Computed from longest line of text; clamped to `[MIN_MAIN_WIDTH, MAX_MAIN_WIDTH]` (defaults 220, 380). |
| Exclusion side-box | Computed from longest reason line; clamped to `[MIN_SIDE_WIDTH, MAX_SIDE_WIDTH]` (defaults 200, 320). |
| Dual-column Identification | Each column independently sized within `[MIN_MAIN_WIDTH, MAX_MAIN_WIDTH / 1.05]` so the two columns plus their gap fit page width. |

If the combined natural widths exceed page width, the layout shrinks `MAX_MAIN_WIDTH` proportionally and re-wraps text lines.

### 7.5 Box height allocation

Box height = `vertical-padding + line-count × LINE_HEIGHT + vertical-padding`. The renderer wraps text inside the box to the chosen width; line-count includes wrapped continuation lines. Box heights are computed *before* row vertical positions are finalised, so the four rows do not collide.

### 7.6 Text direction & RTL

`direction: TB` is the only legal direction (`TD` accepted as alias per Mermaid). RTL locale handling: if the `dir="rtl"` is detected on the host `<svg>` or via a `theme.locale = "rtl"` token, exclusion side-boxes hang off to the **left**, and the dual-pipeline columns swap so "other methods" sits on the left. Otherwise LTR is the default.

### 7.7 Arithmetic validation

When `validate-counts: strict` (default `warn`):

- `databases.n + other.n − duplicates-removed − ineligible-automation − other-removed = records-screened`
- `records-screened − excluded.n = full-text-assessed (or reports-sought)`
- `full-text-assessed − excluded.n = included.studies × (reports-per-study)` (loosely; `reports >= studies`)

A mismatch in `strict` mode is a parse error with an "off by N" message. In `warn` mode the diagram still renders but a `<desc>` warning is emitted (visible to screen readers and visible in the HTML source). `off` skips the check entirely.

### 7.8 Page background, padding, and centred layout

The renderer reserves outer padding of `2 × ROW_GAP_UNIT` on all sides and centres the entire stack horizontally. The page has no background fill by default (theme-controlled via `bg`).

---

## 8. Canonical Test Cases

These five cases are mandatory layout fixtures; any change to the layout engine must keep their snapshot SVG byte-identical (modulo whitespace-stable formatting) or document the diff in the impl plan.

### 8.1 Minimal PRISMA 2009 single-pipeline

- DSL: §6.2 but with `mode: 2009`.
- Expected geometry: four boxes vertically aligned, one side-box at each of Screening and Eligibility, no source breakdown.
- Verifies: backward compatibility, label vocabulary swap to 2009 wording ("Records after duplicates removed").

### 8.2 Full PRISMA 2020 dual-pipeline (§6.3)

- Two identification columns, Y-merge into Screening, side boxes at Screening and Eligibility.
- Verifies: dual-pipeline merge geometry, source-breakdown rendering, count arithmetic across both pipelines.

### 8.3 Updated review with previous-studies stage (§6.4)

- Optional top row above Identification, with a downward arrow into Identification (or directly into Screening per author choice — first cut: into Identification).
- Verifies: the optional fifth row, previous-studies labelling, total-studies reconciliation (previous + new = total included).

### 8.4 PRISMA-ScR scoping review (§6.5)

- Same geometry as 8.1 / 8.2 but with label swaps: "studies" → "sources of evidence", "Studies included in qualitative synthesis" → "Sources of evidence included in review".
- Verifies: vocabulary-overlay mechanism without geometry change.

### 8.5 Stress test — long reason lists (§6.6)

- 10 reasons at Screening, 10 at Eligibility.
- Verifies: aggregation rule (top 8 + Other), warning emission, side-box height growth, page-width clamping.

Each test case ships as:
- `tests/prisma/fixtures/01-minimal-2009.dsl`
- `tests/prisma/fixtures/02-dual-2020.dsl`
- `tests/prisma/fixtures/03-updated-review.dsl`
- `tests/prisma/fixtures/04-scoping.dsl`
- `tests/prisma/fixtures/05-stress-reasons.dsl`

With matching `expected.svg` snapshots and `expected-layout.json` for absolute-coordinate assertions.

---

## 9. Theme Integration

PRISMA inherits the standard `BaseTheme` tokens. There is no PRISMA-specific theme; that is by design — a journal style is achieved by setting CSS custom properties at the host level.

| Token | Default | Where used |
|---|---|---|
| `bg` | white | Page background |
| `bgMuted` | `#f5f7fa` | Stage box fill, exclusion box fill |
| `stroke` | `#374151` | Box border, arrow stroke |
| `strokeMuted` | `#9ca3af` | Reason-line separator (if drawn) |
| `text` | `#111827` | Stage label, count |
| `textMuted` | `#4b5563` | Source breakdown, reason lines |
| `accent` | `#2563eb` | (Reserved) — used only for previous-studies-row outline emphasis when `kind: ipd` or to highlight the "Included" terminal row when `theme.emphasize-included: true` |

CSS classes emitted by the renderer (kebab-case, no inline `style="…"`):

| Class | On element |
|---|---|
| `prisma-stage` | Every main-pipeline `<rect>` |
| `prisma-stage-label` | The bold first line `<text>` inside a stage |
| `prisma-stage-count` | The `n = …` `<text>` |
| `prisma-stage-source` | Source breakdown `<text>` lines |
| `prisma-exclusion` | Exclusion side-box `<rect>` |
| `prisma-exclusion-reason` | Reason `<text>` lines |
| `prisma-arrow-main` | Main-pipeline arrow `<path>` / `<line>` |
| `prisma-arrow-exclusion` | Horizontal arrow to exclusion box |
| `prisma-arrow-merge` | Y-merge arrows in dual-pipeline mode |
| `prisma-stage-previous` | Optional previous-studies box |

Journal-house overrides therefore look like:

```css
.bmj-prisma .prisma-stage { fill: #fff; stroke: #003e6f; }
.bmj-prisma .prisma-stage-label { fill: #003e6f; font-weight: 700; }
.bmj-prisma .prisma-arrow-main { stroke: #003e6f; }
```

…with no DSL changes needed.

---

## 10. Prerequisites — build order and dependencies

**Important.** v0.1 PRISMA depends on two upstream items in the flowchart engine that are scheduled in the Track A implementation plan:

1. **Flowchart Unit 1 — `<br/>` actual rendering inside boxes.** PRISMA stage boxes contain multi-line text (label + count + optional source breakdown). The renderer must lay out multi-line text inside a `<rect>` with measured wrapping, not just emit a `<br/>` placeholder. Track A Unit 1 introduces the `wrapTextInRect` primitive that PRISMA reuses verbatim.
2. **Flowchart Unit 2 — top-level subgraph vertical stacking.** PRISMA's four-row structure is modelled internally as four stacked subgraphs (rows). Track A Unit 2 introduces deterministic vertical stacking of top-level subgraphs with mutual gap = `ROW_GAP_UNIT`. Without it, PRISMA would have to re-implement row stacking inside its own engine, duplicating ~120 lines.

> Build order: **Track A Unit 1 → Track A Unit 2 → `prisma` v0.1**. Do not start `prisma` until both flowchart units have shipped and have green tests.

Additional shared dependencies (already in place):

- `src/core/svg.ts` SVG builder.
- `src/core/theme.ts` for `BaseTheme` tokens.
- `src/core/text-metrics.ts` for `measureText` (used by `wrapTextInRect`).
- `src/core/types.ts` — `DiagramType` literal must be extended with `"prisma"`; AST type added.

PRISMA does **not** depend on the BPMN engine, the SLD engine, or any other diagram engine.

---

## 11. Open Questions — NEEDS VICTOR INPUT

The following design choices are unsettled and will require Victor's call before v0.1 ships. Each is annotated with the implementation cost of each branch.

1. **Default `mode` when unspecified.** PRISMA 2020 is now mandated by most journals, but PRISMA 2009 still appears in the wild. Options:
   - `2020-single` — modern default, may surprise authors of legacy reviews.
   - `2009` — backward-friendly but encourages outdated diagrams.
   - `error: must specify mode` — most explicit; pushes authors to make a deliberate choice.
   - **Cost:** trivial; this is a one-line decision.
2. **Where does the previous-studies arrow attach?** Two reasonable choices: (a) into Identification (so previous studies merge with new identification before duplicate removal), or (b) directly into Included (so they are not re-screened). The PRISMA 2020 paper shows (b) more often, but (a) is also seen. Default proposal: (a), with a flag `previous-studies-attach: included` to switch.
   - **Cost:** small; one extra arrow-routing branch.
3. **Strict vs warn for count arithmetic.** Defaulting to `strict` is pedagogically correct but will reject diagrams from real-world papers where the author rounded or where counts genuinely don't reconcile (e.g. studies that became reports during review). Default proposal: `warn`. Victor to confirm.
   - **Cost:** zero; flag exists.
4. **Top-down vs portrait page sizing.** PRISMA diagrams in printed papers are usually portrait full-page. Should the renderer default to a page-bounded size (e.g. A4 / US-Letter portrait) and shrink the diagram to fit, or always render at natural size and leave page fitting to the host? Default proposal: natural size, document the natural-size guarantee.
   - **Cost:** none for natural-size; medium for fit-to-page mode (~80 lines added).
5. **PRISMA-NMA, PRISMA-DTA, PRISMA-Harms extensions.** These have slightly different flow diagrams (NMA in particular has an extra network-figure annex). Scope for v0.1: skip. Scope for v0.2: support label overlays only. Real geometric differences (NMA network step) deferred to v0.3 if demanded by users. Victor to confirm.
   - **Cost:** v0.1 nothing; v0.2 ~50 lines; v0.3 a full sub-engine.
6. **"Reports of included studies" rendering.** PRISMA 2020 explicitly distinguishes studies vs reports in the Included box (one study can yield N reports). Two boxes side-by-side, or one box with two count lines? Default proposal: one box, two count lines. Victor to confirm.
   - **Cost:** trivial.
7. **Word-counting locale for box width.** When the DSL is in Chinese/Japanese, character width is different. The Schematex text-metrics module already handles CJK width; do we *also* want to expose a `theme.locale: "cjk"` flag that bumps `LINE_HEIGHT` to accommodate larger glyphs? Default proposal: rely on text-metrics; no extra flag.
   - **Cost:** zero.
8. **Arrow style — orthogonal step vs straight.** Single-pipeline arrows are obviously straight vertical. Dual-pipeline merge can be a Y-junction (current proposal) or an orthogonal step (right-angled). The R package uses Y-junction. Default proposal: match R package. Victor to confirm.
   - **Cost:** trivial.
9. **Inclusion of meta-data line under the diagram.** Some journals require the figure caption to include "From: Page MJ et al. (2021)". Do we offer a `cite-prisma: true` flag that adds a small citation line? Default proposal: no, captions belong to the host document, not the SVG.
   - **Cost:** trivial.
10. **Renaming the `included.studies` field for PRISMA-IPD.** PRISMA-IPD requires reporting *participants* counts. Field already in §6.1 grammar; should it be mandatory when `kind: ipd`? Default proposal: yes.
    - **Cost:** trivial; one validation rule.

---

## 12. v0.1 Definition of Done

A v0.1 PRISMA engine is considered done when:

1. All five canonical test cases (§8) render correctly and have green layout snapshots.
2. Single-pipeline 2020 mode renders the BMJ-published exemplar (Page MJ et al. 2021 Figure 1) at byte-comparable layout (allowing for font metrics).
3. Dual-pipeline 2020 mode renders the BMJ-published Figure 2 from the same paper.
4. Count arithmetic warnings fire on §6.6 fixture when `validate-counts: warn`.
5. PRISMA-ScR vocabulary overlay works without altering geometry (verified by snapshot diff of single-pipeline vs single-pipeline + `kind: scoping-review`).
6. Theme overrides via CSS custom properties verified in `tests/prisma/theme.test.ts`.
7. SSR rendering verified (no `window`, `document`, or DOM access in renderer).
8. Bundle size delta < 6 KB minified+gzipped on top of existing `flowchart` primitives.
9. Documentation: this file plus `website/content/docs/prisma.mdx` with playground.
10. README gallery row with generated SVG.

Out of scope for v0.1 (deferred to v0.2):
- PRISMA-NMA, PRISMA-DTA visual extensions.
- PNG/PDF export pipeline (host-side concern).
- Live-update / streaming counts (for living reviews).
- Interactive hover-tooltips on count breakdown.

---

## 13. Implementation note — risks

The single largest implementation risk is **text wrapping inside fixed-width boxes**. PRISMA boxes are width-constrained and count-line-heavy; CJK + Latin mixed text plus the optional source-breakdown lines make height calculation non-trivial. The Schematex text-metrics module gives byte-accurate measurements only when the host browser font matches the build-time assumption — server-rendered SVG with an unavailable font will mis-wrap. Mitigation: ship a default web-safe font stack in `BaseTheme.fontFamily` and document that journal-specific fonts must be loaded via `@font-face` *before* render-time measurement. This same risk applies to the BPMN engine and is handled the same way.

The second risk is **count arithmetic ergonomics**. `strict` mode will frustrate first-time users who copy counts from an old draft; `warn` mode will silently let invalid diagrams through. The default proposal is `warn` + an explicit "Validation passed" message on stdout during build to give authors a positive signal. Long-term, an editor integration (LSP-style) would surface the warning inline.

The third risk is **the dual-pipeline merge geometry** on narrow pages. If the page is narrower than `2 × MIN_MAIN_WIDTH + COLUMN_GAP_UNIT`, the two columns will overlap. Mitigation: clamp `MIN_MAIN_WIDTH` lower in dual-pipeline mode and re-wrap text; if still too narrow, fall back to a stacked layout (column 2 below column 1, not beside it) and emit a warning.

---

*End of standard. See `../../CoCEO/schematex/impl/28.X-prisma-*.md` for the implementation plan.*
