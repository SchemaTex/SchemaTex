import { describe, expect, it } from "vitest";
import { parsePetri } from "../../src/diagrams/petri/parser";
import { layoutPetri } from "../../src/diagrams/petri/layout";

const layout = (dsl: string) => layoutPetri(parsePetri(dsl));

describe("petri layout — structure & dynamics", () => {
  it("TC-1: minimal P→T→P lays out in flow order and enables T1", () => {
    const r = layout(`petri
  place P1 *1
  transition T1
  place P2
  P1 -> T1
  T1 -> P2`);
    const P1 = r.places.find((p) => p.place.id === "P1")!;
    const P2 = r.places.find((p) => p.place.id === "P2")!;
    const T1 = r.transitions.find((t) => t.transition.id === "T1")!;
    // lr: increasing cx along the flow
    expect(P1.cx).toBeLessThan(T1.cx);
    expect(T1.cx).toBeLessThan(P2.cx);
    expect(T1.enabled).toBe(true);
    expect(r.enabledIds).toEqual(["T1"]);
    expect(P1.isSource).toBe(true);
    expect(P2.isSink).toBe(true);
    expect(P1.tokens).toBe(1);
  });

  it("TC-2: the classic net reverses the feedback arc and disables T2", () => {
    const r = layout(`petri "classic"
  place P1 *1
  place P2
  place P3 *2
  place P4 *1
  transition T1
  transition T2
  P1 -> T1
  T1 -> P2
  T1 -> P3
  P2 -> T2
  P3 -> T2
  T2 -> P4
  P4 -> T1`);
    expect(r.enabledIds).toEqual(["T1"]); // T2 not enabled (P2 empty)
    expect(r.transitions.find((t) => t.transition.id === "T2")!.enabled).toBe(false);
    expect(r.places.find((p) => p.place.id === "P3")!.tokens).toBe(2);
    const back = r.arcs.find((a) => a.arc.from === "P4" && a.arc.to === "T1")!;
    expect(back.reversed).toBe(true);
    expect(back.points.length).toBe(4); // routed as a bowed back-edge
  });

  it("TC-3: capacity place + timed transition carry through layout", () => {
    const r = layout(`petri
  place Buffer capacity: 3
  place Src *5
  transition gen
  transition take timed rate: 0.8
  place Out
  Src -> gen
  gen -> Buffer
  Buffer -> take
  take -> Out`);
    expect(r.places.find((p) => p.place.id === "Buffer")!.place.capacity).toBe(3);
    const take = r.transitions.find((t) => t.transition.id === "take")!;
    expect(take.transition.kind).toBe("timed");
    expect(take.transition.rate).toBeCloseTo(0.8);
    expect(r.transitions.find((t) => t.transition.id === "gen")!.enabled).toBe(true);
  });

  it("TC-4: inhibitor arc enables its transition only while the place is empty", () => {
    const enabled = layout(`petri
  place Lock
  place Work *1
  transition run
  place Done
  Work -> run
  run -> Done
  Lock -o run`);
    expect(enabled.transitions.find((t) => t.transition.id === "run")!.enabled).toBe(true);

    const blocked = layout(`petri
  place Lock *1
  place Work *1
  transition run
  place Done
  Work -> run
  run -> Done
  Lock -o run`);
    expect(blocked.transitions.find((t) => t.transition.id === "run")!.enabled).toBe(false);
  });

  it("TC-5: a fire sequence renders the resulting marking", () => {
    const r = layout(`petri
  place P1 *1
  transition T1
  place P2
  transition T2
  place P3
  P1 -> T1
  T1 -> P2
  P2 -> T2
  T2 -> P3
  fire: T1`);
    expect(r.places.find((p) => p.place.id === "P1")!.tokens).toBe(0);
    expect(r.places.find((p) => p.place.id === "P2")!.tokens).toBe(1);
    expect(r.places.find((p) => p.place.id === "P3")!.tokens).toBe(0);
    expect(r.enabledIds).toEqual(["T2"]); // T1 no longer enabled after firing
  });

  it("detects a workflow-net subclass", () => {
    const r = layout(`petri
  place i *1
  transition t
  place o
  i -> t
  t -> o`);
    expect(r.subclass).toContain("workflow net");
  });

  it("respects tb direction (flow runs vertically)", () => {
    const r = layout(`petri
  layout: tb
  place P1 *1
  transition T1
  place P2
  P1 -> T1
  T1 -> P2`);
    const P1 = r.places.find((p) => p.place.id === "P1")!;
    const T1 = r.transitions.find((t) => t.transition.id === "T1")!;
    const P2 = r.places.find((p) => p.place.id === "P2")!;
    expect(P1.cy).toBeLessThan(T1.cy);
    expect(T1.cy).toBeLessThan(P2.cy);
  });
});
