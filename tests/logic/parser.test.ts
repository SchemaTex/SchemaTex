import { describe, test, expect } from "vitest";
import { parseLogic } from "../../src/diagrams/logic/parser";

describe("Logic parser — undeclared-signal handling", () => {
  test("auto-declares missing signals as inputs and emits a warning", () => {
    const ast = parseLogic(`logic "Motor"
input S_AUF
Motor_AUF = AND(S_AUF)
Motor_ZU = AND(S_ZU)
output Motor_AUF, Motor_ZU
`);
    const ids = ast.inputs.map((i) => i.id);
    expect(ids).toContain("S_AUF");
    expect(ids).toContain("S_ZU");
    const auto = ast.inputs.find((i) => i.id === "S_ZU");
    expect(auto?.autoDeclared).toBe(true);
    const explicit = ast.inputs.find((i) => i.id === "S_AUF");
    expect(explicit?.autoDeclared).toBeUndefined();
    expect(ast.warnings?.some((w) => /S_ZU/.test(w))).toBe(true);
  });

  test("preserves active-low marker on auto-declared signals", () => {
    const ast = parseLogic(`logic "x"
G = AND(~RESET)
output G
`);
    const reset = ast.inputs.find((i) => i.id === "RESET");
    expect(reset?.isActiveLow).toBe(true);
    expect(reset?.autoDeclared).toBe(true);
  });

  test("does not emit warnings when all signals are declared", () => {
    const ast = parseLogic(`logic "x"
input A, B
G = AND(A, B)
output G
`);
    expect(ast.warnings).toBeUndefined();
  });

  test("accepts smart-quote title", () => {
    const ast = parseLogic(`logic “Motor”
input A
G = BUF(A)
output G
`);
    expect(ast.title).toBe("Motor");
  });
});
