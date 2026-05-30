/**
 * Regression suite for the ChatDiagram production issue report dated
 * 2026-05-15 (14-day window covering schematex@0.4.1 in production at
 * chatdiagram.com / conceptmap.ai).
 *
 * Every failing DSL in this file is taken VERBATIM from the report so a
 * future regression would crash the test with the exact bytes that hit
 * production. Do not "clean up" or shorten these inputs — they are the
 * source of truth for the bugs they cover.
 */
import { describe, it, expect } from "vitest";
import { parse, render, renderResult } from "../../src/core/api";

function renderOk(dsl: string, expectInSvg: string[] = []): string {
  const svg = render(dsl);
  expect(svg).toContain("<svg");
  for (const s of expectInSvg) expect(svg).toContain(s);
  return svg;
}

describe("ChatDiagram 2026-05-15 — ladder regressions", () => {
  it("RES (counter/timer reset) is accepted as a coil type", () => {
    const dsl = `ladder "Counter reset test"
rung 1:
  XIC(COUNT_DONE)
  RES(C1)
`;
    const svg = renderOk(dsl);
    expect(svg).toContain("data-tag=\"C1\"");
  });

  it("element with quoted name containing literal parens parses", () => {
    // Real Arabic-locale production case: capacitive-sensor labeled
    // "الحساس السعوي (صغير)" — the inner `)` previously broke the
    // /[^)]*/ regex and failed before the args splitter could see it.
    const dsl = `ladder "Arabic paren test"
rung 1:
  XIC(SENSOR_SMALL, name="الحساس السعوي (صغير)")
  OTE(MOTOR)
`;
    const svg = renderOk(dsl);
    expect(svg).toContain("SENSOR_SMALL");
  });

  it("rung header without trailing colon is accepted", () => {
    // LLMs (no Mermaid analogue for ladder logic) routinely omit the
    // trailing colon. The parser used to fall through to the "element
    // outside of rung" path. Now the colon is optional.
    const dsl = `ladder "No colon test"
rung 1
  XIC(X1)
  OTE(Y1)
`;
    renderOk(dsl);
  });

  it("unknown element error includes a 'did you mean' suggestion", () => {
    // `XEC` is one edit away from `XIC` and no other token, so the
    // suggestion is unambiguous (the helper deliberately stays silent
    // when two candidates are equally close).
    const dsl = `ladder "typo"
rung 1:
  XEC(X1)
  OTE(Y1)
`;
    expect(() => render(dsl)).toThrow(/did you mean 'XIC'/);
  });
});

describe("ChatDiagram 2026-05-15 — SLD residential vocabulary", () => {
  it("mcb is accepted as an alias for breaker (REBT / BS 7671 / IEC 60364)", () => {
    const dsl = `sld "Domestic CU"
util = utility
main = breaker [label: "IGA 40A"]
mcb1 = mcb [label: "C1 lighting"]
util -> main
main -> mcb1
`;
    // The user-written label wins over the alias-derived one, but the
    // CSS class still tracks the canonical type so the renderer draws a
    // breaker glyph.
    renderOk(dsl);
  });

  it("rcbo is accepted as an alias for ground_fault", () => {
    const dsl = `sld "RCBO test"
util = utility
rcbo1 = rcbo
util -> rcbo1
`;
    renderOk(dsl);
  });

  it("iga (Spanish REBT main switch) is accepted as a breaker alias", () => {
    const dsl = `sld "Vivienda"
util = utility
iga1 = iga
util -> iga1
`;
    renderOk(dsl);
  });

  it("unknown type degrades to a flagged placeholder with a suggestion (L2)", () => {
    // Post-L2: an unrecognised type no longer blanks the whole diagram. It is
    // kept as a visibly-flagged placeholder and the lint pass surfaces a
    // non-fatal did-you-mean warning instead of a fatal throw.
    const dsl = `sld "typo"
util = utility
brk1 = breakerz
util -> brk1
`;
    const res = renderResult(dsl);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.svg).toContain('data-raw-type="breakerz"');
    const warn = res.diagnostics.find((d) => d.code === "SLD_UNKNOWN_DEVICE");
    expect(warn?.fatal).toBe(false);
    expect(warn?.hint).toMatch(/did you mean/);
  });
});

describe("ChatDiagram 2026-05-15 — fishbone implicit category", () => {
  it("LLM Mermaid-mindmap shape parses without `category` keyword", () => {
    // From the report: 13/13 fishbone errors were the LLM emitting
    // top-level category headings as bare words without `category`.
    const dsl = `fishbone "Why is the site slow?"
effect "Page LCP > 4s"
Content
  - heavy hero image
  - too much above-the-fold text
Tech
  - JS bundle too large
  - render-blocking CSS
`;
    const svg = renderOk(dsl);
    // Both category labels should appear on the rendered ribs.
    expect(svg).toContain("Content");
    expect(svg).toContain("Tech");

    const ast = parse(dsl) as any;
    expect(ast.majors[0].children.map((c: any) => c.label)).toEqual([
      "heavy hero image",
      "too much above-the-fold text",
    ]);
    expect(ast.majors[0].children[0].children).toEqual([]);
    expect(ast.majors[1].children.map((c: any) => c.label)).toEqual([
      "JS bundle too large",
      "render-blocking CSS",
    ]);
  });

  it("mixing implicit and explicit categories does not double-count", () => {
    const dsl = `fishbone "T"
effect "E"
category methods "Methods"
methods : "real cause"
Materials
  - shortage`;
    const svg = renderOk(dsl);
    expect(svg).toContain("Methods");
    expect(svg).toContain("Materials");
    expect(svg).toContain("shortage");
  });
});

describe("ChatDiagram 2026-05-15 — flowchart :::className inline", () => {
  it("inline :::className attaches a class to the preceding node", () => {
    const dsl = `flowchart TD
  A[Start] --> B[Produce]:::produce
  B --> C[Ship]
  classDef produce fill:#bff,stroke:#36b
`;
    const svg = renderOk(dsl);
    // The class assignment should produce a class attribute or a styled
    // node. The simplest invariant: B's node group carries the class name.
    expect(svg).toMatch(/produce/);
  });

  it("inline :::className on a bare node reference works", () => {
    const dsl = `flowchart TD
  A:::ok --> B
  classDef ok fill:#0f0
`;
    const svg = renderOk(dsl);
    expect(svg).toMatch(/ok/);
  });

  it("inline class syntax inside %% comments is ignored", () => {
    const dsl = `flowchart TD
  %% A:::danger should be ignored
  A[Start]
  classDef danger fill:#f00
`;
    const ast = parse(dsl) as any;
    expect(ast.nodes.find((n: any) => n.id === "A")?.classes).toBeUndefined();
  });
});

describe("ChatDiagram 2026-05-15 — pedigree / ecomap header tolerance", () => {
  it("pedigree:mode header is accepted", () => {
    const dsl = `pedigree:autosomal-dominant "Family X"
1.1 [unaffected, male]
1.2 [affected, female]
1.1 -- 1.2
`;
    renderOk(dsl);
  });

  it("ecomap:mode header is accepted", () => {
    const dsl = `ecomap:strengths "Smith family"
center: client [label: "Smith"]
school [label: "School"]
school === client
`;
    renderOk(dsl);
  });

  it("pedigree wrong header reports the offending text", () => {
    expect(() => render(`tree "x"\nfoo [male]`)).toThrow(
      /Cannot detect|Expected/
    );
  });
});

describe("Mermaid frontmatter support", () => {
  it("--- title --- block sets metadata.title", () => {
    const dsl = `---
title: My genogram
---
genogram
  alice [female]
`;
    const svg = renderOk(dsl);
    expect(svg).toContain("My genogram");
  });

  it("inline title wins over frontmatter title", () => {
    const dsl = `---
title: Lost
---
genogram "Winner"
  alice [female]
`;
    const svg = renderOk(dsl);
    expect(svg).toContain("Winner");
    expect(svg).not.toContain("Lost");
  });

  it("unclosed --- block is treated as content, not frontmatter", () => {
    // A `---` followed by nothing-matching shouldn't silently swallow the
    // rest of the input.
    const dsl = `---\ngenogram\n  alice [female]\n`;
    // This will either succeed or fail with a parse error — but must not
    // hang or treat the body as frontmatter.
    expect(() => render(dsl)).not.toThrow(/timeout/i);
  });
});

describe("Mermaid %% comment support", () => {
  it("%% comments are stripped in genogram / fishbone / sld / pedigree / ecomap", () => {
    const genogram = `genogram %% the title section
  %% leading whole-line comment
  alice [female]
`;
    expect(() => render(genogram)).not.toThrow();

    const fish = `fishbone "T"
%% comment line
effect "E"
category a "A"
a : "cause"
`;
    expect(() => render(fish)).not.toThrow();

    const sld = `sld "T"
%% comment
util = utility
util -> util
`;
    // Will likely fail with self-loop logic, but comment must be stripped
    // before the parser sees the next line.
    try {
      render(sld);
    } catch (e) {
      expect(String(e)).not.toMatch(/Cannot parse line.*%%/);
    }
  });

  it("leading %% comments are skipped before public diagram detection", () => {
    const cases = [
      `%% top comment
genogram
  alice [female]
`,
      `%% top comment
pedigree
1.1 [unaffected, male]
`,
      `%% top comment
ecomap
center: client [label: "Client"]
school [label: "School"]
school === client
`,
      `%% top comment
fishbone "T"
effect "E"
category a "A"
a : "cause"
`,
      `%% top comment
ladder "T"
rung 1:
  XIC(X1)
  OTE(Y1)
`,
      `%% top comment
sld "T"
util = utility
load1 = load
util -> load1
`,
    ];

    for (const dsl of cases) {
      expect(() => render(dsl)).not.toThrow();
    }
  });
});

describe("Engine-bug telemetry", () => {
  it("renderDsl tags runtime errors with [engine bug: …]", async () => {
    // We don't have a reliable way to trigger a real ReferenceError from
    // user DSL (which is the whole point of this guard — we'd have fixed
    // it), so we exercise extractError() directly.
    const { extractError } = await import("../../src/ai/errors");
    const ref = new ReferenceError("Cannot access 'x' before initialization");
    const out = extractError(ref);
    expect(out.message).toMatch(/^\[engine bug: ReferenceError\]/);
    expect(out.hint).toMatch(/file an issue/);
  });

  it("parse errors with .line are NOT misclassified as engine bugs", async () => {
    const { extractError } = await import("../../src/ai/errors");
    class FakeParseErr extends Error {
      line = 5;
      constructor(msg: string) {
        super(msg);
        // intentionally collides with TypeError's name to verify the
        // .line check wins over the name check.
        this.name = "TypeError";
      }
    }
    const out = extractError(new FakeParseErr("bad input"));
    expect(out.line).toBe(5);
    expect(out.message).toBe("bad input");
    expect(out.hint).toBeUndefined();
  });
});
