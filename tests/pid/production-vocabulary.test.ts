import { describe, expect, it } from "vitest";
import { renderResult } from "../../src/core/api";
import { parsePid } from "../../src/diagrams/pid/parser";

const FIXTURES = [
  "equip B-101 : boiler [tag: \"Package Boiler\"]",
  "equip BR-101 : burner [tag: \"Natural Gas Burner\"]",
  "equip G-101 : generator [tag: \"Standby Generator\"]",
] as const;

describe("P&ID production equipment vocabulary", () => {
  for (const line of FIXTURES) {
    const type = line.match(/:\s+(\w+)/)?.[1] ?? line;
    it(`renders ${type} as known equipment`, () => {
      const source = `pid "Utilities"\n${line}`;
      const ast = parsePid(source);
      expect(ast.equipment[0]?.equipType).toBe(type);
      expect(ast.equipment[0]?.rawType).toBeUndefined();

      const result = renderResult(source, { type: "pid" });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.svg).not.toContain("data-raw-type");
    });
  }

  it("renders a boiler and burner train together", () => {
    const result = renderResult(`pid "Steam plant"
equip BR-1 : burner [tag: "Gas Burner"]
equip B-1 : boiler [tag: "Boiler"]
equip G-1 : generator [tag: "Generator"]
line fuel from BR-1.flame to B-1.fuel [type: process_minor]
line steam from B-1.steam to G-1.in [type: process]`, { type: "pid" });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("valid");
  });
});
