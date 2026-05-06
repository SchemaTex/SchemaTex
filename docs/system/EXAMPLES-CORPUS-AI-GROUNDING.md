# Examples Corpus as AI-Grounding Layer — Execution Playbook

*How we turn `website/content/examples/*.mdx` into a dual-purpose asset: SEO catalog **and** the canonical AI prompt grounding corpus that backs `src/ai/examples.ts` + the MCP `getExamples` tool.*

> **Owner:** Victor · **Drafted:** 2026-05-04 · **Status:** Proposal — needs Victor sign-off before mining production data
> **Sibling docs:** [`EXAMPLES-PLAN.md`](./EXAMPLES-PLAN.md) (the 100-example catalog), [`USER-DOCS-TEMPLATE.md`](./USER-DOCS-TEMPLATE.md) (per-diagram doc standard)
> **This doc is not a replacement for `EXAMPLES-PLAN.md`.** That doc enumerates *what* 100 examples to ship. This doc specifies *how* to author them so each MDX simultaneously feeds (a) SEO catalog (b) AI grounding (c) public-facing showcase, with production data as raw material.

---

## 1. Why now

Schematex shipped to ChatDiagram production 2026-04-29. Five days in (2026-05-04), we have:

- **2,471 schematex artifacts** across 19 sub-engines (5-day window)
- **989 chats with follow-ups** (58% iteration rate — strong engagement signal)
- **~370 schematex parser errors / ~80 unique users** — non-trivial DSL-quality gap
- **14+ languages native** (English / Spanish / Portuguese / French / German / Italian / Hebrew / Russian / Korean / Lithuanian / Indonesian / Arabic / Mandarin / Cantonese)
- **Production scenarios that no curated example currently covers**: Allen-Bradley grain-processing ladder (Lithuanian), Liechtenstein family-office entity stack, Chile 220 kV double-bus substation, Korean BCD 7-segment display logic, French `lycée pro` motor control circuit, Mexican feng-shui matrix, etc.

Two things this data tells us EXAMPLES-PLAN didn't yet have:

1. **Real prompts are messy and multilingual.** The catalog assumes English-first authoring. Production proves the AI gets called in 14+ languages every day. Examples authored as bilingual or with multilingual variants would close the gap between EXAMPLES-PLAN §8-Q4 ("any examples in CN-Mandarin?") and reality.
2. **The AI grounding loop is already live, but uncalibrated.** `src/ai/examples.ts::getExamplesForType()` returns the bundled MDX examples to LLMs at runtime. Today it returns *whatever 25 MDX examples we've authored*, ranked by `complexity` ascending. This is fine for a 25-example catalog but breaks at 100+ — without per-domain selection, an LLM asking for a `genogram` for "BRCA family with 4 affected" gets handed `genogram-nuclear-family` (complexity 1) and copies the wrong template.

**The fix is one feature with three deliverables**, all of which already have ~80% of their plumbing:

1. **Production data → examples corpus pipeline** — mine, clean, classify, contribute back as MDX
2. **Examples-by-domain retrieval** — extend `getExamplesForType` to filter by `verticals` / `variant` / language
3. **AI prompt template per example** — add `aiPrompt` to MDX frontmatter so LLMs see canonical user-prompt → DSL pairs (decides EXAMPLES-PLAN §8-Q3)

---

## 2. Pipeline: Production data → Examples corpus

### 2.1 Mining

**Source tables (ChatDiagram Supabase project `rowrrnbcnkzosfkhxgir`):**

- `artifacts` — `(id, chat_id, user_id, title, content, engine, created_at)` — the rendered DSL + metadata
- `chats.data->'messages'` — the user's natural-language prompt + AI's response
- `users` — for filtering out test accounts (exclude `victor@mymap.ai` per global rule)

**Mining query** (one per engine, batched into a single CSV):

```sql
SELECT
  a.id              AS artifact_id,
  a.engine          AS sub_engine,
  a.title,
  a.content         AS dsl,
  LENGTH(a.content) AS dsl_len,
  -- first user message in the chat = natural-language prompt
  (c.data->'messages'->0->>'text') AS user_prompt,
  -- detect language for the prompt (downstream classification)
  -- (no SQL fn — done in post-process)
  a.created_at
FROM artifacts a
JOIN chats c ON c.id = a.chat_id
JOIN users u ON u.id = a.user_id
WHERE a.engine = $1               -- e.g. 'schematex-sld'
  AND a.created_at >= NOW() - INTERVAL '30 days'
  AND u.email != 'victor@mymap.ai'
  AND LENGTH(a.content) BETWEEN 200 AND 4000  -- skip empty or wall-of-text
  AND LENGTH(c.data->'messages'->0->>'text') BETWEEN 30 AND 800;
```

Output: per-engine CSV of candidate `(prompt, dsl)` pairs.

### 2.2 PII scrubbing

**Hard-filter rules** (run before any human reviews):

| Field | Rule |
|---|---|
| Email addresses | Regex `\S+@\S+\.\S+` → `[email]` |
| Phone numbers | Regex `\+?\d[\d\s\-\(\)]{6,}\d` → `[phone]` |
| Personal names in prompt | Replace via NER (e.g. `Sofía Ramírez Pérez` → "the client") |
| Personal names in DSL `[label: ...]` | Keep first-name only, drop surname; for genogram/pedigree use letter codes (`F1`, `M1`, `S1`) per NSGC convention anyway |
| Phys. addresses | Regex city + street pattern → `[address]` |
| Company names that aren't clearly fictional | Replace with generic placeholder (`Acme Corp`, `Northwind Industries`) |
| URLs / hostnames not on a public allow-list | Drop |

**Soft-filter rules** (flag for human review):

- Medical conditions tied to identifiable persons → flag, anonymize generation labels
- Religious / political affiliations → flag
- Minor children + identifiable schools → flag (esp. genogram, ecomap, sociogram from social-work users)
- Anything in genogram/ecomap/pedigree from a clear clinical context → assume PII even after auto-scrub, default to **DROP** unless a maintainer signs off

**Compliance posture:** Schematex is open-source and Schematex.dev is a public site. Even fully-anonymized clinical prompts have non-zero re-identification risk. Default disposition for clinical-domain candidates: **synthesize a parallel example based on the structural pattern, do not publish the scrubbed real one.** "Real BRCA family with 4 affected and 1 carrier across 3 generations" → author a fresh `pedigree-brca-3gen-extended` using textbook patterns, not the real user's family.

For non-clinical domains (SLD, ladder, circuit, entity, matrix, orgchart, fishbone) the scrub-and-publish path is acceptable as long as the soft filters above don't trip.

### 2.3 Quality filter

A candidate qualifies as "publishable example material" if:

- DSL parses cleanly (`schematex validate <file>` returns 0 errors)
- DSL renders to a non-degenerate SVG (≥ 3 entities OR ≥ 1 wired connection — engine-specific)
- Prompt is in scope (matches one of the 17 verticals from EXAMPLES-PLAN §4 matrix)
- Domain expert (Victor's review for now; later subject-matter contributors) confirms it's a *recognizable instance* of the standard, not a one-off

### 2.4 Authoring

Each surviving candidate is rewritten as an MDX file matching the template below (§4). Goal is **80%-of-EXAMPLES-PLAN-100 authored from real production patterns** (with cleanup), not invented from scratch.

---

## 3. Examples-by-domain retrieval

`src/ai/examples.ts` today filters only by `type`. Extend it:

```ts
export interface GetExamplesOptions {
  limit?: number;              // existing
  preferFeatured?: boolean;    // existing
  maxComplexity?: number;      // existing
  // NEW:
  verticals?: string[];        // match any of: ['healthcare', 'utility', ...]
  variant?: string;            // 'iec' | 'ansi' | 'cladogram' | 'gantt' | ...
  language?: 'en' | 'es' | 'zh' | 'pt' | 'fr' | 'ar' | ...;
}
```

This requires three frontmatter fields to be populated:

```yaml
verticals: [utility, industrial]   # controlled vocab — see EXAMPLES-PLAN §4 matrix
variant: ansi                       # diagram-specific style switch
language: en                        # ISO 639-1; default 'en' if omitted
```

`verticals` and `variant` are already proposed in EXAMPLES-PLAN §7 — promoting them from "proposed" to "required" closes the loop.

**Tool surface impact:** the MCP `getExamples` tool gets two new optional args (`verticals`, `language`). Existing callers continue to work (params are optional).

---

## 4. The `aiPrompt` frontmatter field — per-example canonical prompt

EXAMPLES-PLAN §8-Q3: *"Do we want each example to ship a pre-tuned LLM prompt in the MDX so MyMap / ChatDiagram can reuse?"* — **yes, and here's the cheapest concrete shape.**

Add one field to MDX frontmatter:

```yaml
aiPrompt: |
  A power systems engineer needs a single-line diagram for a 13.8 kV
  utility distribution substation: 138 kV grid input through a 15 MVA
  step-down transformer, then three 1200 A breakers fanning out to
  three feeders. Per IEEE 315 conventions.
```

This single field unlocks three things:

1. **AI grounding corpus** — `src/ai/examples.ts` returns `(prompt, dsl)` pairs to the LLM, not just DSL. The LLM learns "users who say X get DSL like Y" without us writing system prompts by hand.
2. **Reusable in MyMap / ChatDiagram** — when a CD user types a similar prompt, the routing layer can pre-populate the canonical example as few-shot context, dramatically improving first-shot DSL quality.
3. **Multilingual seed** — for non-English examples, `aiPrompt` is in the example's native language; AI grounding then naturally scales to that language without separate prompts.

**Authoring rule:** `aiPrompt` is what a *real user would actually type*, not a synthetic instruction. Length 30–800 chars. Concrete domain language (proper nouns, units, standards), not generic ("draw an SLD").

**Implementation:** trivial — `_generated.ts` build script already strips frontmatter; add `aiPrompt` to the type and pass through.

---

## 5. Multilingual anchors — close EXAMPLES-PLAN §8-Q4

Production data confirms 14+ languages active. Don't author 100 multilingual examples — pick **6 strategic anchors**, one per high-value vertical-language pair:

| Anchor | Engine | Language | Vertical | Why this combo |
|---|---|---|---|---|
| `genogram-familia-tres-generaciones` | genogram | es | Family therapy LATAM | LATAM social workers are #2 schematex genogram user cluster (after US clinical) |
| `ladder-controle-motor-trifasico` | ladder | pt | Industrial automation BR | Brazilian PLC programmers 5d N=3 anchor (derbesalum + mar_carbonieri + Elizabeth) |
| `sld-installation-residentielle` | sld | fr | Residential electrical FR/CA | French electrical standards (NF C 15-100) used FR + many francophone Africa |
| `circuit-arduino-led-controle` | circuit | es | Maker education LATAM | Highest-volume Spanish circuit prompt cluster |
| `genogram-案主家庭家系圖` | genogram | zh | Clinical case mgmt TW/HK | 5d N=2 Traditional Chinese genogram users (full-fidelity DSL parsed) |
| `flowchart-بحث-أكاديمي` | flowchart | ar | Academic research MENA | Yemen Ilyas anchor + Iraq + Libya 5d cluster; RTL rendering test case |

Each multilingual example **also exists in English** as a sibling (e.g. `genogram-three-generation-family.mdx`) — so the English catalog stays complete. The non-English variant adds `language: es` to frontmatter and uses the language in `aiPrompt` + `[label: ...]` strings; everything else (verticals, persona, standard) stays English so it filters cleanly.

**Cap:** 6 anchors total in v1. Expand only if `web-analytics-source-channels` shows the multilingual pages converting (>1% CTR from international SERP).

---

## 6. Frontmatter — final consolidated schema

Building on EXAMPLES-PLAN §7 + this doc's additions:

```yaml
# ─── Identity ───────────────────────────────────────
title: 13.8 kV utility substation
description: 13.8 kV distribution SBS w/ 138 kV grid input, 15 MVA xfmr, 3 feeder breakers per IEEE 315.
diagram: sld                       # registry key
slug: sld-substation-13kv          # URL slug; auto-derived from filename if omitted

# ─── Classification (drives filtering) ──────────────
verticals: [utility, industrial]   # NEW (REQUIRED) — controlled vocab from EXAMPLES-PLAN §4
variant: ieee-315                  # NEW (REQUIRED if engine has variants)
language: en                       # NEW (default 'en'); ISO 639-1
standard: IEEE 315
complexity: 3                      # 1–5

# ─── SEO / display ──────────────────────────────────
seoKeyword: 13.8kv substation single line diagram   # NEW (proposed in EXAMPLES-PLAN §7)
industry: [industrial]
persona: For the power systems engineer
tags: [substation, transformer, bus, feeder, HV, MV]
featured: false

# ─── AI grounding (NEW) ─────────────────────────────
aiPrompt: |
  Generate a single-line diagram for a 13.8 kV utility distribution substation:
  138 kV grid input via a 15 MVA step-down transformer, with three 1200 A
  breakers feeding three distribution feeders. IEEE 315 conventions.

# ─── Cross-references ───────────────────────────────
relatedLink:
  label: SLD syntax
  href: /docs/sld

# ─── Status + DSL ───────────────────────────────────
status: published
dsl: |
  sld "13.8 kV Substation"
  ...
```

**Migration:** the 25 existing MDX files don't have `verticals`, `variant`, `language`, `aiPrompt`. Backfill with a single PR — Victor (or an SME) reads each, fills the four fields, takes ~2 minutes per file = 50 minutes total. Done before any new example is authored under the new schema.

---

## 7. Implementation milestones (aligned with EXAMPLES-PLAN phases)

### Pre-Phase (this week, ~1 CC session)
- M0.1 — extend `_generated.ts` build to pass `verticals` / `variant` / `language` / `aiPrompt` through
- M0.2 — extend `getExamplesForType` signature with new filter args (back-compat: omitted args = current behavior)
- M0.3 — backfill 4 new fields on the 25 existing MDX (50 min Victor)
- M0.4 — update `EXAMPLES-PLAN.md` §7 frontmatter section to mark these fields **required** going forward

### Phase 1 (EXAMPLES-PLAN §6 Phase 1: 7 missing-MDX engines, +42 examples)
For each of the 42, source by mining (§2) when production data exists; author from textbook when not:

| Engine | 5d production candidates available? |
|---|---|
| flowchart (8 needed) | 🟢 890 artifacts, easy to find clean PRISMA/CICD/onboarding/incident/auth/etl/algo + BPMN-shaped instances |
| matrix (8 needed) | 🟢 109 artifacts; RACI/Eisenhower/BCG observed |
| orgchart (7 needed) | 🟢 143 artifacts; tech startup + military + hospital observed |
| decisiontree (7 needed) | 🟢 72 artifacts; biology key + probability tree + chest-pain triage observed |
| venn (5 needed) | 🟡 11 artifacts only — supplement with textbook |
| timeline (4 needed) | 🟡 53 artifacts; FIFA/product-launch observed; geologic+biography textbook |
| mindmap (3 needed) | 🟢 535 artifacts (markmap); largest underutilized goldmine |

### Phase 2 (deepen S-tier, +30 examples)
Mine production candidates for entity / SLD / ladder / circuit / genogram / pedigree. SLD has 130 artifacts → low-hanging.

### Phase 3 (round out, +23 examples)
Block / phylo / timing / logic / fishbone / ecomap / sociogram. Smaller volumes, more textbook authoring.

### Multilingual layer (parallel, after M0)
Author the 6 multilingual anchors from §5. Independent of phase 1/2/3 — can ship in any phase.

---

## 8. Open questions (different from EXAMPLES-PLAN's open questions)

1. **Mining vs. textbook ratio for clinical engines.** Pedigree / genogram / ecomap from production = re-id risk even after scrub. Default: **0% from production for these three engines, 100% textbook-synthesized.** Confirm or override.

2. **Brand-name SEO magnets revisited (was EXAMPLES-PLAN §8-Q5).** Production proves `genogram-potter-family` patterns work — should we authorize 2 more (`genogram-game-of-thrones-targaryen`, `phylo-pokemon-evolution`)? Trademark risk vs. high CTR. **Recommend: yes for fictional-universe brands (low TM risk: Potter / GoT / Pokémon are allowed for parody/educational use), no for real-company brand names.**

3. **`aiPrompt` localization granularity.** For an English example with `language: en`, do we also ship a Spanish `aiPrompt` variant in the same MDX (so the Spanish-speaking AI grounding works without a separate MDX)? **Recommend: no for v1.** Shipping 1 prompt per file keeps the schema simple; multilingual users get the dedicated multilingual examples (§5).

4. **Re-mining cadence.** Once Phase 1+2 are authored, do we re-mine every 30 days for new patterns? **Recommend: quarterly review** — cheap, surfaces emergent verticals (e.g. if "PRISMA flowcharts" suddenly spike from academic users, we add 1–2 more PRISMA examples).

---

## 9. Summary

- EXAMPLES-PLAN.md catalogs *what* 100 examples to ship; this doc specifies *how* to author them so they triple-duty as catalog, AI-grounding corpus, and bilingual SEO.
- One frontmatter addition (`aiPrompt`) + three already-proposed fields (`verticals`, `variant`, `language`) closes EXAMPLES-PLAN §8 Q3+Q4 cleanly.
- ~70% of Phase 1+2 examples can be sourced from 5-day production data with PII scrub; clinical engines (genogram/ecomap/pedigree) stay 100% textbook for safety.
- 6 multilingual anchors close the EN-only gap with verified production-language demand.
- One CC session of plumbing (M0.1–M0.4) unblocks the entire pipeline.
