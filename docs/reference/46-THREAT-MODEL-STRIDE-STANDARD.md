# 46 — STRIDE Threat Model Standard Reference

> **Status:** RESEARCH — standard + reference images gathered by assistant on 2026-06-03; implementation pending (Victor).

*A **security overlay on the Data Flow Diagram**, not a new base notation. A STRIDE threat model takes the DFD vocabulary already documented in [`31-DFD-STANDARD.md`](./31-DFD-STANDARD.md) — **processes, data stores, external entities, data flows**, plus **trust boundaries** — and asks, for each element, "which classes of threat apply here?" The answer is **STRIDE**: **S**poofing, **T**ampering, **R**epudiation, **I**nformation disclosure, **D**enial of service, **E**levation of privilege. Schematex's engine, rather than computing a number, **maps each DFD element type to its applicable STRIDE categories and flags every data flow that crosses a trust boundary** (the canonical "where attacks happen" signal). This doc is intentionally a **thin layer**: it defers all base notation to `31-DFD-STANDARD.md` and focuses only on the STRIDE element→category mapping and the trust-boundary semantics.*

> **Primary References:**
> - **Shostack, Adam** (2014). *Threat Modeling: Designing for Security.* Wiley. ISBN 978-1118809990. — *The definitive STRIDE reference. Defines STRIDE-per-element (ch. 3), the use of DFDs + trust boundaries as the canonical artifact (ch. 2), and the "find threats by walking the diagram" method.* <!-- TODO(Victor): verify ISBN -->
> - **Microsoft SDL Threat Modeling — STRIDE-per-Element (Larry Osterman / Shawn Hernan, MSDN blog, 2007).** https://learn.microsoft.com/en-us/archive/blogs/larryosterman/threat-modeling-again-stride-per-element — *The canonical statement of the per-element idea: "for each type of element, there is a limited set of STRIDE categories that apply." Verified 2026-06-03.*
> - **Microsoft Threat Modeling Tool — Getting Started.** https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-getting-started — *The current MS TMT (2018, free download). Uses a DFD canvas (square = external entity, circle = process, two parallel lines = data store, curved arrow = data flow) with **red dotted trust boundaries**, and generates threats from the STRIDE-per-element mapping. Verified 2026-06-03.*
> - **OWASP Threat Dragon.** https://owasp.org/www-project-threat-dragon/ (docs: https://www.threatdragon.com/docs/usage/diagrams.html) — *Open-source threat-modeling tool whose canvas is DFD + trust boundaries (box **or** curve) and whose threat generator uses STRIDE-per-element; the contemporary open-source reference workflow. Exports SVG/PNG. Verified 2026-06-03.*
> - **OWASP Threat Modeling Cheat Sheet.** https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html — *Community baseline for the STRIDE method and the element-type → category mapping ("STRIDE groups threats into six prompts"; DFDs visualise trust boundaries, data flows, data stores, processes, external entities). Verified 2026-06-03.*
> - **Howard, M. & Lipner, S.** (2006). *The Security Development Lifecycle.* Microsoft Press. ISBN 978-0735622142. — *The SDL context in which STRIDE/DFD threat modeling is mandated.* <!-- TODO(Victor): verify ISBN -->
>
> *Notes on the standard landscape.* STRIDE is a **mnemonic/method**, not a graphical standard — its diagram *is* the DFD. STRIDE itself was coined by **Loren Kohnfelder & Praerit Garg** at Microsoft (1999); **STRIDE-per-element** was developed by **Shawn Hernan** and popularised by **Adam Shostack**. There is no separate STRIDE notation to define; the only new semantics are (1) the per-element-type threat mapping and (2) the emphasis on trust-boundary crossings as the locus of risk. Schematex already plans a `boundary` construct in the DFD engine (`31` §5.5, §7.8); STRIDE rides directly on top of it.

---

## 0. Positioning

STRIDE threat modeling is the most widely adopted lightweight security-analysis method in software engineering — baked into the Microsoft SDL, OWASP guidance, and most "secure by design" programs. Its artifact is a DFD with trust boundaries; security engineers walk the diagram element-by-element and enumerate the applicable threat categories. Schematex already serves the base DFD persona (`31`) and explicitly calls out the threat-modeling audience there; this doc completes that story by adding the STRIDE *semantic layer* on top.

Because the base notation is fully owned by `31-DFD-STANDARD.md`, this is a **thin overlay**, not a fresh engine. The differentiator is the **STRIDE-per-element mapping plus trust-boundary-crossing detection**: given a DFD, the engine annotates each element with its applicable STRIDE letters and flags the data flows that cross a trust boundary (those flows are where spoofing/tampering/disclosure actually bite). It is best implemented as a **mode/extension of the `dfd` engine** (e.g. `dfd` with a `stride:` directive) rather than a wholly separate diagram — final shape is an open question (see TODO).

**Why per-element (the Microsoft insight).** The MSDN STRIDE-per-element post makes the structural argument that gives this engine its value: *"threats are permanent — the threats that apply to the elements of your component don't change over time,"* and *"for each type of element, there is a limited set of STRIDE categories that apply."* That is exactly a lookup table — deterministic, rule-driven, computable. A reviewer does not brainstorm freely; they walk each element and ask only the 2–6 questions that the element's type admits. Microsoft's own example notes a *tiny* three-element diagram already yields *"at least 18 different threats"* — the enumeration explodes fast, which is precisely why automating the per-element pass (and pruning to boundary-crossings) is worth a renderer.

---

## Element vocabulary

All base shapes are defined in [`31-DFD-STANDARD.md`](./31-DFD-STANDARD.md) §5 — this doc does **not** redefine them. What STRIDE adds:

| Overlay element | Meaning | Notation |
|---|---|---|
| **STRIDE annotation** | the applicable threat letters for an element (e.g. `T, R, I, D` on a data store) | small badge / letter cluster near the element |
| **Trust boundary** | a security-relevant boundary (defined in `31` §5.5) — its crossing is the risk locus | dashed line/curve (MS TMT: **red dotted**) grouping elements (reuse DFD `boundary`) |
| **Boundary-crossing flag** | a data flow whose endpoints sit in different trust zones | the flow highlighted (red/accent) + tagged |
| **Threat note (optional)** | a specific enumerated threat tied to an element + category | annotation / linked note |

### The STRIDE-per-element mapping (the core table)

The classic Shostack / Microsoft mapping of which threats apply to which DFD element type. **Verified 2026-06-03** against the Microsoft STRIDE-per-element blog and the Shostack "STRIDE per Element" chart (image viewed — see Reference images §below):

| DFD element | S | T | R | I | D | E |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **External entity** (interactor / actor) | ✓ | | ✓ | | | |
| **Process** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Data store** | | ✓ | ✓* | ✓ | ✓ | |
| **Data flow** | | ✓ | | ✓ | ✓ | |

> **Legend.** S = Spoofing, T = Tampering, R = Repudiation, I = Information disclosure, D = Denial of service, E = Elevation of privilege.
>
> **\* Repudiation against a data store is conditional** — in the Shostack chart this cell is drawn as a green **"?"**, not a solid dot. It applies *notably to logs / audit stores* (a store that records actions can itself be the locus of "you can't prove I did it" if the log is mutable or absent). For a non-logging store, R is usually inapplicable. Engine should treat data-store R as **opt-in / conditional** (e.g. auto-tag when the store id/name matches `log|audit|journal`, or expose a `kind: log` hint), not always-on.

This is the canonical Microsoft/Shostack matrix and matches the mapping the task brief specified exactly. Mnemonic shorthands seen in the wild: external entity = **SR**; process = **STRIDE** (all six); data store = **TRID** (with R conditional); data flow = **TID**.

---

## Engine computation (the differentiator)

1. **Parse the DFD** (delegate entirely to the `31` parser — same processes/stores/externals/flows/boundaries).
2. **Apply STRIDE-per-element:** for each element, look up its type in the mapping table → attach the applicable STRIDE letters as annotations and `data-stride` attributes. Data-store **R** is gated on the conditional rule above (log/audit store, or explicit hint).
3. **Detect trust-boundary crossings:** for each data flow, determine the trust zone (boundary membership) of its source and target; if they differ, **flag the flow** as a boundary crossing (the prime threat location) and emphasise it with the security accent (red, mirroring MS TMT's red boundary convention). Per the Microsoft TMT model, a flow that stays *within* one zone is lower-risk; a flow that *crosses* a boundary is where Spoofing/Tampering/Information-disclosure threats concentrate.
4. **Enumerate (optional):** generate a checklist of `(element, category)` threat candidates — the "walk the diagram" output Shostack describes — exposed in `<desc>` and/or a side table. (Microsoft notes even a 3-element diagram yields ≥18 candidates; the renderer should make this list scannable, e.g. grouped by element, crossings first.)
5. **Coverage report:** which `(element, category)` pairs have been reviewed/mitigated vs open (if the DSL supports per-threat status — `open | mitigated | accepted`, mirroring MS TMT's *Not Started / Needs Investigation / Mitigated / Not Applicable*).

No probability math (that is Fault Tree's job, see `45`/`fta`); the value is the **systematic, rule-driven threat enumeration** and the boundary-crossing highlight. Validation reuses all DFD well-formedness rules from `31` §6.6, plus boundary-membership consistency (and the open nesting/overlap question in `31` §11 directly affects how a flow's "zone" is resolved — see TODO).

---

## DSL sketch (draft — needs Victor)

Most likely a **STRIDE mode of the existing `dfd` DSL** rather than a new keyword (recommended — reuses 100% of `31`'s parser, layout, and `boundary` system):

```
dfd
  style: yourdon
  stride: on            # enable STRIDE overlay: per-element badges + crossing flags

  external: User
  process 1.1: Web Server
  process 1.2: Auth Service
  datastore D1: User DB
  datastore D2: Audit Log   # name matches log/audit → data-store R auto-enabled

  User -> 1.1 : HTTPS Request
  1.1 -> 1.2 : Credentials
  1.2 -> D1  : Lookup
  D1  -> 1.2 : User Record
  1.2 -> D2  : Auth Event

  boundary "Internet" { User }
  boundary "DMZ" { 1.1, 1.2 }
  boundary "Internal" { D1, D2 }

  # optional: pin specific enumerated threats / mitigations
  threat 1.2 S "Credential stuffing" mitigation: "Rate limit + MFA" status: mitigated
  threat "User -> 1.1" I "Eavesdropping" mitigation: "TLS 1.3" status: mitigated
```

With `stride: on`, the engine auto-derives the per-element badges from the mapping table (External `SR`, Process `STRIDE`, Store `TID`+conditional `R`, Flow `TID`) and auto-flags `User -> 1.1` and any DMZ↔Internal flow as boundary crossings. The optional `threat` rows let an author pin specific enumerated threats + mitigations + status on top of the auto-derived set.

*Draft only.* Open choices: `dfd ... stride: on` extension vs a standalone `stride`/`threatmodel` keyword; whether per-element STRIDE badges are auto-derived (recommended) or author-listed; how the conditional data-store **R** is triggered (name-match heuristic vs explicit `kind: log` hint); how enumerated `threat` rows reference flows (by endpoint pair vs an id); status vocabulary (`open | mitigated | accepted`); OWASP Threat Dragon JSON import (deferred to v0.2).

---

## Reference images (visual development targets)

All four URLs **verified to resolve via WebFetch on 2026-06-03**; the three images marked *(viewed)* were downloaded and opened with the Read tool.

1. **Shostack — "STRIDE per Element" chart** *(viewed — the canonical per-element matrix)*
   <https://shostack.org/blog/img/2024/stride-per-element.png>
   A 7-column grid (Spoof / Tamper / Repudiate / Info Disclose / Deny Service / EoP) × 4 rows (External Entity, Process, Data Store, Dataflow). Filled teal dots mark applicable threats; the **Data Store × Repudiate** cell is a green **"?"** (conditional). The row reproduces exactly the matrix in this doc: External = Spoof+Repudiate; Process = all six; Data Store = Tamper + (Repudiate?) + Info Disclose + Deny Service; Dataflow = Tamper + Info Disclose + Deny Service. Each row label carries a tiny DFD glyph (rectangle = external, rounded-rect/circle = process, parallel lines = store, curved arrow = dataflow). **This is the single best ground-truth for the mapping the engine encodes.**

2. **OWASP Threat Dragon — DFD component key** *(viewed — element shapes)*
   <https://www.threatdragon.com/docs/assets/images/components.png>
   A vertical legend of the four base shapes as Threat Dragon draws them: **Process = circle**, **Store = two parallel horizontal lines** (label between), **Actor (external entity) = rectangle**, **Data Flow = curved line/arrow**. Confirms the Yourdon-family shape vocabulary our `dfd` renderer already targets (`31` §5).

3. **Shostack — "Key" (DFD symbol legend, generic-component mapping)** *(viewed)*
   <https://shostack.org/blog/img/2024/stride-key.png>
   A rounded "Key" card mapping real-world stencils (e.g. AWS Lambda / Salesforce cloud / S3-bucket icons) back onto the three generic DFD categories — **Processes**, **Data Stores**, **External Entities**. Illustrates that vendor icon sets are *skins* over the same four-element model; our renderer stays at the generic-shape level but should tolerate author-supplied labels for these.

4. **Microsoft Threat Modeling Tool — Getting Started (page; embeds a live DFD + red trust boundaries)** *(page verified; prose describes the canonical render)*
   <https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-getting-started>
   The walkthrough's own words: *"Our human user is drawn as an outside entity—a square … sending commands to our Web server—the circle … consulting a database (two parallel lines),"* and *"trust boundaries, indicated by the **red dotted lines**, to show where different entities are in control."* This is the authoritative description of how MS TMT renders the DFD + boundary; the embedded `basictmt.png` / `interaction.png` screenshots sit on the `media/threat-modeling-tool-feature-overview/` path. (Direct screenshot hotlinks were not separately confirmed, so only the page URL is listed here.)

**Visual conventions our renderer must match:**
- **DFD element shapes** (from `31` §5, confirmed by images 2 & 4): process = **circle** (Yourdon) / rounded rect (Gane–Sarson / TMT), data store = **two parallel horizontal lines** with the label between, external entity = **square/rectangle**, data flow = **labelled arrow** (straight or gently curved).
- **Trust-boundary styling**: **dashed** line — Microsoft TMT uses **red dotted**; Threat Dragon offers a **box or a curve**. Schematex `31` §5.5 already specs a dashed rounded-rect in `theme.accent`; for `stride: on` consider switching the accent to red to match the dominant MS convention (open decision).
- **Per-element STRIDE annotation**: a compact letter cluster / badge sited near each element (External `SR`, Process `STRIDE`, Store `TID`(+`R?`), Flow `TID`), legible at small scale — letters, not dots, since dots need a column grid we won't have on the canvas.
- **Boundary-crossing highlight**: any data flow whose endpoints fall in different zones is **re-emphasised in red/accent** (the "where attacks happen" cue). This is the one piece of *computed* visual state STRIDE adds beyond `31`.

---

## TODO (Victor — open decisions)

- [x] **Verify the STRIDE-per-element ✓ matrix** against the Microsoft STRIDE-per-element source and the Shostack chart — **done 2026-06-03** (image viewed; matrix confirmed: External `SR`, Process all-six, Store `TID`+conditional-`R`, Flow `TID`). Remaining: cross-check against **Shostack 2014 ch. 3** in print for the exact wording on the data-store-R condition and any edge cases (e.g. whether "process" ever drops a letter for pure-compute nodes). ⚠️ NEEDS VICTOR INPUT (book in hand)
- [ ] **Decide the architecture (biggest open question):** STRIDE as a `stride:` mode of the `dfd` engine (**recommended** — reuses all of `31`: parser, four shapes, `boundary`, layout, validation) vs a separate `threatmodel`/`stride` keyword. A mode keeps one source of truth for the DFD; a separate engine risks drifting the base notation. Recommend `dfd ... stride: on`.
- [ ] **Conditional data-store Repudiation.** How to trigger the green-"?" R: name/id heuristic (`log|audit|journal`) vs explicit `kind: log` (or `stride: +R`) hint vs always-on. Heuristic is LLM-friendly; explicit is precise. Recommend heuristic + override.
- [ ] **Trust-boundary color for STRIDE mode.** `31` §5.5 draws boundaries in `theme.accent`. MS TMT convention is **red dotted**. Switch accent → red under `stride: on`, or keep theme accent and reserve red only for flagged crossings? (Reserving red for crossings keeps the "danger" signal sharp; tinting the whole boundary red matches MS muscle memory.) ⚠️ NEEDS VICTOR INPUT
- [ ] **Trust-boundary semantics / zone resolution.** Reconcile with `31` §5.5/§7.8 and the open overlap/nesting question in `31` §11 — a flow's "crosses a boundary?" answer depends entirely on how zone membership is defined when boundaries nest or (if allowed) overlap. Resolve `31` §11.1 first.
- [ ] **STRIDE badge rendering.** Glyph/letter-cluster placement, size, theme tokens; legibility at layout scale; whether to show the full applicable set or only *unmitigated* categories.
- [ ] **Threat-enumeration output.** The `(element, category)` checklist + `<desc>` / side-table format; per-threat status/mitigation model (`open | mitigated | accepted`, aligned to MS TMT's four statuses); ordering (crossings first).
- [ ] **Validation.** Reuse `31` §6.6 rules + boundary-membership consistency; every flagged crossing must be reachable and reference declared elements; `threat` rows must reference a real element/flow + a valid category for that element type (reject e.g. `threat <external> T` since External has no Tampering).
- [ ] **Edge cases.** Elements in no boundary (default "untrusted"/"trusted" zone?); nested boundaries; multi-zone flows; a process straddling a boundary; duplicated externals (`31` §7.5) and which instance's zone counts.
- [ ] **Cross-reference hygiene.** This doc must never duplicate `31` notation — link out for all base shapes/grammar/layout.
- [ ] **OWASP Threat Dragon JSON import/export** (round-trip with TD's `.json` model) — likely deferred to v0.2.
- [ ] **3–5 canonical test cases** asserting (a) the auto-derived STRIDE annotations per element type and (b) the exact set of detected boundary-crossing flows. Reuse the `31` §8.4 web-app threat-model DFD as the base fixture.
- [ ] **impl doc** in `../CoCEO/schematex/impl/`.
