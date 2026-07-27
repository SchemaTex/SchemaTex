import { describe, expect, it } from "vitest";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

const source = `evacuation "Office Escape Plan"
compliance iso
sheet a3 landscape
room office "Office" at 0,0 size 5x4
room corridor "Corridor" below office size 5x2
door between office corridor at 50% width 1
furniture sofa in office at 0.5,0.5
furniture stairs S1 in corridor at 0.2,0.2 size 1.2x1.4
here in office at 2.5,2
exit-final x1 in corridor at 5,1 side east "EXIT / مخرج"
extinguisher f1 in corridor at 0.5,1 class "ABC"
fire-door between office corridor rating "EI30"
route primary here -> corridor -> x1`;

describe("evacuation end-to-end SVG", () => {
  it("renders routes below walls, safety signs above doors, and the mandatory legend", () => {
    const svg = renderFloorplan(source);
    expect(svg).toContain('class="sx-fp sx-fp-evac"');
    expect(svg.indexOf('class="sx-fp-routes"')).toBeLessThan(
      svg.indexOf('class="sx-fp-walls"')
    );
    expect(svg.indexOf('class="sx-fp-fire-doors"')).toBeLessThan(
      svg.indexOf('class="sx-fp-safety-symbols"')
    );
    expect(svg).toContain('data-safety="here"');
    expect(svg).toContain('data-safety="exit-final"');
    expect(svg).toContain('data-code="E002"');
    expect(svg).toContain('data-door-mark="fire-door"');
    expect(svg).toContain("ESCAPE ROUTES");
    expect(svg).toContain("Final exit (E002)");
    expect(svg).toContain("Fire extinguisher (F001)");
  });

  it("hides ordinary furniture, area text, and dimensions but keeps stairs and north", () => {
    const svg = renderFloorplan(source);
    expect(svg).not.toContain('data-furniture="sofa"');
    expect(svg).toContain('data-furniture="stairs"');
    expect(svg).not.toContain('class="sx-fp-room-area"');
    expect(svg).not.toContain('class="sx-fp-dim"');
    expect(svg).toContain('class="sx-fp-compass-g"');
  });

  it("keeps the default north compass inside the evacuation canvas", () => {
    const svg = renderFloorplan(`evacuation "Wide office"
room office at 0,0 size 6x5
room lobby below office size 6x2
room west left-of lobby size 3x2
room east right-of lobby size 3x2
opening between office lobby at 50%
opening between lobby west at 50%
opening between lobby east at 50%
here in office at 2,2
exit-final xw in west at 0,1 side west
exit-final xe in east at 3,1 side east
route primary here -> office -> lobby -> east -> xe
route secondary here -> office -> lobby -> west -> xw`);
    const width = Number(svg.match(/viewBox="0 0 ([\d.]+)/)?.[1]);
    const compass = svg.match(
      /<circle class="sx-fp-compass" cx="([\d.]+)" cy="[\d.]+" r="([\d.]+)"/
    );
    expect(compass).not.toBeNull();
    expect(Number(compass?.[1]) + Number(compass?.[2])).toBeLessThanOrEqual(width);
  });

  it("renders the compliance note and an evacuation-specific accessible description", () => {
    const svg = renderFloorplan(source);
    expect(svg).toContain("Scale 1:50 on A3 (landscape)");
    expect(svg).toContain(
      "<desc>2 rooms, 1 escape route, ISO 23601 profile."
    );
  });

  it("keeps Latin and Arabic label runs separate for bilingual plans", () => {
    const svg = renderFloorplan(source.replace("compliance iso", "compliance uae"));
    expect(svg).toContain(">EXIT</text>");
    expect(svg).toContain('direction="rtl" unicode-bidi="plaintext">مخرج</text>');
  });

  it("re-enables furniture only when explicitly requested", () => {
    const svg = renderFloorplan(`${source}\nshow furniture`);
    expect(svg).toContain('data-furniture="sofa"');
  });
});
