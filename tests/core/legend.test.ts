import { describe, test, expect } from "vitest";
import { applyLegendOverrides, renderLegend } from "../../src/core/legend";
import { parseLegendDirective } from "../../src/core/legend-parser";
import { resolveBaseTheme } from "../../src/core/theme";
import type { LegendOverrides, LegendSpec } from "../../src/core/types";

const theme = resolveBaseTheme("default");

function makeSpec(): LegendSpec {
  return {
    mode: "auto",
    title: "Legend",
    position: "outside-right",
    columns: 1,
    sections: [
      { id: "a", title: "Group A" },
      { id: "b", title: "Group B" },
    ],
    items: [
      { key: "x", label: "X label", kind: "fill", color: "#f00", section: "a" },
      { key: "y", label: "Y label", kind: "line", color: "#0f0", pattern: "dashed", section: "a" },
      { key: "z", label: "Z label", kind: "shape", shape: "circle", color: "#00f", section: "b" },
    ],
  };
}

// ─── parseLegendDirective ───────────────────────────────────

describe("parseLegendDirective", () => {
  test("recognizes `legend: on`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend: on", ov)).toBe(true);
    expect(ov.mode).toBe("on");
  });

  test("recognizes `legend: off`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend: off", ov)).toBe(true);
    expect(ov.mode).toBe("off");
  });

  test("recognizes position keyword as master shorthand", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend: outside-right", ov)).toBe(true);
    expect(ov.position).toBe("outside-right");
    expect(ov.mode).toBe("on");
  });

  test("recognizes `legend.title:`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective('legend.title: "Family Symbols"', ov)).toBe(true);
    expect(ov.title).toBe("Family Symbols");
  });

  test("recognizes `legend.position:`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend.position: bottom-right", ov)).toBe(true);
    expect(ov.position).toBe("bottom-right");
  });

  test("recognizes `legend.columns:`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend.columns: 2", ov)).toBe(true);
    expect(ov.columns).toBe(2);
  });

  test("recognizes `legend.label <key>:`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective('legend.label close: "Best friends"', ov)).toBe(true);
    expect(ov.labels?.close).toBe("Best friends");
  });

  test("recognizes `legend.hide:` with comma list", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend.hide: distant, normal, cohabiting", ov)).toBe(true);
    expect(ov.hide).toEqual(["distant", "normal", "cohabiting"]);
  });

  test("recognizes `legend.section <id>:` rename", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective('legend.section relationships: "Connection Styles"', ov)).toBe(true);
    expect(ov.sections?.relationships?.title).toBe("Connection Styles");
  });

  test("recognizes `legend.section <id>.hide: true`", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("legend.section heritage.hide: true", ov)).toBe(true);
    expect(ov.sections?.heritage?.hidden).toBe(true);
  });

  test("recognizes `legend.item <id>:` with attrs", () => {
    const ov: LegendOverrides = {};
    expect(
      parseLegendDirective(
        'legend.item dv: "Domestic violence" (kind: line, color: #b71c1c, pattern: zigzag)',
        ov
      )
    ).toBe(true);
    expect(ov.added).toHaveLength(1);
    expect(ov.added![0]).toMatchObject({
      key: "dv",
      label: "Domestic violence",
      kind: "line",
      color: "#b71c1c",
      pattern: "zigzag",
    });
  });

  test("returns false for unrelated lines", () => {
    const ov: LegendOverrides = {};
    expect(parseLegendDirective("john [male, 1950]", ov)).toBe(false);
    expect(parseLegendDirective("# legend in a comment", ov)).toBe(false);
    expect(Object.keys(ov)).toHaveLength(0);
  });
});

// ─── applyLegendOverrides ──────────────────────────────────

describe("applyLegendOverrides", () => {
  test("returns auto spec resolved when no overrides", () => {
    const spec = makeSpec();
    const final = applyLegendOverrides(spec, undefined);
    expect(final.mode).toBe("on");
    expect(final.items).toHaveLength(3);
  });

  test("hides items by key", () => {
    const final = applyLegendOverrides(makeSpec(), { hide: ["x"] });
    expect(final.items.map((i) => i.key)).toEqual(["y", "z"]);
  });

  test("renames items by key", () => {
    const final = applyLegendOverrides(makeSpec(), { labels: { x: "Renamed!" } });
    expect(final.items.find((i) => i.key === "x")?.label).toBe("Renamed!");
  });

  test("renames sections by id", () => {
    const final = applyLegendOverrides(makeSpec(), {
      sections: { a: { title: "Section A!" } },
    });
    expect(final.sections.find((s) => s.id === "a")?.title).toBe("Section A!");
  });

  test("hides whole section and its items", () => {
    const final = applyLegendOverrides(makeSpec(), {
      sections: { a: { hidden: true } },
    });
    expect(final.items.map((i) => i.key)).toEqual(["z"]);
  });

  test("appends added items to a custom section", () => {
    const final = applyLegendOverrides(makeSpec(), {
      added: [{ key: "extra", label: "Extra", kind: "marker", marker: "star" }],
    });
    expect(final.items.find((i) => i.key === "extra")?.section).toBe("custom");
    expect(final.sections.find((s) => s.id === "custom")).toBeTruthy();
  });

  test("mode auto resolves to off when no items remain", () => {
    const empty: LegendSpec = { ...makeSpec(), items: [] };
    expect(applyLegendOverrides(empty, undefined).mode).toBe("off");
  });

  test("explicit mode override wins over auto", () => {
    const final = applyLegendOverrides(makeSpec(), { mode: "off" });
    expect(final.mode).toBe("off");
  });

  test("position override is applied", () => {
    const final = applyLegendOverrides(makeSpec(), { position: "bottom-right" });
    expect(final.position).toBe("bottom-right");
  });
});

// ─── renderLegend ──────────────────────────────────────────

describe("renderLegend", () => {
  test("returns empty for mode off", () => {
    const off: LegendSpec = { ...makeSpec(), mode: "off" };
    const r = renderLegend(off, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).toBe("");
  });

  test("returns empty for position none", () => {
    const none: LegendSpec = { ...makeSpec(), mode: "on", position: "none" };
    const r = renderLegend(none, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).toBe("");
  });

  test("emits a legend group with class schematex-legend", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).toContain('class="schematex-legend"');
    expect(r.svg).toContain('class="schematex-legend-label"');
    // Section titles use schematex-legend-section class
    expect(r.svg).toContain('class="schematex-legend-section"');
  });

  test("does not emit a box border (no schematex-legend-box rect)", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).not.toContain("schematex-legend-box");
  });

  test("renders user-provided title (non-default)", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on", title: "Family Symbols" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).toContain("Family Symbols");
    expect(r.svg).toContain('class="schematex-legend-title"');
  });

  test("does not render the default 'Legend' title text", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on" }; // title = "Legend"
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).not.toContain('class="schematex-legend-title"');
  });

  test("emits per-row data-legend-key", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.svg).toContain('data-legend-key="x"');
    expect(r.svg).toContain('data-legend-key="y"');
    expect(r.svg).toContain('data-legend-key="z"');
  });

  test("section titles are rendered (uppercase)", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    // Sections are emitted in uppercase form for the inline strip layout.
    expect(r.svg).toContain("GROUP A");
    expect(r.svg).toContain("GROUP B");
  });

  test("bottom-inline places bbox below the canvas", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on", position: "bottom-inline" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.bbox.y).toBeGreaterThanOrEqual(600);
  });

  test("legacy `outside-right` is mapped onto a supported position", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on", position: "outside-right" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    // outside-right is aliased to bottom-right (corner overlay).
    expect(r.svg).toContain('class="schematex-legend"');
    expect(r.bbox.x + r.bbox.w).toBeLessThanOrEqual(800);
  });

  test("bottom-right places bbox inside canvas", () => {
    const spec: LegendSpec = { ...makeSpec(), mode: "on", position: "bottom-right" };
    const r = renderLegend(spec, { canvasWidth: 800, canvasHeight: 600 }, theme, {
      fontFamily: "sans-serif",
      fontSize: 12,
    });
    expect(r.bbox.x + r.bbox.w).toBeLessThanOrEqual(800);
    expect(r.bbox.y + r.bbox.h).toBeLessThanOrEqual(600);
  });
});
