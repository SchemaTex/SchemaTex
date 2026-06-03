import { describe, expect, it } from "vitest";
import { parseEpc } from "../../src/diagrams/epc/parser";
import { layoutEpc, EPC_CONST as C } from "../../src/diagrams/epc/layout";

describe("epc layout", () => {
  it("layers an alternating chain top-to-bottom", () => {
    const l = layoutEpc(parseEpc(`epc
  event E1 "Order received"
  function F1 "Check credit"
  event E2 "Credit checked"
  E1 -> F1 -> E2`));
    const byId = new Map(l.nodes.map((n) => [n.node.id, n] as const));
    expect(byId.get("E1")!.layer).toBe(0);
    expect(byId.get("F1")!.layer).toBe(1);
    expect(byId.get("E2")!.layer).toBe(2);
    // Strictly increasing y (tb).
    expect(byId.get("F1")!.cy).toBeGreaterThan(byId.get("E1")!.cy);
    expect(byId.get("E2")!.cy).toBeGreaterThan(byId.get("F1")!.cy);
  });

  it("is deterministic — same input, identical geometry", () => {
    const dsl = `epc
  event E1
  function F1
  xor X1
  event E2
  event E3
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3`;
    const a = layoutEpc(parseEpc(dsl));
    const b = layoutEpc(parseEpc(dsl));
    expect(JSON.stringify(a.nodes.map((n) => [n.cx, n.cy])))
      .toEqual(JSON.stringify(b.nodes.map((n) => [n.cx, n.cy])));
  });

  it("places split branches side-by-side on a deeper rank", () => {
    const l = layoutEpc(parseEpc(`epc
  event E1
  function F1
  xor X1
  event E2
  event E3
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3`));
    const byId = new Map(l.nodes.map((n) => [n.node.id, n] as const));
    const e2 = byId.get("E2")!;
    const e3 = byId.get("E3")!;
    expect(e2.layer).toBe(e3.layer); // same rank
    expect(Math.abs(e2.cy - e3.cy)).toBeLessThan(1); // same y band
    expect(e2.cx).not.toEqual(e3.cx); // spread horizontally
  });

  it("sizes connectors as circles and functions wider than events high", () => {
    const l = layoutEpc(parseEpc(`epc
  event E1
  function F1
  and A1
  E1 -> F1 -> A1`));
    const byId = new Map(l.nodes.map((n) => [n.node.id, n] as const));
    expect(byId.get("A1")!.width).toBe(C.CONN_R * 2);
    expect(byId.get("F1")!.height).toBe(C.FUNC_H);
    expect(byId.get("E1")!.height).toBe(C.EVENT_H);
  });

  it("routes a loop-back as a back-edge around the margin", () => {
    const l = layoutEpc(parseEpc(`epc
  event E1 "Start"
  function F1 "Edit"
  event E2 "Reviewed"
  function F2 "Rework"
  event E3 "Approved"
  E1 -> F1 -> E2
  E2 -> F2
  F2 -> F1
  E2 -> E3`));
    const back = l.edges.find((e) => e.edge.from === "F2" && e.edge.to === "F1");
    expect(back?.backEdge).toBe(true);
  });

  it("transposes to left-right under layout: lr", () => {
    const l = layoutEpc(parseEpc(`epc
  layout: lr
  event E1
  function F1
  event E2
  E1 -> F1 -> E2`));
    const byId = new Map(l.nodes.map((n) => [n.node.id, n] as const));
    expect(byId.get("F1")!.cx).toBeGreaterThan(byId.get("E1")!.cx);
    expect(byId.get("E2")!.cx).toBeGreaterThan(byId.get("F1")!.cx);
  });
});
