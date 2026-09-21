import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseErd } from "../../src/diagrams/erd/parser";
import { layoutErd } from "../../src/diagrams/erd/layout";
import { labelPathPoints } from "../../src/core/label-placement";
import { segmentEntersBox } from "../../src/diagrams/logic/orthogonal-router";

const source = readFileSync(new URL("../../visual-eval/cases/erd-weekly-2026-09-20-dental-management/source.sx", import.meta.url), "utf8");

describe("multiple relationships referencing the same field", () => {
  it.each([false, true])("preserves every relationship without entering unrelated tables (permuted=%s)", (permuted) => {
    const ast = parseErd(source);
    if (permuted) {
      const names = new Map(ast.entities.map((entity, i) => [entity.id, `Entity_${i}`]));
      for (const entity of ast.entities) { entity.id = names.get(entity.id)!; entity.name = entity.id; }
      for (const ref of ast.refs) {
        ref.from = ref.from.replace(/^[^.]+/, name => names.get(name)!);
        ref.to = ref.to.replace(/^[^.]+/, name => names.get(name)!);
      }
      ast.entities.reverse();
      ast.refs.reverse();
    }
    const layout = layoutErd(ast);
    expect(layout.edges).toHaveLength(ast.refs.length);
    for (const edge of layout.edges) {
      const points = labelPathPoints(edge.path);
      expect(points.length).toBeGreaterThan(1);
      const endpoints = [edge.ref.from.split(".")[0], edge.ref.to.split(".")[0]];
      for (const table of layout.entities.filter(e => !endpoints.includes(e.entity.id))) {
        const box = { left: table.x, right: table.x + table.width, top: table.y, bottom: table.y + table.height };
        expect(points.slice(1).some((p, i) => segmentEntersBox(points[i]!, p, box))).toBe(false);
      }
    }
  }, 120_000);
});
