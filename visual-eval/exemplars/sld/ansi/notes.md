# Single-line diagram exemplar (ANSI) — 12.47 kV primary service with standby generator

**Scenario.** A commercial building (a distribution center) served at medium voltage: the
utility's 12.47 kV supply, the utility revenue meter, a 15 kV main breaker tripped by
overcurrent relays, a 1500 kVA service transformer, a 2000 A main switchboard with four
feeders, and a 500 kW standby generator reaching a standby panel through an automatic
transfer switch (ATS). This is the one-line a plan reviewer, a utility service engineer or
an arc-flash study engineer opens most often in North America, and it uses every idiom an
ANSI one-line has: a source with its available fault current, metering, a medium-voltage
breaker with protective relays named by IEEE C37.2 device number, a current transformer
(CT), a transformer with its connection, impedance and neutral ground, a low-voltage main
breaker, a switchboard bus, feeders to a panel, a motor and a second transformer, and a
two-source transfer. Twenty-one devices, chosen to be read at a glance rather than to stress
the layout. The sheet has to make four things obvious: power flows from the utility at the
top to the loads at the bottom; the relays sit beside the power path, not in it; every device
is visibly on the 12.47 kV side or the 480Y/277 V side of the voltage divide; and the ATS
takes the switchboard on one side and the generator on the other.

**Layout.** One vertical service trunk carries utility, meter, main breaker 52-M, CT-1,
transformer T-1 and the main breaker MSB down onto the switchboard bus. The two relays sit
to the left of the trunk on CT-1's secondary line, and their trip lines rise to the 52-M
breaker. A dashed hairline across the page divides medium voltage from low voltage directly
below T-1; only the trunk crosses it. Four feeders drop from the bus in equal columns
(240 px apart) in the order panel, motor, transformer, ATS, so the ATS column is next to the
generator. The generator stands to the right of the bus end, below the voltage divide because
it is a 480 V source, and its conductor runs down and left into the ATS's emergency terminal
without crossing any other conductor or label. Every device name and rating sits to the right
of its symbol; terminal loads (panels, motor) carry theirs centred underneath; the bus name
sits outside its left end and its rating outside its right end, on the bar's own centre line.
Conductor annotation sits beside the run it describes.

**Palette.** The five colours of the ten reviewed single-line case targets, and no accent hue:
names `#0f172a`; conductors, bus and symbol outlines `#1e293b`; rating lines `#475569`;
conductor annotation, section captions, connection-glyph notes and page notes `#64748b`;
title rule and section rule `#dbe2ea`. Symbol bodies are filled paper white `#ffffff`, so a
conductor ends visibly at a symbol's edge. A one-line is printed, marked up and photocopied,
so nothing depends on colour.

**Type scale.** One font stack (Inter, Helvetica Neue, Helvetica, Arial). Title 18/700;
deck line 9.5/600, upper case, letter-spacing 1.3. Device names 12/600. Rating lines 11/400 at
15 px line pitch. Conductor annotation, section captions and notes 10/400 (section captions
upper case, letter-spacing 1.2). Lettering inside symbols: `52` 11/700, relay device numbers
9.5/700, `G` and `M` 13/700, `Wh` 10/600, `CT` 8/700, ATS `N`/`E` 9/400.

**Symbols.** Stroke weights: conductor 1.5, bus 3, symbol outline 1.5, CT secondary and trip
lines 1.2, trip lines dashed 5/4. Bus taps carry r = 3 junction dots; the trip-line junction
carries r = 2.4.
- *Utility source:* r = 17 circle with a sine wave.
- *Revenue meter:* r = 13 circle lettered `Wh`, on the conductor at the metering point, with
  the metering CT and PT ratios in its rating line.
- *Medium-voltage breaker:* 30 x 30 square with device number `52` inside, the IEEE 315
  general circuit-breaker symbol as North American one-lines draw medium-voltage breakers.
- *Low-voltage breakers* (main, feeders, generator): contact arm hinged on the lower terminal
  with the arc hook at its tip and a terminal dot at each end, the air-circuit-breaker form.
- *CT:* r = 9 circle lettered `CT`, on the conductor.
- *Protective relay:* r = 19 circle with the C37.2 device number inside (`50/51` phase
  instantaneous and time overcurrent, `50/51N` residual ground). The CT secondary is a thin
  solid line from the CT to the relays; each relay's trip is a dashed line to the breaker it
  operates, captioned `TRIP`.
- *Transformer:* two windings of three r = 6 humps bulging away from two 44 px core lines; the
  conductor meets the apex of the middle hump. To its left, a delta triangle beside the primary
  and a wye beside the secondary whose neutral runs down to a three-bar ground symbol, with the
  grounding electrode conductor (GEC) size beside it.
- *Generator:* r = 17 circle with `G` over a sine wave, with the same grounded-wye glyph and
  GEC size to its left, because a 4-pole ATS makes the generator a separately derived system
  grounded at the generator.
- *ATS:* two input stubs 44 px apart ending in contact dots, a solid arm from the common pivot
  to the normal (`N`) contact and a dashed arm to the emergency (`E`) contact — drawn in its
  normal position — and the output conductor leaving the pivot downward.
- *Panel:* 80 x 32 rectangle with a hairline near the top. *Motor:* r = 15 circle lettered `M`.

**Ratings.** Every element carries the data a reviewer checks on a one-line: the source's
voltage, phases and wires, available short-circuit MVA and kA with X/R; the meter's CT and PT
ratios; each breaker's frame and trip amperes, trip-unit type where it matters (`LSIG`,
`LSI`) and interrupting kA; the CT's ratio and accuracy class; each transformer's kVA,
voltage ratio, connection and percent impedance, plus its GEC size; the bus's voltage,
continuous amperes and short-circuit rating; each conductor run's sets, conductor count, size
and equipment grounding conductor; the generator's kW, kVA, power factor and voltage; the
ATS's amperes, poles and transition type. Two notes at the foot say what the dashed and thin
lines are, and that the `LSIG` main supplies the ground-fault protection NEC 230.95 requires
on a 2000 A, 480Y/277 V disconnect. The values are mutually consistent (for example 6 sets of
600 kcmil copper carry the 1804 A secondary current of T-1; 5.75 %Z limits its secondary fault
to about 31 kA, inside the 65 kA ratings).

**Collisions.** `scripts/visual-eval/draw-sld-ansi-exemplar.mjs` measures every string in
Chromium and refuses to write the file unless every label box keeps 5 px clear of every other
label, every symbol body, every drawn conductor, CT secondary and trip line, the voltage-divide
rule and the canvas edge, and no line passes through a symbol body it does not end on:
**0 collisions.**

**Departures from `docs/reference/11-SINGLE-LINE-STANDARD.md` and from the reviewed case
targets.**
1. The medium-voltage breaker is a square with `52` inside. §1.2 of the doc, and the reviewed
   `sld-industrial-11kv-substation` target, draw every breaker as the diagonal arm with an arc.
   IEEE 315 separates the general circuit-breaker symbol from the air-circuit-breaker symbol for
   AC breakers of 1500 V and below, and North American medium-voltage one-lines use the square.
   Low-voltage breakers keep the arm-and-hook form of the reviewed targets.
2. The transformer is drawn as coil windings with core lines. The reviewed targets draw two
   interlinked circles, which is the IEC 60617 form; the engine already draws coils under
   `standard: ansi` and circles under `standard: iec`.
3. Transformer and generator neutrals show a grounded-wye glyph with a ground symbol and GEC
   size. §6.1 of the doc gives the delta and wye glyphs; the reviewed targets show no grounding.
4. The relays are drawn on the CT secondary with dashed trip lines to the breaker. The reviewed
   industrial target shows only the trip line, which leaves the relay with no visible source of
   current.
5. Feeder names and ratings sit to the right of each feeder breaker. The reviewed
   `sld-three-phase-board` and `sld-motor-control-centre` targets centre them above the breaker,
   where the tap conductor runs through the rating text.
6. As in the reviewed targets, names and ratings sit beside a device rather than ID above and
   rating below (§2.5), conductor annotation is horizontal rather than rotated (§3.3), and the
   bus is 3 px rather than 6 px.
7. Primary metering is drawn as a `Wh` bubble on the conductor, as in the reviewed targets. A
   construction set would draw the metering CTs and PTs on the conductor with the meter beside
   it; the ratios in the rating line carry that information here.
8. The sheet has no legend block or title block. Utility interconnection requirements ask for a
   legend on the submitted drawing; it belongs to the drawing border, not to the diagram an
   engine renders.

**Source.** `source.sx` selects the ANSI symbol set with `[standard: ansi]` in the header,
declares the 15 kV breaker as `breaker_vacuum`, names each relay's function with `device:`
and its current input with `ct: "CT1"`, and gives transformer and generator grounding as
`grounding:` attributes. Relay-to-breaker connections (`R51 -> CB52`) are the trip circuits;
every other `->` is a power conductor, with its conductor size in `cable:`.

## References

- IEEE Std 315-1975 / ANSI Y32.2-1975, *Graphic Symbols for Electrical and Electronics Diagrams* — https://standards.ieee.org/ieee/315/515/
- IEEE Std C37.2-2008, *Standard Electrical Power System Device Function Numbers, Acronyms, and Contact Designations* — https://ieeexplore.ieee.org/iel5/4639520/4639521/04639522.pdf
- "ANSI device numbers" (device 27, 50, 51, 52, 59, 86, 87, 89 definitions and suffix letters G, N, T), Wikipedia — https://en.wikipedia.org/wiki/ANSI_device_numbers
- IEEE Std 141 (Red Book), *Recommended Practice for Electric Power Distribution for Industrial Plants* — https://webstore.ansi.org/standards/ieee/1411993
- IEEE Std 399 (Brown Book), *Recommended Practice for Industrial and Commercial Power Systems Analysis* — https://standards.ieee.org/ieee/399/613/
- "Single-line diagram" (one line stands for all three phases; drawing follows the switchgear's top-to-bottom, left-to-right sequence), Wikipedia — https://en.wikipedia.org/wiki/Single-line_diagram
- NFPA 70 §230.95, Ground-Fault Protection of Equipment (solidly grounded wye, over 150 V to ground, 1000 A and above), UpCodes — https://up.codes/s/ground-fault-protection-of-equipment
- "Services and the NEC, Part 2", EC&M (service disconnect and overcurrent rules) — https://www.ecmweb.com/national-electrical-code/code-basics/article/20904311/services-and-the-nec-part-2-of-2
- "Electrical One-Line Diagram Best Practices", NFM Consulting (utility fault current, transformer %Z and connection, bus and breaker ratings, cable sizes a one-line must carry) — https://nfmconsulting.com/knowledge/electrical-one-line-diagram/
- "Solar Single-Line Diagram: Symbols and Best Practices", SurgePV (what an AHJ plan reviewer checks: conductor labels, OCPD ratings, grounding electrode conductor, bus and main breaker ratings) — https://www.surgepv.com/blog/solar-single-line-diagram
- Ameren Illinois, *Requirements for DER Interconnection* (relay element numbers on the one-line; breaker continuous and interrupting ratings), read as a search excerpt — https://www.ameren.com/-/media/illinois-site/files/electricchoice/distributedgeneration/interconnection-requirements-remotely-located-generation.ashx
- PPL Electric, *Relay and Control Requirements for Parallel Operation*, read as a search excerpt — https://www.pplelectric.com/site/-/media/ppl-jss-app/assets/Home/More/About-Us/Electric-rates-and-rules/Point-of-contact-requirements/Relay-and-Control-Requirements-Rev2.ashx
- "Circuit Breaker Symbols Explained", JLCPCB (ANSI square with 52 on one-lines; drawout chevrons) — https://jlcpcb.com/blog/circuit-breaker-symbols-explained
- "Circuit Breaker vs Disconnect Symbol on One-Line Diagrams", Industrial Monitor Direct — https://industrialmonitordirect.com/blogs/knowledgebase/circuit-breaker-vs-disconnect-symbol-on-one-line-diagrams
- "Electrical Schematic Symbols Reference (IEEE C37.2 and IEC)", Industrial Monitor Direct (transformer as coils with core lines; relay device numbers) — https://industrialmonitordirect.com/blogs/knowledgebase/electrical-schematic-symbols-complete-ansiieee-reference
- "Single-Line Diagram Symbols (IEC + ANSI Cheat Sheet)", SmartSLD (ANSI transformer as coils; CT ratio label; bus voltage and ampere label) — https://smartsld.com/blog/single-line-diagram-symbols/
- "Transformer symbology", Mike Holt's Forum (ANSI transformer drawn as coil windings; delta and wye glyphs; ground symbol on a grounded neutral), read as a search excerpt — https://forums.mikeholt.com/threads/transformer-symbology.86037/
- "Relay Trip Logic Map for MV Panels: 50/51/50N/51N/27/59/86", XBRELE (phase relays on phase CTs, ground element on the residual CT connection, trip to the 52 breaker) — https://xbrele.com/relay-trip-logic-map-for-mv-panels-50-51-50n-51n-27-59-86-how-they-inter/
