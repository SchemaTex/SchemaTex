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

describe("logic symbol connectivity", () => {

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
      expect(r).toBeGreaterThan(0);
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
});
