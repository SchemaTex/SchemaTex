# Circuit schematic exemplar — 555 LED flasher

**Scenario.** A 9 V battery runs an NE555 timer as an astable oscillator that blinks a red
LED about once a second. The timer's output does not drive the LED directly: it switches a
2N3904 NPN transistor, which sinks the LED current. It is the circuit most people meet as
their first IC project, and a working engineer recognises it at a glance. It also uses the
whole core vocabulary on one sheet without clutter: a battery, a supply rail and a return
rail with a ground symbol, four resistors, two plain capacitors and one polarised
capacitor, an 8-pin IC with numbered pins, a transistor, an LED, T-junction dots, rail net
labels, and a reference designator and value on every part.

The values are real and consistent. The blink rate is f = 1.44 / ((R1 + 2·R2)·C1) =
1.44 / (137 kΩ × 10 µF) ≈ 1.05 Hz, and the output is high for (R1 + R2)/(R1 + 2·R2) ≈ 50 %
of each cycle; both formulas are from the TI datasheet. The LED current is
(9 − 2.0 − 0.2) V / 330 Ω ≈ 21 mA. R3 gives Q1 about 1.4 mA of base current, so the
transistor is driven well into saturation. C2 (10 nF) bypasses the CTRL pin, as the TI
astable figure does. C3 (100 nF) decouples the supply between pins 8 and 1; the review of
case `circuit-555-astable` flagged its absence as a real design fault.

**Layout.** Signal flows left to right: battery, decoupling capacitor, timing chain, timer,
output resistor, transistor and LED. Positive supply is at the top and ground at the bottom:
a `VCC · +9 V` rail runs across the top (y = 190) and a `GND` return rail along the bottom
(y = 800), with one ground symbol hanging below the return rail. The column order follows
TI's astable figure: R1, R2 and C1 stack vertically left of the timer, and DISCH, TRIG and
THR reach it from that side. TRIG and THR share a short vertical bus, so the timing node
feeds both pins through two T-junctions instead of a four-way. The timer sits in the
middle. OUT, R3 and the transistor base lie on one straight horizontal line, the most
important signal in the circuit. R4, D1 and Q1 stack in one load column on the right edge,
from the supply rail down to the return rail. The four two-terminal parts that span the
rails (BT1, C3, C1, C2) sit on one row so their plates line up.

Labels face open space. A part to the left of the timer is labelled on its outer (left)
side, except C3, which is labelled on its right because BT1's label already fills the space
to its left. Parts on the right of the timer are labelled on their right, and the
horizontal R3 is labelled above. The designator sits on top and the value directly below
it. Both lines are right-aligned when the label is left of the part and left-aligned when
it is right of it, centred vertically on the body, with no leader lines.

**Palette.** Three colours; a schematic takes its hierarchy from weight and size, not hue.
Ink `#17212B` for every wire, symbol, designator, value and pin name. Muted `#52606D` for
secondary text: the subtitle, the IC pin numbers, the polarity `+` marks and the footnote.
Paper `#FFFFFF` for the sheet and as the fill inside the IC body and the transistor
envelope. The LED is not coloured red; its value says so.

**Type scale.** One stack: Helvetica Neue, Helvetica, Arial. Title 28/700. Subtitle 16/400
muted. Designators 19/700. Values 18/400. Rail names 17/700. IC pin names 15/400 inside the
body. IC pin numbers 14/400 muted, outside the body next to the lead. Polarity marks 17
muted. Footnote 15 muted.

**Symbols.** All follow IEEE Std 315 (ANSI Y32.2). Every pin sits exactly on the live
anchor from `src/diagrams/circuit/symbols.ts`, scaled ×2, so a wire that reaches a pin in
this drawing reaches the same pin in the engine.

- **Resistor** (§2.1.1): a zigzag of six strokes, amplitude 11, across the middle 60 px
  of an 80 px pin-to-pin length.
- **Capacitor** (§2.2): plates 40 px long and 8 px apart, the 1:5 minimum ratio that
  §2.2C allows.
- **Electrolytic C1** (§2.2.2): a straight positive plate toward the timing node and a
  curved negative plate toward ground, with `+` beside the straight plate.
- **Battery BT1** (§2.5, "the long line is always positive"): two cells, a long thin plate
  at the + pin and a short heavy plate at the − pin, with `+` marked.
- **Ground** (§3.9.1): a vertical stem and three shortening bars.
- **Transistor Q1**: a circular envelope (r = 36) with a heavy base bar. The collector and
  emitter leads end on their pins just outside the circle, and the NPN emitter arrow points
  outward.
- **LED D1**: a filled triangle with the anode at the top, a cathode bar, and two emission
  arrows pointing away from the junction (§1.3B).
- **U1**: a 224 × 240 rectangle using the engine's functional pin arrangement: DISCH, TRIG
  and THR on the left, OUT and CTRL on the right, VCC and RESET on top, GND at the bottom.
  Following Horowitz and Hill, signal names are inside the outline and pin numbers outside;
  the numbers are the DIP positions taken from the symbol's netlist pin order.

Line weights: wires and outlines 2.5, capacitor plates 3.5, battery short plates 5, the
transistor base bar 4.5. Junction dots have r = 5.

The engine's current battery glyph draws the long plate next to its minus pin. This drawing
follows IEEE 315 and the repo standard doc, which both put the long plate on the positive
pin.

**Collisions and connectivity checks.** `scripts/visual-eval/draw-circuit-exemplar.mjs`
writes the SVG only after all of the following hold:

- Every wire is horizontal or vertical.
- Every wire end lands on a pin or on another wire, and every pin is wired.
- The connectivity worked out from the drawn geometry equals `parseCircuit(source.sx)`: all
  29 pins on 9 nets, **0 mismatches**, and the ground symbol sits on the GND net.
- All 11 junction dots sit on three-branch T-junctions. There is no four-way junction and
  no crossing between different nets.
- No wire enters a symbol body.
- Checked against every other label, every wire, every symbol body, every dot and the
  sheet margin (text widths from the repo's `estimateTextWidth`): **0 label collisions**.

**Departures from `docs/reference/08-CIRCUIT-SCHEMATIC-STANDARD.md`.**

- **Ground.** §1.3 describes earth ground as an inverted triangle over three lines, and the
  engine draws a small sideways glyph. This drawing uses IEEE 315 §3.9.1: a stem and three
  shortening bars, always hanging downward from the return rail.
- **Polarised capacitor.** §1.2 allows a curved plate or a `+`, and the engine prints both
  `+` and `−`. This drawing uses the curved plate plus a single `+`, as IEEE 315 §2.2.2
  shows. A second sign adds text without adding information.
- **Labels.** The engine sets values in muted italic and ties each label to its part with a
  dashed leader. Here the designator is bold, the value upright, and both sit directly
  beside the part. A label that needs a leader to show which part it belongs to is in the
  wrong place.

**Consistency with the reviewed circuit targets.** Kept from the reviewed targets:

- the ink colour `#17212B` and the Helvetica stack;
- the title top-left with a muted subtitle;
- supply and return rails with one ground symbol;
- a bold designator over a regular value;
- zigzag resistors and a circular transistor envelope;
- the 555 pin arrangement of `circuit-555-astable`, with names inside the body and numbers
  outside.

Changed, because the standard says otherwise:

- **Junction dots.** Dots go only where three conductors meet, never on rail corners.
  `circuit-555-astable` also dots the ends of its rails; IEEE 315 §3.1.6.3 and Horowitz and
  Hill use the dot only to mark a real branch.
- **The battery.** It is drawn with the IEEE 315 battery symbol, not as a circled DC source.
- **Resistor shape.** The zigzag is used throughout. Some targets use the IEC rectangle
  (`circuit-potentiometer-dimmer`, `circuit-bridge-psu`,
  `circuit-holdout-instrumentation-amp`); mixing the two on one sheet or across one family
  reads as two standards.
- **Designators.** They stay bare (`R3`, not `R1 GATE`). What a part does belongs in the
  subtitle or the footnote.
- **Weights.** Line and text weights are a notch lighter than most targets (2.5 px wires
  and 18–19 px part text, against 3 px and 21–23 px) at a similar sheet width. Pin numbers
  and pin names then fit beside a 16 px lead without crowding.

**References.**

- IEEE Std 315-1975 / ANSI Y32.2-1975, *Graphic Symbols for Electrical and Electronics
  Diagrams*. Clauses used: 1.3B emission arrows, 2.1.1 resistor, 2.2 and 2.2.2 capacitor
  and polarised capacitor, 2.5 battery, 3.1.5 crossing without connection, 3.1.6.3
  junction, 3.9.1 ground. https://standards.ieee.org/ieee/315_/6396/
- ASME Y14.44-2008, *Reference Designations for Electrical and Electronics Parts and
  Equipment* (replaces IEEE 200). Designators are class letters plus a number: R, C, BT, U,
  Q, D.
  https://www.asme.org/codes-standards/find-codes-standards/y14-44-reference-designations-electrical-electronics-parts-equipment
- Wikipedia, *Reference designator*: the class letters in common use (B/BT battery, U IC,
  Q transistor, D or LED for an LED) and the history of IEEE 200 and ASME Y14.44.
  https://en.wikipedia.org/wiki/Reference_designator
- Wikipedia, *Electronic symbol*: ANSI zigzag versus IEC rectangle resistors, the polarised
  capacitor, the battery, ground variants, and dots marking connections.
  https://en.wikipedia.org/wiki/Electronic_symbol
- Texas Instruments, *xx555 Precision Timers* datasheet (SLFS022), Figure 6-5 "Circuit for
  Astable Operation", equations (3)–(6), the CONT decoupling note, and RESET tied to VCC
  when unused. https://www.ti.com/lit/gpn/NE555
- P. Horowitz and W. Hill, *How To Draw Schematic Diagrams* (from *The Art of Electronics*,
  2nd ed.): connections marked by a dot, no four wires meeting at a point, signals left to
  right, positive supply at the top, pin numbers outside and signal names inside, every
  part labelled. https://xcircuit.sourceforge.net/goodschem/goodschem.html
- Flux, *PCB Schematic Design Best Practices*: inputs left and outputs right, positive
  supply up and ground down, split four-way junctions into two T-junctions, named nets for
  power. https://www.flux.ai/p/blog/pcb-schematic-best-practices
