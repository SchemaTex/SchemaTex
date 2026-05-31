import { describe, test, expect } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { lintCircuit } from "../../src/diagrams/circuit/lint";
import { getSymbol } from "../../src/diagrams/circuit/symbols";
import { renderResult } from "../../src/core/api";

describe("circuit under-specified net degradation", () => {
  test("a 4-pin transformer given 2 nets renders with floating pins instead of throwing", () => {
    const ast = parseNetlist("V1 vin 0 5V\nTR1 vin 0 type=transformer");
    expect(ast.recovered?.underspecified?.length).toBe(1);
    const u = ast.recovered!.underspecified![0];
    expect(u).toMatchObject({ id: "TR1", type: "transformer", expected: 4, got: 2 });
    // every declared pin is bound (the two missing ones to floating nets)
    expect(Object.keys(ast.pinMap!.TR1!).length).toBe(4);
  });

  test("lint surfaces the under-specified component as a warning", () => {
    const diags = lintCircuit('circuit "t" netlist\nV1 vin 0 5V\nTR1 vin 0 type=transformer');
    expect(diags.length).toBe(1);
    expect(diags[0].code).toBe("CIRCUIT_PIN_UNDERSPECIFIED");
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("TR1");
  });

  test("end-to-end render reports partial, not invalid", () => {
    const r = renderResult('circuit "t" netlist\nV1 vin 0 5V\nTR1 vin 0 type=transformer');
    expect(r.ok).toBe(true);
    expect(r.status).toBe("partial");
    expect(r.svg).toContain("<svg");
  });

  test("fully-specified components are unaffected (no recovery flag)", () => {
    const ast = parseNetlist("V1 vin 0 5V\nTR1 vin 0 out 0 type=transformer");
    expect(ast.recovered).toBeUndefined();
  });
});

describe("circuit previously-missing glyph coverage", () => {
  // Types declared in CircuitComponentType that used to render as a dashed
  // `?type` placeholder. Each must now resolve to a real SymbolDef.
  const NEW_GLYPHS = [
    "varistor", "fuse_slow", "inductor_iron", "inductor_ferrite", "ferrite_bead",
    "varactor", "tvs_diode", "bridge_rectifier", "darlington_npn", "darlington_pnp",
    "nmos_depletion", "igbt", "scr", "triac", "diac", "phototransistor",
    "optocoupler", "schmitt_buffer", "tri_state_buffer", "instrumentation_amp",
    "dc_dc_converter", "switch_dpdt", "oscilloscope", "port",
  ];

  test.each(NEW_GLYPHS)("%s has a drawn symbol (not a placeholder)", (type) => {
    const sym = getSymbol(type);
    expect(sym, `${type} should have a SymbolDef`).toBeDefined();
    const svg = sym!.svg("L", "v", {});
    expect(svg.length).toBeGreaterThan(0);
    expect(svg).not.toContain("schematex-circuit-err");
  });

  test("a netlist using new glyphs renders without any ?type placeholder", () => {
    const r = renderResult(
      'circuit "demo" netlist\nV1 in 0 5V\nU1 in 0 type=scr\nU2 in 0 type=diac\nU3 in 0 type=igbt'
    );
    expect(r.ok).toBe(true);
    expect(r.svg).not.toMatch(/>\?(scr|diac|igbt)</);
  });
});
