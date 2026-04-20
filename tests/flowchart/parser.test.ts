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

  test("parses M2 shapes: cylinder, circle, double-circle, subroutine, hexagon, asymmetric, trapezoid", () => {
    const ast = parseFlowchart(`flowchart LR
A[(DB)] --> B((Start)) --> C(((Stop)))
D[[Sub]] --> E{{Hex}} --> F>Flag]
G[/trap\\] --> H[\\trap/]`);
    const m = new Map(ast.nodes.map((n) => [n.id, n]));
    expect(m.get("A")?.shape).toBe("cylinder");
    expect(m.get("B")?.shape).toBe("circle");
    expect(m.get("C")?.shape).toBe("double-circle");
    expect(m.get("D")?.shape).toBe("subroutine");
    expect(m.get("E")?.shape).toBe("hexagon");
    expect(m.get("F")?.shape).toBe("asymmetric");
    expect(m.get("G")?.shape).toBe("trapezoid");
    expect(m.get("H")?.shape).toBe("trapezoid-alt");
  });

  test("fan-out: A & B --> C generates 2 edges", () => {
    const ast = parseFlowchart("flowchart TD\nA & B --> C");
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges[0]).toMatchObject({ from: "A", to: "C" });
    expect(ast.edges[1]).toMatchObject({ from: "B", to: "C" });
  });

  test("fan-out: A --> B & C generates 2 edges", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B & C");
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges[0]).toMatchObject({ from: "A", to: "B" });
    expect(ast.edges[1]).toMatchObject({ from: "A", to: "C" });
  });

  test("fan-out: A & B --> C & D generates 4 edges (cross-product)", () => {
    const ast = parseFlowchart("flowchart TD\nA & B --> C & D");
    expect(ast.edges).toHaveLength(4);
    const pairs = ast.edges.map((e) => `${e.from}->${e.to}`);
    expect(pairs).toContain("A->C");
    expect(pairs).toContain("A->D");
    expect(pairs).toContain("B->C");
    expect(pairs).toContain("B->D");
  });

  test("subgraph parsing: assigns children and label", () => {
    const ast = parseFlowchart(`flowchart TD
subgraph "Core"
  A --> B
end
C --> A`);
    expect(ast.subgraphs).toHaveLength(1);
    const sg = ast.subgraphs[0]!;
    expect(sg.label).toBe("Core");
    expect(sg.children).toContain("A");
    expect(sg.children).toContain("B");
    // C is outside the subgraph
    const c = ast.nodes.find((n) => n.id === "C");
    expect(c?.parent).toBeUndefined();
  });

  test("subgraph with id and bracket label: subgraph ide1 [one]", () => {
    const ast = parseFlowchart(`flowchart TD
subgraph ide1 [one]
  X --> Y
end`);
    expect(ast.subgraphs[0]?.id).toBe("ide1");
    expect(ast.subgraphs[0]?.label).toBe("one");
  });

  test("classDef stores props", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B
classDef danger fill:#d32f2f,color:#fff`);
    expect(ast.classDefs).toHaveLength(1);
    expect(ast.classDefs[0]?.id).toBe("danger");
    expect(ast.classDefs[0]?.props["fill"]).toBe("#d32f2f");
  });

  test("style statement stores per-node style", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B
style A fill:#f9f,stroke:#333`);
    const a = ast.nodes.find((n) => n.id === "A");
    expect(a?.style?.["fill"]).toBe("#f9f");
    expect(a?.style?.["stroke"]).toBe("#333");
  });
});
