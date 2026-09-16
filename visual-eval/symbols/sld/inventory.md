# Single-line diagram (ANSI) symbol inventory

This is the list of symbols an ANSI single-line diagram (one-line) needs, in the order they should be drawn. It covers the North American symbol set, IEEE Std 315-1975 (ANSI Y32.2) for shapes and IEEE C37.2 for device-function numbers. The IEC 60617 variant gets its own inventory. The usage numbers come from ChatDiagram: distinct users, owner excluded, whose generated one-line in the 90 days to 11 September 2026 used the symbol's DSL name or an alias, out of 2,112 one-line users in all. Treat them as rough. `bus`, `load` and `utility` appear in almost every diagram because they carry its structure, not because people chose them as symbols. `switch`, `relay`, `motor`, `solar` and `ups` also match ordinary label words, so their counts run high. Types the usage query did not cover are marked "not counted".

**Tier rule.** Tier 1 is the 20 symbols most people draw, plus anything a permit or utility-interconnection one-line cannot leave out: protection (fuse, relay), the CT that feeds the relays, and the panel the service lands on. For that reason CT, fuse, relay and panel sit in tier 1 ahead of UPS and ground-fault, which more people use. Ground-fault is also covered by a tier-1 drawing: IEEE 315 §9.5.10 draws a ground relay as the relay symbol with a ground attached, not as a separate shape. Tier 2 is the rest of a standard power one-line's vocabulary. Tier 3 is specialist equipment, and shapes that belong to no ANSI standard.

**Status words.** *Drawn* means the SVG is in this folder. *From the exemplar* means copied from the accepted exemplar `visual-eval/exemplars/sld/ansi/`. *Extrapolated* means built from the exemplar's parts because the exemplar does not draw it.

## Tier 1

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Low-voltage circuit breaker | `breaker` (`mcb`, `mccb`, `pia`, `iga`) | 1,976 | IEEE 315 §9.4.2 air circuit breaker; C37.2 device 52 | `breaker` | Drawn, from the exemplar (hook corrected) |
| Utility source | `utility` | 1,929 | IEEE 315 §2.7 generalized AC source | `utility` | Drawn, from the exemplar |
| Bus | `bus` | 1,927 | IEEE 315 §3.1 conductor drawn heavy (A4.3 line width for emphasis) | `bus` | Drawn, from the exemplar |
| Load | `load` | 1,917 | One-line convention: open arrowhead in the direction of power flow (IEEE 315 §1.7) | `load` | Drawn, extrapolated from the reviewed case targets |
| Generator | `generator` | 943 | IEEE 315 §13.1.2 generator; §13.3.4 grounded-wye winding connection | `generator` | Drawn, from the exemplar (glyph moved next to the body) |
| Automatic transfer switch | `ats` | 864 | IEEE 315 §4.6.2 double-throw switch; NEC 700 / 702 transfer equipment | `ats` | Drawn, from the exemplar (N / E lettering corrected) |
| Watthour meter | `watthour_meter` | 829 | IEEE 315 §12.1 meter, letters WH | `watthour_meter` | Drawn, from the exemplar |
| Disconnect switch | `switch` | 684 | IEEE 315 §4.6.1 single-throw switch; C37.2 device 89 | `switch` | Drawn, extrapolated |
| Load-interrupter switch | `switch_load` (`isolator`, `disconnector`, `main_switch`) | 577 | IEEE 315 §4.6.1 switch with an interrupter box around the fixed contact (IEEE 315 has no load-break symbol of its own) | `switch_load` | Drawn, extrapolated |
| Variable-frequency drive | `vfd` | 488 | IEEE 315 §16.1 lettered circuit-element rectangle | `vfd` | Drawn, extrapolated |
| Surge arrester | `surge_arrester` | 464 | IEEE 315 §9.3.5 protective gap in an arrester body, with §3.9.1 ground | `surge_arrester` | Drawn, extrapolated |
| Two-winding transformer | `transformer` | 430 | IEEE 315 §6.4.2.1 magnetic-core transformer | `transformer` | Drawn, from the exemplar |
| Photovoltaic array | `solar` | 393 | IEEE 315 §8.7.3 photovoltaic cell (incident-light arrows) on a module grid | `solar` | Drawn, extrapolated |
| Motor | `motor` | 391 | IEEE 315 §13.1.3 motor | `motor` | Drawn, from the exemplar |
| Current transformer | `ct` | 284 | One-line CT bubble (IEEE 315 §6.4.18 gives the coil form); ratio in the rating | `ct` | Drawn, from the exemplar |
| Fuse | `fuse` | 249 | IEEE 315 §9.1.1 fuse, rectangle form | `fuse` | Drawn, extrapolated from the reviewed case targets |
| Protective relay | `relay` | 205 | IEEE 315 §9.5.1 device-function number in a circle; C37.2 device numbers (50/51 shown) | `relay` | Drawn, from the exemplar |
| Transformer, delta / grounded wye | `transformer_dy` | 196 | IEEE 315 §6.4.2.1 with §6.4.15.1 connection glyphs beside the symbol | `transformer_dy` | Drawn, from the exemplar (glyphs moved next to the body) |
| Panelboard | `panel` (`panelboard`, `consumer_unit`, `distribution_board`, `db`, `cu`) | not counted | IEEE 315 §16.1 circuit-element rectangle; NEC 408 panelboard | none (`consumer_unit` is missing from the catalog) | Drawn, from the exemplar |
| Medium-voltage circuit breaker | `breaker_vacuum` | 60 | IEEE 315 §9.4.4 circuit breaker (square, Note 9.4.4A); C37.2 device 52 | `breaker_vacuum` | Drawn, from the exemplar |

## Tier 2

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Ground-fault relay | `ground_fault` | 379 | IEEE 315 §9.5.10 relay with the ground symbol attached; C37.2 50G / 51G | `ground_fault` | Drawn — Should be the tier-1 relay circle with a ground attached; the engine's "GFI" circle has no ANSI basis |
| Uninterruptible power supply | `ups` | 318 | IEEE 315 §16.1 lettered rectangle | `ups` | Drawn |
| Potential (voltage) transformer | `pt` | 126 | One-line PT bubble (IEEE 315 §6.4.20 gives the coil form) | `pt` | Drawn |
| Capacitor bank | `capacitor_bank` | 93 | IEEE 315 §2.2 capacitor | `capacitor_bank` | Drawn |
| Grounding switch | `ground_switch` | 85 | IEEE 315 §4.6.1 switch to §3.9.1 ground; C37.2 device 89 | `ground_switch` | Drawn |
| Bus-tie breaker | `bus_tie` | 47 | IEEE 315 §9.4 breaker on a horizontal run; C37.2 device 52 | `bus_tie` | Drawn |
| Current-limiting fuse | `fuse_cl` | 42 | IEEE 315 §9.1 fuse | `fuse_cl` | Drawn |
| Transformer, grounded wye / delta | `transformer_yd` | 31 | IEEE 315 §6.4.15.1 | `transformer_yd` | Drawn |
| Demand meter | `demand_meter` | 29 | IEEE 315 §12.1 meter, letters DM | `demand_meter` | Drawn |
| Recloser | `recloser` | 5 | Breaker with C37.2 device 79 reclosing; required on many utility interconnections | `recloser` | Drawn |
| Contactor / motor starter | `contactor` | not counted | IEEE 315 §4.29 contactor | none | Drawn |
| Transformer, wye / wye | `transformer_yy` | 2 | IEEE 315 §6.4.15.2 | `transformer_yy` | Drawn |
| Transformer, delta / delta | `transformer_dd` | not counted | IEEE 315 §6.4.15.1 connection glyphs | `transformer_dd` | Drawn |

## Tier 3

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Synchronizing hub | `hub` | 58 | None; not a power-apparatus symbol | `hub` | Drawn |
| Wind turbine | `wind` | 19 | None in IEEE 315 (§21.1 covers a generating station on a map) | `wind` | Drawn |
| Harmonic filter | `harmonic_filter` | 16 | IEEE 315 §6.2 inductor with §2.2 capacitor | `harmonic_filter` | Drawn |
| Autotransformer | `autotransformer` | 16 | IEEE 315 §6.4.8 | `autotransformer` | Drawn |
| Three-winding transformer | `transformer_3winding` | 9 | IEEE 315 §6.4.17 | `transformer_3winding` | Drawn |
| Sectionalizer | `sectionalizer` | 5 | None in IEEE 315; utility distribution practice | `sectionalizer` | Drawn |
| Residual-current device | `rcd` (`rcbo`, `rccb`) | not counted | IEC 60617 only; belongs in the IEC inventory | none | Drawn |

## Missing from the engine

Basic one-line equipment that the DSL has no word for today. People currently fall back to `load`, `vfd` or a label, which draws the wrong shape.

- **Grounding electrode** (IEEE 315 §3.9.1): permit reviewers check the grounding-electrode conductor running to the ground rod (NEC 250.66, 690.47), but a ground can only be written as text in `grounding:`.
- **Fused disconnect switch** (IEEE 315 §9.1.3 fuse-switch): service and PV AC disconnects are usually fused, and writing `switch` plus `fuse` draws two devices where one safety switch with one rating exists.
- **Meter socket and bidirectional (net) meter**: `watthour_meter` draws the meter, but not the utility-owned socket or the two-way flow arrows a net-metering application shows.
- **Inverter** (IEEE 315 §16.1 lettered rectangle, "ST-INV"): every PV and battery one-line has one, and none of today's types means DC to AC conversion.
- **Battery / energy storage system** (IEEE 315 §2.5 battery): NEC 706 storage and UPS battery strings cannot be drawn.
- **EV charger (EVSE, NEC 625)**: now a common new load on service upgrades, drawn only as a generic load.
- **Rapid-shutdown device and initiator (NEC 690.12)**: plan reviewers most often send PV one-lines back for missing rapid shutdown.
- **PV combiner box and DC disconnect**: the DC side of a PV one-line cannot be separated from the AC side.
- **Relay variants**: a `relay` takes one device number in one circle. It cannot draw a ground relay with its ground attached (IEEE 315 §9.5.10), a multifunction interconnection relay listing 27/59/81/25/32 in one box, or the 86 lockout relay between the relays and the breaker.
- **Drawout breaker** (IEEE 315 §9.4.7 chevrons): switchgear one-lines mark drawout breakers, and no attribute exists for it.
- **Zero-sequence ground-fault sensor**: the window CT that feeds NEC 230.95 ground-fault protection is a different device from a phase CT.
- **Neutral grounding resistor** (IEEE 315 §2.1 resistor to ground): medium-voltage systems are often resistance-grounded, and the resistor size is a reviewed value.

## Decisions for Victor

The sample round found four inconsistencies when exemplar symbols were cut out on their own. Each has one answer, applied to every symbol in the set. The generator `scripts/visual-eval/symbols/draw-sld.mjs` encodes all four.

1. **Moving contacts are drawn in the IEEE 315 §4.6 standard position, the one with no operating force applied.** Single-throw devices (both breakers, the disconnect, the load-interrupter) are drawn open. The transfer switch is drawn resting on its normal source, because an open-transition transfer switch always sits on one of its two sources; IEEE 315 §4.6.2.1 draws a double-throw switch on one throw. So the open breakers beside a closed ATS are the rule, not an error. Every single-throw device uses the same 2.2 px arm, hinged on the lower terminal, with 38 px between terminal dots, so a breaker, a disconnect and a load-interrupter line up in one feeder column. The operating state (normally open ties, which breaker is closed) goes in a label, as utility one-lines already do. The alternative, every device drawn closed as in service, was rejected: §4.6 allows it, but a closed single-throw arm on a vertical conductor is a straight line between two dots, which cannot be told from a conductor with two bus-tap dots.
2. **Connection glyphs sit next to the body they describe.** The delta, wye and ground glyphs are placed 4 px clear of the transformer's core lines or the generator's circle. IEEE 315 §6.4.15.1 draws the Y–Δ glyph against the transformer symbol, and §13.3.4 attaches a machine's grounded wye to the machine itself. The glyph centre moves from 42 to 33 px left of the transformer centre, and from 32 to 26.5 px left of the generator centre.
3. **No part of a contact arm rises above its upper terminal.** The breaker's arc hook used to end 3 px above the upper terminal dot, so the drawing overlapped the incoming conductor. It now ends 1.5 px below the terminal and clear of the dot, so the device's height is exactly its terminal-to-terminal span. Ending the hook exactly level with the terminal was tried and rejected: the hook then nearly touches the dot, and the open breaker reads as closed.
4. **Lettering that belongs to a symbol is symbol lettering.** The ATS N and E move from 9 px regular grey (#64748b) to 9 px bold #0f172a, like 52, G, M, Wh, CT and relay numbers. Grey is kept for annotation outside a symbol (cable sizes, notes), where it tells the reader "this is commentary, not equipment".

Three smaller choices in the new symbols. The load-interrupter switch is the disconnect with a small box drawn around its fixed contact, standing for the interrupter chamber. A horn or hook near the arm tip, the other candidate, reads as a breaker at diagram size. The other two follow the exemplar rather than inventing a rule. The CT and the relay carry their control connections as 12 px stubs at the exemplar's 1.2 px control weight (a solid CT secondary, a dashed 5/4 trip), because a relay with no drawn input or output is the defect the exemplar notes call out. The relay circle keeps the exemplar's lighter 1.3 px outline, which marks it as off the power path.
