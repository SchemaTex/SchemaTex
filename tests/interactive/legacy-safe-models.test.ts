import { describe, expect, it } from "vitest";
import {
  getInteractiveCapabilities,
  renderResult,
  setLabel,
  type SceneItem,
} from "../../src";
import { getExamples, listDiagrams } from "../../src/ai";
import { sourceRevision } from "../../src/interactive";
import type { DiagramType } from "../../src/core/types";

const SX_ATTRIBUTE = /\sdata-sx-[\w-]+\s*=/;

function firstExample(type: string): string {
  const example = getExamples(type, { limit: 1 }).examples[0];
  expect(example, `missing bundled example for ${type}`).toBeDefined();
  return example!.dsl;
}

function sceneItem(source: string, key: string): SceneItem {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  const item = result.ok
    ? result.scene?.find((entry) => entry.key === key)
    : undefined;
  expect(item, `missing ${key}`).toBeDefined();
  return item!;
}

describe("interactive safety invariants", () => {
  it("advertises 21 parser-native diagram types and keeps the other 31 source-only", () => {
    const diagrams = listDiagrams();
    const native = diagrams.filter(
      (entry) => getInteractiveCapabilities(entry.type as DiagramType).text.length > 0,
    );
    const sourceOnly = diagrams.filter(
      (entry) => getInteractiveCapabilities(entry.type as DiagramType).text.length === 0,
    );

    expect(native).toHaveLength(21);
    expect(sourceOnly).toHaveLength(31);

    for (const entry of sourceOnly) {
      const result = renderResult(firstExample(entry.type), {
        type: entry.type as DiagramType,
        scene: true,
      });
      expect(result.ok, `${entry.type} should remain renderable`).toBe(true);
      expect(result.ok && result.scene).toBeUndefined();
      expect(result.svg, `${entry.type} must not expose guessed edit handles`).not.toMatch(
        SX_ATTRIBUTE,
      );
    }
  });

  it("keeps every data-sx hook out of default renders", () => {
    for (const entry of listDiagrams()) {
      const result = renderResult(firstExample(entry.type), {
        type: entry.type as DiagramType,
      });
      expect(result.ok, `${entry.type} should render`).toBe(true);
      expect(result.svg, `${entry.type} leaked scene-only SVG hooks`).not.toContain("data-sx-");
      expect(result).not.toHaveProperty("scene");
    }

    const playbook = renderResult(firstExample("playbook"), { type: "playbook" });
    expect(playbook.svg).not.toContain("sx-pb-route-handle");
  });

  it("does not create editable FMEA targets by matching duplicate rendered text", () => {
    const source = [
      'fmea "Duplicate effects"',
      "  rank: rpn",
      '  item "Step LOW"',
      '    mode "Mode LOW"',
      '      effect "Damage" sev: 1',
      '      cause "Cause LOW" occ: 1 det: 1',
      '  item "Step HIGH"',
      '    mode "Mode HIGH"',
      '      effect "Damage" sev: 9',
      '      cause "Cause HIGH" occ: 9 det: 9',
    ].join("\n");

    expect(source.indexOf("Step LOW")).toBeLessThan(source.indexOf("Step HIGH"));
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    expect(result.svg.indexOf("Step HIGH")).toBeLessThan(result.svg.indexOf("Step LOW"));
    expect(result.ok && result.scene).toBeUndefined();
    expect(result.svg).not.toMatch(SX_ATTRIBUTE);
  });

  it("rejects a scene item after its source revision changes", () => {
    const source = "flowchart TD\nA[Foo] --> B[Done]";
    const target = sceneItem(source, "node:A");
    const changed = `${source}\n`;
    const result = setLabel(changed, target, "Bar");

    expect(result.source).toBe(changed);
    expect(result.diagnostics[0]?.code).toBe("EDIT_REVISION_STALE");
  });

  it("rejects a range whose exact authored text no longer matches", () => {
    const source = "flowchart TD\nA[Foo] --> B[Done]";
    const target = sceneItem(source, "node:A");
    const changed = "flowchart TD\nA[Bar] --> B[Done]";
    const sameRevisionTarget = {
      ...target,
      sourceRevision: sourceRevision(changed),
    };
    const result = setLabel(changed, sameRevisionTarget, "Baz");

    expect(result.source).toBe(changed);
    expect(result.diagnostics[0]?.code).toBe("EDIT_SOURCE_MISMATCH");
  });

  it("preserves genogram public data-from/data-to semantics", () => {
    const source = [
      'genogram "Nuclear family"',
      "  john [male]",
      "  mary [female]",
      "  john -- mary",
      "    alice [female]",
      "    bob [male]",
    ].join("\n");
    const result = renderResult(source);
    expect(result.ok).toBe(true);
    expect(result.svg.match(/data-from="john" data-to="mary"/g)).toHaveLength(3);
  });
});
