import { describe, test, expect } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { render } from "../../src/core/api";

const item = (lo: ReturnType<typeof layoutCircuitNetlist>, id: string) =>
  lo.items.find((i) => i.component.id === id)!;

const routeSegments = (
  lo: ReturnType<typeof layoutCircuitNetlist>,
  net: string
) =>
  lo.routes
    .filter((route) => route.netId === net || route.netId.startsWith(`${net}.`))
    .flatMap((route) =>
      route.points.slice(1).map((point, index) => [route.points[index]!, point] as const)
    );

const orthogonalSegmentsIntersect = (
  [a, b]: readonly [{ x: number; y: number }, { x: number; y: number }],
  [c, d]: readonly [{ x: number; y: number }, { x: number; y: number }]
) => {
  const between = (value: number, p: number, q: number) =>
    value >= Math.min(p, q) && value <= Math.max(p, q);
  if (a.x === b.x && c.y === d.y) {
    return between(a.x, c.x, d.x) && between(c.y, a.y, b.y);
  }
  if (a.y === b.y && c.x === d.x) {
    return between(c.x, a.x, b.x) && between(a.y, c.y, d.y);
  }
  return false;
};

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
    expect(item(lo, "B1").x).toBeLessThan(Math.min(...left));
    expect(lo.width / lo.height).toBeLessThan(1.9);
    for (const id of [
      "L1", "L2", "D1", "D2", "D3", "L3", "L4", "D4", "D5",
    ]) {
      expect(item(lo, id).labelPos?.y).toBeLessThan(item(lo, id).y);
    }
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

  test("recognizes a three-net distributor from topology, not switch type", () => {
    const genericSelector = withPilot.replace(
      "S2 fl_out left right type=switch_spdt_center_off",
      'X7 fl_out left right pins_left="COMMON" pins_right="RIGHT,LEFT"'
    );
    const lo = layoutCircuitNetlist(parseNetlist(genericSelector));

    expect(Math.max(item(lo, "L1").x, item(lo, "L2").x)).toBeLessThan(
      item(lo, "D3").x
    );
    expect(item(lo, "D3").x).toBeLessThan(
      Math.min(item(lo, "L3").x, item(lo, "L4").x)
    );
    expect(item(lo, "X7").component.componentType).toBe("generic_ic");
    expect(item(lo, "D3").labelPos).toBeDefined();
    expect(lo.width / lo.height).toBeLessThan(1.9);
  });

  test("a long branch label widens only its neighboring lanes", () => {
    const baseline = layoutCircuitNetlist(parseNetlist(withPilot));
    const longLabel = layoutCircuitNetlist(parseNetlist(withPilot.replace(
      "L1 left 0 type=lamp",
      'L1 left 0 type=lamp label="Left front marker with service label"'
    )));

    expect(item(longLabel, "L2").x - item(longLabel, "L1").x).toBeGreaterThan(
      item(baseline, "L2").x - item(baseline, "L1").x
    );
    expect(item(longLabel, "D5").x - item(longLabel, "D4").x).toBe(
      item(baseline, "D5").x - item(baseline, "D4").x
    );
  });
});

describe("circuit netlist auto-layout — single IC hub", () => {
  const astable = `V1 VCC GND value="9 V" label="BAT1"
U1 GND TIMING OUT VCC CTRL TIMING DISCH VCC type=555_timer label="U1"
R1 VCC DISCH value="10 kΩ" label="R1"
R2 DISCH TIMING value="100 kΩ" label="R2"
C1 TIMING GND value="10 µF" label="C1"
C2 CTRL GND value="10 nF" label="C2"
R3 OUT LED_A value="470 Ω" label="R3"
D1 LED_A GND type=led label="LED1"`;

  test("places passive branches on the pin side of one functional block", () => {
    const lo = layoutCircuitNetlist(parseNetlist(astable));
    const hub = item(lo, "U1");
    const timing = ["R1", "R2", "C1"].map((id) => item(lo, id).x);
    const output = ["R3", "D1"].map((id) => item(lo, id).x);

    expect(Math.max(...timing)).toBeLessThan(hub.x);
    expect(Math.min(...output)).toBeGreaterThan(hub.x + hub.length);
    expect(item(lo, "C2").x).toBeLessThan(item(lo, "R3").x);
    expect(lo.width / lo.height).toBeGreaterThan(1.1);

    const timingSpine = lo.routes.find(
      (route) => route.netId === "TIMING" && route.points.every((point) => point.x === route.points[0]!.x)
    );
    const dischargeSpine = lo.routes.find(
      (route) => route.netId === "DISCH" && route.points.every((point) => point.x === route.points[0]!.x)
    );
    expect(timingSpine).toBeDefined();
    expect(dischargeSpine).toBeDefined();
    expect(
      Math.abs(timingSpine!.points[0]!.x - dischargeSpine!.points[0]!.x)
    ).toBeGreaterThanOrEqual(16);
    expect(
      routeSegments(lo, "DISCH").some((discharge) =>
        routeSegments(lo, "TIMING").some((timing) =>
          orthogonalSegmentsIntersect(discharge, timing)
        )
      )
    ).toBe(false);
  });

  test("keeps every signal net routed after declarations and ids change", () => {
    const renamed = astable.replace(/^(\S+)/gm, "$1_ALT");
    const ast = parseNetlist(renamed);
    ast.components.reverse();
    const lo = layoutCircuitNetlist(ast);
    const routed = new Set(
      lo.routes.map((route) => route.netId.split(".")[0])
    );

    for (const net of ["TIMING", "OUT", "CTRL", "DISCH", "LED_A"]) {
      expect(routed.has(net)).toBe(true);
    }
    expect(new Set(lo.items.map((entry) => entry.component.id))).toEqual(
      new Set(ast.components.map((entry) => entry.id))
    );
  });

  test("uses topology rather than the 555 type or fixture labels", () => {
    const genericController = `V9 PWR GND value="5 V"
X9 SENSE DRIVE GND OUT CTRL PWR pins_left="SENSE,DRIVE,GND" pins_right="PWR,CTRL,OUT" label="CONTROL"
R9 PWR SENSE value="22 kΩ"
R8 SENSE DRIVE value="47 kΩ"
C9 DRIVE GND value="1 µF"
R7 OUT LOAD value="330 Ω"
D9 LOAD GND type=led
C8 CTRL GND value="10 nF"`;
    const lo = layoutCircuitNetlist(parseNetlist(genericController));
    const hub = item(lo, "X9");

    expect(item(lo, "R9").x).toBeLessThan(hub.x);
    expect(item(lo, "R7").x).toBeGreaterThan(hub.x + hub.length);
    expect(item(lo, "C8").x).toBeGreaterThan(hub.x + hub.length);
    expect(new Set(lo.items.map((entry) => entry.component.id))).toEqual(
      new Set(parseNetlist(genericController).components.map((entry) => entry.id))
    );
  });

  test("falls back when the author provides an explicit orientation", () => {
    const explicit = astable.replace("R3 OUT LED_A", "R3 OUT LED_A dir=right");
    const lo = layoutCircuitNetlist(parseNetlist(explicit));

    expect(item(lo, "R3").rotation).toBe(0);
  });
});
