import { describe, expect, it } from "vitest";
import { parseResult, render, renderResult } from "../../src/core/api";
import { renderDsl, validateDsl } from "../../src/ai/tools";
import { getGenerationProfile } from "../../src/ai/profiles";
import {
  findPedigreeCoupleCollisions,
  layoutPedigree,
} from "../../src/diagrams/pedigree/layout";
import { parsePedigree } from "../../src/diagrams/pedigree/parser";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { layoutBlockDiagram } from "../../src/diagrams/blockdiagram/layout";
import { parseTimeline } from "../../src/diagrams/timeline/parser";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { layoutSLD } from "../../src/diagrams/sld/layout";
import { renderSLD } from "../../src/diagrams/sld/renderer";

const PEDIGREE = `pedigree "Diabetes Multi-Generational History"
  I-1 [male, unaffected]
  I-2 [female, unaffected]
  I-3 [male, unaffected]
  I-4 [female, affected]

  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [male, affected]

  I-3 -- I-4
    II-3 [female, unaffected]
    II-4 [male, affected]

  II-1 -- II-3
    III-1 [male, affected, proband]

  II-2 -- II-5 [female, unaffected]
    III-2 [male, unaffected]

  III-2 -- III-3 [female, unaffected]
    IV-1 [male, affected]
    IV-2 [male, affected]
    IV-3 [male, affected]`;

const BROKEN_FLOORPLAN = `floorplan "Sustainable Small Office — 72 m²" unit m
room reception at 0,0 size 3.5x3
room workspace right-of reception size 8.5x6
room meeting below reception size 3.5x3
room kitchenette right-of meeting size 3x3
room bath right-of kitchenette size 2x3
room storage right-of bath size 3.5x3
door between workspace kitchenette at 50%
door between workspace bath at 50%
door between workspace storage at 50%`;

describe("generation quality hardening — render contract", () => {
  it("blocks hard floorplan geometry errors before rendering", () => {
    const parsed = parseResult(BROKEN_FLOORPLAN);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.diagnostics.filter((entry) => entry.code === "floorplan/room-overlap")).toHaveLength(3);
      expect(
        parsed.diagnostics.filter(
          (entry) => entry.code === "floorplan/opening-no-shared-wall"
        )
      ).toHaveLength(3);
    }

    const rendered = renderResult(BROKEN_FLOORPLAN);
    expect(rendered.ok).toBe(false);
    expect(rendered.status).toBe("invalid");
    expect(rendered.svg).toContain('data-schematex-status="invalid"');
    expect(rendered.svg).not.toContain('class="sx-fp-error-line"');

    try {
      render(BROKEN_FLOORPLAN);
      throw new Error("strict render should have thrown");
    } catch (error) {
      expect((error as { code?: string }).code).toBe(
        "floorplan/room-overlap"
      );
    }
  });

  it("keeps floorplan warnings out of exported SVG", () => {
    const dsl = `floorplan "Creative Studio" unit m
room studio at 0,0 size 10x10
furniture round-table-8 in studio at 1,1
furniture round-table-8 in studio at 2,1`;
    const result = renderResult(dsl);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("partial");
    expect(result.diagnostics.some((entry) => entry.severity === "warning")).toBe(true);
    if (result.ok) {
      expect(result.svg).not.toMatch(/<rect[^>]+class="sx-fp-warn-item"/);
      expect(result.svg).not.toContain("overlaps round-table-8");
      expect(result.svg).not.toContain("Warnings:");
    }
  });
});

describe("generation quality hardening — semantic invariants", () => {
  it("keeps disjoint pedigree couples adjacent and collision-free", () => {
    const layout = layoutPedigree(parsePedigree(PEDIGREE), {
      nodeSpacingX: 80,
      nodeSpacingY: 100,
      nodeWidth: 40,
      nodeHeight: 40,
    });
    expect(findPedigreeCoupleCollisions(layout)).toEqual([]);

    const centers = (id: string) => {
      const node = layout.nodes.find((entry) => entry.id === id)!;
      return node.x + node.width / 2;
    };
    expect(Math.abs(centers("ii-1") - centers("ii-3"))).toBeLessThan(100);
    expect(Math.abs(centers("ii-2") - centers("ii-5"))).toBeLessThan(100);
    expect(renderResult(PEDIGREE).status).toBe("valid");
  });

  it("validates breadboard pins before render", () => {
    const dsl = `breadboard
board: half
parts
  c1: cap-elec @5e..5f
wires
  c1:1 --red-- @+t1
  c1:2 --black-- @-t1`;
    const result = validateDsl("breadboard", dsl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("BREADBOARD_UNKNOWN_PIN");
      expect(result.errors[0]?.message).toContain("known pins: +, -");
    }
  });

  it("renders real relay and DS3231 modules with their canonical pins", () => {
    const dsl = `breadboard
board: half
title: "ESP32 + Relay + RTC DS3231"
parts
  esp32: mcu esp32 @beside-left
  relay: module relay @12e
  rtc: module ds3231 @22e
wires
  esp32:D26 --orange-- relay:IN
  esp32:SDA --green-- rtc:SDA
  esp32:SCL --yellow-- rtc:SCL`;
    const result = renderDsl("breadboard", dsl);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("valid");
    if (result.ok) {
      expect(result.svg).toContain("1-CH RELAY");
      expect(result.svg).toContain("COM");
      expect(result.svg).toContain("DS3231");
      expect(result.svg).not.toContain("L298N");
    }
  });

  it("flags obvious breadboard role substitution instead of calling it clean", () => {
    const dsl = `breadboard
board: half
title: "ESP32 + Relay + RTC"
parts
  relay: module l298n @12e
  rtc: dip pins=8 @24e
wires
  relay:IN1 --orange-- @5a`;
    const result = validateDsl("breadboard", dsl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(
        result.warnings.filter(
          (warning) => warning.code === "BREADBOARD_PART_ROLE_MISMATCH"
        )
      ).toHaveLength(2);
    }
  });

  it("renders terminal aliases as real terminal blocks and rejects unknown types", () => {
    const dsl = `circuit "MCU 3.3V to 24V Level Shifter" netlist
V_mcu sig_in 0 3.3Vdc type=vsource label="MCU GPIO"
R1 sig_in base 1k
Q1 collector base 0 type=npn label="2N2222"
R2 Vcc24 collector 10k
V_24 Vcc24 0 24Vdc type=vsource label="24V Supply"
T_out collector 0 type=terminal label="Vout (0–24V)"`;
    const result = renderDsl("circuit", dsl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg).not.toContain("?terminal");
      expect(result.svg).toContain("Vout (0–24V)");
    }

    const unknown = validateDsl(
      "circuit",
      'circuit "bad" netlist\nX1 a b type=flux_capacitor'
    );
    expect(unknown.ok).toBe(false);
  });

  it("renders reserved blockdiagram boundary ids once, as ports", () => {
    const ast = parseBlockDiagram(`blockdiagram "PID Control Loop"
C = block("PID C(s)") [role: controller]
G = block("Plant G(s)") [role: plant]
err = sum(+r, -y)
r = signal("Reference")
y = signal("Output")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`);
    expect(ast.blocks.some((block) => block.id === "in")).toBe(false);
    const layout = layoutBlockDiagram(ast);
    expect(layout.nodes.filter((node) => node.id === "in")).toHaveLength(1);
    expect(layout.nodes.find((node) => node.id === "in")?.kind).toBe("port");
  });
});

describe("generation quality hardening — prompt/parser parity", () => {
  it("accepts multiple timeline config assignments on one line", () => {
    const ast = parseTimeline(`timeline "Release"
config: style = lollipop orientation = vertical scale = equidistant axis = center
2026-07-28: milestone "Ship"`);
    expect(ast.style).toBe("lollipop");
    expect(ast.orientation).toBe("vertical");
    expect(ast.scale).toBe("equidistant");
    expect(ast.axis).toBe("center");
  });

  it("ships canonical network boundary syntax with a required id", () => {
    const profile = getGenerationProfile("network");
    expect(profile.keywords).toContain('ID ["label"]');
    const result = validateDsl("network", profile.forms.join("\n"));
    expect(result.ok).toBe(true);
  });

  it("keeps the SLD title in its own vertical band", () => {
    const ast = parseSLDDSL(`sld "Generator Backup With ATS and Critical Distribution"
UTIL = utility [label: "Utility Feed", voltage: "480V"]
GEN = generator [label: "Diesel Gen-Set", rating: "500 kW"]
ATS1 = ats [label: "Automatic Transfer Switch"]
BUS1 = bus [label: "Critical Bus", voltage: "480V"]
UTIL -> ATS1
GEN -> ATS1
ATS1 -> BUS1`);
    const layout = layoutSLD(ast);
    const svg = renderSLD(ast);
    const transform = /transform="translate\(0, ([\d.]+)\)"/.exec(svg);
    expect(transform).not.toBeNull();
    const contentOffset = Number(transform![1]);
    const firstSourceLabelTop = Math.min(
      ...layout.nodes
        .filter((node) => node.level === 0 && node.nodeType !== "bus")
        .map((node) => node.topY - 22 - 11 + contentOffset)
    );
    expect(firstSourceLabelTop).toBeGreaterThanOrEqual(38);
  });
});
