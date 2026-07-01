import { describe, expect, it } from "vitest";
import { layoutSiteplan } from "../../src/diagrams/siteplan/layout";
import { parseSiteplan } from "../../src/diagrams/siteplan/parser";

describe("siteplan layout", () => {
  it("computes bounds across polygons, roads, markers, dimensions, and callouts", () => {
    const lay = layoutSiteplan(parseSiteplan(`siteplan "Bounds" unit ft
parcel lot points 0,0 60,0 60,100 0,100
road main from -10,0 to 70,0 width 20
tree t1 at 10,90 size 8
dim "60 ft" from 0,-8 to 60,-8
callout "Patio" at 72,90 to 55,80`));
    expect(lay.bounds.minX).toBeLessThanOrEqual(-20);
    expect(lay.bounds.minY).toBeLessThanOrEqual(-10);
    expect(lay.bounds.maxX).toBeGreaterThanOrEqual(80);
    expect(lay.bounds.maxY).toBeGreaterThanOrEqual(100);
  });

  it("builds a compact legend from used roles", () => {
    const lay = layoutSiteplan(parseSiteplan(`siteplan
parcel lot points 0,0 20,0 20,20
structure house points 2,2 8,2 8,8
road main from -5,0 to 25,0
setback front from 2,4 to 18,4
tree t at 10,10`));
    expect(lay.legendItems.map((x) => x.key)).toEqual(["parcel", "structure", "road", "setback", "tree"]);
  });
});
