import { describe, expect, test } from "vitest";
import { renderResult } from "../../src/core/api";
import { parseCircuit } from "../../src/diagrams/circuit/parser";

describe("circuit unknown component fallback", () => {
  test.each(["MAX17048", "ESP32", "MT3333", "1N4007"])(
    "%s renders as a neutral labeled box with a structured warning",
    (type) => {
      const result = renderResult(`circuit "unknown part" netlist
U2 sda scl vcc gnd type=${type}`);
      expect(result.ok).toBe(true);
      expect(result.status).toBe("partial");
      expect(result.svg).toContain(type);
      expect(result.svg).not.toContain("schematex-circuit-err");
      expect(result.svg).not.toContain(`?${type}`);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "circuit/unknown-component-type",
          token: type,
          line: 2,
        })
      );
    }
  );

  test("the generic box binds every declared net through numbered pins", () => {
    const ast = parseCircuit(`circuit "fuel gauge" netlist
U2 sda scl vcc gnd type=MAX17048`);
    expect(ast.components.find((component) => component.id === "U2")).toMatchObject({
      componentType: "generic_ic",
      attrs: expect.objectContaining({ ic_label: "MAX17048" }),
    });
    expect(ast.pinMap?.U2).toEqual({
      "1": "sda",
      "2": "scl",
      "3": "vcc",
      "4": "GND",
    });
    for (const net of ["sda", "scl", "vcc", "GND"]) {
      expect(
        ast.nets
          .find((candidate) => candidate.id === net)
          ?.anchors.some((anchor) => /^U2\.[1-4]$/.test(anchor))
      ).toBe(true);
    }
  });

  test.each([
    ["outlet", "mains_socket"],
    ["switch_no", "switch_spst"],
    ["switch_spst_no", "switch_spst"],
    ["prox_sensor", "proximity_sensor"],
    ["gear_ctrl", "generic_ic"],
  ])("honest alias %s resolves to %s", (alias, canonical) => {
    const ast = parseCircuit(`circuit "alias" netlist
U1 a b type=${alias}`);
    expect(ast.components.find((component) => component.id === "U1")?.componentType).toBe(canonical);
    expect(ast.warnings).toBeUndefined();
  });

  test("an unknown positional id:type declaration also gets the labeled box", () => {
    const result = renderResult(`circuit "module"
U2: ESP32 right`);
    expect(result.ok).toBe(true);
    expect(result.svg).toContain("ESP32");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "circuit/unknown-component-type",
        token: "ESP32",
        line: 2,
      })
    );
  });

  test("malformed netlists and unknown statement heads remain fatal", () => {
    expect(() => parseCircuit(`circuit "bad" netlist
U2`)).toThrow(/at least ID \+ one net/);
    expect(() => parseCircuit(`circuit "bad"
mystery a b`)).toThrow(/Unknown component type/);
  });
});
