/** Author paired slanted and rectangular phylogram references; never imported by the runtime.
 * Branch geometry is derived from the exemplar's Newick distances, not traced
 * from a target. This script authors this one figure, not a new layout engine.
 */
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { parsePhylo } from "../../src/diagrams/phylo/parser";
import { svgRoot, el, text, line, path, rect, group } from "../../src/core/svg";
import type { PhyloNode } from "../../src/core/types";

for (const layout of ["slanted", "rectangular"] as const) {
const dir = new URL(`../../visual-eval/exemplars/phylo/${layout}/`, import.meta.url);
const ast = parsePhylo(await readFile(new URL("source.sx", dir), "utf8"));
assert.equal(ast.layout, layout);
const layoutLabel = layout === "slanted" ? "Slanted" : "Rectangular";
const C = { paper: "#ffffff", ink: "#1e293b", muted: "#64748b",
  teal: "#0f766e", blue: "#2563eb", ochre: "#a16207" };
const T = { title: 28, section: 12, taxon: 16, caption: 12, note: 11 };
const page = { width: 1140, height: 700, margin: 48 };
const plot = { left: 80, top: 170, row: 44, groupGap: 32, scale: 1800, labelX: 654, bracketX: 952 };
const leaves = (n: PhyloNode): PhyloNode[] => n.isLeaf ? [n] : n.children.flatMap(leaves);
const tips = leaves(ast.root);
assert.equal(tips.length, 8);
const positions = new Map<string, { x: number; y: number; color: string }>();
let cursorY = plot.top;
let lastClade: string | undefined;
for (const tip of tips) {
  const clade = ast.clades.find(c => c.members.includes(tip.id));
  if (lastClade && lastClade !== clade?.id) cursorY += plot.groupGap;
  positions.set(tip.id, { x: 0, y: cursorY, color: clade?.color ?? C.ink });
  lastClade = clade?.id;
  cursorY += plot.row;
}
const place = (n: PhyloNode, distance: number): void => {
  for (const child of n.children) place(child, distance + (child.branchLength ?? 0));
  const existing = positions.get(n.id);
  const children = n.children.map(c => positions.get(c.id)!);
  positions.set(n.id, { x: plot.left + distance * plot.scale,
    y: existing?.y ?? (children[0].y + children.at(-1)!.y) / 2,
    color: existing?.color ?? (new Set(children.map(c => c.color)).size === 1 ? children[0].color : C.ink) });
};
place(ast.root, 0);

const background: string[] = [], branches: string[] = [], labels: string[] = [];
for (const clade of ast.clades) {
  const ys = clade.members.map(id => positions.get(id)!.y);
  const top = Math.min(...ys) - 22, bottom = Math.max(...ys) + 22;
  background.push(rect({ x: 638, y: top, width: 454, height: bottom - top,
    fill: clade.color, "fill-opacity": 0.045, rx: 3 }));
  labels.push(path({ d: `M ${plot.bracketX - 7} ${top + 10} H ${plot.bracketX} V ${bottom - 10} H ${plot.bracketX - 7}`,
    fill: "none", stroke: clade.color, "stroke-width": 1.5 }),
    text({ x: plot.bracketX + 15, y: (top + bottom) / 2 + 4, fill: clade.color,
      "font-size": T.section, "font-weight": 700 }, clade.label ?? clade.id));
}
const draw = (n: PhyloNode): void => {
  const p = positions.get(n.id)!;
  if (n.children.length) {
    const children = n.children.map(c => positions.get(c.id)!);
    if (layout === "rectangular") branches.push(line({ x1: p.x, y1: children[0].y, x2: p.x, y2: children.at(-1)!.y,
      stroke: p.color, "stroke-width": 2 }));
    for (const child of n.children) {
      const q = positions.get(child.id)!;
      const length = q.x - p.x;
      assert.ok(Math.abs(length - (child.branchLength ?? 0) * plot.scale) < 1e-6);
      branches.push(line({ x1: p.x, y1: layout === "slanted" ? p.y : q.y, x2: q.x, y2: q.y, stroke: q.color,
        "stroke-width": 2, "data-node": child.id, "data-distance": child.branchLength }));
      if (child.support !== undefined) {
        labels.push(text({ x: layout === "slanted" ? q.x + 8 : q.x - 8,
          y: q.y - 12, "text-anchor": layout === "slanted" ? "start" : "end",
          "font-size": T.caption, fill: q.color }, String(child.support)));
      }
      draw(child);
    }
  } else {
    branches.push(line({ x1: p.x + 5, y1: p.y, x2: plot.labelX - 14, y2: p.y,
      stroke: C.muted, "stroke-opacity": 0.45, "stroke-width": 1, "stroke-dasharray": "2 5" }));
    labels.push(text({ x: plot.labelX, y: p.y + 5, "font-size": T.taxon,
      "font-style": "italic", "data-taxon": n.id }, (n.label ?? n.id).replaceAll("_", " ")));
  }
};
draw(ast.root);
const scaleValue = 0.05;
const scaleWidth = scaleValue * plot.scale;
const svg = svgRoot({ width: page.width, height: page.height, viewBox: `0 0 ${page.width} ${page.height}`,
  role: "img", fill: C.ink, "aria-labelledby": "phylo-title phylo-description" }, [
  el("title", { id: "phylo-title" }, `Bacterial diversity — ${layoutLabel.toLowerCase()} phylogram`),
  el("desc", { id: "phylo-description" }, "Eight illustrative bacterial taxa in three named clades. Horizontal branch lengths are proportional to substitutions per site. Numbers are illustrative bootstrap percentages. Dashed tip extensions are alignment guides, not evolutionary distances."),
  el("style", {}, "text{font-family:Verdana,sans-serif}.figure-title{font-family:'Trebuchet MS',Verdana,sans-serif}"),
  rect({ width: page.width, height: page.height, fill: C.paper }),
  text({ x: page.margin, y: 48, class: "figure-title",
    "font-size": T.title, "font-weight": 700 }, ast.title!),
  text({ x: page.margin, y: 76, "font-size": 13, fill: C.muted }, `${layoutLabel} phylogram · branch distances and clade support`),
  line({ x1: page.margin, y1: 99, x2: page.width - page.margin, y2: 99,
    stroke: C.muted, "stroke-opacity": 0.22, "stroke-width": 1 }),
  text({ x: plot.left, y: 133, "font-size": T.section, fill: C.muted, "letter-spacing": 1 }, "PHYLOGENY"),
  text({ x: plot.labelX, y: 133, "font-size": T.section, fill: C.muted, "letter-spacing": 1 }, "TAXON"),
  text({ x: plot.bracketX + 15, y: 133, "font-size": T.section, fill: C.muted, "letter-spacing": 1 }, "CLADE"),
  group({ class: "clade-bands" }, background),
  group({ class: "phylo-branches", "stroke-linecap": "round" }, branches),
  group({ class: "phylo-labels" }, labels),
  path({ d: `M ${plot.left} 600 V 610 M ${plot.left} 605 H ${plot.left + scaleWidth} M ${plot.left + scaleWidth} 600 V 610`,
    fill: "none", stroke: C.ink, "stroke-width": 1.5 }),
  text({ x: plot.left, y: 630, "font-size": T.caption }, `${scaleValue} ${ast.scaleLabel}`),
  text({ x: 466, y: 606, "font-size": T.note, fill: C.muted }, "Horizontal distance: substitutions/site · node values: bootstrap (%)"),
  text({ x: 466, y: 629, "font-size": T.note, fill: C.muted }, "Dashed extensions align labels; they add no branch length."),
  line({ x1: page.margin, y1: 653, x2: page.width - page.margin, y2: 653,
    stroke: C.muted, "stroke-opacity": 0.22, "stroke-width": 1 }),
  text({ x: page.margin, y: 678, "font-size": T.note, fill: C.muted }, "Illustrative dataset · topology, branch distances and support values are examples, not an inferred analysis."),
]);
await writeFile(new URL("ideal.svg", dir), svg + "\n");
console.log(`${layoutLabel} exemplar: eight tips; horizontal distances and the scale bar share one linear scale.`);
}
