import { describe, test, expect } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { render } from "../../src/core/api";

const item = (lo: ReturnType<typeof layoutCircuitNetlist>, id: string) =>
  lo.items.find((i) => i.component.id === id)!;

describe("circuit netlist auto-layout — compaction", () => {
  test("shunt cap (pin on GND) drops below the series row, not stranded in it", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k\nC1 out 0 100n`)
    );
    const r1 = item(lo, "R1");
    const c1 = item(lo, "C1");
    // C1 is a shunt to ground → it sits BELOW the series component, vertical.
    expect(c1.y).toBeGreaterThan(r1.y);
    // and it is oriented vertically (rotated off the horizontal row)
    expect(c1.rotation % 180).not.toBe(0);
  });

  test("series chain stays compact — RC footprint shrinks vs one-row layout", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k\nC1 out 0 100n`)
    );
    // Old one-row layout was 340 wide; pulling the shunt out keeps it tighter.
    expect(lo.width).toBeLessThan(300);
  });

  test("voltage divider: second resistor (to GND) becomes the shunt leg", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in mid 10k\nR2 mid 0 10k`)
    );
    expect(item(lo, "R2").y).toBeGreaterThan(item(lo, "R1").y);
  });

  test("still renders valid SVG for a multi-pin (transistor) circuit", () => {
    const svg = render(`circuit "CE" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`);
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  test("explicit dir= hint still overrides auto orientation", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k dir=up\nC1 out 0 100n`)
    );
    expect(item(lo, "R1").rotation).toBe(270); // up
  });
});
