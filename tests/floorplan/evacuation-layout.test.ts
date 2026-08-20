import { describe, expect, it } from "vitest";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";

const officePlan = `evacuation "Office"
compliance iso
sheet a3 landscape
room office at 0,0 size 4x4
room corridor below office size 4x2
opening between office corridor at 50% width 1
here in office at 1,1
exit-final x1 in corridor at 3.8,1 side east
route primary here -> corridor -> x1`;

describe("evacuation layout — signs and route geometry", () => {
  it("converts fixed printed millimetres to a real-world footprint", () => {
    const lay = layoutFloorplan(parseFloorplan(officePlan));
    expect(lay.evacuation?.scale.denominator).toBe(50);
    expect(lay.evacuation?.symbols[0]).toMatchObject({
      id: "here",
      x: 1,
      y: 1,
      sheetMm: 8,
      sizeM: 0.4,
    });
    expect(lay.evacuation?.symbols[1]).toMatchObject({
      id: "x1",
      x: 4,
      y: 5,
    });
  });

  it("builds deterministic orthogonal points through the shared opening", () => {
    const lay = layoutFloorplan(parseFloorplan(officePlan));
    expect(lay.evacuation?.routes[0]?.points).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(lay.evacuation?.routes[0]?.chevrons[0]).toEqual({
      x: 1,
      y: 3,
      deg: 90,
    });
  });

  it("points chevrons forward through several authored waypoints", () => {
    const lay = layoutFloorplan(
      parseFloorplan(`evacuation
room a at 0,0 size 4x4
room b right-of a size 4x4
room c below b size 4x4
opening between a b at 50% width 1
opening between b c at 50% width 1
here in a at 1,2
exit-final x1 in c at 3,4 side south
route primary here -> a -> b -> c -> x1`)
    );
    const degrees = lay.evacuation?.routes[0]?.chevrons.map(({ deg }) => deg);
    expect(degrees).toEqual([0, 0, 90, 90, 90]);
  });

  it("derives a legend from used routes and symbols only", () => {
    const lay = layoutFloorplan(parseFloorplan(officePlan));
    const keys = lay.evacuation?.legend.items.map(({ key }) => key);
    expect(keys).toEqual(["route.primary", "here", "exit-final"]);
    expect(keys).not.toContain("route.secondary");
    expect(keys).not.toContain("assembly");
    expect(keys).not.toContain("extinguisher");
  });

  it("reports a standard-cited error for a non-adjacent route hop", () => {
    const lay = layoutFloorplan(
      parseFloorplan(`evacuation
room a at 0,0 size 3x3
room b at 8,0 size 3x3
here in a at 1,1
exit-final x1 in b at 2,1
route primary here -> b -> x1`)
    );
    expect(lay.errors).toEqual([
      expect.stringMatching(
        /route primary.*"a".*"b".*share no opening.*ISO 23601 §6/
      ),
    ]);
  });

  it("uses one computed scale for all floor plates", () => {
    const lay = layoutFloorplan(
      parseFloorplan(`evacuation "Two floors"
sheet a3 landscape
floor 0 "Ground"
room g at 0,0 size 4x4
here h0 in g at 1,1
exit-final x0 in g at 4,2 side east
route primary h0 -> x0
floor 1 "Upper"
room u at 0,0 size 8x6
here h1 in u at 1,1
exit-final x1 in u at 8,3 side east
route primary h1 -> x1`)
    );
    expect(lay.evacuation?.scale.denominator).toBe(50);
    expect(new Set(lay.evacuation?.symbols.map((symbol) => symbol.sizeM))).toEqual(
      new Set([0.4])
    );
  });
});
