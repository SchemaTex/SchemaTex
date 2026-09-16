import { describe, it, expect } from "vitest";
import { parseFishboneDSL } from "../../src/diagrams/fishbone/parser";
import { layoutFishbone } from "../../src/diagrams/fishbone/layout";
import { renderFishboneAST } from "../../src/diagrams/fishbone/renderer";

const attrs = (source: string): Record<string, string> => Object.fromEntries(
  [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const build = (body: string) => {
  const svg = renderFishboneAST(parseFishboneDSL(`fishbone "T"\neffect "E"\n${body}`));
  const lines = [...svg.matchAll(/<line\b([^>]*)>/g)].map(match => attrs(match[1]));
  const headers = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
    .filter(match => attrs(match[1]).class === "sx-fb-header-text");
  const root = attrs(svg.slice(0, svg.indexOf(">")));
  return { width: Number(root.width), height: Number(root.height),
    ribs: lines.filter(line => line.class === "sx-fb-rib").map((line, index) => ({
      half: Number(line.y2) < Number(line.y1) ? "top" : "bottom", label: headers[index][2],
      spineX: Number(line.x1), endX: Number(line.x2),
    })), svg };
};

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
    // Which side of the bone a cause hangs from. `head` puts it on the spine
    // side, `tail` on the far side, `both` alternates. The layout records the
    // choice per cause, so read it back rather than guessing from coordinates.
    const sidesOf = (config: string) => {
      const ast = parseFishboneDSL(`fishbone "T"\neffect "E"\n${config}\n` +
        `category a "A"\na : "x1"\na : "x2"\na : "x3"\na : "x4"`);
      return layoutFishbone(ast).ribs.flatMap(rib => rib.causes.map(cause => cause.causeSide));
    };

    it("hangs every cause on the tail side by default", () => {
      expect(sidesOf("")).toEqual(["tail", "tail", "tail", "tail"]);
      expect(sidesOf("config causeSide = tail")).toEqual(sidesOf(""));
    });

    it("moves every cause to the head side on request", () => {
      expect(sidesOf("config causeSide = head")).toEqual(["head", "head", "head", "head"]);
    });

    it("alternates sides when asked for both", () => {
      const sides = sidesOf("config causeSide = both");
      expect(new Set(sides)).toEqual(new Set(["head", "tail"]));
      expect(sides.every((side, index) => index === 0 || side !== sides[index - 1])).toBe(true);
    });

    it.each(["", "config causeSide = tail", "config causeSide = head", "config causeSide = both"])(
      "keeps causes above horizontal ribs and left aligned (%s)", config => {
        const { svg } = build(`${config}\ncategory a "A"\na : "x1"\na : "x2"`);
        const labels = [...svg.matchAll(/<text\b([^>]*)>/g)].map(match => attrs(match[1]))
          .filter(text => text.class === "sx-fb-cause-label");
        const ribs = [...svg.matchAll(/<line\b([^>]*)>/g)].map(match => attrs(match[1]))
          .filter(line => line.class === "sx-fb-branch");
        labels.forEach((label, index) => {
          expect(label["text-anchor"]).toBe("start");
          expect(Number(label.y)).toBeLessThan(Number(ribs[index].y1));
          expect(ribs[index].y1).toBe(ribs[index].y2);
        });
      });
  });
});
