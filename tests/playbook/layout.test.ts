import { describe, expect, it } from "vitest";
import { PLAYBOOK_TOKENS } from "../../src/core/theme";
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

it("court actions follow updated player positions while passes do not move players", () => {
  const r = lay(`playbook "Movement sequence" sport basketball
set 5-out
pass 1 2
cut 1 elbow
pass 2 1
shot 1`);
  const [first, cut, back, shot] = r.moves;
  expect(cut.points[0]).toEqual(first.points[0]);
  expect(back.points.at(-1)).toEqual(cut.points.at(-1));
  expect(shot.points[0]).toEqual(cut.points.at(-1));
  expect(r.players.find(p => p.id === "1")?.y).not.toBe(shot.points[0].y);
});

it("football assignments still start at the formation, independent of declaration order", () => {
  const r = lay(`playbook "Assignments" sport football
formation spread
route X corner 12
route X post 8`);
  expect(r.moves[0].points[0]).toEqual(r.moves[1].points[0]);
});

it("NBA foul-line landmarks are measured from the baseline, not the backboard", () => {
  const court = sportModule("basketball");
  expect(court.resolveLandmark?.("ft")).toEqual({ x: 0, y: 19 });
  expect(court.resolveLandmark?.("elbow")).toEqual({ x: 8, y: 19 });
  expect(court.resolveLandmark?.("rim")).toEqual({ x: 0, y: 5.25 });
});

it("a basket cut leaves a receiving position before the rim and a visible finishing shot", () => {
  const r = lay(`playbook "Basket approach" sport basketball
set 5-out
cut 2 basket
pass 1 2
shot 2`);
  const [cut, pass, shot] = r.moves;
  expect(pass.points.at(-1)).toEqual(cut.points.at(-1));
  expect(shot.points[0]).toEqual(cut.points.at(-1));
  const end = shot.points.at(-1)!;
  expect(Math.hypot(end.x - shot.points[0].x, end.y - shot.points[0].y)).toBeCloseTo(3, 1);
});


it("football painted yard lines stay on absolute five-yard marks when LOS is off-grid", () => {
  const layout = lay('playbook "Off-grid" sport football\nfield los 37 hash nfl\nformation spread');
  const svg = sportModule("football").drawField(layout, { X: (x) => x, Y: (y) => y, px: (v) => v }, PLAYBOOK_TOKENS.default);
  const lines = [...svg.matchAll(/<line[^>]*class="sx-pb-yard"[^>]*>/g)].map(([tag]) => Number(/y1="([^"]+)"/.exec(tag)![1]));
  expect(lines).toContain(3); // absolute 40
  expect(lines).toContain(-2); // absolute 35
  expect(lines).not.toContain(0); // LOS 37 is an overlay, not a painted yard line
});
