import type { BreadboardPartKind } from "../../core/types";

/**
 * Common names found in board/module pinout sheets and maker documentation.
 * Keys are canonical catalog pin names; values are accepted DSL aliases.
 */
export const PIN_ALIASES: Partial<
  Record<BreadboardPartKind, Record<string, readonly string[]>>
> = {
  button: {
    "1": ["pin1", "leg1"],
    "2": ["pin2", "leg2"],
    "3": ["pin3", "leg3"],
    "4": ["pin4", "leg4"],
  },
  "mcu-nano": {
    D0: ["RX", "RX0", "GPIO0", "IO0", "0"],
    D1: ["TX", "TX0", "GPIO1", "IO1", "1"],
    A4: ["SDA"],
    A5: ["SCL"],
    RST: ["RESET"],
    VIN: ["RAW"],
  },
  "mcu-uno": {
    RX: ["D0", "RX0", "GPIO0", "IO0", "0"],
    TX: ["D1", "TX0", "GPIO1", "IO1", "1"],
    A4: ["SDA"],
    A5: ["SCL"],
    RST: ["RESET"],
    VIN: ["RAW"],
  },
  "mcu-esp32": {
    GPIO1: ["TX", "TX0"],
    GPIO3: ["RX", "RX0"],
    GPIO21: ["SDA"],
    GPIO22: ["SCL"],
    GPIO36: ["VP", "SVP", "SENSOR_VP"],
    GPIO39: ["VN", "SVN", "SENSOR_VN"],
    VIN: ["5V", "VBUS", "USB"],
    EN: ["ENABLE", "RESET", "RST"],
  },
  "mcu-pico": {
    VBUS: ["VIN", "5V", "USB"],
    VSYS: ["RAW"],
    "3V3": ["3V3_OUT", "VCC", "VDD"],
    "3V3_EN": ["3V3EN"],
    ADC_VREF: ["VREF"],
    RUN: ["RESET", "RST"],
  },
  "sensor-hcsr04": {
    VCC: ["5V", "VIN"],
    TRIG: ["TRIGGER"],
  },
  "sensor-dht11": {
    VCC: ["5V", "VIN"],
    DATA: ["DAT", "OUT", "SIG", "SIGNAL"],
  },
  "sensor-dht22": {
    VCC: ["5V", "VIN"],
    DATA: ["DAT", "OUT", "SIG", "SIGNAL"],
  },
  "sensor-vl53l0x": {
    VIN: ["VCC", "5V", "3V3"],
  },
  "display-oled-ssd1306": {
    VCC: ["VIN", "5V", "3V3"],
    SCL: ["SCK", "CLK"],
  },
  "display-lcd-1602-i2c": {
    VCC: ["VIN", "5V"],
    SCL: ["SCK", "CLK"],
  },
  "display-tm1637": {
    CLK: ["SCK", "CLOCK"],
    DIO: ["DATA", "DAT"],
    VCC: ["VIN", "5V"],
  },
  "module-rotary-ky040": {
    CLK: ["A"],
    DT: ["B"],
    SW: ["BUTTON", "KEY"],
    VCC: ["VIN", "5V"],
  },
  "actuator-servo-sg90": {
    GND: ["BROWN", "BLACK"],
    VCC: ["5V", "VIN", "RED"],
    SIG: ["SIGNAL", "PWM", "DATA", "ORANGE", "YELLOW"],
  },
};
