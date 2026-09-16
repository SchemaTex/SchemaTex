import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderState } from "../../src/diagrams/state/renderer";

function groups(svg: string, className: string): string[] {
  return [...svg.matchAll(/<g\b[^>]*>[\s\S]*?<\/g>/g)]
    .map((match) => match[0].slice(match[0].lastIndexOf("<g ")))
    .filter((group) => attribute(group, "class").split(" ").includes(className));
}

function attribute(svg: string, name: string): string {
  const match = svg.match(new RegExp(`\\b${name}="([^"]*)"`));
  expect(match, `Missing ${name} in ${svg}`).not.toBeNull();
  return match![1];
}

function transitionPath(edge: string): string {
  return attribute(edge.match(/<path\b[^>]*>/)![0], "d");
}

function coordinates(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe("state semantics in rendered SVG", () => {
  for (const caseName of ["state-dfa-binary-divisible-by-three", "state-nfa-to-dfa-subset"]) {
    it(`renders every authored transition in ${caseName}`, () => {
      const source = readFileSync(new URL(`../../visual-eval/cases/${caseName}/source.sx`, import.meta.url), "utf8");
      const svg = renderState(source);
      const edges = groups(svg, "lt-edge");
      const authored = [...source.matchAll(/^\s*(\w+|\[\*\])\s*-->\s*(\w+)\s*(?::\s*(.*))?$/gm)];
      expect(edges).toHaveLength(authored.length);
      for (const [index, transition] of authored.entries()) {
        const edge = edges.find((item) => attribute(item, "data-edge-id") === `t${index + 1}`)!;
        expect(edge).toBeDefined();
        expect(attribute(edge, "data-to")).toBe(transition[2]);
        if (transition[1] !== "[*]") expect(attribute(edge, "data-from")).toBe(transition[1]);
        expect(edge).toContain('marker-end="url(#lt-state-arrow)"');
        expect(transitionPath(edge)).toMatch(/^M .+[LC] /);
        if (transition[3]) expect(edge).toContain(`>${transition[3].trim()}</tspan>`);
      }
      expect(svg).toMatch(/\.lt-transition\s*\{[^}]*stroke:\s*[^;]+;[^}]*stroke-width:\s*1\.4;[^}]*fill:\s*none;/);
      expect(svg).not.toMatch(/(?:display:\s*none|visibility:\s*hidden|opacity:\s*0(?:[; }]))/);
      expect(new Set(edges.map(transitionPath)).size).toBe(edges.length);
      for (const classifier of source.matchAll(/state\s+(\w+)\s+<<accepting>>/g)) {
        const node = groups(svg, "lt-simple").find((item) => attribute(item, "data-id") === classifier[1])!;
        expect(node.match(/<rect\b/g)).toHaveLength(2);
        expect(node).toContain(`>${classifier[1]}</tspan>`);
      }
    });
  }

  it.each(["accepting", "final"])("renders <<%s>> as two inset rounded outlines with the state id", (classifier) => {
    const svg = renderState(`stateDiagram-v2
[*] --> Ready
state Ready <<${classifier}>>
Ready --> Ordinary : next`);
    const nodes = groups(svg, "lt-simple");
    expect(nodes).toHaveLength(2);
    const accepting = nodes.find((node) => attribute(node, "data-id") === "Ready")!;
    const ordinary = nodes.find((node) => attribute(node, "data-id") === "Ordinary")!;
    const outlines = [...accepting.matchAll(/<rect\b[^>]*>/g)].map((match) => match[0]);
    expect(outlines).toHaveLength(2);
    const [outer, inner] = outlines;
    expect(Number(attribute(inner, "x"))).toBe(Number(attribute(outer, "x")) + 4);
    expect(Number(attribute(inner, "y"))).toBe(Number(attribute(outer, "y")) + 4);
    expect(Number(attribute(inner, "width"))).toBe(Number(attribute(outer, "width")) - 8);
    expect(Number(attribute(inner, "height"))).toBe(Number(attribute(outer, "height")) - 8);
    expect(attribute(outer, "rx")).toBe("8");
    expect(attribute(inner, "rx")).toBe("4");
    expect(attribute(outer, "class")).toBe("lt-state-body");
    expect(attribute(inner, "class")).toBe("lt-state-body");
    expect(accepting).toContain(">Ready</tspan>");
    expect(ordinary.match(/<rect\b/g)).toHaveLength(1);
    expect(ordinary).toContain(">Ordinary</tspan>");
    expect(svg).toMatch(/\.lt-state-body\s*\{[^}]*stroke:\s*[^;]+;[^}]*stroke-width:\s*1\.6;/);
    expect(svg).not.toMatch(/(?:display:\s*none|visibility:\s*hidden|opacity:\s*0(?:[; }]))/);
  });

  it.each([
    "Ready: Custom description\nstate Ready <<accepting>>",
    "state Ready <<accepting>>\nReady: Custom description",
    "state Ready: Custom description\nstate Ready <<final>>",
    'state Ready <<final>>\nstate "Custom description" as Ready',
  ])("preserves descriptions alongside classifiers: %s", (declarations) => {
    const svg = renderState(`stateDiagram-v2\n${declarations}`);
    const nodes = groups(svg, "lt-simple");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].match(/<rect\b/g)).toHaveLength(2);
    expect(nodes[0]).toContain(">Custom description</tspan>");
    expect(nodes[0]).not.toContain(">Ready</tspan>");
  });

  it.each(["accepting", "final"])("treats the description '%s' only as label text", (description) => {
    const svg = renderState(`stateDiagram-v2\nReady: ${description}`);
    const node = groups(svg, "lt-simple")[0];
    expect(node.match(/<rect\b/g)).toHaveLength(1);
    expect(node).toContain(`>${description}</tspan>`);
    expect(node).not.toContain(">Ready</tspan>");
  });

  it("gives every anonymous terminal transition a distinct final marker", () => {
    const svg = renderState(`stateDiagram-v2
[*] --> Processing
Processing --> Completed : finish
Processing --> Aborted : cancel
Completed --> [*]
Aborted --> [*]
Aborted --> [*] : timeout`);
    const finals = groups(svg, "lt-pseudo").filter((node) => attribute(node, "data-kind") === "final");
    expect(finals).toHaveLength(3);
    const ids = new Set(finals.map((node) => attribute(node, "data-id")));
    const terminalEdges = groups(svg, "lt-edge").filter((edge) => ids.has(attribute(edge, "data-to")));
    expect(terminalEdges).toHaveLength(3);
    expect(new Set(terminalEdges.map((edge) => attribute(edge, "data-to"))).size).toBe(3);
    for (const node of finals) {
      expect(node.match(/<circle\b/g)).toHaveLength(2);
      expect(node).toContain('class="lt-ps-final-outer"');
      expect(node).toContain('class="lt-ps-final-inner"');
    }
  });

  it("preserves an explicitly shared named final", () => {
    const svg = renderState(`stateDiagram-v2
final terminal
Completed --> terminal
Aborted --> terminal`);
    expect(groups(svg, "lt-pseudo")).toHaveLength(1);
    expect(groups(svg, "lt-edge").map((edge) => attribute(edge, "data-to"))).toEqual(["terminal", "terminal"]);
  });

  for (const direction of ["TB", "LR"]) {
    it(`points reciprocal transitions at their authored targets in ${direction}`, () => {
      const svg = renderState(`stateDiagram-v2
direction ${direction}
[*] --> Waiting
Waiting --> Working : start
Working --> Waiting : retry`);
      const states = groups(svg, "lt-simple");
      for (const edge of groups(svg, "lt-edge")) {
        const target = states.find((node) => attribute(node, "data-id") === attribute(edge, "data-to"))!;
        const body = target.match(/<rect\b[^>]*>/)![0];
        const x = Number(attribute(body, "x")), y = Number(attribute(body, "y"));
        const width = Number(attribute(body, "width")), height = Number(attribute(body, "height"));
        const values = coordinates(transitionPath(edge));
        const endX = values[values.length - 2], endY = values[values.length - 1];
        expect(endX).toBeGreaterThanOrEqual(x);
        expect(endX).toBeLessThanOrEqual(x + width);
        expect(endY).toBeGreaterThanOrEqual(y);
        expect(endY).toBeLessThanOrEqual(y + height);
      }
    });
  }

  it("places each lifecycle final near its source and connects to its ring", () => {
    const source = readFileSync(new URL("../../visual-eval/cases/state-order-lifecycle/source.sx", import.meta.url), "utf8");
    const svg = renderState(source);
    const finals = groups(svg, "lt-pseudo").filter((node) => attribute(node, "data-kind") === "final");
    const states = groups(svg, "lt-simple");
    expect(finals).toHaveLength(2);
    for (const final of finals) {
      const id = attribute(final, "data-id");
      const edge = groups(svg, "lt-edge").find((item) => attribute(item, "data-to") === id)!;
      const state = states.find((item) => attribute(item, "data-id") === attribute(edge, "data-from"))!;
      const body = state.match(/<rect\b[^>]*>/)![0];
      const cx = Number(attribute(body, "x")) + Number(attribute(body, "width")) / 2;
      const bottom = Number(attribute(body, "y")) + Number(attribute(body, "height"));
      const ringX = Number(attribute(final, "cx")), ringY = Number(attribute(final, "cy"));
      expect(Math.abs(ringX - cx)).toBeLessThan(80);
      expect(ringY - bottom).toBeGreaterThan(0);
      expect(ringY - bottom).toBeLessThan(150);
      const values = coordinates(transitionPath(edge));
      expect(Math.hypot(values[values.length - 2] - ringX, values[values.length - 1] - ringY)).toBeCloseTo(11);
    }
  });

  it("keeps anonymous terminal outcomes distinct inside a composite", () => {
    const svg = renderState(`stateDiagram-v2
state Session {
  [*] --> Running
  Running --> [*] : complete
  Running --> [*] : abort
}`);
    const finals = groups(svg, "lt-pseudo").filter((node) => attribute(node, "data-kind") === "final");
    expect(finals).toHaveLength(2);
    expect(new Set(finals.map((node) => attribute(node, "data-id"))).size).toBe(2);
  });

  it("draws separate paths for multiple self-transitions on one state", () => {
    const svg = renderState(`stateDiagram-v2
Sink --> Sink : a
Sink --> Sink : b`);
    const edges = groups(svg, "lt-edge");
    expect(edges).toHaveLength(2);
    expect(new Set(edges.map(transitionPath)).size).toBe(2);
    expect(edges[0]).toContain(">a</tspan>");
    expect(edges[1]).toContain(">b</tspan>");
  });

  it("keeps complete loop curves attached and inside the SVG after title and note shifts", () => {
    const svg = renderState(`state "Shifted loops"
Sink --> Sink
Sink --> Sink
Sink --> Sink
note left of Sink : This note shifts the drawing`);
    const node = groups(svg, "lt-simple")[0];
    const body = node.match(/<rect\b[^>]*>/)![0];
    const x = Number(attribute(body, "x")), y = Number(attribute(body, "y"));
    const width = Number(attribute(body, "width")), height = Number(attribute(body, "height"));
    const [, , canvasWidth, canvasHeight] = coordinates(attribute(svg, "viewBox"));
    for (const edge of groups(svg, "lt-edge")) {
      const [sx, sy, ax, ay, bx, by, ex, ey] = coordinates(transitionPath(edge));
      expect(sx).toBeCloseTo(x + width);
      expect(sy).toBeCloseTo(y + height * 0.35);
      expect(ex).toBeCloseTo(x + width * 0.65);
      expect(ey).toBeCloseTo(y);
      for (let step = 0; step <= 40; step++) {
        const t = step / 40, u = 1 - t;
        const px = u ** 3 * sx + 3 * u * u * t * ax + 3 * u * t * t * bx + t ** 3 * ex;
        const py = u ** 3 * sy + 3 * u * u * t * ay + 3 * u * t * t * by + t ** 3 * ey;
        expect(px).toBeGreaterThan(0);
        expect(py).toBeGreaterThan(0);
        expect(px).toBeLessThan(canvasWidth);
        expect(py).toBeLessThan(canvasHeight);
      }
    }
  });
});
