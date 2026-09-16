import { expect, test } from "vitest";
import { parseEntityDSL } from "../../src/diagrams/entity/parser";
import { layoutEntity } from "../../src/diagrams/entity/layout";
import { estimateTextWidth } from "../../src/core/text-metrics";
import { labelOverlap } from "../../src/core/label-placement";
import { renderEntity } from "../../src/diagrams/entity/renderer";

test("tax shapes preserve declared classification and measured names", () => {
  const ast = parseEntityDSL(`entity-structure "Structure"
entity owner "International investment partnership with a long name" lp
entity subsidiary "Operating entity" disregarded
entity legal "Legal form only" llc
owner -> subsidiary : 75%
owner -> legal : 25%`);
  const layout = layoutEntity(ast);
  for (const n of layout.nodes) {
    expect(n.nameLines.every(line => estimateTextWidth(line, 13, { fontWeight: 600 }) < n.width - 24)).toBe(true);
    for (const e of layout.edges) expect(labelOverlap({x:e.labelX-e.labelWidth/2,y:e.labelY-e.labelHeight/2,width:e.labelWidth,height:e.labelHeight},{x:n.x-n.width/2,y:n.topY,width:n.width,height:n.height})).toBe(0);
  }
  const svg = renderEntity(ast);
  expect(svg).toMatch(/data-entity-type="lp"[^]*?<polygon/);
  expect(svg).toMatch(/data-entity-type="disregarded"[^]*?<ellipse/);
  expect(svg).not.toMatch(/class="lt-entity-edge"[^>]*marker-end/);
});
