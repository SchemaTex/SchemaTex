import { describe, test, expect } from "vitest";
import { parseTiming, TimingParseError } from "../../src/diagrams/timing/parser";
import type { TimingSignal } from "../../src/core/types";

const sig = (ast: ReturnType<typeof parseTiming>, name: string) =>
  ast.signals.find((s): s is TimingSignal => "name" in s && s.name === name);

describe("timing parser — LLM-friendly forms", () => {
  test("`clock N` expands to N positive clock periods", () => {
    const ast = parseTiming(`timing "t"\nCLK: clock 8`);
    expect(sig(ast, "CLK")?.wave).toBe("pppppppp");
  });

  test("`clock N neg` expands to negedge clock", () => {
    const ast = parseTiming(`timing "t"\nCLK: clock 4 neg`);
    expect(sig(ast, "CLK")?.wave).toBe("nnnn");
  });

  test("`rle` run-length expands segments", () => {
    const ast = parseTiming(`timing "t"\nRST: rle 1*2 0*6`);
    expect(sig(ast, "RST")?.wave).toBe("11000000");
  });

  test("rle supports mixed states", () => {
    const ast = parseTiming(`timing "t"\nD: rle x*1 0*3 z*1`);
    expect(sig(ast, "D")?.wave).toBe("x000z");
  });

  test("raw WaveDrom wave string still works unchanged", () => {
    const ast = parseTiming(`timing "t"\nDATA: x====x data: ["A","B"]`);
    expect(sig(ast, "DATA")?.wave).toBe("x====x");
    expect(sig(ast, "DATA")?.data).toEqual(["A", "B"]);
  });

  test("clock with no count is a readable error", () => {
    expect(() => parseTiming(`timing "t"\nCLK: clock`)).toThrow(TimingParseError);
  });

  test("invalid raw wave names the bad character", () => {
    expect(() => parseTiming(`timing "t"\nBAD: 01q0`)).toThrow(/"q" is not a valid state/);
  });
});
