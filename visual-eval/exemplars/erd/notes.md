# ERD exemplar — storefront schema

**Scenario.** The database behind an online store, drawn the way a backend engineer or data
architect would hand it to a team: nine tables covering customers, addresses, the catalogue,
orders, money and shipping. It exercises everything the notation has to say — `ORDER_LINE` is an
associative table that resolves the many-to-many between `ORDER` and `PRODUCT`, `CATEGORY` points
at itself for parent categories, and all four crow's-foot cardinalities appear at least once.

**Palette.** The drawing is white paper with one dark ink for structure and two solid accent
chips; nothing else has a hue. `#334155` dark slate draws every table outline, every relationship
line and every crow's-foot symbol, at a single 1.5px weight — structure is one colour and one
thickness. `#0f172a` near-black for the title, the table names and the column names; `#475569`
slate for data types and relationship verbs, which are secondary and should recede. Rules come in
two strengths: `#f1f5f9` for the faint dividers between column rows, `#94a3b8` where a line has to
be seen — the rule closing the primary-key block, the rule under the title, the legend border.
Keys are the only saturated marks on the page: a solid `#2563eb` blue chip for `PK` and a solid
`#d97706` amber chip for `FK`, both with the letters knocked out in white. Table headers are white
with the name centred over a slate rule, not a filled band — nine filled headers would turn the
page into nine dark bars and read as a 1990s database-tool export. The result is an airy card
look: the eye lands on the schema, and the only things that shout are the keys.

**Type scale.** 20px semibold title / 13px semibold table name / 12px column names (semibold and
underlined on primary-key rows, which is the standard way to mark a key in the column list) and
12px types / 10.5px captions and legend / 10px bold white key tags. One corner radius (4px), one
spacing unit (8px), and a single 1.5px weight for every box outline, relationship line and
cardinality symbol; hairline rules are 1px.

**Symbol geometry.** Cardinality is read at the end of the line nearest the table it describes.
The crow's foot is three tines 12px long spreading 7px either side, its toes touching the box edge;
the modifier sits 8px further out along the line — a 13px perpendicular bar for mandatory, a 4px
open white-filled circle for optional. So: bar = exactly one, circle = zero or one, bar + foot =
one or many, circle + foot = zero or many. A legend at the bottom right repeats all four against a
stub of table edge.

**Layout and collisions.** Tables sit on a 3x3 grid with the hub table `ORDER` in the centre; every
column shares one width so the boxes align. Relationship lines are orthogonal with at most two
bends and always leave from the side facing their target. Positions come from a script that
measures text (0.55x font-size per character, 0.6 bold) and then checks every verb label against
every table box, every line segment, every other label and the canvas edge: 0 overlaps. Verbs are
placed beside their line rather than on it, and still carry a white halo as insurance.

**Departure from the standard doc.** None on symbols — this follows the doc's crow's-foot table
exactly (single bar for mandatory, single circle for optional). The one addition is the legend,
which the standard does not require but which every published crow's-foot diagram carries.
