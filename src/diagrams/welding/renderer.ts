/**
 * Welding-symbol renderer (47-WELDING-SYMBOL-STANDARD).
 *
 * Draws each joint's reference-line skeleton: reference line (+ ISO dashed
 * line), leader arrow to the joint, weld glyphs above/below, dimension text in
 * fixed slots (size left · length-pitch right · angle/root at the symbol ·
 * contour+finish above), the weld-all-around circle, the field-weld flag, and
 * the tail. Joints stack as independent bands.
 */
import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  line as lineEl,
  polygon,
  circle,
  text as textEl,
  title as titleEl,
  desc as descEl,
  defs,
  el,
  escapeXml,
} from "../../core/svg";
import { parseWelding } from "./parser";
import { layoutWelding } from "./layout";
import { weldGlyph, contourGlyph, WELD_GLYPH_W, WELD_GLYPH_H } from "./symbols";
import type { WeldingAST, Joint, WeldSpec } from "./types";
import { WELD_TYPE_NAMES } from "./types";

const CSS = `
.sx-welding { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-welding-title { font: 600 16px sans-serif; fill: #111; text-anchor: middle; }
.sx-weld-ref { stroke: #1e3a5f; stroke-width: 1.6; fill: none; }
.sx-weld-ref-dashed { stroke: #1e3a5f; stroke-width: 1.4; fill: none; stroke-dasharray: 5 3; }
.sx-weld-leader { stroke: #1e3a5f; stroke-width: 1.6; fill: none; }
.sx-weld-arrowhead { fill: #1e3a5f; }
.sx-weld-glyph { stroke: #1d4ed8; stroke-width: 1.8; fill: none; stroke-linejoin: round; stroke-linecap: round; }
.sx-weld-supp { stroke: #1d4ed8; stroke-width: 1.5; fill: none; }
.sx-weld-allaround { stroke: #1e3a5f; stroke-width: 1.6; fill: none; }
.sx-weld-flag { fill: #1e3a5f; stroke: #1e3a5f; stroke-width: 1; }
.sx-weld-dim { font: 600 12px ui-monospace, Menlo, monospace; fill: #0f172a; }
.sx-weld-angle { font: 600 11px ui-monospace, Menlo, monospace; fill: #475569; }
.sx-weld-finish { font: 700 11px sans-serif; fill: #1d4ed8; text-anchor: middle; }
.sx-weld-tailtext { font: 500 11px sans-serif; fill: #334155; text-anchor: end; dominant-baseline: central; }
.sx-weld-label { font: 600 12.5px sans-serif; fill: #1f2937; text-anchor: middle; }
.sx-weld-warn { font: 500 11.5px sans-serif; fill: #b45309; }
.sx-weld-warn-head { font: 700 11.5px sans-serif; fill: #b45309; }
`;

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** size (+ throat in parentheses) text, just left of the glyph. */
function sizeText(spec: WeldSpec): string {
  if (spec.size === undefined && spec.throat === undefined) return "";
  const parts: string[] = [];
  if (spec.size !== undefined) parts.push(String(spec.size));
  if (spec.throat !== undefined) parts.push(`(${spec.throat})`);
  return parts.join(" ");
}

/** length / length-pitch text, just right of the glyph. */
function lengthText(spec: WeldSpec): string {
  if (spec.length === undefined) return "";
  if (spec.pitch !== undefined) {
    return spec.count !== undefined
      ? `${spec.count}×${spec.length} (${spec.pitch})`
      : `${spec.length}-${spec.pitch}`;
  }
  return String(spec.length);
}

/** Draw one weld spec on side `dir` at reference-Y `refY`. */
function renderSide(spec: WeldSpec, symbolX: number, refY: number, dir: 1 | -1): string[] {
  const nodes: string[] = [];
  nodes.push(...weldGlyph(spec.type, symbolX, refY, dir, "sx-weld-glyph"));
  const midY = refY + dir * (WELD_GLYPH_H / 2);
  const leftX = symbolX - WELD_GLYPH_W / 2;
  const rightX = symbolX + WELD_GLYPH_W / 2;

  const sz = sizeText(spec);
  if (sz) {
    nodes.push(
      textEl({ x: r2(leftX - 5), y: r2(midY), class: "sx-weld-dim", "text-anchor": "end", "dominant-baseline": "central" }, sz),
    );
  }
  const len = lengthText(spec);
  if (len) {
    nodes.push(
      textEl({ x: r2(rightX + 5), y: r2(midY), class: "sx-weld-dim", "text-anchor": "start", "dominant-baseline": "central" }, len),
    );
  }
  // angle at the symbol opening (far edge)
  if (spec.angle !== undefined) {
    nodes.push(
      textEl({ x: r2(symbolX), y: r2(refY + dir * (WELD_GLYPH_H + 11)), class: "sx-weld-angle", "text-anchor": "middle" }, `${spec.angle}°`),
    );
  }
  // root opening, between glyph and line
  if (spec.root !== undefined) {
    nodes.push(
      textEl({ x: r2(rightX + 5), y: r2(refY + dir * 5), class: "sx-weld-angle", "text-anchor": "start", "dominant-baseline": "central" }, `root ${spec.root}`),
    );
  }
  // contour + finish, above (outside) the glyph
  if (spec.contour) {
    nodes.push(contourGlyph(spec.contour, symbolX, refY, dir, "sx-weld-supp"));
  }
  if (spec.finish) {
    nodes.push(
      textEl({ x: r2(symbolX), y: r2(refY + dir * (WELD_GLYPH_H + 13)), class: "sx-weld-finish" }, spec.finish),
    );
  }
  return nodes;
}

function renderJoint(joint: Joint, ast: WeldingAST, bandTop: number, lay: ReturnType<typeof layoutWelding>): string {
  const refY = bandTop + lay.refYOffset;
  const { refX0, refX1, symbolX } = lay;
  const iso = ast.standard === "iso-a";
  const nodes: string[] = [];

  // reference line (+ ISO-A dashed companion line)
  nodes.push(lineEl({ x1: refX0, y1: refY, x2: refX1, y2: refY, class: "sx-weld-ref" }));
  const symmetric = iso && joint.arrow && joint.other && joint.arrow.type === joint.other.type;
  if (iso && !symmetric) {
    nodes.push(lineEl({ x1: refX0, y1: refY - 6, x2: refX1, y2: refY - 6, class: "sx-weld-ref-dashed" }));
  }

  // leader arrow at the right end → joint
  const lx = refX1 + 34;
  const ly = refY + 44;
  nodes.push(lineEl({ x1: refX1, y1: refY, x2: lx, y2: ly, class: "sx-weld-leader" }));
  // arrowhead
  const ah = 8;
  const angle = Math.atan2(ly - refY, lx - refX1);
  const a1 = angle + 2.7;
  const a2 = angle - 2.7;
  nodes.push(
    polygon({
      points: `${r2(lx)},${r2(ly)} ${r2(lx + ah * Math.cos(a1))},${r2(ly + ah * Math.sin(a1))} ${r2(lx + ah * Math.cos(a2))},${r2(ly + ah * Math.sin(a2))}`,
      class: "sx-weld-arrowhead",
    }),
  );

  // weld glyphs
  if (joint.arrow) {
    // AWS/ISO-B arrow side = below; ISO-A arrow side = below the solid line
    nodes.push(...renderSide(joint.arrow, symbolX, refY, 1));
  }
  if (joint.other && !symmetric) {
    // other side = above (on the dashed line for ISO-A)
    const oy = iso ? refY - 6 : refY;
    nodes.push(...renderSide(joint.other, symbolX, oy, -1));
  }

  // weld-all-around: open circle at the arrow/reference junction
  if (joint.around) {
    nodes.push(circle({ cx: refX1, cy: refY, r: 5, class: "sx-weld-allaround" }));
  }
  // field-weld flag at the junction, pointing toward the tail (left)
  if (joint.field) {
    const fx = refX1;
    const fy = refY;
    nodes.push(lineEl({ x1: fx, y1: fy, x2: fx, y2: fy - 14, class: "sx-weld-flag" }));
    nodes.push(polygon({ points: `${fx},${fy - 14} ${fx},${fy - 6} ${fx - 11},${fy - 10}`, class: "sx-weld-flag" }));
  }

  // tail (left end) + text
  if (joint.tail) {
    nodes.push(lineEl({ x1: refX0, y1: refY, x2: refX0 - 12, y2: refY - 7, class: "sx-weld-ref" }));
    nodes.push(lineEl({ x1: refX0, y1: refY, x2: refX0 - 12, y2: refY + 7, class: "sx-weld-ref" }));
    nodes.push(textEl({ x: refX0 - 16, y: refY, class: "sx-weld-tailtext" }, joint.tail));
  }

  // joint label under the band
  if (joint.label) {
    nodes.push(textEl({ x: symbolX, y: r2(bandTop + lay.bandH - 16), class: "sx-weld-label" }, joint.label));
  }

  const desc = describeJoint(joint);
  return group({ class: "sx-weld-joint", "data-joint": joint.label ?? "" }, [titleEl(desc), ...nodes]);
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

  if (ast.title) {
    body.push(textEl({ x: lay.canvasWidth / 2, y: 26, class: "sx-welding-title" }, ast.title));
  }

  ast.joints.forEach((joint, i) => {
    const bandTop = lay.titleH + i * lay.bandH;
    body.push(renderJoint(joint, ast, bandTop, lay));
  });

  if (ast.joints.length === 0) {
    body.push(
      textEl({ x: lay.canvasWidth / 2, y: 70, class: "sx-weld-label" }, "Add a joint, e.g.  joint \"plate\" { arrow: fillet size=8 }"),
    );
  }

  // AI-readable warnings block
  if (ast.warnings.length > 0) {
    body.push(textEl({ x: 22, y: lay.warningsY + 14, class: "sx-weld-warn-head" }, "⚠ Validation:"));
    ast.warnings.forEach((w, i) => {
      body.push(textEl({ x: 22, y: lay.warningsY + 32 + i * 16, class: "sx-weld-warn" }, w));
    });
  }

  return svgRoot(
    {
      class: "sx-welding",
      "data-diagram-type": "welding",
      "data-standard": ast.standard,
      width: lay.canvasWidth,
      height: lay.canvasHeight,
      viewBox: `0 0 ${lay.canvasWidth} ${lay.canvasHeight}`,
      role: "graphics-document",
    },
    [
      titleEl(ast.title ? `Welding symbols — ${escapeXml(ast.title)}` : "Welding symbols"),
      descEl(
        `Welding-symbol diagram (${ast.standard.toUpperCase()}) — ${ast.joints.length} joint(s): ${ast.joints.map(describeJoint).join(" · ")}`,
      ),
      defs([el("style", {}, CSS)]),
      ...body,
    ],
  );
}

export function renderWelding(text: string, _config?: RenderConfig): string {
  return renderWeldingAST(parseWelding(text));
}
