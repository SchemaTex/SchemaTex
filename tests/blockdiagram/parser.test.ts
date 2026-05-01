import { describe, test, expect } from "vitest";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";

describe("blockdiagram parser", () => {
  describe("standard form", () => {
    test("parses ID = block(\"label\") declarations + chain", () => {
      const ast = parseBlockDiagram(`blockdiagram "X"
A = block("Alpha")
B = block("Beta")
A -> B`);
      expect(ast.blocks).toHaveLength(2);
      expect(ast.connections).toHaveLength(1);
      expect(ast.connections[0]).toMatchObject({ from: "A", to: "B" });
    });

    test("trailing [label] still works after fix", () => {
      // Real trailing attrs must be preceded by whitespace at top level.
      const ast = parseBlockDiagram(`blockdiagram "X"
A = block("Alpha")
B = block("Beta")
A -> B ["signal label"]`);
      expect(ast.connections[0].label).toBe("signal label");
    });
  });

  // ─── Case F: inline [id] -> [id] auto-declares blocks ──────────
  describe("inline [id] auto-declare (Case F)", () => {
    test("[A] -> [B] auto-declares both blocks", () => {
      const ast = parseBlockDiagram(`blockdiagram "X"
[AuthN] -> [SessionAPI]`);
      const ids = ast.blocks.map((b) => b.id).sort();
      expect(ids).toEqual(["AuthN", "SessionAPI"]);
      expect(ast.connections).toHaveLength(1);
      expect(ast.connections[0]).toMatchObject({ from: "AuthN", to: "SessionAPI" });
    });

    test("[A] -> [B] does NOT trip the trailing-attrs greedy match", () => {
      // This was the original bug: leading `[` was eaten by the trailing-`]`
      // attribute parser, body became "" and parser threw "Invalid connection".
      expect(() =>
        parseBlockDiagram(`blockdiagram "X"
[AuthN] -> [SessionAPI]`)
      ).not.toThrow();
    });

    test("inline chain with trailing attrs still parses both correctly", () => {
      const ast = parseBlockDiagram(`blockdiagram "X"
[Karpenter] -> [K8sCluster] ["Scales Nodes"]`);
      expect(ast.blocks.map((b) => b.id).sort()).toEqual(["K8sCluster", "Karpenter"]);
      expect(ast.connections).toHaveLength(1);
      expect(ast.connections[0].label).toBe("Scales Nodes");
    });

    test("mixed declared + inline: previously declared blocks are reused", () => {
      const ast = parseBlockDiagram(`blockdiagram "X"
A = block("Alpha label")
A -> [B]`);
      const a = ast.blocks.find((b) => b.id === "A");
      const b = ast.blocks.find((b) => b.id === "B");
      expect(a?.label).toBe("Alpha label"); // preserved, not overwritten
      expect(b?.label).toBe("B"); // inline gets id-as-label by default
      expect(ast.connections[0]).toMatchObject({ from: "A", to: "B" });
    });
  });
});
