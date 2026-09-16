import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

/**
 * Every published floorplan example must render correct-by-construction:
 * zero structural errors AND zero collision warnings. The website renders
 * these `dsl:` blocks verbatim, so a regression here ships a broken gallery.
 */

const EXAMPLES_DIR = join(__dirname, "../../website/content/examples");

/** Pull the `dsl: |` literal block out of an example's YAML frontmatter. */
function extractDsl(mdx: string): string {
  const lines = mdx.split("\n");
  const start = lines.findIndex((l) => /^dsl:\s*\|\s*$/.test(l));
  if (start === -1) throw new Error("no `dsl: |` block");
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === "---") break;
    if (l.length > 0 && !/^\s/.test(l)) break; // dedented → end of block
    out.push(l.replace(/^ {2}/, ""));
  }
  return out.join("\n").trim();
}

const files = readdirSync(EXAMPLES_DIR).filter((f) => f.startsWith("floorplan-") && f.endsWith(".mdx"));
const evacuationFiles = readdirSync(EXAMPLES_DIR).filter(
  (f) => f.startsWith("evacuation-") && f.endsWith(".mdx")
);
const stageplotFiles = readdirSync(EXAMPLES_DIR).filter(
  (f) => f.startsWith("stageplot-") && f.endsWith(".mdx")
);

describe("floorplan examples — gallery is correct-by-construction", () => {
  it("has published floorplan examples", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: no errors, no collision warnings`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutFloorplan(parseFloorplan(dsl));
      expect({ file, errors: lay.errors }).toEqual({ file, errors: [] });
      expect({ file, warnings: lay.warnings }).toEqual({ file, warnings: [] });
      expect(renderFloorplan(dsl), `${file}: renders an SVG`).toContain("<svg");
    });
  }
});

describe("evacuation examples — gallery is compliance-checked", () => {
  it("has published evacuation examples", () => {
    expect(evacuationFiles.length).toBeGreaterThan(0);
  });

  it("ships a complete office plan with two routes, exits, extinguishers, assembly, and legend", () => {
    const file = "evacuation-office-floor.mdx";
    const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
    const ast = parseFloorplan(dsl);
    const lay = layoutFloorplan(ast);
    expect(ast.routes.map(({ kind }) => kind)).toEqual(["primary", "secondary"]);
    expect(ast.safety.filter(({ kind }) => kind === "exit-final")).toHaveLength(2);
    expect(ast.safety.filter(({ kind }) => kind === "extinguisher")).toHaveLength(2);
    expect(ast.safety.some(({ kind }) => kind === "assembly")).toBe(true);
    expect(lay.evacuation?.legend.items.map(({ key }) => key).sort()).toEqual(
      expect.arrayContaining([
        "assembly",
        "exit-final",
        "extinguisher",
        "route.primary",
        "route.secondary",
      ])
    );
  });

  for (const file of evacuationFiles) {
    it(`${file}: no errors and no collision warnings`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutFloorplan(parseFloorplan(dsl));
      expect({ file, errors: lay.errors }).toEqual({ file, errors: [] });
      expect(
        lay.warnings.filter((warning) => /overlap|collision/i.test(warning))
      ).toEqual([]);
    });
  }
});

describe("stageplot examples — plot and input list stay one valid tree", () => {
  it("has published stageplot examples", () => {
    expect(stageplotFiles.length).toBeGreaterThan(0);
  });

  for (const file of stageplotFiles) {
    it(`${file}: no errors and a derived input list`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutFloorplan(parseFloorplan(dsl));
      expect({ file, errors: lay.errors }).toEqual({ file, errors: [] });
      expect(lay.stageplot?.inputList.length).toBeGreaterThan(0);
    });
  }
});
