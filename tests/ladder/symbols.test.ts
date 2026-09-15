import { describe, expect, test } from "vitest";
import { parseLadderDSL } from "../../src/diagrams/ladder/parser";
import { layoutLadder } from "../../src/diagrams/ladder/layout";
import { renderLadder } from "../../src/diagrams/ladder/renderer";
import { resolveIndustrialTheme } from "../../src/core/theme";

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected SVG geometry is missing");
  return value;
}

function symbol(instruction: string) {
  const ast = parseLadderDSL(`ladder\nrung 0:\n  ${instruction}`);
  const node = layoutLadder(ast).nodes[0];
  const svg = renderLadder(ast);
  const body = required(svg.match(/<g data-element="[^"]+"[^>]*>([\s\S]*?)<\/g>/))[1];
  return { node, svg, body };
}

function attributes(body: string, tag: string, className: string) {
  return [...body.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))]
    .map((match) => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])))
    .filter((attrs) => attrs.class?.split(" ").includes(className));
}

describe("accepted ladder symbol forms", () => {
  test.each(["default", "monochrome", "dark"])("the block header rule has visible themed ink in %s", (theme) => {
    const svg = renderLadder(parseLadderDSL("ladder\nrung 0:\n  TON(T, PRE=3000, ACC=0)"), { theme });
    expect(svg).toContain(`.lt-ladder-fb-rule { stroke: ${resolveIndustrialTheme(theme).textMuted};`);
    expect(svg).not.toContain("undefined");
  });
  test.each(["OTE", "OTL", "OTU", "OTN"])("%s arcs fit the box and the leads meet their crowns", (op) => {
    const { node: n, body } = symbol(`${op}(Output)`);
    const arcs = attributes(body, "path", "lt-ladder-coil");
    const leads = attributes(body, "line", "lt-ladder-wire");
    expect(arcs).toHaveLength(2);
    expect(leads).toHaveLength(2);
    const crowns = arcs.map((arc, i) => {
      const a = required(arc.d.match(/^M ([\d.]+) ([\d.]+) A ([\d.]+) ([\d.]+) 0 0 ([01]) ([\d.]+) ([\d.]+)$/));
      expect(a).not.toBeNull();
      const [, x, y, rx, ry, sweep, endX, endY] = a.map(Number);
      expect(x).toBe(endX);
      expect(y).toBe(n.y);
      expect(endY).toBe(n.y + n.height);
      expect(ry).toBe(n.height / 2);
      expect(sweep).toBe(i);
      return x + (i === 0 ? -rx : rx);
    });
    expect(crowns[0]).toBeGreaterThanOrEqual(n.x + 1);
    expect(crowns[1]).toBeLessThanOrEqual(n.x + n.width - 1);
    expect(crowns[1] - crowns[0]).toBeGreaterThanOrEqual(n.width - 4);
    expect(Number(leads[0].x1)).toBe(n.x);
    expect(Number(leads[0].x2)).toBe(crowns[0]);
    expect(Number(leads[1].x1)).toBe(crowns[1]);
    expect(Number(leads[1].x2)).toBe(n.x + n.width);
    for (const lead of leads) {
      expect(Number(lead.y1)).toBe(n.rungY);
      expect(Number(lead.y2)).toBe(n.rungY);
    }
  });

  test.each([["OTL", "L"], ["OTU", "U"], ["OSF", "N"]])("%s carries %s", (op, mark) => {
    expect(symbol(`${op}(Flag)`).body).toContain(`class="lt-ladder-symbol-label">${mark}</text>`);
  });

  test("OTN uses a full-height diagonal stroke rather than a font slash", () => {
    const { body, node } = symbol("OTN(Inverted)");
    const [slash] = attributes(body, "line", "lt-ladder-negation");
    expect(slash).toBeDefined();
    expect(Number(slash.y1) - Number(slash.y2)).toBeGreaterThan(node.height / 2);
    expect(body).not.toContain(">/</text>");
  });

  test.each(["XIC", "XIO", "OSF"])("%s has narrow contact blades with connected leads", (op) => {
    const { body, node: n } = symbol(`${op}(Input)`);
    const blades = attributes(body, "line", "lt-ladder-contact-blade");
    const leads = attributes(body, "line", "lt-ladder-wire");
    expect(blades).toHaveLength(2);
    expect(Number(blades[1].x1) - Number(blades[0].x1)).toBe(n.height / 2);
    blades.forEach((blade, i) => {
      expect(Number(blade.y1)).toBe(n.y);
      expect(Number(blade.y2)).toBe(n.y + n.height);
      expect(Number(leads[i][i === 0 ? "x2" : "x1"])).toBe(Number(blade.x1));
    });
    if (op === "XIO") {
      const [slash] = attributes(body, "line", "lt-ladder-negation");
      expect(slash.x1).toBe(blades[0].x1);
      expect(slash.x2).toBe(blades[1].x1);
    }
  });

  test.each(["ONS", "RES"])("%s is a bracketed inline instruction in its existing box", (op) => {
    const { body, node: n } = symbol(`${op}(Flag, name="Pulse flag", address="B3:0")`);
    expect([n.width, n.height]).toEqual([32, 24]);
    expect(body).not.toContain('class="lt-ladder-coil"');
    expect(body).not.toContain("↑");
    expect(body).toContain(`class="lt-ladder-symbol-label">${op}</text>`);
    const brackets = attributes(body, "path", "lt-ladder-inline-bracket");
    expect(brackets).toHaveLength(2);
    expect(brackets[0].d).toBe(`M ${n.x + 5} ${n.y} H ${n.x + 1} V ${n.y + n.height} H ${n.x + 5}`);
    expect(brackets[1].d).toBe(`M ${n.x + n.width - 5} ${n.y} H ${n.x + n.width - 1} V ${n.y + n.height} H ${n.x + n.width - 5}`);
    expect(body).toContain(">Pulse flag</text>");
    expect(body).toContain(">B3:0</text>");
  });

  test.each([["EQU", "="], ["NEQ", "≠"], ["GRT", "&gt;"], ["LES", "&lt;"], ["GEQ", "≥"], ["LEQ", "≤"]])("%s uses a comparison contact", (op, mark) => {
    const { body, node } = symbol(`${op}(Limit, IN1=Count, IN2=450)`);
    expect([node.width, node.height]).toEqual([56, 34]);
    expect(body).not.toContain("<rect");
    expect(attributes(body, "line", "lt-ladder-contact-blade")).toHaveLength(2);
    expect(body).toContain(`>${mark}</text>`);
    expect(body).toContain(">Count</text>");
    expect(body).toContain(">450</text>");
  });

  test("comparison operands retain their meaning when named arguments are reordered", () => {
    expect(symbol("GEQ(Limit, IN2=450, IN1=Count)").body)
      .toBe(symbol("GEQ(Limit, IN1=Count, IN2=450)").body);
  });

  test.each(["TON", "TOFF", "TP", "CTU", "CTD", "CTUD", "ADD", "SUB", "MUL", "DIV", "MOV"])("%s has a ruled header and separately themed parameter columns", (op) => {
    const { body, node: n } = symbol(`${op}(Block, PRE=3000, ACC=0, IN=Enable)`);
    expect([n.width, n.height]).toEqual([80, 56]);
    const [rule] = attributes(body, "line", "lt-ladder-fb-rule");
    expect(rule).toBeDefined();
    expect(Number(rule.x1)).toBe(n.x);
    expect(Number(rule.x2)).toBe(n.x + n.width);
    const names = attributes(body, "text", "lt-ladder-param-name");
    const values = attributes(body, "text", "lt-ladder-param-value");
    expect(names).toHaveLength(3);
    expect(values).toHaveLength(3);
    names.forEach((name, i) => {
      expect(name.y).toBe(values[i].y);
      expect(Number(name.y)).toBeGreaterThan(Number(rule.y1));
      expect(Number(name.y)).toBeLessThan(n.y + n.height);
    });
    expect(body).toContain(">3000</text>");
    expect(body).toContain(">0</text>");
  });

  test("keeps fixed footprints, series routing and rung pitch", () => {
    const ast = parseLadderDSL("ladder\nrung 0:\n  XIC(A)\n  ONS(B)\n  OTL(C)\nrung 1:\n  TON(T, PRE=3)\n  RES(T)");
    const layout = layoutLadder(ast);
    expect(layout.nodes.map(n => [n.x, n.y, n.width, n.height, n.rungY])).toEqual([
      [79, 101, 32, 24, 113], [133, 101, 32, 24, 113], [187, 101, 32, 24, 113],
      [79, 201, 80, 56, 229], [181, 217, 32, 24, 229],
    ]);
    expect(layout.rungs.map(r => r.height)).toEqual([100, 107]);
    expect(layout.wires.map(w => w.path)).toContain("M 159 229 L 181 229");
    const svg = renderLadder(ast);
    expect(svg).not.toMatch(/transform="[^"]*scale\(/);
    expect(svg).not.toContain("style=");
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
  });
});
