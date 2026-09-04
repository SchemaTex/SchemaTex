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

describe("circuit netlist auto-layout — household lighting loops", () => {
  test("single-pole lamp circuit keeps the neutral return below the live path", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 live neutral 220Vac type=acsource label="V_mains"
F1 live protected 16A
S1 protected switched type=switch_spst label="S1"
L1 switched neutral type=lamp label="Lamp"`)
    );

    const fuse = item(lo, "F1");
    const lamp = item(lo, "L1");
    const neutralRail = lo.routes.find((r) => r.netId === "neutral")!;

    expect(lamp.component.componentType).toBe("lamp");
    expect(fuse.y).toBe(lamp.y);
    expect(Math.min(...neutralRail.points.map((p) => p.y))).toBeGreaterThan(lamp.y);
  });

  test("two-way lamp circuit lays out SPDT traveler nets between the switches", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 live neutral 220Vac type=acsource label="V_mains"
F1 live feed 16A
S1 feed t1 t2 type=switch_spdt label="S1"
S2 switched t1 t2 type=switch_spdt label="S2"
L1 switched neutral type=lamp label="Lamp"`)
    );

    const s1 = item(lo, "S1");
    const s2 = item(lo, "S2");
    const travelerRoutes = lo.routes.filter((r) => r.netId === "t1" || r.netId === "t2");

    expect(s1.component.componentType).toBe("switch_spdt");
    expect(s2.component.componentType).toBe("switch_spdt");
    expect(s2.x).toBeGreaterThan(s1.x);
    expect(travelerRoutes).toHaveLength(2);
    expect(travelerRoutes.every((r) => r.points.length >= 2)).toBe(true);
    expect(
      travelerRoutes.every((r) =>
        r.points.every((point) => Math.abs(point.y - r.points[0].y) < 0.5)
      )
    ).toBe(true);
  });

  test("vertical source and reverse-facing switch labels stay in the open margin", () => {
    const svg = render(`circuit "Two-way stair light" netlist
V1 live neutral 220Vac type=acsource label="V_mains"
F1 live feed 16A
S1 feed t1 t2 type=switch_spdt label="S1"
S2 switched t1 t2 type=switch_spdt label="S2"
L1 switched neutral type=lamp label="Lamp"`);

    const source = svg.match(/translate\(([\d.]+), ([\d.]+)\) rotate\(270\)" data-id="V1"/);
    const sourceLabel = svg.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>V_mains<\/text>/);
    const rightSwitch = svg.match(/translate\(([\d.]+), ([\d.]+)\) scale\(-1, 1\)" data-id="S2"/);
    const rightSwitchLabel = svg.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>S2<\/text>/);

    expect(source).not.toBeNull();
    expect(sourceLabel).not.toBeNull();
    expect(Number(sourceLabel![1])).toBeGreaterThan(Number(source![1]));
    expect(rightSwitch).not.toBeNull();
    expect(rightSwitchLabel).not.toBeNull();
    expect(Number(rightSwitchLabel![2])).toBeLessThan(Number(rightSwitch![2]));
  });

  test("reversed traveler declaration order also stays parallel", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 live neutral 220Vac type=acsource
F1 live feed 16A
S1 feed t1 t2 type=switch_spdt
S2 switched t2 t1 type=switch_spdt
L1 switched neutral type=lamp`)
    );
    const travelerRoutes = lo.routes.filter((r) => r.netId === "t1" || r.netId === "t2");

    expect(travelerRoutes).toHaveLength(2);
    expect(
      travelerRoutes.every((r) =>
        r.points.every((point) => Math.abs(point.y - r.points[0].y) < 0.5)
      )
    ).toBe(true);
  });
});

describe("circuit netlist auto-layout — reusable load-bank motifs", () => {
  const withPilot = `B1 bat 0 12V type=battery
F1 bat p1 15A
S1 p1 p2 type=switch_spst
K1 p2 fl_out pilot type=automotive_flasher_3pin
S2 fl_out left right type=switch_spdt_center_off
L1 left 0 type=lamp
L2 left 0 type=lamp
D1 left l1 type=led
R1 l1 0 500
D2 left l2 type=led
R2 l2 0 500
D3 pilot p3 type=led
R3 p3 0 1k
L3 right 0 type=lamp
L4 right 0 type=lamp
D4 right r1 type=led
R4 r1 0 500
D5 right r2 type=led
R5 r2 0 500`;

  test("keeps an auxiliary pilot branch inside the same load-bank layout", () => {
    const lo = layoutCircuitNetlist(parseNetlist(withPilot));
    const left = ["L1", "L2", "D1", "D2"].map((id) => item(lo, id).x);
    const pilot = item(lo, "D3").x;
    const right = ["L3", "L4", "D4", "D5"].map((id) => item(lo, id).x);

    expect(Math.max(...left)).toBeLessThan(pilot);
    expect(pilot).toBeLessThan(Math.min(...right));
    expect(
      lo.routes.some(
        (route) =>
          route.netId === "GND" &&
          route.points.length === 2 &&
          route.points[0]!.y === route.points[1]!.y
      )
    ).toBe(true);
  });

  test("preserves the load-bank structure after declarations are reordered", () => {
    const ast = parseNetlist(withPilot);
    ast.components.reverse();
    const lo = layoutCircuitNetlist(ast);

    expect(new Set(lo.items.map((entry) => entry.component.id))).toEqual(
      new Set(ast.components.map((entry) => entry.id))
    );
    expect(item(lo, "D3").y).toBeGreaterThan(item(lo, "K1").y);
    expect(lo.routes.some((route) => route.netId === "pilot")).toBe(true);
  });

  test("recognizes the same topology after every component id is renamed", () => {
    const renamed = withPilot.replace(/^(\S+)/gm, "$1A");
    const lo = layoutCircuitNetlist(parseNetlist(renamed));

    expect(Math.max(item(lo, "L1A").x, item(lo, "L2A").x)).toBeLessThan(
      item(lo, "D3A").x
    );
    expect(item(lo, "D3A").x).toBeLessThan(
      Math.min(item(lo, "L3A").x, item(lo, "L4A").x)
    );
  });
});
