# Exemplar notes — block diagram

**Scenario.** The hardware block diagram of a battery-powered greenhouse climate node, the kind
printed on page one of a vendor reference design or a board design review. A Li-ion cell feeds two
regulators: a 3.3 V buck for all logic and radio, and a 5 V boost for the vent fan. Three sensors
(temperature and humidity, CO₂, ambient light) share one I²C bus into the microcontroller; the
light sensor also raises an interrupt line when a brightness threshold is crossed. The
microcontroller drives one SPI bus shared by a flash chip (the local measurement log) and a LoRa
radio feeding the antenna, and a PWM line to a MOSFET fan driver. An SWD debug header plugs in
below it. Thirteen blocks with four real branch points: the battery output (two regulators), the
3V3 rail (six loads), the I²C bus (three sensors) and the SPI bus (two devices).

**Palette.** Ink `#16202B` for block outlines, labels and data wires; slate `#63707F` for signal
names, part numbers, subsystem captions and the legend; rule `#C9D2DC` for the hairline under the
title. Power is the one warm line colour, `#C2410C`, used for every rail wire, its arrowheads, its
junction dots and the rail names — so the power tree reads as its own layer on top of the data
wiring. The interrupt is a slate dashed line. Block fills are the engine's own role fills, one per
subsystem: power `#FFEDD5`, sensing `#F3E8FF`, compute `#DBEAFE`, storage and radio `#ECFCCB`,
actuation `#DCFCE7`. Each subsystem frame is a much lighter wash of the same hue with a slightly
darker edge, so the regions are visible without competing with the blocks.

**Type scale.** Title 22 semibold, subtitle 12.5, block name 13 medium with an optional second line
at 11 slate for the part number, signal and rail names 11.5 (rail and bus names semibold, signal
names italic), subsystem caption 11 semibold with wide letter spacing, legend 11. One corner radius
for blocks (4) and one for frames (10); strokes: blocks and data wires 1.5, power rails 2.5, bus
trunks 3, frames 1. 8 px spacing unit; blocks are 56 px tall on an 80 px row pitch.

**Geometry.** Every wire is orthogonal. Arrowheads (solid 9 × 7 triangles) land exactly on the
receiving block's edge. A bus is one thick vertical trunk with thin horizontal taps to each device
— never a separate wire per device and never a pill-shaped bus node; the bus name (I²C, SPI) sits
once above its trunk. Taps from I²C sensors carry no arrowhead because the bus is shared; the single
drop into the microcontroller does. A junction dot (3.5 px power, 4 px bus) marks every tee; plain
corners get no dot. Rail names 3V3 and 5V appear once, at the start of the trunk, not on each tap.
Power enters the sensors lower on their left edge than the I²C taps leave their right edge, so the
two layers never share a row.

**Layout.** Signal flow runs left to right in five columns: power, sensing, compute, then storage,
radio and actuation. Buses live in the two gutters between columns (I²C left of the
microcontroller, SPI right of it), so every tap is a short straight stub. The 3V3 rail rises in the
gutter between power and sensing, runs along a clear channel above all frames and drops straight
into the tops of the microcontroller, flash and radio; the radio is wider than the flash so its drop
passes beside the flash rather than through it. The microcontroller is only as tall as its five
attachment points need (two sensor rows): I²C and the interrupt on the left at a quarter and three
quarters of its height, SPI mid-right, SWD and PWM on the bottom edge. The interrupt passes below
the end of the I²C trunk and steps up to its pin, so it never crosses the bus. The 5V rail runs in
a channel directly under the sensing and compute frames and rises into the fan driver. The legend
is a single row under a hairline, below every frame and wire. The result has **zero wire crossings**. The script checks every label against every
other label, block, wire, junction dot and the canvas edge, confirms each block sits inside its
frame, that every tee has a dot, and that attached wires end on the block edge; it refuses to write
on any failure.

**Departures from the DSL.** The DSL has no bus-trunk, power-rail or subsystem-frame statement
(the standard doc describes `boundary "…":` but the parser does not implement it). In source.sx
rails and buses are therefore `signal()` nodes that every device connects to, and the power blocks
use `role: disturbance` only because that role carries the orange fill. The engine cannot draw a
single trunk with taps, a distinct power line colour, the part-number second line in slate, or the
frames; those are drawn here because hardware block-diagram practice requires them.

**References.** IEEE Std 315 / IEC 60617-2 for signal-flow direction and the filled-dot junction
convention; the system block diagrams on the first pages of TI, ST, Nordic and Espressif datasheets
and reference designs for rails-on-top power trees, shared-bus trunks and per-subsystem tinting.
