/**
 * FBD renderer — Function Block Diagram SVG output.
 * IEC 61131-3 §6.4 visual conventions; see 23-FBD-STANDARD.md.
 */

import type { FbdAst, FbdDataType, FbdLayoutBlock, FbdLayoutNetwork, FbdLayoutResult } from "../../core/types";
import { defs, el, group, line, path, rect, svgRoot, text, title, desc, circle, escapeXml } from "../../core/svg";
import { parseFbd } from "./parser";
import { layoutFbd, FBD_CONST } from "./layout";
import { isStdBlock, getBlockSpec } from "./blocks";

const STYLES = `
.lt-fbd-bg { fill: #ffffff; }
.lt-fbd-block-body { fill: #ffffff; stroke: #333; stroke-width: 1.5; }
.lt-fbd-block-header { fill: #f0f0f0; stroke: #333; stroke-width: 1.5; }
.lt-fbd-block-name { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 12px; font-weight: 700; fill: #111; }
.lt-fbd-inner-symbol { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 18px; font-weight: 700; fill: #111; }
.lt-fbd-instance-tag { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-style: italic; font-size: 10px; fill: #555; }
.lt-fbd-port-label { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; fill: #333; }
.lt-fbd-const-box { fill: #fffde7; stroke: #c9b14b; stroke-width: 1; }
.lt-fbd-const-text { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; fill: #5a4a00; }
.lt-fbd-var-term { fill: #eef4ff; stroke: #3a5fbf; stroke-width: 1.2; }
.lt-fbd-var-term-text { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 11px; font-weight: 600; fill: #1a3380; }
.lt-fbd-wire-bool   { stroke: #000;     stroke-width: 1.5; fill: none; }
.lt-fbd-wire-int    { stroke: #1976d2;  stroke-width: 1.5; fill: none; }
.lt-fbd-wire-real   { stroke: #f57c00;  stroke-width: 1.5; fill: none; }
.lt-fbd-wire-time   { stroke: #c2185b;  stroke-width: 1.5; fill: none; }
.lt-fbd-wire-string { stroke: #2e7d32;  stroke-width: 1.5; fill: none; }
.lt-fbd-wire-bits   { stroke: #000;     stroke-width: 1.5; stroke-dasharray: 5 3; fill: none; }
.lt-fbd-wire-any    { stroke: #555;     stroke-width: 1.5; fill: none; }
.lt-fbd-junction { fill: #000; }
.lt-fbd-negation { fill: #fff; stroke: #333; stroke-width: 1; }
.lt-fbd-port-stub { stroke: #333; stroke-width: 1.2; fill: none; }
.lt-fbd-network-frame { fill: none; stroke: #bbb; stroke-dasharray: 4 3; }
.lt-fbd-network-title { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 11px; fill: #555; }
.lt-fbd-title { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 14px; font-weight: 700; fill: #111; }
`;

function wireClass(t: FbdDataType): string {
  switch (t) {
    case "bool": return "lt-fbd-wire-bool";
    case "int":
    case "dint":
    case "uint":
    case "udint": return "lt-fbd-wire-int";
    case "real":
    case "lreal": return "lt-fbd-wire-real";
    case "time":
    case "date":
    case "tod": return "lt-fbd-wire-time";
    case "string":
    case "wstring": return "lt-fbd-wire-string";
    case "byte":
    case "word":
    case "dword": return "lt-fbd-wire-bits";
    default: return "lt-fbd-wire-any";
  }
}

function renderBlock(lb: FbdLayoutBlock): string {
  const { x, y, width, height, block } = lb;
  const headerH = FBD_CONST.block_header_h;
  const parts: string[] = [];

  // Body
  parts.push(rect({ class: "lt-fbd-block-body", x, y, width, height, rx: 2, ry: 2 }));
  // Header bar
  parts.push(rect({ class: "lt-fbd-block-header", x, y, width, height: headerH }));
  // Header label
  parts.push(text(
    { class: "lt-fbd-block-name", x: x + width / 2, y: y + headerH * 0.7, "text-anchor": "middle" },
    block.blockType
  ));

  // Instance tag (italic above header)
  if (block.instance && block.instance !== block.id) {
    parts.push(text(
      { class: "lt-fbd-instance-tag", x: x + width / 2, y: y - 4, "text-anchor": "middle" },
      block.instance
    ));
  }

  // Inner IEC symbol
  if (isStdBlock(block.blockType)) {
    const spec = getBlockSpec(block.blockType);
    if (spec.innerSymbol) {
      parts.push(text(
        { class: "lt-fbd-inner-symbol", x: x + width / 2, y: y + headerH + (height - headerH) / 2 + 4, "text-anchor": "middle" },
        spec.innerSymbol
      ));
    }
  }

  // Ports
  for (const p of lb.ports) {
    // Port stub line
    parts.push(line({
      class: "lt-fbd-port-stub",
      x1: p.edgeX, y1: p.y,
      x2: p.x, y2: p.y,
    }));
    // Port label inside the block
    if (p.side === "in") {
      parts.push(text(
        { class: "lt-fbd-port-label", x: p.edgeX + 4, y: p.y + 3 },
        p.name
      ));
    } else {
      parts.push(text(
        { class: "lt-fbd-port-label", x: p.edgeX - 4, y: p.y + 3, "text-anchor": "end" },
        p.name
      ));
    }
    // Negation bubble at port outer end
    if (p.negated) {
      const cx = p.side === "in" ? p.x - FBD_CONST.negation_bubble_r : p.x + FBD_CONST.negation_bubble_r;
      parts.push(circle({ class: "lt-fbd-negation", cx, cy: p.y, r: FBD_CONST.negation_bubble_r }));
    }
    // Inline constant box
    if (p.constant !== undefined) {
      const tw = Math.max(28, p.constant.length * 6 + 8);
      const bx = p.x - tw - 2;
      const by = p.y - 8;
      parts.push(rect({ class: "lt-fbd-const-box", x: bx, y: by, width: tw, height: 14, rx: 2, ry: 2 }));
      parts.push(text(
        { class: "lt-fbd-const-text", x: bx + tw / 2, y: by + 10, "text-anchor": "middle" },
        p.constant
      ));
    }
  }

  // Output negation (overall) — IEC NAND/NOR/NOT/XNOR
  if (isStdBlock(block.blockType)) {
    const spec = getBlockSpec(block.blockType);
    if (spec.outputNegated) {
      const outPort = lb.ports.find((p) => p.side === "out");
      if (outPort) {
        parts.push(circle({
          class: "lt-fbd-negation",
          cx: outPort.edgeX + FBD_CONST.negation_bubble_r,
          cy: outPort.y,
          r: FBD_CONST.negation_bubble_r,
        }));
      }
    }
  }

  return group(
    {
      class: "lt-fbd-block",
      "data-block-type": block.blockType,
      "data-instance": block.instance ?? "",
    },
    parts
  );
}

function renderNetwork(ln: FbdLayoutNetwork): string {
  const parts: string[] = [];
  // Frame
  parts.push(rect({
    class: "lt-fbd-network-frame",
    x: ln.x + 4, y: ln.y + 4,
    width: ln.width - 8,
    height: ln.height - 8,
    rx: 4, ry: 4,
  }));
  // Title
  const titleText = ln.network.title
    ? `${ln.network.index} — ${ln.network.title}`
    : `network ${ln.network.index}`;
  parts.push(text(
    { class: "lt-fbd-network-title", x: ln.x + 12, y: ln.y + 16 },
    titleText
  ));

  // Variable terminals
  for (const t of ln.varTerms) {
    parts.push(rect({
      class: "lt-fbd-var-term",
      x: t.x, y: t.y, width: t.width, height: t.height, rx: 3, ry: 3,
    }));
    parts.push(text(
      { class: "lt-fbd-var-term-text", x: t.x + t.width / 2, y: t.y + t.height / 2 + 4, "text-anchor": "middle" },
      t.name
    ));
  }

  // Wires
  for (const wl of ln.wires) {
    parts.push(path({
      class: wireClass(wl.wire.dataType),
      d: wl.path,
      "data-wire-type": wl.wire.dataType,
    }));
    if (wl.wire.negatedAtSink) {
      // Find sink point — last point of path
      const m = wl.path.match(/L\s+([\d.\-]+)\s+([\d.\-]+)\s*$/);
      if (m) {
        const sx = parseFloat(m[1]);
        const sy = parseFloat(m[2]);
        parts.push(circle({
          class: "lt-fbd-negation",
          cx: sx - FBD_CONST.negation_bubble_r,
          cy: sy,
          r: FBD_CONST.negation_bubble_r,
        }));
      }
    }
  }

  // Junctions
  for (const j of ln.junctions) {
    parts.push(circle({ class: "lt-fbd-junction", cx: j.x, cy: j.y, r: 3 }));
  }

  // Blocks (drawn after wires so they sit on top)
  for (const b of ln.blocks) parts.push(renderBlock(b));

  return group({ class: "lt-fbd-network", "data-network": ln.network.index }, parts);
}

export function renderFbdLayout(layout: FbdLayoutResult): string {
  const margin = 24;
  const w = layout.width + margin * 2 + 16;
  const h = layout.height + margin * 2;
  const styleBlock = el("style", {}, escapeXml(STYLES).replace(/&quot;/g, '"'));
  const titleEl = title(`FBD: ${layout.ast.title ?? "Function Block Diagram"}`);
  const descEl = desc(`FBD with ${layout.networks.length} network(s).`);
  const root = group(
    { transform: `translate(${margin},${margin})` },
    layout.networks.map(renderNetwork)
  );

  return svgRoot(
    {
      width: w,
      height: h,
      viewBox: `0 0 ${w} ${h}`,
      class: "lt-fbd",
      "data-diagram-type": "fbd",
    },
    [
      defs([styleBlock]),
      titleEl,
      descEl,
      rect({ class: "lt-fbd-bg", x: 0, y: 0, width: w, height: h }),
      root,
    ]
  );
}

export function renderFbd(text: string): string {
  const ast: FbdAst = parseFbd(text);
  const layout = layoutFbd(ast);
  return renderFbdLayout(layout);
}
