import { describe, expect, it } from "vitest";
import { renderResult } from "../../src/core/api";
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

const hotelPlan = `evacuation "Hotel Level 2 — Escape Plan" unit m
compliance iso
sheet a3 landscape
room corr "Corridor" at 0,6 size 48x2.4
room stairW "Stair West" at 0,0 size 4x6
room stairE "Stair East" at 44,0 size 4x6
room lift "Lift Lobby" at 0,8.4 size 4x6
room n0 "Room 201" at 4,0 size 5x6
room n1 "Room 202" at 9,0 size 5x6
room n2 "Room 203" at 14,0 size 5x6
room n3 "Room 204" at 19,0 size 5x6
room n4 "Room 205" at 24,0 size 5x6
room n5 "Room 206" at 29,0 size 5x6
room n6 "Room 207" at 34,0 size 5x6
room n7 "Room 208" at 39,0 size 5x6
room s0 "Room 221" at 4,8.4 size 5x6
room s1 "Room 222" at 9,8.4 size 5x6
room s2 "Room 223" at 14,8.4 size 5x6
room s3 "Room 224" at 19,8.4 size 5x6
room s4 "Room 225" at 24,8.4 size 5x6
room s5 "Room 226" at 29,8.4 size 5x6
room s6 "Room 227" at 34,8.4 size 5x6
room s7 "Room 228" at 39,8.4 size 5x6
door between n0 corr at 50% width 0.9
door between n1 corr at 50% width 0.9
door between n2 corr at 50% width 0.9
door between n3 corr at 50% width 0.9
door between n4 corr at 50% width 0.9
door between n5 corr at 50% width 0.9
door between n6 corr at 50% width 0.9
door between n7 corr at 50% width 0.9
door between s0 corr at 50% width 0.9
door between s1 corr at 50% width 0.9
door between s2 corr at 50% width 0.9
door between s3 corr at 50% width 0.9
door between s4 corr at 50% width 0.9
door between s5 corr at 50% width 0.9
door between s6 corr at 50% width 0.9
door between s7 corr at 50% width 0.9
door between stairW corr at 50% width 1.1
door between stairE corr at 50% width 1.1
opening between lift corr at 50% width 1.6
here in corr at 24,1.2
exit-final xW in stairW at 0,3 side west "EXIT"
exit-final xE in stairE at 4,3 side east "EXIT"
extinguisher e1 in corr at 10,0.3 side north class "ABC"
call-point cp1 in corr at 12,0.3 side north
first-aid fa1 in lift at 2,0.4
no-elevator ne1 in lift at 2,3
route primary here -> corr -> stairE -> xE
route secondary here -> corr -> stairW -> xW`;

function layout(source: string) {
  return layoutFloorplan(parseFloorplan(source));
}

function deadRoomWarnings(source: string): string[] {
  return layout(source).warnings.filter((warning) =>
    /room ".*".*escape route.*ISO 23601 §6/.test(warning)
  );
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

  it("#5 warns exactly once for a room in an isolated connected component", () => {
    const source = `${twoRoutePlan}
room store at 20,20 size 2x2
room service below store size 2x2
door between store service at 50%
exit-final serviceExit in service at 0,1 side west`;
    expect(deadRoomWarnings(source)).toEqual([
      expect.stringMatching(/room "store".*escape route.*ISO 23601 §6/),
    ]);
  });

  it("#5 accepts a 20-room hotel whose guest rooms connect to routed corridor", () => {
    const lay = layout(hotelPlan);
    expect(lay.evacuation?.scale.denominator).toBe(200);
    expect(lay.errors).toEqual([]);
    expect(lay.warnings).toEqual([]);
  });

  it("#5 accepts rooms that reach a routed room through two openings", () => {
    const source = `${twoRoutePlan}
room foyer above start size 4x2
room guest above foyer size 4x2
door between start foyer at 50%
door between foyer guest at 50%`;
    expect(deadRoomWarnings(source)).toEqual([]);
  });

  it("#5 exempts an unconnected shaft", () => {
    const source = `${twoRoutePlan}
room shaft at 20,20 size 1x1`;
    expect(deadRoomWarnings(source)).toEqual([]);
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

  it("#11 blocks monochrome through the public result contract", () => {
    const result = renderResult(twoRoutePlan, {
      type: "evacuation",
      theme: "monochrome",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "floorplan/evacuation-color-required",
          severity: "error",
        }),
      ])
    );
    expect(result.svg).toContain("monochrome theme is not permitted");
    expect(result.svg).not.toContain('class="sx-fp-routes"');
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
