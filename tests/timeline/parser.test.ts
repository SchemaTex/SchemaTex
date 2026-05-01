import { describe, test, expect } from "vitest";
import { parseTimeline } from "../../src/diagrams/timeline/parser";

describe("timeline parser", () => {
  test("basic event line works", () => {
    const ast = parseTimeline(`timeline "Test"
1929 : "Eliezer born"
1985 : "Roni born"`);
    expect(ast.title).toBe("Test");
    expect(ast.events).toHaveLength(2);
    expect(ast.events[0]?.label).toBe("Eliezer born");
  });

  test("track keyword groups events", () => {
    const ast = parseTimeline(`timeline
track "Generation 1":
  1929 : "Eliezer"
  1931 : "Sabina"`);
    expect(ast.tracks).toHaveLength(1);
    expect(ast.tracks[0]?.label).toBe("Generation 1");
  });

  // ─── Case E: section keyword (Mermaid-compatible) ─────────────
  describe("section keyword (Case E)", () => {
    test("section with quoted name acts like a track", () => {
      const ast = parseTimeline(`timeline "Family"
section "Grandparents"
  1929 : "Eliezer"
  1931 : "Sabina"
section "Parents"
  1956 : "Michal"
  1961 : "Kobi"`);
      expect(ast.tracks).toHaveLength(2);
      expect(ast.tracks.map((t) => t.label)).toEqual(["Grandparents", "Parents"]);
      expect(ast.events).toHaveLength(4);
      // First two events go to Grandparents, last two to Parents
      const grandparents = ast.events.filter((e) => e.trackId === ast.tracks[0]!.id);
      const parents = ast.events.filter((e) => e.trackId === ast.tracks[1]!.id);
      expect(grandparents).toHaveLength(2);
      expect(parents).toHaveLength(2);
    });

    test("section with unquoted name (Mermaid-style) also works", () => {
      const ast = parseTimeline(`timeline
section Acto I
  10 : "Escena 1"
  20 : "Escena 2"
section Acto II
  30 : "Escena 3"`);
      expect(ast.tracks).toHaveLength(2);
      expect(ast.tracks[0]?.label).toBe("Acto I");
      expect(ast.tracks[1]?.label).toBe("Acto II");
    });

    test("section without colon (Mermaid-style)", () => {
      // Mermaid timeline writes `section Foo` without trailing colon
      const ast = parseTimeline(`timeline
section Phase 1
  100 : "Start"`);
      expect(ast.tracks).toHaveLength(1);
      expect(ast.tracks[0]?.label).toBe("Phase 1");
    });
  });
});
