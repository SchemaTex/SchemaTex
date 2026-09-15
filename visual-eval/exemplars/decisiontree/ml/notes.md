# Classifier tree exemplar: subscriber outcome at renewal

**Scenario.** A trained classification tree that predicts what a subscriber does at renewal:
renews, downgrades to a cheaper plan, or cancels. Churn is the tree a data scientist most often
has to explain to people who do not build models, and its features read as plain business facts:
contract type, tenure, support calls, monthly charge and data use. Three outcomes rather than a
binary churn flag, so the drawing shows how a class palette and a class-mix bar work beyond two
colours, as the three-class loan-default case needs. The tree is 3 levels deep with 6 splits and
7 leaves. One branch stops a level early ("Monthly charge ≤ $90" is True for 1,900 annual-contract
subscribers, and 90% of them renew), because trained trees stop wherever a further split no longer
helps. Credit default was left out because the corpus already has a loan-default case. The counts
are invented and the source says so in a comment.

**Family.** The drawing shares with the taxonomy exemplar (question tree):
- the font stack, ink, line and muted colours, and the title at 20 px, weight 600, top left;
- the legend at top right;
- orthogonal edges with a 28 px stem, a shared rail, 6 px corners and arrowheads;
- branch words beside each drop, on the side away from the parent;
- all leaves on one bottom row, with gaps that grow with the height of the split between them;
- outcome cards with a coloured header naming the class, a tinted body and a 6 px radius.

It differs where machine-learning trees read differently:
- **Split nodes.** Neutral rounded rectangles, the sklearn and rpart shape, instead of hexagons.
- **Branch words.** True and False (the sklearn wording), instead of Yes and No.
- **Numbers on every node.** Sample counts, Gini impurity, a class-mix bar and class counts.
- **Subtitle.** Names the training size, the impurity measure and the depth.
- **No step numbers.** People refer to a leaf by its class and its path.
- **Colour.** Here it means the predicted class, not urgency.

**Layout.** Top to bottom. The True branch of every split goes left, the rule sklearn, rpart and
ISLR all follow, and every branch is labelled so the reader never has to remember that rule. Each
split is centred over its first and last child. All seven leaves sit on one row, so the model's
predictions read left to right in one line. Leaf gaps are 18 px between siblings, 30 px between
cousins and 42 px across the root. Split rows are 168 px apart (an 88 px node plus an 80 px gap).

**Palette.** Colour appears on leaf headers, leaf outlines, bar segments and count chips, and it
means only the class.
- Ink `#1F2933`: rules, counts, leaf share line, title.
- Line slate `#3E4C59`: edges, arrowheads, split outlines.
- Muted slate `#52606D`: stats lines, subtitle, legend.
- Split fill `#F0F4F8`; bar track `#D9E2EC`; paper `#FFFFFF`.
- Renews: header `#1D64A8` with white text, outline `#1D64A8`, body `#E7F1F9`.
- Downgrades: header amber `#F2B233` with ink text, outline `#C98A0E`, body `#FFF6DD`.
- Cancels: header `#B42318` with white text, outline `#B42318`, body `#FDECEA`.

Amber and red are the taxonomy exemplar's exact values, so a reader of both sees the same colour
for the same weight of outcome. The good outcome is blue rather than green: blue against orange
and red is the pairing colour-blind-safe palettes (Okabe–Ito) build on. The three classes also
differ in lightness (mid blue, light amber, dark red), so they stay apart in greyscale. The header
word repeats the class name for print and for colour-blind readers.

Contrast, all above the 4.5:1 WCAG AA threshold:
- Header words: white on blue 6.1:1, ink on amber 7.9:1, white on red 6.6:1.
- Ink on every tint and on the split fill: above 12.8:1.
- Muted slate on every tint and on the split fill: 5.6:1 or better.

**Type scale.** One font stack for everything: Inter, then Helvetica Neue, Helvetica, Arial.
- Title: 20 px, weight 600. Subtitle: 12 px, weight 400.
- Split rule: 13 px, weight 600.
- Leaf share ("75% of 520 samples"): 12.5 px, weight 600.
- Stats line: 11 px, weight 400, muted.
- Class counts: 10.5 px, weight 500.
- Leaf header: 10 px, weight 700, capitals, 1 px letter spacing.
- True/False: 11 px, weight 600.
- Legend: 11.5 px.

`<=`, `>=` and `!=` in the source are drawn as ≤, ≥ and ≠. Nothing wraps; a node grows to fit
its longest line, with a 172 px minimum.

**Shape grammar.**
- A split is an 88 px rounded rectangle. From top to bottom: the rule; "2,600 samples · 52% of
  all · gini 0.62" (the root omits its 100%); an 8 px class-mix bar; the class counts.
- A leaf is a 108 px card, all leaves one width. A 22 px header names the predicted class. The
  body reads, top to bottom: the predicted class's share of the leaf ("54% of 780 samples"); the
  leaf's share of all samples and its Gini; the bar; the counts.
- The class-mix bar is one stacked bar per node, segments in class order and class colour, widths
  proportional to counts, on a rounded track. It shows at a glance how pure a node is.
- Each count follows a small chip of its class colour. This replaces sklearn's `value = [a, b, c]`,
  which makes the reader remember the class order.
- Shape tells a rule from a prediction. Colour tells one predicted class from another.
- The legend names the split box and the three classes and explains the bar.

**Numbers.** The generator reads every count from `source.sx` and refuses to draw if any check
fails:
- Every node's samples equal the sum of its class counts.
- A split's two children add up to it class by class. The root's 5,000 samples (3,280 renew, 770
  downgrade, 950 cancel) end in leaves of 780, 520, 700, 600, 1,900, 220 and 280.
- The stated Gini equals 1 − Σp² of the counts to three decimals.
- Every split lowers the weighted Gini of its children. The smallest drop is "Monthly charge ≤
  $90" (0.030) and the largest is "Data used per month ≤ 20 GB" (0.143), so every split is one a
  real CART fit could make.
- Each leaf's class is its majority class.

On the drawing, Gini is rounded to two decimals and percentages to whole numbers. The leaf shares
of all samples (16, 10, 14, 12, 38, 4, 6) add to 100.

The numbers are chosen to show weak predictions honestly. The "Monthly charge > $70" leaf predicts
downgrade for only 42% of its 600 subscribers, and the first leaf predicts renewal for 54% while
32% cancel. The share line and the mixed bar make that doubt visible, where a leaf that only said
"class = downgrades" would hide it.

**Collisions.** The generator measures every string with resvg (the renderer the eval rasterises
with) and checks the following before writing:
- every text box against every other text box, every edge segment, and every node or bar it
  does not belong to;
- each node's text against its own bar;
- each text box inside its own node, with 6 px side and 3 px vertical clearance;
- node against node, with an 8 px clearance;
- every edge segment against every node except its own two ends;
- edge segments of different parents against each other;
- everything inside the canvas margin.

Reported count: 0.

**Departures from the repo standard doc** (`docs/reference/17-DECISION-TREE-STANDARD.md` §3.2,
§4.3, §5.1, §5.4, §8.3).
- **Node fill.** The doc colours every node, splits included, by majority class, with opacity
  rising with purity (the sklearn `filled=True` rule). Here splits are neutral and leaves carry
  their class at full strength. Purity is printed as a percentage and drawn as the bar. Tint
  strength cannot be compared between two cards across the page, pale tints drop out in print,
  and a coloured split node looks like a prediction.
- **Node text.** The doc has five `name = value` lines plus a mini-bar. Here the stats merge into
  one line, the value array becomes coloured counts, and the `class =` line leaves split nodes.
  On leaves the class moves into the header.
- **Branch labels.** The doc puts True/False in the middle of the rail at 10 px, and sklearn labels
  only the root's two edges. Here every branch is labelled beside its drop at 11 px, weight 600,
  with an arrowhead.
- **Edge shape.** The doc bends each edge at the midpoint between parent and child. Here siblings
  share one rail 28 px below the parent, as in the taxonomy exemplar.
- **Leaf row.** The doc uses a tidy tree, with leaves at their own depth. Here all leaves sit on one
  row, the sklearn `export_graphviz(leaves_parallel=True)` and rpart `fallen.leaves` option.
- **Palette.** The doc's default is Tailwind sky, emerald and amber, assigned by class index. Sky
  and emerald are close in lightness, and coloured class text on a tint of the same hue is hard to
  read. Here the classes are blue, amber and red, separated in lightness.
- **Sample-weighted edges** (§5.4, optional in the doc) are not used. Each node already prints its
  count and share of all samples, and variable line weights would compete with the class colour.
- **Additions.** A subtitle (training size, impurity, depth) and a legend. The doc has neither.
- **Rules as labels.** The source writes each rule as a quoted label (`split "Tenure <= 12
  months"`) rather than `feature= op= threshold=`. This is readable for a categorical split such
  as "Contract = month-to-month", and the parser accepts it.

**References**
- scikit-learn, `sklearn.tree.plot_tree`. Node text order: rule, impurity, samples, value, class;
  `filled` colours by majority class; `proportion` shows percentages; `rounded` boxes.
  https://scikit-learn.org/stable/modules/generated/sklearn.tree.plot_tree.html
- scikit-learn, `sklearn.tree.export_graphviz`. `leaves_parallel` draws all leaves at the bottom;
  `rotate` turns the tree left to right.
  https://scikit-learn.org/stable/modules/generated/sklearn.tree.export_graphviz.html
- scikit-learn source, `sklearn/tree/_export.py`. True/False are drawn only on the root's edges,
  True on the left child. The fill's opacity is (p₁ − p₂) / (1 − p₂) from the top two class shares.
  Leaves never show the rule line.
  https://github.com/scikit-learn/scikit-learn/blob/main/sklearn/tree/_export.py
- scikit-learn User Guide, "Decision Trees". What gini, samples, value and class mean; the
  `filled=True, rounded=True` iris example. https://scikit-learn.org/stable/modules/tree.html
- Terence Parr and Prince Grover, "How to visualize decision trees" (explained.ai). Split nodes
  as class-stacked histograms with a threshold wedge; leaf pies sized by sample count with n=;
  hand-picked colour-blind-safe palettes per class count; grey text and hairline edges; a critique
  of sklearn's unexplained colours and Gini clutter. https://explained.ai/decision-tree-viz/
- dtreeviz repository (parrt/dtreeviz). Classifier legend; < and ≥ on edges.
  https://github.com/parrt/dtreeviz
- TensorFlow Blog, "Visualizing and interpreting decision trees" (2023). A dtreeviz penguin tree:
  descend left when the value is below the threshold; leaves as class pies.
  https://blog.tensorflow.org/2023/06/visualizing-and-interpreting-decision.html
- Stephen Milborrow, rpart.plot `prp` reference. `yesno=1` writes yes/no only at the top split;
  `left=TRUE` puts the condition-true branch on the left; `extra=104` shows per-class probabilities
  plus the percentage of observations; `fallen.leaves` puts leaves at the bottom; `box.palette`
  colours boxes by fitted class. https://search.r-project.org/CRAN/refmans/rpart.plot/html/prp.html
- rpart.plot `rpart.plot` reference. `type` options for where split labels go.
  https://rdrr.io/cran/rpart.plot/man/rpart.plot.html
- Daniel Kaplan, Math 253 notes "Trees for Regression and Classification" (following ISLR ch. 8).
  The split rule sits at each internal node, the left branch is where it holds, and leaves carry
  the predicted class. https://dtkaplan.github.io/math253/Class_notes/711-Trees.html
- sci-draw, "Okabe-Ito Colorblind-Safe Palette". Orange `#E69F00`, sky blue `#56B4E9`, blue
  `#0072B2`, vermilion `#D55E00`, distinguishable under the common colour-vision deficiencies.
  https://sci-draw.com/blog/colorblind-safe-palettes-okabe-ito-reference
