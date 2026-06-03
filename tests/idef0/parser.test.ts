import { describe, it, expect } from "vitest";
import { parseIdef0, Idef0ParseError } from "../../src/diagrams/idef0/parser";

const A0 = `
idef0 "Manufacture product"
node A0
function A1 "Plan production"
function A2 "Make parts"
function A3 "Assemble product"
input     A1 "Sales orders"
control   A1 "Production schedule"
A1 -> A2 "Work plan"
input     A2 "Raw material"
mechanism A2 "CNC machines"
A2 -> A3.control "Finished parts spec"
A2 -> A3 "Finished parts"
output    A3 "Product"
mechanism A3 "Assembly line"
`.trim();

describe("idef0 parser", () => {
  it("parses the header title and node", () => {
    const ast = parseIdef0(A0);
    expect(ast.type).toBe("idef0");
    expect(ast.title).toBe("Manufacture product");
    expect(ast.node).toBe("A0");
  });

  it("parses function boxes in declaration order", () => {
    const ast = parseIdef0(A0);
    expect(ast.boxes.map((b) => b.id)).toEqual(["A1", "A2", "A3"]);
    expect(ast.boxes[0]!.name).toBe("Plan production");
  });

  it("tags each ICOM arrow with its role", () => {
    const ast = parseIdef0(A0);
    const roles = ast.arrows.map((a) => a.role);
    expect(roles).toContain("input");
    expect(roles).toContain("control");
    expect(roles).toContain("output");
    expect(roles).toContain("mechanism");
  });

  it("routes a boundary input from frame → box", () => {
    const ast = parseIdef0(A0);
    const input = ast.arrows.find((a) => a.role === "input" && a.label === "Sales orders")!;
    expect(input.from.kind).toBe("boundary");
    expect(input.to).toEqual({ kind: "box", boxId: "A1" });
  });

  it("routes a boundary output from box → frame", () => {
    const ast = parseIdef0(A0);
    const output = ast.arrows.find((a) => a.role === "output")!;
    expect(output.from).toEqual({ kind: "box", boxId: "A3" });
    expect(output.to.kind).toBe("boundary");
  });

  it("lets a flow arrow land on a named ICOM side of the target", () => {
    const ast = parseIdef0(A0);
    const ctl = ast.arrows.find((a) => a.label === "Finished parts spec")!;
    expect(ctl.role).toBe("control");
    expect(ctl.from).toEqual({ kind: "box", boxId: "A2" });
    expect(ctl.to).toEqual({ kind: "box", boxId: "A3" });
  });

  it("defaults a bare box->box flow to the target's input", () => {
    const ast = parseIdef0(A0);
    const flow = ast.arrows.find((a) => a.label === "Work plan")!;
    expect(flow.role).toBe("input");
  });

  it("rejects missing header", () => {
    expect(() => parseIdef0("function A1 \"x\"")).toThrow(Idef0ParseError);
  });

  it("rejects a flow arrow that lands on the target's .output", () => {
    const src = `idef0\nfunction A1 "x"\nfunction A2 "y"\nA1 -> A2.output "bad"`;
    expect(() => parseIdef0(src)).toThrow(/cannot land on the target's .output/);
  });

  it("rejects an unknown ICOM side word", () => {
    const src = `idef0\nfunction A1 "x"\nfunction A2 "y"\nA1 -> A2.sideways "bad"`;
    expect(() => parseIdef0(src)).toThrow(/unknown ICOM role/);
  });

  it("parses a tunnel marker", () => {
    const src = `idef0\nfunction A1 "x"\ninput A1 "Asset" (tunnel)`;
    const ast = parseIdef0(src);
    expect(ast.arrows[0]!.tunneled).toBe(true);
  });

  it("supports CJK quotes", () => {
    const ast = parseIdef0(`idef0 「制造产品」\nfunction A1 「计划生产」`);
    expect(ast.title).toBe("制造产品");
    expect(ast.boxes[0]!.name).toBe("计划生产");
  });
});
