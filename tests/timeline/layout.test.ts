import { expect, test } from "vitest";
import { parseTimeline } from "../../src/diagrams/timeline/parser";
import { layoutTimeline } from "../../src/diagrams/timeline/layout";

test("nearby dated events retain distinct readable ticks and stay in their track", () => {
  const ast = parseTimeline(`timeline "Release"
track "Review":
  2028-02-01: "Initial review with stakeholders"
  2028-02-02: "Follow-up review with stakeholders"
  2028-02-03: "Approval of requirements"
track "Build":
  2028-03-01: "Implementation"`);
  const layout = layoutTimeline(ast);
  expect(new Set(layout.ticks.map(t => t.label)).size).toBe(layout.ticks.length);
  for (const ev of layout.events) {
    const lane = layout.lanes.find(l => l.trackId === ev.event.trackId)!;
    expect(ev.labelY - 12).toBeGreaterThanOrEqual(lane.y);
    expect(ev.y + ev.h).toBeLessThanOrEqual(lane.y + lane.height);
  }
  const first = layout.events[0]!;
  const second = layout.events[1]!;
  expect(Math.abs(first.labelY - second.labelY)).toBeGreaterThanOrEqual(14);
});


test("era-only axes retain dates and lollipop bands preserve real time endpoints", () => {
  const eraOnly = layoutTimeline(parseTimeline('timeline "Epochs"\nera 2000 - 2100: "Modern era"'));
  expect(eraOnly.ticks.length).toBeGreaterThan(0);
  const lollipop = layoutTimeline(parseTimeline('timeline "Epochs"\nconfig: style = lollipop\nera 2020 - 2030: "Decade"\n2020: "Start"\n2030: "Finish"'));
  expect(lollipop.eras[0]!.x).toBe(lollipop.cards![0]!.x);
  expect(lollipop.eras[0]!.x + lollipop.eras[0]!.width).toBe(lollipop.cards![1]!.x);
});
