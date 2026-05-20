import { describe, expect, it } from "vitest";
import { parsePert } from "../../src/diagrams/pert/parser";
import { layoutPert } from "../../src/diagrams/pert/layout";
import { renderPert } from "../../src/diagrams/pert/renderer";

const DIAMOND_AOA = `pert
title: "Diamond AOA"
layout: aoa
task A "A" duration: 2
task B "B" duration: 6 after: A
task C "C" duration: 3 after: A
task D "D" duration: 4 after: B, C`;

describe("pert AOA (activity-on-arrow)", () => {
  it("builds an event graph with one real arc per task", () => {
    const l = layoutPert(parsePert(DIAMOND_AOA));
    expect(l.mode).toBe("aoa");
    expect(l.aoa).toBeTruthy();
    const real = l.aoa!.arcs.filter((a) => !a.dummy);
    expect(real).toHaveLength(4);
    expect(new Set(real.map((a) => a.taskId))).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("inserts dummy activities to merge a multi-predecessor activity", () => {
    const l = layoutPert(parsePert(DIAMOND_AOA));
    const dummies = l.aoa!.arcs.filter((a) => a.dummy);
    // D depends on {B, C} → one merge event fed by two dummies
    expect(dummies).toHaveLength(2);
  });

  it("numbers events so every arc points from a lower to a higher id", () => {
    const l = layoutPert(parsePert(DIAMOND_AOA));
    for (const a of l.aoa!.arcs) {
      expect(a.from).toBeLessThan(a.to);
    }
    const ids = l.aoa!.events.map((e) => e.id).sort((x, y) => x - y);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(l.aoa!.events.length);
  });

  it("marks the critical activities on the arrows", () => {
    const l = layoutPert(parsePert(DIAMOND_AOA));
    const real = new Map(l.aoa!.arcs.filter((a) => !a.dummy).map((a) => [a.taskId, a]));
    expect(real.get("A")!.critical).toBe(true);
    expect(real.get("B")!.critical).toBe(true);
    expect(real.get("D")!.critical).toBe(true);
    expect(real.get("C")!.critical).toBe(false);
  });

  it("warns that AOA flattens non-FS dependencies to FS", () => {
    const ast = parsePert(`pert
layout: aoa
task A "A" duration: 5
task B "B" duration: 4 after: A SS+1`);
    const l = layoutPert(ast);
    expect(l.warnings.some((w) => /finish-to-start/i.test(w))).toBe(true);
  });

  it("renders AOA circles and arrows", () => {
    const svg = renderPert(DIAMOND_AOA);
    expect(svg).toContain("sx-pert-aoa");
    expect(svg).toContain("sx-pert-aoa-arc");
    expect(svg).toContain("sx-pert-aoa-event");
  });
});
