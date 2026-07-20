import { describe, expect, test } from "vitest";
import {
  parse,
  render,
  renderResult,
  setLabel,
  type MindmapAST,
  type SceneItem,
} from "../../src";

function sceneItem(scene: SceneItem[] | undefined, key: string): SceneItem {
  const found = scene?.find((item) => item.key === key);
  expect(found, `missing scene item ${key}`).toBeDefined();
  return found!;
}

describe("mindmap label-only editing", () => {
  test("authored Markdown labels expose exact ranges without enabling drag", () => {
    const source = [
      "mindmap",
      "%% style: logic-right",
      '# Product **"launch"**',
      "## Market readiness",
      "- [Competitive analysis](https://example.com)",
    ].join("\r\n");
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = sceneItem(result.scene, "node:n0");
    const branch = sceneItem(result.scene, "node:n1");
    const leaf = sceneItem(result.scene, "node:n2");
    expect(root.editable).toEqual({ label: true, position: "none" });
    expect(root.semanticId).toBeUndefined();
    expect(root.labelWrite).toBe("verbatim");
    expect(source.slice(root.sourceRange!.start, root.sourceRange!.end)).toBe('Product **"launch"**');
    expect(source.slice(branch.sourceRange!.start, branch.sourceRange!.end)).toBe("Market readiness");
    expect(source.slice(leaf.sourceRange!.start, leaf.sourceRange!.end)).toBe(
      "[Competitive analysis](https://example.com)"
    );
    expect(result.svg).toContain('data-sx-key="node:n0"');
    expect(result.svg).toContain('data-sx-role="label"');
    expect(render(source)).not.toContain("data-sx-key");
  });

  test("label edits preserve authored Markdown and quotes verbatim", () => {
    const source = [
      "mindmap",
      '# Product **"launch"**',
      "- `freeze` checklist",
    ].join("\n");
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const root = sceneItem(result.scene, "node:n0");

    const edited = setLabel(source, root, 'Product **"growth"**');
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).toContain('# Product **"growth"**');
    expect(edited.source).not.toContain('# "Product');
    expect((parse(edited.source) as MindmapAST).root.label).toBe('Product **"growth"**');
  });

  test("only synthesized placeholder roots remain non-editable", () => {
    const source = ["mindmap", "- First authored branch"].join("\n");
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const placeholder = result.scene?.find((item) => item.label === "Mindmap");
    const branch = result.scene?.find((item) => item.label === "First authored branch");
    expect(placeholder?.editable).toEqual({
      label: false,
      position: "none",
    });
    expect(branch?.editable).toEqual({
      label: true,
      position: "none",
    });
  });
});
