import { describe, expect, it } from "vitest";
import { render, renderResult } from "../../src/core/api";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";

const CASES = [
  {
    name: "sink 0.05 m outside bathroom",
    source: `floorplan "Bathroom"
room bathroom at 0,0 size 1x1
furniture sink in bathroom at 0.5,0.2`,
    position: { x: 0.5, y: 0.2 },
    message: 'furniture sink #1 extends 0.05 m outside room "bathroom" — move it or shrink size',
  },
  {
    name: "loading dock 2.8 m outside shipping",
    source: `floorplan "Shipping"
room shipping at 0,0 size 4x4
furniture loading-dock in shipping at 3.8,1`,
    position: { x: 3.8, y: 1 },
    message: 'furniture loading-dock #1 extends 2.8 m outside room "shipping" — move it or shrink size',
  },
  {
    name: "round table 0.23 m outside hall",
    source: `floorplan "Hall"
room hall at 0,0 size 5x5
furniture round-table-10 in hall at 2.5,1`,
    position: { x: 2.5, y: 1 },
    message: 'furniture round-table-10 #1 extends 0.23 m outside room "hall" — move it or shrink size',
  },
] as const;

describe("floorplan out-of-bounds furniture policy", () => {
  for (const fixture of CASES) {
    it(`${fixture.name} renders with an attached warning and unchanged coordinates`, () => {
      const result = renderResult(fixture.source, { type: "floorplan" });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("partial");
      expect(result.diagnostics).toMatchObject([
        {
          severity: "warning",
          code: "floorplan/item-outside-room",
          message: fixture.message,
        },
      ]);
      expect(result.svg).toContain("<svg");
      expect(() => render(fixture.source, { type: "floorplan" })).not.toThrow();

      const item = layoutFloorplan(parseFloorplan(fixture.source)).items[0];
      expect(item).toMatchObject(fixture.position);
    });
  }

  it("keeps a fully valid plan warning-free", () => {
    const result = renderResult(`floorplan "Valid"
room bathroom at 0,0 size 2x2
furniture sink in bathroom at 0.5,0.2`, { type: "floorplan" });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("valid");
    expect(result.diagnostics).toEqual([]);
  });
});
