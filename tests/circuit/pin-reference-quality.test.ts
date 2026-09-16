import { describe, expect, test } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";
import { effectiveSymbolDef, listCircuitSymbolTypes } from "../../src/diagrams/circuit/symbols";

function expectRouted(body: string, id: string, pins: string[]): void {
  const layout = layoutCircuitNetlist(parseNetlist(body));
  const item = layout.items.find((candidate) => candidate.component.id === id)!;
  for (const pin of pins) {
    const anchor = item.anchors[pin]!;
    expect(anchor, pin).toBeDefined();
    expect(layout.routes.some((route) => route.points.length > 1 &&
      [route.points[0], route.points.at(-1)].some((point) => point &&
        Math.abs(point.x - anchor.x) < 0.1 && Math.abs(point.y - anchor.y) < 0.1)), pin).toBe(true);
  }
}

describe("named wire endpoints", () => {
  test("supply references resolve forward and routes land on both amplifier pins", () => {
    const body = `Wfeed upper Amp.supply+
Wreturn lower Amp.supply-
Vrail upper lower 12V
Amp input feedback output type=opamp`;
    const ast = parseNetlist(body);
    expect(ast.pinMap?.Amp?.["supply+"]).toBe(ast.pinMap?.Vrail?.plus);
    expect(ast.pinMap?.Amp?.["supply-"]).toBe(ast.pinMap?.Vrail?.minus);
    expect(ast.nets.map((net) => net.id)).not.toContain("Amp.supply+");
    expectRouted(body, "Amp", ["supply+", "supply-"]);
  });

  test.each([
    ['generic_ic pins="IN+,IN-"', "IN+", "in+"],
    ["transformer", "p1", "p1"],
    ["optocoupler", "a", "a"],
    ["plc", "pwr", "pwr"],
    ['terminal_block pins="L,N"', "L", "l"],
    ["npn", "collector", "c"],
    ["nmos", "g", "g"],
  ])("resolves %s using its symbol anchors", (type, reference, pin) => {
    const ast = parseNetlist(`Device first second type=${type}\nRload feed other 1k\nWlink feed Device.${reference}`);
    expect(ast.pinMap?.Device?.[pin]).toBe(ast.pinMap?.Rload?.start);
    expect(ast.nets.find((net) => net.id === ast.pinMap?.Rload?.start)?.anchors).toContain(`Device.${pin}`);
  });

  test("joins already-bound nets and chained reference wires", () => {
    const ast = parseNetlist(`Ra a b 1k\nRb c d 1k\nRc e f 1k\nWfirst Ra.end Rb.start\nWsecond Rb.start Rc.end`);
    expect(ast.pinMap?.Ra?.end).toBe(ast.pinMap?.Rb?.start);
    expect(ast.pinMap?.Ra?.end).toBe(ast.pinMap?.Rc?.end);
    expect(ast.nets.find((net) => net.id === ast.pinMap?.Ra?.end)?.anchors).toEqual(
      expect.arrayContaining(["Ra.end", "Rb.start", "Rc.end"]));
  });

  test("unknown component errors name the endpoint and available components/pins", () => {
    expect(() => parseNetlist("Rload a b 1k\nWlink a Missing.start")).toThrow(
      /Unknown component "Missing".*Missing.start.*Rload: start, end/);
  });

  test("unknown pin errors list actual pins even if that dotted net was declared", () => {
    expect(() => parseNetlist("Rload a b 1k\nRc Rload.typo c 1k\nWlink a Rload.typo")).toThrow(
      /Unknown pin "typo" on component "Rload".*Available pins: start, end/);
  });

  test("a dotted net declared on a non-wire component stays a literal net", () => {
    const ast = parseNetlist("Wlink sensor.output destination\nRload sensor.output return 1k");
    expect(ast.pinMap?.Rload?.start).toBe("sensor.output");
    expect(ast.nets.find((net) => net.id === "sensor.output")?.anchors).toEqual(["Rload.start"]);
  });
});

describe("box identity and pins", () => {
  test.each(["AI+,AI-", "+,-"])("keeps %s distinct, connected, and upright", (pins) => {
    const body = `Vrail supply 0 12V
Rload supply input 1k
Device input 0 type=generic_ic pins="${pins}" label="Analogue input module"`;
    const ast = parseNetlist(body);
    const pinNames = pins.toLowerCase().split(",");
    expect(Object.keys(ast.pinMap?.Device ?? {})).toEqual(pinNames);
    expectRouted(body, "Device", pinNames);
    const item = layoutCircuitNetlist(ast).items.find((candidate) => candidate.component.id === "Device")!;
    expect(item.rotation).toBe(0);
    expect(item.mirrorX).not.toBe(true);
    const symbol = effectiveSymbolDef(item.component.componentType, item.component.attrs);
    const svg = symbol.svg(item.component.label, item.component.value, item.component.attrs);
    expect(svg).not.toContain("Analogue input module");
    // Identity remains visible once beside the body; the pins own its interior.
    expect(renderCircuit(ast).match(/>[^<]*Analogue input module[^<]*<\/text>/g)).toHaveLength(1);
    expect(svg).not.toContain(">IC</text>");
    expect(symbol.anchors[pinNames[1]!]!.x).toBe(symbol.length + 8);
    expect(svg).toContain(`x1="${symbol.length}"`);
  });
});

describe("uniform reference designators", () => {
  test.each(listCircuitSymbolTypes())("%s has its authored identity beside the symbol", (type) => {
    // Render a single positional symbol to isolate the shared caption rule.
    const svg = renderCircuit({ type: "circuit", mode: "positional", nets: [], components: [{
      id: "Part42", stableId: true, componentType: type, direction: "right", label: "Description",
    }] });
    expect(svg).toMatch(/class="schematex-circuit-label"[^>]*>Part42 Description<\/text>/);
  });

  test("does not duplicate an ID already present in the label", () => {
    const svg = renderCircuit(parseNetlist('R42 a b 1k label="R42 sense"'));
    expect(svg).toContain(">R42 sense</text>");
    expect(svg).not.toContain("R42 R42");
  });
});
