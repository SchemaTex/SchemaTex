# Breadboard exemplar — button, knob and LED on an Arduino Uno

**Scenario.** The build most learners assemble in their first week: an Arduino Uno and a
half-size breadboard carrying a pushbutton, a potentiometer and an LED. The button on pin 2
has a 10 kΩ pull-down resistor, the LED on PWM pin 3 has a 220 Ω series resistor, and a
10 kΩ trimmer potentiometer on A0 sets the LED's brightness. It joins Arduino's two
official beginner examples, Button (pin 2 with a 10 kΩ pull-down) and AnalogInput (a
potentiometer wiper on A0), with the classic resistor-plus-LED output. Five parts and ten
wires are enough to show every idea a beginner has to get right on a breadboard:
- power rails
- five-hole strips
- parts that straddle the centre trough
- LED polarity
- a series resistor
- a pull-down resistor
- a three-leg part

The picture stays readable at a glance.

**Layout.** Everything is drawn at true scale, with 0.1 inch = 18 px on the breadboard *and*
on the Uno. The Uno sits above the board with its power and analog header facing down.
Because the two share one pitch, the Uno's 5V, GND and A0 pins sit exactly over columns 3,
4 and 8, and those three wires drop straight into their holes. Pins 2 and 3 are on the
far header near the Uno's right end. Their wires go up over the board's top edge and down
the free space to its right, and the pin 3 wire runs outside the pin 2 wire so the two
never cross. Parts run left to right in the order of the pins that feed them: knob (A0),
button (pin 2), LED (pin 3). Every part takes power from the top rails through short
jumpers. The button and the LED sit over the trough with their legs in rows e and f, so
their bodies cover no holes.

The drawing ends up with ten wires, no wire crossings, and no wire passing over a part, a
lead, another wire's end or a label.

**How the source is read.**
- `button @17e` names the top-left leg. The four legs sit at 17e, 19e, 17f and 19f, which is
  0.2 in along the row and 0.3 in across the trough.
- `led red @26f..26e` runs from anode to cathode.
- `potentiometer @7e` puts three legs 0.1 in apart in holes 7e, 8e and 9e, with the body
  above them.
- `uno:GND` uses the GND pin next to 5V, because it is the one nearest the rail it feeds.

**Palette.**

| Role | Colour |
|---|---|
| Title text (ink) | `#1F2328` |
| Secondary text | `#5B616B` |
| Part labels | `#4A4F57` |
| Board | `#F4F1E9`, edge `#D6CFBF`, groove `#E4DECF`, trough `#E6E0D2` |
| Holes | `#8A8475` |
| Board lettering | `#A09886` |
| Rail stripes | red `#D9483B`, blue `#3E73BA` |
| Uno board | teal `#1A8A8F`, edge `#0E6468` |
| Uno lettering | `#E9F6F6`; unused pin names dimmed to `#A9D8DA` |
| Part leads | grey `#8E8E8E`, ending in a dark dot `#5C5C5C` |

Wires use a core colour over a darker edge colour:

| Wire | Core | Edge |
|---|---|---|
| 5 V | red `#D83A2E` | `#8F2019` |
| Ground | black `#383C42` | `#0B0C0E` |
| A0 | yellow `#F0B825` | `#A07409` |
| Pin 2 | green `#2E9B57` | `#1B6334` |
| Pin 3 | orange `#EE8420` | `#A5540B` |

**Type scale.**
- Title 20/700 and subtitle 12.5 regular.
- Legend heading 12/700 and legend entries 11.5.
- Part labels 11/600.
- Board row letters and column numbers 9.
- Uno pin names 7.5, rotated as on the real board. Pins the build uses are 8.5 bold white,
  so the reader can find where each wire goes.
- Uno header group names ("DIGITAL (PWM ~)", "POWER", "ANALOG IN") 8/700, letter-spaced.
- Uno wordmark 28/800.

**Part drawing.**
- **Board.** Thirty columns, rows a–e and f–j, with 0.3 in between e and f (the real DIP
  spacing) and a trough channel between them. Holes are 4.4 px rounded squares. Each rail
  has 25 holes in groups of five, with gaps at columns 6, 12, 18 and 24 as on a real
  400-point board. Red and blue stripes run outside each hole pair, with + and − at both
  ends. Column numbers are printed every five columns, top and bottom.
- **Uno.** Real 2.7 × 2.1 in outline with a USB-B socket, barrel jack, reset button, the
  ATmega328P DIP-28 and four mounting holes. The header strips sit at their true positions,
  including the 0.16 in gap between pins 7 and 8, and carry the real silkscreen names.
  Detail stops there: no traces or small components. SparkFun's part guide recommends
  keeping boards simplified.
- **Resistor.** Beige dog-bone body, 46 × 13 px, with four colour bands taken from the
  value: 10 kΩ is brown-black-orange-gold and 220 Ω is red-red-brown-gold. Grey leads run
  straight along the row to their holes.
- **Trimmer potentiometer.** 50 px blue body with a cream rotor and cross slot. It stands
  over rows b–d, with three legs in row e.
- **Pushbutton (6 mm tactile).** Black 40 px body with a dark round cap and four short legs.
  The legs across the trough are always connected; pressing the button joins the two legs
  on the same side.
- **LED.** Top view of a 5 mm red dome whose flange is flattened on the cathode side (the
  standard polarity mark). It straddles the trough, anode in f and cathode in e.

**Wiring.** The colours follow the tutorial convention: red for 5 V, black for ground, and a
distinct colour for each signal. There are two kinds of wire, as on a real bench:
- **Flexible jumpers** from the Uno are drawn as dressed runs with 22 px rounded bends.
- **Short rail jumpers** are straight, like pre-cut breadboard jumper wire.

Every wire is a 4.2 px core over a 6.4 px darker edge with a faint highlight, so yellow
still reads on a light board. Each end is a dark cap with a pale pin tip, so the reader can
see a wire is plugged in and not just passing over a hole. A small legend beside the board
names each wire's colour and job.

**Labels.** Parts are labelled by value and kind ("10 kΩ pot", "button", "LED"), which is
what a learner needs to pick the right part from a kit. The trough has no holes, so it is
the label lane for the parts beside it. A resistor's value sits two rows below it, on a
board-coloured plate snapped to the hole grid. The plate hides exactly three unused holes
and never part of one.

**Collisions and connectivity.** The draw script places every lead and wire end on a hole
or header-socket centre, then measures every label against every other label, every wire,
every part body, every lead or wire end and the canvas edge. It also checks every wire
against every part body, every other wire and every other wire's end. The result is 0
problems.

A separate check does not use the draw script's model. It reads the geometry back out of
`ideal.svg` and compares the resulting nets with the engine's own parse of `source.sx`.
The drawing has:
- 10 wires and 13 part terminals, the same counts as the source
- 0 wire ends or leads off a hole
- 0 connectivity mismatches

The nets it confirms:
- **5 V:** potentiometer end and the button's supply side
- **Ground:** potentiometer end, pull-down resistor and LED cathode
- **Pin 2:** button's switched side and the pull-down resistor
- **A0:** wiper
- **Pin 3:** 220 Ω resistor into the LED anode

**Departures from `docs/reference/26-BREADBOARD-STANDARD.md`.**
- **Board colour.** The board is a light warm off-white instead of tan (§3.1). Today's
  boards, and the Wokwi and Tinkercad simulators, are white. The lighter ground also gives
  every wire colour, including yellow, more contrast.
- **Wire shapes.** Wires are dressed runs and straight rail jumpers, not one parametric
  Bézier arc per wire (§6.3). A single arc formula makes a two-hole rail jumper bulge
  sideways and sends long wires sweeping across labels and parts. Fritzing itself offers
  both curves and bendpoints.
- **Labels.** Parts carry value labels beside them, not designators in off-board callouts
  with leader lines (§3.1, §6.4). A leader from a part in the middle of the board would have
  to cross wires, and learner tutorials label by value.
- **The Arduino.** The Uno is drawn with its real outline and header positions, not as a
  block listing pin names (§4.3). The real header layout is what lets power wires drop
  straight into the rails, and it is the object every learner recognises first.
- **Rail holes.** Rails have 25 holes in groups of five (the doc's "25-tie-point segments",
  §6.1). The DSL addresses rails by column, so columns 6, 12, 18, 24 and 30 have no rail
  hole, and the source avoids them.

**Why the earlier case targets fell short.**
1. **The Uno became unrecognisable.** They replace it with a blank teal box carrying two to
   five pin squares. That throws away the one object every learner recognises; the engine
   at least prints the full header.
2. **The board stops meaning anything.** Their wires leave that box as long parallel sweeps
   across the whole terminal area. In the HC-SR04 target, four wires cross the board
   without touching a single hole.
3. **Parts are misdrawn.** The pushbutton is a dark tile on rows a–b, with wires ending
   inside its body, instead of straddling the trough. The potentiometer is a tile on top of
   row a.
4. **Labels cover the board.** White pill labels sit on it like stickers over holes.
5. **The circuit is too small.** Oversized dark holes, a large title, a colour legend and a
   boilerplate footnote shrink it to a small part of the canvas.

**References.**
- Fritzing, *Fritzing's Graphic Standards* — https://fritzing.org/fritzings-graphic-standards
- Fritzing blog, *Fritzing gets the bends* (curved wires and bendable legs) — https://blog.fritzing.org/2011/08/18/fritzing-gets-the-bends
- SparkFun, *Make Your Own Fritzing Parts: Custom Breadboard SVG* — https://learn.sparkfun.com/tutorials/make-your-own-fritzing-parts/custom-breadboard-svg
- SparkFun, *How to Use a Breadboard* — https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard/all
- SparkFun, *SIK Experiment Guide for Arduino V3.2, Experiment 5: Push Buttons* — https://learn.sparkfun.com/tutorials/sik-experiment-guide-for-arduino---v32/experiment-5-push-buttons
- Arduino Docs, *Button* built-in example (source text) — https://github.com/arduino/docs-content/blob/main/content/built-in-examples/02.digital/Button/Button.md
- Arduino Docs, *Analog Input* built-in example (source text) — https://github.com/arduino/docs-content/blob/main/content/built-in-examples/03.analog/AnalogInput/AnalogInput.md
- Arduino Project Hub, *Working with a Potentiometer and an LED* — https://projecthub.arduino.cc/SBR/working-with-a-potentiometer-and-an-led-32dd9d
- Adafruit Learning System, *Arduino Lesson 6: Digital Inputs — Breadboard Layout* — https://learn.adafruit.com/adafruit-arduino-lesson-6-digital-inputs/breadboard-layout
- Adafruit Learning System, *Arduino Lesson 0: Getting Started — Breadboard* — https://learn.adafruit.com/lesson-0-getting-started/breadboard
- Makeability Lab, *L1: Using buttons* — https://makeabilitylab.github.io/physcomp/arduino/buttons.html
- Wokwi Docs, *wokwi-arduino-uno Reference* (the three GND pins and where they sit) — https://docs.wokwi.com/parts/wokwi-arduino-uno
- Wokwi Docs, *diagram.json File Format* — https://docs.wokwi.com/diagram-format
- duino4projects, *Multiple LEDs & Breadboards With Arduino in Tinkercad* (Tinkercad highlights connected five-hole groups) — https://duino4projects.com/multiple-leds-breadboards-with-arduino-in-tinkercad/
