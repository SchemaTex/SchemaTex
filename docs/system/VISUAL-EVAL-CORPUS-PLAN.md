# Visual evaluation corpus plan

## Organising principle and ranking

**Give standard-bound professional families deep, demanding coverage; give each
commodity family one shallow regression case.** Rank by the asker's obligation,
the consequence of a misread drawing, the adequacy of free substitutes, and a
published convention against which correctness can be checked. Request volume
selects representative subjects within a family; it does not buy corpus priority.

The 90-day sample of 55,527 successful diagrams establishes subjects, not buyers
or willingness to pay. Circuit, floorplan, and genogram proposals use its detailed
titles; other subjects are proposed stress cases.

Priority, with families at the same level ordered as listed:

1. **Pedigree, genogram.** Clinical geneticists, therapists, and social workers
   must interpret inheritance, family history, and relationships correctly.
   Generic tools do not establish notation fidelity. Pedigree's 186 requests
   do not diminish that obligation; genogram titles explicitly include clinical work.
2. **SLD, P&ID, ladder, circuit.** Engineers need unambiguous power paths,
   instrument identities, interlocks, and terminals for review, construction,
   and commissioning. A wrong connection can cause rejection or costly rework.
   Free specialist tools exist; differentiation requires notation fidelity.
   Educational circuit demand should not displace professional cases.
3. **Site plan, floorplan.** Architects and planners deliver drawings for permits
   and paying clients. Wrong boundaries, dimensions, or access can invalidate
   the deliverable. Free layout tools do not establish fidelity to that brief.
4. **Ecomap; network, block diagram; logic, BPMN, PERT; UML class, use case,
   matrix, breadboard.** Ecomap serves social work; network/block diagrams can
   support paid engineering. Retain the targeted network/block cases below.
   For the others, substitutes exist and professional versus student demand and
   unmet notation needs remain unestablished here. Defer additions pending concrete
   professional examples; retain the existing logic case.
5. **Flowchart, mind map, organization chart, timeline, ERD, sequence, state —
   tied commodity tier.** General chat tools, Mermaid, and free diagramming tiers
   are good-enough substitutes under this product strategy, even for many
   professional users. Give each exactly one basic regression case. Flowchart's
   11,952 requests do not justify a second.

**Raw SVG fallback is unranked:** its 4,463 outputs are a rendering route.
Inspect subjects and their required conventions before allocating cases.

The current 15 cases cover circuit (4), floorplan (4), genogram (2), pedigree (2),
SLD (1), P&ID (1), and logic (1). Every other family is absent. **Ladder and site
plan are the highest-value complete blind spots**; existing professional families
also need depth. Commodity gaps need only regression coverage.

## What a case must establish

Follow [VISUAL-EVAL.md](VISUAL-EVAL.md): one fixed source, a title and reading goal,
and named, visually answerable yes/no rules with severities. Wrong visible
relationships, terminals, or required objects are blockers; illegible labels
are major. Each professional case needs a reviewed reference and the exact
edition and relevant rule of its chosen convention recorded during authoring.

Use [NSGC pedigree nomenclature](https://www.nsgc.org/Research-and-Publications/Practice-Guidelines-Practice-Resources)
and [McGoldrick's genogram reference](https://wwnorton.co.uk/books/9780393714043-genograms-eaf76fe3-d512-4df1-ad96-ac38133a5174)
for the clinical families. Candidate engineering anchors are
[IEC 60617](https://webstore.iec.ch/en/publication/2723) for electrical symbols,
[IEC 61131-3](https://webstore.iec.ch/en/publication/68533) for PLC ladder notation,
and [ISA-5.1](https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa5-1)
for instrumentation. [NCS drawing conventions](https://www.nationalcadstandard.org/ncs5/content.php)
provide architectural anchors. Record case-specific legends separately. These references do not establish
current conformance; visual fidelity cannot certify operation, clinical
interpretation, or permit compliance.

## First batch: eight cases

1. **Pedigree — X-linked inheritance with carrier annotations.** A three-generation
   family shows documented affected and carrier relatives and an identified
   proband. **Failure:** status marks obscure symbols, attach to the wrong person,
   or descent lines imply the wrong parentage. Carrier/proband pressure duplicates
   the existing recessive pedigree; the X-linked pattern adds a distinct reading
   challenge beyond the two autosomal cases. A clinical reviewer establishes
   the target.

2. **Genogram — Three-generation medical history.** A family shows multiple
   condition markings, dates, a legend, and an index person. **Failure:** condition
   markings become indistinguishable or obscure identity and relationships.
   Basic status/index markings overlap pedigree; multiple conditions and dense
   clinical annotations add the pressure supported by medical-history titles.

3. **SLD — Utility and generator transfer with separate buses.** Two sources feed
   a transfer device and separately labeled normal and essential-load paths.
   **Failure:** crossing lines imply paralleled sources, switching terminals
   disconnect visually, or ratings attach to the wrong feeder. Continuity and
   rating placement duplicate commercial solar; source selection and multiple
   buses add a consequential topology challenge.

4. **P&ID — Vessel level-control loop with shutdown path.** A vessel, transmitter,
   controller, valve, and separate shutdown signal form a tagged process drawing.
   **Failure:** signal types or instrument-location markings become indistinct,
   or tags identify the wrong loop. Water treatment already tests process/signal
   distinction and tag clearance; instrument-location notation and interacting
   control/shutdown paths add depth.

5. **Ladder — Reversing motor interlock with seal-in branches.** Forward and
   reverse rungs contain stop/overload contacts, auxiliary holding branches, and
   opposing interlocks. **Failure:** normally closed marks disappear, parallel
   branches look serial, or a contact appears associated with the wrong coil.
   The circuit load bank overlaps contact/coil clarity; no existing case tests
   ladder rails, rungs, or branch logic. This also reflects motor/interlock demand.

6. **Circuit — NPN common-emitter amplifier.** A transistor amplifier includes a
   bias divider, collector/emitter resistors, coupling capacitors, and an emitter
   bypass. **Failure:** wires land on the wrong transistor terminals or ambiguous
   junctions merge bias and bypass paths. Clearance overlaps existing circuits;
   discrete transistor topology is new. Its roughly 1,175 requests make it a
   representative terminal-fidelity test, not a reason to outrank clinical work.

7. **Site plan — Small building with setbacks and access.** A dimensioned parcel
   contains a footprint, setback lines, driveway, pedestrian access, and north
   arrow. **Failure:** property and setback lines are confused, dimensions attach
   to the wrong boundary, or access disappears beneath annotations. Floorplan
   dimensions partly overlap; parcel boundaries and site orientation are new.
   Assess the stated dimensions, not an assumed jurisdiction's requirements.

8. **Floorplan — Classroom with desks numbered 1–27.** A classroom has 27 numbered
   desks, a teaching area, and Arabic area labels. **Failure:** numbers repeat or
   identify adjacent desks, or mixed-direction text reorders and hides access
   labels. Rows, counts, aisles, and door clearance duplicate the existing
   28-desk classroom; seat identity and Arabic rendering justify the addition.
   Classroom dominance and repeated Arabic titles ground the subject.

These eight deepen each priority professional family, close the ladder/site-plan
gaps, and introduce RTL evaluation. Clinical, engineering, and spatial obligations
justify all eight slots; volume does not. Review their references before expanding.

## Subsequent professional depth

Complete these before broadening commodity coverage beyond its single cases.

- **Genogram — Five-generation family with long names.** Unequal sibling groups
  span five rows. **Failure:** compressed rows blur parentage or names collide.
  Existing genograms stop at three generations; four-generation pedigrees partly
  duplicate depth, not name density. Five-generation titles lead the supplied
  counts (170, versus 144 for three and 61 for four).
- **Genogram — Family bonds and care network.** Ancestry, emotional ties, and
  school/support contacts carry Traditional Chinese labels. **Failure:** support
  contacts look like relatives, care links like ancestry, or labels clip.
  Emotional-line pressure duplicates the existing overlay; external contacts and
  script sizing are new, grounded in social-work and school-contact titles.
- **Circuit — ESP8266 two-channel relay wiring.** An MCU drives two labeled relay
  channels. **Failure:** pin fan-out visually swaps channels or obscures terminal
  names. IC clearance overlaps the 555 and relays overlap the load bank; repeated
  channels add distinct pressure supported by MCU requests.
- **Circuit — Dual adjustable LM317/LM337 supply.** Positive and negative regulator
  branches share a reference and have separate adjustment networks. **Failure:**
  mirrored branches swap polarity labels or merge adjustment nodes. Supply
  routing overlaps the bridge PSU and dual rails overlap the op-amp; paired
  adjustable regulators add the title-grounded challenge.
- **Floorplan — 7-by-9-foot bedroom.** A dimensioned small room contains a bed,
  storage, and door. **Failure:** furniture scale contradicts dimensions or
  obscures the door swing. This deliberately repeats apartment containment and
  dimension pressure under a tighter footprint and imperial units.
- **SLD — Three-phase board with outgoing protection.** Multiple rated protective
  devices feed labeled circuits from one board. **Failure:** ratings or feeder
  labels migrate between branches. Branch/rating checks overlap commercial solar;
  dense adjacent protection devices add pressure.
- **P&ID — Duty/standby pumps with bypass.** Parallel pumps, isolation valves, and
  a bypass join shared headers. **Failure:** crossings create false connections
  or valve symbols obscure which path they isolate. Equipment clearance overlaps
  water treatment; parallel process paths add pressure.
- **Ladder — Timed start with fault reset.** A timer, timed contact, and latched
  fault/reset occupy separate rungs. **Failure:** identifiers or timing labels
  associate a contact with the wrong function. Rail/branch checks overlap the
  proposed interlock; cross-rung identity and timer notation add depth.
- **Site plan — Existing and proposed extension.** An extension and revised access
  sit beside retained structures and a property boundary. **Failure:** line types
  fail to distinguish existing, proposed, and removed work. Boundary/dimension
  checks overlap the first site case; construction-status distinction is new.

Deepen review of the two existing pedigrees' descent, consanguinity, status,
numbering, and proband notation; initially add only the one pedigree above.
Defer more timers, ordinary rectifiers, banquet seating, and restaurants:
existing cases already apply their main pressures.

## Limited coverage elsewhere

Retain two targeted engineering proposals after the professional expansion:

- **Network — Segmented office with redundant uplinks.** A firewall joins switches
  and client/server zones. **Failure:** parallel links collapse or zone boundaries
  hide port labels. Crossing ambiguity overlaps the full-adder; parallel links
  and grouped zones are new.
- **Block diagram — Feedback controller with disturbance input.** A controller and
  plant connect through a signed summing point and sensor feedback. **Failure:**
  feedback reaches the wrong input or signs detach. Feedback routing overlaps the
  op-amp; summing-point signs and block signal labels are new.

Then add exactly one small case per commodity family:

- **Flowchart — Approval with revision loop.** A decision rejects work back for
  revision and rejoins completion. **Failure:** exit labels or return arrows imply
  the wrong path. Existing circuits exercise routing, not decision conventions.
- **Mind map — Study topic with uneven branches.** One topic has short and deeper
  branches with long labels. **Failure:** labels collide or imply the wrong parent.
  Text clearance overlaps existing cases; radial branching is new.
- **Organization chart — Uneven teams with dotted reporting.** A director has
  unequal departments, an assistant, and a secondary report. **Failure:** placement
  implies the wrong manager or erases the primary/secondary distinction.
  Hierarchy spacing overlaps genograms; reporting notation is new.
- **ERD — Orders with line items and optional shipment.** A small order model
  includes a junction entity and optional relationship. **Failure:** cardinality
  marks attach to the wrong ends or collide with attributes. No existing case
  tests cardinality notation.
- **Timeline — Overlapping project milestones.** A short dated timeline includes
  simultaneous milestones. **Failure:** displaced labels imply the wrong dates.
  Label clearance overlaps existing cases; temporal alignment is new.
- **Sequence — Request with alternate response.** Three participants exchange a
  request and alternate replies. **Failure:** arrows identify the wrong sender or
  receiver, or escape their alternate region. Endpoint clarity overlaps circuits;
  lifelines and interaction regions are new.
- **State — Retry and completion.** A small state machine includes initial/final
  markers and a labeled self-loop. **Failure:** the loop attaches to the wrong
  state or hides its condition. Loop routing overlaps the proposed flowchart;
  state markers are new.

## Language coverage

Fold languages into meaningful professional cases, with explicit rubric rules:
Arabic joining and reading order beside classroom numbers/dimensions; complete,
unclipped Traditional Chinese labels in the care network. A reader of each
language must review its reference. Add a Hebrew classroom variant during later
professional expansion because repeated Hebrew titles are evidence too; Arabic
alone does not establish Hebrew coverage.

Use Spanish in the MCU case and Portuguese or Vietnamese in the dual supply
for label length and diacritics. Later Japanese, Korean, and Chinese circuit
variants should target distinct glyph/wrapping failures. Add language-only cases
only to isolate a specific defect. Descriptions stay English; rendered labels
are multilingual.
