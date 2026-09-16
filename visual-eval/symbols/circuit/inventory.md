# Circuit schematic symbols: inventory

This inventory lists every symbol the circuit schematic type needs: the 103 entries in the engine's catalog (`getSymbolCatalog("circuit")`), plus the basic IEEE Std 315-1975 symbols the DSL cannot express yet. It ranks them by how often people drew them on ChatDiagram in the 90 days to 11 Sep 2026, when 3,652 people generated a circuit diagram. There are two measures:

- **Designator-prefix count.** How many people wrote a part whose name starts with that letter (R1, C1, Q1). This is the real measure of which part families people draw. The DSL is a SPICE-style netlist, so most parts appear only as a designator plus a value, and a bare prefix draws that family's default symbol.
- **Word count.** How many people wrote the symbol's type name or an alias (`type=zener`, `pot`). It counts variants within a family, but undercounts every symbol that a bare prefix already draws. A symbol with no match shows 0.

**Tier rule.**

- **Tier 1** (exactly 30):
  - the core symbols of every family behind a large designator prefix: R, V, Q, C, U, D, F, S, M, T, L and K, each with 490 or more users;
  - the ground and supply symbols;
  - the most-used named loads (motor, battery, lamp, buzzer);
  - a terminal block, so connections to the outside world can be drawn.
- **Tier 2:** the rest of the vocabulary an electronics or control schematic commonly needs. That means either about 10 or more users, or a core IEEE 315 item.
- **Tier 3:** specialist symbols, variants with almost no users, and panel-layout drawing aids.

**Where the prefix counts mislead.** The parser follows SPICE letters, which clash with the designator letters IEEE 315 and ASME Y14.44 assign. A bare **T** draws a terminal block, although many of its 615 users meant a transformer. A bare **M** draws a MOSFET, not a motor. A bare **L** draws an inductor, not a lamp. A bare **J** draws a JFET, although J is the class letter for connectors. So the T and J counts are not credited to any one symbol below.

## Tier 1

In the Users column, a number followed by a prefix in brackets is that prefix's count, used where the symbol is what a bare prefix draws. A plain number is a word count. The Status column shows:

- **Drawn:** the SVG is in this folder.
- **Accepted sample:** a drawing the owner has reviewed and signed off.

| Symbol | DSL name / designator | Users (90 days) | IEEE 315 section | Engine catalog id | Status |
|---|---|---|---|---|---|
| Resistor | `R` · `type=resistor` · `pullup` | 2,296 (R) | 2.1.1 | `resistor` | Accepted sample |
| Potentiometer | `type=potentiometer` · `pot` | 189 | 2.1.3 | `potentiometer` | Drawn |
| DC voltage source | `V` · `type=voltage_source` · `vsource` | 1,826 (V) | 2.5.1 (drawn as a circle, see decisions) | `voltage_source` | Drawn |
| AC voltage source | `type=ac_source` · `ac` | 17 | 2.7 | `ac_source` | Drawn |
| NPN transistor | `Q` · `type=npn` · `transistor` | 1,461 (Q) | 8.6.2 | `npn` | Accepted sample |
| PNP transistor | `Q … pnp` · `type=pnp` | 66 | 8.6.1 | `pnp` | Drawn |
| Capacitor | `C` · `type=capacitor` | 1,455 (C) | 2.2.1 | `capacitor` | Drawn, from the exemplar |
| Polarized capacitor | `type=ecap` · `electrolytic_cap` | 1 | 2.2.2 | `electrolytic_cap` | Accepted sample |
| Integrated circuit, generic block | `U`, `X` · `type=ic` · `mcu` | 1,264 (U) | 16.1 | `generic_ic` | Drawn |
| Op-amp | `type=opamp` | 196 | 16.2.3 | `opamp` | Drawn |
| Diode | `D` · `type=diode` | 1,048 (D) | 8.5.1 | `diode` | Drawn |
| LED | `D … led` · `type=led` | 691 | 8.5.1 with 1.3.1 | `led` | Accepted sample |
| Zener diode | `D … zener` · `type=zener` | 137 | 8.5.6.1 | `zener` | Drawn |
| Schottky diode | `D … schottky` · `type=schottky` | 120 | 8.5.1 with industry hook bar | `schottky` | Drawn |
| Fuse | `F` · `type=fuse` | 816 (F) | 9.1.1 | `fuse` | Drawn |
| SPST switch | `S`, `SW` · `type=switch_spst` · `switch` | 746 (S) | 4.6.1 | `switch_spst` | Drawn |
| SPDT switch | `type=switch_spdt` | 62 | 4.6.2, 4.3.3 | `switch_spdt` | Drawn |
| N-channel MOSFET | `M` · `type=nmos` · `mosfet_n` | 656 (M) | 8.6.10 | `nmos` | Drawn |
| P-channel MOSFET | `M … pmos` · `type=pmos` | 96 | 8.6.11 | `pmos` | Drawn |
| Transformer | `type=transformer` · `xfmr` | 262 | 6.4.2.1 | `transformer` | Drawn |
| Inductor | `L` · `type=inductor` | 591 (L) | 6.2.1 | `inductor` | Drawn |
| Relay coil | `K` · `type=relay_coil` · `coil` | 491 (K) | 4.5 | `relay_coil` | Drawn |
| Relay contact, normally open | `type=relay_no` | 32 | 4.3.2 with 14.1.1 | `relay_no` | Drawn |
| Supply connection (power flag) | `type=vcc` | 1,983 (mostly net names) | 3.9.3.1 | `vcc` | Drawn |
| Motor | `type=motor` · `dc_motor` | 476 | 13.1.3 | `motor` | Drawn |
| Battery | `B`, `BT` · `type=battery` | 433 | 2.5.3 | `battery` | Accepted sample |
| Lamp | `type=lamp` · `light` · `bulb` | 431 | 11.1.4 | `lamp` | Drawn |
| Ground | `0` or `GND` net · `type=ground` | 274 | 3.9.1 | `ground` | Drawn, from the exemplar |
| Buzzer | `type=buzzer` | 178 | 10.1.2 | `buzzer` | Drawn |
| Terminal block | `T` · `type=terminal_block` · `tb` | 42 | 5.1.1.1 | `terminal_block` | Drawn |

## Tier 2

| Symbol | DSL name / designator | Users (90 days) | IEEE 315 section | Engine catalog id | Status |
|---|---|---|---|---|---|
| Relay, coil and contact in one symbol | `type=relay` | 510 | 4.30.2 | `relay` | Drawn |
| Contactor | `type=contactor` · `km` | 148 | 4.29 | `contactor` | Drawn |
| Pilot light | `type=pilot_light` · `indicator` | 93 | 11.1.1 with colour letter | `pilot_light` | Drawn |
| Loudspeaker | `type=speaker` | 89 | 10.1.3 | `speaker` | Drawn |
| No-connect mark | `type=no_connect` | 88 | 3.1.12 (the engine's X is CAD-tool practice) | `no_connect` | Drawn |
| Fan | `type=fan` | 73 | 13.1.3 (motor with a fan) | `fan` | Drawn |
| Comparator | `type=comparator` | 66 | 16.2.3 | `comparator` | Drawn |
| Switch, normally closed | `type=switch_nc` | 64 | 4.3.1 | `switch_nc` | Drawn |
| Relay with changeover contact | `type=relay_spdt` | 55 | 4.30.2 | `relay_spdt` | Drawn |
| Light-dependent resistor | `type=ldr` | 45 | 2.1.13 | `ldr` | Drawn |
| Antenna | `type=antenna` | 42 | 2.3 | `antenna` | Drawn |
| Voltmeter | `type=voltmeter` | 42 | 12.1 | `voltmeter` | Drawn |
| Crystal | `Y` · `type=crystal` · `xtal` | 40 (Y alone: 21) | 2.10 | `crystal` | Drawn |
| Optocoupler | `type=optocoupler` | 40 | 8.10 | `optocoupler` | Drawn |
| Voltage regulator | `type=voltage_regulator` · `reg` | 37 | 16.1 | `voltage_regulator` | Drawn |
| Emergency stop | `type=emergency_stop` · `estop` | 26 | Not in IEEE 315 (NFPA 79 practice) | `emergency_stop` | Drawn |
| SPDT switch, centre off | `type=switch_spdt_center_off` | 24 | 4.6.2 | `switch_spdt_center_off` | Drawn |
| Ammeter | `type=ammeter` | 22 | 12.1 | `ammeter` | Drawn |
| Varistor | `type=varistor` | 17 | 2.1.6 | `varistor` | Drawn |
| Selector switch | `type=selector_switch` · `selector` | 17 | 4.13 | `selector_switch` | Drawn |
| Thyristor (SCR) | `type=scr` | 15 | 8.6.12 | `scr` | Drawn |
| Triac | `type=triac` | 15 | 8.6.15 | `triac` | Drawn |
| IGBT | `type=igbt` | 14 | Not in the 1975 edition (IEC 60617 part 5) | `igbt` | Drawn |
| Terminal (single) | `type=port` | 13 | 5.1.1 | `port` | Drawn |
| Photodiode | `type=photodiode` | 12 | 8.5.4.1 | `photodiode` | Drawn |
| Microphone | `type=microphone` | 12 | 10.2.1 | `microphone` | Drawn |
| Relay contact, normally closed | `type=relay_nc` | 9 | 4.3.1 with 14.1.1 | `relay_nc` | Drawn |
| Current source | `I` · `type=current_source` · `isource` | 8 (I alone: 18) | Not in IEEE 315 (circuit-analysis convention) | `current_source` | Drawn |
| Bridge rectifier | `type=bridge_rectifier` | 8 | 16.3 | `bridge_rectifier` | Drawn |
| Rheostat | `type=rheostat` | 7 | 2.1.4 | `rheostat` | Drawn |
| 555 timer | `type=555_timer` · `555` | 3 | 16.1 | `555_timer` | Drawn as a symbol file (drawn as U1 in the exemplar) |
| Test point | `type=test_point` | 3 | 1.5 | `test_point` | Drawn |
| Pushbutton, normally open | `type=push_no` · `pushbutton` | 1 | 4.7.1 | `push_no` | Drawn |
| JFET, N-channel | `J` · `type=jfet_n` | 1 (J alone: 142, mostly connectors) | 8.6.10.1 | `jfet_n` | Drawn |
| Chassis ground | `type=gnd_chassis` | 1 | 3.9.2 | `gnd_chassis` | Drawn |
| Pushbutton, normally closed | `type=push_nc` | 0 | 4.7.2 | `push_nc` | Drawn |
| NTC thermistor | `type=thermistor_ntc` · `ntc` | 0 | 2.1.12.1.4 | `thermistor_ntc` | Drawn |
| Signal ground (common connection) | `type=gnd_signal` | 0 | 3.9.3.2 | `gnd_signal` | Drawn |

## Tier 3

| Symbol | DSL name / designator | Users (90 days) | IEEE 315 section | Engine catalog id | Status |
|---|---|---|---|---|---|
| PLC module | `type=plc` · `controller` | 50 | 16.1 | `plc` | Drawn; panel device, not a schematic primitive |
| Enclosure | `type=enclosure` · `cabinet` | 23 | 1.10 | `enclosure` | Drawn; panel-layout aid |
| DIN rail | `type=din_rail` | 20 | None | `din_rail` | Drawn; panel-layout aid |
| Wire duct | `type=wire_duct` · `trunking` | 18 | None | `wire_duct` | Drawn; panel-layout aid |
| DC-DC converter | `type=dc_dc_converter` | 16 | 16.1 | `dc_dc_converter` | Drawn |
| Ferrite bead | `type=ferrite_bead` | 12 | 15.18 | `ferrite_bead` | Drawn |
| Automotive flasher, 3-pin | `type=automotive_flasher_3pin` · `flasher` | 10 | 4.22 | `automotive_flasher_3pin` | Drawn |
| Triode (vacuum tube) | `type=triode` | 10 | 7.3 | `triode` | Drawn |
| Diac | `type=diac` | 8 | 8.5.9 | `diac` | Drawn |
| Oscilloscope | `type=oscilloscope` | 7 | 12.1 | `oscilloscope` | Drawn |
| Phototransistor | `type=phototransistor` | 5 | 8.6.16 | `phototransistor` | Drawn |
| Solenoid valve | `type=solenoid_valve` · `solenoid` | 4 | 4.5.3 | `solenoid_valve` | Drawn |
| Thermal overload | `type=thermal_overload` · `overload` | 3 | 4.30.5 | `thermal_overload` | Drawn |
| Varactor | `type=varactor` | 3 | 8.5.2 | `varactor` | Drawn |
| Wattmeter | `type=wattmeter` | 3 | 12.1 | `wattmeter` | Drawn |
| Solar cell | `type=solar_cell` · `solar` | 2 | 8.7 | `solar_cell` | Drawn |
| DPDT switch | `type=switch_dpdt` | 2 | 4.6.2.1 | `switch_dpdt` | Drawn |
| Slow-blow fuse | `type=fuse_slow` | 1 | 9.1.1 with IEC "T" mark | `fuse_slow` | Drawn |
| TVS diode | `type=tvs_diode` | 1 | 8.5.6.2 | `tvs_diode` | Drawn |
| Proximity sensor | `type=proximity_sensor` | 1 | Not in IEEE 315 (IEC 60617 part 7) | `proximity_sensor` | Drawn |
| Darlington, NPN | `type=darlington_npn` | 0 | 8.6.17 | `darlington_npn` | Drawn |
| Darlington, PNP | `type=darlington_pnp` | 0 | 8.6.17 (PNP form) | `darlington_pnp` | Drawn |
| N-channel depletion MOSFET | `type=nmos_depletion` | 0 | 8.6.10.3 | `nmos_depletion` | Drawn |
| JFET, P-channel | `type=jfet_p` | 0 | 8.6.11.1 | `jfet_p` | Drawn |
| Digital ground | `type=gnd_digital` | 0 | 3.9.3.2 | `gnd_digital` | Drawn |
| PTC thermistor | `type=thermistor_ptc` · `ptc` | 0 | 2.1.12.1.3 | `thermistor_ptc` | Drawn |
| Variable capacitor | `type=variable_cap` | 0 | 2.2.4 | `variable_cap` | Drawn |
| Iron-core inductor | `type=inductor_iron` | 0 | 6.2.2 | `inductor_iron` | Drawn |
| Ferrite-core inductor | `type=inductor_ferrite` | 0 | 6.2.2 | `inductor_ferrite` | Drawn |
| Variable inductor | `type=variable_inductor` | 0 | 6.2.5 | `variable_inductor` | Drawn |
| Instrumentation amplifier | `type=instrumentation_amp` | 0 | 16.2 | `instrumentation_amp` | Drawn — doubled input edge distinguishes it from op-amp |
| Schmitt-trigger buffer | `type=schmitt_buffer` | 0 | IEEE 91 logic symbol, not IEEE 315 | `schmitt_buffer` | Drawn |
| Tri-state buffer | `type=tri_state_buffer` | 0 | IEEE 91 logic symbol, not IEEE 315 | `tri_state_buffer` | Drawn |
| Mains socket | `type=mains_socket` · `outlet` | 0 | IEC 60617-11 | `mains_socket` | Drawn — IEC semicircle, conductor and transverse bar |
| Disconnect switch | `type=disconnect_switch` · `isolator` | 0 | 4.6.3 | `disconnect_switch` | Drawn |

## Missing from the engine

These are basic IEEE 315 symbols the DSL cannot express yet, most important first.

- **Circuit breaker (9.4).** Mains and control-panel circuits need one. Only the one-line diagram engine has it, so a circuit netlist can draw only a fuse or an unlabelled box.
- **Connector, plug and jack (5.3).** J is the standard class letter for connectors, but a bare J draws a JFET. The catalog has no male or female contact, only terminal blocks and a lone terminal circle.
- **Generator (13.1.2).** The motor has no generating counterpart, so alternators and dynamos cannot be drawn.
- **Bell (10.1.1).** The engine's buzzer is drawn as the bell symbol, so a bell and a buzzer on the same sheet look identical.
- **Time-delay contacts (4.3.5 TDC, 4.3.6 TDO).** Timer relays in control circuits can be drawn only as plain contacts plus a note.
- **Changeover contact shown on its own (4.3.3).** A relay's transfer contact exists only as part of the composite `relay_spdt`, so it cannot be placed away from its coil.
- **Two-circuit pushbutton (4.7.3, 4.8).** Start and stop stations with one make and one break contact cannot be drawn.
- **Limit, pressure, temperature and level switches, and the thermostat (4.14, 4.17–4.21).** Every actuated switch in a control circuit falls back to a plain switch.
- **MOSFET with a bulk terminal (8.6.10.5, 8.6.11.5).** The netlist has no fourth pin, so 4-terminal discrete MOSFETs cannot be wired.
- **Unijunction transistor (8.6.8).** Classic relaxation oscillators and thyristor triggers need it.
- **Surge arrester and spark gap (9.3, 2.15).** Mains input protection beyond a varistor cannot be shown.
- **Earphone and headset (10.4).** Audio output circuits have only the loudspeaker.
- **Thermocouple (2.13).** Temperature-sensing circuits cannot show their sensor.
- **Shield and shielded conductor (1.11, 3.1.9).** Screened cables and shielding cans cannot be marked.
- **Meters by letter (12.1).** Only A, V, W and an oscilloscope exist. There is no ohmmeter, galvanometer or frequency meter.

## Where the engine's drawing is wrong

The library corrects these errors. The engine itself is unchanged.

- **Battery.** The engine puts a long plate next to its minus pin, which reverses the polarity. IEEE 315 §2.5 says the long line is always positive.
- **MOSFET arrows.** The engine's N-channel arrow points away from the channel and its P-channel arrow points toward it. Both are reversed (IEEE 315 §8.6.10, §8.6.11).
- **Buzzer.** The engine draws a dome, which is IEEE 315's bell (§10.1.1). The buzzer (§10.1.2) is a square with a slanted reed line.
- **Lamp and relay coil.** The circle with an X is the IEC signal lamp, not an IEEE 315 symbol. The diagonal stroke through the relay coil's rectangle is not in IEEE 315 §4.5.
- **Leads.** The op-amp inputs sit on the triangle with no lead, and the switch contacts are filled dots, which read as junctions.

## Decisions for review

- **NPN and PNP envelope.** The sample's collector and emitter pins sat on the envelope circle. The envelope now shrinks from r 36 to r 30 and moves so both leads run 16 px beyond it, as IEEE 315 draws transistors. The pins are unchanged. The exemplar's Q1 still uses r 36, so the exemplar would need the same change.
- **Battery leads.** The plates move 1 px toward the + pin, so both leads are 11 px instead of 12 and 10. The exemplar's BT1 would need the same 1 px change.
- **DC voltage source.** It is drawn as a circle with + and −, not IEEE 315's single cell (§2.5.1). The single cell would make a V source look identical to a one-cell battery.
- **Fuse.** The IEEE 315 rectangle with the conductor through it is used, not the S-curve form.
- **Lamp.** The IEEE 315 incandescent lamp's leads come in from one side, but the engine's pins are at opposite ends. The leads therefore enter top and bottom and join at a filament loop.
- **MOSFET gate.** The gate lead meets the middle of the gate line, because the engine's gate pin is level with the channel centre. IEEE 315 attaches it at the source end.
- **Op-amp.** The triangle of §16.2.3 is used, not the rarely seen teardrop of §17.1.
