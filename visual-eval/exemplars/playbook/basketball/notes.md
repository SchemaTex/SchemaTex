# Playbook exemplar — Basketball: Horns pick-and-roll, skip to the corner

**Scenario.** From the Horns set (1 at the top, 4 and 5 at the elbows, 2 and 3 in the corners) against man-to-man, 5 steps up and screens for 1, then rolls to the rim while 4 pops to the left slot. 1 dribbles off the screen to the right wing. When X2 leaves the far corner to tag the roller, 1 throws the skip pass to 2 for an open corner three.

Horns is one of the most used half-court sets from high school to the NBA, and the tag-and-skip is the read coaches teach with it. It differs from the corpus cases (a four-out give-and-go and a spread pick-and-roll with a pocket pass). It exercises every basketball line in one play: a screen, a dribble, two cuts, a dashed pass, and a defender's movement, and it needs the defenders on the floor because the defense's reaction is the reason for the pass.

**Surface and markings.** NBA half court, 50 ft wide at 18 px per foot, drawn from the baseline to 41 ft (6 ft short of midcourt, where nothing happens in this play). The basket is at the top of the page, so offense attacks up, like the other two sports.
- Lane 16 ft wide, painted, from the baseline to the free-throw line 19 ft out (15 ft from the backboard).
- Free-throw circle radius 6 ft: dashed inside the lane, solid outside.
- Backboard 6 ft wide, 4 ft in from the baseline; rim 18 in across, centre 5.25 ft from the baseline.
- Restricted-area arc radius 4 ft from the centre of the basket.
- Three-point line: straight corners 22 ft from the basket, meeting a 23 ft 9 in arc 14.2 ft from the baseline.
- Lane-space marks outside the lane lines: the block from 7 to 8 ft, then marks at 11 and 14 ft.
- A 3 ft hash on each sideline 28 ft from the baseline.
- A darker apron band beyond both sidelines and the baseline; the bottom crop edge is open.

**Player tokens.** Offense: a white disc, radius 11 px, navy 2.2 px outline, numbered 1–5 by position. Defense: a red X, 13 px across, with a white halo and its matchup number centred below it (the number of the player it guards). The ball is an orange disc, radius 4.6 px, beside the player who starts with it.

**Line grammar.**
- Cut (player movement): solid navy line, 2.4 px, filled arrowhead 11 px long.
- Pass (the ball): dashed line with the same weight and head. The dash rhythm (7 on, 5 off) is stretched slightly so every line ends on a full dash at its arrowhead.
- Dribble: a wavy line, 3.3 px amplitude and 10 px wavelength, with a 13 px straight tail into the arrowhead.
- Screen: solid line ending in a perpendicular T-bar at the screening spot, beside the defender being screened.
- A defender's movement uses the same grammar in defense red.
- Each action starts where the player's previous action ended: the roll starts at the screening spot, and the pass starts at the end of the dribble.
- **The inversion.** In basketball a dashed line is the ball and a solid line is a player. Soccer is the opposite (solid = the ball, dashed = a player running). The legend states it in words: "Cut (player)" and "Pass (ball)".

**Palette.** Paper `#FFFFFF`; ink `#15233B`; caption `#5B6675`; rule `#DDE2E8`; defense red `#B42318`; maple court `#EFD9B2`; painted lane `#E5C595`; apron `#D3B083`; court lines `#9A6634`; rim `#E2621B`; basketball orange `#E07A1F`.

**Type scale** (Inter, falling back to Helvetica Neue / Arial). Title 20 px semibold; subtitle 12.5 px caption grey; token numbers 11.5 px bold; defender matchup numbers 10.5 px bold red with a white halo; legend 12 px.

**Collisions.** Each of the 19 text boxes, 11 tokens and 6 action lines (with arrowheads and the T-bar) is tested against every other one and against the canvas edge. Counts: text × text 0, text × token 0, text × line 0, token × token 0, line × token 0, touching terminators 0, canvas edge 0. There are 2 line crossings, both intended: the skip pass crosses the screener's path and the roll. Both crossings are more than 50 px from any token, arrowhead or T-bar, so they cannot be read as a connection. Regenerate and re-check with `node scripts/visual-eval/draw-playbook-exemplar.mjs`.

**What is shared across the three sports.** Page frame (1012 px wide, 900 px surface, 24 px band on real boundary sides only), title and subtitle, legend strip listing only the symbols used, offense disc and defender X with their label rules, line weight, arrowhead, T-bar, dash and wave rhythm, the ball glyph beside its first carrier, attack up the page, and every colour except the surface.

**Departures from `docs/reference/49-SPORTS-PLAYBOOK-STANDARD.md`.**
- *Lane 19 ft long.* The doc's court module draws the lane and the elbows at 15 ft from the baseline; the NBA free-throw line is 15 ft from the backboard, which is 19 ft from the baseline.
- *Landmarks outside the three-point line.* The top is drawn at 31.5 ft, the corners at 23.2 ft from the middle (outside the 22 ft corner line), and the wing where the dribble ends is outside the arc. The doc's landmark table puts top, wing and corner on or inside the line, where a shooter would not stand.
- *Cropped at 41 ft* instead of showing midcourt, which would leave the lower third of the court empty.
- *Matchup numbers below each X* instead of an "X1" label to its upper right, which collided with the defender's own glyph and nearby tokens.
- *A ball glyph beside the ball handler.* The doc has no basketball ball; without it the reader must guess who starts with the ball.

## References

- NBA Official, "Rule No. 1: Court Dimensions – Equipment" — lane, free-throw line, restricted area, three-point line, lane-space marks, sideline hash marks. https://official.nba.com/rule-no-1-court-dimensions-equipment/
- CoverSports, "NBA Court Dimensions & Markings" — 94 × 50 ft court, 16 ft lane, 15 ft free throw, 23 ft 9 in arc and 22 ft corners. https://coversports.com/resources/gym-guides/nba-court-dimensions-markings
- Dimensions.com, "Basketball Court Dimensions & Drawings". https://www.dimensions.com/element/basketball-court
- The Hoops Geek, "How to Draw & Read Basketball Plays" — numbered offense, X defense, solid cut, dashed pass, wavy dribble, T-ended screen, crossed-line handoff. https://www.thehoopsgeek.com/draw-basketball-plays/
- HoopTactics, "Basketball Play Diagrams". https://hooptactics.net/premium/basketballbasics/bb3playdiagrams.php
- Silver Screen and Roll, "Laker Film Room: How to Read Basketball Play Diagrams". https://www.silverscreenandroll.com/2018/8/6/17636232/laker-film-room-how-to-read-basketball-plays-diagrams
- FastModel Sports, FastDraw — the play-diagramming software most basketball coaches use. http://www.fastmodelsports.com/coaching-software/fastdraw-playbooks/
- The Hoops Geek, "The Complete Guide to Horns Offense" — Horns alignment and pick-and-roll variations. https://www.thehoopsgeek.com/basketball-horns-offense/
- Dylan Murphy, "Horns", The Basketball Dictionary — 4 and 5 high as the horns, 1 in the middle, shooters in the corners; roll-and-pop read. https://medium.com/the-basketball-dictionary/horns-80f1e55bad5b
- Coach's Clipboard, "Basketball Horns Offense". https://www.coachesclipboard.net/HornsOffense.html
- Wikipedia, "Basketball court" — FIBA dimensions for comparison (28 × 15 m, 6.75 m three-point line, 4.9 m lane). https://en.wikipedia.org/wiki/Basketball_court
