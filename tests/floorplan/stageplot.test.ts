import { describe, expect, it } from "vitest";
import { floorplan } from "../../src/diagrams/floorplan";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import {
  deriveStageInputList,
  renderStageplotLayout,
} from "../../src/diagrams/floorplan/stageplot";
import {
  STAGE_EQUIPMENT_KINDS,
  type StageEquipmentKind,
} from "../../src/diagrams/floorplan/types";
import { STAGE_SYMBOLS } from "../../src/diagrams/floorplan/stage-symbols";

const ROCK_BAND = `stageplot "Four-piece Rock Band" unit ft
stage deck "32 ft × 20 ft" at 0,0 size 32x20
equipment drum-kit drums in deck at 12,2 "Drums"
equipment drum-mic kick in deck at 13,5 channel 1 source "Kick" model "Shure Beta 52A" stand short-boom phantom no
equipment overhead oh-l in deck at 11,2 channel 2 source "Drum OH L" model "Shure SM81" stand boom phantom yes
equipment overhead oh-r in deck at 17,2 channel 3 source "Drum OH R" model "Shure SM81" stand boom phantom yes
equipment bass-amp bass in deck at 3,5 "Bass"
equipment di-box bass-di in deck at 5,8 channel 4 source "Bass DI" model "Radial J48" stand none phantom yes
equipment guitar-amp guitar in deck at 24,5 "Guitar"
equipment boom-stand lead in deck at 15,15 channel 5 source "Lead vocal" model "Shure SM58" stand boom phantom no
monitor 1 mix-one in deck at 13,17 "Lead"
monitor 2 mix-two in deck at 3,14 "Bass"
monitor 3 mix-three in deck at 25,14 "Guitar"
equipment snake snake-a in deck at 29,10 "Stage box"
equipment foh-console foh outside at 16,27 "FOH"
signal bass-di -> snake-a -> foh "Bass"
signal lead -> snake-a -> foh "Vocal"`;

const JAZZ_TRIO = `stageplot "Jazz Trio" unit ft
stage deck at 0,0 size 24x16
equipment piano piano in deck at 2,3 "Grand piano"
equipment straight-stand piano-mic in deck at 7,4 channel 1 source "Piano" model "AKG C414" stand straight phantom yes
equipment bass-amp upright-bass in deck at 17,3 "Upright bass"
equipment di-box bass-di in deck at 18,7 channel 2 source "Upright bass DI" model "Radial PZ-DI" stand none phantom yes
equipment drum-kit drums in deck at 10,2 "Drums"
equipment overhead drum-oh in deck at 14,2 channel 3 source "Drum overhead" model "Neumann KM 184" stand boom phantom yes
monitor 1 piano-mix in deck at 4,12 "Piano"
monitor 2 bass-mix in deck at 17,12 "Bass"
equipment snake snake-a in deck at 21,8
signal piano-mic -> snake-a
signal bass-di -> snake-a
signal drum-oh -> snake-a`;

const FULL_BAND = `stageplot "Full Band — Six Monitor Mixes" unit ft
stage deck at 0,0 size 40x24
equipment stage-riser drum-riser in deck at 14,1 size 12x9 "8 in drum riser"
equipment drum-kit drums in deck at 17,3 "Drums"
equipment drum-mic kick in deck at 18,7 channel 1 source "Kick" model "Shure Beta 52A" stand short-boom phantom no
equipment drum-mic snare in deck at 20,5 channel 2 source "Snare" model "Shure SM57" stand short-boom phantom no
equipment overhead oh-l in deck at 15,2 channel 3 source "OH L" model "Shure KSM137" stand boom phantom yes
equipment overhead oh-r in deck at 24,2 channel 4 source "OH R" model "Shure KSM137" stand boom phantom yes
equipment guitar-amp guitar-l in deck at 4,5 "Guitar L"
equipment guitar-amp guitar-r in deck at 32,5 "Guitar R"
equipment bass-cabinet bass-cab in deck at 28,3 "Bass"
equipment keyboard keys in deck at 3,12 "Keys"
equipment di-box keys-di in deck at 7,13 channel 5 source "Keys L" model "Radial ProD2" stand none phantom no
equipment boom-stand lead in deck at 19,18 channel 6 source "Lead vocal" model "Shure Beta 58A" stand boom phantom no
monitor 1 m1 in deck at 2,20 "Keys"
monitor 2 m2 in deck at 9,20 "Guitar L"
monitor 3 m3 in deck at 16,20 "Lead"
monitor 4 m4 in deck at 23,20 "Lead"
monitor 5 m5 in deck at 30,20 "Guitar R"
monitor 6 m6 in deck at 36,16 "Drums"
equipment power-drop power-l in deck at 1,2 "20A"
equipment power-drop power-r in deck at 38,2 "20A"
equipment snake snake-a in deck at 36,10
signal kick -> snake-a
signal snare -> snake-a
signal keys-di -> snake-a
signal lead -> snake-a`;

describe("stageplot parser and routing", () => {
  it("is a floorplan alt type with an explicit stageplot mode", () => {
    expect(floorplan.altTypes).toContain("stageplot");
    expect(floorplan.detect(ROCK_BAND)).toBe(true);
    const ast = parseFloorplan(ROCK_BAND);
    expect(ast.type).toBe("floorplan");
    expect(ast.mode).toBe("stageplot");
    expect(ast.rooms[0]).toMatchObject({ id: "deck", w: 32, h: 20, nolabel: true });
    expect(ast.stageplot.equipment.find((item) => item.id === "mix-one")).toMatchObject({
      kind: "monitor-wedge",
      mix: 1,
    });
  });

  it("namespaces stage riser away from the evacuation safety riser", () => {
    const ast = parseFloorplan(
      `stageplot\nstage deck at 0,0 size 10x8\nequipment riser drums-up in deck at 2,1`
    );
    expect(ast.stageplot.equipment[0]?.kind).toBe("stage-riser");
  });

  it("requires a measured location for every plotted device", () => {
    expect(() =>
      parseFloorplan(`stageplot
stage deck at 0,0 size 10x8
equipment guitar-amp guitar in deck`)
    ).toThrow(/expected "in <stage> at x,y" or "outside at x,y"/);
  });
});

describe("stageplot input list and signal layout", () => {
  it("derives one sorted channel row per channel-bearing equipment node", () => {
    const rows = deriveStageInputList(parseFloorplan(ROCK_BAND));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({
      channel: 1,
      source: "Kick",
      model: "Shure Beta 52A",
      stand: "short-boom",
      phantom: false,
      notes: "",
    });
    expect(rows[1]?.phantom).toBe(true);
    expect(rows.map((row) => row.channel)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shares only deterministic orthogonal routing with evacuation", () => {
    const lay = layoutFloorplan(parseFloorplan(ROCK_BAND));
    expect(lay.errors).toEqual([]);
    expect(lay.stageplot?.signals).toHaveLength(2);
    for (const path of lay.stageplot?.signals ?? []) {
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1]!;
        const b = path.points[i]!;
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    }
  });

  it("rejects duplicate channels, missing wedge numbers, and unknown signal anchors", () => {
    const lay = layoutFloorplan(
      parseFloorplan(`stageplot
stage deck at 0,0 size 20x12
equipment drum-mic kick in deck at 2,2 channel 1
equipment drum-mic snare in deck at 4,2 channel 1
equipment monitor-wedge bad-wedge in deck at 6,8
signal kick -> missing`)
    );
    expect(lay.errors.join("\n")).toMatch(/duplicate input channel 1/);
    expect(lay.errors.join("\n")).toMatch(/monitor-wedge "bad-wedge" needs a positive mix number/);
    expect(lay.errors.join("\n")).toMatch(/unknown equipment anchor "missing"/);
  });

  it("requires at least one measured stage surface", () => {
    const lay = layoutFloorplan(parseFloorplan("stageplot"));
    expect(lay.errors.join("\n")).toMatch(/stageplot needs at least one measured surface/);
  });
});

describe("stageplot canonical fixtures and symbols", () => {
  for (const [name, source] of [
    ["four-piece rock band", ROCK_BAND],
    ["jazz trio", JAZZ_TRIO],
    ["full band with six mixes", FULL_BAND],
  ] as const) {
    it(`renders the ${name}`, () => {
      const lay = layoutFloorplan(parseFloorplan(source));
      expect(lay.errors).toEqual([]);
      const svg = renderStageplotLayout(lay);
      expect(svg).toContain('class="sx-stageplot"');
      expect(svg).toContain('data-stage-sheet="input-list"');
      expect(svg).toContain('class="sx-stage-signal-arrow"');
      expect(svg).toContain(">STAGE RIGHT<");
      expect(svg).toContain(">STAGE LEFT<");
      expect(svg.indexOf(">STAGE RIGHT<")).toBeLessThan(svg.indexOf(">STAGE LEFT<"));
    });
  }

  it("renders a drum riser and six numbered monitor mixes", () => {
    const svg = renderStageplotLayout(layoutFloorplan(parseFloorplan(FULL_BAND)));
    expect(svg).toContain('data-equipment="stage-riser"');
    for (let mix = 1; mix <= 6; mix++) {
      expect(svg).toContain(`data-mix="${mix}"`);
      expect(svg).toContain(`>${mix}<`);
    }
  });

  it("covers every required equipment kind with builder-safe line art", () => {
    expect(Object.keys(STAGE_SYMBOLS).sort()).toEqual([...STAGE_EQUIPMENT_KINDS].sort());
    for (const kind of STAGE_EQUIPMENT_KINDS) {
      const def = STAGE_SYMBOLS[kind as StageEquipmentKind];
      const fragment = def.draw({ w: def.w, h: def.h, px: (value) => value * 40 });
      expect(fragment).not.toContain("style=");
      expect(fragment.length).toBeGreaterThan(10);
    }
  });
});
