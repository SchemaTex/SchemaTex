import { describe, expect, it } from "vitest";
import { parseEpc, EpcParseError } from "../../src/diagrams/epc/parser";
import type { EpcConnector } from "../../src/diagrams/epc/types";

describe("epc parser", () => {
  it("parses header title and layout directive", () => {
    const ast = parseEpc(`epc "Order fulfilment"
  layout: tb
  event E1 "Order received"`);
    expect(ast.type).toBe("epc");
    expect(ast.title).toBe("Order fulfilment");
    expect(ast.direction).toBe("tb");
  });

  it("declares events, functions and connectors", () => {
    const ast = parseEpc(`epc
  event E1 "Order received"
  function F1 "Check credit"
  xor X1`);
    const kinds = ast.nodes.map((n) => n.kind);
    expect(kinds).toEqual(["event", "function", "connector"]);
    const conn = ast.nodes[2] as EpcConnector;
    expect(conn.operator).toBe("xor");
    expect(ast.nodes[0]!.label).toBe("Order received");
  });

  it("accepts the 'func' alias", () => {
    const ast = parseEpc(`epc
  func F1 "Do it"`);
    expect(ast.nodes[0]!.kind).toBe("function");
  });

  it("expands a -> chain into pairwise edges", () => {
    const ast = parseEpc(`epc
  event E1
  function F1
  event E2
  E1 -> F1 -> E2`);
    expect(ast.edges.map((e) => [e.from, e.to])).toEqual([
      ["E1", "F1"],
      ["F1", "E2"],
    ]);
  });

  it("auto-creates undeclared edge endpoints (flagged later)", () => {
    const ast = parseEpc(`epc
  event E1
  E1 -> F9`);
    const f9 = ast.nodes.find((n) => n.id === "F9");
    expect(f9?.autoCreated).toBe(true);
  });

  it("attaches a label to a single arc via ': label'", () => {
    const ast = parseEpc(`epc
  event E1
  function F1
  E1 -> F1 : start now`);
    expect(ast.edges[0]!.label).toBe("start now");
  });

  it("supports CJK quotes in labels", () => {
    const ast = parseEpc(`epc
  event E1 「订单已收到」`);
    expect(ast.nodes[0]!.label).toBe("订单已收到");
  });

  it("ignores # and // comments", () => {
    const ast = parseEpc(`epc   # title comment
  event E1 "Got order"  // trailing
  # whole line`);
    expect(ast.nodes).toHaveLength(1);
    expect(ast.nodes[0]!.label).toBe("Got order");
  });

  it("throws a typed error on a bad declaration id", () => {
    expect(() => parseEpc(`epc
  event 9bad`)).toThrow(EpcParseError);
  });

  it("warns on a redeclared node but keeps the first", () => {
    const ast = parseEpc(`epc
  event E1 "first"
  event E1 "second"`);
    expect(ast.nodes).toHaveLength(1);
    expect(ast.nodes[0]!.label).toBe("first");
    expect(ast.warnings.join(" ")).toMatch(/redeclared/);
  });
});
