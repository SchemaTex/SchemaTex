import { describe, expect, it } from "vitest";
import { renderEventTree } from "../../src/diagrams/eventtree/renderer";
import { eventtree } from "../../src/diagrams/eventtree";

const LOCA = `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects"          p: 0.001
  function B "Containment spray"     p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`;

describe("eventtree renderer", () => {
  it("emits a well-formed svg root tagged as eventtree", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).toContain("<svg");
    expect(svg).toContain('data-diagram-type="eventtree"');
    expect(svg).toContain("</svg>");
  });

  it("includes accessible <title> and <desc>", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).toContain("<title>Loss of coolant accident</title>");
    expect(svg).toContain("<desc>");
    // The <desc> carries the computed outcome roll-up.
    expect(svg).toMatch(/Core damage:/);
  });

  it("renders the header band columns + the Outcome / Frequency headers", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).toContain("Initiating Event");
    expect(svg).toContain(">Outcome<");
    expect(svg).toContain(">Frequency<");
    expect(svg).toContain("ECCS injects");
  });

  it("renders each outcome leaf with its computed frequency in data-*", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).toContain('data-outcome="Core damage"');
    // Core damage = 1e-4 · 0.001 = 1e-7 (carried as the raw product in data-*,
    // shown formatted as 1.000e-7 in the visible Frequency column).
    expect(svg).toContain('data-outcome="Core damage" data-frequency="1e-7"');
    expect(svg).toContain(">1.000e-7");
    expect(svg).toContain('data-seq="4"');
  });

  it("marks the dominant sequence with data-dominant", () => {
    const svg = renderEventTree(LOCA);
    // The all-success OK leaf dominates.
    expect(svg).toMatch(/data-outcome="OK"[^>]*data-frequency="[^"]*"[^>]*data-dominant="true"/);
  });

  it("draws dashed column gridlines and success/failure step edges", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).toContain('class="sx-et-grid"');
    expect(svg).toContain('data-leg="s"');
    expect(svg).toContain('data-leg="f"');
    expect(svg).toContain("Success (1s)");
    expect(svg).toContain("Failure (1f)");
  });

  it("uses no inline style attributes (themeable classes only)", () => {
    const svg = renderEventTree(LOCA);
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("renders monochrome and dark themes without throwing", () => {
    expect(() => renderEventTree(LOCA, { theme: "monochrome" } as never)).not.toThrow();
    expect(() => renderEventTree(LOCA, { theme: "dark" } as never)).not.toThrow();
  });

  it("plugin detect matches eventtree and eta headers only", () => {
    expect(eventtree.detect("eventtree foo")).toBe(true);
    expect(eventtree.detect("  eta\n...")).toBe(true);
    expect(eventtree.detect("faulttree x")).toBe(false);
    expect(eventtree.detect("metadata")).toBe(false); // must not match the eta substring mid-word
  });
});
