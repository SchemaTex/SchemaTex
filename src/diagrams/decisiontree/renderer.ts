import { estimateTextWidth } from "../../core/text-metrics";
import { CLASS_COLORS, classTone, classNames, mlLines, questionLines } from "./presentation";
import type { RenderConfig, SceneItem } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  rect,
  circle,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutDecisionTree } from "./layout";
import { resolveSceneTitle } from "../../core/title-scene";
import { renderInfluence } from "./influence-renderer";
import type {
  DTreeAST,
  DTreeLayoutNode,
  DTreeLayoutResult,
  DTreeNode,
  InfluenceAST,
} from "./types";

function buildCss(t: BaseTheme): string {
  return `
.lt-dtree { font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; }
.lt-dtree-title { font-size: 20px; font-weight: 600; fill: ${t.text}; }
.lt-dtree-edge { fill: none; stroke: ${t.stroke}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.lt-dtree-edge-optimal { fill: none; stroke: ${t.positive}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.lt-dtree-edge-leader { fill: none; stroke: ${t.stroke}; stroke-width: 1; stroke-dasharray: 2 2; opacity: 0.55; }
.lt-dtree-edge-label { font-size: 11px; font-weight: 500; fill: ${t.text}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-edge-prob { font-size: 10px; font-weight: 400; font-style: italic; fill: ${t.textMuted}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-edge-label-bg { fill: ${t.bg}; stroke: none; }
.lt-dtree-decision { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.6; }
.lt-dtree-chance { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.6; }
.lt-dtree-outcome { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.4; }
.lt-dtree-node-label { font-size: 12px; font-weight: 500; fill: ${t.text}; }
.lt-dtree-ev { font-size: 10px; font-weight: 500; fill: ${t.textMuted}; }
.lt-dtree-ev-optimal { font-size: 10px; font-weight: 600; fill: ${t.positive}; }
.lt-dtree-payoff { font-size: 12px; font-weight: 600; fill: ${t.text}; }
.lt-dtree-payoff-neg { font-size: 12px; font-weight: 600; fill: ${t.text}; }
.lt-dtree-card { stroke-width: 1.5; }
.lt-dtree-card-label { font-size: 13px; fill: ${t.text}; text-anchor: middle; }
.lt-dtree-card-stats { font-size: 11px; fill: ${t.textMuted}; text-anchor: middle; }
.lt-dtree-card-header { font-size: 10px; font-weight: 700; text-anchor: middle; }
.lt-dtree-badge { font-size: 10px; font-weight: 700; fill: ${t.bg}; text-anchor: middle; }
.lt-dtree-legend { font-size: 11px; fill: ${t.textMuted}; }
`.trim();
}

// ─── Decision-mode node rendering ────────────────────────────

function sceneLabelAttrs(n: DTreeNode, scene?: SceneItem[]): Record<string, string | undefined> {
  return {
    "data-sx-role": scene && n.labelSourceRange ? "label" : undefined,
  };
}

function renderDecisionNode(ln: DTreeLayoutNode, layout: DTreeLayoutResult, scene?: SceneItem[]): string {
  const n = ln.node;
  const parts: string[] = [];
  const sibH = layout.direction === "top-down";

  if (n.kind === "end") {
    const x = ln.x - ln.width / 2;
    const pts = sibH
      ? `${ln.x},${ln.y-ln.height/2} ${x},${ln.y+ln.height/2} ${x+ln.width},${ln.y+ln.height/2}`
      : `${x},${ln.y} ${x+ln.width},${ln.y-ln.height/2} ${x+ln.width},${ln.y+ln.height/2}`;
    parts.push(polygon({points:pts,class:"lt-dtree-outcome"}));
    if (n.payoff !== undefined) parts.push(textEl({x:sibH?ln.x:ln.x+ln.width/2+12,y:sibH?ln.y+ln.height/2+18:ln.y+4,class:"lt-dtree-payoff","text-anchor":sibH?"middle":"start"},formatPayoff(n.payoff)));
    if (n.label && n.incomingProb === undefined) parts.push(textEl({x:ln.x,y:ln.y-ln.height/2-10,class:"lt-dtree-node-label","text-anchor":"middle",...sceneLabelAttrs(n,scene)},n.label));
  } else {
    if (n.kind === "decision") parts.push(rect({x:ln.x-ln.width/2,y:ln.y-ln.height/2,width:ln.width,height:ln.height,rx:2,class:"lt-dtree-decision"}));
    else parts.push(circle({cx:ln.x,cy:ln.y,r:ln.width/2,class:"lt-dtree-chance"}));
    if (n.label) parts.push(textEl({x:ln.x,y:ln.y+ln.height/2+16,class:"lt-dtree-node-label","text-anchor":"middle",...sceneLabelAttrs(n,scene)},n.label));
    if (n.ev !== undefined) {
      const label = `EV ${formatPayoff(n.ev)}`;
      const w=estimateTextWidth(label,11)+14, y=ln.y-ln.height/2-26;
      parts.push(rect({x:ln.x-w/2,y,width:w,height:20,rx:4,class:"lt-dtree-outcome"}));
      parts.push(textEl({x:ln.x,y:y+14,class:"lt-dtree-ev","text-anchor":"middle"},label));
    }
  }

  return group({
    "data-node-id": n.id,
    "data-node-kind": n.kind,
    "data-ev": n.ev !== undefined ? String(n.ev) : "",
    "data-sx-key": scene ? `node:${n.id}` : undefined,
    "data-sx-owner": scene ? `node:${n.id}` : undefined,
  }, parts);
}

function formatPayoff(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`;
  if (abs >= 1000) return `${sign}$${abs.toLocaleString()}`;
  return `${sign}${Math.abs(n)}`;
}

// ─── Question and classifier cards ──────────────────────────
function renderCard(ln: DTreeLayoutNode, ast: DTreeAST, t: BaseTheme, names: string[], step: number, scene?: SceneItem[]): string {
  const n = ln.node, x = ln.x - ln.width / 2, y = ln.y - ln.height / 2;
  const question = n.kind === "question";
  const leaf = !n.children.length;
  const tone = n.className ? classTone(n.className, names, ast.mode) : undefined;
  const color = tone?.edge ?? t.stroke;
  const parts: string[] = [];
  if (question) {
    const cut = 18;
    parts.push(polygon({points: `${x},${ln.y} ${x+cut},${y} ${x+ln.width-cut},${y} ${x+ln.width},${ln.y} ${x+ln.width-cut},${y+ln.height} ${x+cut},${y+ln.height}`, fill:t.fillMuted, stroke:t.stroke, class:"lt-dtree-card"}));
    parts.push(circle({cx:x, cy:ln.y, r:9, fill:t.stroke, stroke:t.bg, "stroke-width":1.5}));
    parts.push(textEl({x, y:ln.y+3.5, class:"lt-dtree-badge"}, String(step)));
  } else {
    parts.push(rect({x,y,width:ln.width,height:ln.height,rx:6,fill:leaf && tone && t.bg === "#ffffff" ? tone.tint : t.fillMuted,stroke:leaf?color:t.stroke,class:"lt-dtree-card"}));
  }
  const header = leaf && !!n.className;
  if (header) {
    parts.push(pathEl({d:`M ${x} ${y+24} V ${y+6} Q ${x} ${y} ${x+6} ${y} H ${x+ln.width-6} Q ${x+ln.width} ${y} ${x+ln.width} ${y+6} V ${y+24} Z`,fill:tone!.band}));
    parts.push(textEl({x:ln.x,y:y+16,fill:tone!.on,class:"lt-dtree-card-header"},n.className!.toUpperCase()));
  }
  if (ast.mode === "taxonomy") {
    const lines = questionLines(n);
    const center = ln.y + (header ? 12 : 0);
    lines.forEach((line,i) => parts.push(textEl({x:ln.x,y:center-(lines.length-1)*8.5+i*17+4.5,class:"lt-dtree-card-label",...sceneLabelAttrs(n,scene)},line)));
  } else {
    const lines = mlLines(n,ast);
    let cy = y + (header ? 44 : 22);
    lines.forEach((line,i) => {
      parts.push(textEl({x:ln.x,y:cy,class:i===0?"lt-dtree-card-label":"lt-dtree-card-stats",...(i===0 && n.label ? sceneLabelAttrs(n,scene) : {})},line));
      cy += 17;
    });
    if (Array.isArray(n.value) && n.value.length) {
      const total = n.value.reduce((a,b)=>a+b,0), barW=ln.width-24;
      let bx=x+12;
      n.value.forEach((v,i)=>{
        const w=total>0?v/total*barW:0;
        if(w>0) parts.push(rect({x:bx,y:cy-4,width:w,height:7,fill:CLASS_COLORS[i%CLASS_COLORS.length]}));
        bx+=w;
      });
      const widths=n.value.map(v=>estimateTextWidth(String(v),10.5)+28);
      let cx=ln.x-widths.reduce((a,b)=>a+b,0)/2;
      n.value.forEach((v,i)=>{
        parts.push(rect({x:cx,y:cy+12,width:6,height:6,fill:CLASS_COLORS[i%CLASS_COLORS.length]}));
        parts.push(textEl({x:cx+10+estimateTextWidth(String(v),10.5)/2,y:cy+18,class:"lt-dtree-card-stats"},String(v)));
        cx+=widths[i]!;
      });
    }
  }
  return group({"data-node-id":n.id,"data-node-kind":n.kind,"data-class":n.className},parts);
}

// ─── Top-level renderer ──────────────────────────────────────

export function renderDecisionTree(ast: DTreeAST | InfluenceAST, config?: RenderConfig): string {
  // InfluenceAST is structurally distinct (node/arc DAG); discriminate on `arcs`
  // since `mode === "influence"` is also a legal value of DTreeAST.mode.
  if ("arcs" in ast) return renderInfluence(ast, config);
  const base = resolveBaseTheme(config?.theme ?? "default");
  const t = !config?.theme || config.theme === "default"
    ? {...base, text:"#1F2933", stroke:"#3E4C59", textMuted:"#52606D", fillMuted:"#F0F4F8", positive:"#2B7A4B"} : base;
  const layout = layoutDecisionTree(ast);

  const names = classNames(ast);
  const titleOffset = (ast.title ? 52 : 10) + (names.length ? 28 : 0);
  const width = Math.ceil(Math.max(layout.width, estimateTextWidth(ast.title ?? "",20,{fontWeight:600})+80, names.reduce((w,n)=>w+estimateTextWidth(n,11)+36,80)));
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Decision Tree"));
  children.push(desc(`Decision tree (${ast.mode} mode) with ${layout.nodes.length} nodes and ${layout.edges.length} edges`));
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    const title = resolveSceneTitle(ast.title, ast.titleSourceRange, 40 + Math.max(48, ast.title.length * 9 + 10) / 2, 32, config);
    children.push(textEl({ x: title.bbox.x, y: title.y, class: "lt-dtree-title", "text-anchor": "start", ...title.attrs }, ast.title));
  }

  let legendX=40;
  names.forEach((name)=>{
    children.push(rect({x:legendX,y:titleOffset-15,width:8,height:8,rx:2,fill:classTone(name,names,ast.mode).band}));
    children.push(textEl({x:legendX+14,y:titleOffset-7,class:"lt-dtree-legend"},name));
    legendX+=estimateTextWidth(name,11)+36;
  });
  const inner: string[] = [];
  const steps = layout.nodes.filter(n=>n.node.kind==="question").sort((a,b)=>a.depth-b.depth || a.x-b.x || a.y-b.y);
  if(ast.mode!=="decision") children.push(el("defs",{},el("marker",{id:"dtree-arrow",viewBox:"0 0 8 8",refX:8,refY:4,markerWidth:7,markerHeight:7,markerUnits:"userSpaceOnUse",orient:"auto"},pathEl({d:"M 0 0 L 8 4 L 0 8 Z",fill:t.stroke}))));

  // Edges first (back layer)
  for (const e of [...layout.edges].sort((a,b)=>Number(a.isOptimal)-Number(b.isOptimal))) {
    const cls = e.isOptimal ? "lt-dtree-edge-optimal" : "lt-dtree-edge";
    const attrs: Record<string, string | number> = { d: e.path, class: cls, "data-edge": `${e.from}->${e.to}` };
    if (e.strokeWidth !== undefined && !e.isOptimal) attrs["stroke-width"] = e.strokeWidth;
    if (ast.mode !== "decision") attrs["marker-end"] = "url(#dtree-arrow)";
    inner.push(pathEl(attrs));
  }

  // Edge labels — use layout.labelAnchors for accurate placement (works for all edge styles).
  const anchors = layout.labelAnchors ?? {};
  for (const e of layout.edges) {
    if (!e.label) continue;
    const a = anchors[e.to];
    if (!a) continue;

    // Decision mode: probability vs choice styling
    const isProb = ast.mode === "decision" && /^p=/i.test(e.label);
    const labelClass = isProb ? "lt-dtree-edge-prob" : "lt-dtree-edge-label";

    // For diagonal/bracket, nudge label slightly perpendicular to edge to avoid covering the line
    let lx = a.x;
    let ly = a.y;
    const absAngle = Math.abs(a.angle);
    const perpOffset = layout.edgeStyle === "diagonal" || layout.edgeStyle === "bracket" ? 9 : 0;
    if (perpOffset > 0 && absAngle > 1 && absAngle < 89) {
      // Move perpendicular to edge direction
      const rad = (a.angle * Math.PI) / 180;
      const nx = -Math.sin(rad);
      const ny = Math.cos(rad);
      // Flip so label sits "above" the edge consistently
      const flip = ny < 0 ? -1 : 1;
      lx += nx * perpOffset * flip;
      ly += ny * perpOffset * flip;
    }

    const w = Math.max(estimateTextWidth(e.label, 11) + 10, 18);
    if (ast.mode !== "decision" && layout.edgeStyle === "orthogonal" && layout.direction === "top-down") {
      const parent = layout.nodes.find(n => n.node.id === e.from)!;
      const child = layout.nodes.find(n => n.node.id === e.to)!;
      lx += (child.x < parent.x ? -1 : 1) * w / 2;
    }
    const h = 14;
    inner.push(rect({
      x: lx - w / 2, y: ly - h / 2, width: w, height: h,
      class: "lt-dtree-edge-label-bg", rx: 3, ry: 3,
    }));
    inner.push(textEl({ x: lx, y: ly, class: labelClass }, e.label));
  }

  // Nodes on top
  for (const ln of layout.nodes) {
    config?.__scene?.push({
      key: `node:${ln.node.id}`,
      kind: "node",
      label: ln.node.label,
      sourceRange: ln.node.labelSourceRange,
      bbox: { x: ln.x - ln.width / 2, y: ln.y - ln.height / 2, width: ln.width, height: ln.height },
      editable: { label: ln.node.labelSourceRange !== undefined, position: "none" },
    });
    if (ast.mode === "decision") inner.push(renderDecisionNode(ln, layout, config?.__scene));
    else inner.push(renderCard(ln, ast, t, names, steps.indexOf(ln)+1, config?.__scene));
  }

  children.push(group({ transform: `translate(0, ${titleOffset})`, "data-mode": ast.mode }, inner));

  return svgRoot({
    class: "lt-dtree",
    role: "img",
    "aria-label": escapeXml(ast.title ?? `Decision tree (${ast.mode})`),
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  }, children);
}
