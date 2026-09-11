# P&ID exemplar — vessel level control with high-level shutdown

**Scenario.** The drawing every process-control course starts with, and the one plants
actually argue over: a surge vessel whose level is regulated by a DCS loop, plus a
high-level trip that closes the inlet through hardwired logic the DCS cannot reach.
Nine pieces of equipment, five instruments and five line types — enough to exercise the
symbol set, and chosen so the sheet has to make one specific thing obvious: **the
regulating path and the trip path never touch each other.** LT-101 senses the vessel,
reports to LIC-101 in the control room and modulates LV-101 on the outlet. LSHH-202
senses the same vessel and trips XV-202 on the inlet through interlock I-202. If a
reader can follow those two independently, the drawing has done its job.

**Palette.** Ink only. A P&ID is a construction document that gets printed, marked up in
pen and faxed at 2 a.m.; colour is not part of its language and anything that depends on
colour is lost on the first photocopy. Ink `#1E293B` for every symbol, pipe, signal and
tag; muted `#64748B` for what is secondary — equipment service names, the relief set
pressure, the legend, the field/control-room labels, the sheet note; paper white *fill*
inside every symbol, so a line passing behind a vessel or a valve is visibly interrupted
rather than ambiguously merged; `#E2E8F0` hairlines fence off the header and the legend.

**Type scale.** Title 20/600. Equipment and valve tags 12/600 — the tag is the thing a
reader looks up, so it is bolder than the words beside it. Service names, notes and
legend 11.5 regular. Instrument tag letters 11.5/600 over the number at 11.5 regular,
with the letters shrunk to fit when the tag runs to four characters (LSHH). Line-number
tags 9.5 with slight letter-spacing, in a white box on the pipe.

**Symbol geometry.** Every valve is the same 44 × 28 bowtie, and the *type* is whatever
sits on top of it: nothing for a manual gate valve, a swing flapper for the check valve,
a 26 px square marked S for the solenoid, a 40 × 14 half-dome for the diaphragm. Fail
position (FC, FO) is set beside the actuator, never inside it. The relief valve is the
same bowtie turned vertical with a drawn spring above it and a discharge arrow to
atmosphere. Tanks are a rectangle closed by a 26 px dome; the vessel is a shell closed
by 2:1 elliptical heads; the pump is a 60 px circle with the impeller triangle pointing
at the discharge. Instrument bubbles are all r = 18: a plain circle in the field, and a
circle carrying an inscribed hexagon plus a horizontal line through the full diameter
for a shared-display controller. Line weight is fixed: 2.5 process, 1.5 minor process,
1.6 symbol outlines, 1.4 every signal.

**Line language.** Five types, and each is told apart by decoration rather than colour:
heavy solid for process piping, light solid for the minor relief line, dashed for
electric signals, short 45° slashes for pneumatic, dotted for capillary sensing lines.
The legend along the bottom edge draws all five at the weight they actually appear, so
it can be checked against the sheet rather than believed.

**Layout.** Process flow runs strictly left to right along one header at y = 640, with
the pump and its suction dropped to a second run below so the vessel drains downward the
way it does in the plant. Feed enters V-101 over the top, which is what keeps the inlet
line off the vessel body. Instruments sit next to what they measure, not next to what
they control, and their signal lines are routed independently of the piping. A dash-dot
divide runs the width of the sheet: everything above it is in the control room,
everything below is in the field — so LIC-101 being a DCS function is a matter of where
it sits, not only of the tick inside its bubble.

**Two departures from `docs/reference/22-PID-STANDARD.md`.** §4.1 marks a control-room
instrument with a horizontal line through the bubble, and that line is drawn — but the
sheet also carries the explicit field/control-room divide, because one tick inside a
36 px circle is not what a reader actually navigates by. §2.3 puts the crossing jumper on
the *lower* line; here the jumper goes on the light sensing line and the heavy process
line stays unbroken, because a break in a process line is the one thing a reader will
misread as a discontinuity in the pipe.

Every label was checked against every other label, every line and the sheet edge before
the drawing was written: **0 collisions.**
