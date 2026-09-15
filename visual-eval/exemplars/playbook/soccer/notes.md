# Playbook exemplar — Soccer: third-man run through a low block

**Scenario.** A team in possession faces a 4-4-2 low block: a back four on the edge of the penalty area, a midfield four in front of it and two forwards ahead. 6 carries the ball at the gap between the two forwards and passes into 9, who stands between the midfield and defensive lines. 9 plays the ball first time into space behind the back four, where 8 has run from the left half-space, and 8 shoots at the near post. 10, 7 and 11 hold the width and the second line.

The third-man run (A passes to B, B sets the ball into the path of C) is the pattern coaches reach for against a deep defense. It is not a corpus case (those are a build-up from the goalkeeper and an overlap-and-cross). It uses every soccer line in one picture: a dribble, two passes, a run without the ball and a shot.

**Surface and markings.** The attacking half of an IFAB pitch, 105 × 68 m, drawn 68 m wide at 13.24 px per metre, from 2 m behind the halfway line to the goal line. The goal is at the top of the page, so the attack goes up, as in the other two sports.
- Halfway line, centre circle radius 9.15 m, centre mark.
- Penalty area 16.5 m deep × 40.32 m wide; goal area 5.5 m × 18.32 m; penalty mark 11 m from the goal line.
- Penalty arc radius 9.15 m from the penalty mark, only the part outside the penalty area.
- Corner arcs radius 1 m.
- Goal 7.32 m between the posts, drawn as a net box in the band behind the goal line.
- Mowing stripes 5.25 m deep, counted from the goal line.
- A darker band beyond both touchlines and the goal line; the bottom crop edge is open.

**Player tokens.** The team: a white disc, radius 11 px, navy 2.2 px outline, with the shirt number inside (two-digit numbers in the smaller size). Opponents: a red X, 13 px across, with a white halo and no label, because every opponent carries the same label "X" in the source. The opponents' goalkeeper is drawn as an X like the rest. The ball is a white disc with a navy outline, radius 4.6 px, beside the player who starts with it.

**Line grammar.**
- Pass (the ball): solid navy line, 2.4 px, filled arrowhead 11 px long.
- Run (a player without the ball): dashed line with the same weight and head.
- Dribble: a wavy line, 3.3 px amplitude and 10 px wavelength, with a 13 px straight tail into the arrowhead.
- Shot: two parallel 1.7 px lines 5.2 px apart, with a larger arrowhead (13 px long, 14 px wide).
- Each action starts where the previous one ended: the pass into 9 starts at the end of 6's dribble, and the shot starts where the through ball meets 8.
- Where a pass and a run meet, the pass arrow reaches the meeting point and the run stops 30 px short, so the two arrowheads never touch and the ball's arrow clearly owns the spot.
- **The inversion.** In soccer a solid line is the ball and a dashed line is a player. Basketball is the opposite (dashed = the ball, solid = a player cutting). The legend states it in words: "Pass (ball)" and "Run (player)".

**Palette.** Paper `#FFFFFF`; ink `#15233B`; caption `#5B6675`; rule `#DDE2E8`; defense red `#B42318`; turf `#62A574` with stripe `#5A9C6B` and out-of-bounds band `#4B8A5C`; white markings and ball.

**Type scale** (Inter, falling back to Helvetica Neue / Arial). Title 20 px semibold; subtitle 12.5 px caption grey; one-digit shirt numbers 11.5 px bold; two-digit shirt numbers 10 px bold; legend 12 px.

**Collisions.** Each of the 15 text boxes, 18 tokens and 5 action lines (with arrowheads) is tested against every other one and against the canvas edge. Counts: text × text 0, text × token 0, text × line 0, token × token 0, line × token 0, touching terminators 0, canvas edge 0, line crossings 0. Every line keeps at least 1.8 m (about 24 px) from the centre of every opponent it passes. Regenerate and re-check with `node scripts/visual-eval/draw-playbook-exemplar.mjs`.

**What is shared across the three sports.** Page frame (1012 px wide, 900 px surface, 24 px band on real boundary sides only), title and subtitle, legend strip listing only the symbols used, offense disc and defender X with their label rules, line weight, arrowhead, dash and wave rhythm, the ball glyph beside its first carrier, attack up the page, and every colour except the surface. Football and soccer share the same grass, stripe and band colours.

**Departures from `docs/reference/49-SPORTS-PLAYBOOK-STANDARD.md`.**
- *Portrait, goal at the top.* The doc draws the pitch landscape, attacking to the right. With the goal at the top, all three sports attack up the page, and a half pitch is portrait, the usual form of a coaching session sheet.
- *The shot is a double line.* The doc names the double line as the soccer shot convention, but its renderer draws a thick amber single line, which reads as another pass.
- *Opponents carry no letter.* The doc's renderer writes a small "X" beside every X glyph, which says nothing and collides with nearby players.
- *A ball glyph beside the first carrier*, following the coaching rule that the ball must be shown at the start of the first solid or wavy line.
- *No goalkeeper triangle in the legend*, because the team's own goalkeeper is not in the attacking half.

## References

- IFAB, "Law 1 – The Field of Play" — pitch, penalty area, goal area, penalty mark, arcs and goal dimensions. https://www.theifab.com/laws/latest/the-field-of-play/
- The FA, "Law 1 – The Field of Play". https://www.thefa.com/football-rules-governance/lawsandrules/laws/football-11-11/law-1---the-field-of-play
- Coaching American Soccer, "Soccer Diagramming" — solid lines for passes, shots and ball flight; dashed lines for movement off the ball; wavy lines for dribbling; the ball shown at the start of a solid or wavy line; players numbered by position. https://coachingamericansoccer.com/tactics-and-teamwork/soccer-diagramming/
- Hobbit AI, "Soccer Drill Diagram Symbols Explained" — survey of symbol use across tactics apps, including double-line arrows for a driven ball and the variation between manuals. https://hobbit.football/tools/soccer-drill-diagram-symbols-explained
- Sport Session Planner, "Understanding the lines" — a coaching-session sheet explaining the line key. https://www.sportsessionplanner.com/s/R6sR/Understanding-the-lines.html?interface=en
- Coaches' Voice, "Third-man runs: football tactics explained". https://learning.coachesvoice.com/cv/third-man-runs-football-tactics-explained-gasperini-guardiola/
- Elite Soccer, "Third-player runs" — using the pattern to break high lines and low blocks. https://elitesoccercoaching.net/in-possession/third-player-runs
- iCoachFootball, "How to Break Down a 'Park the Bus' Low Block: 3 Tactical Patterns". https://www.icoachfootball.net/how-to-break-down-a-park-the-bus-low-block-3-tactical-patterns/
- Modern Soccer Coach, "How To Coach 3rd Man Runs". https://www.modernsoccercoach.com/post/how-to-coach-3rd-man-runs-free-exercises
