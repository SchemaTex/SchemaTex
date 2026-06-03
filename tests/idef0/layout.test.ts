import { describe, it, expect } from "vitest";
import { parseIdef0 } from "../../src/diagrams/idef0/parser";
import { layoutIdef0, IDEF0_CONST as C } from "../../src/diagrams/idef0/layout";

const SRC = `
idef0 "Manufacture"
function A1 "Plan"
function A2 "Make"
function A3 "Assemble"
input     A1 "Orders"
control   A1 "Schedule"
A1 -> A2 "Plan"
mechanism A2 "Machines"
A2 -> A3.control "Spec"
output    A3 "Product"
mechanism A3 "Line"
`.trim();

describe("idef0 layout — diagonal staircase + ICOM sides", () => {
  it("steps boxes upper-left → lower-right", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const [b1, b2, b3] = layout.boxes;
    expect(b2!.x).toBeGreaterThan(b1!.x);
    expect(b2!.y).toBeGreaterThan(b1!.y);
    expect(b3!.x).toBeGreaterThan(b2!.x);
    expect(b3!.y).toBeGreaterThan(b2!.y);
    // exact staircase step
    expect(b2!.x - b1!.x).toBe(C.STEP_X);
    expect(b2!.y - b1!.y).toBe(C.STEP_Y);
  });

  it("a control arrow head points DOWN into the top edge", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const ctl = layout.arrows.find((a) => a.arrow.role === "control" && a.arrow.label === "Schedule")!;
    expect(ctl.head.dir).toBe("top");
    // head x is centred on the box top edge
    const b1 = layout.boxes[0]!;
    expect(ctl.head.x).toBe(b1.x + b1.width / 2);
    expect(ctl.head.y).toBe(b1.y); // lands exactly on the top edge
  });

  it("an input arrow head points RIGHT into the left edge", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const inp = layout.arrows.find((a) => a.arrow.role === "input" && a.arrow.label === "Orders")!;
    expect(inp.head.dir).toBe("left");
    const b1 = layout.boxes[0]!;
    expect(inp.head.x).toBe(b1.x); // left edge
    expect(inp.head.y).toBe(b1.y + b1.height / 2);
  });

  it("a mechanism arrow head points UP into the bottom edge", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const m = layout.arrows.find((a) => a.arrow.role === "mechanism" && a.arrow.label === "Machines")!;
    expect(m.head.dir).toBe("bottom");
    const b2 = layout.boxes[1]!;
    expect(m.head.x).toBe(b2.x + b2.width / 2);
    expect(m.head.y).toBe(b2.y + b2.height); // bottom edge
  });

  it("an output arrow exits the RIGHT edge and points right", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const o = layout.arrows.find((a) => a.arrow.role === "output" && a.arrow.label === "Product")!;
    expect(o.head.dir).toBe("right");
    const b3 = layout.boxes[2]!;
    // head sits to the right of the box right edge (stub)
    expect(o.head.x).toBeGreaterThan(b3.x + b3.width);
  });

  it("a forward flow lands on the target's control top edge", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    const spec = layout.arrows.find((a) => a.arrow.label === "Spec")!;
    expect(spec.head.dir).toBe("top");
    const b3 = layout.boxes[2]!;
    expect(spec.head.x).toBe(b3.x + b3.width / 2);
    expect(spec.head.y).toBe(b3.y);
  });

  it("routes a back-reference (feedback) through the margin", () => {
    const src = `idef0\nfunction A1 "a"\nfunction A2 "b"\nfunction A3 "c"\nA3 -> A1.control "Feedback"`;
    const layout = layoutIdef0(parseIdef0(src));
    const fb = layout.arrows.find((a) => a.arrow.label === "Feedback")!;
    expect(fb.margin).toBe(true);
    expect(fb.head.dir).toBe("top");
  });

  it("canvas grows with the staircase", () => {
    const layout = layoutIdef0(parseIdef0(SRC));
    expect(layout.width).toBeGreaterThan(C.BOX_W + 2 * C.MARGIN);
    expect(layout.height).toBeGreaterThan(C.BOX_H + 2 * C.MARGIN);
  });
});
