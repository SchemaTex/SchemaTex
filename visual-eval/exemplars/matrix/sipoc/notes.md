A SIPOC for B2B order fulfilment, the one-page scoping table a Six Sigma team builds in the Define phase of DMAIC before it measures anything. It follows ASQ's SIPOC convention: five columns in the fixed order Suppliers · Inputs · Process · Outputs · Customers, a Process column of roughly five to seven high-level steps (six here), and an explicit start and stop point that fixes the scope of the process ([ASQ SIPOC job aid](https://asq.org/quality-resources/articles/sipoc-job-aid?id=232019f796fc447dad7cdb2cf242f48a), [ASQ, Developing SIPOC Diagrams](https://asq.org/quality-resources/articles/developing-sipoc-diagrams?id=6d0b7d9b494c40efbe3319afaa909d6d); Pyzdek & Keller, *The Six Sigma Handbook*, 5th ed.).

Why it works as the exemplar for this type:

- Each column is one rounded panel with a tinted header carrying a large initial letter, the column name and a one-line plain-language caption, so the S-I-P-O-C reading order is obvious; small chevrons between headers point left to right.
- The Process column is wider than the other four and is the only one in the accent colour. Its steps are numbered white boxes stacked top to bottom and joined by short arrows — a high-level sequence, not a detailed flowchart.
- Scope is drawn, not implied: a dashed outline marks the process boundary, and filled START and END capsules sit on its top and bottom edges with the dashed line breaking around them, so the first and last step read as the edges of the project.
- The four side columns split the body into equal rows, so each supplier sits beside the input it provides and each output sits beside the customer who receives it; a thin divider separates rows and long items wrap inside the column.
- A one-line footnote explains the boundary and the row pairing in words, and the page keeps the matrix family's title and slate subtitle.

The DSL has no way to state the start and end points of the scope; ideal.svg shows them because a SIPOC without them is incomplete, and an engine would need a `start:` / `end:` line to draw them.

Palette: ink #1e293b, slate #475569, panel border #cbd5e1, row divider #e2e8f0, header band #F1F3F6, process accent #24618c, process tint #EAF0F6, paper #ffffff.
