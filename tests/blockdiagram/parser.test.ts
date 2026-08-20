import { describe, test, expect } from "vitest";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { renderResult } from "../../src/core/api";

describe("blockdiagram parser", () => {
  describe("soft decorative vocabulary", () => {
    test("input and output are first-class roles", () => {
      const ast = parseBlockDiagram(`blockdiagram
input_block = block("Input") [role: input]
output_block = block("Output") [role: output]
input_block -> output_block`);
      expect(ast.blocks.map((block) => block.role)).toEqual(["input", "output"]);
      expect(ast.warnings).toBeUndefined();
    });

    test.each(["power source", "audio source", "signal amplifier"])(
      "unknown role %s falls back to generic with a structured warning",
      (role) => {
        const result = renderResult(`blockdiagram
A = block("Source") [role: ${role}]`);
        expect(result.ok).toBe(true);
        expect(result.status).toBe("partial");
        expect(result.svg).toContain('data-block-role="generic"');
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({
            code: "blockdiagram/unknown-role",
            token: role,
            line: 2,
          })
        );
      }
    );

    test("unknown connection styling attributes are ignored with a warning", () => {
      const result = renderResult(`blockdiagram
A = block("A")
B = block("B")
A -> B [route: above]`);
      expect(result.ok).toBe(true);
      expect(result.svg).toContain('data-from="A"');
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "blockdiagram/unknown-connection-attribute",
          token: "route",
          line: 4,
        })
      );
    });

    test("malformed attributes and undeclared endpoints remain fatal", () => {
      expect(() => parseBlockDiagram(`blockdiagram
A = block("A") [role plant]`)).toThrow(/invalid block attribute/);
      expect(() => parseBlockDiagram(`blockdiagram
A = block("A")
A -> Missing`)).toThrow(/undeclared endpoint/);
    });
  });

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
