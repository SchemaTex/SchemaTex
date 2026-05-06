# 26 — Breadboard / Physical Wiring Diagram Standard Reference

*Fritzing-style physical wiring diagrams for solderless prototyping. Photo-realistic-ish breadboard substrate, component bodies (resistors with color bands, LEDs as domes, IC chips with notches), and **colored jumper wires routed as smooth Bézier arcs** between specific tie-points. Complementary to — not a replacement for — the abstract circuit schematic (`circuit`, §08).*

> **Primary References:**
> - **Knörig, A., Wettach, R., & Cohen, J.** (2009). *Fritzing — A Tool for Advancing Electronic Prototyping for Designers.* Proceedings of the 3rd International Conference on Tangible and Embedded Interaction (TEI '09), Cambridge, UK. ACM. DOI 10.1145/1517664.1517735.
> - **Fritzing project** — https://fritzing.org · source: https://github.com/fritzing/fritzing-app · parts: https://github.com/fritzing/fritzing-parts.
> - **Fritzing Part File Format** — https://github.com/fritzing/fritzing-app/wiki/2.1-Part-file-format.
> - **Fritzing Graphic Standards** — https://fritzing.org/fritzings-graphic-standards.
> - **Adafruit Fritzing Library** — https://github.com/adafruit/Fritzing-Library.
> - **SparkFun Make Your Own Fritzing Parts** — https://learn.sparkfun.com/tutorials/make-your-own-fritzing-parts.
> - **Adafruit "Make Beautiful Fritzing Parts with eagle2fritzing/brd2svg"** — https://learn.adafruit.com/make-beautiful-fritzing-parts-with-eagle2fritzing-brd2svg.
> - **Wokwi `diagram.json` File Format** — https://docs.wokwi.com/diagram-format. *Closest LLM-friendly text-DSL precedent; thousands of public examples.*
> - **Wokwi Supported Hardware** — https://docs.wokwi.com/getting-started/supported-hardware.
> - **Arduino documentation conventions** — https://docs.arduino.cc.
> - **IEEE 315** — *Graphic Symbols for Electrical and Electronics Diagrams*. Mentioned for completeness of the "complementary view" framing — IEEE 315 governs the **schematic** view (`circuit`, §08), NOT the breadboard view.

**Positioning.** Breadboard view is the iconic visual genre of Arduino / ESP32 / Raspberry Pi tutorials. Every Adafruit / SparkFun / Hackster / Instructables tutorial ships a Fritzing breadboard image alongside the schematic. There is **no LLM-friendly, copy-paste-able, version-controllable text DSL** for this view today — Fritzing is a desktop GPL'd C++ binary with XML/SVG part files, Wokwi is the closest precedent but is a simulator (not a doc-embeddable renderer) and uses pixel coordinates rather than breadboard-native (col, row) addressing. Schematex closes this gap with a hand-written zero-dependency engine, AGPL-clean stylized SVG parts, and a DSL that addresses every wire as `partId:pin → @col-row`.

**Relation to existing schematex engines.**

| Engine | Coverage | Why breadboard is different |
|---|---|---|
| `circuit` (§08, IEEE 315 / IEC 60617) | **Abstract** schematic — gates, op-amps, KCL nodes | Breadboard is **physical / spatial** — every component lives at a specific `(col, row)` on the board. Schematic and breadboard are the two complementary views of the same prototype; engineers reason with one, learners replicate with the other. |
| `logic` (§07, IEEE 91) | Boolean gate nets | Combinational only; no physical layout. |
| `block` (§09, control systems) | Continuous-time transfer functions | Different domain entirely. |
| `pid` (§22, ISA-5.1) | Industrial process & instrumentation | Industrial scale; not maker-board. |

`circuit` and `breadboard` will share approximately **30 % of the part metadata** (pin counts, conventional names) but are different engines with different layout algorithms. Users who want both views of the same prototype write each view's DSL separately; future cross-engine sync is post-v1.

---

## 1. Users & Needs

### 1.1 Personas

| Role | Scenario | Frequency | Why Fritzing / draw.io / Mermaid don't fit |
|---|---|---|---|
| **Maker / hobbyist tutorial author** | "How to wire HC-SR04 to Arduino" blog post | Weekly | Fritzing GUI is slow; output is PNG screenshots, not version-controlled |
| **Arduino / ESP32 educator** (HS, community college) | Class slides, lab handouts | Weekly | Needs free, embeddable, projectable; Fritzing not browser-embeddable |
| **STEM curriculum publisher** (Adafruit Learning, SparkFun) | Tutorial library scale | Daily | Currently a manual screenshot pipeline |
| **Open-hardware README author** (every Arduino/ESP32 GitHub repo) | README docs | One-shot, then stale | Static PNG breaks when the board revision changes |
| **LLM (ChatGPT / ChatDiagram)** | "Show me how to wire X to Y" | Daily, thousands of times | LLM produces text pin maps; nobody can render them to SVG |
| **Hackathon / makerspace / fablab** | Quick reproducible recipes | Per workshop | Need fast, embeddable; Fritzing is a heavy install |

### 1.2 What Schematex must do

1. **Text-first DSL** — `parts` + `connections`, hand-authorable in 10–30 lines.
2. **Breadboard-native coordinates** — `@5e` (column 5, row e) instead of pixel `top/left`. This is where we beat Wokwi for hand-authoring and LLM generation.
3. **Smooth Bézier wires** — the iconic Fritzing arc, not Manhattan right angles. This is the single biggest visual differentiator from `circuit`.
4. **Color-coded nets** — red = +V, black/blue = GND, configurable signal palette.
5. **AGPL-clean stylized SVG parts** — no Fritzing asset reuse; hand-drawn vector primitives (resistor cylinder + bands, LED dome, DIP body + notch + pins).
6. **Embeddable** — output is plain SVG; works in any Markdown / Next.js / Notion-like.
7. **Validation** — DIPs straddle the central trough; power-rail breaks reported; impossible coordinates rejected.

---

## 2. Market Need

### 2.1 Demand signal (qualitative)

Search-volume tooling not yet pulled; magnitudes below are training-corpus impressions and should be re-validated with Ahrefs.

| Term cluster | Volume tier | Intent |
|---|---|---|
| `breadboard diagram`, `arduino wiring diagram`, `esp32 wiring` | High | Tutorial / replication |
| `fritzing alternative`, `fritzing online`, `online breadboard simulator` | Mid | Tool research, frustration with desktop install |
| `wokwi diagram`, `arduino simulator online` | Mid–rising | Already-text-DSL audience |
| `arduino tutorial pdf`, `esp32 project ideas` | High | Adjacent demand |

### 2.2 Competitive landscape

| Product | Positioning | License | Key gap |
|---|---|---|---|
| **Fritzing** | Desktop authoring (the genre's namesake) | GPL (binary releases since v0.9.4 paid) | Desktop install; XML+SVG file format too complex for LLMs; not embeddable |
| **Wokwi** | Browser Arduino simulator + breadboard editor | Proprietary SaaS; some MIT parts | Not a renderer for arbitrary docs; pixel coordinates not breadboard-native |
| **Tinkercad Circuits** | Browser learning tool | Proprietary (Autodesk) | No exportable DSL; visual editor only |
| **Circuit Canvas** | Browser editor | Commercial | No DSL; subscription |
| **EasyEDA** | Schematic + PCB | Free (JLCPCB-tied) | Schematic and PCB only — no breadboard view |
| **TikZ-circuitikz / LaTeX** | Schematic | Free | LaTeX only; no breadboard view |
| **draw.io / Mermaid / D2** | General diagrams | Free / MIT | No breadboard mode at all |

**Schematex differentiation:** the only **zero-dependency, embeddable, Markdown-native, AGPL** library that emits Fritzing-style breadboard SVG from a text DSL. The wedge is "AI-native breadboard diagrams" — close the loop between an LLM that already knows how to wire HC-SR04 to an Uno and a renderer that can produce the SVG.

---

## 3. Standard Compliance

There is **no ISO/IEC standard** for breadboard view — Fritzing is the de-facto reference. Schematex follows Fritzing visual conventions with the deviations listed below; we do not consume Fritzing part files (license + complexity + AGPL hygiene reasons).

### 3.1 What we follow from Fritzing

- Tan/khaki breadboard substrate with grid of circular tie-point holes.
- Power rails marked red (+) and blue (−) on top and bottom long edges.
- Component bodies stylized in colors recognisable from Fritzing (resistor beige, electrolytic capacitor silver, LED with colored dome, DIP black with white silkscreen, pushbutton blue/black).
- Wires as smooth Bézier curves, solid colors per net role (red/black/blue/yellow/green/white/purple).
- Component reference designators (R1, C2, LED1) drawn off-board with leader lines (not on top of the breadboard).

### 3.2 Where we deviate

- **No Fritzing asset reuse.** All component primitives are hand-drawn AGPL.
- **No `.fzz` import.** Schematex consumes only its own DSL.
- **Breadboard-native coordinates** (`@5e`) instead of pixel coordinates.
- **Curve generator** is parametric (control-point offset proportional to span), so the iconic arc emerges from layout math, not artist-placed Bézier handles.

### 3.3 Physical accuracy commitments

- Hole pitch is **0.1 inch (2.54 mm)** — the universal DIP standard. Rendered at 14px / hole at default zoom.
- The **central trough** breaks horizontal connection between rows e and f.
- Power rails on full-size (830-tie-point) boards **break at column 30/31** by default; toggle off with `power-rails: continuous`. Half-size boards are continuous.
- Numbered columns (1..30 or 1..63) and lettered rows (a–e top, f–j bottom) match the universal silkscreen convention.

---

## 4. Component Catalog

### 4.1 Breadboard substrate

| Form | Tie points | Columns | Power rails | DSL |
|---|---|---|---|---|
| Mini | 170 | 17 cols × 5 rows × 2 halves | none | `board mini` |
| Half-size | 400 | 30 cols × 5 rows × 2 halves | 2 pairs (top + bottom), continuous | `board half` (default) |
| Full-size | 830 | 63 cols × 5 rows × 2 halves | 2 pairs (top + bottom), break at 30/31 | `board full` |

Rows are labelled `a b c d e | f g h i j` with the central trough between `e` and `f`. Columns numbered from the left silkscreen.

**Coordinate notation:**
- `@5e` — column 5, row e (top half)
- `@12g` — column 12, row g (bottom half)
- `@+t8` — top positive rail, column 8
- `@-t8` — top negative (ground) rail, column 8
- `@+b14`, `@-b14` — bottom rails

### 4.2 Discrete components

Footprint = (cols spanned × rows spanned), orientation. Conventional pin colors are loose, not standard.

| Component | Footprint | Visual | DSL kind |
|---|---|---|---|
| Resistor (¼W) | 4–8 cols × 1 row | beige cylinder, 4–5 color bands, bent grey legs | `resistor` |
| LED (5mm) | 2 holes adjacent | colored dome + flat-side flag (cathode); long lead = anode | `led` |
| Electrolytic capacitor | 2 holes | aluminum can + white stripe (negative side) | `cap-elec` |
| Ceramic / disc capacitor | 2 holes | yellow disc | `cap-ceramic` |
| Diode (1N400x) | 3–4 cols × 1 row | black/grey cylinder, silver band = cathode | `diode` |
| Transistor (TO-92) | 3 adjacent cols | half-cylinder, flat face forward, 3 leads | `transistor-to92` |
| DIP IC (8/14/16/28-pin) | spans trough; (N/2) cols × 2 halves | black rect, semicircle notch on pin-1 end, white silkscreen | `dip pins=N` |
| Tactile pushbutton (12mm) | 4 holes (2 cols × 2 cols across trough or single half) | square body, cross marker, 4 leads | `button` |
| Slide switch SPDT | 3 holes × 1 row | rectangular silver body | `switch-spdt` |
| DIP switch (8-position) | 16 holes spanning trough | red/blue rect, white toggles | `dipswitch pins=N` |
| Trim potentiometer | 3 holes triangular | blue cube + brass screw | `pot-trim` |
| Crystal oscillator | 2 holes | silver oval can | `crystal` |
| Header pins (1×N) | N holes × 1 row | black plastic strip, gold pins | `header pins=N` |
| Female header (2.54mm) | N holes × 1 row | black socket strip | `socket pins=N` |

### 4.3 Microcontroller boards (sit beside or straddle the trough)

| Board | DSL | Placement |
|---|---|---|
| Arduino Uno | `mcu uno` | beside board (typically left or above) |
| Arduino Nano | `mcu nano` | spans trough, ~15 cols |
| Arduino Pro Mini | `mcu promini` | spans trough |
| ESP32 DevKit V1 | `mcu esp32` | spans trough, wider |
| Raspberry Pi Pico | `mcu pico` | spans trough, 20 cols |
| Teensy 4.0 | `mcu teensy40` | spans trough |

All boards expose labelled pin names (`D2`, `A0`, `5V`, `GND`, `GPIO21`, etc.). DSL refers to pins as `partId:pinName`.

### 4.4 Sensors / display modules / actuators

| Module | DSL | Pin count |
|---|---|---|
| HC-SR04 ultrasonic | `sensor hcsr04` | 4 (VCC, GND, TRIG, ECHO) |
| DHT11 / DHT22 temperature-humidity | `sensor dht11` / `sensor dht22` | 4 (VCC, GND, DATA, NC) |
| MPU6050 IMU | `sensor mpu6050` | 8 (VCC/GND/SDA/SCL/INT/AD0/XDA/XCL) |
| Photoresistor (LDR) | `sensor ldr` | 2 |
| KY-040 rotary encoder | `module rotary-ky040` | 5 (VCC/GND/CLK/DT/SW) |
| SSD1306 OLED I²C 128×64 | `display oled-ssd1306` | 4 (VCC/GND/SDA/SCL) |
| 16×2 LCD HD44780 | `display lcd-1602` | 16 (VSS/VDD/V0/RS/RW/E/D0–D7/A/K) |
| 16×2 LCD I²C backpack | `display lcd-1602-i2c` | 4 |
| 7-segment (single digit) | `display seg7` | 10 |
| Servo SG90 | `actuator servo-sg90` | 3 (brown=GND, red=VCC, orange/yellow=signal) |
| DC motor (with L298N driver) | `actuator motor-dc + driver l298n` | external |
| Stepper 28BYJ-48 (with ULN2003) | `actuator stepper-28byj + driver uln2003` | 5+4 |
| 9V battery clip | `power 9v-clip` | 2 |
| 4×AA battery pack | `power aa4` | 2 |
| 18650 holder | `power 18650` | 2 |

### 4.5 Jumper-wire color convention

Loose convention; not a standard.

| Color | Conventional role | DSL |
|---|---|---|
| Red | +V (5V, 3.3V, VCC) | `red` |
| Black | GND (also blue used) | `black` |
| Blue | GND or negative supply | `blue` |
| Yellow | signal / data | `yellow` |
| Orange | signal | `orange` |
| Green | signal (often I²C SDA) | `green` |
| White | signal (often I²C SCL) | `white` |
| Purple, brown, grey | arbitrary signals | `purple`, `brown`, `grey` |

The renderer enforces only color tokens; net-role labelling is the user's responsibility.

---

## 5. DSL Grammar

### 5.1 Header

```
breadboard
board: half | full | mini      // default half
title: "Blink LED on Arduino Uno"
```

### 5.2 Parts block

```
parts
  uno: mcu uno @beside-left
  r1:  resistor 220 @5e..9e         // spans columns 5-9 in row e, top half
  d1:  led red @10e..10f            // anode row e, cathode row f (legs splayed)
```

Each part is `id : kind [args] @placement`. The placement is either:
- `@col-row` — single coordinate (point parts: cap, button center)
- `@start..end` — span of two coordinates (resistor, diode, jumper)
- `@beside-left | @beside-right | @above | @below` — for MCU boards beside the breadboard
- `@span-from-col` — DIP/MCU automatically spans trough centered on a column

### 5.3 Connections (wires)

```
wires
  uno:5V  --red--    @+t1            // wire from Uno 5V pin to top positive rail col 1
  uno:GND --black--  @-t1
  @+t1    --red--    @5a             // power rail to row a column 5
  uno:13  --yellow-- @9a             // signal D13 to row a column 9
```

Wires are `from --color-- to`. The renderer draws a smooth cubic Bézier arc. `from` / `to` may be:
- `partId:pinName` — a labelled pin on a part
- `@col-row` — a hole on the breadboard
- `@+t14` / `@-b22` — a power-rail tie point

### 5.4 Optional routing hints

```
wires
  uno:13  --yellow-- @9a  via @8c    // intermediate hole forces an arc shape
```

Most wires need no hint — the layout engine picks a natural arc. `via` is the escape hatch for visually crowded boards.

### 5.5 Labels and notes

```
labels
  r1:   "R1 220Ω"    @leader-above    // off-board callout with leader line
  d1:   "Status LED" @leader-right
note "Use 220–330Ω for typical 5mm LED" @bottom
```

### 5.6 Validation rules

- DIP and MCU parts that **straddle the trough** must have `pins` count divisible by 2 and are placed centered on the trough automatically.
- A coordinate must exist on the chosen board form.
- Power-rail tie points must respect `power-rails: continuous | broken`.
- A part's footprint must not collide with another part's footprint (warn, not error).
- Wires can cross other wires freely (they sit above the board surface) — no junction validation.

### 5.7 Theme tokens

```ts
interface BreadboardTokens {
  board: { fill: string; stroke: string; holeFill: string };
  rails: { positive: string; negative: string };
  silkscreen: { columnLabels: string; rowLabels: string };
  components: {
    resistorBody: string;
    capCan: string;
    ledDomes: Record<string, string>;  // 'red'|'green'|'blue'|...
    dipBody: string;
    dipSilk: string;
    pcb: string;          // sensor / module PCB color (Adafruit purple, SparkFun red, generic green)
  };
  wires: Record<string, string>;  // 'red' | 'black' | 'yellow' | ...
}
```

Three presets: `default` (Fritzing-like tan), `monochrome` (BW, print-friendly), `dark` (dark theme breadboard ≈ #2a2a2a).

---

## 6. Layout Rules

### 6.1 Board geometry

- Hole pitch: 14px at default zoom (renders to 0.1 inch at typical 140 DPI).
- Hole diameter: 4px filled circle (or compound-path "punched" hole if `style: punched` set).
- Column labels (1..30 or 1..63) every 5 columns, 6pt sans-serif.
- Row labels (a–e, f–j) at left and right edges, 6pt sans-serif.
- Power rails: 8px-wide colored stripe along long edges, 25-tie-point segments.

### 6.2 Component placement

- All component pin-coordinates snap to hole centers.
- Component bodies extend above the board surface; rendered as SVG `<g>` at z-order above board, below wires.
- DIPs and MCU boards that span the trough are auto-positioned with pin row 1 on row e and pin row 2 on row f (or wider for 28-pin parts).
- Off-board MCU boards (Uno, Mega) sit at `@beside-left` (default), `@beside-right`, `@above`, or `@below` — the layout engine reserves padding ≥ 100px for the board PCB.

### 6.3 Wire routing (the key visual differentiator)

- Wires are **cubic Bézier curves** from source hole center to target hole center.
- Control-point offset perpendicular to the chord, magnitude `≈ 0.4 × |dy|` for horizontal-dominant runs, `≈ 0.4 × |dx|` for vertical-dominant runs. This produces the iconic Fritzing arc.
- Stroke width: 3px at default zoom.
- Color from DSL `--color--` token; mapped to `BreadboardTokens.wires[color]`.
- Endpoint markers: small filled circle (r=1.5px) at each end to suggest the wire seating in the hole.
- Crossings allowed; no junction dots, no orthogonal routing.
- z-order: wires render above all components.

### 6.4 Labels / leader lines

- Reference designators (R1, C2, LED1) rendered as 8pt text in an off-board callout box with a thin leader line (1px) to the component.
- Default leader direction: above-right; user can override per-part with `@leader-{above|below|left|right}`.

### 6.5 Trough rule

- Components straddling the trough must have pins on both sides (rows e and f, or further out for wider DIPs). Validator enforces.
- Visual gap between rows e and f is rendered as a white channel ~14px wide, matching real breadboard.

---

## 7. Canonical Test Cases

All five fit on a half-size 400-tie-point board.

### 7.1 Blink LED (the maker hello-world)

Arduino Uno + 5mm red LED + 220Ω resistor. 3 wires: `5V` → resistor → LED anode, LED cathode → `GND` (or `D13` → resistor → LED → `GND` for the classic blink). Minimum viable; tests basic part placement, two-segment wire from MCU pin to row, smooth-arc rendering.

### 7.2 HC-SR04 distance sensor + Arduino Uno

4 wires: VCC → 5V, GND → GND, TRIG → D9, ECHO → D10. Tests sensor module rendering (PCB tile beside the breadboard), labeled pin pickup.

### 7.3 DHT11 temperature/humidity + Arduino Uno

4 wires: VCC → 5V, GND → GND, DATA → D2, plus a 10kΩ pull-up resistor between VCC and DATA. Tests cross-rail wire (resistor between two breadboard rows) + the iconic pull-up motif.

### 7.4 Rotary encoder + 16×2 LCD I²C + Arduino Uno

9 wires: encoder VCC/GND/CLK/DT/SW (5) + LCD VCC/GND/SDA → A4/SCL → A5 (4). Tests two modules, I²C bus aggregation, color-coded SDA/SCL convention.

### 7.5 ESP32 DevKit + SSD1306 OLED I²C

4 wires: 3V3 → VCC, GND → GND, SDA → GPIO21, SCL → GPIO22. Tests ESP32 (3.3V instead of 5V), OLED part, I²C bus.

A sixth nice-to-have for the gallery: **classic Arduino "Knight Rider" 8-LED chase** — eight LEDs + eight resistors in row a/c, eight wires to D2..D9. Tests dense-component layout and many parallel wires.

---

## 8. Pitfalls & Gotchas

1. **Power-rail break at column 30/31** on full-size boards. Half of the universe of "my circuit doesn't work" tutorials is this. Schematex defaults `board: full` to broken rails; warn-level message if user wires across the break.
2. **DIPs must straddle the trough.** A DIP placed wholly in the top half short-circuits both pin rows. Validator hard error.
3. **LED polarity.** Long lead = anode (+), short lead = cathode (−). DSL: `led red @10e..10f` puts anode at row e (closer to power); rendering shows the flat-side flag on the cathode.
4. **Electrolytic capacitor polarity.** Stripe = negative. Same convention.
5. **Resistor color bands** are decorative in this engine; we render bands derived from the `value` argument (e.g. `220` → red-red-brown-gold) but do not validate value matches a real E12/E24 series — the tutorial author is trusted.
6. **Wire color is not electrically meaningful** — it's a visual convention. The renderer does not enforce red = +V; it just renders whatever the user wrote. Tutorials that mis-color won't crash.
7. **Components on the breadboard ≠ components on the schematic.** Pin numbering on a breadboard part follows physical lead order; on a schematic it follows logical pin function. Don't expect 1:1 correspondence between this engine and `circuit` (§08) at the pin-name level.
8. **Modules with female-header pins** (HC-SR04, DHT11, OLED) are usually wired with **female-to-male jumper wires**, but Schematex renders them all as the same Bézier arc — we don't differentiate jumper-wire connector types visually (kept simple).
9. **MCU boards beside the breadboard need padding.** Layout reserves ≥ 100px so that pin labels (D2, A0, GND) are readable. SVG width grows accordingly.
10. **Mini boards have no power rails** — DSL wiring `@+t1` on `board: mini` is a hard error.
11. **AGPL hygiene.** Schematex part SVGs are hand-drawn from scratch; we do not reuse Fritzing's GPL'd asset library. If a user wants Fritzing-faithful rendering they can use Fritzing.
12. **Wokwi parity is non-goal.** We borrow the topology mental model (`parts`, `connections`) and the namespaced part-type strings, but our coordinate system is breadboard-native, our wires are smooth, and we are a renderer not a simulator.

---

## 9. Out of Scope (Deferred)

- `.fzz` import / Fritzing file format compatibility
- PCB view rendering (Schematex does not do PCB layout)
- Schematic round-trip (auto-generate `circuit` DSL from `breadboard` DSL)
- Real-time interactivity (Wokwi simulator features)
- Component-value validation (Ohm's law, current limits) — the engine is a renderer, not a SPICE
- Custom user parts library import — v1 ships fixed catalog; user-defined parts deferred

---

## 10. Implementation Status

Not yet implemented. Tracked as `breadboard` engine; impl docs land in `../CoCEO/schematex/impl/26.X-breadboard-*.md`.
