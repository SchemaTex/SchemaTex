# Mind map — exemplar drawing

**Scenario.** A founder's Series B product strategy on one page: the central theme
"Series B Product Strategy" with six first-level branches — Market Focus, Product Bets,
Go to Market, Moat, Team and Ops, Success Measures — each holding three second-level
points, and one supporting detail hanging off the first point of every branch. 31 nodes,
which is about as much as a mind map can carry before it stops being readable at a glance.

**Layout.** The classic balanced map (Buzan / XMind): the centre sits in the middle, the
first three branches go right, the last three go left, and each side is laid out as a tidy
tree — leaves are stacked in reading order and every parent is centred on the vertical span
of its children. Column positions are fixed per depth so all pills line up, all second-level
text starts on one line, and all third-level text starts on another. The three trunk lines
leave the capsule at staggered heights (−15 / 0 / +15 px) so they separate immediately
instead of bundling.

**Palette** — six muted hues, one per branch, inherited by that branch's whole subtree
(line, underline, pill fill): steel blue `#3A6EA5`, teal `#2F8B77`, olive `#6E8B3D`,
ochre `#C08A2E`, terracotta `#B4544A`, violet `#7B5EA7`. The centre capsule is ink
`#1F2933` with white text; second-level text is near-black `#2B3440`, third-level a
lighter `#5A6472` so depth reads as weight, not as another colour.

**Type scale.** Centre 18 px bold, first level 14 px semibold, second 13 px, third 12 px.
Labels wrap at 152 px (second level) and 100 px (third), which keeps short phrases on one
line and folds the long ones rather than stretching the canvas.

**Shape grammar.** Only the centre and the first level are filled: a 54 px-tall capsule
(radius 27) and 30 px pills (radius 15). Everything deeper is plain text sitting on a
coloured underline — 2.0 px at depth 2, 1.3 px at depth 3 — which is the classic mind-map
look and stops the drawing turning into a wall of boxes. Branch lines are tapered ribbons,
not strokes: each is a closed shape between two cubic Béziers, ~11 px wide where it leaves
the capsule, 3 px at the pill, 2.6 → 1.7 px into the second level, 1.6 → 1.2 px into the
third, so thickness itself signals depth. Each ribbon ends exactly on the underline it
feeds, so line and label are one continuous stroke.

**Collisions.** Positions come from a solver, not from eyeballing: text widths are measured
(0.55 × font size per character, 0.6 for bold), rows are stacked with fixed gaps (32 px
between sibling leaves, 50 px between second-level subtrees, 108 px between branches), and
every label box is then tested against every other label box, against 40 sampled points of
every ribbon, and against the canvas edge. The count is 0.

**Departure from the standard doc.** The doc (§5.2) draws every node, including the centre
and the first level, as text-on-an-underline, and equalises label width across a whole depth
so all underlines at that depth are the same length. Both are dropped here: the centre is a
capsule and the first level is a pill, because a mind map needs an obvious visual hierarchy
at the trunk, and underlines are sized to their own text, because equalised widths leave a
long empty tail after short labels.
