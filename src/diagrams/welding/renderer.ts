/** Welding callouts: measured standard notation with an explicitly named leader endpoint. */
import type { RenderConfig } from "../../core/types";
import { svgRoot, group, line, polygon, circle, text, title, desc, defs, el } from "../../core/svg";
import { parseWelding } from "./parser";
import { layoutWelding, WELD_STYLE as T } from "./layout";
import type { WeldJointLayout, WeldSideLayout } from "./layout";
import { weldGlyph, contourGlyph } from "./symbols";
import type { WeldingAST, Joint, WeldSpec } from "./types";
import { WELD_TYPE_NAMES } from "./types";

const CSS = `
.sx-welding { font-family: ${T.font}; color: ${T.ink}; }
.sx-welding-title { font-size: ${T.title}px; font-weight: 600; fill: ${T.ink}; }
.sx-weld-ref, .sx-weld-leader, .sx-weld-allaround { stroke: ${T.ink}; stroke-width: 1.5; fill: none; }
.sx-weld-allaround { fill: ${T.paper}; }
.sx-weld-ref-dashed { stroke: ${T.ink}; stroke-width: 1.2; fill: none; stroke-dasharray: 6 4; }
.sx-weld-arrowhead, .sx-weld-flag { fill: ${T.ink}; }
.sx-weld-glyph, .sx-weld-supp { stroke: ${T.ink}; stroke-width: 1.7; fill: none; stroke-linejoin: round; stroke-linecap: round; }
.sx-weld-dim, .sx-weld-angle, .sx-weld-finish { font-size: ${T.body}px; fill: ${T.ink}; dominant-baseline: central; }
.sx-weld-tailtext { font-size: ${T.body}px; fill: ${T.ink}; dominant-baseline: central; }
.sx-weld-label { font-size: ${T.label}px; font-weight: 600; fill: ${T.ink}; }
.sx-weld-caption { font-size: ${T.caption}px; fill: ${T.muted}; }
.sx-weld-divider { stroke: ${T.rule}; stroke-width: 1; }
.sx-weld-warn { font-size: ${T.caption}px; fill: ${T.warning}; }
`;

function renderSide(spec: WeldSpec, m: WeldSideLayout, x: number, y: number, dir: 1 | -1): string {
  const nodes = weldGlyph(spec.type, x, y, dir, "sx-weld-glyph", m.width, m.height);
  const dimension = (value: string, dx: number, dy: number, anchor: string, cls = "sx-weld-dim") => {
    if (value) nodes.push(text({ x: x + dx, y: y + dir * dy, class: cls, "text-anchor": anchor }, value));
  };
  dimension(m.size, -m.width / 2 - 10, m.height / 2, "end");
  dimension(m.length, m.width / 2 + 10, m.height / 2, "start");
  if (spec.root !== undefined) dimension(String(spec.root), 0, m.height * 0.67, "middle", "sx-weld-angle");
  if (spec.angle !== undefined) dimension(`${spec.angle}°`, 0, m.angleY, "middle", "sx-weld-angle");
  if (spec.contour) nodes.push(contourGlyph(spec.contour, x, y, dir, "sx-weld-supp", m.width, m.contourY, spec.type, m.height));
  if (spec.finish) dimension(spec.finish, spec.type === "fillet" ? m.width / 2 + 8 : 0, m.finishY, "middle", "sx-weld-finish");
  dimension(m.count, 0, m.countY, "middle");
  return group({ class: "sx-weld-side", "data-side": dir === 1 ? "arrow" : "other" }, nodes);
}

function renderJoint(joint: Joint, m: WeldJointLayout): string {
  const { refX0, refX1, refY, symbolX, arrowX, arrowY } = m;
  const nodes: string[] = [line({ x1: refX0, y1: refY, x2: refX1, y2: refY, class: "sx-weld-ref" })];
  if (m.dashed) nodes.push(line({ x1: refX0, y1: refY - 10, x2: refX1, y2: refY - 10, class: "sx-weld-ref-dashed" }));
  nodes.push(line({ x1: refX0, y1: refY, x2: arrowX, y2: arrowY, class: "sx-weld-leader" }));
  const angle = Math.atan2(arrowY - refY, arrowX - refX0);
  const backX = arrowX - 9 * Math.cos(angle), backY = arrowY - 9 * Math.sin(angle);
  nodes.push(polygon({ points: `${arrowX},${arrowY} ${backX - 3 * Math.sin(angle)},${backY + 3 * Math.cos(angle)} ${backX + 3 * Math.sin(angle)},${backY - 3 * Math.cos(angle)}`, class: "sx-weld-arrowhead" }));
  if (joint.arrow && m.arrow) nodes.push(renderSide(joint.arrow, m.arrow, symbolX, refY, 1));
  if (joint.other && m.other) nodes.push(renderSide(joint.other, m.other, symbolX, refY - (m.dashed ? 10 : 0), -1));
  if (joint.around) nodes.push(circle({ cx: refX0, cy: refY, r: 5, class: "sx-weld-allaround", fill: T.paper }));
  if (joint.field) {
    nodes.push(line({ x1: refX0, y1: refY - (joint.around ? 5 : 0), x2: refX0, y2: refY - 26, class: "sx-weld-ref" }));
    nodes.push(polygon({ points: `${refX0},${refY - 26} ${refX0 + 14},${refY - 21} ${refX0},${refY - 16}`, class: "sx-weld-flag" }));
  }
  if (joint.tail) {
    for (const dy of [-8, 8]) nodes.push(line({ x1: refX1, y1: refY, x2: refX1 + 12, y2: refY + dy, class: "sx-weld-ref" }));
    m.tailLines.forEach((s, i) => nodes.push(text({ x: refX1 + 24, y: refY + (i - (m.tailLines.length - 1) / 2) * 18, class: "sx-weld-tailtext" }, s)));
  }
  // A textual joint identifier is attached to the arrow tip. No pipe/plate shape is inferred from its name.
  m.labelLines.forEach((s, i) => nodes.push(text({ x: arrowX - 16, y: m.labelY + i * 19, class: "sx-weld-label" }, s)));
  return group({ class: "sx-weld-joint", "data-joint": joint.label ?? "" }, [title(describeJoint(joint)), ...nodes]);
}

function describeJoint(j: Joint): string {
  const sides: string[] = [];
  if (j.arrow) sides.push(`arrow side: ${WELD_TYPE_NAMES[j.arrow.type]}${j.arrow.size !== undefined ? ` size ${j.arrow.size}` : ""}`);
  if (j.other) sides.push(`other side: ${WELD_TYPE_NAMES[j.other.type]}`);
  const extra = [j.around ? "all-around" : "", j.field ? "field weld" : "", j.tail ? `tail ${j.tail}` : ""].filter(Boolean);
  return `${j.label ? `${j.label} — ` : ""}${sides.join("; ")}${extra.length ? `; ${extra.join("; ")}` : ""}`;
}

export function renderWeldingAST(ast: WeldingAST): string {
  const lay = layoutWelding(ast);
  const body: string[] = [];
  lay.titleLines.forEach((s, i) => body.push(text({ x: 28, y: 42 + i * 24, class: "sx-welding-title" }, s)));
  const standard = ast.standard === "aws" ? "AWS A2.4" : `ISO 2553 · System ${ast.standard === "iso-a" ? "A" : "B"}`;
  body.push(text({ x: 28, y: lay.headerBottom - 8, class: "sx-weld-caption" }, `${standard} · Welding symbols`));
  body.push(line({ x1: 28, x2: lay.canvasWidth - 28, y1: lay.headerBottom, y2: lay.headerBottom, class: "sx-weld-divider" }));
  ast.joints.forEach((joint, i) => {
    const m = lay.joints[i]!;
    body.push(renderJoint(joint, m));
    if (i < ast.joints.length - 1) body.push(line({ x1: 28, x2: lay.canvasWidth - 28, y1: m.bottom + 14, y2: m.bottom + 14, class: "sx-weld-divider" }));
  });
  if (!ast.joints.length) body.push(text({ x: 28, y: lay.headerBottom + 45, class: "sx-weld-caption" }, 'Add a joint, e.g. joint "plate" { arrow: fillet size=8 }'));
  if (lay.warningLines.length) {
    body.push(text({ x: 28, y: lay.warningsY, class: "sx-weld-warn" }, "Validation:"));
    lay.warningLines.forEach((w, i) => body.push(text({ x: 28, y: lay.warningsY + 20 + i * 16, class: "sx-weld-warn" }, w)));
  }
  return svgRoot({ class: "sx-welding", "data-diagram-type": "welding", "data-standard": ast.standard,
    width: lay.canvasWidth, height: lay.canvasHeight, viewBox: `0 0 ${lay.canvasWidth} ${lay.canvasHeight}`, role: "graphics-document" },
  [title(ast.title ? `Welding symbols — ${ast.title}` : "Welding symbols"),
    desc(`Welding-symbol diagram (${ast.standard.toUpperCase()}) — ${ast.joints.length} joint(s): ${ast.joints.map(describeJoint).join(" · ")}`),
    defs([el("style", {}, CSS)]), ...body]);
}

export function renderWelding(source: string, _config?: RenderConfig): string {
  return renderWeldingAST(parseWelding(source));
}
