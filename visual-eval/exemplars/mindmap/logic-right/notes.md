# Mind map, logic chart — exemplar drawing

**Scenario.** A revenue issue tree, the most common left-to-right tree in consulting: the goal
"Grow Revenue 30% Next Year" on the left, split into the four levers that together make up
revenue growth — Win new customers, Expand existing accounts, Keep the customers we have, Raise
price realization. Each lever has three sub-levers, and six of those carry one or two first
moves. 25 nodes, three levels below the root. It suits a logic chart because the question
really is answered left to right: every column is a more specific answer to the column before
it, and the levers are mutually exclusive, so the branches never need to cross-link. The same
shape is an IHI driver diagram (aim → primary drivers → secondary drivers → change ideas), which
`%% style: driver` draws with this layout.

**Layout.** The root sits at the left edge. Every depth has its own column and all nodes in a
column share one left edge (x = 40 / 441 / 735 / 958), so a reader can scan one level straight
down: all levers, then all sub-levers, then all first moves. This follows the driver-diagram
rule that tree level equals column, and XMind's logic chart. It is not markmap's layout, which
places each child just past its own parent's width and so leaves ragged columns. Rows come from
a tidy tree: leaves are stacked in reading order and every parent is centred between its first
and last child, so a parent with one child sits on a straight line. Leaf rows are 34 px apart at
the second level and 30 px at the third. Sub-lever groups get 8 px extra when either neighbour
has children, and the four levers are separated by 28 px, so each branch reads as a block. The
canvas is 1170 × 696.

**Palette** — the mind-map family palette, one hue per first-level branch, inherited by that
branch's whole subtree (connectors, underlines, pill fill): steel blue `#3A6EA5`, teal
`#2F8B77`, olive `#6E8B3D`, ochre `#C08A2E` (terracotta `#B4544A` and violet `#7B5EA7` follow
for a fifth and sixth branch). Root capsule ink `#1F2933` with white text; second-level text
near-black `#2B3440`; third-level text lighter `#5A6472`, with its underline and connector at
75 % of the branch colour mixed with white, so depth reads as weight, not as another colour.

**Type scale.** Root 18 px bold, first level 14 px semibold, second level 13 px, third level
12 px — identical to the radial map. The font stack is Inter, Helvetica Neue, Helvetica, Arial.
No label wraps here. The columns can be wider than on the radial map because a logic chart grows
in one direction only, so second- and third-level phrases of up to about 28 characters stay on
one line.

**Shape grammar.** The same shapes as the radial map: a 54 px capsule (radius 27) for the root,
30 px pills (radius 15) for the first level, and plain text on a coloured underline for
everything deeper (2 px at depth 2, 1.3 px at depth 3). Text starts at the underline's left end
with its baseline 7 px above the line, and each underline is only as long as its own text.

Connectors are the one deliberate change: orthogonal **rounded elbows** instead of curved
ribbons. XMind's own style sheet gives its main topics and subtopics the rounded-elbow connector,
and issue trees and driver diagrams are drawn with elbow or bracket lines. In a column-aligned
tree the elbow is also the better geometry. All children of one parent hang from a single
vertical spine placed in the gutter 20 px before the child column, so the lines stay out of the
text columns and a parent with three children draws one bracket instead of three diverging
curves. Corners are rounded (radius 10 / 7 / 6 by depth) to keep the soft mind-map character.
Thickness still signals depth: 3 px from the root, 2 px into the second level, 1.3 px into the
third. Each connector ends exactly on the underline it feeds, so line and label read as one
continuous stroke, as in the radial map. The four root connectors leave the capsule at staggered
heights (−12 / −4 / +4 / +12 px) and turn at nested x positions: the outermost branch turns
first, 11 px apart. No two branch colours ever share a line segment, and none cross.

**Collisions.** Positions come from a solver in
`scripts/visual-eval/draw-mindmap-logic-right-exemplar.mjs`, which reads this directory's
`source.sx`, so the drawing has exactly the source's nodes. Text widths are estimated
(0.55 × font size per character, 0.6 for bold). The script tests all 25 label boxes against each
other. It samples every connector and underline every 2 px (2,900 points) against every label
box, pill and capsule. It checks connector segments from different parents for crossings, and
every box for a 16 px clearance from the canvas edge. The result is 0 collisions and 0
crossings. The tightest vertical clearance between two text rows in one column is 18.5 px.

**Departure from the standard doc.** The doc (§5.2 and TC-MM-05) draws every node, root and
first level included, as text on an underline, gives every node at one depth the same underline
length, and joins nodes with horizontal Bézier curves. This drawing keeps the capsule and pills
and underlines sized to their own text, for the same reasons as the radial-map exemplar: an
obvious hierarchy at the trunk, and no empty tails after short labels. It replaces the Béziers
with rounded elbows for the reasons above. The driver diagrams of IHI and NHS England also put a
header over each column (Aim, Primary drivers, Secondary drivers, Change ideas) and allow one
driver to link to several parents. Neither can be expressed in the markmap-style source, so this
exemplar draws neither.

## References

- Institute for Healthcare Improvement, *QI Essentials Toolkit: Driver Diagram* — https://www.ihi.org/sites/default/files/QIToolkit_DriverDiagram.pdf
- Institute for Healthcare Improvement, *Driver Diagram* tool page — https://www.ihi.org/library/tools/driver-diagram
- NHS England and NHS Improvement, *Quality, Service Improvement and Redesign Tools: Driver diagrams* — https://aqua.nhs.uk/wp-content/uploads/2023/07/qsir-driver-diagrams.pdf
- Xmind, *How to Combine Different Structures in XMind and Why* (logic chart structure) — https://xmind.com/blog/how-to-combine-different-structures-in-xmind-and-why
- Xmind `defaultStyles.xml` (connector classes per topic level, including `org.xmind.branchConnection.roundedElbow`) — https://pastebin.com/fpG1HvpG
- markmap, `markmap-view` renderer source (d3 horizontal links, underline nodes, flextree placement) — https://github.com/markmap/markmap/blob/master/packages/markmap-view/src/view.ts
- markmap, *JSON Options* (spacing defaults) — https://markmap.js.org/docs/json-options
- MindManager 9 help, *Map layout* (growth direction, line style, sibling spacing) — https://onlinehelp.mindjet.com/help/MindManager/9/ENU/map_layout.htm
- MConsultingPrep, *Issue Tree in Consulting: A Complete Guide* (vertical or left-to-right trees, MECE) — https://mconsultingprep.com/issue-tree
- StrategyU, *The Pyramid Principle, Part 3: Logic in Problem Solving* (revenue and cost logic trees, two to three levels) — https://strategyu.co/pyramid-principle-3/
- Deckary, *MECE Framework: Examples, Issue Trees & Case Interview Guide* (three to five branches per level, elbow or bracket connectors) — https://deckary.com/blog/mece-framework-consulting
