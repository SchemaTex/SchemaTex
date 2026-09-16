# Question tree exemplar: laboratory chemical spill response

**Scenario.** What a researcher does in the first minute after a chemical spill in a lab. University
environmental health and safety (EHS) offices publish this decision as a yes/no chart and pin it
next to the spill kit. The tree first splits on whether anyone was exposed, then on how bad it is.
It ends in seven actions that differ in who responds and how fast: call 911, get expert help now,
or deal with it in the lab. It has six questions and seven outcomes, three levels below the root,
with real branching on both the Yes and the No side. That is the shape most question trees in the
corpus have. Colour-coding by urgency earns its place, because telling "call 911" apart from "log
it" at a glance is the point of the chart.

A clinical triage tree would carry the same conventions, but the corpus already has a chest-pain
triage case. A spill tree can be checked by any reader without clinical judgement. The spill-size
threshold differs by institution (Texas Tech uses 4 litres, other offices use 1 litre), so the
tree is illustrative, and the source says so in a comment.

**Layout.** Top to bottom. Every question is centred over its first and last child. All seven
outcomes sit on one row along the bottom, so every possible action can be read left to right in a
single line. That includes "Call 911", which leaves the tree one level early and drops straight
down in its own column. Gaps between neighbouring outcomes grow with how high up the split between
them is: 18 px between siblings, 30 px between cousins, 42 px across the root. The two halves of
the tree read as groups without any frame. Question rows are 136 px apart (a 56 px node plus an
80 px gap).

Edges are orthogonal. A 28 px stem runs down from the question to a shared horizontal rail, then
each branch drops to its child. Corners have a 6 px radius, and the arrowhead tip lands exactly on
the child's top edge. Each Yes or No label sits beside its own drop, just below the rail, on the
side away from the parent's stem. It never sits between two sibling drops and never on the line
itself, so it cannot be read as belonging to the other branch. Questions carry step numbers in
reading order (row by row, left to right), so a trainer or an incident report can say "at step 5".

**Palette.** Colour appears only on outcomes and means only urgency.
- Ink `#1F2933`: all node text and the title.
- Line slate `#3E4C59`: edges, arrowheads, hexagon outlines and step-number badges.
- Muted slate `#52606D`: legend text.
- Question fill `#F0F4F8`; paper `#FFFFFF`.
- Emergency: header `#B42318` with white text, outline `#B42318`, body `#FDECEA`.
- Urgent: header amber `#F2B233` with ink text, outline `#C98A0E`, body `#FFF6DD`.
- Routine: header `#2B7A4B` with white text, outline `#2B7A4B`, body `#EAF5EE`.

The three classes follow the red / amber / green order of triage tags, and they differ in lightness as
well as hue: a dark red, a light amber and a mid green. A dark orange for "urgent" would sit too close to
the red to tell apart at a glance. Amber is too light to carry white text, so its header word is set in
ink, and its outline is a darker amber so the box edge stays visible on white.

The header word repeats the class name ("EMERGENCY"), so the drawing still works in greyscale
print and for colour-blind readers. Contrast, all above the 4.5:1 WCAG AA threshold:
- Header words: white on red 6.6:1, ink on amber 7.9:1, white on green 5.3:1.
- Ink on every body tint and on the question fill: above 12.9:1.
- The legend's muted slate on white: 6.5:1.

**Type scale.** One font stack for everything: Inter, then Helvetica Neue, Helvetica, Arial.
- Title: 20 px, weight 600.
- Question: 13 px, weight 400.
- Outcome action: 12.5 px, weight 500.
- Outcome header: 10 px, weight 700, capitals, 1 px letter spacing.
- Yes/No: 11 px, weight 600.
- Step number: 10 px, weight 700, white.
- Legend: 11.5 px.

A label stays on one line if it fits (240 px for questions, 146 px inside a card). Otherwise it
takes the line break that makes its two lines most even, so no label ends on a lone word. Text is
never cut short.

**Shape grammar.**
- A question is a hexagon: 56 px tall, points 18 px deep, width set by its text. The step-number
  badge (radius 9) sits on its left point.
- An outcome is a 168 px card with a 6 px radius. A 22 px coloured header carries the class name
  and a tinted body carries the action. All cards share one size.
- Shape tells a question from an answer. Colour tells one answer's urgency from another's.
- The legend at top right names the hexagon and the three classes.

**Collisions.** The generator reads `source.sx`, measures every string with resvg (the renderer
the eval rasterises with), and checks the following before writing:
- every text box against every other text box, every edge segment and every node it does not
  belong to;
- each question's text lies inside its hexagon's slanted sides, and each card's text inside the
  card;
- node against node, with an 8 px clearance;
- every edge segment against every node except its own two ends;
- edge segments of different parents against each other, which catches crossings;
- everything stays inside the canvas margin.

Reported count: 0.

**Departures from the repo standard doc** (`docs/reference/17-DECISION-TREE-STANDARD.md` §3.3,
§4.4, §5.1).
- **Question shape.** The doc draws questions and answers as the same rounded rectangle told apart
  by fill. Here questions are hexagons, the decision box of the Society for Medical Decision Making
  clinical-algorithm standard. A diamond would hold two lines of text only at roughly twice the
  width.
- **Yes/No placement.** The doc puts lowercase "yes/no" labels in the middle of the horizontal
  branch, where they interrupt the line. Here they sit beside the drop, capitalised.
- **Arrowheads.** The doc has none. Here every branch has one, because a question tree is read in
  one direction.
- **Outcome classes.** The doc has no way to mark what kind of outcome a leaf is. This source
  reuses the ML variant's `classes:` line and `class=` attribute, which the taxonomy parser
  already accepts and ignores. The drawing colours each outcome by that class and adds a legend.
- **Step numbers.** These are an addition. They are derived from the tree, so the source needs
  nothing extra.

**References**
- Emergency Nurses Association, *Emergency Severity Index Handbook, Fifth Edition* (2023), Figure
  2-1. Lettered decision points; Yes/No written beside the arrows; outcomes as distinct filled
  markers. https://media.emscimprovement.center/documents/Emergency_Severity_Index_Handbook.pdf
- Society for Medical Decision Making, "Proposal for clinical algorithm standards", *Medical
  Decision Making* 12(2), 1992. Decision box a hexagon, action box a rectangle, clinical-state box
  a rounded rectangle; schemes for arrows and box numbering. https://pubmed.ncbi.nlm.nih.gov/1573982/
- World Health Organization, *Emergency Triage Assessment and Treatment (ETAT)* participant manual
  (2005). Red for emergency, yellow for priority, green for queue.
  https://iris.who.int/bitstream/handle/10665/43386/9241546875_eng.pdf
- CHEMM (US HHS), START Adult Triage Algorithm. Each outcome is a colour tag that also carries a
  word (Immediate red, Delayed yellow, Minor green, Expectant black).
  https://chemm-cms.beam.hhs.gov/incident-primer/triage/start-triage
- NICE traffic-light system for feverish children, as summarised in "Accuracy of the NICE traffic
  light system in children presenting to general practice" (PMC9119811). Green means manage at
  home, amber means assess or send home with safety-net advice, red means urgent referral.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9119811/
- Texas Tech University EHS, "Does your spill require EHS response?" Yes/No questions with
  labelled exits; yellow outcome for "evacuate and call EHS", green for "clean up yourself"; the
  4 litre threshold and the trained-responder question.
  https://www.depts.ttu.edu/ehs/academicsafety/labsafetydocs/SpillResponseFlowchart.pdf
- MIT EHS, "Chemical Spills Action Flow Diagram". Minor spill versus STOP major spill; call EHS.
  https://ehs.mit.edu/wp-content/uploads/2019/09/Chemical_Spill_Action_Flow_Diagram.pdf
- ISO 5807 flowchart symbols guide (useworkspace.dk). Label every exit of a decision; read top to
  bottom, left to right. https://www.useworkspace.dk/en/blog/iso-5807-flowchart-symbols-guide
- ISO 3864 (Wikipedia). Safety colours: red for danger and fire, yellow for warning, green for a
  safe condition. https://en.wikipedia.org/wiki/ISO_3864
- "How to Make a Dichotomous Key" (sci-draw.com). Each couplet is a pair of mutually exclusive
  choices, and every choice leads to another numbered couplet or to a final identification.
  https://sci-draw.com/blog/how-to-make-a-dichotomous-key
- ITU Online, "Essential Troubleshooting Flowcharts for Entry-Level Support Technicians". Direct
  yes/no questions, every branch ends in a next step, keep the chart short enough to use live.
  https://www.ituonline.com/blogs/essential-troubleshooting-flowcharts-for-entry-level-support-technicians/
