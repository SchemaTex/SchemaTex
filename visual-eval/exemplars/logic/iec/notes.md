# Logic gate exemplar (IEC) — 2-bit magnitude comparator

**Scenario.** The same circuit as the ANSI exemplar, so the two sheets can be laid side by side:
compare two 2-bit numbers A = A1A0 and B = B1B0 and produce A>B (GT), A=B (EQ) and A<B (LT).
Ten gates — two exclusive-ORs, three inverters, a 2-input AND, a 3-input AND, an OR and two NORs —
with the same fan-out (A1, B1, A0, B0, d1, GT and EQ each drive two loads). Every gate, wire,
junction, net name and caption sits at the same coordinate as on the ANSI sheet; only the gate
symbols differ.

**Palette.** Five colours, the same as the ANSI sheet. Ink `#1E293B` — gate outlines, qualifying
symbols, wires, title and port names. Muted `#64748B` — subtitle, net names, MSB/LSB and A>B
annotations, boolean captions. Paper `#FFFFFF` — gate and negation-circle interiors, so a wire
never shows through a symbol. Rule `#E2E8F0` — the header and caption hairlines. No accent hue.

**Type scale.** Title 20/600, port labels 13 (outputs 600), qualifying symbols 13/600, subtitle and
captions 11.5, net names 10 with 0.4 letter-spacing. One font stack (Inter with Helvetica Neue,
Helvetica and Arial fallbacks).

**Symbol geometry** follows IEC 60617-12. Every element is a 44 px wide rectangle: 48 px high for
two inputs, 60 px for the three-input AND, 44 px for the single-input inverter, so input pins keep
the ANSI sheet's 24 px pitch and never land on a corner. The qualifying symbol is centred in the
upper part of the rectangle: `=1` exclusive-OR, `&` AND, `≥1` OR, `1` buffer. Inversion is the
negation indicator — an r = 5 circle tangent to the output edge — not a separate symbol, so NOT is
`1` with a negated output and NOR is `≥1` with a negated output. No gate carries a type word
underneath: the qualifying symbol already names the function. Stroke weights match the ANSI
sheet: 1.5 for outlines and negation circles, 1.25 for wires, junction dots r = 3.5.

**Layout and collisions.** Five columns by logic depth (input edges at 190 / 380 / 570 / 760 /
950), 44 px row grid, long runs in the odd rows between gate bodies, vertical jogs in allocated
gutter channels — identical to the ANSI sheet. Because the rectangles are narrower than the
distinctive shapes, each output wire simply starts a little further left. The generator measures
every string with resvg and refuses to write unless every text box clears every other text box,
every wire and every gate body; every qualifying symbol stays inside its own rectangle; no wire
crosses a gate it is not attached to; each gate has exactly its declared number of inputs, none
at a corner; and all wires are orthogonal. Result: **0 collisions**.

**Standard and departures.** IEC 60617-12:1997 *Graphical symbols for diagrams — Part 12: Binary
logic elements* (the same rectangular-shape form appears in IEEE Std 91-1984): AND, OR,
exclusive-OR and buffer elements identified by their qualifying symbols, with the negation
indicator on the output.
The polarity-indicator (triangle) convention is not used: this sheet is drawn in single-logic
convention, where the negation circle is the correct mark. The doc's suggestion to print gate
names under each symbol is not followed, for the same reason as on the ANSI sheet.

## References

- IEC 60617-12:1997, Graphical symbols for diagrams — Part 12: Binary logic elements — https://standards.globalspec.com/std/896209/iec-60617-12
- EN 60617-12:1998 catalogue entry (scope: symbols for logic functions and devices) — https://standards.iteh.ai/catalog/standards/clc/2284f1bd-677f-4d36-8c73-e21d3eba4254/en-60617-12-1998
- "ANSI vs IEC Logic Symbols: A Schematic Reading Guide", DigiSim.io (rectangles with & and ≥1; negation circle vs polarity wedge) — https://digisim.io/blog/decoding-digital-logic-mastering-ansi-vs-iec-symbols-on
- "Logic Gate Symbols: The Complete Chart", JLCPCB (IEC =1 exclusive-OR, 1 buffer with negated output for NOT) — https://jlcpcb.com/blog/logic-gate-symbols-guide

Palette: ink #1E293B · muted #64748B · paper #FFFFFF · rule #E2E8F0
