import { describe, test, expect } from "vitest";
import { parsePid } from "../../src/diagrams/pid/parser";
import { lintPid } from "../../src/diagrams/pid/lint";
import { parseResult, renderResult } from "../../src/index";

// L2 — "never blank on one bad token" for P&ID. Unknown equipment KINDs keep a
// flagged placeholder; line-type / instrument-category modifiers degrade to a
// safe default rather than blanking. Real prod-failure tokens used as fixtures.

describe("P&ID graceful degradation — unknown equipment", () => {
  test("parser keeps an unknown equip type instead of throwing", () => {
    const ast = parsePid(`pid "T"\nequip E-1 : exchanger_shell_tube`);
    const e1 = ast.equipment.find((e) => e.id === "E-1");
    expect(e1?.equipType).toBe("unknown");
    expect(e1?.rawType).toBe("exchanger_shell_tube");
  });

  test("renderResult is ok + partial with a flagged placeholder", () => {
    const res = renderResult(`pid "T"\nequip V-1 : vessel_horizontal`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.svg).toContain('data-raw-type="vessel_horizontal"');
  });

  test("lint surfaces PID_UNKNOWN_EQUIP", () => {
    const diags = lintPid(`pid "T"\nequip E-1 : exchanger_shell_tube`);
    const d = diags.find((x) => x.code === "PID_UNKNOWN_EQUIP");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("warning");
    expect(d?.fatal).toBe(false);
    expect(d?.message).toContain("exchanger_shell_tube");
  });

  test("a known equip type stays valid (regression)", () => {
    const res = parseResult(`pid "T"\nequip T-1 : tank_atm`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("valid");
    expect(res.diagnostics).toHaveLength(0);
  });
});

describe("P&ID graceful degradation — modifier defaults", () => {
  test("a dashless instrument tag (PLC) parses", () => {
    const ast = parsePid(`pid "T"\ninst PLC : cr_shared`);
    expect(ast.instruments.find((x) => x.tag === "PLC")).toBeDefined();
  });

  test("an unknown line type degrades to process, not fatal", () => {
    const res = parseResult(
      `pid "T"\nequip A : tank_atm\nequip B : tank_atm\nline s1 from A to B [type: telepathy]`
    );
    expect(res.ok).toBe(true);
  });

  test("an unknown instrument category degrades to field_discrete", () => {
    const ast = parsePid(`pid "T"\ninst FT-9 : quantum_field`);
    const inst = ast.instruments.find((x) => x.tag === "FT-9");
    expect(inst?.category).toBe("field_discrete");
  });
});
