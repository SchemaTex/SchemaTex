import { describe, test, expect } from "vitest";
import { lintCircuit } from "../../src/diagrams/circuit/lint";
import { renderResult } from "../../src/core/api";

const codes = (dsl: string) => lintCircuit(dsl).map((d) => d.code);

describe("circuit ERC — duplicate id", () => {
  test("flags a reference designator declared twice", () => {
    const diags = lintCircuit(
      'circuit "dup" netlist\nV1 vin 0 5V\nR1 vin out 1k\nR1 out 0 2k'
    );
    const dup = diags.find((d) => d.code === "CIRCUIT_DUPLICATE_ID");
    expect(dup).toBeDefined();
    expect(dup!.severity).toBe("error");
    expect(dup!.fatal).toBe(false);
    expect(dup!.message).toContain("R1");
  });

  test("does not flag the auto-synthesized ground id", () => {
    // GND reference auto-creates a `_GND0` ground symbol — must not count as dup.
    const diags = lintCircuit('circuit "g" netlist\nV1 vin 0 5V\nR1 vin 0 1k');
    expect(diags.map((d) => d.code)).not.toContain("CIRCUIT_DUPLICATE_ID");
  });

  test("unique ids produce no duplicate warning", () => {
    expect(
      codes('circuit "ok" netlist\nV1 vin 0 5V\nR1 vin out 1k\nR2 out 0 2k')
    ).not.toContain("CIRCUIT_DUPLICATE_ID");
  });
});

describe("circuit ERC — no ground reference", () => {
  test("source present but never grounded is flagged", () => {
    const diags = lintCircuit('circuit "fly" netlist\nV1 a b 5V\nR1 b a 1k');
    const ng = diags.find((d) => d.code === "CIRCUIT_NO_GROUND");
    expect(ng).toBeDefined();
    expect(ng!.message).toContain("V1");
  });

  test("grounded circuit is clean", () => {
    expect(
      codes('circuit "ok" netlist\nV1 vin 0 5V\nR1 vin 0 1k')
    ).not.toContain("CIRCUIT_NO_GROUND");
  });

  test("a source-less network is not forced to have ground", () => {
    expect(
      codes('circuit "passive" netlist\nR1 a b 1k\nR2 b c 1k')
    ).not.toContain("CIRCUIT_NO_GROUND");
  });
});

describe("circuit ERC — floating net", () => {
  test("a net touched by only one pin is flagged", () => {
    // R1.end -> `n_load` goes nowhere else (and matches no port/rail convention).
    const diags = lintCircuit(
      'circuit "fl" netlist\nV1 vin 0 5V\nR1 vin n_load 1k'
    );
    const fl = diags.find((d) => d.code === "CIRCUIT_FLOATING_NET");
    expect(fl).toBeDefined();
    expect(fl!.message).toContain('"n_load"');
  });

  test("a fully wired divider has no floating nets", () => {
    expect(
      codes('circuit "div" netlist\nV1 vin 0 5V\nR1 vin mid 10k\nR2 mid 0 10k')
    ).not.toContain("CIRCUIT_FLOATING_NET");
  });

  test("single-pin reference symbols (port) are not floating", () => {
    expect(
      codes(
        'circuit "p" netlist\nV1 vin 0 5V\nR1 vin out 1k\nP1 out type=port'
      )
    ).not.toContain("CIRCUIT_FLOATING_NET");
  });
});

describe("circuit ERC — conventional open nets (rails + ports)", () => {
  // Textbook/EDA convention: power-rail flags and labeled I/O ports are
  // single-pin nets *by design* (opamp supplies are routinely not drawn).
  // These were the dominant production false positives: `vcc`/`vee` on the
  // supply sources and `out` on the load.
  test("supply rails declared only on their source are not floating", () => {
    const dsl =
      'circuit "amp" netlist\nV1 vcc 0 +12V\nV2 0 vee value=12V\nR1 sig amp_out 10k\nVin sig 0 type=ac value=1Vpp\nU1 0 sig amp_out type=opamp\nRload amp_out 0 1k';
    const diags = lintCircuit(dsl);
    expect(
      diags.filter((d) => d.code === "CIRCUIT_FLOATING_NET")
    ).toHaveLength(0);
  });

  test("an open output port named `out` is not floating", () => {
    expect(
      codes('circuit "o" netlist\nV1 vin 0 5V\nR1 vin out 1k')
    ).not.toContain("CIRCUIT_FLOATING_NET");
  });

  test("voltage-literal rails (3V3, +5V) and numbered ports (out2, sda1) pass", () => {
    const dsl =
      'circuit "mcu" netlist\nV1 3V3 0 3.3V\nR1 a out2 1k\nR2 a sda1 4k7\nV2 a 0 5V';
    expect(codes(dsl)).not.toContain("CIRCUIT_FLOATING_NET");
  });

  test("underscore port suffixes (pwm_in, sig_out) pass", () => {
    const dsl =
      'circuit "io" netlist\nV1 a 0 5V\nR1 a pwm_in 1k\nR2 a sig_out 1k';
    expect(codes(dsl)).not.toContain("CIRCUIT_FLOATING_NET");
  });

  test("non-conventional dangling names (base1, gate) are still flagged", () => {
    const diags = lintCircuit(
      'circuit "q" netlist\nV1 a 0 5V\nR1 a base1 1k\nR2 a gate 1k'
    );
    const floats = diags.filter((d) => d.code === "CIRCUIT_FLOATING_NET");
    expect(floats.map((d) => d.message).join(" ")).toContain('"base1"');
    expect(floats.map((d) => d.message).join(" ")).toContain('"gate"');
  });

  test("conventional open nets keep render status `valid`", () => {
    const r = renderResult(
      'circuit "ok" netlist\nV1 vcc 0 5V\nR1 vcc out 1k\nR2 vcc 0 2k'
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe("valid");
  });
});

describe("circuit ERC — net-name typo", () => {
  test("a dangling net one edit from a wired net is reported as a typo, not floating", () => {
    // `vot` is one deletion from the wired `vout` node.
    const diags = lintCircuit(
      'circuit "typo" netlist\nV1 vin 0 5V\nR1 vin vout 10k\nR2 vout 0 10k\nC1 vot 0 100n'
    );
    const codesList = diags.map((d) => d.code);
    expect(codesList).toContain("CIRCUIT_NET_TYPO");
    const typo = diags.find((d) => d.code === "CIRCUIT_NET_TYPO")!;
    expect(typo.message).toContain('"vot"');
    expect(typo.message).toContain('"vout"');
    // the same net must not also be double-reported as generically floating
    expect(
      diags.filter(
        (d) => d.code === "CIRCUIT_FLOATING_NET" && d.message.includes('"vot"')
      )
    ).toHaveLength(0);
  });
});

describe("circuit ERC — status + non-fatal integration", () => {
  test("ERC findings make render partial, never invalid, and SVG still renders", () => {
    const r = renderResult('circuit "fly" netlist\nV1 a b 5V\nR1 b a 1k');
    expect(r.ok).toBe(true);
    expect(r.status).toBe("partial");
    expect(r.svg).toContain("<svg");
  });

  test("a clean grounded circuit reports valid", () => {
    const r = renderResult(
      'circuit "ok" netlist\nV1 vin 0 5V\nR1 vin mid 10k\nR2 mid 0 10k'
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe("valid");
  });
});
