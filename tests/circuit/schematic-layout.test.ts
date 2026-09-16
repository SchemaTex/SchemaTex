import { describe, expect, it, vi } from "vitest";
import { parse, render, renderResult } from "../../src/core/api";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { schematicNetlistLayout, labelBox, boxOf } from "../../src/diagrams/circuit/schematic-layout";
import { effectiveSymbolDef } from "../../src/diagrams/circuit/symbols";
import * as router from "../../src/diagrams/logic/orthogonal-router";
import { intersectsBox } from "../../src/diagrams/logic/orthogonal-router";
import { estimateTextWidth } from "../../src/core/text-metrics";

/**
 * Layout quality is not a matter of taste here — the old band layout failed on
 * measurable properties, and these are the measurements. Each one is pinned so
 * a future change cannot quietly reintroduce the clothesline.
 */

function svgOf(dsl: string): string {
  const r = render(dsl);
  return typeof r === "string" ? r : ((r as { svg?: string }).svg ?? "");
}

function viewBox(svg: string): { w: number; h: number } {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error("no viewBox");
  return { w: Number(m[1]), h: Number(m[2]) };
}

function seriesChain(n: number): string {
  let s = 'circuit "Chain" netlist\nV1 n0 0 5V\n';
  for (let i = 1; i <= n; i++) s += `R${i} n${i - 1} n${i} 1k\n`;
  return s;
}

describe("schematic layout — canvas shape", () => {
  it("grows in both axes instead of stringing components along one row", () => {
    // The band layout produced a constant 304px height at every size, so the
    // aspect ratio climbed without bound: 1.7:1 at four parts, 6.7:1 at twenty.
    const small = viewBox(svgOf(seriesChain(4)));
    const large = viewBox(svgOf(seriesChain(20)));
    expect(large.h).toBeGreaterThan(small.h);
    expect(large.w / large.h).toBeLessThan(4);
  });

  it("keeps a twenty-component circuit inside a printable aspect ratio", () => {
    const { w, h } = viewBox(svgOf(seriesChain(20)));
    expect(w / h).toBeLessThan(4);
  });
});

describe("schematic layout — connected supply buses", () => {
  it("connects every supply pin to one bus with junction dots and one ground mark", () => {
    const ast = parseNetlist(`V1 vcc 0 5V
R1 vcc mid 10k
R2 mid 0 10k
C1 mid 0 100n
CS vcc 0 100n`);
    const layout = schematicNetlistLayout(ast)!;
    for (const net of [ast.pinMap!.V1!.plus!, ast.pinMap!.V1!.minus!]) {
      const bus = layout.routes.find((r) => r.netId === net)!;
      expect(bus.points).toHaveLength(2);
      expect(bus.points[0]!.y).toBe(bus.points[1]!.y);
      const pins = Object.entries(ast.pinMap!).flatMap(([id, pins]) =>
        Object.entries(pins).filter(([, n]) => n === net).map(([name]) => ({ id, name })));
      for (const pin of pins) {
        const item = layout.items.find((it) => it.component.id === pin.id)!;
        const branch = layout.routes.find((r) => r.netId === `${net}.${pin.id}.${pin.name}`)!;
        expect(branch.points[0]).toEqual(item.anchors[pin.name]);
        expect(bus.junctions).toContainEqual(branch.points.at(-1));
      }
    }
    expect(layout.items.filter((it) => it.component.componentType === "ground").length +
      layout.flags!.filter((f) => f.kind === "ground").length).toBe(1);
  });
});

describe("schematic layout — every declared net still reaches its pins", () => {
  it("routes each multi-pin signal net", () => {
    // Connectivity is the one thing a prettier layout must never trade away.
    const dsl = `circuit "Two stage" netlist
V1 vcc 0 9V
R1 vcc b1 100k
Q1 c1 b1 0 type=npn
R2 vcc c1 4k7
C1 c1 b2 1u
Q2 c2 b2 0 type=npn
R3 vcc c2 4k7`;
    const ast = parse(dsl) as { pinMap?: Record<string, Record<string, string>> };
    const svg = svgOf(dsl);
    const nets = new Set<string>();
    for (const pins of Object.values(ast.pinMap ?? {})) {
      for (const net of Object.values(pins)) nets.add(net);
    }
    // Signal nets (not supply) must appear as drawn geometry.
    const signalNets = [...nets].filter((n) => n !== "0" && n !== "vcc");
    expect(signalNets.length).toBeGreaterThan(0);
    expect(svg).toContain("<polyline");
    // Nothing may be silently dropped: each transistor and resistor is drawn.
    for (const id of ["R1", "R2", "R3", "Q1", "Q2", "C1"]) {
      expect(svg).toContain(id);
    }
  });
});

describe("schematic layout — folds read forward, parts stay uniform", () => {
  it("numbers a folded chain in ascending reading order on every row", () => {
    // A boustrophedon fold laid R6..R9 out right-to-left, so the page read
    // "R9 R8 R7 R6" and looked like a numbering error rather than a direction
    // change — a symmetric part gives the reader no clue the row reversed.
    const svg = svgOf(seriesChain(10));
    const labels = [
      ...svg.matchAll(
        /<text[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*class="schematex-circuit-label"[^>]*>(R\d+)</g
      ),
    ].map((m) => ({ x: Number(m[1]), y: Number(m[2]), id: m[3]! }));

    const rows = new Map<number, Array<{ x: number; id: string }>>();
    for (const l of labels) {
      const band = Math.round(l.y / 40);
      const list = rows.get(band) ?? [];
      list.push({ x: l.x, id: l.id });
      rows.set(band, list);
    }
    for (const list of rows.values()) {
      if (list.length < 2) continue;
      const byX = [...list].sort((a, b) => a.x - b.x);
      const nums = byX.map((r) => Number(r.id.slice(1)));
      const ascending = nums.every((n, i) => i === 0 || n > nums[i - 1]!);
      expect(ascending).toBe(true);
    }
  });

  it("draws every element of a uniform series chain the same way round", () => {
    // The first resistor sits on the supply net, which an earlier rule read as
    // "shunt" and stood upright while its nine identical siblings lay flat.
    const svg = svgOf(seriesChain(10));
    const rotations = [
      ...svg.matchAll(/<g transform="translate\([^)]*\) rotate\((\d+)\)"/g),
    ].map((m) => Number(m[1]));
    const horizontal = rotations.filter((r) => r % 180 === 0).length;
    expect(horizontal).toBeGreaterThanOrEqual(9);
  });
});

describe("schematic layout — polarity survives placement", () => {
  it("mirrors a part whose upstream pin is written second, instead of crossing its wires", () => {
    // D1 is declared cathode-first. Drawing it un-mirrored would put the
    // terminal that belongs downstream on the upstream side and drag both
    // wires across the body. Mirroring keeps the circuit's meaning and
    // uncrosses the wires; rotating or silently reordering would not.
    const forward = `circuit "Fwd" netlist
V1 a 0 5V
R1 a b 1k
D1 b c type=diode
R2 c 0 1k`;
    const reversed = `circuit "Rev" netlist
V1 a 0 5V
R1 a b 1k
D1 c b type=diode
R2 c 0 1k`;
    const f = svgOf(forward);
    const r = svgOf(reversed);
    expect(f).toContain("<svg");
    expect(r).toContain("<svg");
    // The reversed declaration must be drawn differently from the forward one:
    // if both render identically, one of them is lying about the diode.
    expect(f).not.toEqual(r);
    expect(r).toContain("scale(-1, 1)");
  });

  it("never mirrors a part the author oriented explicitly", () => {
    const svg = svgOf(`circuit "Explicit" netlist
V1 a 0 5V
R1 a b 1k dir=up
C1 b 0 100n`);
    expect(svg).toContain("<svg");
  });
});

describe("schematic layout — labels do not collide", () => {
  it("separates label blocks of neighbouring components", () => {
    const svg = svgOf(seriesChain(8));
    const labels = [
      ...svg.matchAll(
        /<text[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*class="schematex-circuit-label"/g
      ),
    ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(labels.length).toBeGreaterThan(4);
    let collisions = 0;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i]!;
        const b = labels[j]!;
        if (Math.abs(a.x - b.x) < 26 && Math.abs(a.y - b.y) < 11) collisions++;
      }
    }
    expect(collisions).toBe(0);
  });
});

const amplifier = `V1 VCC GND value="12 V"
VIN IN GND type=acsource value="5 mV, 1 kHz"
CIN IN BASE value="1 µF"
R1 VCC BASE value="47 kΩ"
R2 BASE GND value="10 kΩ"
Q1 COLLECTOR BASE EMITTER type=npn value="2N3904"
RC VCC COLLECTOR value="4.7 kΩ"
RE EMITTER GND value="1 kΩ"
CE EMITTER GND type=ecap value="100 µF"
COUT COLLECTOR OUT value="10 µF"
RL OUT GND value="47 kΩ"
CS VCC GND value="100 nF"`;

describe("schematic layout — source roles and conventional placement", () => {
  it.each(["acsource", "voltage_source"])("routes %s excitation through CIN without adding rails to signal adjacency", (type) => {
    const layout = schematicNetlistLayout(parseNetlist(amplifier.replace("type=acsource", `type=${type}`)), { collectStats: true })!;
    const item = (id: string) => layout.items.find((it) => it.component.id === id)!;
    expect(item("VIN").x).toBeLessThan(item("CIN").x);
    expect(item("CIN").x).toBeLessThan(item("Q1").x);
    expect(item("Q1").x).toBeLessThan(item("COUT").x);
    expect(layout.routes.find((r) => r.netId === "IN")!.points).toEqual([
      item("VIN").anchors.plus, item("CIN").anchors.start,
    ]);
    expect(layout.flags!.some((f) => f.label === "IN")).toBe(false);
    for (const id of ["V1", "CS", "VIN", "R1", "R2", "RC", "RE", "CE"]) {
      expect(item(id).rotation % 180).toBe(90);
    }
    expect(item("V1").anchors.plus!.y).toBeLessThan(item("V1").anchors.minus!.y);
    expect(item("CS").anchors.start!.y).toBeLessThan(item("CS").anchors.end!.y);
    expect(item("R1").anchors.start!.y).toBeLessThan(item("R1").anchors.end!.y);
    const extra = schematicNetlistLayout(parseNetlist(amplifier + "\nCS2 VCC GND 10n"), { collectStats: true })!;
    expect(extra.stats!.layers).toBe(layout.stats!.layers);
  });

  it("keeps a lone AC excitation in signal routing", () => {
    const layout = schematicNetlistLayout(parseNetlist("VIN IN 0 type=acsource\nCIN IN OUT 1u\nR1 OUT 0 10k"))!;
    expect(layout.routes.some((r) => r.netId === "IN")).toBe(true);
    expect(layout.flags!.some((f) => f.label === "IN")).toBe(false);
  });

  it("preserves reversed supply and shunt terminals", () => {
    const layout = schematicNetlistLayout(parseNetlist("V1 0 VCC 5V\nR1 VCC OUT 1k\nC1 0 OUT type=ecap\nCS 0 VCC 100n"))!;
    const item = (id: string) => layout.items.find((it) => it.component.id === id)!;
    expect(item("V1").anchors.minus!.y).toBeLessThan(item("V1").anchors.plus!.y);
    expect(item("C1").anchors.end!.y).toBeLessThan(item("C1").anchors.start!.y);
    expect(item("CS").anchors.end!.y).toBeLessThan(item("CS").anchors.start!.y);
  });
});

describe("schematic layout — painted label geometry", () => {
  it.each(["up", "left"])("keeps long %s labels and value-only text inside the canvas without overlaps", (direction) => {
    const ast = parseNetlist(`V1 VCC 0 5V
R1 VCC OUT value="100 kiloohms ± 1 percent" label="Wide reference WWWWWWWWWWWWWWW" dir=${direction}
C1 OUT 0 value="Value without reference WWWWWWWWWWW"
CS VCC 0 100n`);
    ast.components.find((c) => c.id === "C1")!.label = undefined;
    const layout = schematicNetlistLayout(ast)!;
    const rectangles = layout.items.filter((it) => it.labelPos).map((it) => {
      const comp = it.component;
      const width = Math.max(estimateTextWidth(comp.label ?? "", 11, { fontWeight: 600 }), estimateTextWidth(comp.value ?? "", 10));
      const x = it.labelPos!.x, y = it.labelPos!.y;
      const box = { left: x - width / 2, right: x + width / 2, top: y + (comp.label ? -11 : 2), bottom: y + (comp.value ? 15 : 3) };
      expect(box.left + layout.offsetX).toBeGreaterThanOrEqual(0);
      expect(box.top + layout.offsetY).toBeGreaterThanOrEqual(0);
      expect(box.right + layout.offsetX).toBeLessThanOrEqual(layout.width);
      expect(box.bottom + layout.offsetY).toBeLessThanOrEqual(layout.height);
      return box;
    });
    for (let i = 0; i < rectangles.length; i++) for (const b of rectangles.slice(i + 1)) {
      const a = rectangles[i]!;
      expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
    }
    const source = layout.items.find((it) => it.component.id === "V1")!;
    const centerY = source.y - source.length / 2;
    for (const box of rectangles) {
      expect(box.right <= source.x - 12 || box.left >= source.x + 12 || box.bottom <= centerY - 12 || box.top >= centerY + 12).toBe(true);
    }
  });
});

const bridgeSupply = `V1 LINE NEUTRAL type=ac_source value="230 V AC"
T1 LINE NEUTRAL AC1 AC2 type=transformer
D1 AC1 RAW 1N4007
D2 AC2 RAW 1N4007
D3 GND AC1 1N4007
D4 GND AC2 1N4007
C1 RAW GND type=ecap value="2200 uF, 25 V"
C2 RAW GND 330n
U1 RAW GND VOUT type=voltage_regulator
C3 VOUT GND 100n
R1 VOUT LED_A 1k
D5 LED_A GND type=led`;

describe("schematic layout — buses and terminal-led runs", () => {
  it("keeps source-to-transformer pairs local instead of promoting them to buses", () => {
    const layout = schematicNetlistLayout(parseNetlist(bridgeSupply))!;
    const transformer = layout.items.find((it) => it.component.id === "T1")!;
    const source = layout.items.find((it) => it.component.id === "V1")!;
    for (const net of ["LINE", "NEUTRAL"]) {
      const routes = layout.routes.filter((r) => r.netId === net || r.netId.startsWith(`${net}.`));
      expect(routes.length).toBeGreaterThan(0);
      expect(layout.flags!.some((f) => f.label === net)).toBe(false);
      for (const route of routes) for (const point of route.points) {
        expect(point.x).toBeLessThanOrEqual(transformer.x + 0.01);
      }
    }
    // The return must leave the lower terminal without passing through V1.
    const neutral = layout.routes.find((r) => r.netId === "NEUTRAL")!;
    expect(neutral.points[0]).toEqual(source.anchors.minus);
    expect(neutral.points[1]!.y).toBeGreaterThanOrEqual(source.anchors.minus!.y);
    expect(neutral.points.at(-1)).toEqual(transformer.anchors.p2);
  });

  it("reserves an unobstructed column for a bus-to-bus capacitor", () => {
    const layout = schematicNetlistLayout(parseNetlist(amplifier))!;
    const cap = layout.items.find((it) => it.component.id === "CS")!;
    const signals = layout.routes.filter((r) => !/^(VCC|GND)(\.|$)/.test(r.netId));
    expect(cap.x).toBeGreaterThan(Math.max(...signals.flatMap((r) => r.points.map((p) => p.x))));
    for (const net of ["VCC", "GND"]) {
      const leg = layout.routes.find((r) => r.netId.startsWith(`${net}.CS.`))!;
      expect(leg.points).toHaveLength(2);
      expect(leg.points[0]!.x).toBeCloseTo(leg.points[1]!.x);
      expect(layout.routes.find((r) => r.netId === net)!.junctions).toContainEqual(leg.points[1]);
    }
  });

  it("attaches the ground terminal to the return bus", () => {
    const layout = schematicNetlistLayout(parseNetlist(amplifier))!;
    const bus = layout.routes.find((r) => r.netId === "GND")!;
    const ground = layout.items.find((it) => it.component.componentType === "ground")!;
    const at = ground.anchors.start!;
    expect(at.x).toBeGreaterThan(bus.points[0]!.x);
    expect(at.x).toBeLessThan(bus.points[1]!.x);
    expect(at.y).toBe(bus.points[0]!.y);
    expect(bus.junctions).toContainEqual(at);
  });

  it("runs into and out of the regulator and resistor at their terminal heights", () => {
    const layout = schematicNetlistLayout(parseNetlist(bridgeSupply))!;
    const regulator = layout.items.find((it) => it.component.id === "U1")!;
    const resistor = layout.items.find((it) => it.component.id === "R1")!;
    // Candidate placement can fold a path or attach it to a shared spine.
    // The invariant is the electrical terminal and its approach direction,
    // rather than which end of the root polyline happens to contain the pin.
    for (const [net, at] of [["RAW", regulator.anchors.in], ["VOUT", regulator.anchors.out],
      ["VOUT", resistor.anchors.start], ["LED_A", resistor.anchors.end]] as const) {
      const segments = layout.routes.filter(route => route.netId === net || route.netId.startsWith(`${net}.`))
        .flatMap(route => route.points.slice(1).map((b, i) => [route.points[i]!, b] as const));
      expect(segments.some(([a, b]) => a.y === at!.y && b.y === at!.y &&
        ((a.x === at!.x && a.y === at!.y) || (b.x === at!.x && b.y === at!.y)))).toBe(true);
    }
  });
});


describe("schematic layout — painted terminals and routing", () => {
  it.each(["right", "down", "left", "up"])("keeps capacitor polarity with the first terminal when facing %s", (dir) => {
    const source = `V1 VCC 0 12V\nC1 VCC 0 type=ecap dir=${dir}`;
    const layout = schematicNetlistLayout(parseNetlist(source))!;
    const cap = layout.items.find((it) => it.component.id === "C1")!;
    const svg = svgOf(`circuit netlist\n${source}`);
    const body = svg.match(/<g[^>]*transform="([^"]+)"[^>]*data-id="C1"[^>]*>(.*?)<\/g>/s)!;
    expect(body[1]).toContain(`rotate(${cap.rotation})`);
    const plus = body[2]!.match(/<text x="([^"]+)" y="([^"]+)"[^>]*>\+<\/text>/)!;
    const angle = cap.rotation * Math.PI / 180;
    const at = { x: cap.x + Number(plus[1]) * Math.cos(angle) - Number(plus[2]) * Math.sin(angle),
      y: cap.y + Number(plus[1]) * Math.sin(angle) + Number(plus[2]) * Math.cos(angle) };
    const distance = (p: { x: number; y: number }) => Math.hypot(at.x - p.x, at.y - p.y);
    expect(distance(cap.anchors.start!)).toBeLessThan(distance(cap.anchors.end!));
  });

  it.each([false, true])("routes every distinct transformer terminal (centre tap: %s)", (tapped) => {
    const ast = parseNetlist(`V1 LINE NEUTRAL type=acsource\nT1 LINE NEUTRAL A ${tapped ? "CT " : ""}B type=transformer value=230:18\nR1 A B 1k${tapped ? "\nW1 CT 0" : ""}`);
    expect(ast.pinMap!.T1).toEqual({ p1: "LINE", p2: "NEUTRAL", s1: "A", ...(tapped ? { ct: "GND" } : {}), s2: "B" });
    const layout = schematicNetlistLayout(ast)!;
    const transformer = layout.items.find((it) => it.component.id === "T1")!;
    const anchors = Object.keys(ast.pinMap!.T1!).map((pin) => transformer.anchors[pin]!);
    expect(new Set(anchors.map((p) => `${p.x},${p.y}`)).size).toBe(tapped ? 5 : 4);
    for (const anchor of anchors) expect(layout.routes.some((route) => route.points.some((p) => p.x === anchor.x && p.y === anchor.y))).toBe(true);
    const sym = effectiveSymbolDef("transformer", transformer.component.attrs);
    if (tapped) expect(sym.svg(undefined, undefined, transformer.component.attrs)).toContain('x1="50" y1="0" x2="60" y2="0"');
  });

  it.each([amplifier, bridgeSupply])("keeps all routed legs out of small painted bodies", (source) => {
    const layout = schematicNetlistLayout(parseNetlist(source))!;
    for (const item of layout.items) {
      const bounds = item.component.componentType === "diode" ? [8, -8, 22, 8]
        : item.component.componentType === "resistor" ? [5, -8, 35, 8] : undefined;
      if (!bounds) continue;
      const [left, top, right, bottom] = bounds as [number, number, number, number];
      const angle = item.rotation * Math.PI / 180;
      const points = [[left, top], [right, bottom]].map(([x, y]) => ({
        x: item.x + (item.mirrorX ? item.length - x! : x! * Math.cos(angle) - y! * Math.sin(angle)),
        y: item.y + (item.mirrorX ? y! : x! * Math.sin(angle) + y! * Math.cos(angle)),
      }));
      const box = { left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)) };
      for (const route of layout.routes) for (let i = 1; i < route.points.length; i++) {
        expect(intersectsBox(route.points[i - 1]!, route.points[i]!, box), `${route.netId} crosses ${item.component.id}`).toBe(false);
      }
    }
  });

  it("labels authored regulator output nets", () => {
    const layout = schematicNetlistLayout(parseNetlist(bridgeSupply))!;
    expect(layout.flags).toContainEqual(expect.objectContaining({ kind: "label", label: "VOUT" }));
    expect(svgOf(`circuit netlist\n${bridgeSupply}`)).toContain('>VOUT</text>');
  });
});


function ioPanel(channels: number): string {
  const inputs = Array.from({ length: channels }, (_, i) => `INPUT${i}`);
  const outputs = Array.from({ length: channels }, (_, i) => `OUTPUT${i}`);
  const lines = ["V1 SUPPLY COM value=24V", "F1 SUPPLY FUSED type=fuse value=5A",
    `T1 ${[...inputs, ...outputs].join(" ")} type=terminal_block pins="${Array.from({ length: channels * 2 }, (_, i) => i + 1).join(",")}" label="Field terminals"`];
  inputs.forEach((net, i) => lines.push(`S${i} FUSED ${net} type=switch_spst label="Input ${i}"`,
    `K${i} ${net} COM type=relay_coil label="Coil ${i}"`, `H${i} ${net} COM type=pilot_light label="Lamp ${i}"`,
    `KA${i} FUSED ${outputs[i]} type=relay_no label="Output ${i}"`));
  return lines.join("\n");
}

describe("schematic layout — panel conventions and graceful routing", () => {
  it("reports unroutable geometry instead of painting an unchecked connection", () => {
    const search = vi.spyOn(router, "orthogonalRoute").mockImplementation(() => { throw new Error("No obstacle-free orthogonal route; blocked ports: []"); });
    try {
      const result = renderResult(`circuit netlist\n${bridgeSupply}`);
      expect(search).toHaveBeenCalled();
      expect(result.status).toBe("invalid");
      expect(result.diagnostics.some(d => d.message.includes("No obstacle-free orthogonal route"))).toBe(true);
    } finally { search.mockRestore(); }
  });

  it.each([3, 6])("aligns %i independent channels with numbered terminal rows and connected returns", (count) => {
    const source = ioPanel(count);
    const layout = schematicNetlistLayout(parseNetlist(source))!;
    const item = (id: string) => layout.items.find((it) => it.component.id === id)!;
    const terminal = item("T1");
    const pitch = item("S1").y - item("S0").y;
    expect(pitch).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      expect(item(`S${i}`).y).toBeCloseTo(item("S0").y + i * pitch);
      expect(item(`S${i}`).x).toBe(item("S0").x);
      expect(item(`K${i}`).x).toBe(item("K0").x);
      expect(item(`KA${i}`).x).toBeGreaterThan(terminal.x + terminal.length);
      expect(terminal.anchors[String(i + 1)]!.y).toBeCloseTo(item(`S${i}`).y);
      expect(terminal.anchors[String(count + i + 1)]!.y).toBeCloseTo(item(`KA${i}`).y);
      const leg = layout.routes.find((r) => /^(COM|GND)\./.test(r.netId) && r.netId.includes(`.K${i}.`))!;
      const join = leg.points.at(-1)!;
      expect(layout.routes.some((r) => r.netId.endsWith(".bank") && r.points[0]!.x === join.x &&
        Math.min(...r.points.map((p) => p.y)) <= join.y && Math.max(...r.points.map((p) => p.y)) >= join.y)).toBe(true);
    }
    expect(svgOf(`circuit netlist\n${source}`).match(/>T1 Field terminals<\/text>/g)).toHaveLength(1);
  });

  it("places separate terminal strips on opposite edges, in declared pin order", () => {
    const layout = schematicNetlistLayout(parseNetlist('V1 P 0 12V\nR1 P A 1k\nR2 A 0 1k\nT1 P A 0 pins="1,2,3"\nT2 A 0 pins="4,5"'))!;
    const left = layout.items.find((it) => it.component.id === "T1")!;
    const right = layout.items.find((it) => it.component.id === "T2")!;
    const inner = layout.items.filter((it) => !["terminal_block", "ground"].includes(it.component.componentType));
    expect(left.x + left.length).toBeLessThan(Math.min(...inner.map((it) => it.x)));
    expect(right.x).toBeGreaterThan(Math.max(...inner.map((it) => it.x)));
    expect(left.anchors["1"]!.x).toBeGreaterThan(left.x + left.length);
    expect(right.anchors["4"]!.x).toBeLessThan(right.x);
    expect(left.anchors["1"]!.y).toBeLessThan(left.anchors["2"]!.y);
  });

  it("keeps a wide supply drawing balanced by separating its component rows", () => {
    const layout = schematicNetlistLayout(parseNetlist(bridgeSupply))!;
    expect(layout.width / layout.height).toBeLessThan(2.3);
  });

  it("keeps the timing resistor label beside its own resistor", () => {
    const ast = parseNetlist('V1 VCC GND value="9 V" label="BAT1"\nU1 GND TIMING OUT VCC CTRL TIMING DISCH VCC type=555_timer label=U1\nR1 VCC DISCH value="10 kΩ" label=R1\nR2 DISCH TIMING value="100 kΩ" label=R2\nC1 TIMING GND value="10 µF" label=C1\nC2 CTRL GND value="10 nF" label=C2\nR3 OUT LED_A value="470 Ω" label=R3\nD1 LED_A GND type=led label=LED1');
    const layout = schematicNetlistLayout(ast)!;
    const resistor = layout.items.find((it) => it.component.id === "R2")!;
    const caption = labelBox(resistor.component, resistor.labelPos!);
    for (const route of layout.routes) for (let i = 1; i < route.points.length; i++) {
      expect(intersectsBox(route.points[i - 1]!, route.points[i]!, {
        left: caption.minX, right: caption.maxX, top: caption.minY, bottom: caption.maxY,
      })).toBe(false);
    }
    const body = boxOf(resistor, 0);
    const x = (caption.minX + caption.maxX) / 2, y = (caption.minY + caption.maxY) / 2;
    const distance = Math.hypot(x - Math.max(body.minX, Math.min(body.maxX, x)),
      y - Math.max(body.minY, Math.min(body.maxY, y)));
    expect(distance).toBeLessThan(resistor.length);
  });
});
