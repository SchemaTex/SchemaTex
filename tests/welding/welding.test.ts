import { describe, test, expect } from "vitest";
import { parseWelding } from "../../src/diagrams/welding/parser";
import { renderWelding } from "../../src/diagrams/welding/renderer";
import { layoutWelding } from "../../src/diagrams/welding/layout";
import { weldGlyph } from "../../src/diagrams/welding/symbols";
import { WELD_TYPE_NAMES } from "../../src/diagrams/welding/types";
import type { WeldType } from "../../src/diagrams/welding/types";
import { Resvg } from "@resvg/resvg-js";

// ─────────────────────────────────────────────────────────────
// Welding symbols (47-WELDING-SYMBOL-STANDARD) — AWS A2.4 / ISO 2553
//
//   welding [standard: aws|iso-a|iso-b]
//   joint "label" { arrow: <weldspec>  other: <weldspec>  around field  tail: "…" }
//   <weldspec> = <type> [size= len= pitch= count= angle= root= throat= contour= finish=]
// ─────────────────────────────────────────────────────────────

describe("welding — parsing", () => {
  test("keeps apostrophes in bare names while recognizing quoted directive values", () => {
    const ast = parseWelding(`welding Farmer's gate
joint Farmer's corner { arrow: fillet size=6 tail:'field inspection' }`);
    expect(ast.title).toBe("Farmer's gate");
    expect(ast.joints).toHaveLength(1);
    expect(ast.joints[0]).toMatchObject({
      label: "Farmer's corner", arrow: { type: "fillet", size: 6 },
      tail: "field inspection", field: false,
    });
  });

  test("preserves quoted directive words and consumes header brackets", () => {
    const ast = parseWelding(`welding "Joint inspection" [standard: iso-b]
joint "support" { arrow: fillet size=6 tail: "FIELD; site; around; label: checked" }`);
    expect(ast.title).toBe("Joint inspection");
    expect(ast.standard).toBe("iso-b");
    expect(ast.joints[0]!.tail).toBe("FIELD; site; around; label: checked");
    expect(ast.joints[0]!.field).toBe(false);
    expect(ast.joints[0]!.around).toBe(false);
  });

  test("parses a single-line joint with an arrow-side fillet", () => {
    const ast = parseWelding(`welding "Bracket"\njoint "plate" { arrow: fillet size=8 }`);
    expect(ast.type).toBe("welding");
    expect(ast.standard).toBe("aws");
    expect(ast.title).toBe("Bracket");
    expect(ast.joints).toHaveLength(1);
    const j = ast.joints[0]!;
    expect(j.label).toBe("plate");
    expect(j.arrow).toEqual({ type: "fillet", size: 8 });
    expect(j.other).toBeUndefined();
  });

  test("parses a multi-line joint with full dimensions + flags + tail", () => {
    const ast = parseWelding(`welding
joint "butt" {
  arrow: vgroove angle=60 root=3 throat=12
  other: backing
  around
  field
  tail: "SMAW; E7018"
}`);
    const j = ast.joints[0]!;
    expect(j.arrow).toEqual({ type: "vgroove", angle: 60, root: 3, throat: 12 });
    expect(j.other).toEqual({ type: "backing" });
    expect(j.around).toBe(true);
    expect(j.field).toBe(true);
    expect(j.tail).toBe("SMAW; E7018");
  });

  test("`both:` puts the same weld on arrow and other sides", () => {
    const ast = parseWelding(`welding\njoint "x" { both: fillet size=6 len=50 pitch=150 }`);
    const j = ast.joints[0]!;
    expect(j.arrow).toEqual({ type: "fillet", size: 6, length: 50, pitch: 150 });
    expect(j.other).toEqual({ type: "fillet", size: 6, length: 50, pitch: 150 });
  });

  test("reads multiple joints and the standard switch", () => {
    const ast = parseWelding(`welding standard: iso-a
joint "a" { arrow: fillet size=5 }
joint "b" { arrow: vgroove angle=70 }`);
    expect(ast.standard).toBe("iso-a");
    expect(ast.joints).toHaveLength(2);
    expect(ast.joints[1]!.arrow!.angle).toBe(70);
  });

  test("accepts type aliases and `iso` shorthand", () => {
    const ast = parseWelding(`welding standard: iso\njoint "x" { arrow: v angle=60 }`);
    expect(ast.standard).toBe("iso-a");
    expect(ast.joints[0]!.arrow!.type).toBe("vgroove");
  });

  test("tolerates a joint missing its closing brace", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: fillet size=8`);
    expect(ast.joints).toHaveLength(1);
    expect(ast.joints[0]!.arrow).toEqual({ type: "fillet", size: 8 });
  });
});

describe("welding — validation (the structural differentiator)", () => {
  test("flags a fillet with no size", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: fillet }`);
    expect(ast.warnings.join("\n")).toMatch(/fillet weld needs a leg size/);
  });

  test("flags angle on a non-groove weld", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: fillet size=8 angle=60 }`);
    expect(ast.warnings.join("\n")).toMatch(/angle= only applies to groove welds/);
  });

  test("flags pitch without length", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: fillet size=8 pitch=150 }`);
    expect(ast.warnings.join("\n")).toMatch(/pitch= needs a length=/);
  });

  test("flags surfacing on the other side", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: fillet size=8\n  other: surfacing throat=5 }`);
    expect(ast.warnings.join("\n")).toMatch(/surfacing weld is arrow-side only/);
  });

  test("a valid groove weld produces no warnings", () => {
    const ast = parseWelding(`welding\njoint "x" { arrow: vgroove angle=60 root=3 }`);
    expect(ast.warnings).toEqual([]);
  });
});

describe("welding — rendering", () => {
  test("every glyph stays on its declared side of the reference line", () => {
    for (const type of Object.keys(WELD_TYPE_NAMES) as WeldType[]) {
      for (const dir of [1, -1] as const) {
        const glyph = weldGlyph(type, 50, 50, dir, "weld", 28, 24).join("");
        const box = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><style>.weld {fill:none;stroke:black;stroke-width:1}</style>${glyph}</svg>`, { font: { loadSystemFonts: false } }).getBBox()!;
        expect(box.width, type).toBeGreaterThan(0);
        if (dir === 1) expect(box.y, type).toBeGreaterThanOrEqual(49.5);
        else expect(box.y + box.height, type).toBeLessThanOrEqual(50.5);
      }
    }
  });
  test("ISO-A preserves both sides, including unequal dimensions of the same weld type", () => {
    const svg = renderWelding(`welding standard: iso-a
joint "Independent dimensions" { arrow: fillet size=7 other: fillet size=11 }`);
    expect(svg).toContain('class="sx-weld-ref-dashed"');
    expect(svg).toContain('>11</text>');
    const equal = renderWelding(`welding standard: iso-a
joint "Equal dimensions" { both: fillet size=7 }`);
    expect(equal).not.toContain('class="sx-weld-ref-dashed"');
    expect(equal.match(/class="sx-weld-side"/g)).toHaveLength(2);
  });

  test("measures long dimensions and annotations before stacking the next callout", () => {
    const ast = parseWelding(`welding "A measured drawing"
joint "A long attachment description with no implied geometry" {
  arrow: vgroove size=123.45 root=0.125 angle=75 contour=flush finish=G len=1234 pitch=2345
  other: fillet size=9 contour=convex finish=M
  tail: "Process specification with a long qualification and inspection requirement"
}
joint "Next attachment" { arrow: fillet size=5 }`);
    const lay = layoutWelding(ast);
    const [first, second] = lay.joints;
    expect(first!.refX1).toBeGreaterThan(first!.symbolX + first!.rightExtent);
    expect(first!.labelY).toBeGreaterThan(first!.arrowY);
    expect(second!.top).toBeGreaterThan(first!.bottom);
    expect(first!.refX1 + 20 + first!.tailWidth).toBeLessThan(lay.canvasWidth);
  });
  test("emits a semantic welding SVG", () => {
    const svg = renderWelding(`welding "T"\njoint "plate" { arrow: fillet size=8 }`);
    expect(svg).toContain('data-diagram-type="welding"');
    expect(svg).toContain('data-standard="aws"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("fillet weld");
  });

  test("ISO-A draws the dashed companion reference line", () => {
    const svg = renderWelding(`welding standard: iso-a\njoint "x" { arrow: vgroove angle=60\n  other: backing }`);
    expect(svg).toContain('class="sx-weld-ref-dashed"');
  });

  test("AWS does not draw a dashed line", () => {
    const svg = renderWelding(`welding\njoint "x" { arrow: fillet size=8\n  other: fillet size=8 }`);
    expect(svg).not.toContain('class="sx-weld-ref-dashed"');
  });

  test("renders the all-around circle and field flag", () => {
    const svg = renderWelding(`welding\njoint "x" { arrow: fillet size=10\n  around\n  field }`);
    expect(svg).toContain("sx-weld-allaround");
    expect(svg).toContain("sx-weld-flag");
  });

  test("an empty diagram renders a hint rather than crashing", () => {
    const svg = renderWelding(`welding "Empty"`);
    expect(svg).toContain('data-diagram-type="welding"');
    expect(svg).toContain("Add a joint");
  });
});
