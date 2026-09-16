# Ladder exemplar — drill-station spindle and tool life

**Scenario.** A small drilling station's `SpindleAndToolLife` routine in
`DrillStation`, called every 10 ms by `MainTask`. The operator starts the
spindle with a fresh Start edge; its own output seals around the Start branch.
Stop, a lost safety/drive permissive or a spindle fault breaks that seal. A
non-retentive TON allows three seconds to reach speed and detects a sustained
loss of speed. A drive trip or timeout latches SpindleFault. A CTU counts one
finished part per CycleDone rising edge; at 500 parts the station withdraws
permission to start another cycle. A GEQ comparison lights ToolWarnLamp at 450
parts, giving the operator advance notice to prepare a replacement. A deliberate
tool reset is accepted only with the run command off, AtSpeed false and no
active cycle. The adjacent sequencer owns clamp/feed motion and safe standstill;
this is a complete spindle/tool-life routine, not the entire machine program.

**Control details.** StopOK and SafetyOK are healthy-high input aliases, so their
instructions are XIC, even though the field Stop device has a normally closed
contact. DriveReady means available to run, including while running. Start_OS is
a dedicated BOOL storage bit. Its ONS precedes all permissives: a held Start
cannot restart the spindle after a permissive returns. Fault reset is above fault
set, making active faults dominant. The timer reads the previous scan's SpindleRun;
monitoring begins at most one 10 ms scan after the command. CycleDone must stay
true for at least one task scan and return false between parts. CTU already detects
the rising edge, so no redundant ONS is inserted before it. Counting is independent
of SpindleRun so a completed final part is not lost when the operator stops.
The CTU and reset execute before FeedPermit, so reaching 500 withdraws the
next-cycle permissive in the same scan. The sequencer consumes FeedPermit
after this routine and only to authorize a new cycle.
ToolLife is retained between ordinary stops; only RES resets it. AtSpeed false is
not proof of safe standstill; tool replacement follows the machine's isolation
procedure. The independent safety relay operates drive STO.

**Palette.** Four named literal colours, no accent hue and no online-state
highlight. Ink `#20272B` is every symbol, wire, rail, tag and primary title.
Muted `#59636B` is comments, parameter captions, rung numbers and sheet notes.
Rule `#CBD1D6` is the two sheet dividers and block header dividers. Paper
`#FFFFFF` is the canvas and instruction interiors. Colour never distinguishes
logical truth or equipment status in this offline plate.

**Type scale.** Title 25/600; tag and instruction labels 14/600; rung comments
14/400; routine path and block operand rows 13; sheet notes and status qualifiers
12. All text uses one stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif.
Inter provides clean technical labels; Helvetica Neue is its closely matched
fallback on this workstation. The measurement and raster passes use that same
installed font, including semibold, through resvg. No monospace tag exception,
CSS variable, shadow, tinted card or rounded instruction block.

**Symbol geometry.** Power rails are 3 px, rung/branch links 1.5 px, symbol outlines
2 px and editorial rules 1 px. NO contacts are two 28 px blades 14 px apart; NC
adds a single diagonal between them. Every output/latch/unlatch/status coil uses
the same pair of half ellipses: horizontal radius 8, vertical radius 16, 44 px
total width. Wires meet their outer midpoints exactly, never an arc endpoint or
the empty interior. L and U are AB retentive bit qualifiers. ONS and RES share a
58 × 28 px open bracket geometry, with 6 px inward tips. Rectangular TON/CTU
instructions share a 244 × 116 px body and 23 px operand-row pitch. GEQ uses the
same instruction geometry with one fewer operand row, hence 93 px height; its
header gives both the mnemonic and the comparison operator, with Source A and
Source B immediately below. Its output passes comparison truth to the lamp.
The timer/counter's named
EN/DN and CU/DN status terminals use the same coil geometry, on 42 px pitch; the
lower DN terminates as a status symbol, without an invented connection to the
right rail. Branches split and merge at explicit orthogonal T joints, on 66 px
vertical pitch. There are no ambiguous crossings. Tags clear symbol tops by
11 px or more; columns are chosen around full measured tag widths.

**Layout and collisions.** The sheet is 1320 × 1358, with the output column at
x=1136, rails at x=80/1240, and the instruction/status region
aligned to the right. Rung bands expand only for a branch or instruction block.
The script shapes each text string with resvg and uses the resulting actual ink
bounds plus a 2.5 px clearance. It checks every text against every other text,
every symbol, every line segment (including outlines, diagonals and sampled coil
arcs), and the canvas. Text that belongs inside a symbol must fit an explicit
inset interior and still clear all of its outline segments. Every line is checked
against every unrelated symbol; attached lines must end at a declared port and
cannot enter the body. It also checks body/body collisions, canvas containment,
dangling wires, coincident connections and ambiguous crossings. It refuses to
write on any failure. This run checked 3741 text pairs,
3132 text/body pairs, 112230 text/segment pairs,
46440 line/body pairs and 72 attached
endpoints: **0 collisions**. The final SVG is rasterised by resvg at 1600 px wide
to the requested scratch path for visual inspection.

**Departures from the reference document and DSL limits.** The house style uses
IEC LD rails, links, NO/NC contacts and coil geometry with a consistent
Allen-Bradley instruction dialect. It is not a claim that AB mnemonics are IEC
keywords. Unlike the repository reference's IEC S/R qualifiers, this plate uses
AB L/U; unlike its arrow contact and Boolean R coil, ONS and RES use AB brackets.
The standard doc's illustrated coil leads do not meet the curve extremities;
this drawing corrects that geometry. The doc's 9 px tags and 60 × 50 blocks are
expanded for legibility. Rung numbers are zero-based, three-digit AB-style labels.

TON and CTU are the native AB ladder instructions: Timer/Counter, Preset and Accum
operands, with EN/DN or CU/DN status terminals. They are not IEC function-block
instances with IN/PT/Q/ET or CU/R/PV/Q/CV pins. A counter reset is a separate RES
instruction, not a Boolean reset coil or an invented CTU R terminal. Preset 3000
means 3000 ms for a TIMER; preset 500 means 500 completed parts. Accum 0 is an
offline initial value, not a claimed live measurement. IEC negated/S/R coils,
P/N edge contacts and pin modifiers are deliberately absent:
mixing alternate dialects or unnecessary logic into the routine would weaken
the exemplar. All seven Tier 1 inventory families appear. Ten Tier 2 capabilities
appear when the comparison family is represented in its AB dialect: comparison,
instruction body, block terminal, AB L, AB U, AB inline instruction, AB status
terminal, rung number, tag annotation and rung comment. GEQ is specifically the
AB boxed comparison, not IEC Table 75's compare-contact glyph; the inventory's
strict IEC glyph count is therefore nine of eighteen. RES belongs to the
inline-instruction family and is not double-counted as an IEC R coil.

The same eight rungs, tag names, branches and instruction parameters are in
source.sx. Every path uses the parser's required branch: wrapper, with no var
declarations. PRE and ACC survive as generic function-block parameters. The DSL
requires an extra first positional label for GEQ; ToolLife.ACC is used there and
as IN1, with IN2=450. It denotes the source operand, not a fictitious GEQ instance.
The DSL
cannot request AB L/U or bracketed ONS/RES glyphs, nor express status pins,
terminal attachment geometry, the font/spacing system, task metadata, retention
or I/O polarity declarations. Its current renderer shows S/R, an arrow contact
for ONS, an R coil for RES, and nameless inline block connections. These are
renderer/DSL limits, not substitute logic in ideal.svg. The DSL is a diagram
description, not executable PLC code. Validation returned true with no
diagnostics using renderResult(source, {type: 'ladder'}). The installed
vite-node 2.1.9 does not implement the requested -e option (it reports "No files
specified"), so the same check was run through ViteNodeServer/ViteNodeRunner
from stdin, without adding a helper file.

**References.** IEC 61131-3:2013 §8.2 supplies the LD framework; vendor-specific
instruction behaviour and notation are checked against Rockwell's
[bit instructions](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/bit-instructions1.html),
[TON](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/timer-and-counter-instructions/timer-on-delay--ton-.html)
and [CTU](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/timer-and-counter-instructions/count-up--ctu-.html)
documentation, plus the [AB comparison instruction reference](https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1785-rm001_-en-p.pdf)
for GEQ's Source A / Source B form. No unverified NEMA clause is asserted.
