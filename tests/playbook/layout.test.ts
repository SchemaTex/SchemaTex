import { describe, expect, it } from "vitest";
import { parsePlaybook, PlaybookParseError } from "../../src/diagrams/playbook/parser";
import { layoutPlaybook, sportModule } from "../../src/diagrams/playbook/layout";

const lay = (text: string) => layoutPlaybook(parsePlaybook(text));

describe("playbook — sport dispatch & coordinate models", () => {
  it("football flips y (downfield is up); basketball/soccer do not", () => {
    expect(sportModule("football").yUp).toBe(true);
    expect(sportModule("basketball").yUp).toBe(false);
    expect(sportModule("soccer").yUp).toBe(false);
  });

  it("a football formation places 11 offensive players", () => {
    const r = lay(`playbook "t" sport football\nformation i-form right`);
    expect(r.players.filter((p) => p.side === "offense").length).toBe(11);
  });

  it("a basketball set places 5 numbered players", () => {
    const r = lay(`playbook "t" sport basketball\nset 5-out`);
    const off = r.players.filter((p) => p.side === "offense");
    expect(off.length).toBe(5);
    expect(off.map((p) => p.label).sort()).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("a soccer formation places 11 players incl. a goalkeeper", () => {
    const r = lay(`playbook "t" sport soccer\nformation 4-3-3`);
    const off = r.players.filter((p) => p.side === "offense");
    expect(off.length).toBe(11);
    expect(off.some((p) => p.pos === "gk")).toBe(true);
  });
});

describe("playbook — per-sport line-style semantics (the inversion)", () => {
  it("basketball: pass is dashed, cut is solid", () => {
    const r = lay(`playbook "t" sport basketball\nset 5-out\npass 1 2\ncut 1 rim`);
    const pass = r.moves.find((m) => m.kind === "pass")!;
    const cut = r.moves.find((m) => m.kind === "cut")!;
    expect(pass.style).toBe("dashed");
    expect(cut.style).toBe("solid");
  });

  it("soccer inverts it: pass is solid, run is dashed", () => {
    const r = lay(`playbook "t" sport soccer\nformation 4-3-3\npass 1 4\nrun 4 to 40,20`);
    const pass = r.moves.find((m) => m.kind === "pass")!;
    const run = r.moves.find((m) => m.kind === "run")!;
    expect(pass.style).toBe("solid");
    expect(run.style).toBe("dashed");
  });

  it("dribble is wavy in every sport; soccer shot is a double line", () => {
    const bb = lay(`playbook "t" sport basketball\nset 5-out\ndribble 1 to 0,10`);
    expect(bb.moves.find((m) => m.kind === "dribble")!.style).toBe("wavy");
    const sc = lay(`playbook "t" sport soccer\nformation 4-3-3\nshot 9 to 105,34`);
    expect(sc.moves.find((m) => m.kind === "shot")!.style).toBe("double");
  });
});

describe("playbook — football named routes & red zone", () => {
  it("a named route resolves to a multi-point polyline with an arrow", () => {
    const r = lay(`playbook "t" sport football\nformation spread\nroute X corner 12`);
    const route = r.moves.find((m) => m.player === "X")!;
    expect(route.points.length).toBeGreaterThanOrEqual(2);
    expect(route.end).toBe("arrow");
  });

  it("`goal N` extends the field window past the goal line for the end zone", () => {
    const r = lay(`playbook "t" sport football\nfield los 5 goal 5\nformation i-form`);
    expect(r.toGoal).toBe(5);
    expect(r.bounds.maxY).toBeGreaterThan(5);
  });
});

describe("playbook — validation", () => {
  it("rejects an unknown sport", () => {
    expect(() => parsePlaybook(`playbook "t" sport cricket`)).toThrow(PlaybookParseError);
  });

  it("rejects an unknown formation", () => {
    expect(() => parsePlaybook(`playbook "t" sport football\nformation 5-wide-banana`)).toThrow(
      PlaybookParseError,
    );
  });

  it("warns and skips a move that references an undeclared player", () => {
    const r = lay(`playbook "t" sport basketball\nset 5-out\npass 1 99`);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.moves.some((m) => m.kind === "pass")).toBe(false);
  });
});
