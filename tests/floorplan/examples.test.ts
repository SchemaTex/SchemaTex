import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";

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

describe("floorplan examples — gallery is correct-by-construction", () => {
  it("covers every floorplan example file", () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  for (const file of files) {
    it(`${file}: no errors, no collision warnings`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutFloorplan(parseFloorplan(dsl));
      expect({ file, errors: lay.errors }).toEqual({ file, errors: [] });
      expect({ file, warnings: lay.warnings }).toEqual({ file, warnings: [] });
    });
  }
});

describe("evacuation examples — gallery is compliance-checked", () => {
  it("ships all six launch examples", () => {
    expect(evacuationFiles).toHaveLength(6);
  });

  it("features the realistic hotel plan instead of the demo-sized office", () => {
    const featured = evacuationFiles.filter((file) =>
      /\nfeatured: true\n/.test(readFileSync(join(EXAMPLES_DIR, file), "utf8"))
    );
    expect(featured).toEqual(["evacuation-hotel-floor.mdx"]);
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
