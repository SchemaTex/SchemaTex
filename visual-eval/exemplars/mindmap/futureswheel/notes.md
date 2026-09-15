# Mind map, futures wheel — exemplar drawing

**Scenario.** What follows if a four-day work week becomes standard. The change sits in the
middle; five first-order consequences surround it (Three-day weekends, Longer working days,
Fewer commuting days, Services still open five days, Easier hiring and retention); each has
two second-order consequences, and one of each pair leads to a third-order consequence. 21
events in all. The topic is familiar without specialist knowledge, it is a real policy
question foresight teams run workshops on, and it naturally mixes good, bad and uncertain
effects — so it reads like a futures wheel rather than a disguised outline. One third-order
event per branch keeps all three rings in use while staying readable at a glance.

**Layout.** Concentric rings, one per order of effect: the central change at the middle,
first-order consequences on a ring of radius 262 px, second-order on 462 px, third-order on
628 px. Every oval's centre sits exactly on its ring, so the ring passes behind it. The five
first-order events are spaced evenly (72° apart, first one straight up). Each second-order
event sits 18° either side of its parent, so a branch stays inside its own slice of the
wheel and never reaches into a neighbour's; a single third-order child continues on its
parent's angle. Connectors are straight segments between oval edges, stopping 2.5 px short
of each outline. The bottom of the wheel is the one direction no connector uses, so each
ring carries its name there ("FIRST ORDER", "SECOND ORDER", "THIRD ORDER"). A three-row key
in the lower-left corner shows which line style means which order. Canvas 1383 × 1352.

**Palette.** Shared with the mind-map family: white ground; the central change is ink
`#1F2933` with white text; branch hues in declaration order steel blue `#3A6EA5`, teal
`#2F8B77`, olive `#6E8B3D`, ochre `#C08A2E`, terracotta `#B4544A`, each carried through
that branch's whole chain (connector, outline, fill); second-level text `#2B3440`,
third-level `#5A6472`. Specific to the wheel: ring guides are a pale grey `#D6DCE3` (1.6 px
for the first ring, 1.3 px for the outer two), ring names are `#8A94A1`.

**Type scale.** Shared with the map exemplar: central change 18 px bold, first order 14 px
semibold, second order 13 px, third order 12 px, all in the Inter / Helvetica stack; ring
names 11 px semibold uppercase with 0.6 px letter-spacing; key 12 px. A label wider than its
budget (200 / 118 / 118 / 104 px by order) is broken into two lines at the word boundary
that makes the two lines most equal, so ovals stay rounded instead of stretching into long
flat lozenges. Line height is 1.25 × font size.

**Shape grammar.** What the family shares and what the futures-wheel method prescribes are
kept apart:

- *From the mind-map family:* colour means branch, and depth shows as decreasing weight
  rather than as a new colour — the centre is solid ink, first order is solid branch
  hue with white text, second order is the hue at 12 % on white with a 1.6 px outline,
  third order is white with a 1.2 px outline and lighter text.
- *From the futures-wheel method:* every event is enclosed in an oval, including the
  centre, sized so each text line fits inside with margin; consequence order is shown by
  the ring an event sits on *and* by the number of parallel lines joining it to its
  cause — a single line (2.2 px) from the centre to first order, a double line (two
  1.5 px strokes) from first to second, a triple line (three 1.2 px strokes) from second
  to third, strokes 4.4 px apart centre to centre so double and triple stay distinct at
  normal viewing size.
- The map exemplar's tapered ribbons, pills and text-on-underline labels are not used:
  the method draws events as ovals joined by straight spokes, and a ribbon's thickness
  would compete with the line count as the signal for order.
- No arrowheads. Distance from the centre already says which way cause runs, and
  arrowheads on double and triple lines clutter the short spokes.

**Collisions.** Positions are computed, and then every pair of ovals is tested for
overlap with an 8 px margin, every connector stroke is sampled against every oval other
than its two ends (4 px margin), every pair of connectors is tested for crossing, the ring
names and the key are tested against all ovals and connectors, and every oval is checked to
lie inside the canvas. The count is 0. Connectors crossing the pale ring guides are
intended — that is how a spoke reaches the next ring.

**Departure from the standard doc.** §2.1 describes rings, sector containment and
"colour by order", but draws events as text on an underline joined by single straight
spokes, with dashed ring guides. Here every event is an oval, the line count marks order,
and the ring guides are solid, because the oval and the single / double / triple line are
the method's own notation and are what makes the order of a consequence readable along a
chain without counting rings. Colour stays by branch, not by order (as the doc's own
wording "inherited from its root branch" already implies), because order is carried by
ring, line count and fill weight, and branch colour is what lets a reader follow one chain
of effects outward. The method's optional marking of consequences as positive, negative or
uncertain is not drawn: the DSL has no way to state it, and an exemplar must not show
information its source does not carry.

**References.**

- Jerome C. Glenn, "The Futures Wheel", in J. C. Glenn and T. J. Gordon (eds.), *Futures
  Research Methodology — Version 3.0*, The Millennium Project, 2009. Ovals around events,
  rings of primary and secondary impacts, single / double / triple lines by order (§III.A–B,
  Figures 1–4). https://www.millennium-project.org/publications/futures-research-methodology-version-3-0-2/
  — chapter copy: https://www.researchgate.net/publication/349335014_THE_FUTURES_WHEEL
- Future Problem Solving Program International, "Futures Wheel Graphic Organizer", 2024.
  School worksheet: two second-order effects per first-order effect, a distinct colour and
  shape per order. https://resources.futureproblemsolving.org/wp-content/uploads/2024/04/Free-Tool-FPS-Futures-Wheel-Graphic-Organizer.pdf
- OECD, *Strategic Foresight Toolkit for Resilient Public Policy*, 2025. Positive, negative
  or neutral first-order impacts; a ring drawn around each completed order, three rings.
  https://www.oecd.org/en/publications/foresight-toolkit-for-resilient-public-policy_bcdd9304-en.html
- Mind Tools, "The Futures Wheel". Colour-coding each level of the wheel.
  https://www.mindtools.com/a3w9aym/the-futures-wheel/
- KnowledgeWorks, "Futures Wheel: A Tool for Examining Implications of Change". Education
  foresight use; generate both positive and negative implications.
  https://knowledgeworks.org/resources/futures-thinking-now-futures-wheels/
- Wikipedia, "Futures wheel". Levels marked by concentric circles.
  https://en.wikipedia.org/wiki/Futures_wheel
