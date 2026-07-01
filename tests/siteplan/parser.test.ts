import { describe, expect, it } from "vitest";
import { parseSiteplan } from "../../src/diagrams/siteplan/parser";

describe("siteplan parser", () => {
  it("parses a listing-grade parcel sketch", () => {
    const ast = parseSiteplan(`siteplan "Residential Listing Site Plan" unit ft
parcel lot "Lot 12" points 0,0 62,0 58,96 8,104 -4,42
road maple "Maple Ave" from -12,0 to 74,0 width 22
frontage front "Road frontage" from 0,0 to 62,0
setback frontSetback "Front setback" from 5,8 to 57,8
easement util "Utility easement" from 48,0 to 43,96
structure house "Residence" points 15,28 45,28 45,64 34,64 34,78 15,78
driveway drive "Driveway" points 52,0 52,32 width 10
tree oak at 9,22 size 8 "Oak"
car car1 at 52,14 size 15 rotate 0
dim "62 ft frontage" from 0,-7 to 62,-7
callout "Covered patio" at 20,90 to 22,76
north
scale 20
legend on`);
    expect(ast.title).toBe("Residential Listing Site Plan");
    expect(ast.unit).toBe("ft");
    expect(ast.polygons).toHaveLength(2);
    expect(ast.paths).toHaveLength(2);
    expect(ast.lines.map((l) => l.role)).toEqual(["frontage", "setback", "easement"]);
    expect(ast.markers.map((m) => m.kind)).toEqual(["tree", "car"]);
    expect(ast.callouts[0]!.label).toBe("Covered patio");
  });

  it("accepts header aliases", () => {
    expect(parseSiteplan(`plotplan "A"\nparcel lot points 0,0 1,0 1,1`).type).toBe("siteplan");
    expect(parseSiteplan(`parcelmap "A"\nparcel lot points 0,0 1,0 1,1`).type).toBe("siteplan");
  });
});
