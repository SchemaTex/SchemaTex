import { describe, expect, it } from "vitest";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

const twoRoutePlan = `evacuation "Compliant branch plan"
compliance iso
sheet a3 landscape
room start at 0,0 size 4x4
room hub below start size 4x2
room west left-of hub size 4x2
room east right-of hub size 4x2
opening between start hub at 50%
opening between hub west at 50%
opening between hub east at 50%
here in start at 2,2
exit-final xw in west at 0,1 side west "EXIT / مخرج"
exit-final xe in east at 4,1 side east "EXIT / مخرج"
route primary here -> hub -> west -> xw
route secondary here -> hub -> east -> xe`;

function layout(source: string) {
  return layoutFloorplan(parseFloorplan(source));
}

describe("evacuation validation — all 13 rules", () => {
  it("#1 triggers when the location marker is absent", () => {
    const lay = layout(twoRoutePlan.replace("here in start at 2,2\n", ""));
    expect(lay.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/has no "here" marker.*ISO 23601 §6/),
      ])
    );
  });

  it("#1 does not trigger when exactly one marker is present", () => {
    expect(layout(twoRoutePlan).errors.some((error) => /no "here"/.test(error))).toBe(false);
  });

  it("#2 triggers without an exit and cites both regimes", () => {
    const source = twoRoutePlan
      .replace(/exit-final xw.*\n/, "")
      .replace(/exit-final xe.*\n/, "");
    expect(layout(source).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/has no exit.*ISO 23601 §6.*NFPA 170 Ch\.11/),
      ])
    );
  });

  it("#2 does not trigger when a final exit exists", () => {
    expect(layout(twoRoutePlan).errors.some((error) => /has no exit/.test(error))).toBe(false);
  });

  it("#3 rejects a hop between rooms with no shared opening", () => {
    const source = twoRoutePlan.replace(
      "route secondary here -> hub -> east -> xe",
      "route secondary here -> east -> xe"
    );
    expect(layout(source).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/share no opening.*ISO 23601 §6/),
      ])
    );
  });

  it("#3 accepts a hop through the declared intermediate room", () => {
    expect(layout(twoRoutePlan).errors.some((error) => /share no opening/.test(error))).toBe(false);
  });

  it("#4 is an ISO warning and an NFPA error for one route", () => {
    const one = twoRoutePlan.replace(
      "route secondary here -> hub -> east -> xe",
      ""
    );
    expect(layout(one).warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fewer than two independent.*ISO 23601 §6/),
      ])
    );
    const nfpa = layout(one.replace("compliance iso", "compliance nfpa"));
    expect(nfpa.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fewer than two independent.*NFPA 101 §7\.4\.1/),
      ])
    );
  });

  it("#4 accepts two routes that share the whole corridor and split only at the exit", () => {
    // The corridor-building shape: both routes run the same single corridor and
    // differ only in which stair they discharge into. This is normal compliant
    // egress (NFPA 101 §7.4.1 asks for two remote *exits*, not two disjoint
    // paths) — an earlier draft also demanded ≥2 differing rooms and produced a
    // false positive on every small plan.
    const corridor = `evacuation "Corridor split"
compliance iso
sheet a3 landscape
room corr at 0,0 size 12x2.4
room stairW left-of corr size 3x2.4
room stairE right-of corr size 3x2.4
door between corr stairW at 50% width 1.1
door between corr stairE at 50% width 1.1
here in corr at 6,1.2
exit-final xw in stairW at 0,1.2 side west "EXIT"
exit-final xe in stairE at 3,1.2 side east "EXIT"
route primary here -> corr -> stairE -> xe
route secondary here -> corr -> stairW -> xw`;
    const lay = layout(corridor);
    expect(
      [...lay.errors, ...lay.warnings].filter((message) =>
        /fewer than two independent/.test(message)
      )
    ).toEqual([]);
  });

  it("#4 still triggers when both routes discharge at the same final exit", () => {
    const sameExit = twoRoutePlan.replace(
      "route secondary here -> hub -> east -> xe",
      "route secondary here -> hub -> west -> xw"
    );
    expect(layout(sameExit).warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fewer than two independent/),
      ])
    );
  });

  it("#4 does not trigger for structurally independent destinations", () => {
    const lay = layout(twoRoutePlan);
    expect(
      [...lay.errors, ...lay.warnings].some((message) =>
        /fewer than two independent/.test(message)
      )
    ).toBe(false);
  });

  it("#5 warns for a connected room omitted from every route", () => {
    const source = `${twoRoutePlan}
room store above start size 2x2
door between start store at 50%`;
    expect(layout(source).warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/room "store".*not on any escape route.*ISO 23601 §6/),
      ])
    );
  });

  it("#5 exempts an unconnected shaft", () => {
    const source = `${twoRoutePlan}
room shaft at 20,20 size 1x1`;
    expect(layout(source).warnings.some((warning) => /room "shaft"/.test(warning))).toBe(false);
  });

  it("#6 rejects a route ending in an ordinary room", () => {
    const source = twoRoutePlan.replace(
      "route secondary here -> hub -> east -> xe",
      "route secondary here -> hub -> east"
    );
    expect(layout(source).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/does not terminate at an exit.*ISO 23601 §6/),
      ])
    );
  });

  it("#6 accepts exit-final as the destination", () => {
    expect(layout(twoRoutePlan).errors.some((error) => /does not terminate/.test(error))).toBe(false);
  });

  it("#7 warns when fixed-size symbols overlap", () => {
    const source = `${twoRoutePlan}
first-aid fa in start at 1,1
extinguisher fx in start at 1,1`;
    expect(layout(source).warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/symbols "fa" and "fx" overlap.*ISO 23601 §6/),
      ])
    );
  });

  it("#7 does not trigger when boxes exactly touch", () => {
    const source = `${twoRoutePlan}
first-aid fa in start at 1,1
extinguisher fx in start at 1.4,1`;
    expect(layout(source).warnings.some((warning) => /"fa" and "fx" overlap/.test(warning))).toBe(false);
  });

  it("#8 rejects monolingual UAE exit labels", () => {
    const source = twoRoutePlan
      .replace("compliance iso", "compliance uae")
      .replace('"EXIT / مخرج"', '"EXIT"');
    expect(layout(source).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/requires bilingual English \/ Arabic.*UAE Civil Defence/),
      ])
    );
  });

  it("#8 accepts non-empty English / Arabic halves", () => {
    expect(
      layout(twoRoutePlan.replace("compliance iso", "compliance uae")).errors.some(
        (error) => /requires bilingual/.test(error)
      )
    ).toBe(false);
  });

  it("#9 auto-adds one no-elevator symbol under NFPA", () => {
    const source = `${twoRoutePlan.replace("compliance iso", "compliance nfpa")}
furniture elevator in start at 0.2,0.2 size 1x1`;
    const lay = layout(source);
    expect(
      lay.evacuation?.symbols.filter((symbol) => symbol.kind === "no-elevator")
    ).toHaveLength(1);
    expect(lay.evacuation?.symbols.find((symbol) => symbol.kind === "no-elevator")?.auto).toBe(true);
  });

  it("#9 does not duplicate an authored no-elevator symbol", () => {
    const source = `${twoRoutePlan.replace("compliance iso", "compliance nfpa")}
furniture elevator in start at 0.2,0.2 size 1x1
no-elevator ne in start at 0.7,0.7`;
    const lay = layout(source);
    expect(
      lay.evacuation?.symbols.filter((symbol) => symbol.kind === "no-elevator")
    ).toHaveLength(1);
    expect(
      lay.evacuation?.symbols.find((symbol) => symbol.kind === "no-elevator")
        ?.auto ?? false
    ).toBe(false);
  });

  it("#10 rejects legend off with standard citations", () => {
    expect(() => parseFloorplan("evacuation\nlegend: off")).toThrow(
      /ISO 23601 §6.*NFPA 170 Ch\.11/
    );
  });

  it("#10 accepts auto/on and keeps Tier M enabled", () => {
    const lay = layout(`${twoRoutePlan}\nlegend: on`);
    expect(lay.evacuation?.legend.mode).toBe("on");
  });

  it("#11 reports monochrome but still renders the plan", () => {
    const svg = renderFloorplan(twoRoutePlan, { theme: "monochrome" });
    expect(svg).toContain("monochrome theme is not permitted");
    expect(svg).toContain('class="sx-fp-routes"');
    expect(svg).not.toContain("Floor plan validation failed");
  });

  it("#11 does not report the color error under the default theme", () => {
    expect(renderFloorplan(twoRoutePlan)).not.toContain(
      "monochrome theme is not permitted"
    );
  });

  it("#12 rejects the first conventional scale step above 1:250", () => {
    const source = `evacuation
sheet a3 landscape
room hall at 0,0 size 97.6x10
here in hall at 1,1
exit-final x in hall at 97.6,5 side east
route primary here -> x`;
    expect(layout(source).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/scale 1:350.*1:250.*ISO 23601 §5\.2/),
      ])
    );
  });

  it("#12 accepts the exact 1:250 boundary", () => {
    const source = `evacuation
sheet a3 landscape
room hall at 0,0 size 97.5x10
here in hall at 1,1
exit-final x in hall at 97.5,5 side east
route primary here -> x`;
    expect(layout(source).errors.some((error) => /computed scale/.test(error))).toBe(false);
  });

  it("#13 rejects an unknown kind with the nearest match", () => {
    expect(() =>
      parseFloorplan(`evacuation
room a at 0,0 size 2x2
safety extnguisher in a at 1,1`)
    ).toThrow(/extnguisher.*extinguisher/);
  });

  it("#13 accepts the corrected kind", () => {
    expect(
      parseFloorplan(`evacuation
room a at 0,0 size 2x2
extinguisher in a at 1,1`).safety
    ).toHaveLength(1);
  });
});
