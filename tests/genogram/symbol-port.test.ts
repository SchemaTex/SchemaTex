import { describe, expect, it } from "vitest";
import type { Individual, RelationshipType } from "../../src/core/types";
import { getRequiredDefs, individualPerimeter, renderIndividualSymbol } from "../../src/diagrams/genogram/symbols";
import { renderEmotionalForm } from "../../src/diagrams/genogram/line-forms";
import { genogram } from "../../src/diagrams/genogram";

const person = (status: Individual["status"], sex: Individual["sex"] = "unknown"): Individual => ({ id: "outcome", label: "Outcome", status, sex });
const glyph = (type: RelationshipType) => renderEmotionalForm("M 0 0 L 120 0", type);
const marks = (svg: string, role: string) => [...svg.matchAll(new RegExp(`<[^>]+data-mark="${role}"[^>]*>`, "g"))].map(m => m[0]);

describe("accepted MFI and GenoPro forms", () => {
  it("freezes the layout-facing perimeter, including the unchanged unknown attachment diamond", () => {
    expect(individualPerimeter(person("alive"), 40)).toEqual({ half: 20, shape: "diamond" });
    expect(individualPerimeter(person("abortion"), 40)).toEqual({ half: 20, shape: "diamond" });
    expect(individualPerimeter(person("miscarriage"), 40)).toEqual({ half: 6, shape: "triangle" });
    expect(individualPerimeter(person("stillborn"), 40)).toEqual({ half: 10, shape: "diamond" });
    expect(individualPerimeter(person("stillborn", "female"), 40)).toEqual({ half: 10, shape: "circle" });
  });
  it("draws a hollow miscarriage circle filling its existing 12-unit box", () => {
    const svg = renderIndividualSymbol(person("miscarriage"), 0, 0, 40);
    expect(svg).toContain('<circle cx="0" cy="0" r="6"');
    expect(svg).not.toContain("<polygon");
  });
  it("draws only a small X for induced abortion", () => {
    const svg = renderIndividualSymbol(person("abortion"), 0, 0, 40);
    expect(marks(svg, "abortion-cross")).toHaveLength(2);
    expect(svg).not.toMatch(/<(rect|circle|polygon)\b/);
    expect(svg).toContain('x1="-6" y1="-6" x2="6" y2="6"');
  });
  it("joins an abortion cross inside its frozen box without moving the descent port", () => {
    const svg = genogram.render("genogram\n  a [male]\n  b [female]\n  a -- b\n    outcome [abortion]");
    expect(marks(svg, "status-attachment")[0]).toContain('x1="0" y1="-20" x2="0" y2="0"');
  });
  it.each(["male", "female", "unknown"] satisfies Individual["sex"][])("uses a small square and corner-to-corner X for stillbirth (%s)", sex => {
    const svg = renderIndividualSymbol(person("stillborn", sex), 0, 0, 40);
    expect(svg).toContain('<rect x="-10" y="-10" width="20" height="20"');
    expect(marks(svg, "stillbirth-cross")).toHaveLength(2);
    expect(svg).not.toContain(">SB<");
  });
  it("keeps pregnancy hollow with a continuous outline", () => {
    const svg = renderIndividualSymbol(person("pregnancy"), 0, 0, 40);
    expect(svg).toContain('points="0,-10 10,10 -10,10"');
    expect(svg).not.toContain("stroke-dasharray");
  });
  it.each(["physical-abuse", "emotional-abuse", "sexual-abuse"] satisfies RelationshipType[])("renders %s as a zigzag reaching the base of its arrow", type => {
    const svg = glyph(type);
    const zigzag = marks(svg, "zigzag")[0];
    expect(zigzag).toBeDefined();
    expect(zigzag).toContain("L 108 0");
    const arrow = marks(svg, "arrow")[0];
    expect(arrow).toContain("L 120 0");
    expect(arrow).toContain(type === "emotional-abuse" ? "arrow-hollow" : "arrow-filled");
    expect(marks(svg, "parallel")).toHaveLength(type === "sexual-abuse" ? 2 : 0);
  });
  it.each([["close-hostile", 2], ["fused-hostile", 3]] as const)("preserves the parallel strokes of %s", (type, count) => {
    expect(marks(glyph(type), "parallel")).toHaveLength(count);
    expect(marks(glyph(type), "zigzag")).toHaveLength(1);
  });
  it.each(["close-hostile", "fused-hostile"] satisfies RelationshipType[])("keeps the %s zigzag inside distinct outer rails", type => {
    const rails = marks(glyph(type), "parallel");
    expect(rails[0]).toContain("M 0 -6");
    expect(rails.at(-1)).toContain("M 0 6");
  });
  it("keeps midpoint marks legible in a native legend swatch", () => {
    for (const type of ["love", "inlove", "admirer", "limerence"] satisfies RelationshipType[]) {
      const svg = renderEmotionalForm("M 0 0 L 20 0", type);
      const radii = [...svg.matchAll(/<circle[^>]*r="([^"]+)"/g)].map(m => Number(m[1]));
      expect(radii.every(radius => radius >= 4)).toBe(true);
    }
    expect(marks(renderEmotionalForm("M 0 0 L 20 0", "distrust"), "tick").length).toBeGreaterThanOrEqual(2);
  });
  it("uses short dashes and no extra conflict hashes", () => {
    expect(glyph("distant")).toContain('stroke-dasharray="4,4"');
    expect(marks(glyph("conflict"), "zigzag")).toHaveLength(1);
    expect(glyph("conflict").match(/<path\b/g)).toHaveLength(1);
    expect(marks(glyph("distant-hostile"), "dashed")).toHaveLength(1);
    expect(marks(glyph("distant-hostile"), "zigzag")).toHaveLength(1);
  });
  it.each([["love", 1], ["inlove", 2], ["admirer", 1], ["limerence", 2]] as const)("draws %s hollow midpoint circles with an interrupted shaft", (type, count) => {
    const svg = glyph(type);
    expect(marks(svg, "circle")).toHaveLength(count);
    expect(marks(svg, "shaft")).toHaveLength(2);
    expect(marks(svg, "arrow")).toHaveLength(["admirer", "limerence"].includes(type) ? 1 : 0);
  });
  it.each(["nevermet", "controlling"] satisfies RelationshipType[])("draws %s as a boxed X", type => {
    expect(marks(glyph(type), "box")).toHaveLength(1);
    expect(marks(glyph(type), "cross")).toHaveLength(2);
  });
  it("draws the remaining GenoPro qualifiers", () => {
    expect(marks(glyph("manipulative"), "cross")).toHaveLength(2);
    expect(marks(glyph("jealous"), "diamond")).toHaveLength(1);
    expect(marks(glyph("distrust"), "tick").length).toBeGreaterThan(4);
    expect(marks(glyph("bestfriends"), "parallel")).toHaveLength(2);
    expect(marks(glyph("bestfriends"), "tick").length).toBeGreaterThan(4);
    expect(glyph("neglect")).toContain('stroke-dasharray="4,4"');
    expect(marks(glyph("neglect"), "arrow")[0]).toContain("arrow-open");
    expect(marks(glyph("focused"), "arrow")[0]).toContain("arrow-filled");
  });
  it("uses the same directed abuse glyphs in the legend and diagram", () => {
    const svg = genogram.render("genogram\n  a [male]\n  b [female]\n  a -emotional-abuse-> b");
    expect(marks(svg, "arrow")).toHaveLength(2);
    expect(svg).not.toContain("transform=\"scale(");
    expect(marks(svg, "arrow").every(mark => !mark.includes('style=') && !mark.includes('stroke="#'))).toBe(true);
  });
  it("retains MFI fill positions independently of the person's sex", () => {
    const conditions = [{ label: "illness", fill: "half-left" }, { label: "substance", fill: "half-bottom" }] satisfies NonNullable<Individual["conditions"]>;
    const defs = getRequiredDefs([{ ...person("alive"), conditions }]);
    expect(defs).toMatch(/id="schematex-genogram-clip-half-left-rect"[^>]*><rect x="0" y="0" width="0.5" height="1"/);
    expect(defs).toMatch(/id="schematex-genogram-clip-half-bottom-rect"[^>]*><rect x="0" y="0.5" width="1" height="0.5"/);
    const svg = renderIndividualSymbol({ ...person("alive"), conditions }, 0, 0, 40);
    expect(svg).toContain("schematex-genogram-condition-outline");
    expect(svg).not.toContain('fill="#333"');
  });
});
