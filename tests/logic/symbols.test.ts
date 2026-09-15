import { describe, expect, it } from "vitest";
import type { LogicGateType } from "../../src/core/types";
import { getGateGeometry } from "../../src/diagrams/logic/symbols";
import { parseLogic } from "../../src/diagrams/logic/parser";
import { renderLogic } from "../../src/diagrams/logic/renderer";

function drawing(type: LogicGateType, style = "ansi", count = 2): string {
  const names = Array.from({ length: count }, (_, i) => `I${i}`).join(",");
  return renderLogic(parseLogic(`logic [style: ${style}]\ninput ${names}\nG = ${type}(${names})\noutput G`));
}

function element(svg: string, tag: string, className: string): string {
  const found = svg.match(new RegExp(`<${tag}\\b[^>]*class="${className}"[^>]*>`));
  if (!found) throw new Error(`Missing ${tag}.${className}`);
  return found[0];
}

function attr(svg: string, name: string): string {
  const found = svg.match(new RegExp(`\\b${name}="([^"]*)"`));
  if (!found) throw new Error(`Missing ${name}`);
  return found[1];
}

const footprints: Array<[LogicGateType, number, number, number]> = [
  ["AND", 80, 60, 20], ["NAND", 90, 60, 20],
  ["OR", 70, 60, 18], ["NOR", 80, 60, 18],
  ["XOR", 70, 60, 12], ["XNOR", 80, 60, 12],
];

describe("accepted logic forms with frozen layout footprints", () => {
  it.each(footprints)("keeps %s dimensions and all input/output anchors", (type, width, height, x) => {
    for (const count of [1, 2, 3, 8, 16]) {
      const g = getGateGeometry(type, count);
      expect([g.width, g.height]).toEqual([width, height]);
      expect(g.inputPins).toEqual(Array.from({ length: count }, (_, i) => ({
        id: `in${i + 1}`, x,
        y: count === 1 ? 30 : count === 2 ? 15 + 30 * i : 5 + 50 / (count - 1) * i,
      })));
      expect(g.outputPins.map(p => [p.id, p.x, p.y])).toEqual([["out", width, 30]]);
    }
  });

  it.each<LogicGateType>(["BUF", "NOT", "TRISTATE_BUF", "TRISTATE_INV"])("keeps %s triangle anchors", type => {
    const g = getGateGeometry(type, 2);
    const controlled = type.startsWith("TRISTATE");
    const width = type === "NOT" || type === "TRISTATE_INV" ? 70 : 60;
    expect([g.width, g.height]).toEqual([width, controlled ? 70 : 60]);
    expect(g.inputPins).toEqual(controlled
      ? [{ id: "in1", x: 10, y: 30 }, { id: "en", x: 35, y: 65, label: "EN" }]
      : [{ id: "in1", x: 10, y: 30 }]);
    expect(g.outputPins.map(p => [p.x, p.y])).toEqual([[width, 30]]);
  });

  it.each<LogicGateType>(["AND", "NAND"])("draws %s with flat shoulders and a semicircular front", type => {
    const d = attr(element(drawing(type), "path", "schematex-logic-gate-body"), "d");
    const arc = d.match(/H ([\d.]+) A ([\d.]+)[, ]([\d.]+) 0 0 1 ([\d.]+)[, ]60 H 20 Z/);
    if (!arc) throw new Error(`Missing semicircle: ${d}`);
    expect(+arc[2]).toBe(30);
    expect(+arc[3]).toBe(30);
    expect(+arc[1]).toBe(+arc[4]);
  });

  it.each<LogicGateType>(["OR", "NOR", "XOR", "XNOR"])("draws %s with a concave back and two convex nose curves", type => {
    const d = attr(element(drawing(type), "path", "schematex-logic-gate-body"), "d");
    const commands = [...d.matchAll(/([MQCZ])([^MQCZ]*)/g)];
    expect(commands.map(c => c[1])).toEqual(["M", "Q", "C", "C", "Z"]);
    const values = commands.map(c => c[2].trim().split(/[,\s]+/).map(Number));
    expect(values[1][0]).toBeGreaterThan(values[0][0]);
    expect(values[1].slice(2)).toEqual([values[0][0], 60]);
    expect(values[2][1]).toBeGreaterThan(50);
    expect(values[2][3]).toBeGreaterThan(40);
    expect(values[2][5]).toBe(30);
    expect(values[3][1]).toBeLessThan(20);
    expect(values[3][3]).toBeLessThan(10);
    expect(values[3].slice(4)).toEqual(values[0]);
  });

  it.each<LogicGateType>(["XOR", "XNOR"])("keeps %s extra arc separate, open, and unfilled", type => {
    const svg = drawing(type);
    const arc = element(svg, "path", "schematex-logic-xor-arc");
    expect(attr(arc, "d")).toMatch(/^M [\d., ]+ Q [\d., ]+$/);
    expect(svg).toMatch(/\.schematex-logic-xor-arc\s*\{[^}]*fill: none/);
    const gap = element(svg, "path", "schematex-logic-xor-gap");
    expect(attr(gap, "d")).toMatch(/Z$/);
    expect(svg).toMatch(/\.schematex-logic-xor-gap\s*\{[^}]*stroke: none/);
    expect(svg.indexOf(gap)).toBeLessThan(svg.indexOf(arc));
  });

  it.each<LogicGateType>(["OR", "XOR"])("connects the frozen single %s input to its curved back", type => {
    const svg = drawing(type, "ansi", 1);
    const gate = svg.slice(svg.indexOf('data-gate-id="G"'));
    const stub = element(gate, "line", "schematex-logic-wire");
    expect([+attr(stub, "x1"), +attr(stub, "y1")]).toEqual([type === "OR" ? 18 : 12, 30]);
    expect([+attr(stub, "x2"), +attr(stub, "y2")]).toEqual([type === "OR" ? 20 : 14, 30]);
  });

  it.each<LogicGateType>(["NAND", "NOR", "XNOR", "NOT", "TRISTATE_INV"])("makes the %s output bubble tangent in both styles", type => {
    for (const style of ["ansi", "iec"]) {
      const svg = drawing(type, style, type === "NOT" ? 1 : 2);
      const bubble = element(svg, "circle", "schematex-logic-bubble");
      const cx = +attr(bubble, "cx"), r = +attr(bubble, "r");
      expect(r).toBe(4);
      expect(cx + r).toBe(getGateGeometry(type, 2).outputPins[0].x);
      if (style === "iec") {
        const rect = element(svg, "rect", "schematex-logic-gate-body");
        expect(+attr(rect, "x") + +attr(rect, "width")).toBe(cx - r);
        expect(+attr(element(svg, "text", "schematex-logic-gate-iec-label"), "x")).toBe((cx - r) / 2);
      } else {
        const d = attr(element(svg, "path", "schematex-logic-gate-body"), "d");
        if (type === "NAND") {
          const arc = d.match(/H ([\d.]+) A ([\d.]+)/);
          if (!arc) throw new Error(`Missing semicircle: ${d}`);
          expect(+arc[1] + +arc[2]).toBe(cx - r);
        } else {
          expect(d).toContain(`${cx - r},30`);
        }
      }
    }
  });

  it.each<LogicGateType>(["TRISTATE_BUF", "TRISTATE_INV"])("joins %s enable to the sloping edge", type => {
    const svg = drawing(type);
    const pin = element(svg, "line", "schematex-logic-enable-pin");
    expect([+attr(pin, "x1"), +attr(pin, "y1")]).toEqual([35, 65]);
    const nose = getGateGeometry(type, 2).outputPins[0].x - (type === "TRISTATE_INV" ? 8 : 0);
    expect(+attr(pin, "x2")).toBe(35);
    expect(+attr(pin, "y2")).toBeCloseTo(55 - 25 * (35 - 10) / (nose - 10));
    expect(svg).toMatch(/\.schematex-logic-enable-pin\s*\{[^}]*stroke:/);
  });

  it.each<LogicGateType>(["AND", "OR", "XOR", "NAND", "NOR", "XNOR"])("bakes expanded %s coordinates without scaling artwork", type => {
    const svg = drawing(type, "ansi", 8);
    expect(svg).not.toMatch(/transform="scale\(/);
    const d = attr(element(svg, "path", "schematex-logic-gate-body"), "d");
    expect(d).toContain("117.6");
    expect(svg).toContain("stroke-width: 1.75");
  });
});
