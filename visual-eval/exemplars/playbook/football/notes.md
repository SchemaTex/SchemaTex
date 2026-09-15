# Playbook exemplar — Football: Smash vs Cover 2

**Scenario.** A spread 2×2 offense runs the Smash concept against a 4-3 Cover 2 defense on 2nd & 7 from its own 35. On each side the outside receiver (X, Z) runs a 5-yard hitch and the slot (H, Y) runs a corner route. The Cover 2 cornerback plays the flat, so he cannot cover both routes: if he sinks under the corner route the quarterback throws the hitch; if he squats on the hitch the corner route is open in the hole between him and the deep-half safety. The running back releases to the flat and the line blocks the four-man rush, with the center and right guard double-teaming the tackle over the center.

Smash was chosen because every football coach recognises it as the standard Cover 2 beater, and because it is not one of the corpus cases (those are Four Verticals and Mesh). It exercises the whole football kit in one readable picture: pass routes with sharp breaks, a curved route from the backfield, block T-bars including a double team, a full 11-man defense with position letters, and coverage zones.

**Surface and markings.** The field is drawn sideline to sideline, 53⅓ yd wide at 16.875 px per yard, from 8.5 yd behind the line of scrimmage to 20.5 yd beyond it. Offense attacks up the page. Markings follow the NCAA field:
- Yard lines every 5 yd; the line of scrimmage (the 35) is the same line drawn heavier.
- Hash marks 60 ft from each sideline (6⅔ yd either side of the middle), 2 ft long, every yard.
- Short 2 ft ticks along both sidelines, every yard.
- Yard numbers 6 ft tall with their tops 9 yd from the sideline, turned so the tops face the middle of the field, at half opacity so they never compete with players.
- Mowing stripes 5 yd wide, between the yard lines.
- A darker 24 px band beyond each sideline. The top and bottom edges are crop edges, not boundaries, so they have no line and no band.

**Player tokens.** Offense: a white disc, radius 11 px, navy 2.2 px outline, with the position letter inside (X, H, Y, Z; QB and RB in the two-letter size; linemen T G C G T). The center is a square, which also marks the ball, so no separate ball glyph is drawn. Defense: a red X, 13 px across, 2.6 px stroke on a thin white halo so it holds up on grass, with its position letter centred below it (above it when a line is in the way): E T T E on the line, W M S at linebacker, C at corner, F and $ at safety.

**Line grammar.**
- Route: solid navy line, 2.4 px, ending in a filled arrowhead 11 px long. Breaks are sharp corners (the hitch comeback, the corner route's 45° break); a route from the backfield (the flat) is a smooth curve.
- Block: solid line ending in a perpendicular T-bar, stopping about 12 px short of the defender. A double team aims the two T-bars at the defender's two shoulders so the bars sit side by side instead of overlapping.
- Coverage zone: a dashed navy ellipse with a faint white fill, labelled in small capitals.
- Not used in this play but part of the football kit: a thrown pass and pre-snap motion are dashed lines with the same arrowhead. On the pass line, football agrees with basketball (dashed = the ball) and is the opposite of soccer (solid = the ball).

**Palette.** Paper `#FFFFFF`; ink `#15233B` (title, offense tokens and routes); caption `#5B6675` (subtitle, legend); rule `#DDE2E8` (legend divider); defense red `#B42318`; turf `#62A574` with stripe `#5A9C6B` and out-of-bounds band `#4B8A5C`; white markings.

**Type scale** (Inter, falling back to Helvetica Neue / Arial). Title 20 px semibold; subtitle 12.5 px caption grey; one-letter token labels 11.5 px bold; two-letter token labels 10 px bold; defender letters 10.5 px bold red with a white halo; zone labels 10 px semibold, letter-spacing 0.8; legend 12 px; yard numbers 46.9 px bold (6 ft at scale).

**Collisions.** Each of the 37 text boxes, 22 tokens and 10 action lines (with their arrowheads and T-bars) is tested against every other one and against the canvas edge. Counts: text × text 0, text × token 0, text × line 0, token × token 0, line × token 0, touching terminators 0, canvas edge 0, line crossings 0. Regenerate and re-check with `node scripts/visual-eval/draw-playbook-exemplar.mjs`, which exits non-zero on any collision or if the drawing's actions differ from `source.sx`.

**What is shared across the three sports.** Page frame (1012 px wide, 900 px surface, 24 px out-of-bounds band on real boundary sides only), left-aligned title and subtitle, legend strip under a hairline listing only the symbols used, the offense disc and defender X with their label rules, line weight, arrowhead, T-bar, dash and wave rhythm, the rule that every sport attacks up the page, and the palette apart from the surface colours.

**Departures from `docs/reference/49-SPORTS-PLAYBOOK-STANDARD.md`.**
- *The whole field width is shown, with sidelines and numbers.* The doc crops the field to the play; the sidelines and numbers are the landmarks receivers align on and the corner route runs toward.
- *Defensive line 2.4 yd and linebackers about 6 yd off the ball.* The doc's presets put them at 1 yd and 4–5 yd; at that depth the T-bars have no visible stem. This is a legibility exaggeration, not a coaching alignment.
- *No ball ellipse.* The square center already marks the ball, the AFCA convention.
- *Receivers just inside the numbers (±16.5 yd), slots midway to the tackle (±9.8 yd).* The doc's spread preset uses ±14 and ±6.
- *Corner routes break at 11 yd and finish near the numbers outside the safeties*, and hitches come back one yard toward the quarterback. Drawn this way no route passes through a defender.
- *Zones are navy dashed outlines labelled DEEP HALF*, not yellow; yellow on green is low contrast and yellow means the goal-line accent elsewhere in the doc.
- *Down, distance and hash type move into the subtitle* instead of a separate line above the field.

## References

- GoRout, "How to Draw Football Plays: The Coach's Complete Guide" — open circles for offense, solid line with arrow for routes and runs, dashed line with arrow for pre-snap motion, solid line with perpendicular end for a block, double lines for a double team, shaded zone areas for coverage. https://gorout.com/how-to-draw-football-plays/
- Football Archaeology, "Terminology... X's and O's" — origin of X-and-O notation in early coaching books. https://www.footballarchaeology.com/p/a-word-on-football-xs-and-os
- CoverSports, "College Football Field Dimensions: NCAA Specs" — hash marks 60 ft from the sidelines, number height and placement. https://coversports.com/resources/field-guides/college-football-field-dimensions-guide
- First Team, "Football Field Lines Explained: Complete Markings Guide" — NCAA and high-school hash, number and yard-line markings. https://www.firstteaminc.com/articles/football/football-field-lines-and-markings
- Wikipedia, "Hash mark (sports)" — NFL, NCAA and high-school hash-mark spacing. https://en.wikipedia.org/wiki/Hash_mark_(sports)
- Throw Deep Publishing, "The Smash Concept: A Complete Guide to a Universal Pass Play" — hitch plus corner on one side, high-low on the cornerback. https://throwdeeppublishing.com/blogs/football-glossary/smash-concept
- Glazier Clinics, "Basic Passing Concepts: Smash Concept". https://www.glazierclinics.com/football-coach-resources/basic-passing-concepts-smash-concept
- The QB Stable, "Smash Concept: The Cover 2 Killer Every QB Should Know" — why Smash beats two-deep shells, the cornerback read. https://theqbstable.com/blog/smash-concept-the-cover-2-killer
- FirstDown PlayBook — play-drawing software coaches buy; dotted lines for route adjustments against a solid primary route. https://firstdown.playbooktech.com/
- American Football Coaches Association, *Football Coaching Bible* — cited by the repo standard for X-and-O and route-tree conventions; not consulted directly (not openly available).
