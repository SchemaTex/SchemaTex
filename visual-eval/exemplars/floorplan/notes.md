# Floor plan exemplar — Linden House, ground floor

**Scenario.** The ground floor of a small two-storey house: living room, open kitchen and
dining, a guest bedroom, a hall with the stair to the upper floor, a bathroom and a utility
room. Six rooms and 92.0 m² on a 10.00 × 9.20 m footprint. A house was chosen over a
classroom, venue or shop plan because the house plan carries the full architectural
vocabulary: two wall weights, several door types, windows, a stair, and kitchen and bathroom
fixtures. Every other floor-plan case (classroom, banquet, café, office, shop) uses a subset
of that kit plus its own furniture, so this drawing sets the rules they all copy. A ground
floor was chosen over a flat so the stair appears for a real reason. The look follows
real-estate marketing plans (CubiCasa, Matterport, RoomSketcher), because most people who
ask for a floor plan are homeowners, teachers and event planners, not architects. The
linework rules come from construction-drawing standards.

**Layout.** North is up. The front rooms (living, kitchen/dining) face the garden to the
north, and the service rooms sit along the street side to the south. The front door opens
into the hall. From the hall, double doors lead to the living room, a hinged door to the
guest bedroom and a pocket door to the bathroom. The pocket door is used because the space at
the foot of the stair has no room for a door swing. The stair runs along the hall's east wall and rises
southward, so its first step faces the doors and not the front wall. The living room and
kitchen share a 1.6 m cased opening (a doorway with no door). A sliding door leads from the
dining area to the garden. The utility room has a door from the kitchen and a side door to
the outside. Every room label sits in measured free floor space, not at the room centre: the
bathroom label sits between the toilet and the shower, and the utility label below the side
door's swing.

**Palette** — six named colours on white paper `#FFFFFF`:
- Graphite `#1F2328` — wall poché (the solid fill of cut walls), door leaves, the stair break line and arrow, the title and room names.
- Slate `#55606C` — furniture and fixture outlines, appliance tags and dimension figures.
- Pencil `#A3ABB4` — door swing arcs, dimension and extension lines, stair treads above the cut plane and the dashed header over the cased opening.
- Mist `#EDEFF2` — built-in surfaces only: kitchen and utility counters, vanity, bath and shower tray. Loose furniture stays white, so fixed and movable items read apart.
- Glazing `#4F86B0` — the glass line in windows and the sliding door panels. It is the only hue on the sheet, and it always means glass.
- Caption `#6E7782` — room areas, the subtitle, and the scale figures and caption.

Rooms are not tinted by type. Colour-coded floors are a RoomSketcher option, but they would
not carry over to a classroom or banquet plan, and the Matterport professional plans are
black and white.

**Type scale** (Inter, falling back to Helvetica Neue / Arial). Title 20 px semibold. Subtitle 12 px
caption grey. Room names 12 px semibold uppercase, letter-spacing 0.7 px. Room areas 11 px
caption grey, 16 px below the name, one decimal. Dimension figures 11 px slate, in metres to
two decimals, with the unit stated once in the subtitle. Stair "UP" 9.5 px semibold graphite.
Appliance tags (REF, DW, W, D) 8–8.5 px semibold slate. Scale figures 10 px, "GRAPHIC SCALE"
9 px semibold letter-spaced, "N" 12 px semibold.

**Line hierarchy.** The drawing scale is 64 px per metre. Cut walls are solid fills: exterior
0.30 m (19 px) and interior 0.12 m (8 px). Nothing else comes close in weight, so the
structure reads first. Next in weight: door leaves 1.6 px graphite, and the stair break line
1.4 px. Furniture and fixtures 1.1 px slate, with interior detail (cushion seams, burners,
hanger marks) 0.8 px. Door arcs, dimension lines and extension lines 0.8–0.9 px pencil.
This follows the NKBA rule that a wall is heavier than a door line, and object lines
heavier than extension lines.

**Symbols.**
- Doors are a wall gap, a straight leaf drawn open at 90° from the hinge jamb, and a quarter arc to the strike jamb.
- Double doors are two such leaves meeting at the centre.
- The pocket door is a leaf half drawn out of a slot inside the wall.
- The sliding door is two glazed panels on offset tracks that overlap at the meeting stile.
- Exterior doors get a thin threshold line on the outer wall face.
- The cased opening is a plain gap with dashed lines along both wall faces, marking the header above the cut plane.
- Windows are two wall-face lines, jamb caps and one blue glass line.
- The stair has solid treads up to a diagonal break line with a zigzag, at the cut plane about seven risers up. Treads beyond the break are dashed. A direction arrow starts with a small open circle on the first tread and ends before the break. "UP" is written upright just outside the stair at the arrow's start, whatever the stair's rotation.
- Kitchen: a mist counter run with a double-bowl sink under the window, a dishwasher dashed under the counter, a four-burner hob and a tagged refrigerator.
- Bathroom: a vanity with two oval basins, a toilet with its tank against the wall, a shower tray with drain cross and a bath.
- Dimension strings use 45° slash ticks. Extension lines start 4 px off the wall face. Two tiers (rooms, then overall) run on the top and left; a room tier runs along the bottom.
- The graphic scale is a 5 m bar in alternating black and white metres, with figures above. The north arrow is a split half-filled arrowhead in a circle, with N above.

**Collisions.** All geometry is authored in metres on the same wall centre-line grid as
`source.sx`, projected to pixels once. Text width is estimated at 0.56 em per character
(0.62 em semibold) plus letter-spacing. Each of the 38 text boxes, padded by 2 px, is then
tested against:
- every other text box;
- every wall rectangle;
- every furniture and fixture bounding box;
- door leaves, and door arcs sampled as 16 segments each;
- stair treads, the break line and the arrow;
- the rug outline;
- every dimension and extension line (a figure may sit only on its own dimension line);
- the scale bar and north arrow;
- the canvas edge, with a 4 px inset.

Appliance tags must lie wholly inside their own appliance. The count is 0. Regenerate and
re-check with `node scripts/visual-eval/draw-floorplan-exemplar.mjs`, which exits non-zero on
any collision.

**Departures from `docs/reference/48-FLOORPLAN-STANDARD.md`.**
- *Graphic scale always drawn.* The doc lists the scale bar as deferred. The drawing includes one because a stated ratio stops being true once a plan is resized or printed, while a bar stays correct; the NCS Uniform Drawing System gives the bar form.
- *North arrow beside the scale, under the plan.* The doc puts the compass at the top right of the dimension band, where it competes with the overall dimension and can run off the sheet.
- *A bottom dimension string.* The doc dimensions rooms only along the top and left edges. Here the south rooms' partitions (3.40 / 2.40 / 2.20 / 2.00) do not line up with the north rooms' partition (5.80 / 4.20), so without a bottom string four rooms have no widths.
- *Dimensions to wall centre-lines, two decimals.* US construction plans dimension to the outside face of framing. The DSL declares rooms by their centre-line boundaries, so centre-line figures repeat exactly the numbers the author typed. The subtitle states this so the convention is not mistaken.
- *Window = face lines + one glass line.* The doc's "three parallel glazing lines" become two graphite wall-face lines and one blue glass line, so a window cannot be mistaken for a thin partition.
- *Cased opening shows its header.* The doc draws jamb lines only. The dashed header follows the standard rule that elements above the cut plane are dashed, and it tells an intended opening apart from a gap in the drawing.
- *Uppercase room names.* The DSL keeps the author's casing ("Living Room"); the drawing sets names in uppercase, the marketing-plan and lettering convention, with the area in a lighter line beneath.

## References

- National Kitchen & Bath Association, *Kitchen & Bath Drawing*, 3rd ed., Chapter 3 "Universal Drawing Standards" — line weights (object 0.35 mm, extension 0.25 mm, light 0.13–0.18 mm), wall lines heavier than door lines, dashed overhead and hidden lines, 45° architectural tick marks, extension-line gap from the object, capital lettering, 48 in. plan cut height. https://elearning.nkba.org/wp-content/uploads/2023/10/Chapter-3-Universal-Drawing-Standards.pdf
- United States National CAD Standard V5, Uniform Drawing System Module 6 "Symbols" — graphic scale bars (alternating filled segments, figures above), dimension line with slash terminator, break line, "features above" thin dashed line. https://www.nationalcadstandard.org/ncs5/pdfs/ncs5_uds6.pdf
- "National CAD Standard", Wikipedia — what the NCS contains (AIA CAD Layer Guidelines, CSI Uniform Drawing System, NIBS plotting guidelines). https://en.wikipedia.org/wiki/National_CAD_Standard
- CAD Drafter, "Line Weights and Annotation Standards" (ISO 128) — bold lines for structural walls, medium for doors, stairs and furniture, fine for dimensions and hatching; minimum text height. https://caddrafter.us/line-weights-and-annotation-standards/
- Engineer Fix, "How to Properly Show Stairs on a Floor Plan" — treads solid below the 4 ft cut plane and dashed above, heavy diagonal break line across the flight, arrow from the lowest riser labelled UP or DN. https://engineerfix.com/how-to-properly-show-stairs-on-a-floor-plan/
- The Blueprint Primer, "Door and Window Symbols on Floor Plans" — hinged-door leaf and 90° arc, pocket/sliding and bi-fold forms, window as a wall break with parallel lines where the middle line is the glass. https://blueprintprimer.com/posts/door-and-window-symbols-on-floor-plans
- RoomSketcher, "All Floor Plan Symbols and Abbreviations" — double doors as two arcs, sliding doors as parallel panels, shower symbol, appliances as labelled squares (REF, DW). https://www.roomsketcher.com/blog/floor-plan-symbols/
- RoomSketcher, "How to Read Floor Plans: 9 Easy Steps" — thick exterior against thin interior walls, compass or N arrow, graphic scale bars, interior against exterior measurements. https://www.roomsketcher.com/blog/how-to-read-floor-plans-9-easy-steps/
- RoomSketcher, "21 Stunning 2D Color Floor Plans" — dark walls framing the plan, room-type floor colours such as blue wet rooms (considered and not adopted, see Palette). https://www.roomsketcher.com/blog/2d-color-floor-plans/
- CubiCasa Knowledge Base, "Display rooms areas" — room labels carrying name with dimensions and/or area, and why area is more reliable for irregular rooms. https://help.cubi.casa/en/articles/8254946-display-rooms-areas
- Matterport, "Schematic Floor Plans" brochure — professional black-and-white marketing plans with individual room labels and measurements. https://static.matterport.com/mp_cms/media/filer_public/81/b4/81b4fabf-a44d-4ae5-a6b7-77da3b317e35/intro-to-schematic-floor-plans-with-matterport.pdf
- Ramsey & Sleeper, *Architectural Graphic Standards* — not consulted directly (not openly available). Its wall-poché, door-swing and fixture conventions reach this drawing through the repo standard doc and the sources above.
