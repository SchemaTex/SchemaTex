import { describe, expect, it } from "vitest";
import { renderCausalLoop } from "../../src/diagrams/causalloop/renderer";
import { layoutCausalLoop } from "../../src/diagrams/causalloop/layout";
import { parseCausalLoop } from "../../src/diagrams/causalloop/parser";

const ADOPTION = `causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +
"Adoption rate" -> "Potential adopters" : -
"Potential adopters" -> "Adoption rate" : +
loop R1 "Word of mouth"
loop B1 "Market saturation"`;

describe("causalloop renderer", () => {
  it("emits a well-formed semantic SVG", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('data-diagram-type="causalloop"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('role="img"');
  });

  it("never uses inline style attributes", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("renders boxless variable labels (no rect around variables)", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).toContain('class="sx-cld-var"');
    expect(svg).toContain(">Adopters</text>");
    // The only <rect> is the background.
    const rects = svg.match(/<rect /g) ?? [];
    expect(rects).toHaveLength(1);
  });

  it("renders a polarity glyph for each link (+ and −)", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).toContain('class="sx-cld-polarity"');
    expect(svg).toContain('data-polarity="+"');
    expect(svg).toContain('data-polarity="-"');
    expect(svg).toContain("−"); // U+2212 minus sign rendered for negative links
  });

  it("renders an R/B circular glyph per detected loop with phrases", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).toContain('data-loop="R1"');
    expect(svg).toContain('data-loop="B1"');
    expect(svg).toContain('data-kind="R"');
    expect(svg).toContain('data-kind="B"');
    expect(svg).toContain("Word of mouth");
    expect(svg).toContain("Market saturation");
    expect(svg).toContain('data-circulation=');
  });

  it("renders delay hash marks for delayed links", () => {
    const svg = renderCausalLoop(`cld
A -> B : + delay
B -> A : +`);
    expect(svg).toContain('class="sx-cld-delay"');
    expect(svg).toContain('data-delay="true"');
  });

  it("summarises the analysis in <desc>", () => {
    const svg = renderCausalLoop(ADOPTION);
    const desc = /<desc>([\s\S]*?)<\/desc>/.exec(svg)![1]!;
    expect(desc).toMatch(/reinforcing/);
    expect(desc).toMatch(/balancing/);
    expect(desc).toContain("R1");
    expect(desc).toContain("B1");
  });

  it("is deterministic — identical input yields identical output", () => {
    expect(renderCausalLoop(ADOPTION)).toBe(renderCausalLoop(ADOPTION));
  });

  it("contains no NaN coordinates", () => {
    const svg = renderCausalLoop(ADOPTION);
    expect(svg).not.toContain("NaN");
  });

  it("produces positive finite canvas dimensions", () => {
    const layout = layoutCausalLoop(parseCausalLoop(ADOPTION));
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(Number.isFinite(layout.width)).toBe(true);
    expect(Number.isFinite(layout.height)).toBe(true);
  });
});
