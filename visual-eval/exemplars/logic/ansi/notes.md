# Logic gate exemplar — 2-bit magnitude comparator

**Scenario.** The circuit every digital-logic course draws once: compare two 2-bit numbers
A = A1A0 and B = B1B0 and produce three mutually exclusive outputs, A>B (GT), A=B (EQ) and
A<B (LT). Ten gates, chosen so the drawing exercises the whole ANSI symbol set — two XORs,
three inverters, a 2-input AND, a 3-input AND, an OR and two NORs — plus real fan-out
(A1, B1, A0, B0, d1, GT and EQ each drive two loads).

**Palette.** Five colours, no more. Ink `#1E293B` — every gate outline, every wire, the title
and the port names. Muted `#64748B` — anything secondary: subtitle, net names on wires, the
MSB/LSB and A>B annotations, the boolean captions. Paper `#FFFFFF` — the fill inside gate
bodies and inversion bubbles, so a wire passing behind a gate is visibly interrupted. Rule
`#E2E8F0` — the two hairlines that fence off the header and the caption. No accent hue: a
schematic earns its hierarchy from weight and size, not colour.

**Type scale.** Title 20/600, port labels 13 (outputs at 600 weight so the three answers read
first), subtitle and captions 11.5, net names 10 with slight letter-spacing. One font stack
throughout (Inter with Helvetica/Arial fallbacks).

**Symbol geometry** follows IEEE Std 91 exactly, all gates on one 60 x 48 body box so the
columns line up: AND is a flat back plus a true semicircle of radius 24 (not a rounded
rectangle); OR/NOR is a concave back arc with two curves meeting at a 90-degree nose; XOR adds
the second back arc 9 px further left and its input wires stop on that outer arc, not on the
body; the inverter is a 42 px triangle; every inversion bubble is r = 5 tangent to the nose.
Stroke weights are fixed: 1.5 for gate outlines, 1.25 for wires, junction dots r = 3.5.

**Layout and collisions** are computed, not eyeballed. Gates sit in five columns by logic depth
(190 / 380 / 570 / 760 / 950) on a 44 px row grid; gate rows are even, so every long horizontal
run travels in an odd row exactly halfway between two gate bodies with 20 px of air on each
side. Vertical jogs get their own channel x inside a column gutter, allocated so that wires in
the same gutter never overlap. A script solves all of this from measured text widths and then
checks every label box against every wire segment, every gate body, every other label and the
canvas margin, plus every wire against every gate it is not attached to: **0 collisions, and no
wire crosses a gate body**. Fan-out is a filled dot; wires that merely cross are drawn plain,
which is the whole reason the legend line sits in the header.

**Departure from the standard doc.** The doc's Section 4.4 says to print the gate type ("AND",
"NOT") under each gate. This drawing does not — in ANSI distinctive-shape notation the outline
*is* the type, and the redundant text is the main thing that makes the current engine output
read as clutter. The label slot is spent on something a reader actually needs instead: the net
name (d1, nB1, e1, g1, g0) above each gate's output wire.
