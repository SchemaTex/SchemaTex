import { describe, test, expect } from "vitest";
import { renderResult } from "../../src/core/api";
import { mindmap } from "../../src/diagrams/mindmap";

/**
 * `#` opens a comment in most grammars but heads the root topic in mindmap's
 * markdown form. Detection tells them apart structurally: a mindmap document is
 * nothing but headings and bullets, while a commented diagram carries its own
 * statements underneath.
 */
describe("`#` first line: comment vs mindmap root", () => {
  test("a commented P&ID is not claimed by mindmap", () => {
    const src = ['# Crude oil desalter train', 'pid', 'tank T-101 "Crude"'].join("\n");
    expect(mindmap.detect(src)).toBe(false);
    expect(renderResult(src).type).toBe("pid");
  });

  test("a commented escape plan is not claimed by mindmap", () => {
    const src = [
      "# ISO 23601 office escape plan",
      'evacuation "Office" unit m',
      'room office "Open Office" at 0,0 size 7x5',
    ].join("\n");
    expect(mindmap.detect(src)).toBe(false);
  });

  test("a commented fishbone keeps its bullets", () => {
    const src = [
      "# Why conversion dropped in Q3",
      "fishbone",
      'spine "Conversion drop"',
      'bone "Checkout"',
      "- Card declines",
    ].join("\n");
    expect(mindmap.detect(src)).toBe(false);
    expect(renderResult(src).type).toBe("fishbone");
  });

  test("heading-only and bullet-only mindmaps still detect", () => {
    expect(mindmap.detect("# Product Strategy\n## Growth\n### Referral")).toBe(true);
    expect(mindmap.detect("# Product Strategy\n- Growth\n  - Referral")).toBe(true);
    expect(mindmap.detect("# A lone root")).toBe(true);
    expect(mindmap.detect("%% style: logic-right\n# Root\n## A")).toBe(true);
    expect(mindmap.detect("mindmap\n# Root\n## A")).toBe(true);
  });

  test("a mindmap survives the full render path", () => {
    expect(renderResult("# Product Strategy\n## Growth\n## Retention").type).toBe("mindmap");
  });
});
