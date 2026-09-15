# Evacuation exemplar (UAE) — Al Reem Medical Centre, ground floor

**Scenario.** The ground floor of a clinic: reception, a waiting hall, triage, pharmacy and laboratory along the north, consulting and treatment rooms, the lift, toilets and a staff room along the south, a corridor between them and a protected stair at each end. The reader is standing in the waiting hall. The sheet shows the way out to the east stair and, as an alternative, to the west stair, then on to the assembly point.

**What makes it a UAE sheet rather than an ISO one.** Three things:

1. **Every safety label is written twice, in English and in Arabic**, as Civil Defence requires — on the plan, in the legend, in the action panel and in the title block. Arabic is set as its own right-to-left run, right-aligned in the legend and the panel so the two languages read as two columns rather than one run-on line.
2. **The location marker is a yellow warning triangle** with a dark target, not the ISO blue bull's-eye — the one place the UAE profile departs from ISO artwork.
3. **The lift carries a prohibition sign**, added because the plan contains a lift at all.

Everything else follows ISO: the same E001/E002 exit pictograms, the same F-series fire equipment, metric, A3, 1:100.

**Colour is meaning, so almost nothing is coloured.** The building is neutral grey — `#8D959D` exterior poché, `#B4BBC2` partitions and door swings, `#F2F4F5` rooms with circulation left white. Four colours carry information: safe-condition green `#00843D` (exits, first aid, assembly), route green `#00A651` (escape bands), fire red `#C8102E` (extinguishers, hose reel, call point, prohibition) and warning yellow `#FFCC00` (the location marker alone). Text is `#1B2430`, with `#5A646E` and `#8A939C` for secondary and caption levels.

**Type.** Title 18 px semibold, room names 12 px with the Arabic name 10 px beneath, legend and instructions 11 px with Arabic at 9.5–10.5 px, stair and lift names and the scale caption 10 px, sign captions and footnotes 9 px, Inter/Helvetica throughout.

**Symbols.** Each pictogram is a 24 × 24 solid semantic-colour plate with white knockout artwork, taken from the shipped symbol library so the exemplar cannot drift from what the engine draws. Exit-direction signs put the supplementary arrow beside the runner on the side of travel, on one landscape plate. Plates are 1.1 m of building at 1:100, i.e. 11 mm printed on A3, above the 7 mm floor the profile sets.

**Routes.** Primary is a solid 0.40 m green band, alternative the same band dashed; both carry white chevrons pointing away from the reader, one every 2 m. They leave the waiting hall as two lanes 0.8 m apart rather than overprinted, share the corridor in two offset lanes, and each bends to line up with the door it passes through. The bands run over the stair treads, which is what actually happens.

**Layout was solved, not eyeballed.** A script projects the real metre geometry to the sheet, derives every wall from the room lattice, and then tests every text box against every wall, route band, sign plate, door leaf, stair, panel edge and other text box, plus the sheet edge: 94 labels, 84 pieces of geometry, 0 collisions.

**Deliberate departures.** The discharge doorways in the outside wall, the action panel and the title-block fields have no DSL construct today and were drawn anyway because a posted plan needs them. The corridor and the two stairs are named in English only: a sign plate and a fire-door mark already fill each stair wing, and a second line there would collide — the bilingual requirement is on the safety labels, and every one of those carries both languages. The prohibition at the lift is drawn without a caption for the same reason; the legend names it in both languages.
