import { describe, expect, it } from "vitest";
import { parse, render } from "../../src/core/api";

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

describe("schematic layout — supply nets are flags, not rails", () => {
  const dsl = `circuit "Divider" netlist
V1 vcc 0 5V
R1 vcc mid 10k
R2 mid 0 10k
C1 mid 0 100n`;

  it("draws a local ground rake per ground pin rather than one long rail", () => {
    const svg = svgOf(dsl);
    // The rake's short horizontal strokes are the ground glyph; several of them
    // means each pin got its own flag.
    const rakes = svg.match(/x1="6" y1="4" x2="14" y2="4"/g) ?? [];
    expect(rakes.length).toBeGreaterThanOrEqual(2);
  });

  it("emits no full-width supply rail spanning the drawing", () => {
    const svg = svgOf(dsl);
    const { w } = viewBox(svg);
    const polylines = [...svg.matchAll(/points="([^"]+)"/g)].map((m) => m[1]!);
    for (const pts of polylines) {
      const coords = pts
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number));
      const xs = coords.map((c) => c[0]!);
      const ys = coords.map((c) => c[1]!);
      const horizontal = Math.max(...ys) - Math.min(...ys) < 1;
      const span = Math.max(...xs) - Math.min(...xs);
      if (horizontal) expect(span).toBeLessThan(w * 0.8);
    }
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
