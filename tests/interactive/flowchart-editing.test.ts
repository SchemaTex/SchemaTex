import { describe, expect, test } from "vitest";
import {
  parse,
  prunePins,
  reattachPins,
  render,
  renderResult,
  setLabel,
  setPosition,
  stripPins,
  type SceneItem,
} from "../../src";

function flowchartScene(source: string): SceneItem[] {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  if (!result.ok) return [];
  return result.scene ?? [];
}

function item(scene: SceneItem[], key: string): SceneItem {
  const found = scene.find((entry) => entry.key === key);
  expect(found, `missing scene item ${key}`).toBeDefined();
  return found!;
}

describe("interactive flowchart vertical slice", () => {
  test("scene is explicit opt-in and default SVG remains free of sx hooks", () => {
    const source = "flowchart TD\nA[Start] --> B[Done]";
    const legacySvg = render(source);
    const defaultResult = renderResult(source);
    const sceneResult = renderResult(source, { scene: true });

    expect(defaultResult.ok).toBe(true);
    expect(defaultResult.svg).toBe(legacySvg);
    expect(defaultResult.svg).not.toContain("data-sx-key");
    expect(defaultResult.ok && defaultResult.scene).toBeUndefined();
    expect(defaultResult).not.toHaveProperty("scene");

    expect(sceneResult.ok).toBe(true);
    expect(sceneResult.svg).toContain('data-sx-key="node:A"');
    expect(sceneResult.svg).toContain('data-sx-role="label"');
    expect(sceneResult.ok && sceneResult.scene?.length).toBeGreaterThan(0);
    if (sceneResult.ok) {
      const domKeys = [...sceneResult.svg.matchAll(/data-sx-key="([^"]+)"/g)].map((match) => match[1]);
      const sceneKeys = (sceneResult.scene ?? []).map((entry) => entry.key);
      expect(domKeys.sort()).toEqual(sceneKeys.sort());
      expect(new Set(sceneKeys).size).toBe(sceneKeys.length);
    }
  });

  test("parser emits exact, distinct ranges for three identical labels on one line", () => {
    const source = "flowchart TD\n  A[Foo] -->|Foo| B[Foo]";
    const scene = flowchartScene(source);
    const a = item(scene, "node:A");
    const edgeLabel = item(scene, "edge:0:label");
    const b = item(scene, "node:B");

    expect(source.slice(a.sourceRange!.start, a.sourceRange!.end)).toBe("Foo");
    expect(source.slice(edgeLabel.sourceRange!.start, edgeLabel.sourceRange!.end)).toBe("Foo");
    expect(source.slice(b.sourceRange!.start, b.sourceRange!.end)).toBe("Foo");
    expect(new Set([a.sourceRange!.start, edgeLabel.sourceRange!.start, b.sourceRange!.start]).size).toBe(3);
    expect(a.sourceRange).toMatchObject({ line: 1, colStart: 4, colEnd: 7 });
  });

  test("blank-in-place preprocessing keeps ranges in the original input coordinate space", () => {
    const source = [
      "```mermaid",
      "---",
      "title: Checkout",
      "---",
      "flowchart TD",
      "  A[开始] --> B[完成] %% visible source comment",
      "@overrides",
      "pin B 260,120",
      "```",
    ].join("\n");
    const scene = flowchartScene(source);
    const a = item(scene, "node:A");
    const b = item(scene, "node:B");

    expect(source.slice(a.sourceRange!.start, a.sourceRange!.end)).toBe("开始");
    expect(source.slice(b.sourceRange!.start, b.sourceRange!.end)).toBe("完成");
    expect(a.sourceRange).toMatchObject({ line: 5, colStart: 4, colEnd: 6 });
  });

  test("frontmatter title edits write back to the authored title value", () => {
    const source = [
      "```mermaid",
      "---",
      'title: "Checkout flow"',
      "---",
      "flowchart TD",
      "  A[Start] --> B[Done]",
      "```",
    ].join("\n");
    const title = item(flowchartScene(source), "title");

    expect(source.slice(title.sourceRange!.start, title.sourceRange!.end)).toBe('"Checkout flow"');
    const edited = setLabel(source, title, "Updated checkout");
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).toContain('title: "Updated checkout"');
    expect(edited.source).toContain("flowchart TD\n");

    const ast = parse(edited.source) as {
      title: string;
      titleSourceRange?: { start: number; end: number };
    };
    expect(ast.title).toBe("Updated checkout");
    expect(edited.source.slice(ast.titleSourceRange!.start, ast.titleSourceRange!.end)).toBe(
      '"Updated checkout"'
    );
  });

  test("parse() remaps ranges after forced-type header recovery", () => {
    const source = "  A[Headerless] --> B[Body]";
    const ast = parse(source, { type: "flowchart" }) as {
      nodes: Array<{ id: string; labelSourceRange?: { start: number; end: number } }>;
    };
    const range = ast.nodes.find((node) => node.id === "A")?.labelSourceRange;
    expect(range).toBeDefined();
    expect(source.slice(range!.start, range!.end)).toBe("Headerless");
  });

  test("setLabel splices only the target and round-trips spaces, quotes and delimiters", () => {
    const source = "flowchart TD\nA[Foo] -->|Foo| B[Foo]";
    const scene = flowchartScene(source);
    const target = item(scene, "node:B");
    const next = setLabel(source, target, '  新的 ] label "v2"  ');

    expect(next.diagnostics).toEqual([]);
    expect(next.source.slice(0, target.sourceRange!.start)).toBe(source.slice(0, target.sourceRange!.start));
    const ast = parse(next.source) as { nodes: Array<{ id: string; label: string }> };
    expect(ast.nodes.find((node) => node.id === "B")?.label).toBe('  新的 ] label "v2"  ');
    expect(ast.nodes.find((node) => node.id === "A")?.label).toBe("Foo");
  });

  test("setLabel rejects newline edits without damaging source", () => {
    const source = "flowchart TD\nA[Foo]";
    const target = item(flowchartScene(source), "node:A");
    const next = setLabel(source, target, "line one\nline two");
    expect(next.source).toBe(source);
    expect(next.diagnostics[0]?.code).toBe("EDIT_MULTILINE_LABEL");
  });

  test("setLabel round-trips the interactive character matrix", () => {
    const source = "flowchart TD\nA[Original]";
    const target = item(flowchartScene(source), "node:A");
    const values = [
      "plain",
      "with spaces",
      'quote "inside"',
      "CJK「标签」",
      "",
      "contains %% marker",
      "uses -> [ { syntax",
      "  keep outer space  ",
    ];
    for (const value of values) {
      const edited = setLabel(source, target, value);
      expect(edited.diagnostics, value).toEqual([]);
      const ast = parse(edited.source) as { nodes: Array<{ id: string; label: string }> };
      expect(ast.nodes.find((node) => node.id === "A")?.label).toBe(value);
    }
  });

  test("@overrides uses bbox top-left and lets TB nodes move on both axes", () => {
    const source = "flowchart TD\nA[Start] --> B[Review] --> C[Done]";
    const baseScene = flowchartScene(source);
    const baseB = item(baseScene, "node:B");
    const pinned = `${source}\n\n@overrides\npin B 340,999`;
    const result = renderResult(pinned, { scene: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pinnedB = item(result.scene ?? [], "node:B");

    expect(pinnedB.bbox?.x).toBe(340);
    expect(pinnedB.bbox?.y).toBe(999);
    expect(baseB.editable.position).toBe("free");
    expect(result.svg).toContain('viewBox="0 0');
    expect(Number(result.svg.match(/viewBox="[^ ]+ [^ ]+ ([^ ]+)/)?.[1])).toBeGreaterThan(340);
  });

  test("LR pins move on both axes and edge routing follows the pinned node", () => {
    const source = "flowchart LR\nA[Start] --> B[Review] --> C[Done]";
    const base = renderResult(source, { scene: true });
    const pinned = renderResult(`${source}\n@overrides\npin B 999,280`, { scene: true });
    expect(base.ok && pinned.ok).toBe(true);
    if (!base.ok || !pinned.ok) return;

    const baseB = item(base.scene ?? [], "node:B");
    const pinnedB = item(pinned.scene ?? [], "node:B");
    const baseIn = item(base.scene ?? [], "edge:0");
    const pinnedIn = item(pinned.scene ?? [], "edge:0");
    expect(pinnedB.bbox?.x).toBe(999);
    expect(pinnedB.bbox?.y).toBe(280);
    expect(baseB.editable.position).toBe("free");
    expect(pinnedIn.path).not.toBe(baseIn.path);
  });

  test("setPosition updates one pin instead of appending duplicates", () => {
    const source = "flowchart TD\nA --> B\n@overrides\npin B 100,120";
    const target = item(flowchartScene(source), "node:B");
    const once = setPosition(source, target, { x: 220, y: 140 });
    const freshTarget = item(flowchartScene(once.source), "node:B");
    const twice = setPosition(once.source, freshTarget, { x: 260, y: 160 });
    expect(twice.diagnostics).toEqual([]);
    expect(twice.source.match(/^pin B /gm)).toHaveLength(1);
    expect(twice.source).toContain("pin B 260,160");
  });

  test("malformed and duplicate pins are non-fatal diagnostics with last-wins behavior", () => {
    const source = [
      "flowchart TD",
      "A --> B",
      "@overrides",
      "pin B 100,120",
      "this is not a pin",
      "pin B 240,140",
    ].join("\n");
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("partial");
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(["PIN_INVALID", "PIN_DUPLICATE"]);
    expect(item(result.scene ?? [], "node:B").bbox?.x).toBe(240);
  });

  test("strip, reattach and prune preserve valid pins", () => {
    const source = "flowchart TD\nA --> B\n@overrides\npin B 100,120\npin Missing 4,8";
    const stripped = stripPins(source);
    expect(stripped.source).not.toContain("@overrides");
    expect(stripped.block).toContain("pin B 100,120");

    const reattached = reattachPins(stripped.source, stripped.block);
    expect(reattached.source).toContain("@overrides");
    const pruned = prunePins(reattached.source, flowchartScene(reattached.source));
    expect(pruned.source).toContain("pin B 100,120");
    expect(pruned.source).not.toContain("pin Missing");
    expect(pruned.diagnostics[0]?.code).toBe("PIN_PRUNED");
  });
});
