import { describe, expect, it } from "vitest";
import { getGenerationProfile } from "../../src/ai/profiles";
import {
  FLOORPLAN_SYMBOLS,
  FURNITURE_TYPES,
} from "../../src/diagrams/floorplan/catalog";
import {
  FURNITURE_ALIASES,
  parseFloorplan,
} from "../../src/diagrams/floorplan/parser";

function minimalFurnitureDsl(type: string): string {
  return `floorplan "Catalog probe"
room probe "Probe" at 0,0 size 12x12
furniture ${type} in probe at 1,1`;
}

function profileFurnitureTypes(): Set<string> {
  const keywords = getGenerationProfile("floorplan").keywords ?? "";
  const clause = keywords.match(/(?:^| · )types: ([^·]+)$/)?.[1]?.trim();
  expect(clause, "floorplan profile must expose a terminal types: clause").toBeTruthy();

  const types = new Set<string>();
  for (const token of clause!.split(/\s+/)) {
    const [head, ...tails] = token.split("/");
    types.add(head!);
    const prefix = head!.includes("-")
      ? head!.slice(0, head!.lastIndexOf("-") + 1)
      : "";
    for (const tail of tails) types.add(`${prefix}${tail}`);
  }
  return types;
}

describe("floorplan symbol catalog synchronization", () => {
  it("advertises every catalog type in the LLM profile", () => {
    const advertised = profileFurnitureTypes();
    expect(
      FURNITURE_TYPES.filter((type) => !advertised.has(type)),
      "catalog types missing from the profile types: clause"
    ).toEqual([]);
  });

  it.each([
    "bench",
    "grill",
    "easel",
    "fountain",
    "teacher-desk",
    "toy-box",
    "beanbag",
  ])("parses the production-requested %s symbol", (type) => {
    const ast = parseFloorplan(minimalFurnitureDsl(type));
    expect(ast.furniture[0]?.type).toBe(type);
  });

  it.each([
    "bench",
    "grill",
    "easel",
    "fountain",
    "teacher-desk",
    "toy-box",
    "beanbag",
  ])("draws %s as theme-class line art without inline styling", (type) => {
    const def = FLOORPLAN_SYMBOLS[type as keyof typeof FLOORPLAN_SYMBOLS];
    const fragment = def.draw({
      w: def.w,
      h: def.h,
      px: (meters) => meters * 100,
    });
    expect(fragment).toMatch(/class="sx-fp-/);
    expect(fragment).not.toMatch(/\b(?:style|fill|stroke)=/);
  });
});

describe("floorplan furniture aliases", () => {
  it.each([
    ["lounge-chair", "armchair"],
    ["stool", "bar-stool"],
    ["closet", "wardrobe"],
    ["file-cabinet", "filing-cabinet"],
    ["oven", "stove"],
  ])("normalizes %s to %s", (alias, canonical) => {
    const ast = parseFloorplan(minimalFurnitureDsl(alias));
    expect(ast.furniture[0]?.type).toBe(canonical);
  });

  it("includes every accepted alias in the unknown-type recovery list", () => {
    let message = "";
    try {
      parseFloorplan(minimalFurnitureDsl("not-a-real-symbol"));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("Valid types:");
    for (const alias of Object.keys(FURNITURE_ALIASES)) {
      expect(message, `missing alias "${alias}" from recovery list`).toContain(alias);
    }
  });
});
