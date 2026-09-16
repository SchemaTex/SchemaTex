import { expect, it } from "vitest";
import { renderFlowchart } from "../../src/diagrams/flowchart/renderer";
import type { SceneItem } from "../../src/core/types";
import { estimateMaxLineWidth } from "../../src/core/text-metrics";
import { labelOverlap } from "../../src/core/label-placement";

it("keeps full multiline labels in measured scene boxes, clear of nodes", () => {
  const scene: SceneItem[] = [];
  const label = "送信完了<br/>next phase";
  const svg = renderFlowchart(`flowchart TD
north[First phase] -->|${label}| south[Second phase]`, "default", { __scene: scene });
  const item = scene.find((entry) => entry.kind === "label")!;
  expect(item.label).toBe(label);
  expect(item.bbox!.width).toBeGreaterThanOrEqual(estimateMaxLineWidth(label.replace("<br/>", "\n"), 11));
  expect(item.bbox!.height).toBe(30);
  for (const node of scene.filter((entry) => entry.kind === "node")) expect(labelOverlap(item.bbox!, node.bbox!)).toBe(0);
  expect(svg).toContain("送信完了");
  expect(svg).toContain("next phase");
});
