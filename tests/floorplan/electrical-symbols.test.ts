import { describe, expect, it } from "vitest";
import {
  FLOORPLAN_SYMBOLS,
  FURNITURE_TYPES,
  layoutFloorplan,
  parseFloorplan,
} from "../../src/diagrams/floorplan";
import type { FurnitureType } from "../../src/diagrams/floorplan/types";
import { getSymbolCatalog } from "../../src/symbols-catalog";

const NEW_SYMBOLS: FurnitureType[] = [
  "switch-3way",
  "switch-4way",
  "switch-dimmer",
  "gfci-outlet",
  "outlet-240v",
  "floor-outlet",
  "weatherproof-outlet",
  "recessed-light",
  "wall-light",
  "pendant-light",
  "fluorescent-light",
  "emergency-light",
  "smoke-detector",
  "thermostat",
  "motion-sensor",
  "tv-outlet",
  "phone-outlet",
  "junction-box",
];

const ALIASES: Array<[string, FurnitureType]> = [
  ["rcd-outlet", "gfci-outlet"],
  ["rcd", "gfci-outlet"],
  ["sconce", "wall-light"],
  ["downlight", "recessed-light"],
  ["can-light", "recessed-light"],
  ["smoke-alarm", "smoke-detector"],
  ["pir", "motion-sensor"],
  ["coax-outlet", "tv-outlet"],
  ["strip-light", "fluorescent-light"],
  ["troffer", "fluorescent-light"],
];

const WALL_FACING_GLYPHS: FurnitureType[] = [
  "outlet",
  "duplex-outlet",
  "gfci-outlet",
  "outlet-240v",
  "weatherproof-outlet",
  "switch",
  "switch-3way",
  "switch-4way",
  "switch-dimmer",
  "wall-light",
];

function draw(type: FurnitureType, symbols: "nec" | "iec"): string {
  const def = FLOORPLAN_SYMBOLS[type];
  return def.draw({
    w: def.w,
    h: def.h,
    px: (meters) => Math.round(meters * 1000) / 10,
    symbols,
  });
}

describe("floorplan electrical symbol standards", () => {
  it("marks every north-authored wall-facing glyph as directional", () => {
    const directional = Object.entries(FLOORPLAN_SYMBOLS)
      .filter(([, definition]) => definition.directional)
      .map(([type]) => type)
      .sort();
    expect(directional).toEqual([...WALL_FACING_GLYPHS].sort());
  });

  it("renders a plain switch as NEC S or an IEC dot-and-lever", () => {
    const nec = draw("switch", "nec");
    const iec = draw("switch", "iec");

    expect(nec).toContain(">S</text>");
    expect(nec).not.toContain('class="sx-fp-furn-dot"');
    expect(iec).toContain('class="sx-fp-furn-dot"');
    expect(iec).toContain('class="sx-fp-furn-line"');
    expect(iec).not.toContain(">S</text>");
  });

  it("renders NEC switch variants with smaller, baseline-offset subscripts", () => {
    const variants: Array<[FurnitureType, string]> = [
      ["switch-3way", "3"],
      ["switch-4way", "4"],
      ["switch-dimmer", "D"],
    ];
    for (const [type, subscript] of variants) {
      const fragment = draw(type, "nec");
      const fontSizes = [...fragment.matchAll(/font-size="([\d.]+)"/g)].map(
        (match) => Number(match[1])
      );
      const yValues = [...fragment.matchAll(/ y="([\d.]+)"/g)].map(
        (match) => Number(match[1])
      );
      expect(fragment).toContain(`>${subscript}</text>`);
      expect(fontSizes).toHaveLength(2);
      expect(fontSizes[1]).toBeLessThan(fontSizes[0] ?? 0);
      expect(yValues[1]).toBeGreaterThan(yValues[0] ?? Infinity);
    }
  });

  it("keeps an IEC socket's flat edge against all four wall sides", () => {
    const base = draw("outlet", "iec");
    const flatEdge = base.match(
      /<line class="sx-fp-furn-line" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/
    );
    expect(flatEdge).not.toBeNull();
    expect(flatEdge?.[2]).toBe("0");
    expect(flatEdge?.[4]).toBe("0");
    expect(flatEdge?.[1]).not.toBe(flatEdge?.[3]);

    const ast = parseFloorplan(`floorplan "IEC walls" symbols iec
room r at 0,0 size 4x4
fixture outlet in r on north at 20%
fixture outlet in r on east at 40%
fixture outlet in r on south at 60%
fixture outlet in r on west at 80%`);
    const layout = layoutFloorplan(ast);
    expect(layout.items.map((item) => item.rotate)).toEqual([0, 90, 180, 270]);
  });
});

describe("floorplan electrical catalog expansion", () => {
  it("parses and renders every new type under both standards", () => {
    for (const type of NEW_SYMBOLS) {
      const ast = parseFloorplan(`floorplan "${type}"
room probe at 0,0 size 4x4
furniture ${type} in probe at 1,1`);
      expect(ast.furniture[0]?.type).toBe(type);
      expect(FURNITURE_TYPES).toContain(type);

      const standards: Array<"nec" | "iec"> = ["nec", "iec"];
      for (const standard of standards) {
        const fragment = draw(type, standard);
        expect(fragment, `${type} (${standard})`).toMatch(/class="sx-fp-/);
        expect(fragment, `${type} (${standard})`).not.toMatch(
          /\b(?:style|fill|stroke)=/
        );
      }
    }
  });

  it.each(ALIASES)("normalizes %s to %s", (alias, canonical) => {
    const ast = parseFloorplan(`floorplan "Alias"
room probe at 0,0 size 4x4
furniture ${alias} in probe at 1,1`);
    expect(ast.furniture[0]?.type).toBe(canonical);
  });

  it("keeps phone-outlet visually distinct from thermostat", () => {
    const phone = draw("phone-outlet", "nec");
    const thermostat = draw("thermostat", "nec");
    expect(phone).not.toContain(">T</text>");
    expect(phone).toContain("<path");
    expect(thermostat).toContain(">T</text>");
    expect(thermostat).toContain("<circle");
  });
});

describe("floorplan symbol sheet electrical conventions", () => {
  it("keeps canonical ids and adds labelled IEC variants for outlets and switches", () => {
    const entries = getSymbolCatalog("floorplan")?.entries ?? [];
    const ids = entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(entries.find((entry) => entry.id === "switch")?.label).toBe("Switch (NEC)");
    expect(entries.find((entry) => entry.id === "switch-iec")?.label).toBe("Switch (IEC)");
    expect(entries.find((entry) => entry.id === "outlet")?.label).toBe("Outlet (NEC)");
    expect(entries.find((entry) => entry.id === "outlet-iec")?.label).toBe("Outlet (IEC)");
    expect(entries.find((entry) => entry.id === "switch")?.svg).toContain(">S</text>");
    expect(entries.find((entry) => entry.id === "switch-iec")?.svg).toContain(
      'class="sx-fp-furn-dot"'
    );
  });
});
