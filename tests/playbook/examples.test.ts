import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePlaybook } from "../../src/diagrams/playbook/parser";
import { layoutPlaybook } from "../../src/diagrams/playbook/layout";

/**
 * Every published playbook example must lay out clean — zero structural
 * errors. The website renders these `dsl:` blocks verbatim, so a regression
 * here ships a broken gallery. Warnings are allowed (soft geometry hints) but
 * asserted to be empty for the shipped set, which is hand-tuned.
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

const files = readdirSync(EXAMPLES_DIR).filter((f) => f.startsWith("playbook-") && f.endsWith(".mdx"));

describe("playbook examples — gallery is correct-by-construction", () => {
  it("covers all 15 shipped plays (5 per sport)", () => {
    expect(files.length).toBe(15);
    const sports = { football: 0, basketball: 0, soccer: 0 };
    for (const f of files) {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, f), "utf8"));
      const m = /sport (football|basketball|soccer)/.exec(dsl);
      if (m) sports[m[1] as keyof typeof sports]++;
    }
    expect(sports).toEqual({ football: 5, basketball: 5, soccer: 5 });
  });

  for (const file of files) {
    it(`${file}: no errors, no warnings`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutPlaybook(parsePlaybook(dsl));
      expect({ file, errors: lay.errors }).toEqual({ file, errors: [] });
      expect({ file, warnings: lay.warnings }).toEqual({ file, warnings: [] });
      // every move must resolve to a drawable polyline
      for (const mv of lay.moves) {
        expect(mv.points.length).toBeGreaterThanOrEqual(2);
      }
    });
  }
});
