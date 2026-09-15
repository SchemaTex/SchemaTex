# Decision analysis exemplar: new product launch with a test-market option

**Scenario.** A company can launch a new product now, pay $1M to test it in one region first, or not
launch at all. The test result is uncertain. After the test the company decides again whether to
launch, and demand after a launch is high, medium or low. This is the textbook sequential decision
used to teach decision trees and the value of information. Course material such as the Open
University's OpenLearn unit and Brunel's OR-Notes teaches it this way. A reader recognises it at once, and anyone
can check the arithmetic without specialist knowledge.

The tree has 3 decisions, 4 chance events and 12 payoffs, and the answer is not obvious. Launching
now is worth $1.6M on average. Testing first is worth $2.2M, because a bad test result lets the
company walk away for $1M instead of risking a $13M loss. A clinical tree (surgery versus
medication, with payoffs in quality-adjusted life years) would be drawn exactly the same way. A
money problem was chosen because the corpus already has a clinical question tree, and because
money payoffs include losses, so the drawing has to handle negative numbers.

The probabilities are consistent with each other. Before any test, demand is high, medium or low
with probability 0.30, 0.40 and 0.30. A favourable and an unfavourable result are equally likely,
and the demand probabilities after each result (0.50/0.40/0.10 and 0.10/0.40/0.50) average back
to that prior. The figures are illustrative; the source says so in a comment.

**Layout.** Left to right, the direction every decision-analysis text and tool uses: choices are
made on the left and consequences are paid on the right. Every payoff triangle sits in one column
at the right edge, with its payoff right-aligned beside it under a `PAYOFF` header. The whole set
of possible results reads top to bottom as one list, and payoffs can be compared at a glance.

Payoff rows are 48 px apart between siblings. The gap grows by 14 px for each level higher up the
split between two neighbouring payoffs, so the three demand fans read as groups without a frame.
Each decision or chance node is centred on its first and last child. Decisions and chance nodes
at the same depth share one column. Each column is as far right as its longest branch text needs
and no further.

Edges are orthogonal. A short stem (at least 22 px, longer when the node's name or value box is
wide) runs right to a shared vertical fork line. Each branch then turns right along a horizontal
line to its child, with 6 px rounded corners. Everything written about a branch sits on its
horizontal line, just past the fork: the branch name above the line, the probability below it.
Branch text therefore never sits on a sloped line and is never ambiguous about which branch it
belongs to. There are no arrowheads, because a decision tree is always read left to right.

**Palette.** Colour appears only on the best strategy.
- Ink `#1F2933`: branch names, payoffs, expected values and the title.
- Line slate `#3E4C59`: branches, node outlines and the rejection marks.
- Muted slate `#52606D`: probabilities, node names, the subtitle, the column header and the legend.
- Node fill `#F0F4F8`, the same for all three node kinds; paper `#FFFFFF`.
- Best strategy green `#2B7A4B`: branch lines (2.5 px) and value-box outlines along the
  recommended strategy. Value boxes on it are tinted `#EAF5EE`.
- Off-strategy value-box outline `#9AA5B1`, on a white box.

Losses are not red. A true minus sign (−) marks them, so colour keeps a single meaning and the
drawing still works in greyscale print. Contrast:
- Ink on white and on the green tint: above 12.9:1.
- Muted slate on white: 6.5:1.
- Green lines on white: 5.3:1, above the 3:1 minimum for graphics.
- The pale `#9AA5B1` box outline only frames ink text, so it carries no information of its own.

**Type scale.** One font stack for everything: Inter, then Helvetica Neue, Helvetica, Arial.
- Title: 20 px, weight 600.
- Subtitle (the derived best strategy): 12.5 px, weight 400.
- Branch name: 12 px, weight 500.
- Probability: 11 px, weight 400.
- Expected value: 11.5 px, weight 700.
- Payoff: 12.5 px, weight 600.
- Node name: 11 px, weight 400.
- Column header: 10 px, weight 700, capitals, 1 px letter spacing.
- Legend: 11.5 px.

**Shape grammar.**
- A decision is a 24 px square (2 px corner radius). A chance event is a circle of radius 12. A
  payoff is a 13 × 16 px triangle whose point touches the end of its branch.
- Every decision and chance node carries its rolled-back expected value in a small box (19 px tall,
  4 px radius) 5 px above it. That box is the only place an expected value appears.
- A node reached by a choice is named below it in muted slate ("Demand", "Test result"), and so is
  the root ("Launch strategy"). A node reached by a chance outcome is named by that outcome on its
  branch ("Favourable") and carries no second name.
- The best strategy is traced in green from the root to every payoff it can reach: the chosen
  option at each decision it meets, and every outcome of every chance event on the way.
- Every option rejected at a decision gets a double hash mark: two short slanted strokes across the
  branch just past the fork. Chance branches are never marked, because nobody chooses them. The
  subtree behind a rejected option stays in full ink so its numbers can still be read and checked.
- The legend names the three node shapes, the value box, the green line and the hash mark.
- A one-line subtitle states the result in words ("Best strategy: test market; if favourable,
  launch; if unfavourable, abandon. Expected value $2.2M."). It is generated from the rolled-back
  tree, so the source needs nothing extra.

**Numbers.**
- The source gives payoffs in whole dollars (`payoff=12000000`). The drawing shows them in millions
  with the fewest decimals that stay exact: `$12M`, `−$1M`, `$0`.
- Expected values always carry one decimal (`$1.6M`, `−$4.2M`), so values of different sizes line up
  and compare easily.
- Probabilities show two decimals with the symbol: `p = 0.30`.
- The generator rolls the tree back from the source. A chance node takes the probability-weighted
  mean of its branches, and a decision node takes its best option. If two options tie, the first
  listed wins. The generator refuses to draw if a chance node's probabilities do not sum to 1, or if
  a branch lacks its probability or choice name.
- Every drawn value was checked three ways: the generator's rollback, the engine parser's own
  rollback (`parseDecisionTree`), and a hand calculation. All seven agree:
  - Launch now: 0.3×12 + 0.4×4 + 0.3×(−12) = 1.6.
  - After a favourable test: launching gives 0.5×11 + 0.4×3 + 0.1×(−13) = 5.4, which beats
    abandoning at −1.
  - After an unfavourable test: launching gives 0.1×11 + 0.4×3 + 0.5×(−13) = −4.2, so abandoning
    at −1.0 is better.
  - Test market: 0.5×5.4 + 0.5×(−1.0) = 2.2.
  - Root: the best of 1.6, 2.2 and 0 is 2.2.

**Collisions.** The generator measures every string with resvg (the renderer the eval rasterises
with) and checks the following before it writes:
- every text box against every other text box, every edge segment (including the hash strokes) and
  every node or value box it does not belong to;
- node against node, with a 4 px clearance;
- every edge segment against every node except its own two ends;
- edge segments of different parents against each other, which catches crossings;
- all text inside the 40 px canvas margin.

Reported count: 0.

**Shared with the question-tree exemplar, and what differs.**

Shared, so the two read as one family:
- font stack, ink `#1F2933`, line slate `#3E4C59` and muted slate `#52606D`;
- node fill `#F0F4F8`, and green `#2B7A4B` with its `#EAF5EE` tint;
- title at 20 px weight 600, top left, inside a 40 px margin;
- legend in muted slate at 11.5 px, right-aligned;
- 1.5 px lines with 6 px rounded corners from a shared fork line;
- gaps between neighbouring leaves that grow with how high up the split is;
- no frames, and the same resvg-measured collision checks.

Different, because the method prescribes it:
- **Direction.** Left to right instead of top to bottom, which is the decision-analysis convention.
  Every number here belongs to a branch, and horizontal branches give each number a line to sit on.
- **Where text lives.** Nodes are small standard symbols (square, circle, triangle) and the text
  sits on the branches. In a question tree the text sits inside hexagons and cards.
- **Leaves.** A right-hand payoff column replaces the shelf of outcome cards.
- **Meaning of colour.** Green marks the recommended strategy. There are no urgency classes, so
  there is no red or amber.
- **No arrowheads and no step numbers.** A branch's path of names identifies it, and every tool in
  the method draws trees without arrows.
- **Legend row.** The legend has its own row under a result subtitle, because it has six entries
  and the result deserves a sentence.

**Departures from the repo standard doc** (`docs/reference/17-DECISION-TREE-STANDARD.md` §3.1,
§4.1–4.2, §5.1–5.2, §8.2).
- **Node fills.** The doc tints decisions green, chance nodes blue and outcomes grey. Here all three
  share one neutral fill: shape already tells the kinds apart, and colour is kept for the best
  strategy.
- **Payoff triangle.** The doc draws a 24 × 24 triangle pointing right. Here it points left and is
  smaller, as in TreeAge Pro and PrecisionTree, so its point lands on the end of the branch and
  the payoff reads directly beside its flat side.
- **Expected values.** The doc writes `EV=123,400` as small muted text above or below a node. Here
  each value sits in a box above its node (TreeAge's "roll back box"), in $ millions, with no
  `EV=` prefix; the legend explains the box.
- **Branch text.** The doc centres the choice name or probability on the middle of the branch.
  Here the name sits above and the probability below the horizontal part, starting just past the
  fork. Probabilities beneath the branch follow TreeAge and PrecisionTree, and starting at the fork
  keeps them next to the node they leave.
- **Edge shape.** The doc puts the elbow halfway between parent and child, and the engine draws
  diagonals. Here the fork line sits just right of the parent, so every branch is horizontal where
  its text is.
- **Optimal marking.** The doc thickens only the chosen decision edge. Here the whole strategy is
  green, including every chance outcome it passes through, and every rejected option also carries
  a double hash. The doc has no rejection mark.
- **Losses.** The engine colours negative payoffs red. Here they are ink with a minus sign.
- **Additions.** The derived best-strategy subtitle and the `PAYOFF` column header are not in the
  doc.

**References**
- Howard Raiffa, *Decision Analysis: Introductory Lectures on Choices under Uncertainty*
  (Addison-Wesley, 1968). The founding text for decision-flow diagrams built from decision forks and
  chance forks, evaluated from the right.
  https://archive.org/details/decisionanalysis00raif
- Robert T. Clemen and Terence Reilly, *Making Hard Decisions with DecisionTools* (Cengage). The
  standard business-school text; its trees are drawn with Palisade PrecisionTree, whose conventions
  are listed in the Lumivero entry below.
  https://www.cengage.com/c/making-hard-decisions-with-decisiontools-3e-clemen-reilly/9780538797573/
- TreeAge Pro Help, "Roll back". Roll-back boxes beside each node, decision nodes report the value
  of the preferred option, probabilities displayed beneath the branches, non-optimal options
  marked with hashes. https://www.treeage.com/help/Content/31-Analyzing-Decision-Trees/3-Roll-back.htm
- TreeAge Pro Help, "Analysis of a decision tree". The optimal strategy gets a green connector,
  rejected strategies a double strike-through marker.
  https://www.treeage.com/help/Content/2-Build-Decision-Trees-Topics/6-Analysis-Rollback-Decision-Tree.htm
- TreeAge Pro Help, "Nodes in TreeAge Pro". Decision, chance and terminal nodes; the probability
  expression on each chance branch; payoffs at terminal nodes.
  https://www.treeage.com/help/Content/7-Navigating-TreeAge-Pro/7-Nodes-in-TreeAge-Pro.htm
- Lumivero (Palisade), "Creating litigation decision tree models with @RISK and PrecisionTree, part
  two". Square decision, circle chance and triangle end nodes; probabilities shown on chance
  branches; payoffs at the end nodes; read left to right; the best option marked TRUE.
  https://lumivero.com/resources/blog/creating-litigation-decision-tree-models-to-improve-legal-case-outcomes-with-risk-and-precisiontree-part-two/
- M. G. Myriam Hunink et al., *Decision Making in Health and Medicine: Integrating Evidence and
  Values*, 2nd ed. (Cambridge University Press, 2014), as summarised by the Health Knowledge public
  health textbook, "Decision analysis". Squares, circles and triangles; expected values worked
  from right to left.
  https://www.healthknowledge.org.uk/public-health-textbook/medical-sociology-policy-economics/4d-health-economics/decision-analysis
- Allan S. Detsky et al., "Primer on Medical Decision Analysis: Part 2 — Building a Tree", *Medical
  Decision Making* 17(2), 1997 (Society for Medical Decision Making). Recommendations for structuring
  clinical decision trees so they can be checked and tested.
  https://journals.sagepub.com/doi/abs/10.1177/0272989x9701700202
- Tamlyn Rautenberg, Annette Gerritsen and Martin Downes, "Health Economic Decision Tree Models of
  Diagnostics for Dummies: A Pictorial Primer", *Diagnostics* (2020). Left-to-right trees with square, circle and triangle nodes, and a label on
  every branch. https://pmc.ncbi.nlm.nih.gov/articles/PMC7151142/
- ACCA, "Decision trees" (Performance Management technical article). Draw left to right and
  evaluate right to left; cross off the rejected branches after a decision point, never the
  outcomes of a chance point.
  https://www.accaglobal.com/uk/en/student/exam-support-resources/fundamentals-exams-study-resources/f5/technical-articles/decision-trees.html
- The Open University, OpenLearn, "Decision trees and dealing with uncertainty", section 4.2, "A
  complex decision tree – deciding whether or not to launch a product early". A multi-stage
  product-launch tree with expected monetary values at each node.
  https://www.open.edu/openlearn/money-business/decision-trees-and-dealing-uncertainty/content-section-4.2
- J. E. Beasley, OR-Notes, "Decision trees" (Brunel University). A test-market-then-build example;
  probabilities on chance branches, total payoffs at the ends, expected values worked backwards.
  https://people.brunel.ac.uk/~mastjjb/jeb/or/dectree_ma3908.html
