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

  // ─── Track A Unit 4: non-date row keys (ordinal mode) ────────
  describe("ordinal row keys", () => {
    test("non-date row key does not throw", () => {
      expect(() => {
        parseTimeline(`timeline "Roadmap"
Phase 1 : "Discovery"
Phase 2 : "Design"
Phase 3 : "Build"`);
      }).not.toThrow();
    });

    test("ordinal keys preserve raw label and assign sequential values", () => {
      const ast = parseTimeline(`timeline
Phase 1 : "Discovery"
Phase 2 : "Design"
Phase 3 : "Build"`);
      expect(ast.events).toHaveLength(3);
      expect(ast.events[0]!.start.precision).toBe("ordinal");
      expect(ast.events[0]!.start.raw).toBe("Phase 1");
      expect(ast.events[1]!.start.raw).toBe("Phase 2");
      // Values are sequential so layout can still sort them.
      expect(ast.events[1]!.start.value).toBeGreaterThan(ast.events[0]!.start.value);
      expect(ast.events[2]!.start.value).toBeGreaterThan(ast.events[1]!.start.value);
    });

    test("multiple colons: only first separates key from body", () => {
      const ast = parseTimeline(`timeline
14:30 : "Standup : daily team meeting"`);
      expect(ast.events).toHaveLength(1);
      // Key was "14:30" which is not a valid date → ordinal mode preserving it.
      expect(ast.events[0]!.start.precision).toBe("ordinal");
      expect(ast.events[0]!.start.raw).toBe("14:30");
      // Body kept the second colon intact.
      expect(ast.events[0]!.label).toBe("Standup : daily team meeting");
    });

    test("mixing date and ordinal keys: both kinds parse", () => {
      const ast = parseTimeline(`timeline "Mixed"
2024 : "Real year"
Phase X : "Ordinal label"
2025 : "Another real year"`);
      expect(ast.events).toHaveLength(3);
      expect(ast.events[0]!.start.precision).toBe("year");
      expect(ast.events[1]!.start.precision).toBe("ordinal");
      expect(ast.events[2]!.start.precision).toBe("year");
    });

    test("ordinal keys inside a section/track work", () => {
      const ast = parseTimeline(`timeline
section "Project Phases"
  Phase 1 : "Discovery"
  Phase 2 : "Design"`);
      expect(ast.tracks).toHaveLength(1);
      expect(ast.events).toHaveLength(2);
      expect(ast.events[0]!.start.precision).toBe("ordinal");
      expect(ast.events[0]!.trackId).toBe(ast.tracks[0]!.id);
    });
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
