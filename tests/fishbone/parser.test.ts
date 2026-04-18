import { describe, it, expect } from "vitest";
import { parseFishboneDSL } from "../../src/diagrams/fishbone/parser";

const base = (body: string): string =>
  `fishbone "T"\neffect "E"\n${body}`;

describe("Fishbone parser — flexibility options", () => {
  describe("config sides", () => {
    it("defaults to undefined (layout treats as both)", () => {
      const ast = parseFishboneDSL(
        base(`category a "A"\na : "a1"`)
      );
      expect(ast.sides).toBeUndefined();
    });

    it("accepts top / bottom / both", () => {
      for (const v of ["top", "bottom", "both"] as const) {
        const ast = parseFishboneDSL(
          base(`config sides = ${v}\ncategory a "A"`)
        );
        expect(ast.sides).toBe(v);
      }
    });

    it("ignores invalid side values", () => {
      const ast = parseFishboneDSL(
        base(`config sides = sideways\ncategory a "A"`)
      );
      expect(ast.sides).toBeUndefined();
    });
  });

  describe("config slope / ribslope", () => {
    it("accepts named presets", () => {
      expect(parseFishboneDSL(base(`config slope = gentle\ncategory a "A"`)).ribSlope).toBeCloseTo(0.45);
      expect(parseFishboneDSL(base(`config slope = normal\ncategory a "A"`)).ribSlope).toBeCloseTo(0.6);
      expect(parseFishboneDSL(base(`config slope = steep\ncategory a "A"`)).ribSlope).toBeCloseTo(0.75);
    });

    it("accepts numeric values", () => {
      expect(parseFishboneDSL(base(`config slope = 0.9\ncategory a "A"`)).ribSlope).toBeCloseTo(0.9);
    });

    it("rejects out-of-range numbers", () => {
      expect(parseFishboneDSL(base(`config slope = 10\ncategory a "A"`)).ribSlope).toBeUndefined();
      expect(parseFishboneDSL(base(`config slope = -1\ncategory a "A"`)).ribSlope).toBeUndefined();
    });
  });

  describe("config density", () => {
    it("accepts preset names", () => {
      for (const v of ["compact", "normal", "spacious"] as const) {
        const ast = parseFishboneDSL(base(`config density = ${v}\ncategory a "A"`));
        expect(ast.density).toBe(v);
      }
    });
  });

  describe("config causeSide", () => {
    it("accepts head / tail / both", () => {
      for (const v of ["head", "tail", "both"] as const) {
        const ast = parseFishboneDSL(base(`config causeSide = ${v}\ncategory a "A"`));
        expect(ast.causeSide).toBe(v);
      }
    });
  });

  describe("per-category side + order", () => {
    it("parses side/order properties on category", () => {
      const ast = parseFishboneDSL(
        base(
          `category a "A" [side: top, order: 2]\ncategory b "B" [side: bottom, order: 0]`
        )
      );
      expect(ast.majors[0]!.side).toBe("top");
      expect(ast.majors[0]!.order).toBe(2);
      expect(ast.majors[1]!.side).toBe("bottom");
      expect(ast.majors[1]!.order).toBe(0);
    });

    it("ignores invalid side value", () => {
      const ast = parseFishboneDSL(
        base(`category a "A" [side: left]`)
      );
      expect(ast.majors[0]!.side).toBeUndefined();
    });
  });
});
