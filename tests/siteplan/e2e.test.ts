import { describe, expect, it } from "vitest";
import { renderSiteplan } from "../../src/diagrams/siteplan/renderer";

describe("siteplan e2e", () => {
  it("renders semantic SVG for the residential listing example", () => {
    const svg = renderSiteplan(`siteplan "Residential Listing Site Plan" unit ft
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
    expect(svg).toContain("<title>");
    expect(svg).toContain("Residential Listing Site Plan");
    expect(svg).toContain('data-polygon="lot"');
    expect(svg).toContain('data-path="maple"');
    expect(svg).toContain("sx-sp-setback");
    expect(svg).toContain("Covered patio");
    expect(svg).not.toContain("style=");
  });

  it("renders commercial driveway paving with lane markings and arrows", () => {
    const svg = renderSiteplan(`siteplan "Driveway markings" unit ft
parcel lot points 0,0 120,0 120,80 0,80
driveway aisle points 12,12 92,12 104,48 width 16
parking lot points 16,28 98,28 104,66 20,66
legend off`);
    expect(svg).toContain("sx-sp-driveway-edge");
    expect(svg).toContain("sx-sp-driveway-mark");
    expect(svg).toContain("sx-sp-driveway-arrow");
    expect(svg).toContain("url(#sx-sp-parking-hatch)");
  });
});
