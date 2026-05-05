import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "../../src";

function fixture(name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures/breadboard", name), "utf-8");
}

describe("breadboard renderer", () => {
  it("renders Blink fixture without throwing", () => {
    const svg = render(fixture("blink-led.bb"));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("lt-bb-substrate");
    expect(svg).toContain("lt-bb-wire");
  });

  it("renders HC-SR04 fixture", () => {
    const svg = render(fixture("hcsr04.bb"));
    expect(svg).toContain("HC-SR04");
  });

  it("renders DHT11 fixture with pull-up resistor", () => {
    const svg = render(fixture("dht11.bb"));
    expect(svg).toContain("DHT11");
    expect(svg).toContain("R1");
  });

  it("renders ESP32 + OLED fixture", () => {
    const svg = render(fixture("oled-esp32.bb"));
    expect(svg).toContain("ESP32");
    expect(svg).toContain("OLED");
  });

  it("auto-detects breadboard from header", () => {
    const svg = render(`breadboard
parts
  uno: mcu uno @beside-left
`);
    expect(svg).toContain("Arduino Uno");
  });
});
