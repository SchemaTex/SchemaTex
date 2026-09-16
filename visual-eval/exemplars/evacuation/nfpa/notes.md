# Evacuation exemplar (NFPA) — Harborview Supply, Store 214

**Scenario.** The ground level of a retail store: an open sales floor across the south, a service corridor across the middle, and back-of-house rooms along the north. The reader is standing at the customer service desk in the middle of the sales floor. The sheet shows three ways out — the main entrance, the receiving door and a level side exit — and the assembly point in the east parking lot.

**What makes it an NFPA sheet rather than an ISO one.** Six things, and they are the reason this variant exists:

1. The exit pictogram puts the running figure beside a plain rectangular door leaf, not the ISO three-sided doorway.
2. The location marker is a white eight-point star on safe-condition green, not the ISO blue bull's-eye.
3. A third route style is drawn: the **accessible egress route**, a solid band carrying a wheelchair symbol, running to the level side exit that a wheelchair user can actually use.
4. The **area of refuge** in the protected stair is marked, for people who cannot use the stair from the mezzanine above.
5. The elevator carries a **do not use in fire** prohibition, and the store office door at the dead end of the corridor carries **NOT AN EXIT** — US practice sets that one as black text on white, not as a pictogram.
6. NFPA treats "fewer than two independent routes" as an error, not a warning, so the sheet shows three routes discharging at three different exits.

The sheet is also drawn in US terms throughout: feet, tabloid paper, 1:96 (the ⅛″ = 1′-0″ scale), a manual pull station rather than a call point, and 911.

**Colour is meaning, so almost nothing is coloured.** The building is neutral grey — `#8D959D` exterior poché, `#B4BBC2` partitions and door swings, `#F2F4F5` rooms with circulation left white. Only three colours carry information: safe-condition green `#00843D` for exits, refuge, first aid, assembly and the location marker, route green `#00A651` for the escape bands, and red `#C8102E` for fire equipment and the prohibitions. Text is `#1B2430`, with `#5A646E` and `#8A939C` for secondary and caption levels.

**Type.** Title 18 px semibold, room names 12 px, legend and instructions 11 px, stair and lift names and the scale caption 10 px, sign captions and footnotes 9 px, Inter/Helvetica throughout.

**Symbols.** Each pictogram is a 24 × 24 solid semantic-colour plate with white knockout artwork, taken from the shipped symbol library so the exemplar cannot drift from what the engine draws. Exit-direction signs put the supplementary arrow beside the runner on the side of travel, on one landscape plate — an arrow alone is not a complete safety message. Plates are 4.8 ft of building at 1:96, i.e. 15 mm printed on tabloid.

**Routes.** Three bands radiate from the marker, each 1.75 ft wide, so no two run side by side and none has to be traced through a shared lane: primary south-east and out of the main entrance, alternative north-west through the service corridor and out of receiving, accessible due east to the side exit. The alternative is dashed; all three carry white chevrons pointing away from the reader, one every 9 ft.

**Layout was solved, not eyeballed.** A script projects the real foot geometry to the sheet, derives every wall from the room lattice, and then tests every text box against every wall, route band, sign plate, door leaf, stair, panel edge and other text box, plus the sheet edge: 62 labels, 63 pieces of geometry, 0 collisions. Where a room centre was occupied — the sales floor holds the marker and two bands, the break room holds two signs — the label moved to measured free space.

**Deliberate departures.** Three things here have no DSL construct today and were drawn anyway because a posted plan needs them: the discharge doorways in the outside wall, the "IF YOU DISCOVER A FIRE" action panel, and the title-block fields. The area of refuge is drawn without its own caption because the plate is unambiguous and the legend names it; adding text would crowd a 10 ft wide stair.
