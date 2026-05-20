import { describe, expect, it } from "vitest";
import { render } from "../../src/core/api";
import { renderPert } from "../../src/diagrams/pert/renderer";

const DIAMOND = `pert
title: "Diamond"
task A "Start" duration: 2
task B "Upper" duration: 6 after: A
task C "Lower" duration: 3 after: A
task D "Finish" duration: 4 after: B, C`;

describe("pert renderer", () => {
  it("auto-detects the pert plugin from render()", () => {
    const svg = render(DIAMOND);
    expect(svg).toContain('data-diagram-type="pert"');
  });

  it("emits a title and a desc that names the critical path", () => {
    const svg = renderPert(DIAMOND);
    expect(svg).toContain("<title>PERT network — Diamond</title>");
    expect(svg).toMatch(/critical path A → B → D/);
  });

  it("mirrors the computed schedule onto data-* attributes", () => {
    const svg = renderPert(DIAMOND);
    expect(svg).toMatch(/data-id="D"[^>]*data-es="8"[^>]*data-ef="12"[^>]*data-ls="8"[^>]*data-lf="12"[^>]*data-slack="0"[^>]*data-critical="true"/);
  });

  it("marks the non-critical activity", () => {
    const svg = renderPert(DIAMOND);
    expect(svg).toMatch(/data-id="C"[^>]*data-slack="3"[^>]*data-critical="false"/);
  });

  it("renders the timescaled axis", () => {
    const svg = renderPert(`pert
layout: timescaled
task A "A" duration: 4
task B "B" duration: 8 after: A`);
    expect(svg).toContain("sx-pert-axis");
  });

  it("carries the three-point triple as a data attribute", () => {
    const svg = renderPert(`pert
critical-tolerance: 0.01
task A "Spec" duration: 2/3/5`);
    expect(svg).toContain('data-pert-triple="2/3/5"');
    expect(svg).toContain("data-pert-variance");
  });

  it("produces valid self-contained SVG markup", () => {
    const svg = renderPert(DIAMOND);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });
});
