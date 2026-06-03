import { describe, test, expect } from "vitest";
import { parseEntityDSL } from "../../src/diagrams/entity/parser";

// Every entity diagram needs at least one entity, so each fixture declares a few
// that the clusters can reference.
const HEADER =
  'entity-structure "Test"\n' +
  'entity a "A Co" corp\n' +
  'entity b "B Co" corp\n' +
  'entity c "C Co" corp\n';

describe("entity cluster parsing", () => {
  test("cluster with no attributes parses to an empty member list", () => {
    const ast = parseEntityDSL(`${HEADER}cluster "Group A"`);
    expect(ast.clusters).toHaveLength(1);
    expect(ast.clusters[0].label).toBe("Group A");
    expect(ast.clusters[0].members).toEqual([]);
  });

  // Regression: the attribute-block regex used `[^\]]*`, which stopped at the
  // first `]` inside `members: [...]` and failed the whole line. This is the
  // root cause of the ChatDiagram entity-DSL hang (chat 9b5d39e5).
  test("cluster with bracketed members list parses", () => {
    const ast = parseEntityDSL(`${HEADER}cluster "Group A" [members: [a, b, c]]`);
    expect(ast.clusters).toHaveLength(1);
    expect(ast.clusters[0].members).toEqual(["a", "b", "c"]);
  });

  test("cluster with members + color (grammar canonical form) parses", () => {
    const ast = parseEntityDSL(
      `${HEADER}cluster "Ireland" [members: [a, b], color: "#059669"]`
    );
    expect(ast.clusters[0].members).toEqual(["a", "b"]);
    expect(ast.clusters[0].color).toBe("#059669");
  });

  test("cluster with color only (no members) parses", () => {
    const ast = parseEntityDSL(`${HEADER}cluster "Group A" [color: "#abc"]`);
    expect(ast.clusters[0].members).toEqual([]);
    expect(ast.clusters[0].color).toBe("#abc");
  });

  test("cluster members render a grouping box end-to-end", async () => {
    const { render } = await import("../../src/core/api");
    const svg = render(
      `${HEADER}cluster "Group A" [members: [a, b], color: "#059669"]\na -> b : 100%`
    );
    expect(svg.includes("lt-entity-cluster")).toBe(true);
    expect(svg.includes("Group A")).toBe(true);
  });
});
