# 40 — FMEA (Failure Mode and Effects Analysis) Standard Reference

> **Status:** RESEARCHED — standard research + reference images gathered by assistant on 2026-06-03; implementation pending (Victor). The one item the assistant could *not* fully transcribe is the exact 1000-cell AIAG-VDA Action Priority lookup (paywalled Handbook); the band structure is captured below and the verbatim transcription is the top TODO.

*The tabular reliability workhorse — a structured worksheet that walks each **item / function** to its **failure mode(s)**, the resulting **effect(s)**, and the underlying **cause(s)**, then scores three dimensions (**Severity**, **Occurrence**, **Detection**) to prioritise risk. The classic metric is the **Risk Priority Number, `RPN = S × O × D`** (1–1000); the modern AIAG-VDA harmonised method (2019) deliberately **drops RPN as the primary key** and replaces it with an **Action Priority (AP) High / Medium / Low** lookup table — because two failures with the same RPN can carry wildly different severity, and severity must dominate. Schematex's engine — like `faulttree`'s cut sets and `pert`'s schedule — **computes RPN and AP, sorts the worksheet by risk, and flags the high-priority rows**; the deliverable is a scored, ranked table, not a blank form. The **FMECA** variant adds a criticality analysis (the criticality number Cₘ/Cᵣ and the severity×occurrence criticality matrix). This is a tabular artifact (the FMEA worksheet), Schematex's first table-shaped diagram in the 🛡 Risk & Reliability cluster, sibling to `37-FAULT-TREE-STANDARD.md`.*

> **Primary References:**
> - **AIAG & VDA** (2019). *FMEA Handbook — Design FMEA and Process FMEA.* Automotive Industry Action Group / Verband der Automobilindustrie, 1st ed. — *The current harmonised North-American/German automotive standard (replaces the separate AIAG 4th-ed. and VDA Vol. 4 books). Introduces the **seven-step approach** (Planning → Structure → Function → Failure → Risk → Optimization → Documentation), the **structure-tree / function-net** worksheet columns, and — the headline change — replaces the legacy RPN with the Severity→Occurrence→Detection **Action Priority (AP)** lookup tables. Paywalled; the AP tables and S/O/D anchor scales are not freely reproducible.* <!-- TODO(Victor): verify ISBN/printing, transcribe AP tables from the physical Handbook -->
> - **IEC 60812:2018 Ed. 3.0** — *Failure modes and effects analysis (FMEA and FMECA).* International Electrotechnical Commission, Geneva. — *The international cross-industry standard; the 2018 third edition renamed the document to explicitly cover both FMEA and FMECA, defines the worksheet structure and the criticality extension. The cross-industry (non-automotive) baseline.* <!-- TODO(Victor): verify edition clause numbers -->
> - **SAE J1739** — *Potential Failure Mode and Effects Analysis in Design (Design FMEA), Process FMEA, and FMEA for Machinery.* SAE International. — *The long-standing automotive **RPN-based** FMEA, still widely used alongside AIAG-VDA; the most recent revision (J1739_202101, Jan 2021) aligns with the AIAG-VDA seven-step method while retaining RPN.* <!-- TODO(Victor): verify the 202101 revision designation -->
> - **MIL-STD-1629A** (1980, historical). *Procedures for Performing a Failure Mode, Effects and Criticality Analysis.* U.S. Department of Defense. — *The historical origin of FMECA and the criticality-number (Cₘ, Cᵣ) method and the criticality matrix; formally cancelled (1998) but still cited as the FMECA baseline in aerospace/defence/nuclear.*
> - **Wikipedia, "Failure mode and effects analysis."** https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis — *Worksheet-column conventions, the RPN definition, and the process-flow image used here.*
> - **Wikipedia, "Failure mode, effects, and criticality analysis."** https://en.wikipedia.org/wiki/Failure_mode,_effects,_and_criticality_analysis — *Source of the verified Cₘ/Cᵣ criticality formulas (§FMECA below) and the FMD-91/97 failure-mode-ratio databases.*
>
> *Notes on the standard landscape.* FMEA is fundamentally a **worksheet method**, not a node-edge graph. Two scoring schools coexist: the legacy **RPN = S×O×D** (SAE J1739, IEC 60812, MIL-STD-1629A "RPN" usage) and the newer **AIAG-VDA Action Priority** lookup (which deliberately abandons RPN because equal RPNs mask very different severities — the canonical illustration: `S9·O3·D5 = 135` and `S5·O9·D3 = 135` carry the *same* RPN but the first is a near-safety issue and the second is a nuisance). Schematex should support both: compute RPN *and* AP and let the author choose the ranking key.

---

## 0. Positioning

FMEA is among the most widely *practised* reliability techniques on earth — mandatory in automotive (IATF 16949 → AIAG-VDA), aerospace, medical-device (ISO 14971-adjacent), and process industries. Yet it lives almost entirely in Excel and proprietary tools (APIS IQ-FMEA, PLATO SCIO); there is no text-DSL, version-controllable, diff-able representation. That gap is the opportunity. FMEA sits in the **🛡 Risk & Reliability** cluster next to fault tree and bowtie — fault tree answers "which combinations cause the top event?", FMEA answers "for each component, what can fail, how bad, how likely, how detectable, and what do we fix first?".

The differentiator is **computation + ranking**: the engine multiplies S×O×D for RPN, runs the AIAG-VDA S/O/D → AP lookup, sorts rows by the chosen key, and flags high-risk rows (the red accent, reused from `ReliabilityTokens`). FMECA adds a criticality column. The render is a clean, themed worksheet table — Schematex's first deliberately tabular output.

---

## The AIAG-VDA seven-step process (what generates the columns)

The 2019 Handbook reorganised FMEA into seven steps; the worksheet columns are literally the outputs of steps 2–6. Knowing the steps is the cleanest way to know which columns belong together and in what order. (Source: Quality-One, fmea-training.com, Quality Digest summaries of the Handbook.)

| # | Step | Phase | What it produces (→ worksheet columns) |
|---|---|---|---|
| 1 | **Planning & Preparation** | System Analysis | Scope, boundaries, FMEA type, team (the "5T" framing: inTent, Timing, Team, Tasks, Tools). → *header block*, not a row column. |
| 2 | **Structure Analysis** | System Analysis | The structure tree: System → Subsystem → Component (the "focus element" and its next-higher / next-lower neighbours). → the **Item / structure** columns. |
| 3 | **Function Analysis** | System Analysis | Functions + requirements of each structure element (function net). → the **Function / requirement** columns. |
| 4 | **Failure Analysis** | Failure Analysis & Risk Mitigation | The **failure chain**: Failure Effect (FE) of the higher element ← Failure Mode (FM) of the focus element ← Failure Cause (FC) of the lower element. → the **Effect / Mode / Cause** columns. |
| 5 | **Risk Analysis** | Failure Analysis & Risk Mitigation | Current **Prevention** & **Detection** controls; rate **S, O, D**; assign **AP** (RPN eliminated here in AIAG-VDA). → the **controls / S / O / D / AP** columns. |
| 6 | **Optimization** | Failure Analysis & Risk Mitigation | Recommended actions, owner, target date, status; re-rate S/O/D and re-derive AP. → the **"after action"** columns. |
| 7 | **Results Documentation** | Documentation | The FMEA report / sign-off. → *footer / metadata*, not a row column. |

The failure chain in step 4 is the conceptual core: a **mode** is bracketed by the **effect** it causes at the level above and the **cause** that produces it at the level below — the same row read three ways depending on which structure element is the "focus".

---

## Element vocabulary

A FMEA is a table; the "vocabulary" is its columns plus the scoring scales. Two column schools: the **classic seven-column** worksheet (item · function · mode · effect+S · cause+O · controls+D · RPN, plus action columns) used by SAE J1739 / IEC 60812 and reproduced in the reference image below, and the **AIAG-VDA structured** worksheet, which expands the left side into the structure tree and function net and swaps RPN for AP.

| Column | Meaning |
|---|---|
| **Item / Function** | the component or process step under analysis, and its intended function |
| **Failure mode** | the manner in which the item fails to perform its function |
| **Effect(s)** | the consequence of the failure mode (local / next-level / end effect) |
| **Severity (S)** | 1–10 rating of the worst effect's seriousness |
| **Cause(s)** | the mechanism or root cause of the failure mode |
| **Occurrence (O)** | 1–10 rating of how often the cause is expected |
| **Current controls** | prevention controls (reduce O) and detection controls (reduce D) |
| **Detection (D)** | 1–10 rating of how well controls catch the failure before it reaches the customer |
| **RPN** | `S × O × D` (1–1000) — legacy ranking key |
| **Action Priority (AP)** | AIAG-VDA High / Medium / Low from the S/O/D lookup tables |
| **Recommended actions / owner / target / status** | the follow-up (step 6) columns |
| **Revised S, O, D & RPN/AP** | the "after action" re-rated scores and the before/after delta |
| **Criticality (FMECA)** | mode criticality `Cₘ = λp·α·β·t`; item criticality `Cᵣ = Σ Cₘ` (MIL-STD-1629A) |

**AIAG-VDA structured-worksheet additions** (the 2019 left-side expansion of "Item / Function"):

| AIAG-VDA column | Step | Meaning |
|---|---|---|
| **Next Higher Level / Focus Element / Next Lower Level (or Characteristic)** | 2 Structure | three-column structure tree — the focus element plus its parent and child |
| **Function of Next Higher / of Focus / of Lower Element** | 3 Function | the function-net row paralleling the structure tree |
| **Failure Effect (FE) / Failure Mode (FM) / Failure Cause (FC)** | 4 Failure | the failure chain, one per structure level |
| **Current Prevention Control (PC)** | 5 Risk | control acting on the *cause* → drives Occurrence |
| **Current Detection Control (DC)** | 5 Risk | control catching mode/cause before escape → drives Detection |
| **Severity (S) / Occurrence (O) / Detection (D)** | 5 Risk | the three 1–10 ratings |
| **Action Priority (AP)** | 5 Risk | High / Medium / Low — *replaces RPN as the primary key* |
| **Filter Code (optional)** | 5 Risk | free user tag for slicing/sorting the sheet |
| **Prevention Action / Detection Action / Owner / Target / Status / Evidence** | 6 Optimization | the optimisation block, then re-rated S/O/D and a fresh AP |

**The S / O / D 1–10 rating scales** (anchors per AIAG-VDA / SAE J1739; the *full* anchor wording is copyrighted in the Handbook — these are the band summaries):

- **Severity (S)** — seriousness of the *worst* effect. `10–9` = safety/regulatory (hazardous, possibly without warning at 10; with warning at 9); `8–7` = loss / degradation of primary function (vehicle inoperable / reduced performance); `6–4` = loss / degradation of secondary function or comfort/convenience; `3–2` = minor / appearance or noise nuisance; `1` = no discernible effect.
- **Occurrence (O)** — likelihood the *cause* occurs (given the prevention control). `10–9` = very high / failure inevitable; `8–6` = high; `5–4` = moderate; `3–2` = low; `1` = extremely low / failure eliminated through prevention control. (AIAG-VDA frames O around the maturity/effectiveness of the prevention control, not a raw rate.)
- **Detection (D)** — ability of the detection control to find the mode/cause *before* release. `10–9` = no / very remote chance of detection (control absent or ineffective); `8–6` = low; `5–4` = moderate; `3–2` = high; `1` = detection nearly certain / failure cannot reach the customer. **Note the inversion:** D=1 is *good* (caught), D=10 is *bad* (escapes) — the opposite intuition from S and O, and a classic source of authoring error.

Variants: **DFMEA** (design), **PFMEA** (process), **FMEA-MSR** (Monitoring & System Response, AIAG-VDA — replaces O/D with **Frequency (F)** and **Monitoring (M)** and uses its own AP table), **FMECA** (FMEA + criticality).

---

## Engine computation (the differentiator)

1. **RPN** per row: `RPN = S × O × D` (range 1–1000).
2. **Action Priority** per row: look up `(S, O, D)` in the AIAG-VDA AP table → High / Medium / Low. **The lookup is *not* a formula — it is a published tri-axis decision table** (all 1000 S·O·D combinations enumerated, severity-dominant) that must be shipped as data. The exact cell wording is copyrighted in the Handbook; the **band structure** (confirmed from Relyence / Quality-One / Quality Engineer Stuff and to be confirmed against the physical Handbook) is:

   - **Severity is the primary axis, Occurrence second, Detection third** ("more emphasis to Severity first, then Occurrence, then Detection"). Within a severity band the table is read O-major, then D refines the cell.
   - **S = 9–10** (safety / regulatory): **AP = High for *every* O and D** — even O=1, D=1. (Canonical example: airbag fails to deploy S10·O2·D3 → High.) This is the rule a pure-RPN sort gets wrong.
   - **S = 7–8**: High when O is mid/high; degrades to Medium then Low as O falls; at O=1 → Low regardless of D.
   - **S = 4–6**: High only at very high O (8–10) with weak detection; mostly Medium/Low; trends Low as O drops.
   - **S = 2–3**: Medium or Low (Medium only at high O with weak D).
   - **S = 1**: **AP = Low for every O and D.**
   - Within any non-extreme cell, **worse detection (higher D) bumps the cell up** one priority relative to good detection.

   The three AP levels carry an action obligation: **High** = action *needed* (must reduce risk or justify), **Medium** = action *should* be taken (evaluate, document the decision), **Low** = *could* improve (acceptable, justification noted). Render obligation, not just colour.

   > ⚠️ Schematex must ship the **verbatim 1000-row table** (or the published banded equivalent), not this prose summary — see TODO. Two tables exist: one for **DFMEA/PFMEA (S·O·D)** and a separate one for **FMEA-MSR (S·F·M)**.

3. **Sort** the worksheet by the chosen key (`rank: rpn | ap`), descending risk. For `ap`, order High > Medium > Low, then break ties by S (desc), then RPN (desc) — never by RPN alone, which would re-introduce the bug AP was designed to fix.
4. **Flag** rows above a threshold (`flag: rpn>100` or `flag: ap>=High`) with the red `ReliabilityTokens` accent.
5. **FMECA (optional):** compute mode criticality `Cₘ = λp · α · β · t` (λp = part failure rate, α = failure-mode ratio, β = conditional probability the effect occurs, t = operating-time/mission duration) and roll up to item criticality `Cᵣ = Σ Cₘ` over a severity class; optionally plot the **criticality matrix** (Severity on one axis, Occurrence/criticality on the other — see reference image).
6. **Revised scores:** after recommended actions, recompute RPN/AP from the revised S/O/D and show the before/after delta. (Severity rarely changes without redesign; optimisation usually moves O then D.)

Validation: S/O/D each integer in `1..10`; every row has item, mode, effect; AP requires all three scores present; threshold expressions well-formed; flag a likely authoring error if Detection is rated as if "1 = bad" (the inversion trap).

---

## DSL sketch (draft — needs Victor)

```
fmea "Brake system DFMEA"
  type: design          # design | process | msr
  rank: ap              # rpn | ap
  flag: ap >= High

  item "Master cylinder" fn "Generate hydraulic pressure"
    mode "Internal seal leak"
      effect "Loss of braking" sev: 9
      cause "Seal material degradation" occ: 3
        controls prevention: "Material spec", detection: "Bench pressure test" det: 4
      cause "Contamination" occ: 2
        controls detection: "Fluid analysis" det: 5
    mode "Bore corrosion"
      effect "Reduced braking" sev: 7
      cause "Moisture ingress" occ: 2
        controls detection: "Visual inspection" det: 6

  action "Internal seal leak" / "Seal material degradation"
    do: "Upgrade seal to EPDM" owner: "J. Lee" target: "2026-Q3"
    revised sev: 9 occ: 1 det: 4
```

*Draft only.* Open choices: how nested (item → mode → cause) maps to flat worksheet rows; whether RPN/AP are author-supplied or always engine-computed (recommend always computed); how to encode the AIAG-VDA AP lookup table (ship as data); whether to render as table only, or table + criticality matrix.

---

## Reference images (visual development targets)

All URLs below were downloaded and viewed by the assistant on 2026-06-03 (bytes verified; `upload.wikimedia.org` briefly rate-limited (HTTP 429) on re-fetch — the files are live, the throttle is transient). Prefer these stable Wikimedia Commons paths.

### 1. Canonical worksheet (the primary table target)
**URL:** `https://upload.wikimedia.org/wikipedia/commons/1/1c/FMEA_voorbeeld.png` (1319×273, Commons `File:FMEA_voorbeeld.png`, Laurens van Lieshout, 2006; Dutch labels but the structure is universal).
**What it shows (viewed):** a one-row worked example of the classic worksheet. A **header band** at top: checkboxes "Proces FMEA / Product FMEA", participants/department, **F.M.E.A.-Nummer**, project number, information sources, **author / date / revision** on the right. Two coloured target cells: **"Streef waarde = 36"** (target value) on a **green** fill and **"Acceptabel <100"** on a **yellow** fill — i.e. the RPN thresholds are shown in the header, colour-coded. A blue title bar **"Failure Mode and Effect Analysis"**, then the column header row spanning two grouped sections labelled **VOOR ACTIE** (before action) and **NA ACTIE** (after action). Columns left→right: `nr.` · **PRODUCT/PROCES** · **FUNCTIE** (function) · **MOGELIJKE FOUT** (possible failure mode) · **OORZAAK** (cause) · **EFFECT** · **ONTDEKKINGSWIJZE** (detection method) · then three narrow score columns **K** (kans op = occurrence) · **O** (ontdekkans = detection) · **G** (gevolg = severity) · **T** (Totaal = K×O×G = RPN) · **OPM/MAATREGEL** (action) · then the after-action repeat **K O G T**. The example row scores 5·5·5 → **T = 125 shown in a solid RED cell** (over threshold), and after action 1·5·5 → **T = 25 in a GREEN cell**. This is the exact pattern our renderer must hit: grouped before/after column bands, a narrow S/O/D/RPN block, and **the RPN cell itself colour-filled red/green by threshold**.

### 2. FMECA criticality matrix (the optional second render)
**URL:** `https://upload.wikimedia.org/wikipedia/commons/d/d0/Matrix_E_B.jpg` (257×243, Commons `File:Matrix_E_B.jpg`, "Beispielmatrix E × B").
**What it shows (viewed):** a **10×10 grid**, axes labelled **E** (vertical, "E/B" origin at bottom-left, 1→10 upward) × **B** (horizontal, 1→10 rightward). Cells are filled in three risk colours — **green** (low, lower-left triangle), **yellow** (medium, the diagonal band), **pink/red** (high, upper-right triangle) — forming the familiar diagonal traffic-light gradient where high-on-both-axes = red. This is the criticality/risk matrix our FMECA render targets: a coloured occurrence×severity (or E×B) grid with a corner-to-corner green→yellow→red gradient. (Sibling files `Matrix_A_B.jpg`, `Matrix_A_E.jpg` are the same grid for other axis pairs.)

### 3. Process-flow mnemonic (context, not a render target)
**URL:** `https://upload.wikimedia.org/wikipedia/commons/3/32/FMEA.png` (413×320, Commons `File:FMEA.png`).
**What it shows (viewed):** a circular 4-step loop around a central "Failure Mode & Effect Analysis" box — Step1 detect a failure mode → Step2 Severity (SEV) → Step3 Probability (OCCUR) → Step4 Detection (DETEC) → **RPN = SEV*OCCUR*DETEC** → Actions+Check. Useful as the plain-English explainer of the S/O/D/RPN pipeline; **not** the worksheet shape we render.

**Visual conventions our renderer must match:**
- **Column order** left→right: identifier → item/function → failure mode → effect → (severity) → cause → (occurrence) → current controls/detection method → (detection) → **RPN/AP**, then the recommended-action block, then the **mirrored "after action" score block**. Group before/after under spanning header labels (the "VOOR ACTIE / NA ACTIE" bands).
- **The S/O/D/RPN block is narrow numeric columns** set apart from the wide prose columns; keep them tight and centred.
- **Severity/risk highlighting is on the RPN (or AP) cell itself** — solid red fill when over threshold, green when acceptable — not on the whole row. Show the threshold(s) in the header (target value / acceptable cap), as the worksheet does.
- **Header band** above the table: title, FMEA number/type (design vs process), team, author/date/revision, and the threshold legend.
- **Row grouping:** when one item has many modes (or one mode many causes), merge/span the repeated left-hand cells so the eye reads item → modes → causes as a tree-in-a-table.
- **Optional criticality matrix:** a separate coloured grid (severity × occurrence/criticality), 10×10 or banded, with a green→yellow→red diagonal gradient and a high-risk corner.
- **AP rendering (AIAG-VDA mode):** show H/M/L as a coloured chip (red/amber/green) in its own column, *replacing* the RPN colour-fill as the primary risk signal.

---

## TODO (Victor — standard research + dev)

**The two blocking decisions (do these first):**

- [ ] **⚠️ Transcribe the exact AIAG-VDA 2019 Action Priority lookup table — verbatim.** This is the one piece the assistant could not finish: the Handbook is paywalled and the 1000-cell (S·O·D) table is copyrighted, so only the *band structure* is captured above (S 9–10 → all High; S 1 → all Low; severity-major, then occurrence, then detection). Pull the actual table from the physical Handbook (Step 5 / "Risk Analysis" section) and the **separate FMEA-MSR (S·F·M) table**, encode as ship-with data, and add a regression test that spot-checks ~10 known cells (e.g. S10·O1·D1=H, S1·O10·D10=L, S7·O6·D7=H). Verify the SAE J1739_202101 revision designation and IEC 60812:2018 Ed.3 clause numbers while you have the sources.
- [ ] **⚠️ Decide the table render approach — this is Schematex's first table-shaped output.** Choose **pure SVG `<text>`/`<rect>` table** (consistent with the "semantic SVG, no inline style, `<title>`/`<desc>`" hard rule, exports as one self-contained asset, lets us colour-fill the RPN/AP cell exactly like the reference image) **vs HTML `<table>`** (native text reflow/wrapping, accessibility, copy-paste, but breaks the single-SVG-artifact model and the svg.ts builder). Recommendation to weigh: pure SVG with a small column-layout/measure pass and explicit cell wrapping, reusing `src/core/svg.ts`. Settle this before any layout code — it dictates the whole module.

**The rest:**

- [ ] Decide RPN-only vs AP-only vs both; default ranking key (recommend: compute both, default `rank: ap`, since AIAG-VDA is the current standard).
- [ ] Full column set per variant (DFMEA / PFMEA / FMEA-MSR / FMECA) and the *verbatim* S/O/D (and F/M) rating-scale anchor wording from the Handbook — §Element vocabulary has band summaries only.
- [ ] Worksheet layout against reference image #1: column widths, the before/after spanning header bands, row grouping (merged item/mode/cause cells), header metadata block + threshold legend, theming via `ReliabilityTokens` + high-risk red cell-fill / AP chip.
- [ ] FMECA criticality math (`Cₘ = λp·α·β·t`, `Cᵣ = ΣCₘ`) and the optional criticality-matrix render against reference image #2 (10×10 green→yellow→red diagonal grid).
- [ ] Validation rules: S/O/D ∈ 1..10, completeness, AP prerequisites, threshold-expression grammar, the Detection-inversion authoring-error check.
- [ ] Edge cases: multiple effects per mode (the *max* severity governs the row), multiple causes per mode (one O/D/AP row per cause), revised-score recompute + before/after delta, empty controls (D defaults to 10 = undetectable).
- [ ] 3–5 canonical test cases asserting computed RPN, AP (against the transcribed table), sort order (AP-then-S, never RPN-only), and flagged rows.
- [ ] DSL finalisation: nested `item → mode → cause` → flat rows mapping; whether to expose the AIAG-VDA structure-tree/function-net columns or keep the classic seven-column form (or both via `type:`/`form:`).
- [ ] impl doc in `../CoCEO/schematex/impl/`.
