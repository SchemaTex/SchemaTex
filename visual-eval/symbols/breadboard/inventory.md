# Breadboard part library — inventory

This file lists every part a breadboard diagram needs. For each part it gives the DSL word
that names it, how many people used it, and the convention its drawing follows. The usage
figures come from ChatDiagram: 386 people made a breadboard diagram in the 90 days to
September 2026, and each count is how many of them used the part's DSL word. Tier 1 is
the 14 most-used parts plus the jumper wire, which every build has. These 15 are drawn in
this folder in the style of the accepted exemplar (`visual-eval/exemplars/breadboard/`).
Tier 2 is every other part the engine already knows that at least 10 people used. Tier 3
is the rest of the engine's parts. After the tiers comes a list of parts learners commonly
use that the DSL cannot name yet.

**How to read the user counts.**
- **Long forms.** A hyphenated alias is already inside the shorter word's count: every
  `servo-sg90` user is also counted under `servo`. For those parts the table shows the
  shorter word's count.
- **Different words.** Aliases that are different words, such as `pot` and
  `potentiometer`, can be written by the same person. The table shows a range, from the
  larger count to the sum of both.
- **Overcounts.** `dip`, `header`, `button`, `cap`, `relay` and `motor` also match ordinary
  text, so those counts run high.
- **Manifest.** `usageUsers` in `manifest.json` stores the lower end of each range.

## Tier 1

| Part | DSL kind | Users (90 days, aliases combined) | Convention source | In engine? | Status |
|---|---|---|---|---|---|
| Resistor, 1/4 W | `resistor` | 245 | IEC 60062 colour code; Fritzing core resistor | Yes: a flat bar with evenly spaced bands | Accepted sample |
| DIP chip (8-pin NE555 shown) | `dip pins=N` | 180, runs high | JEDEC MS-001; TI NE555 datasheet | Yes, but its pin numbers are a mirror image of the real chip and its lower pins land in row g instead of f | Drawn |
| LED, 5 mm | `led` | 177 | SparkFun Polarity tutorial | Yes: a small disc along the row, not across the trough | Accepted sample |
| Male pin header | `header pins=N` | 164, runs high | SparkFun Break Away Headers (PRT-00116) | Yes, but wires attach half a hole above its posts | Drawn |
| Arduino Uno R3 | `mcu uno` | 153 | Arduino UNO R3 documentation | Yes, as a card listing pin names | Drawn, from the exemplar |
| ESP32 DevKit V1, 30-pin | `mcu esp32` (also `esp32-devkit`, `esp32-c3`, `esp32-s3`) | 118 | DOIT DevKit V1 pinout; Espressif ESP32-WROOM-32 datasheet | Yes, as a card with a mixed pin list | Drawn |
| Pushbutton, 6 mm tactile | `button` | 111, runs high | Makeability Lab, Using buttons; Arduino Button example | Yes: a square with no legs, off its holes | Accepted sample |
| Electrolytic capacitor | `cap-elec`, `cap` | 72–82 | SparkFun Polarity tutorial; Fritzing core electrolytic capacitor | Yes: a small circle between two holes | Drawn |
| Relay module, 1 channel, 5 V | `module relay` (also `relay-1ch`, `1ch-relay`) | 53, runs high | Songle SRD-05VDC-SL-C datasheet; Components101 relay module | Yes, as a card that shows the screw terminals as header pins | Drawn |
| Ceramic disc capacitor | `cap-ceramic` | 48 | EIA three-digit code; SparkFun Capacitors tutorial | Yes: a small yellow circle | Drawn |
| Trimmer potentiometer | `potentiometer`, `pot` | 47–74 | Bourns 3362 datasheet | Yes, as a card whose pins miss the holes | Accepted sample |
| HC-SR04 ultrasonic sensor | `sensor hcsr04`, `sensor hc-sr04` | 43–54 | Handsontec HC-SR04 user guide | Yes, as a card with off-pitch pins | Drawn |
| LCD 1602 with I2C backpack | `display lcd-1602-i2c`, `display lcd` | 41 | 1602A module specification; Handsontec I2C 1602 LCD datasheet | Yes, as a card | Drawn |
| Rectifier diode, 1N4007 | `diode` | 41 | Vishay 1N4001–1N4007 datasheet | Yes, but wires attach half a hole above its leads | Drawn |
| Jumper wire | a `--colour--` line in the `wires` section | not counted (it is syntax, not a part word) | SparkFun How to Use a Breadboard | Yes: a thin bowed curve | Accepted sample |

## Tier 2 — in the engine

| Part | DSL kind | Users (90 days, aliases combined) | Convention source | In engine? | Status |
|---|---|---|---|---|---|
| Micro servo, SG90 | `actuator servo-sg90`, `actuator servo` | 39 | TowerPro SG90 datasheet: 22.2 × 11.8 mm body, brown/red/orange lead | Yes, as a card | Drawn |
| OLED 0.96 in, SSD1306 I2C | `display oled-ssd1306`, `display oled` | 34 | Adafruit 128×64 OLED breakout; SSD1306 datasheet | Yes, as a card | Drawn |
| Arduino Nano | `mcu nano` | 34 | Arduino Nano documentation: 45 × 18 mm, rows 0.6 in apart | Yes, as a card | Drawn |
| L298N motor driver module | `module l298n`, `l298`, `motor` | 30–32 | Common red L298N dual H-bridge board with heatsink and screw terminals; ST L298 datasheet | Yes, as a card | Drawn |
| DHT11 temperature and humidity sensor | `sensor dht11` | 22 | Aosong DHT11 datasheet: blue grille, pins on 0.1 in | Yes, as a card | Drawn |
| Raspberry Pi Pico | `mcu pico` | 11 | Raspberry Pi Pico datasheet: 51 × 21 mm, rows 0.7 in apart | Yes, as a card | Drawn |
| TM1637 four-digit display | `display tm1637` | 11 | Common 0.36 in four-digit module with TM1637 driver | Yes, as a card | Drawn |
| DS3231 real-time clock | `module rtc-ds3231`, `rtc`, `ds3231` | 11–18 | ZS-042 DS3231 module with CR2032 holder; Analog Devices DS3231 datasheet | Yes, as a card | Drawn |
| DHT22 temperature and humidity sensor | `sensor dht22` | 10 | Aosong AM2302 datasheet: white grille | Yes, as a card | Drawn |

## Tier 3 — in the engine, rarely used

| Part | DSL kind | Users (90 days, aliases combined) | Convention source | In engine? | Status |
|---|---|---|---|---|---|
| Rotary encoder module, KY-040 | `module rotary-ky040`, `rotary` | 5 | KY-040 module: encoder with push switch, five pins on 0.1 in | Yes, as a card | Drawn |
| Time-of-flight distance sensor, VL53L0X | `sensor vl53l0x`, `vl53-l0x`, `tof` | 4–6 | ST VL53L0X datasheet; Adafruit VL53L0X breakout | Yes, as a card | Drawn |

## Missing from the engine

These parts are in the common starter kits (the Elegoo UNO R3 Super Starter Kit ships the
buzzers, photoresistors, PN2222 transistors, 74HC595 and stepper below) or in the most
common beginner projects. The DSL has no word for any of them.

- **Piezo buzzer, active and passive.** It is the first sound project and the usual alarm
  output.
- **Photoresistor (LDR).** It is the standard analog-input lesson, read through a voltage
  divider.
- **NPN transistor in TO-92 (PN2222, 2N2222, BC547).** It is how a pin switches a relay
  coil, motor or buzzer that needs more than the pin's current.
- **N-channel MOSFET in TO-220 (IRLZ44N, IRF520).** It switches 12 V LED strips and
  motors.
- **RGB LED, four legs.** It is the kit's colour-mixing lesson, and the single-colour LED
  cannot show the shared leg.
- **Named DIP chips (74HC595, L293D, NE555).** `dip` draws the package but gives its pins
  no names, so a wire cannot go to `u1:SER` or `u1:TRIG`.
- **Seven-segment digit (5161).** Counting lessons wire the segments directly; only the
  TM1637 module exists today.
- **28BYJ-48 stepper motor with ULN2003 driver board.** It ships in every large kit.
- **DC hobby motor.** It is the motor in the transistor-and-diode lesson, and the DSL
  word `motor` today means the L298N driver.
- **Voltage regulator in TO-220 (LM7805).** It powers a build from a 9 V battery.
- **Breadboard power supply module (MB102).** It plugs straight onto the rails and ships
  in kits.
- **Batteries: 9 V snap and AA holder.** A build away from USB needs a source; today power
  can only come from a board pin.
- **Slide and toggle switches.** They are the on/off switch of any portable build.
- **PIR motion sensor (HC-SR501).** It is the most common home-automation sensor.
- **IR receiver (VS1838B) with remote.** It ships in kits and is a standard input lesson.
- **Joystick module (KY-023) and 4×4 membrane keypad.** They are the common inputs beyond
  a button.
- **Temperature sensors in TO-92 (LM35, TMP36, DS18B20).** They are the first sensor most
  tutorials use before the DHT modules.
- **I2C sensor breakouts (MPU-6050, BME280).** They are the most common I2C parts after
  displays.
- **RC522 RFID reader and HC-05 Bluetooth module.** They anchor two of the most common
  module projects.
- **ESP8266 boards (NodeMCU, Wemos D1 mini).** They are the cheaper Wi-Fi boards, as
  common in tutorials as the ESP32.
- **WS2812B addressable LEDs (NeoPixel strip or ring).** Each one needs three connections
  and a data direction the drawing has to show.

## Decisions for Victor

1. **LED interior marks removed.** The two dark marks inside the sample's dome read as a
   pause sign, so they are gone. Seen from above the legs look the same length, so the
   flat on the flange is still the only polarity mark. At true size the flat is cut where
   the dome meets the flange, so the dark ring runs all the way round except on the
   cathode side. If that is not enough, the next option is a small minus sign beside the
   cathode hole.
2. **True scale everywhere.** The LED is now a 5.0 mm dome on a 5.8 mm flange; the sample
   was about 80 % of that. The pushbutton is now 6 mm; the sample was 5.6 mm. The resistor
   is within the tolerance of a 1/4 W part and stays as drawn. The trimmer also stays as
   drawn: 49.5 × 47 units is the true size of a Bourns 3362P, the common in-line
   breadboard trimmer. The sample cited Adafruit #356, a 9.5 mm part; standing over the
   rows at that size it would cover row a and leave its three strips no free hole for a
   wire. The exemplar's `ideal.svg` still has the smaller LED and button and should take
   the new sizes when it is next regenerated.
3. **Tall upright parts are drawn from the front.** From above, a standing electrolytic can
   shows only its top and a ceramic disc is a thin sliver, and both hide their legs. They
   are drawn from the front instead, standing over the rows beyond their legs, as the
   accepted trimmer stands over rows b–d. This is the one departure from "every part is a
   top view", and it matches what Fritzing does for both parts.
4. **ESP32 and LCD pin names sit outside the board.** On the ESP32 the gap between a pin
   and the board edge or the module is 2.7 mm, too small for the exemplar's 7.5-unit type.
   The LCD backpack's names are printed on its back. Both boards therefore carry their
   pin names just outside, in the grey used for secondary text. The Uno keeps its names
   on the board, as in the exemplar.
5. **DIP pin numbering follows the datasheet, not the engine.** Seen from above with the
   notch on the left, pin 1 is the lower-left leg and the count runs anticlockwise, so
   `dip pins=8 @14e` has pin 1 at 14f and pin 8 at 14e. The engine puts pin 1 at 14e with
   pins 1–4 along row e, which is the chip seen from below, and puts pins 5–8 in row g. The DSL anchor should either
   keep naming the upper-left leg, as it does for the button, with the engine renumbering
   its pins, or name pin 1 in row f.
6. **Relay contacts are screw terminals.** The engine exposes COM, NO and NC as header pins
   in the same row as VCC, GND and IN. On the real module they are screw terminals at the
   opposite end. The drawing follows the module, so a wire to `k1:COM` should end on a
   terminal screw.
