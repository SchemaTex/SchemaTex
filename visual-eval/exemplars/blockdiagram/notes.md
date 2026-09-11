# Exemplar notes — block diagram

**Scenario.** The speed-control loop of a robot-joint servo drive, the picture an electrical
engineer puts on the wall at a design review. A motion command meets the measured joint speed at
a summing junction; the error runs through the digital control chain (PID, current limiter, PWM
modulator), into the power stage (gate driver, three-phase MOSFET inverter), then through the
BLDC motor and gearbox to the joint output. A quadrature encoder and a speed estimator carry the
measurement back to the junction. Eleven blocks, one summing junction, one feedback loop.

**Palette.** Ink `#16202B` for every outline and block label; slate `#63707F` for signal names,
subsystem titles and the legend; rule `#C9D2DC` for the hairline under the title and the dashed
subsystem frames (filled `#FAFBFC` so the bands read as regions, not as boxes); one accent,
terracotta `#B4462A`, used only for the feedback path — its wires, the two sensing blocks, and
the minus sign at the junction. Everything else is ink on white.

**Type scale.** Title 22 semibold, subtitle 12.5, block label 13 (medium, at most two lines),
signal name 11.5 italic with true subscripts, caption 11. One corner radius for blocks (4) and
one for frames (10); stroke 1.5 for blocks and wires, 1.1 for frames; 8 px spacing unit.

**Geometry.** Summing junction is a 34 px circle with the reference entering left (+) and the
feedback entering the bottom (−), signs set just outside the circle at the input. Every wire is
orthogonal and every arrowhead lands exactly on the block edge (solid 9×7 triangle). The pickoff
on the output line is a 3.5 px filled dot, the standard branch-point symbol.

**Layout.** The chain is nine blocks long, so a single row would only be readable on a very wide
canvas. It is folded into two left-to-right rows joined by a labelled forward run in its own
channel between them; the feedback returns in a third channel below everything and rises to the
junction in a lane deliberately kept clear of the lower row. The result has **zero wire crossings**
and, by the checker, zero label collisions: label boxes were tested against every wire segment,
every other label, every block body and the canvas edge.

**Departure from the standard doc.** The doc documents a `boundary "…":` statement for subsystem
frames, but the parser does not implement it — the two dashed subsystem frames are drawn here
because the convention requires them, and cannot yet be expressed in the DSL.
