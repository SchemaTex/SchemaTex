import { describe, expect, it } from "vitest";
import {
  FloorplanParseError,
  parseFloorplan,
} from "../../src/diagrams/floorplan/parser";
import { SAFETY_KINDS } from "../../src/diagrams/floorplan/types";

describe("evacuation parser — mode and compliance", () => {
  it("normalizes escapeplan and applies ISO/A3 defaults", () => {
    const ast = parseFloorplan('escapeplan "Office" unit m');
    expect(ast.mode).toBe("evacuation");
    expect(ast.compliance).toBe("iso");
    expect(ast.sheet).toEqual({ size: "a3", orientation: "landscape" });
  });

  it("parses a profile, print sheet, and the furniture layer switch", () => {
    const ast = parseFloorplan(`evacuation "Warehouse"
compliance nfpa
sheet tabloid portrait
show furniture`);
    expect(ast.compliance).toBe("nfpa");
    expect(ast.sheet).toEqual({ size: "tabloid", orientation: "portrait" });
    expect(ast.showFurniture).toBe(true);
  });

  it("rejects invalid profiles and sheet sizes", () => {
    expect(() => parseFloorplan("evacuation\ncompliance din")).toThrow(
      /iso\|nfpa\|uae/
    );
    expect(() => parseFloorplan("evacuation\nsheet a5")).toThrow(
      /a4\|a3\|a2\|letter\|tabloid/
    );
  });
});

describe("evacuation parser — safety vocabulary", () => {
  it("parses every coordinate-based safety kind in short form", () => {
    const body = SAFETY_KINDS.map(
      (kind, index) => `${kind} s${index} in room at 1,1`
    ).join("\n");
    const ast = parseFloorplan(`evacuation
room room at 0,0 size 4x4
${body}`);
    expect(ast.safety.map((symbol) => symbol.kind)).toEqual(SAFETY_KINDS);
  });

  it("parses long form, wall/profile options, outside placement, and labels", () => {
    const ast = parseFloorplan(`evacuation
room lobby at 0,0 size 6x4
safety exit-final xA in lobby at 5.8,2 side east hand left rotate 90 "EXIT / مخرج"
safety extinguisher f1 in lobby at 0.3,1 class "ABC"
safety assembly muster outside at 9,6 "Assembly A"`);
    expect(ast.safety[0]).toMatchObject({
      kind: "exit-final",
      id: "xA",
      room: "lobby",
      x: 5.8,
      y: 2,
      side: "east",
      hand: "left",
      rotate: 90,
      label: "EXIT / مخرج",
    });
    expect(ast.safety[1]?.fireClass).toBe("ABC");
    expect(ast.safety[2]).toMatchObject({
      kind: "assembly",
      id: "muster",
      outside: true,
      x: 9,
      y: 6,
    });
  });

  it("gives an actionable error for an unknown explicit safety kind", () => {
    expect(() =>
      parseFloorplan(`evacuation
room lobby at 0,0 size 4x4
safety extnguisher f1 in lobby at 1,1`)
    ).toThrow(
      /unknown safety kind "extnguisher".*extinguisher.*ISO 7010.*NFPA 170/s
    );
  });

  it("normalizes common safety-kind aliases without weakening unknown kinds", () => {
    const aliases = [
      ["fire-extinguisher", "extinguisher"],
      ["assembly-point", "assembly"],
      ["emergency-exit", "exit-final"],
      ["fire-alarm", "alarm-sounder"],
      ["escape-route", "exit"],
      ["muster-point", "assembly"],
      ["you-are-here", "here"],
    ] as const;
    const body = aliases
      .map(([alias], index) => `safety ${alias} s${index} in room at 1,1`)
      .join("\n");
    const ast = parseFloorplan(`evacuation
room room at 0,0 size 4x4
${body}`);
    expect(ast.safety.map((symbol) => symbol.kind)).toEqual(
      aliases.map(([, canonical]) => canonical)
    );
    expect(() =>
      parseFloorplan(`evacuation
room room at 0,0 size 4x4
safety mystery-sign in room at 1,1`)
    ).toThrow(/unknown safety kind "mystery-sign"/);
  });
});

describe("evacuation parser — routes, doors, and mandatory legend", () => {
  it("parses route kinds and ordered anchors", () => {
    const ast = parseFloorplan(`evacuation
room office at 0,0 size 4x4
room corridor below office size 4x2
here in office at 2,2
exit-final x1 in corridor at 3.8,1 side east
route secondary here -> corridor -> x1 "Alternative route"`);
    expect(ast.routes[0]).toMatchObject({
      kind: "secondary",
      anchors: ["here", "corridor", "x1"],
      label: "Alternative route",
      floor: 0,
    });
  });

  it("parses fire and smoke door references", () => {
    const ast = parseFloorplan(`evacuation
room a at 0,0 size 4x3
room b right-of a size 4x3
door between a b at 50%
fire-door between a b rating "EI30"
smoke-door a north at 25% rating "S200"`);
    expect(ast.fireDoors).toEqual([
      expect.objectContaining({
        kind: "fire-door",
        between: ["a", "b"],
        rating: "EI30",
      }),
      expect.objectContaining({
        kind: "smoke-door",
        room: "a",
        side: "north",
        pct: 25,
        rating: "S200",
      }),
    ]);
  });

  it("rejects legend off but accepts legend overrides", () => {
    expect(() => parseFloorplan("evacuation\nlegend: off")).toThrow(
      /must carry a legend.*ISO 23601 §6.*NFPA 170 Ch\.11/s
    );
    const ast = parseFloorplan(
      'evacuation\nlegend: auto\nlegend.label exit: "Emergency way out"'
    );
    expect(ast.legendOverrides.mode).toBe("auto");
    expect(ast.legendOverrides.labels?.exit).toBe("Emergency way out");
  });

  it("keeps safety-only keywords out of floorplan mode", () => {
    expect(() =>
      parseFloorplan(`floorplan
room a at 0,0 size 4x4
here in a at 2,2`)
    ).toThrow(FloorplanParseError);
  });
});
