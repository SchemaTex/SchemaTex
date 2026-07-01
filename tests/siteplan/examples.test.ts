import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSiteplan } from "../../src/diagrams/siteplan/parser";
import { layoutSiteplan } from "../../src/diagrams/siteplan/layout";
import { renderSiteplan } from "../../src/diagrams/siteplan/renderer";

const EXAMPLES_DIR = join(__dirname, "../../website/content/examples");

function extractDsl(mdx: string): string {
  const lines = mdx.split("\n");
  const start = lines.findIndex((l) => /^dsl:\s*\|\s*$/.test(l));
  if (start === -1) throw new Error("no `dsl: |` block");
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === "---") break;
    if (l.length > 0 && !/^\s/.test(l)) break;
    out.push(l.replace(/^ {2}/, ""));
  }
  return out.join("\n").trim();
}

const files = readdirSync(EXAMPLES_DIR).filter((f) => f.startsWith("siteplan-") && f.endsWith(".mdx"));

describe("siteplan examples", () => {
  it("covers the initial example set", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    it(`${file}: parses, lays out, and renders`, () => {
      const dsl = extractDsl(readFileSync(join(EXAMPLES_DIR, file), "utf8"));
      const lay = layoutSiteplan(parseSiteplan(dsl));
      expect({ file, warnings: lay.warnings }).toEqual({ file, warnings: [] });
      expect(renderSiteplan(dsl)).toContain("<svg");
    });
  }
});
