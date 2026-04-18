import { describe, test, expect } from "vitest";
import { parseFlowchart } from "../../src/diagrams/flowchart/parser";

describe("flowchart parser", () => {
  test("parses header direction", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B");
    expect(ast.direction).toBe("TB");
    expect(ast.nodes).toHaveLength(2);
    expect(ast.edges).toHaveLength(1);
  });

  test("accepts 'graph' alias", () => {
    const ast = parseFlowchart("graph LR\nA --> B");
    expect(ast.direction).toBe("LR");
  });

  test("parses all 5 M1 shapes", () => {
    const ast = parseFlowchart(`flowchart LR
S([Start]) --> P[Process] --> D{Decision}
D --> I[/Input/] --> R(Round)`);
    const byId = new Map(ast.nodes.map((n) => [n.id, n]));
    expect(byId.get("S")?.shape).toBe("stadium");
    expect(byId.get("P")?.shape).toBe("rect");
    expect(byId.get("D")?.shape).toBe("diamond");
    expect(byId.get("I")?.shape).toBe("parallelogram");
    expect(byId.get("R")?.shape).toBe("round");
    expect(byId.get("S")?.label).toBe("Start");
  });

  test("parses chain with multiple edges", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C --> D");
    expect(ast.nodes.map((n) => n.id)).toEqual(["A", "B", "C", "D"]);
    expect(ast.edges).toHaveLength(3);
    expect(ast.edges[0]).toMatchObject({ from: "A", to: "B", kind: "solid" });
  });

  test("parses pipe-label edges", () => {
    const ast = parseFlowchart(`flowchart TD
A{Valid?} -->|yes| B[Save]
A -->|no| C[Reject]`);
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges[0]?.label).toBe("yes");
    expect(ast.edges[1]?.label).toBe("no");
  });

  test("parses inline-label edges", () => {
    const ast = parseFlowchart("flowchart TD\nA -- hello --> B");
    expect(ast.edges[0]?.label).toBe("hello");
    expect(ast.edges[0]?.kind).toBe("solid");
  });

  test("parses edge kinds", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B
B --- C
C -.-> D
D ==> E
E --x F
F --o G`);
    expect(ast.edges.map((e) => e.kind)).toEqual([
      "solid",
      "none",
      "dotted",
      "thick",
      "crossed",
      "round-end",
    ]);
  });

  test("ignores comments and blank lines", () => {
    const ast = parseFlowchart(`
%% header comment
flowchart TD

%% mid comment
A --> B

`);
    expect(ast.nodes).toHaveLength(2);
  });

  test("handles cycle in input without error", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C --> A");
    expect(ast.nodes).toHaveLength(3);
    expect(ast.edges).toHaveLength(3);
  });

  test("throws on bad header", () => {
    expect(() => parseFlowchart("not-a-header\nA --> B")).toThrow();
  });
});
