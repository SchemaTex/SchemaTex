# Flowchart exemplar — accounts-payable invoice approval

**Scenario.** The standard operating procedure a finance team publishes for paying a supplier
invoice: capture the invoice, match it to a purchase order, route it for approval by amount, then
either reject it or pay it. It is the shape most business flowcharts have — one happy path, three
decisions, one rework loop, one grouped stage — so it exercises the whole vocabulary without being
a stress test.

**Layout.** Strict top-to-bottom on a three-column grid. The happy path never leaves the centre
column, so a reader can follow the "everything went fine" story by looking straight down. Every
exception — the missing-PO rework and the rejected invoice — hangs off one left-hand lane, and the
rework loop returns up that lane in its own clear channel, so no line ever crosses a node. All
edges are orthogonal with a single 4px corner radius; arrowheads are trimmed to land exactly on the
node border (on the database that means the top of the ellipse, not the top of its bounding box).
Where the two approval branches rejoin, they merge onto one short rail and enter the next decision
through a single arrowhead rather than two arrows stacked on the same line.

**Palette** (six colours, each one meaning one thing): ink `#1B2430` for every outline, arrowhead
and label; graphite `#5F6B7A` for the group frame, subtitle and legend; paper `#FFFFFF` for process
fill; amber `#FBEDCE` for decisions; sage `#DFEBE0` for the start and end terminators; sky `#E2EDF9`
for anything that is data — the purchase-order system and the two documents. Colour carries shape
class only; nothing is coloured for decoration.

**Type scale.** Title 21/600, subtitle 12, node label 13, edge label 11/500, legend 11 — all in
Inter with a Helvetica/Arial fallback. Node boxes are content-sized: text width plus a fixed 40px
of padding, one shared height per shape class.

**Diamond geometry.** Decisions are true rhombi, not rounded near-squares. Decision text is wrapped
to two lines first, which is what keeps the diamond compact: for a label box of half-width x and
half-height y inside a rhombus of half-axes a and b, x/a + y/b = 1, so the width is solved from the
wrapped text rather than guessed. Yes/No labels sit in small white pills *beside* the exit edge
(above a horizontal exit, to the right of a vertical one), never on top of the line.

**Grouping.** The Approval stage is a light tinted frame with a rounded folder tab carrying its
name, so the group title never collides with the frame border or with an edge crossing it.

**Collisions.** A generator script solves every position from measured text widths and then checks
each label against every other label, every edge segment, every node box, the group frame's four
borders, and the canvas margin. Reported count: 0.

**Departure from the standard doc.** None in symbol semantics. The only addition is the legend,
which the standard does not mention — a published SOP needs its shape vocabulary spelled out for
readers who do not know ISO 5807.
