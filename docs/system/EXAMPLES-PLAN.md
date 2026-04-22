# Examples Gallery Plan — 100+ Showcases Across 20 Diagrams

*Strategic plan for the public examples catalog. Target: ~100 curated examples covering every implemented diagram × every realistic professional vertical, ranked by commercial value (professionalism × willingness-to-pay × demand), not raw keyword volume.*

> **Owner:** Victor · **Drafted:** 2026-04-21 · **Status:** Proposal — needs Victor sign-off before execution.
> **Goal:** maximize SEO long-tail capture + help visitors self-identify ("this library is for my job") + feed AI-generation prompt library.
> **Placement:** `website/content/examples/*.mdx` (one MDX per example, indexable URL).

---

## 1. Scoring Framework

Each diagram scored 1–5 on three axes:

| Axis | Meaning | Why it matters |
|------|---------|---------------|
| **P — Professionalism** | How much domain expertise is required to draw this correctly? | High-P diagrams = sticky users, hard to replicate with Mermaid, justify the library's positioning |
| **W — Willingness to pay** | CPC, SaaS price tolerance, enterprise budget signals | Drives L3 commercial licensing + premium integration ARR |
| **D — Demand** | Ahrefs US monthly volume × diagram-intent share | Drives L1 SEO traffic + GitHub stars |

**Composite = 0.40·P + 0.40·W + 0.20·D.** Heavier weight on P and W because raw volume (flowchart, timeline) is hyper-competitive and low-margin; professional domain diagrams are Schematex's moat.

---

## 2. Tier Ranking of the 20 Diagrams

Scores are directional, not precise.

| Diagram | P | W | D | Score | Tier | Example quota |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Entity structure | 5 | 5 | 2 | 4.2 | **S** | 8 |
| SLD (single-line) | 5 | 5 | 3 | 4.6 | **S** | 8 |
| Ladder logic | 5 | 5 | 3 | 4.6 | **S** | 7 |
| Circuit schematic | 5 | 4 | 4 | 4.4 | **S** | 9 |
| Pedigree | 5 | 4 | 3 | 4.2 | **S** | 6 |
| Genogram | 4 | 4 | 3 | 3.8 | **A** | 7 |
| Decision tree | 4 | 4 | 4 | 4.0 | **A** | 7 |
| Matrix / quadrant | 3 | 5 | 5 | 4.2 | **A** | 8 |
| Org chart | 3 | 5 | 5 | 4.2 | **A** | 7 |
| Block diagram | 4 | 4 | 3 | 3.8 | **A** | 5 |
| Fishbone | 4 | 4 | 4 | 4.0 | **A** | 6 |
| Phylo tree | 5 | 3 | 3 | 3.8 | **A** | 5 |
| Timing | 4 | 3 | 3 | 3.4 | B | 5 |
| Logic gate | 4 | 3 | 3 | 3.4 | B | 5 |
| Venn / Euler | 2 | 3 | 5 | 3.0 | B | 5 |
| Flowchart | 2 | 3 | 5 | 3.0 | B | 8 (volume offsets low P) |
| Ecomap | 4 | 3 | 2 | 3.2 | B | 4 |
| Sociogram | 4 | 3 | 2 | 3.2 | B | 3 |
| Timeline | 2 | 3 | 4 | 2.8 | C | 4 |
| Mindmap | 2 | 2 | 4 | 2.4 | C | 3 |

**Total example budget: 120** — intentionally over-provisioned; drop to ~100 after first implementation pass if quality bar requires cuts.

**Key takeaway for landing-page hero choice:** the hero row should *not* be the highest-volume diagrams (flowchart / venn / mindmap). It should be the highest-*composite* diagrams — **SLD, Ladder, Entity, Pedigree, Circuit** — because those make visitors think "this is a serious library, not another Mermaid wrapper." Volume diagrams get featured in a secondary row below.

---

## 3. Current Examples Audit

**Website `website/content/examples/` (25 MDX, published):**

| Status | File | Action | Reason |
|--------|------|--------|--------|
| ✅ Keep | block-pid-loop | KEEP | Canonical control-systems hero |
| ✅ Keep | circuit-ce-amplifier | KEEP | Good analog showcase |
| ⚠️ Merge | ecomap-refugee-resettlement + ecomap-substance-recovery + ecomap-teen-client | KEEP all three (3 distinct personas) | — |
| ✅ Keep | entity-holding-company + entity-international-tax + entity-series-a-cap-table | KEEP | Good vertical split (SMB / cross-border / VC) |
| ✅ Keep | fishbone-website-traffic | KEEP | Growth-PM resonance |
| ✅ Keep | genogram-brca-cancer + genogram-medical-history + genogram-nuclear-family + genogram-potter-family | KEEP | 4 is the right density; potter-family is great SEO magnet |
| ✅ Keep | ladder-mode-selection + ladder-motor-start-stop | KEEP |
| ✅ Keep | logic-full-adder | KEEP |
| ✅ Keep | pedigree-brca1 + pedigree-cystic-fibrosis + pedigree-hemophilia | KEEP — canonical genetics trio |
| ✅ Keep | phylo-bacterial-diversity | KEEP |
| ✅ Keep | sld-generator-ats + sld-substation-13kv | KEEP |
| ✅ Keep | sociogram-playground-dynamics + sociogram-team-influence | KEEP |
| ✅ Keep | timing-spi-transaction | KEEP |

**Verdict: keep all 25.** None are redundant or off-brand. They're disproportionately concentrated in S-tier diagrams (correct).

**Gap: zero MDX examples currently for these 7 diagrams:** flowchart, venn, orgchart, decisiontree, matrix, timeline, mindmap. That's where the bulk of new work goes.

**`examples/` SVG-only folder (no MDX):** flowchart 01–09 + venn n2/n3/n4/euler set. These are engineering test fixtures — keep them in `examples/` as golden-output test assets, but separately create MDX pages for the catalog. They should not be deleted.

---

## 4. Vertical Industries Coverage Map

Target: every row has ≥3 examples; every column has ≥3 examples.

| Vertical ↓ / Diagram → | Gen | Eco | Ped | Phy | Soc | Tim | Log | Cir | Blk | Lad | SLD | Ent | Fis | Flo | Ven | Org | Dec | Mat | TL | MM |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Healthcare / Clinical | ● | ● | ● |   |   |   |   |   |   |   |   |   | ● | ● |   |   | ● | ● | ● |   |
| Biotech / Bioinformatics |   |   | ● | ● |   |   |   |   |   |   |   |   |   | ● | ● |   | ● |   | ● |   |
| Social Work / Therapy | ● | ● |   |   | ● |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| Education (K-12 + Univ) | ● | ● | ● | ● | ● |   | ● | ● |   |   |   |   | ● |   | ● |   | ● | ● | ● | ● |
| Law / Legal ops |   |   |   |   |   |   |   |   |   |   |   | ● |   | ● |   |   | ● |   | ● |   |
| Finance / VC / PE / M&A |   |   |   |   |   |   |   |   |   |   |   | ● |   | ● |   | ● | ● | ● | ● |   |
| Industrial Automation / Mfg |   |   |   |   |   |   |   | ● | ● | ● | ● |   | ● | ● |   |   | ● | ● |   |   |
| Utilities / Power / Energy |   |   |   |   |   |   |   | ● | ● |   | ● |   |   | ● |   |   |   | ● |   |   |
| Hardware / EE / Embedded |   |   |   |   |   | ● | ● | ● | ● |   |   |   |   | ● |   |   |   |   |   |   |
| Software / SaaS / DevOps |   |   |   |   |   |   |   |   |   |   |   |   | ● | ● | ● |   |   |   | ● | ● |
| Data / ML / AI |   |   |   | ● |   |   |   |   |   |   |   |   |   | ● | ● |   | ● | ● | ● |   |
| Product / Design / UX |   |   |   |   |   |   |   |   |   |   |   |   | ● | ● |   |   |   | ● | ● | ● |
| Growth / Marketing |   |   |   |   |   |   |   |   |   |   |   |   | ● | ● | ● |   |   | ● |   |   |
| HR / People Ops |   |   |   |   | ● |   |   |   |   |   |   |   |   |   |   | ● |   | ● |   |   |
| Consulting / Strategy |   |   |   |   |   |   |   |   |   |   |   | ● | ● |   |   |   | ● | ● | ● | ● |
| Law Enforcement / OSINT |   |   |   |   | ● |   |   |   |   |   |   |   |   |   |   |   |   |   | ● |   |
| History / Humanities |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | ● |   |

---

## 5. The 100+ Example Catalog

**Naming convention:** `<diagram>-<slug>.mdx`. Slug = kebab-case problem/persona, not brand names.

### 5.1 Entity Structure (8)

| # | slug | title | variant | vertical | persona | standard |
|---|---|---|---|---|---|---|
| 1 | entity-holding-company ✅ | SMB holding → op-co + IP-co | 3-tier | Law | SMB owner | Delaware statute |
| 2 | entity-international-tax ✅ | US parent → Cayman → UK sub | Cross-border + jurisdiction badges | Tax | International tax lawyer | OECD TP Guidelines |
| 3 | entity-series-a-cap-table ✅ | Founder + ESOP + VC preferred | Cap-table %/class | VC | Startup founder, CFO | Carta convention |
| 4 | entity-family-office-trust | Grantor + irrevocable trust + LLC holding | Trust ellipse + family | Wealth | Estate attorney | ACTEC |
| 5 | entity-qsbs-rollup | Multi-entity QSBS-eligible restructure | Pre/post transaction | Tax | Startup CFO | §1202 IRS |
| 6 | entity-real-estate-syndication | GP/LP + SPV per property + lender | LP shape | Real estate | Syndicator | — |
| 7 | entity-spac-merger | De-SPAC target + sponsor + PIPE | M&A flow | IB / VC | IB analyst | SEC S-4 |
| 8 | entity-private-fund | Fund LP → GP → portcos | Foundation / LP mix | Asset mgmt | Fund admin | ILPA |

### 5.2 SLD — Single-Line Diagram (8)

| # | slug | title | variant | vertical | persona | standard |
|---|---|---|---|---|---|---|
| 1 | sld-generator-ats ✅ | Utility + genset + ATS panel | Backup power | Facility | Facilities engineer | IEEE 315 + NFPA 110 |
| 2 | sld-substation-13kv ✅ | 138 kV → 13.8 kV substation | Bus + 3 feeders | Utility | Power engineer | IEEE 315 |
| 3 | sld-hospital-critical | Hospital with essential/life-safety/equipment branches | NFPA 99 3-branch | Healthcare | Hospital EE | NFPA 99/110 |
| 4 | sld-data-center-2n | 2N redundant UPS + STS | Redundancy | Data center | Critical-facility engineer | Uptime Tier IV |
| 5 | sld-solar-pv-commercial | PV array → combiner → inverter → MSB + net-meter | Renewables | Solar | PV designer | NEC 690 |
| 6 | sld-ev-fast-charger | Utility → switchgear → 350 kW DCFC site | EV infra | Utility | EV infra engineer | NEC 625 |
| 7 | sld-industrial-480v-mcc | Plant 480 V MCC with starter buckets | Industrial MV | Mfg | Plant electrician | NEMA ICS-18 |
| 8 | sld-wind-farm-collector | Wind turbines → 34.5 kV collector → POI | Generation | Wind | Wind EE | IEEE 1547 |

### 5.3 Ladder Logic (7)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | ladder-motor-start-stop ✅ | Start/stop seal-in + E-stop | Seal-in | Mfg | PLC programmer |
| 2 | ladder-mode-selection ✅ | Manual/auto selector | Mode switch | Mfg | Controls engineer |
| 3 | ladder-conveyor-interlock | Multi-conveyor interlock + permissive | Interlocks | Warehousing | Controls engineer |
| 4 | ladder-tank-level-control | Pump on/off w/ float + timer | Timer/counter FB | Water treatment | Water-plant engineer |
| 5 | ladder-traffic-light | 4-way signal with walk button | State via timers | Muni | Traffic engineer |
| 6 | ladder-elevator-cab | Call/destination with door interlock | Safety interlock | Building | Elevator tech |
| 7 | ladder-bottling-line | Fill → cap → label with reject reject-kick | Sequential | F&B | F&B automation |

### 5.4 Circuit Schematic (9)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | circuit-ce-amplifier ✅ | Common-emitter BJT | Small-signal analog | EE edu | EE student |
| 2 | circuit-rc-lowpass | RC low-pass filter | Passive | Edu | Hobbyist |
| 3 | circuit-opamp-inverting | Inverting op-amp w/ Rf/Ri | Op-amp | Edu | EE student |
| 4 | circuit-opamp-instrumentation | 3-op-amp instrumentation amp | Composite | Biomed | Biomed EE |
| 5 | circuit-full-wave-rectifier | Bridge rectifier + smoothing cap | Power supply | Edu | EE student |
| 6 | circuit-555-astable | 555 timer astable LED blinker | IC | Hobbyist | Maker |
| 7 | circuit-buck-converter | Buck SMPS w/ ctrl IC | Power electronics | Power | Power EE |
| 8 | circuit-audio-preamp | Mic preamp w/ phantom power | Audio | Pro-audio | Audio EE |
| 9 | circuit-motor-driver | H-bridge DC motor driver | Power | Robotics | Embedded eng |

### 5.5 Genogram (7)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | genogram-nuclear-family ✅ | Two-parent + 3 kids | Intro baseline | Edu | SW student |
| 2 | genogram-medical-history ✅ | 3-gen medical conditions | Conditions overlay | Clinical | Therapist / MD |
| 3 | genogram-brca-cancer ✅ | BRCA1 pedigree in family-therapy context | Condition + genotype | Oncology counseling | Genetic counselor |
| 4 | genogram-potter-family ✅ | Harry Potter family | SEO magnet + teaching | Edu | SW instructor |
| 5 | genogram-divorce-blended | Divorce + remarriage + step-siblings | Complex partnership | Family therapy | Family therapist |
| 6 | genogram-substance-use-3gen | Alcohol / SUD patterns across 3 gen | Emotional cutoffs + SUD | Addiction | SUD counselor |
| 7 | genogram-lgbtq-inclusive | Bennett-2022 AMAB/AFAB/trans family | Gender-inclusive symbols | Clinical | LGBTQ-affirming therapist |

### 5.6 Pedigree (6)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | pedigree-cystic-fibrosis ✅ | Autosomal recessive CF | AR pattern | Genetics | Genetic counselor |
| 2 | pedigree-brca1 ✅ | BRCA1 dominant | AD cancer | Oncology | Genetic counselor |
| 3 | pedigree-hemophilia ✅ | X-linked recessive | X-linked | Genetics | Genetic counselor |
| 4 | pedigree-huntington | Huntington AD 3-gen | Late-onset AD | Neurology | Neuro counselor |
| 5 | pedigree-consanguinity | First-cousin marriage + AR disease | Consanguinity bar | Clinical genetics | Clin geneticist |
| 6 | pedigree-assisted-reproduction | IVF + gamete donor + surrogate (Bennett 2022) | ART symbols | Reproductive | REI physician |

### 5.7 Flowchart (8)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | flowchart-microservices-request | Request → gateway → 3 services → DB | LR + subgraph | SaaS | Backend dev |
| 2 | flowchart-ci-cd-pipeline | PR → lint → test → build → deploy | LR pipeline | DevOps | DevOps eng |
| 3 | flowchart-incident-response | Page → triage → escalation decision tree | TD BPMN | SRE | SRE / On-call |
| 4 | flowchart-user-onboarding | Signup → verify → tutorial → first-action | User flow | Product | PM |
| 5 | flowchart-etl-pipeline | Source → extract → transform → warehouse | Data pipeline | Data eng | Data engineer |
| 6 | flowchart-approval-bpmn | PO approval w/ gateway + subprocess | BPMN shapes | Ops | BA / BizOps |
| 7 | flowchart-auth-flow | OAuth 2.0 authorization code w/ PKCE | Protocol flow | Security | Auth engineer |
| 8 | flowchart-algo-binary-search | Binary search pseudo-code | Teaching flow | Edu | CS teacher |

### 5.8 Matrix / Quadrant (8)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | matrix-eisenhower | Urgent × Important tasks | 2×2 preset | Productivity | Self-help reader |
| 2 | matrix-impact-effort | Feature prioritization | 2×2 free | Product | PM |
| 3 | matrix-rice-bubble | RICE w/ reach as bubble size | 2×2 + bubble | Product | PM |
| 4 | matrix-bcg-growth-share | Portfolio matrix w/ revenue bubble | BCG preset + bubble | Strategy | Management consultant |
| 5 | matrix-9-box-talent | Performance × Potential | 3×3 HR | HR | HR business partner |
| 6 | matrix-johari-window | Known/unknown × self/others | 2×2 preset | Coaching | Executive coach |
| 7 | matrix-risk-5x5 | ISO 31000 likelihood × impact heat | 5×5 heat | Risk | Risk manager |
| 8 | matrix-ansoff-growth | Product × market 2×2 | Preset | Strategy | Strategy consultant |

### 5.9 Org Chart (7)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | orgchart-seed-startup | 8-person seed team | Initials avatars | Startup | Founder |
| 2 | orgchart-series-b-60p | 60-person org w/ dotted-line PM report | Matrix + dotted | Startup | People Ops |
| 3 | orgchart-engineering-dept | Eng dept: platform / product / infra squads | Role icons | Tech | Eng director |
| 4 | orgchart-hospital-dept | Hospital clinical hierarchy | Multi-role | Healthcare | Hospital admin |
| 5 | orgchart-law-firm-partnership | Partners / counsel / associates | Partnership model | Legal | Managing partner |
| 6 | orgchart-board-committees | Board + audit/comp/nom subcommittees | Governance | Corp gov | Corp secretary |
| 7 | orgchart-military-squadron | Command hierarchy w/ rank | Military | Defense | Defense training |

### 5.10 Decision Tree (7)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | decisiontree-buy-vs-lease-ev | Howard-Raiffa EV rollback, car purchase | `analysis` | Consumer finance | MBA student |
| 2 | decisiontree-go-nogo-product | Product launch w/ chance nodes | `analysis` | Strategy | PM |
| 3 | decisiontree-litigation-settle | Settle vs trial EV | `analysis` | Legal | Litigation atty |
| 4 | decisiontree-iris-sklearn | Iris CART from sklearn | `ml` | ML | Data scientist |
| 5 | decisiontree-xgboost-churn | Churn prediction tree snippet | `ml` | ML | ML engineer |
| 6 | decisiontree-triage-chest-pain | ED chest-pain triage | `taxonomy` yes/no | Clinical | ED physician |
| 7 | decisiontree-is-it-mammal | Biology classifier | `taxonomy` | Edu | Bio teacher |

### 5.11 Fishbone (6)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | fishbone-website-traffic ✅ | Traffic drop root cause | Growth-PM | Growth | PM |
| 2 | fishbone-manufacturing-defect | Weld defect 6M | Classic 6M | Mfg | QA engineer |
| 3 | fishbone-never-event-surgical | Wrong-site surgery RCA | Healthcare RCA | Healthcare | Patient safety |
| 4 | fishbone-sla-breach-incident | SLA breach retrospective | SaaS RCA | SaaS | SRE |
| 5 | fishbone-nps-decline | NPS drop drivers | Growth | Growth | CX lead |
| 6 | fishbone-food-safety-recall | Food safety HACCP deviation | F&B | F&B | QA manager |

### 5.12 Block Diagram (5)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | block-pid-loop ✅ | DC motor PID | Closed-loop | Controls | Controls eng |
| 2 | block-cascade-control | Cascade temp control | Nested feedback | Process | Process eng |
| 3 | block-feedforward-disturbance | FF + FB hybrid | Feedforward | Process | Process eng |
| 4 | block-state-space-observer | Plant + Kalman observer | Modern control | Aero | GNC engineer |
| 5 | block-adaptive-cruise | Automotive ACC | Embedded control | Auto | Auto engineer |

### 5.13 Phylo Tree (5)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | phylo-bacterial-diversity ✅ | Bacterial 16S tree | Circular | Microbiology | Microbiologist |
| 2 | phylo-vertebrate-evolution | Rectangular phylogram | Rectangular + bootstrap | Edu | Biology teacher |
| 3 | phylo-sars-cov-2-variants | COVID variant tree | Rectangular | Epidemiology | Epidemiologist |
| 4 | phylo-gene-family-unrooted | Unrooted gene family | Unrooted | Genomics | Bioinformatician |
| 5 | phylo-primate-cladogram | Primate cladogram | Cladogram mode | Edu | Anthropology teacher |

### 5.14 Timing (5)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | timing-spi-transaction ✅ | SPI CS/CLK/MOSI/MISO | SPI | EE | FPGA engineer |
| 2 | timing-i2c-read | I2C master read w/ ACK | I2C | Embedded | Embedded eng |
| 3 | timing-uart-frame | UART 8N1 frame | UART | Embedded | Firmware eng |
| 4 | timing-ddr-read | DDR read burst | High-speed | HW | Memory eng |
| 5 | timing-usb-packet | USB low-speed packet | Protocol | HW | USB eng |

### 5.15 Logic Gate (5)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | logic-full-adder ✅ | 1-bit full adder | ANSI | Edu | EE student |
| 2 | logic-full-adder-iec | Same in IEC rectangular | IEC | Edu | Euro curriculum |
| 3 | logic-4bit-comparator | 4-bit comparator | Combinational | Edu | EE student |
| 4 | logic-sr-latch | SR latch w/ NAND | Sequential | Edu | EE student |
| 5 | logic-parity-generator | Even-parity generator | XOR tree | Edu | EE student |

### 5.16 Venn (5)

| # | slug | title | variant | vertical | persona |
|---|---|---|---|---|---|
| 1 | venn-prisma-screening | PRISMA 3-db dedup counts | 3-circle w/ counts | Research | Systematic reviewer |
| 2 | venn-audience-overlap-marketing | Meta × Google × TikTok audience | Area-proportional | Marketing | Performance marketer |
| 3 | venn-feature-comparison-tools | Notion × Obsidian × Roam features | Rich region labels | Product | PM |
| 4 | venn-euler-taxonomy | Mammals ⊂ Vertebrates ⊂ Animals | Euler containment | Edu | Bio teacher |
| 5 | venn-4-ellipse-gene-sets | 4-way gene-set overlap | 4-ellipse Edwards | Bioinformatics | Bioinformatician |

### 5.17 Ecomap (4)

| # | slug | title | variant |
|---|---|---|---|
| 1 | ecomap-refugee-resettlement ✅ | Refugee family + resettlement systems | Stress edges |
| 2 | ecomap-substance-recovery ✅ | Recovery support network | Mixed valence |
| 3 | ecomap-teen-client ✅ | Teen + school/peers/family | Classic |
| 4 | ecomap-elderly-caregiver | Aging-in-place caregiver support | Healthcare |

### 5.18 Sociogram (3)

| # | slug | title | variant |
|---|---|---|---|
| 1 | sociogram-playground-dynamics ✅ | Grade-5 classroom choice/reject | Force-directed |
| 2 | sociogram-team-influence ✅ | Workplace informal influence | Circular |
| 3 | sociogram-criminal-network | OSINT criminal-network analysis | Force-directed |

### 5.19 Timeline (4)

| # | slug | title | variant |
|---|---|---|---|
| 1 | timeline-history-of-ai | 1950→2025 AI milestones | Lollipop |
| 2 | timeline-product-roadmap-q-planning | 4-quarter product roadmap | Gantt-style swimlane |
| 3 | timeline-geologic-eras | Geologic time, log scale | Log + era bands (ICS) |
| 4 | timeline-biography-einstein | Einstein lifeline | Proportional biography |

### 5.20 Mindmap (3)

| # | slug | title | variant |
|---|---|---|---|
| 1 | mindmap-okr-planning | Quarterly OKR breakdown | Balanced map |
| 2 | mindmap-research-paper-outline | Lit-review topic tree | logic-right (markmap) |
| 3 | mindmap-product-taxonomy | E-commerce category tree | org-down |

---

## 6. Implementation Roadmap

**Phase 1 — Fill the gaps (Week 1–2).** The 7 diagrams with zero MDX pages. Ship in this order for maximum marginal SEO gain:
1. Flowchart (8) — largest keyword volume
2. Matrix (8) — Eisenhower alone is 60K US/mo, low KD
3. Org chart (7) — $3 CPC, commercial-intent traffic
4. Decision tree (7) — bridges MBA + ML audiences
5. Venn (5) — 121K US/mo keyword
6. Timeline (4)
7. Mindmap (3)

**Subtotal phase 1: +42 examples → 67 total.**

**Phase 2 — Deepen the S-tier (Week 3–4).** Add remaining examples to Entity (+5), SLD (+6), Ladder (+5), Circuit (+8), Genogram (+3), Pedigree (+3). These are the diagrams where Schematex has the strongest moat; richer examples here justify the commercial license conversation.

**Subtotal phase 2: +30 examples → 97 total.**

**Phase 3 — Round out (Week 5).** Block +4, Phylo +4, Timing +4, Logic +4, Fishbone +5, Ecomap +1, Sociogram +1. Brings total to ~120.

**Cut rule:** if, after phase 1, a diagram's examples collectively get <50 visits/month in the first 60 days post-launch, pause further additions there and reallocate to the top performers.

---

## 7. MDX Frontmatter Schema (confirm before implementation)

Existing schema (from `sld-substation-13kv.mdx`) covers: `title, description, diagram, standard, industry, persona, complexity (1-5), tags, featured, relatedLink, status, dsl`. Keep it. **Additions proposed:**

- `verticals: [...]` — controlled vocabulary matching §4 matrix rows; powers filterable gallery
- `variant: string` — the variant/style switch name (e.g., `circular`, `lollipop`, `ansi`, `iec`, `analysis-mode`) so docs can cross-link from a standard page's "variant gallery" section
- `seoKeyword: string` — the primary search phrase this page targets (single keyword, for H1 and meta title canonicalization)

---

## 8. Open Questions for Victor

1. **Scope confirmation** — commit to ~100 now, or start at 60 (phase 1+2 slim) and extend based on analytics?
2. **Hero choice** — should the landing hero row be S-tier diagrams (my recommendation: SLD / Pedigree / Entity) or volume diagrams (Flowchart / Venn / Timeline)? S-tier signals professionalism; volume converts on raw traffic.
3. **AI-generation layer** — do we want each example to ship a pre-tuned LLM prompt in the MDX so MyMap / ChatDiagram can reuse? (Cheap to add while authoring.)
4. **Content language** — website is English. Do you want any examples rendered in simplified-Chinese labels to hit the CN-Mandarin professional market (genogram, ladder, SLD have real CN demand)?
5. **Persona brand-name SEO** — examples like `genogram-potter-family` are clearly the highest-CTR hook. Can we add 2–3 more brand-name SEO magnets? Candidates: `genogram-game-of-thrones-targaryen`, `entity-meta-corporate-structure`, `phylo-pokemon-evolution`. Risk: trademark; reward: high.

---

## 9. Summary

- Not volume-first — weight **professionalism and willingness-to-pay** more heavily, because the commercial moat lives in S-tier diagrams (Entity, SLD, Ladder, Circuit, Pedigree).
- Keep all 25 current MDX examples. No deletions.
- Add ~80 new examples, prioritized to fill 7 missing diagrams first (largest SEO gap), then deepen S-tier verticals.
- Total target: ~100–120 examples across 17 vertical industries.
- Each example = its own URL, own target keyword, own persona hook.
