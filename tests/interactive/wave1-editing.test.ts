import { describe, expect, test } from "vitest";
import { parse, render, renderResult, setLabel, setPosition, type SceneItem } from "../../src";

function sceneFor(source: string): SceneItem[] {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  return result.ok ? result.scene ?? [] : [];
}

function item(scene: SceneItem[], key: string): SceneItem {
  const found = scene.find((entry) => entry.key === key);
  expect(found, `missing scene item ${key}`).toBeDefined();
  return found!;
}

describe("interactive wave-1 adapters", () => {
  test("state exposes exact label edits and cross-axis drag pins", () => {
    const source = [
      "stateDiagram-v2",
      "state Draft : Draft work",
      "state Review : Review work",
      "Draft --> Review : submit",
    ].join("\n");
    const base = renderResult(source, { scene: true });
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    const draft = item(base.scene ?? [], "node:Draft");
    const transition = item(base.scene ?? [], "edge:t1:label");
    expect(draft.editable).toEqual({ label: true, position: "move-x" });
    expect(source.slice(draft.sourceRange!.start, draft.sourceRange!.end)).toBe("Draft work");
    expect(source.slice(transition.sourceRange!.start, transition.sourceRange!.end)).toBe("submit");

    const renamed = setLabel(source, draft, "Work in progress");
    expect((parse(renamed.source) as { states: Array<{ label: string }> }).states[0]?.label).toBe("Work in progress");

    const moved = setPosition(source, draft, { x: draft.bbox!.x + 120, y: draft.bbox!.y });
    const pinned = renderResult(moved.source, { scene: true });
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect(item(pinned.scene ?? [], "node:Draft").bbox?.x).toBeCloseTo(draft.bbox!.x + 120, 4);
    expect(item(pinned.scene ?? [], "edge:t1").path).not.toBe(item(base.scene ?? [], "edge:t1").path);
    expect(base.svg).toContain('data-sx-live-start="Draft"');
    expect(base.svg).toContain('data-sx-live-end="Review"');
    expect(base.svg).toContain('data-sx-live-mode="orthogonal"');
    expect(render(source)).not.toContain("data-sx-key");
  });

  test("org chart card names edit and cards move on the presentation axis", () => {
    const source = [
      'orgchart "Studio"',
      'ceo: "Maya Chen" | CEO [role: ceo]',
      '  cto: "Noah Kim" | CTO [role: cto]',
    ].join("\n");
    const base = renderResult(source, { scene: true });
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    const cto = item(base.scene ?? [], "node:cto");
    expect(cto.editable).toEqual({ label: true, position: "move-x" });
    expect(source.slice(cto.sourceRange!.start, cto.sourceRange!.end)).toBe('"Noah Kim"');

    const renamed = setLabel(source, cto, "Noah Park");
    expect((parse(renamed.source) as { nodes: Array<{ id: string; name: string }> }).nodes.find((node) => node.id === "cto")?.name).toBe("Noah Park");

    const moved = setPosition(source, cto, { x: cto.bbox!.x + 90, y: cto.bbox!.y });
    const pinned = renderResult(moved.source, { scene: true });
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect(item(pinned.scene ?? [], "node:cto").bbox?.x).toBeCloseTo(cto.bbox!.x + 90, 4);
    expect(item(pinned.scene ?? [], "edge:0").path).not.toBe(item(base.scene ?? [], "edge:0").path);
    expect(base.svg).toContain('data-sx-live-start="ceo"');
    expect(base.svg).toContain('data-sx-live-end="cto"');
    expect(base.svg).toContain('data-sx-live-mode="orthogonal"');
  });

  test("sequence aliases and message labels edit while participant x is draggable", () => {
    const source = [
      "sequenceDiagram",
      "actor user as User",
      "participant app as Studio App",
      "user->>app: Edit diagram",
      "app-->>user: Live preview",
    ].join("\n");
    const base = renderResult(source, { scene: true });
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    const app = item(base.scene ?? [], "node:app");
    const message = item(base.scene ?? [], "edge:0:label");
    expect(app.editable).toEqual({ label: true, position: "move-x" });
    expect(source.slice(app.sourceRange!.start, app.sourceRange!.end)).toBe("Studio App");
    expect(source.slice(message.sourceRange!.start, message.sourceRange!.end)).toBe("Edit diagram");

    const renamed = setLabel(source, message, "Update diagram");
    const ast = parse(renamed.source) as { statements: Array<{ label?: string }> };
    expect(ast.statements[0]?.label).toBe("Update diagram");

    const moved = setPosition(source, app, { x: app.bbox!.x + 110, y: app.bbox!.y });
    const pinned = renderResult(moved.source, { scene: true });
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect(item(pinned.scene ?? [], "node:app").bbox?.x).toBeCloseTo(app.bbox!.x + 110, 4);
    expect(item(pinned.scene ?? [], "edge:0").path).not.toBe(item(base.scene ?? [], "edge:0").path);
    expect(base.svg).toContain('data-sx-live-start="user"');
    expect(base.svg).toContain('data-sx-live-end="app"');
    expect(base.svg).toContain('data-sx-live-mode="orthogonal"');
  });
});
