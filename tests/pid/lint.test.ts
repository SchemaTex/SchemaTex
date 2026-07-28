import { describe, test, expect } from "vitest";
import { lintPid } from "../../src/diagrams/pid/lint";
import { parseResult } from "../../src/index";

// ─── B-3: ISA-5.1 instrument-loop completeness lint ────────────

describe("loop completeness", () => {
  test("transmitter that measures but reaches no receiver is flagged", () => {
    const diags = lintPid(
      `pid "Test"\nequip T-1 : tank_atm\ninst FT-1 : field_discrete\n  measures L1`
    );
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe("PID_LOOP_INCOMPLETE");
    expect(diags[0].message).toBe(
      "transmitter FT-1 has no signal path to a receiving instrument"
    );
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].fatal).toBe(false);
  });

  test("a complete transmitter→controller loop produces no warning", () => {
    const diags = lintPid(
      `pid "Test"\ninst FT-1 : field_discrete\n  measures L1\ninst FIC-1 : cr_shared\nline s1 from FT-1 to FIC-1 [type: electric]`
    );
    expect(diags).toHaveLength(0);
  });

  test("a transmitter may feed an alarm instead of a controller", () => {
    const diags = lintPid(
      `pid "Test"\ninst PT-1 : field_discrete\n  measures V-1\ninst PAHH-1 : cr_shared\nline s1 from PT-1 to PAHH-1 [type: electric]`
    );
    expect(diags).toHaveLength(0);
  });

  test("a standalone process switch does not promise an outgoing signal", () => {
    const diags = lintPid(
      `pid "Test"\ninst PSHH-1 : field_discrete\n  measures V-1`
    );
    expect(diags).toHaveLength(0);
  });

  test("controllers themselves are not required to reach another controller", () => {
    const diags = lintPid(
      `pid "Test"\nequip V-1 : valve_control\ninst FIC-1 : cr_shared\n  controls V-1`
    );
    expect(diags.filter((d) => d.code === "PID_LOOP_INCOMPLETE")).toHaveLength(0);
  });
});

describe("signal-type vs device-type consistency", () => {
  test("transmitter→controller on a pneumatic line is flagged (should be electric)", () => {
    const diags = lintPid(
      `pid "Test"\ninst FT-1 : field_discrete\n  measures L1\ninst FIC-1 : cr_shared\nline s1 from FT-1 to FIC-1 [type: pneumatic]`
    );
    const mismatch = diags.find((d) => d.code === "PID_SIGNAL_TYPE_MISMATCH");
    expect(mismatch).toBeDefined();
    expect(mismatch!.message).toContain("should be 'electric'");
  });

  test("controller→control-valve on an electric line is flagged (should be pneumatic)", () => {
    const diags = lintPid(
      `pid "Test"\nequip V-1 : valve_control\ninst FIC-1 : cr_shared\n  controls V-1\ninst FT-1 : field_discrete\n  measures L1\nline s0 from FT-1 to FIC-1 [type: electric]\nline s1 from FIC-1 to V-1 [type: electric]`
    );
    const mismatch = diags.find(
      (d) =>
        d.code === "PID_SIGNAL_TYPE_MISMATCH" &&
        d.message.includes("should be 'pneumatic'")
    );
    expect(mismatch).toBeDefined();
  });

  test("a correctly-typed loop produces no mismatch warnings", () => {
    const diags = lintPid(
      `pid "Test"\nequip V-1 : valve_control\ninst FT-1 : field_discrete\n  measures L1\ninst FIC-1 : cr_shared\n  controls V-1\nline s0 from FT-1 to FIC-1 [type: electric]\nline s1 from FIC-1 to V-1 [type: pneumatic]`
    );
    expect(diags).toHaveLength(0);
  });
});

describe("integration via parseResult", () => {
  test("warnings surface as diagnostics with status 'partial'", () => {
    const r = parseResult(
      `pid "Test"\nequip T-1 : tank_atm\ninst FT-1 : field_discrete\n  measures L1`
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe("partial");
    expect(r.diagnostics.some((d) => d.code === "PID_LOOP_INCOMPLETE")).toBe(true);
  });

  test("a clean diagram stays 'valid'", () => {
    const r = parseResult(
      `pid "Test"\ninst FT-1 : field_discrete\n  measures L1\ninst FIC-1 : cr_shared\nline s1 from FT-1 to FIC-1 [type: electric]`
    );
    expect(r.status).toBe("valid");
    expect(r.diagnostics).toHaveLength(0);
  });
});
