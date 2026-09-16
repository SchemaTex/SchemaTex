# P&ID symbol inventory

This lists every symbol a P&ID (piping and instrumentation diagram) needs from Schematex, split into three tiers, and records which of them the engine can already draw. Usage comes from ChatDiagram production diagrams over the last 90 days (401 distinct users of the P&ID type, owner account excluded): a symbol's count is the number of users whose generated DSL names it. Two limits on that data matter. Instrument bubbles are not engine catalog entries and were not counted, yet nearly every P&ID has them. And word matching overcounts `filter`, `condenser` and `generator`, which also appear in label text. Tier 1 is what a P&ID cannot be drawn without: the most-used equipment and valves, plus the instrument symbols every control loop uses. Tier 2 is the next most-used equipment and the standard's other everyday symbols. Tier 3 is everything a complete library eventually covers.

Standards cited: **ANSI/ISA-5.1** (instrument, valve, actuator and signal symbols) and **ISO 10628-2:2012** (process equipment, by registration number). ISA table numbers are from the 2009 edition, the text available for checking; confirm them against the 2024 edition before quoting them publicly. ISA-5.1 draws no equipment and no check valve, so those rows cite ISO only.

## Tier 1

All 20 are drawn in `visual-eval/symbols/pid/` in the style of the accepted P&ID exemplar. "Sample" means the owner accepted the design in the earlier five-symbol round.

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Control valve, diaphragm actuator | `valve_control [actuator: "diaphragm"]` | 283 | ISA-5.1 Table 5.4.2 no. 1 on Table 5.4.1 no. 1a | `valve_control` | Accepted sample |
| Atmospheric storage tank | `tank_atm` | 275 | ISO 10628-2 X8200 | `tank_atm` | Drawn |
| Centrifugal pump | `pump_centrifugal` | 235 | ISO 10628-2 reg. 2322 | `pump_centrifugal` | Accepted sample |
| Horizontal vessel | `vessel_h` | 208 | ISO 10628-2 reg. 2062 | `vessel_h` | Drawn |
| Gate valve | `valve_gate` | 156 | ISA-5.1 Table 5.4.1 no. 1a; ISO reg. 2101 | `valve_gate` | Accepted sample |
| Filter (liquid) | `filter` | 149 (overcount) | ISO 10628-2 X8116 | `filter` | Drawn |
| Check valve | `valve_check` | 142 | ISO 10628-2 X8077 | `valve_check` | Drawn |
| Pressure relief / safety valve | `valve_psv` | 142 | ISA-5.1 Table 5.4.3 no. 15; ISO X2125 | `valve_psv` | Drawn |
| Shell-and-tube heat exchanger | `hx_shell_tube` | 125 | ISO 10628-2 reg. 2511 | `hx_shell_tube` | Drawn |
| Vertical vessel | `vessel_v` | 101 | ISO 10628-2 reg. 2062 | `vessel_v` | Accepted sample |
| Positive-displacement pump (gear) | `pump_pd` | 87 | ISO 10628-2 reg. 8091 | `pump_pd` | Drawn |
| Ball valve | `valve_ball` | 63 | ISA-5.1 Table 5.4.1 no. 6; ISO X8071 | `valve_ball` | Drawn |
| Globe valve | `valve_globe` | 30 | ISA-5.1 Table 5.4.1 no. 1b; ISO X8068 | `valve_globe` | Drawn |
| On/off valve, solenoid actuator | `valve_control [actuator: "solenoid"]` | counted in `valve_control` | ISA-5.1 Table 5.4.2 no. 10 | `valve_control` | Drawn |
| Instrument, discrete, field mounted | `inst … : field_discrete` | not counted | ISA-5.1 Table 5.1.1 col. D row 1 | — | Drawn |
| Instrument, discrete, control room | `inst … : cr_discrete` | not counted | ISA-5.1 Table 5.1.1 col. D row 2 | — | Drawn |
| Instrument, shared display / control, field | `inst … : field_shared` | not counted | ISA-5.1 Table 5.1.1 col. A row 1 | — | Drawn |
| Instrument, shared display / control, control room | `inst … : cr_shared` | not counted | ISA-5.1 Table 5.1.1 col. A row 2 | — | Accepted sample |
| Computer function, control room | `inst … : cr_computer` | not counted | ISA-5.1 Table 5.1.1 col. C row 2 | — | Drawn |
| PLC function, control room | `inst … : cr_plc` | not counted | ISA-5.1 Table 5.1.1 col. B row 2 | — | Drawn |

Signal and process lines are not separate symbols: each symbol carries short stubs of the lines it connects to, drawn in the ISA line style.

## Tier 2 — next

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Stirred reactor (CSTR) | `reactor_cstr` | 45 | ISO 10628-2 X8006 (jacketed vessel with agitator) | `reactor_cstr` | Drawn, from the engine catalog |
| Compressor | `compressor` | 42 | ISO 10628-2 reg. 2302 / X8179 centrifugal | `compressor` | Drawn, from the engine catalog |
| Air-cooled heat exchanger | `hx_air_cooled` | 40 | ISO 10628-2 X2505 (finned tube with fan) | `hx_air_cooled` | Drawn, from the engine catalog |
| Condenser | `condenser` | 30 (overcount) | ISO 10628-2 X8079 | `condenser` | Drawn, from the engine catalog |
| Cone-roof tank | `tank_cone_roof` | 29 | ISO 10628-2 X2063 | `tank_cone_roof` | Drawn, from the engine catalog |
| Blower, fan | `blower` | 24 | ISO 10628-2 X8164 | `blower` | Drawn, from the engine catalog |
| Boiler | `boiler` | 23 | ISO 10628-2 reg. 2532 | `boiler` | Drawn, from the engine catalog |
| Flare | `flare` | 21 | ISO 10628-2 reg. 2591 | `flare` | Drawn, from the engine catalog |
| Reboiler | `reboiler` | 20 | ISO 10628-2 X8131 | `reboiler` | Drawn, from the engine catalog |
| Tray column | `column_tray` | 18 | ISO 10628-2 X8101 | `column_tray` | Drawn, from the engine catalog |
| Butterfly valve | `valve_butterfly` | 10 | ISA-5.1 Table 5.4.1 no. 5; ISO X8075 | `valve_butterfly` | Drawn, from the engine catalog |
| Control valve, motor actuator | `valve_control [actuator: "motor"]` | counted in `valve_control` | ISA-5.1 Table 5.4.2 no. 9 | `valve_control` | Drawn, from the engine catalog |
| Control valve, piston actuator | `valve_control [actuator: "piston"]` | counted in `valve_control` | ISA-5.1 Table 5.4.2 no. 4 | `valve_control` | Drawn, from the engine catalog |
| Manual actuator / handwheel | — | — | ISA-5.1 Table 5.4.2 nos. 11–13 | — | Drawn; not in the engine |
| Interlock logic function | `inst … : interlock` (not parsed) | not counted | ISA-5.1 Table 5.1.2 no. 3 | — | Drawn; not in the engine |
| Instrument, local panel (discrete and shared) | `local_discrete`, `local_shared` | not counted | ISA-5.1 Table 5.1.1 row 4 (double line) | — | Drawn; the engine draws it wrong |
| Computer and PLC functions, field mounted | `field_computer`, `field_plc` | not counted | ISA-5.1 Table 5.1.1 cols. B–C row 1 | — | Drawn; the engine draws it wrong |
| Angle valve | — | — | ISA-5.1 Table 5.4.1 no. 2; ISO reg. 2102 | — | Drawn; not in the engine |
| Three-way valve | — | — | ISA-5.1 Table 5.4.1 no. 3; ISO reg. 2103 | — | Drawn; not in the engine |
| Pressure-reducing regulator | — | — | ISA-5.1 Table 5.4.3 nos. 10–11 | — | Drawn; not in the engine |
| Rupture disc | — | — | ISA-5.1 Table 5.4.3 no. 18; ISO X8080 | — | Drawn; not in the engine |
| Orifice plate (flow element) | — | — | ISA-5.1 Table 5.4.3 no. 5; ISO C0096 | — | Drawn; not in the engine |
| Concentric reducer | — | — | ISO 10628-2 reg. 516 | — | Drawn; not in the engine |
| Off-page connector | — | — | ISA-5.1 Table 5.3.2 no. 17 | — | Drawn; not in the engine |
| Strainer | — | — | ISO 10628-2 X8090 | — | Drawn; not in the engine |

## Tier 3 — later

| Symbol | DSL name | Users (90 days) | Standard | Engine catalog id | Status |
|---|---|---|---|---|---|
| Cyclone separator | `cyclone` | 9 | ISO 10628-2 X2618 | `cyclone` | Drawn, from the engine catalog |
| Plug-flow reactor | `reactor_pfr` | 9 | none (tubular vessel by convention) | `reactor_pfr` | Drawn, from the engine catalog |
| Spherical vessel | `sphere` | 9 | ISO 10628-2 reg. 2063 | `sphere` | Drawn, from the engine catalog |
| Burner | `burner` | 8 | ISO 10628-2 X8107 | `burner` | Drawn, from the engine catalog |
| Packed column | `column_packed` | 7 | ISO 10628-2 X8141 packing in X8100 | `column_packed` | Drawn, from the engine catalog |
| Cooling tower | `cooling_tower` | 7 | ISO 10628-2 reg. 2521 | `cooling_tower` | Drawn — waisted natural-draught profile, distribution and basin lines |
| Generator | `generator` | 6 (overcount) | ISO 10628-2 C0079 | `generator` | Drawn, from the engine catalog |
| Diaphragm pump | `pump_diaphragm` | 2 | ISO 10628-2 X8095 | `pump_diaphragm` | Drawn, from the engine catalog |
| Pump, general | `pump_general` | 2 | ISO 10628-2 reg. 2301 | `pump_general` | Drawn, from the engine catalog |
| Screw, progressive-cavity and piston pumps | — | — | ISO 10628-2 regs. 8092, 8093, X8094 | — | Drawn; not in the engine |
| Plate and U-tube heat exchangers | — | — | ISO 10628-2 regs. 2516, 2513 | — | Drawn; not in the engine |
| Electric motor, turbine | — | — | ISO 10628-2 C0082, reg. 2571 | — | Drawn; not in the engine |
| Agitator, heating jacket, vessel supports | — | — | ISO 10628-2 regs. 2672, X2069, C2005–C2008 | — | Agitator drawn with pitched blades; no standalone engine kind. Jacket and supports remain undrawn |
| Plug, diaphragm, needle and four-way valves | — | — | ISA-5.1 Table 5.4.1 nos. 4, 7, 9; ISO X8076 | — | Not drawn; not in the engine |
| Vacuum relief valve, steam trap | — | — | ISA-5.1 Table 5.4.3 nos. 16, 22 | — | Not drawn; not in the engine |
| Flame arrestor, sight glass, vent, flange | — | — | ISO 10628-2 regs. 2036, 2034, 2039, 511 | — | Not drawn; not in the engine |
| Fail-position arrows on actuators | — | — | ISA-5.1 Table 5.4.4 method B | — | Not drawn; not in the engine |
| Positioner, partial-stroke test device | — | — | ISA-5.1 Table 5.4.2 nos. 2, 15–16 | — | Not drawn; not in the engine |
| Data link and fieldbus lines | `software` (one style only) | — | ISA-5.1 Table 5.3.2 nos. 12–14 | — | Partly in engine |
| Heat-traced and jacketed lines | — | — | ISA-5.1 Table 5.3.1 no. 2; ISO X409 | — | Not drawn; not in the engine |
| Signal-processing function block | — | — | ISA-5.1 Table 5.1.2 no. 1 | — | Not drawn; not in the engine |
| Spec break (piping class change) | — | — | PIP PIC001 convention; not in ISA-5.1 or ISO 10628-2 | — | Not drawn; not in the engine |

## Missing from the engine

These are basic ISA-5.1 or ISO 10628-2 symbols the DSL cannot express today, or expresses but draws incorrectly.

- **Instrument symbols in the catalog.** The symbol catalog has no instrument entries at all, so the symbol sheet cannot compare the most common P&ID symbol with anything.
- **A complete catalog stylesheet.** The catalog's stylesheet omits the valve-body and inner-line classes, so every valve shows as a solid black hourglass and the inner lines of the filter, heat exchanger, gear pump, check valve and relief spring vanish. The symbol sheet therefore understates what the engine draws in a real diagram.
- **Correct instrument shapes.** The renderer inscribes a hexagon in a circle for shared control, a diamond in a circle for computer functions and a square in a circle for PLCs. ISA uses a circle in a square, a plain hexagon and a diamond in a square, so every DCS, computer and PLC bubble the engine draws is misread by an instrument engineer.
- **Location lines.** A local-panel instrument gets a dashed line; ISA uses a double line for a local panel and reserves the dashed line for the back of the main panel. The behind-panel variants cannot be expressed at all.
- **Interlock logic diamond.** The exemplar's `inst I-202 : interlock` is not a parser category and silently becomes a field-mounted bubble, so the hardwired trip path — the reason the exemplar exists — draws as an ordinary instrument.
- **Pneumatic and capillary line marks.** A single slash means an undefined signal in ISA; pneumatic is a pair of slashes, and a capillary tube is marked with crosses, not dots.
- **Manual actuators and fail-position marks.** There is no handwheel or manual operator, and fail position is text only, so a manual control valve or a fail-last valve cannot be drawn.
- **Angle and three-way valve bodies.** Relief valves, angle control valves and diverting valves all need them; without an angle body the relief valve cannot show its side outlet.
- **Self-actuated devices.** Pressure regulators, rupture discs and vacuum breakers are on every pressure system and have no DSL type.
- **In-line primary elements.** An orifice plate or other flow element cannot sit in a pipe, so a flow loop has no visible sensing point.
- **Piping fittings.** Reducers, flanges, strainers, vents, drains and spec breaks mark real construction boundaries; none can be drawn.
- **Off-page connectors.** A P&ID set spans many sheets, and a line cannot be marked as continuing on another drawing.

## Decisions for Victor

The library follows the standards wherever the accepted exemplar or the engine departs from them. Each item below changes what the engine and future targets are checked against.

1. **Shared control-room instrument is a circle in a square.** The exemplar, the engine and `docs/reference/22-PID-STANDARD.md` §4.1 draw a hexagon, which ISA-5.1 reserves for computer functions.
2. **Pump discharge follows the converging lines.** The two casing lines meet at the discharge nozzle (ISO reg. 2322); the exemplar's triangle points right while its pipe leaves from the top.
3. **Control-valve stems reach the body centre.** The exemplar's stem stops 14 short of the body, where it meets nothing.
4. **Vessel heads are 2:1.** Head depth is a quarter of the shell diameter, 30 on a 120 vessel. The accepted vertical-vessel sample used the exemplar's 22 and was redrawn at 30 so both vessels match.
5. **Valve bodies lie along the pipe, filled white.** The engine's catalog body is a rotated, solid black hourglass.
6. **Pneumatic signals carry a pair of slashes.** The exemplar's single slash is ISA's undefined-signal mark; the two accepted samples that carry a pneumatic stub were redrawn.
7. **The relief valve has an angle body.** Inlet from below, outlet to the side, spring above; the exemplar stands a straight valve on end and vents through its spring. The spring stays a zigzag (ISO's form) rather than ISA's crossed diagonal, because it reads more clearly at this size.
8. **The check valve is ISO's dotted body.** ISA-5.1 has no check valve, and the exemplar's diagonal flapper is in neither standard.
9. **Globe is the solid dot, ball is the open circle.** The engine draws a solid dot for its ball valve and a circle above the body for its globe valve.
10. **Gate stays a plain bowtie.** ISO adds a centre line for the gate type; the accepted sample follows the plainer US convention.
