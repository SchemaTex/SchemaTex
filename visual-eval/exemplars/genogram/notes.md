# Genogram exemplar — Bennett family

**The scenario.** A three-generation clinical genogram of the kind a family therapist keeps in a
case file. Chloe, 18, is the index person (the person the case is about) and is referred for
depression. Above her: her father Daniel, who divorced her mother Karen in 2016 and remarried
Priya in 2018; Daniel's sister Susan; and the grandparents Harold (died 2016) and Margaret.
The drawing has to answer, at a glance, four questions a clinician always asks — who is dead,
who split from whom, which children belong to which union, and where the emotional heat is.

**Palette.** Five designed colours plus the two condition tints the standard fixes.
`#1F2937` ink for every outline, name and structural line. `#64748B` slate for years, dates and
captions, so secondary text recedes. `#CBD5E1` hairline for the rule under the title.
`#0D9488` teal, used once only, for the index person's second outline. `#B91C1C` red, reserved
for the two negative emotional lines (conflict, cutoff) — nothing else in the drawing is red.
The sex fills stay as the engine has them: `#DBEAFE` for male squares, `#FCE7F3` for female
circles. A condition's position follows McGoldrick's symbol handout (Multicultural Family
Institute, 2017): the bottom half for alcohol or drug abuse, the left half for physical or
psychological illness. Its colour is a category tint, lightened so a black numeral still reads
on top: `#FCD34D` amber for substance use (Harold's and Daniel's alcohol use disorder),
`#A5B4FC` indigo for illness (Chloe's depression). Both appear in the legend at the foot.

**Type scale.** 22px semibold title / 14px semibold names and in-shape ages / 12px subtitle /
11.5px slate for years, marriage dates, captions and legend text / 10px letterspaced uppercase
for the legend's section headings. One structural stroke weight (1.8px), one emotional weight
(1.7–2px), one corner radius (10px, used only on the household enclosure).

**Symbol geometry.** Squares are 48×48, circles r=24, both stroke 2. Death is a cross drawn
corner to corner of the shape. The index person gets a concentric second outline at r=28 (a 4px
gap), in teal. Divorce is two parallel slashes on the couple line. Emotional lines are told
apart by line form, not colour: fusion is three parallel lines, closeness two, conflict a
zigzag, cutoff a line broken in the middle with a short bar at each end of the break. Red only
reinforces the two negative ones. A dashed rounded rectangle encloses the people who share a
home, with a caption naming them.

**How collisions were avoided.** Every position is solved in a script from measured text widths
(0.55 × font-size per character, 0.6 for bold) and then checked: each text box against every
other text box, against every line segment (segment-vs-rectangle intersection) and against the
canvas edge. The count is 0. Two routing rules did the work: emotional lines leave a shape from
a side that is not the label side, and the two long-distance ones use empty gutters — the
fusion tie swings through the left margin as a nested three-line arc, the cutoff runs as a right
angle through the right margin with the break on its vertical leg.

**Departures from the standard doc.** McGoldrick puts the man on the left of a couple, but
Karen sits left of Daniel here: the doc's multiple-marriage rule (spouses in chronological order
left to right around the person who remarried) wins, so Karen is the first wife on the inside
left and Priya the second on the right. Ages sit inside the shapes for the living; the deceased
carry their dates below instead, because a number inside a shape that already has a cross
through it is unreadable.
