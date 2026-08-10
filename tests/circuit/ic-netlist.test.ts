import { describe, expect, test } from "vitest";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { lintCircuit } from "../../src/diagrams/circuit/lint";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";
import {
  effectiveSymbolDef,
  getNetlistPinOrder,
} from "../../src/diagrams/circuit/symbols";

const ISSUE_79 = `circuit "555" netlist
VCC 8 0 DC 5.0
R1 8 7 1k
R2 7 2 4.7k
C1 2 0 10uf
IC1 0 2 3 8 0 2 7 8 type=ic`;

function routeTouchesPin(
  layout: ReturnType<typeof layoutCircuitNetlist>,
  componentId: string,
  pinName: string
): boolean {
  const item = layout.items.find((candidate) => candidate.component.id === componentId);
  const anchor = item?.anchors[pinName];
  if (!anchor) return false;
  return layout.routes.some((route) =>
    route.points.some(
      (point) => Math.abs(point.x - anchor.x) < 0.1 && Math.abs(point.y - anchor.y) < 0.1
    )
  );
}

function terminalLegEndpoints(svg: string): Array<{ y1: number; y2: number }> {
  return [...svg.matchAll(/<line x1="-8" y1="([^"]+)" x2="0" y2="([^"]+)"/g)].map(
    (match) => ({ y1: Number(match[1]), y2: Number(match[2]) })
  );
}

describe("circuit netlist — multi-pin IC binding", () => {
  test("issue #79 binds every generic IC net and emits routes from the connected pins", () => {
    const ast = parseCircuit(ISSUE_79);

    expect(ast.pinMap?.IC1).toEqual({
      "1": "GND",
      "2": "2",
      "3": "3",
      "4": "8",
      "5": "GND",
      "6": "2",
      "7": "7",
      "8": "8",
    });

    const ic = ast.components.find((component) => component.id === "IC1");
    expect(ic?.attrs).toMatchObject({
      pins_left: "1,2,3,4",
      pins_right: "8,7,6,5",
    });

    const layout = layoutCircuitNetlist(ast);
    const laidIc = layout.items.find((item) => item.component.id === "IC1");
    expect(Object.keys(laidIc?.anchors ?? {})).toEqual(
      expect.arrayContaining(["1", "2", "3", "4", "5", "6", "7", "8"])
    );
    // Pin 3 is the only intentionally dangling net in the issue repro. Every
    // IC pin that shares a net with another component must terminate a route.
    for (const pin of ["1", "2", "4", "5", "6", "7", "8"]) {
      expect(routeTouchesPin(layout, "IC1", pin), `IC1.${pin} should be wired`).toBe(true);
    }

    const svg = renderCircuit(ast);
    expect(svg).toMatch(/<polyline[^>]*class="schematex-circuit-wire"/);
  });

  test("type=555 binds SPICE positions 1..8 to the real 555 anchor names", () => {
    const ast = parseCircuit(`circuit "timer" netlist
R1 trig GND 1k
R2 out GND 1k
R3 reset GND 1k
R4 ctrl GND 1k
R5 thresh GND 1k
R6 disch GND 1k
V1 vcc GND 5V
U1 GND trig out reset ctrl thresh disch vcc type=555`);

    expect(ast.components.find((component) => component.id === "U1")?.componentType).toBe(
      "555_timer"
    );
    expect(ast.pinMap?.U1).toEqual({
      gnd: "GND",
      trg: "trig",
      out: "out",
      rst: "reset",
      ctl: "ctrl",
      thr: "thresh",
      dis: "disch",
      vcc: "vcc",
    });

    const layout = layoutCircuitNetlist(ast);
    for (const pin of ["gnd", "trg", "out", "rst", "ctl", "thr", "dis", "vcc"]) {
      expect(routeTouchesPin(layout, "U1", pin), `U1.${pin} should be wired`).toBe(true);
    }
  });

  test.each(["X1", "U1"])("%s prefix auto-numbers all declared nets", (id) => {
    const ast = parseCircuit(`circuit "prefix" netlist\n${id} n1 n2 n3 n4`);
    expect(ast.pinMap?.[id]).toEqual({
      "1": "n1",
      "2": "n2",
      "3": "n3",
      "4": "n4",
    });
  });

  test("odd pin counts use the DIP left-down/right-up convention", () => {
    const ast = parseCircuit(`circuit "odd" netlist
U1 n1 n2 n3 n4 n5 n6 n7 n8 n9`);
    const ic = ast.components.find((component) => component.id === "U1");
    expect(ic?.attrs).toMatchObject({ pins_left: "1,2,3,4,5", pins_right: "9,8,7,6" });
    expect(ast.pinMap?.U1).toEqual({
      "1": "n1",
      "2": "n2",
      "3": "n3",
      "4": "n4",
      "5": "n5",
      "6": "n6",
      "7": "n7",
      "8": "n8",
      "9": "n9",
    });

    const layout = layoutCircuitNetlist(ast);
    const anchors = layout.items.find((item) => item.component.id === "U1")?.anchors;
    expect(anchors?.["1"].x).toBeLessThan(anchors?.["6"].x ?? 0);
    expect(anchors?.["9"].y).toBeLessThan(anchors?.["6"].y ?? 0);

    const symbolSvg = effectiveSymbolDef("generic_ic", ic?.attrs)?.svg(
      ic?.label,
      ic?.value,
      ic?.attrs
    );
    expect(symbolSvg?.match(/<line [^>]*class="schematex-circuit-wire"/g)).toHaveLength(9);
    expect(symbolSvg).toContain('height="96"');
  });

  test("explicit pins= names take precedence and drive both bindings and anchors", () => {
    const ast = parseCircuit(`circuit "named" netlist
U1 net_a net_b net_c pins="A,B,C"`);
    expect(ast.pinMap?.U1).toEqual({ a: "net_a", b: "net_b", c: "net_c" });

    const ic = ast.components.find((component) => component.id === "U1");
    expect(ic?.attrs).toMatchObject({ pins_left: "A,B", pins_right: "C" });
    const anchors = layoutCircuitNetlist(ast).items.find(
      (item) => item.component.id === "U1"
    )?.anchors;
    expect(anchors).toMatchObject({
      a: expect.any(Object),
      b: expect.any(Object),
      c: expect.any(Object),
    });
  });

  test("explicit pins_left/pins_right preserve their displayed DIP order", () => {
    const ast = parseCircuit(`circuit "sides" netlist
U1 net_a net_b net_c net_d pins_left="A,B" pins_right="D,C"`);
    expect(ast.pinMap?.U1).toEqual({
      a: "net_a",
      b: "net_b",
      c: "net_c",
      d: "net_d",
    });
  });

  test("terminal blocks bind every net to a real laid-out anchor", () => {
    const terminal = parseCircuit(`circuit "terminal" netlist
VCC 1 0 DC 5.0
T1 1 2 0 pins="L,N,PE"`);
    expect(terminal.pinMap?.T1).toEqual({ l: "1", n: "2", pe: "GND" });

    const layout = layoutCircuitNetlist(terminal);
    const anchors = layout.items.find((item) => item.component.id === "T1")?.anchors;
    for (const pin of ["l", "n", "pe"]) {
      expect(anchors?.[pin], `T1.${pin} should resolve to an anchor`).toBeDefined();
    }
    for (const pin of ["l", "pe"]) {
      expect(routeTouchesPin(layout, "T1", pin), `T1.${pin} should be wired`).toBe(true);
    }

    const opamp = parseCircuit(`circuit "opamp" netlist
U1 noninv inv output type=opamp`);
    expect(opamp.pinMap?.U1).toEqual({ plus: "noninv", minus: "inv", out: "output" });
  });

  test.each([
    { caseName: "with a label", label: "T1" },
    { caseName: "without a label", label: undefined },
  ])("terminal anchors match painted leg endpoints $caseName", ({ label }) => {
    const attrs = { pins: "L,N,PE" };
    const symbol = effectiveSymbolDef("terminal_block", attrs);
    expect(symbol).toBeDefined();
    if (!symbol) throw new Error("terminal_block symbol is missing");

    const svg = symbol.svg(label, undefined, attrs);
    const legs = terminalLegEndpoints(svg);
    const anchorYs = ["l", "n", "pe"].map((pin) => symbol.anchors[pin]?.y);
    expect(anchorYs).toEqual(legs.map((leg) => leg.y1));
    expect(anchorYs).toEqual(legs.map((leg) => leg.y2));
    expect(["l", "n", "pe"].map((pin) => symbol.anchors[pin]?.x)).toEqual([-8, -8, -8]);
  });

  test("terminals= remains an alias for terminal block pin labels", () => {
    const ast = parseCircuit(`circuit "terminal alias" netlist
T1 line neutral earth terminals="L,N,PE"`);
    expect(ast.pinMap?.T1).toEqual({ l: "line", n: "neutral", pe: "GND" });

    const component = ast.components.find((candidate) => candidate.id === "T1");
    const anchors = layoutCircuitNetlist(ast).items.find(
      (item) => item.component.id === "T1"
    )?.anchors;
    expect(component?.attrs?.terminals).toBe("L,N,PE");
    expect(anchors).toMatchObject({
      l: expect.any(Object),
      n: expect.any(Object),
      pe: expect.any(Object),
    });
  });

  test("empty netlistPins arrays no longer suppress the symbol fallback order", () => {
    expect(getNetlistPinOrder("generic_ic")).toEqual(["start", "end"]);
  });

  test("extra nets beyond explicit IC pins surface a diagnostic instead of disappearing silently", () => {
    const dsl = `circuit "too many" netlist
U1 n1 n2 n3 n4 pins="A,B,C"`;
    const ast = parseCircuit(dsl);
    expect(ast.recovered?.overspecified?.[0]).toMatchObject({
      id: "U1",
      expected: 3,
      got: 4,
      extraNets: ["n4"],
    });
    expect(lintCircuit(dsl).map((diagnostic) => diagnostic.code)).toContain(
      "CIRCUIT_PIN_OVERSPECIFIED"
    );
  });
});
