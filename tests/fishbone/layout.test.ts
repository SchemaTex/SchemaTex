import { describe, it, expect } from "vitest";
import { parseFishboneDSL } from "../../src/diagrams/fishbone/parser";
import { layoutFishbone } from "../../src/diagrams/fishbone/layout";

const build = (body: string) =>
  layoutFishbone(
    parseFishboneDSL(`fishbone "T"\neffect "E"\n${body}`)
  );

describe("Fishbone layout — flexibility options", () => {
  describe("sides", () => {
    it("puts every rib on the top half when sides=top", () => {
      const r = build(
        `config sides = top\ncategory a "A"\ncategory b "B"\ncategory c "C"\na : "x"\nb : "x"\nc : "x"`
      );
      expect(r.ribs).toHaveLength(3);
      expect(r.ribs.every((rib) => rib.half === "top")).toBe(true);
    });

    it("puts every rib on the bottom half when sides=bottom", () => {
      const r = build(
        `config sides = bottom\ncategory a "A"\ncategory b "B"\na : "x"\nb : "x"`
      );
      expect(r.ribs.every((rib) => rib.half === "bottom")).toBe(true);
    });

    it("default splits 3 ribs as 2 top + 1 bottom", () => {
      const r = build(
        `category a "A"\ncategory b "B"\ncategory c "C"\na : "x"\nb : "x"\nc : "x"`
      );
      const topCount = r.ribs.filter((x) => x.half === "top").length;
      const botCount = r.ribs.filter((x) => x.half === "bottom").length;
      expect(topCount).toBe(2);
      expect(botCount).toBe(1);
    });
  });

  describe("per-rib side override", () => {
    it("honors category [side:...] regardless of declaration order", () => {
      const r = build(
        `category a "A" [side: bottom]\ncategory b "B" [side: top]\ncategory c "C" [side: bottom]\na : "x"\nb : "x"\nc : "x"`
      );
      const byLabel = new Map(r.ribs.map((rib) => [rib.label, rib.half]));
      expect(byLabel.get("A")).toBe("bottom");
      expect(byLabel.get("B")).toBe("top");
      expect(byLabel.get("C")).toBe("bottom");
    });

    it("honors explicit order within a half", () => {
      const r = build(
        `category a "A" [side: top, order: 2]\ncategory b "B" [side: top, order: 0]\ncategory c "C" [side: top, order: 1]\na : "x"\nb : "x"\nc : "x"`
      );
      const topRibs = r.ribs
        .filter((x) => x.half === "top")
        .sort((a, b) => a.spineX - b.spineX);
      expect(topRibs.map((x) => x.label)).toEqual(["B", "C", "A"]);
    });
  });

  describe("ribSlope", () => {
    it("gentler slope pulls rib end closer to spineX (smaller dx)", () => {
      const gentle = build(
        `config slope = gentle\ncategory a "A"\ncategory b "B"\na : "x"\nb : "x"`
      );
      const normal = build(
        `category a "A"\ncategory b "B"\na : "x"\nb : "x"`
      );
      const dxGentle = gentle.ribs[0]!.spineX - gentle.ribs[0]!.endX;
      const dxNormal = normal.ribs[0]!.spineX - normal.ribs[0]!.endX;
      expect(dxGentle).toBeLessThan(dxNormal);
      expect(dxGentle).toBeGreaterThan(0);
    });
  });

  describe("density", () => {
    it("compact produces smaller canvas than normal for the same DSL", () => {
      const body = `category a "A"\ncategory b "B"\na : "x"\nb : "x"`;
      const compact = build(`config density = compact\n${body}`);
      const normal = build(body);
      expect(compact.width).toBeLessThanOrEqual(normal.width);
      expect(compact.height).toBeLessThan(normal.height);
    });

    it("spacious produces larger canvas than normal", () => {
      const body = `category a "A"\ncategory b "B"\na : "x"\nb : "x"`;
      const spacious = build(`config density = spacious\n${body}`);
      const normal = build(body);
      expect(spacious.height).toBeGreaterThan(normal.height);
    });
  });

  describe("causeSide", () => {
    it("default head — all cause branches extend toward head (branchX > ribX)", () => {
      const r = build(
        `category a "A"\na : "x1"\na : "x2"`
      );
      for (const cause of r.ribs[0]!.causes) {
        expect(cause.branchX).toBeGreaterThan(cause.ribX);
        expect(cause.causeSide).toBe("head");
      }
    });

    it("tail flips cause direction (branchX < ribX)", () => {
      const r = build(
        `config causeSide = tail\ncategory a "A"\na : "x1"\na : "x2"`
      );
      for (const cause of r.ribs[0]!.causes) {
        expect(cause.branchX).toBeLessThan(cause.ribX);
        expect(cause.causeSide).toBe("tail");
        expect(cause.labelAnchor).toBe("end");
      }
    });

    it("both alternates direction by slot (even → head, odd → tail)", () => {
      const r = build(
        `config causeSide = both\ncategory a "A"\na : "x0"\na : "x1"\na : "x2"\na : "x3"`
      );
      const causes = r.ribs[0]!.causes;
      expect(causes[0]!.causeSide).toBe("head");
      expect(causes[1]!.causeSide).toBe("tail");
      expect(causes[2]!.causeSide).toBe("head");
      expect(causes[3]!.causeSide).toBe("tail");
    });
  });
});
