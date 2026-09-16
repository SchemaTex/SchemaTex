# Influence diagram exemplar: new product launch

**Scenario.** A company has run a test market and must decide whether to launch nationally and, if
it does, what list price to set. The value it cares about is five-year net present value (NPV).
This is the problem corporate decision analysts draw first, before any tree is built, and the
product-strategy-to-NPV picture is the standard teaching example in decision-analysis software and
consulting material.

The diagram has two decisions, five uncertainties, one deterministic calculation and one value
node, joined by 13 arcs. It is small enough to read at a glance and still uses every part of the
notation:
- a test result that is known before both decisions, which is what makes the first decision worth
  modelling;
- two decisions taken in a fixed order;
- a decision that changes an uncertainty (the list price changes how competitors respond);
- a deterministic node (unit margin is list price minus unit cost, with nothing left uncertain);
- a single value node with three parents.

The oil wildcatter example is already the worked example in the repo's standard doc, so it is not
repeated here.

**Family.** This is the influence-diagram variant of the decision tree family, and it copies the
question-tree exemplar (`../taxonomy/`) wherever the method leaves a choice:
- the same font stack, type scale, ink, line and legend colours, 1.5 px strokes, 40 px margin and
  arrowhead size;
- the title at top left, and the legend at top right on the title's baseline, with small glyphs
  and slate text;
- the same dark step-number badge, used here for the order of the decisions;
- text measured with resvg and every collision checked before the file is written.

It differs where influence diagrams have their own convention:
- It is a network with straight arcs, not a tree with orthogonal rails.
- Shape carries the node kind: rectangle, oval, double oval and octagon. The hexagon is not used,
  so it cannot be confused with the question tree's hexagon, which means "question".
- There are no colour classes. In the question tree, colour means urgency, and an influence
  diagram has no outcomes to rank. The only strong fill is the value node.
- Informational arcs are dashed.

**Layout.** Arcs point left to right, or straight up or down within a column, and the value node
sits at the right edge. Columns are 212 px apart. The four rows sit at 0, 185, 330 and 475 px
below the first. The rows read as bands:
- Top line: "Launch nationally?" with a single arc to "Five-year NPV".
- Cost band: Unit cost to Unit margin to NPV, level with NPV so the last arc is horizontal.
- Price row: Test-market sales to Set list price to Competitor response.
- Demand line along the bottom: Market size to Units sold, which rises to NPV.

Decision 1 goes on the top line for a structural reason. The launch decision reaches the value
directly. The price decision below it feeds both the demand side (Units sold) and the cost side
(Unit margin). A straight arc from the launch decision to NPV would cut one of those two branches
unless it runs along the outside of the drawing, with everything else on one side of it.

The two decisions share a column, in order from top to bottom, so the arc from decision 1 to
decision 2 is a short vertical dashed line. Test-market sales sits to the left of both decisions,
so the three informational arcs form one dashed cluster that reads as "what is known before
deciding". Market size, the root uncertainty, starts the demand line at bottom left.

Units sold sits a quarter column left of its grid position. Three arcs enter it, and on the grid
the arcs from Set list price and Competitor response would arrive almost on top of each other.

**Palette.** Colour marks which node is the objective, and nothing else.
- Ink `#1F2933`: node labels and the title.
- Line slate `#3E4C59`: node outlines, arcs, arrowheads, step badges and the value node's fill.
- Muted slate `#52606D`: legend text.
- Decision fill `#DDE5ED`, one step darker than the question tree's `#F0F4F8`; uncertainty and
  deterministic fill `#FFFFFF`.

In greyscale the four kinds still separate by shape and lightness: a grey rectangle, a white oval,
a white double oval and a dark octagon. All text passes the 4.5:1 WCAG AA contrast threshold:
- ink on the decision fill 11.6:1, and ink on white 14.8:1;
- white on the value node 8.8:1;
- legend slate on white 6.5:1.

**Type scale.** One font stack for everything: Inter, then Helvetica Neue, Helvetica, Arial.
- Title: 20 px, weight 600.
- Decision label: 13 px, weight 600.
- Uncertainty and deterministic label: 13 px, weight 400.
- Value label: 13 px, weight 600, white.
- Step number: 10 px, weight 700, white.
- Legend: 11.5 px.

Every label fits on one line. All nodes of one kind share one size, set by the longest label of
that kind.

**Shape grammar.**
- A decision is a 160 × 56 px rectangle with square corners and a grey fill. Its step number sits
  in a radius-9 badge on the top-left corner. It sits on the corner rather than the left edge,
  because arcs arrive on the left edge.
- An uncertainty is a 164 × 56 px oval.
- A deterministic node is the same oval with a second outline 4 px inside it. Its label is checked
  to fit inside the inner outline.
- The value node is a 148 × 56 px octagon with 16 px corner cuts, filled dark slate with white text.
  It has no outgoing arcs.
- Decision order is derived from the arcs: a decision comes after every decision that has a
  directed path to it. The source needs nothing extra.
- The legend names the four node kinds and the two arc meanings.

**Arc grammar.**
- An arc's meaning is read from the node it points into, as Howard & Matheson and Shachter define
  it:
  - into a decision, it is informational: the source is known before deciding. Drawn dashed
    (6 px on, 4 px off).
  - into an uncertainty or a deterministic node, it is a relevance arc: the source conditions or
    determines that node. Drawn solid.
  - into the value node, it is functional: the source is an argument of the value. Drawn solid.
- An arc out of a decision into an uncertainty is solid. Set list price changes Competitor response;
  it is an influence, not information.
- Arcs are straight, aimed from centre to centre and cut at both outlines. The arrowhead is 8 px
  long and 9 px wide, and its tip lands exactly on the target's outline.
- Arcs carry no text. The destination and the dash already say what an arc means.
- No-forgetting (a decision maker remembers everything known at an earlier decision) is drawn, not
  left implied. Test-market sales has its own dashed arc into Set list price, even though the rule
  would supply it, so a reader who does not know the rule still reads the information structure
  correctly.
- There are no cycles.

**Collisions.** The generator reads `source.sx`, measures every string with resvg (the renderer
the eval rasterises with), and checks the following before writing:
- every text box against every other text box, every arc and every node it does not belong to;
- each label lies inside its own outline, and inside the inner outline of the double oval;
- node against node, with a 16 px clearance, including badges and legend glyphs;
- every arc against the exact outline of every node it does not touch, grown by 10 px;
- every pair of arcs without a shared node, for a crossing;
- every pair of arcs that share a node, which must be at least 14 px apart 24 px out from it;
- arrowheads arriving at the same node, which must be at least 16 px apart;
- everything stays inside the canvas margin.

Reported count: 0 in every category, including 0 arc crossings. The closest any arc comes to a node
it does not touch is 25 px. The closest two arcs sharing a node come, 24 px out from it, is 27 px.

**Departures from the repo standard doc** (`docs/reference/17-DECISION-TREE-STANDARD.md` §3.4).
- **Deterministic node.** The doc has three node kinds. Howard & Matheson, the GeNIe manual and
  most decision-analysis texts have a fourth: the deterministic node, drawn as a double oval. Here
  it is written `chance Margin "Unit margin" deterministic`. Today's parser accepts the trailing
  word and ignores it, so the source parses cleanly but the engine draws a plain oval.
- **Value node.** The octagon is kept, as in the doc. It is filled dark instead of green, because
  in this family colour is not spent on node kinds.
- **Fills.** The doc's blue, amber and green fills per kind are replaced by one slate family. Shape
  alone tells the kinds apart, and it survives greyscale print.
- **`utility=N`.** Not used. The doc shows a payoff number on the value node, but an influence
  diagram shows structure. The numbers belong in the tree the diagram is later unrolled into.
- **Layout.** The doc lays nodes out in longest-path columns and stacks each column. That puts
  seven columns in a row for this problem, and straight arcs then pass through nodes. Here flow
  still runs left to right, but rows are used as bands and decision 1 sits on the outer edge.
- **Step numbers and the explicit no-forgetting arc.** These are additions. The step numbers are
  derived from the arcs.
- **Dashed informational arcs.** This follows the doc. Howard & Matheson, GeNIe, Netica, HUGIN and
  Analytica draw informational arcs in the same line as every other arc and leave the meaning to
  the destination. The dash is kept because it makes "known before deciding" visible without that
  rule.

**References**
- Ronald A. Howard and James E. Matheson, "Influence Diagrams", *Decision Analysis* 2(3), 127–143
  (2005; first circulated 1981). Decision, uncertainty, deterministic and value nodes; arcs into
  decisions are informational; no-forgetting; no cycles.
  https://pubsonline.informs.org/doi/10.1287/deca.1050.0020
- Ross D. Shachter, "Evaluating Influence Diagrams", *Operations Research* 34(6), 871–882 (1986).
  Informational arcs into decisions, relevance arcs into chance nodes, and the regularity and
  no-forgetting conditions. https://pubsonline.informs.org/doi/10.1287/opre.34.6.871
- Wikipedia, "Influence diagram". Rectangle, oval, double oval and octagon (or diamond); functional,
  conditional and informational arcs. https://en.wikipedia.org/wiki/Influence_diagram
- BayesFusion, GeNIe manual, "Node types". Decision rectangle, chance oval, deterministic double
  oval, utility hexagon. https://support.bayesfusion.com/docs/GeNIe/components_nodetypes.html
- Lumina Decision Systems, Analytica docs, "Classes of variables and other objects". Decision
  rectangle, chance oval, objective hexagon, general variable as a rounded shape.
  https://docs.analytica.com/index.php/Classes_of_variables_and_other_objects
- Lumina Decision Systems, "Drawing Influence Diagram Examples". Building a diagram from decision
  to objective, and checking every variable for clarity.
  https://analytica.com/blog/how-to-draw-an-influence-diagram/
- Norsys, Netica help, "Decision Nets". Links into a decision are informational links; utility
  nodes are drawn as diamonds or flattened hexagons.
  https://www.norsys.com/WebHelp/NETICA/X_Decision_Nets.htm
- Norsys, Netica help, "Node Kind". Nature nodes are ellipses, decision nodes rectangles, utility
  nodes hexagons; deterministic nature nodes get a thicker border.
  https://www.norsys.com/WebHelp/NETICA/X_Node_Kind.htm
- HUGIN GUI 9.5, "Introduction to (Limited Memory) Influence Diagrams". Utility nodes are diamonds;
  when no-forgetting is relaxed, every informational link must be drawn explicitly.
  https://download.hugin.com/webdocs/manuals/9.5/pages/Tutorials/LIMID/IntroductionToLimitedMemoryInfluenceDiagrams.html
- DecisionProgramming.jl, "Influence Diagram". Value nodes have no children; the graph is acyclic;
  no-forgetting is the default assumption.
  https://gamma-opt.github.io/DecisionProgramming.jl/dev/decision-programming/influence-diagram/
- Rob L. Stephens, CFO Perspective, "See the Big Picture of a Decision with an Influence Diagram".
  Product-strategy decision on the left, NPV objective on the right; double ovals for calculated
  quantities; octagon objective; arrows never form a loop.
  https://cfoperspective.com/see-the-big-picture-of-a-decision-with-an-influence-diagram/
