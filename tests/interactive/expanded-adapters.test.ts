import { describe, expect, test } from "vitest";
import { parse, render, renderResult, setLabel, setPosition, type SceneItem } from "../../src";

function rendered(source: string) {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  return result;
}

function item(scene: SceneItem[] | undefined, key: string): SceneItem {
  const found = scene?.find((entry) => entry.key === key);
  expect(found, `missing scene item ${key}`).toBeDefined();
  return found!;
}

describe("expanded interactive adapters", () => {
  test.each([
    ['flowchart TD "Release Flow"\nA[Start]', "Release Flow"],
    ['state "Release State"\nstate A : Ready', "Release State"],
    ['orgchart "Product Studio"\nceo: "Maya" | CEO', "Product Studio"],
    ['sequence "Checkout Calls"\nparticipant app as App', "Checkout Calls"],
    ['pid "Pump Loop"\nequip P-101 : pump_centrifugal', "Pump Loop"],
    ['fbd "Motor Control"\nnetwork 0:\n  Latch = AND(Start, Stop)', "Motor Control"],
    ['petri "Workflow"\nplace Ready *1\ntransition Start\nReady -> Start', "Workflow"],
    ['timeline "Release History"\n2026-07-01 : milestone "Kickoff"', "Release History"],
    ['timing "Bus Cycle"\nREQ: 001100', "Bus Cycle"],
    ['breadboard\nboard: half\ntitle: "Sensor Board"', "Sensor Board"],
    ['siteplan "Studio Lot" unit m\nparcel lot "Lot" points 0,0 20,0 20,12 0,12', "Studio Lot"],
  ])("title is an editable, freely draggable scene item: %s", (source, expected) => {
    const result = rendered(source);
    const title = item(result.scene, "title");
    expect(title.semanticId).toBe("@title");
    expect(title.editable).toEqual({ label: true, position: "free" });
    expect(source.slice(title.sourceRange!.start, title.sourceRange!.end)).toBe(`"${expected}"`);
    const renamed = setLabel(source, title, `${expected} v2`);
    expect(renamed.source).toContain(`"${expected} v2"`);
    const moved = setPosition(source, title, { x: 42, y: 18 });
    expect(moved.source).toContain("pin @title 42,18");
  });

  test("circuit exposes stable components, label/value edits, pins, and rerouted nets", () => {
    const source = [
      'circuit "Sensor Front End" netlist',
      'V1 VIN 0 value="5V" label="Supply"',
      'R1 VIN VOUT value="10kΩ" label="Bias"',
      'C1 VOUT 0 value="100nF" label="Filter"',
    ].join("\n");
    const base = rendered(source);
    const resistor = item(base.scene, "node:R1");
    const value = item(base.scene, "node:R1:value");
    expect(resistor.editable).toEqual({ label: true, position: "free" });
    expect(source.slice(resistor.sourceRange!.start, resistor.sourceRange!.end)).toBe('"Bias"');
    expect(source.slice(value.sourceRange!.start, value.sourceRange!.end)).toBe('"10kΩ"');
    expect(base.svg).toContain('data-sx-live-explicit="true"');
    expect(base.svg).toContain('data-sx-live-mode="orthogonal"');
    expect(base.svg).toMatch(/data-sx-live-(?:start|end)="R1"/);
    expect(base.svg.match(/data-sx-live-(?:start|end)="[^"]*R1[^"]*"/g)?.length).toBeGreaterThanOrEqual(2);

    const renamed = setLabel(source, resistor, "Input bias");
    expect((parse(renamed.source) as { components: Array<{ id: string; label?: string }> }).components
      .find((component) => component.id === "R1")?.label).toBe("Input bias");

    const moved = setPosition(source, resistor, {
      x: resistor.bbox!.x + 74,
      y: resistor.bbox!.y + 46,
    });
    const pinned = rendered(moved.source);
    expect(item(pinned.scene, "node:R1").bbox).toMatchObject({
      x: resistor.bbox!.x + 74,
      y: resistor.bbox!.y + 46,
    });
    const basePaths = new Map((base.scene ?? []).filter((entry) => entry.kind === "edge").map((entry) => [entry.key, entry.path]));
    const pinnedEdges = (pinned.scene ?? []).filter((entry) => entry.kind === "edge");
    expect(pinnedEdges.some((entry) => entry.path !== basePaths.get(entry.key))).toBe(true);
    for (const edge of pinnedEdges) {
      const points = [...(edge.path ?? "").matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
        .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1]!;
        const b = points[index]!;
        expect(
          Math.abs(a.x - b.x) < 0.001 || Math.abs(a.y - b.y) < 0.001,
          `expected orthogonal segment in ${edge.path}`
        ).toBe(true);
      }
    }
    expect(render(source)).not.toContain("data-sx-key");
  });

  test("floorplan keeps rooms fixed and writes explicit furniture drag back to native at coordinates", () => {
    const source = [
      'floorplan "Compact Home" unit m',
      'room living "Living Room" at 0,0 size 5x4',
      'room kitchen "Kitchen" right-of living size 3x4',
      'furniture fridge "Fridge" in kitchen at 2,0.4',
    ].join("\n");
    const base = rendered(source);
    const room = item(base.scene, "node:kitchen");
    const fridge = item(base.scene, "item:furniture:4");
    expect(room.editable).toEqual({ label: true, position: "none" });
    expect(fridge.editable).toEqual({ label: true, position: "free" });
    expect(source.slice(room.sourceRange!.start, room.sourceRange!.end)).toBe('"Kitchen"');
    expect(source.slice(fridge.positionSource!.range.start, fridge.positionSource!.range.end)).toBe("2,0.4");

    const renamed = setLabel(source, room, "Galley");
    expect((parse(renamed.source) as { rooms: Array<{ id: string; label: string }> }).rooms
      .find((candidate) => candidate.id === "kitchen")?.label).toBe("Galley");

    const moved = setPosition(source, fridge, {
      x: fridge.bbox!.x + 11,
      y: fridge.bbox!.y + 11,
    });
    expect(moved.source).toContain('furniture fridge "Fridge" in kitchen at 2.2,0.6');
    expect(moved.source).not.toContain("@overrides");
    const pinned = rendered(moved.source);
    expect(item(pinned.scene, "node:kitchen").bbox).toEqual(room.bbox);
    expect(item(pinned.scene, "item:furniture:4").bbox?.x).toBeCloseTo(fridge.bbox!.x + 11, 3);
    expect(item(pinned.scene, "item:furniture:4").bbox?.y).toBeCloseTo(fridge.bbox!.y + 11, 3);
  });

  test("genogram edits explicit labels and moves individuals on the generation axis", () => {
    const source = [
      'genogram "Smith Family"',
      '  father [male, label:"Robert"]',
      '  mother [female, label:"Helen"]',
      '  father -- mother',
      '    child [female, label:"Emma"]',
    ].join("\n");
    const base = rendered(source);
    const mother = item(base.scene, "node:mother");
    expect(mother.editable).toEqual({ label: true, position: "move-x" });
    expect(source.slice(mother.sourceRange!.start, mother.sourceRange!.end)).toBe('"Helen"');
    expect(base.svg).toContain('data-sx-live-start="father"');
    expect(base.svg).toContain('data-sx-live-end="mother"');
    expect(base.svg).toContain('data-sx-live-all="father:0.5,mother:0.5"');
    const renamed = setLabel(source, mother, "Maria");
    expect((parse(renamed.source) as { individuals: Array<{ id: string; label: string }> }).individuals
      .find((candidate) => candidate.id === "mother")?.label).toBe("Maria");

    const moved = setPosition(source, mother, { x: mother.bbox!.x + 80, y: mother.bbox!.y });
    const pinned = rendered(moved.source);
    expect(item(pinned.scene, "node:mother").bbox?.x).toBeCloseTo(mother.bbox!.x + 80, 3);
    expect(item(pinned.scene, "edge:structural:0").path).not.toBe(item(base.scene, "edge:structural:0").path);
  });
});
