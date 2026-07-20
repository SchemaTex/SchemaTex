/**
 * UML Sequence diagram — SVG renderer.
 *
 * Spec: docs/reference/33-SEQUENCE-STANDARD.md §3, §7
 */

import type { RenderConfig, SceneItem } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  rect,
  circle,
  line,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { parseSequence } from "./parser";
import { layoutSequence } from "./layout";
import { resolveSceneTitle } from "../../core/title-scene";
import type {
  SeqActivationBar,
  SeqAst,
  SeqDividerBar,
  SeqFragmentFrame,
  SeqInvariantBox,
  SeqLayoutResult,
  SeqLifeline,
  SeqMessageRow,
  SeqNoteBox,
  SeqRefFrame,
} from "./types";

const HEAD = "#e8f0fb";
const HEAD_STROKE = "#5b85c0";

function buildCss(t: BaseTheme): string {
  return `
.sx-seq { font-family: system-ui, -apple-system, sans-serif; }
.sx-seq-axis { stroke: ${t.neutral}; stroke-width: 1; stroke-dasharray: 4 4; }
.sx-seq-head rect, .sx-seq-head path { fill: ${HEAD}; stroke: ${HEAD_STROKE}; stroke-width: 1.4; }
.sx-seq-head-name { font: 600 12.5px sans-serif; fill: ${t.text}; }
.sx-seq-head-stereo { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.sx-seq-actor line, .sx-seq-actor circle { stroke: ${t.stroke}; stroke-width: 1.6; fill: none; stroke-linecap: round; }
.sx-seq-actor-head { fill: ${t.bg}; }
.sx-seq-icon { fill: ${t.bg}; stroke: ${HEAD_STROKE}; stroke-width: 1.6; }
.sx-seq-icon-line { stroke: ${HEAD_STROKE}; stroke-width: 1.6; fill: none; stroke-linecap: round; }
.sx-seq-icon-fill { fill: ${HEAD_STROKE}; stroke: none; }
.sx-seq-act { fill: ${t.bg}; stroke: ${HEAD_STROKE}; stroke-width: 1.2; }
.sx-seq-msg { stroke: ${t.stroke}; stroke-width: 1.5; fill: none; }
.sx-seq-msg-reply { stroke: ${t.stroke}; stroke-width: 1.4; fill: none; stroke-dasharray: 6 4; }
.sx-seq-msg-label { font: 11px sans-serif; fill: ${t.text}; }
.sx-seq-msg-num { font: 600 10px sans-serif; fill: ${t.textMuted}; }
.sx-seq-endpoint { fill: ${t.stroke}; }
.sx-seq-frame { fill: none; stroke: ${t.neutral}; stroke-width: 1.2; }
.sx-seq-frame-neg { fill: ${t.negative}; fill-opacity: 0.06; }
.sx-seq-frame-sep { stroke: ${t.neutral}; stroke-width: 1; stroke-dasharray: 5 4; }
.sx-seq-frame-tab { fill: ${t.fillMuted}; stroke: ${t.neutral}; stroke-width: 1.2; }
.sx-seq-frame-op { font: 700 11px sans-serif; fill: ${t.text}; }
.sx-seq-guard { font: italic 10.5px sans-serif; fill: ${t.textMuted}; }
.sx-seq-ref-name { font: 600 12px sans-serif; fill: ${t.text}; }
.sx-seq-note rect { fill: #fdf6da; stroke: #d9c97e; stroke-width: 1.1; }
.sx-seq-note path { fill: #efe2a6; stroke: #d9c97e; stroke-width: 1.1; }
.sx-seq-note-text { font: 11px sans-serif; fill: ${t.text}; }
.sx-seq-div line { stroke: ${t.neutral}; stroke-width: 1; }
.sx-seq-div rect { fill: ${t.fillMuted}; stroke: ${t.neutral}; stroke-width: 1; }
.sx-seq-div-text { font: 600 11px sans-serif; fill: ${t.textMuted}; }
.sx-seq-inv rect { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1.1; }
.sx-seq-inv-text { font: italic 10.5px sans-serif; fill: ${t.textMuted}; }
.sx-seq-destroy { stroke: ${t.negative}; stroke-width: 2; }
.sx-seq-title { font: 700 16px sans-serif; fill: ${t.text}; }
`.trim();
}

function markers(t: BaseTheme): string {
  return defs([
    el(
      "marker",
      { id: "sx-seq-filled", viewBox: "0 0 12 10", refX: 10, refY: 5, markerWidth: 11, markerHeight: 9, orient: "auto" },
      [el("polygon", { points: "0,0 11,5 0,10", fill: t.stroke })],
    ),
    el(
      "marker",
      { id: "sx-seq-open", viewBox: "0 0 12 10", refX: 10, refY: 5, markerWidth: 12, markerHeight: 10, orient: "auto" },
      [el("polyline", { points: "0,0 10,5 0,10", fill: "none", stroke: t.stroke, "stroke-width": 1.5 })],
    ),
  ]);
}

const CHAR_W = 6.0;

// ── lifelines ──────────────────────────────────────────────────

function renderLifeline(ll: SeqLifeline, scene?: SceneItem[], sceneOffsetY = 0): string {
  const parts: string[] = [];
  // time axis
  parts.push(line({ class: "sx-seq-axis", x1: ll.x, y1: ll.axisTop, x2: ll.x, y2: ll.axisBottom }));
  parts.push(renderHead(ll, scene !== undefined && ll.participant.nameSourceRange !== undefined));
  const key = `node:${ll.participant.id}`;
  scene?.push({
    key,
    kind: "node",
    semanticId: ll.participant.id,
    label: ll.participant.name,
    sourceRange: ll.participant.nameSourceRange,
    bbox: { x: ll.headX, y: ll.headY + sceneOffsetY, width: ll.headW, height: ll.headH },
    editable: { label: ll.participant.nameSourceRange !== undefined, position: "move-x" },
  });
  return group({
    class: "sx-seq-lifeline",
    "data-id": ll.participant.id,
    "data-kind": ll.participant.kind,
    "data-sx-key": scene ? key : undefined,
  }, parts);
}

function renderHead(ll: SeqLifeline, editableLabel = false): string {
  const p = ll.participant;
  const cx = ll.x;
  const stereo = p.stereotype ? `«${p.stereotype}»` : null;

  if (p.kind === "actor") {
    const topY = ll.headY;
    const fig: string[] = [];
    if (stereo) {
      fig.push(textEl({ class: "sx-seq-head-stereo", x: cx, y: topY - 4, "text-anchor": "middle" }, stereo));
    }
    fig.push(
      circle({ class: "sx-seq-actor-head", cx, cy: topY + 6, r: 4.5 }),
      line({ x1: cx, y1: topY + 10, x2: cx, y2: topY + 22 }),
      line({ x1: cx - 8, y1: topY + 14, x2: cx + 8, y2: topY + 14 }),
      line({ x1: cx, y1: topY + 22, x2: cx - 7, y2: topY + 32 }),
      line({ x1: cx, y1: topY + 22, x2: cx + 7, y2: topY + 32 }),
      textEl({ class: "sx-seq-head-name", x: cx, y: topY + 44, "text-anchor": "middle", "data-sx-role": editableLabel ? "label" : undefined }, p.name),
    );
    return group({ class: "sx-seq-actor sx-seq-head" }, fig);
  }

  if (p.kind === "boundary" || p.kind === "control" || p.kind === "entity") {
    return renderRobustnessIcon(ll, stereo, editableLabel);
  }

  if (p.kind === "database") {
    const w = ll.headW;
    const h = ll.headH;
    const x = ll.headX;
    const y = ll.headY;
    const ry = 5;
    const d = `M ${x} ${y + ry} a ${w / 2} ${ry} 0 0 1 ${w} 0 v ${h - 2 * ry} a ${w / 2} ${ry} 0 0 1 ${-w} 0 Z M ${x} ${y + ry} a ${w / 2} ${ry} 0 0 0 ${w} 0`;
    return group({ class: "sx-seq-head" }, [
      pathEl({ d }),
      textEl({ class: "sx-seq-head-name", x: cx, y: y + h / 2 + 6, "text-anchor": "middle", "data-sx-role": editableLabel ? "label" : undefined }, p.name),
    ]);
  }

  const parts: string[] = [
    rect({ x: ll.headX, y: ll.headY, width: ll.headW, height: ll.headH, rx: 3, ry: 3 }),
  ];
  // collections/queue carry their kind label by default; any kind can be overridden
  // with a custom stereotype.
  const stereoText = stereo ?? (p.kind === "collections" || p.kind === "queue" ? `«${p.kind}»` : null);
  if (stereoText) {
    parts.push(
      textEl({ class: "sx-seq-head-stereo", x: cx, y: ll.headY + 14, "text-anchor": "middle" }, stereoText),
    );
    parts.push(
      textEl({ class: "sx-seq-head-name", x: cx, y: ll.headY + 28, "text-anchor": "middle", "data-sx-role": editableLabel ? "label" : undefined }, p.name),
    );
  } else {
    parts.push(
      textEl({ class: "sx-seq-head-name", x: cx, y: ll.headY + ll.headH / 2 + 5, "text-anchor": "middle", "data-sx-role": editableLabel ? "label" : undefined }, p.name),
    );
  }
  return group({ class: "sx-seq-head" }, parts);
}

/** Jacobson analysis-class icons (UML robustness): boundary / control / entity. */
function renderRobustnessIcon(ll: SeqLifeline, stereo: string | null, editableLabel = false): string {
  const p = ll.participant;
  const cx = ll.x;
  const R = 11;
  const cy = ll.headY + 14;
  const parts: string[] = [];
  if (stereo) {
    parts.push(textEl({ class: "sx-seq-head-stereo", x: cx, y: ll.headY - 2, "text-anchor": "middle" }, stereo));
  }
  parts.push(circle({ class: "sx-seq-icon", cx, cy, r: R }));
  if (p.kind === "boundary") {
    const bx = cx - R - 9;
    parts.push(line({ class: "sx-seq-icon-line", x1: bx, y1: cy - R, x2: bx, y2: cy + R }));
    parts.push(line({ class: "sx-seq-icon-line", x1: bx, y1: cy, x2: cx - R, y2: cy }));
  } else if (p.kind === "entity") {
    parts.push(line({ class: "sx-seq-icon-line", x1: cx - R - 2, y1: cy + R + 1, x2: cx + R + 2, y2: cy + R + 1 }));
  } else {
    // control: small arrowhead nub at the top of the circle
    parts.push(
      polygon({ class: "sx-seq-icon-fill", points: `${cx - 2},${cy - R - 6} ${cx + 5},${cy - R - 1} ${cx - 3},${cy - R + 2}` }),
    );
  }
  parts.push(textEl({ class: "sx-seq-head-name", x: cx, y: ll.headY + 44, "text-anchor": "middle", "data-sx-role": editableLabel ? "label" : undefined }, p.name));
  return group({ class: "sx-seq-head sx-seq-icon-head", "data-icon": p.kind }, parts);
}

// ── activation bars ─────────────────────────────────────────────

function renderActivation(a: SeqActivationBar): string {
  const h = Math.max(6, a.yBottom - a.yTop);
  return rect({
    class: "sx-seq-act",
    "data-id": a.id,
    x: a.x,
    y: a.yTop,
    width: 10,
    height: h,
  });
}

// ── messages ────────────────────────────────────────────────────

function renderMessage(m: SeqMessageRow, scene?: SceneItem[], index = 0, sceneOffsetY = 0): string {
  const k = m.message.arrow;
  const lineClass = k === "reply" ? "sx-seq-msg-reply" : "sx-seq-msg";
  const markerEnd = k === "async" || k === "reply" ? "url(#sx-seq-open)" : "url(#sx-seq-filled)";
  const parts: string[] = [];

  if (m.self) {
    const bottom = m.selfBottomY ?? m.y + 28;
    const right = m.x2;
    const d = `M ${m.x1} ${m.y} H ${right} V ${bottom} H ${m.x1}`;
    parts.push(pathEl({ class: lineClass, d, "marker-end": markerEnd, "data-sx-live-edge": scene ? "true" : undefined }));
    if (m.message.label) {
      parts.push(
        textEl(
          { class: "sx-seq-msg-label", x: right + 6, y: (m.y + bottom) / 2 + 3, "data-sx-key": scene && m.message.labelSourceRange ? `edge:${index}:label` : undefined, "data-sx-role": scene && m.message.labelSourceRange ? "label" : undefined, "data-sx-live-midpoint": scene ? "true" : undefined },
          numbered(m, m.message.label),
        ),
      );
    }
  } else {
    parts.push(scene
      ? pathEl({ class: lineClass, d: `M ${m.x1} ${m.y} L ${m.x2} ${m.y}`, "marker-end": markerEnd, "data-sx-live-edge": "true" })
      : line({ class: lineClass, x1: m.x1, y1: m.y, x2: m.x2, y2: m.y, "marker-end": markerEnd }));
    // lost / found endpoint circle
    if (k === "lost") parts.push(circle({ class: "sx-seq-endpoint", cx: m.x2, cy: m.y, r: 4 }));
    if (k === "found") parts.push(circle({ class: "sx-seq-endpoint", cx: m.x1, cy: m.y, r: 4 }));
    if (m.message.label) {
      const mid = (m.x1 + m.x2) / 2;
      parts.push(
        textEl(
          { class: "sx-seq-msg-label", x: mid, y: m.y - 6, "text-anchor": "middle", "data-sx-key": scene && m.message.labelSourceRange ? `edge:${index}:label` : undefined, "data-sx-role": scene && m.message.labelSourceRange ? "label" : undefined, "data-sx-live-midpoint": scene ? "true" : undefined },
          numbered(m, m.message.label),
        ),
      );
    }
  }

  const key = `edge:${index}`;
  scene?.push({
    key,
    kind: "edge",
    path: m.self
      ? `M ${m.x1} ${m.y} H ${m.x2} V ${m.selfBottomY ?? m.y + 28} H ${m.x1}`
      : `M ${m.x1} ${m.y} L ${m.x2} ${m.y}`,
    editable: { label: false, position: "none" },
  });
  if (scene && m.message.label && m.message.labelSourceRange) {
    const width = Math.max(20, numbered(m, m.message.label).length * 6 + 8);
    const x = m.self ? m.x2 + 6 : (m.x1 + m.x2) / 2 - width / 2;
    const y = (m.self ? (m.y + (m.selfBottomY ?? m.y + 28)) / 2 - 8 : m.y - 18) + sceneOffsetY;
    scene.push({
      key: `${key}:label`,
      kind: "label",
      label: m.message.label,
      sourceRange: m.message.labelSourceRange,
      bbox: { x, y, width, height: 16 },
      editable: { label: true, position: "none" },
    });
  }
  return group(
    {
      class: "sx-seq-message",
      "data-kind": k,
      "data-from": m.message.from,
      "data-to": m.message.to,
      "data-sx-key": scene ? key : undefined,
      "data-sx-live-explicit": scene ? "true" : undefined,
      "data-sx-live-start": scene ? m.message.from : undefined,
      "data-sx-live-end": scene ? m.message.to : undefined,
      "data-sx-live-mode": scene ? "orthogonal" : undefined,
    },
    parts,
  );
}

function numbered(m: SeqMessageRow, label: string): string {
  return m.number !== undefined ? `${m.number}. ${label}` : label;
}

// ── combined fragments ──────────────────────────────────────────

function tabWidth(f: SeqFragmentFrame): number {
  return Math.max(40, f.op.length * 8 + 22);
}

/** Frame box + operand separators — drawn *behind* activation bars. */
function renderFragmentBox(f: SeqFragmentFrame): string {
  const frameClass = f.op === "neg" ? "sx-seq-frame sx-seq-frame-neg" : "sx-seq-frame";
  const parts: string[] = [
    rect({ class: frameClass, x: f.x, y: f.y, width: f.width, height: f.height, rx: 2, ry: 2 }),
  ];
  for (const op of f.operands) {
    if (op.sepY !== undefined) {
      parts.push(line({ class: "sx-seq-frame-sep", x1: f.x, y1: op.sepY, x2: f.x + f.width, y2: op.sepY }));
    }
  }
  return group({ class: "sx-seq-fragment", "data-op": f.op }, parts);
}

/** Operator tab + guards — drawn *above* activation bars so labels stay readable. */
function renderFragmentTab(f: SeqFragmentFrame): string {
  const tabW = tabWidth(f);
  const tabH = 18;
  const fold = 6;
  const tx = f.x;
  const ty = f.y;
  const tab = `M ${tx} ${ty} H ${tx + tabW} V ${ty + tabH - fold} L ${tx + tabW - fold} ${ty + tabH} H ${tx} Z`;
  const parts: string[] = [
    pathEl({ class: "sx-seq-frame-tab", d: tab }),
    textEl({ class: "sx-seq-frame-op", x: tx + 8, y: ty + 13 }, f.op),
  ];

  // ignore/consider message-name set, shown just right of the operator tab
  if (f.messageSet && f.messageSet.length) {
    parts.push(
      textEl({ class: "sx-seq-guard", x: tx + tabW + 8, y: ty + 13 }, `{${f.messageSet.join(", ")}}`),
    );
  }

  f.operands.forEach((op, i) => {
    if (!op.guard) return;
    const gx = i === 0 ? f.x + tabW + 8 : f.x + 8;
    const gy = i === 0 ? f.y + 13 : (op.sepY ?? f.y) + 14;
    parts.push(textEl({ class: "sx-seq-guard", x: gx, y: gy }, `[${op.guard}]`));
  });

  return group({ class: "sx-seq-fragment-tab-g", "data-op": f.op }, parts);
}

function renderRef(r: SeqRefFrame): string {
  const tabW = 40;
  const tabH = 18;
  const fold = 6;
  const tab = `M ${r.x} ${r.y} H ${r.x + tabW} V ${r.y + tabH - fold} L ${r.x + tabW - fold} ${r.y + tabH} H ${r.x} Z`;
  return group({ class: "sx-seq-fragment", "data-op": "ref" }, [
    rect({ class: "sx-seq-frame", x: r.x, y: r.y, width: r.width, height: r.height, rx: 2, ry: 2 }),
    pathEl({ class: "sx-seq-frame-tab", d: tab }),
    textEl({ class: "sx-seq-frame-op", x: r.x + 8, y: r.y + 13 }, "ref"),
    textEl(
      { class: "sx-seq-ref-name", x: r.x + r.width / 2, y: r.y + r.height / 2 + 8, "text-anchor": "middle" },
      r.text,
    ),
  ]);
}

// ── notes / dividers / invariants ───────────────────────────────

function renderNote(nb: SeqNoteBox): string {
  const fold = 8;
  const x = nb.x;
  const y = nb.y;
  const w = nb.width;
  const h = nb.height;
  const body = `M ${x} ${y} H ${x + w - fold} L ${x + w} ${y + fold} V ${y + h} H ${x} Z`;
  const corner = `M ${x + w - fold} ${y} V ${y + fold} H ${x + w} Z`;
  const lines = nb.note.text.split(/<br\s*\/?>|\\n/);
  const startY = y + h / 2 - ((lines.length - 1) * 15) / 2 + 4;
  const texts = lines.map((l, i) =>
    textEl({ class: "sx-seq-note-text", x: x + w / 2, y: startY + i * 15, "text-anchor": "middle" }, l),
  );
  return group({ class: "sx-seq-note" }, [pathEl({ d: body }), pathEl({ d: corner }), ...texts]);
}

function renderDivider(d: SeqDividerBar): string {
  const labelW = Math.max(60, d.text.length * CHAR_W + 24);
  const cx = d.width / 2;
  const parts: string[] = [
    line({ x1: 8, y1: d.y, x2: cx - labelW / 2, y2: d.y }),
    line({ x1: cx + labelW / 2, y1: d.y, x2: d.width - 8, y2: d.y }),
    rect({ x: cx - labelW / 2, y: d.y - 11, width: labelW, height: 22, rx: 4, ry: 4 }),
    textEl({ class: "sx-seq-div-text", x: cx, y: d.y + 4, "text-anchor": "middle" }, d.text),
  ];
  return group({ class: "sx-seq-div" }, parts);
}

function renderInvariant(iv: SeqInvariantBox): string {
  return group({ class: "sx-seq-inv" }, [
    rect({ x: iv.cx - iv.width / 2, y: iv.y, width: iv.width, height: iv.height, rx: iv.height / 2, ry: iv.height / 2 }),
    textEl({ class: "sx-seq-inv-text", x: iv.cx, y: iv.y + iv.height / 2 + 4, "text-anchor": "middle" }, `{${iv.text}}`),
  ]);
}

function renderDestroy(d: { x: number; y: number }): string {
  const r = 7;
  return group({ class: "sx-seq-destroy-g" }, [
    line({ class: "sx-seq-destroy", x1: d.x - r, y1: d.y - r, x2: d.x + r, y2: d.y + r }),
    line({ class: "sx-seq-destroy", x1: d.x - r, y1: d.y + r, x2: d.x + r, y2: d.y - r }),
  ]);
}

// ── top-level ───────────────────────────────────────────────────

export function renderSequenceLayout(layout: SeqLayoutResult, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  const children: string[] = [];

  const nMsg = layout.messages.length;
  const nFrag = layout.fragments.length;
  children.push(titleEl(`Sequence Diagram${layout.title ? " — " + layout.title : ""}`));
  children.push(
    desc(
      `${layout.lifelines.length} participants, ${nMsg} messages, ${nFrag} combined fragments.`,
    ),
  );
  children.push(el("style", {}, buildCss(t)));
  children.push(markers(t));

  const titleBand = layout.title ? 32 : 0;
  const titleScene = layout.title
    ? resolveSceneTitle(layout.title, layout.ast.titleSourceRange, layout.width / 2, 22, config)
    : undefined;
  const titleNode = layout.title && titleScene
    ? textEl({ x: titleScene.x, y: titleScene.y, class: "sx-seq-title", "text-anchor": "middle", ...titleScene.attrs }, layout.title)
    : "";
  if (titleNode && !config?.__scene) children.push(titleNode);

  const body: string[] = [];
  // lifelines (axes + heads) underneath
  body.push(group({ class: "sx-seq-lifelines" }, layout.lifelines.map((ll) => renderLifeline(ll, config?.__scene, titleBand))));
  // fragment boxes behind everything (so activation bars sit inside them)
  body.push(group({ class: "sx-seq-frames" }, layout.fragments.map(renderFragmentBox)));
  // activation bars over the axis and frame boxes
  body.push(group({ class: "sx-seq-acts" }, layout.activations.map(renderActivation)));
  // operator tabs + ref frames above the bars so their labels stay readable
  body.push(group({ class: "sx-seq-frame-tabs" }, layout.fragments.map(renderFragmentTab)));
  body.push(group({ class: "sx-seq-refs" }, layout.refs.map(renderRef)));
  // messages
  body.push(group({ class: "sx-seq-messages" }, layout.messages.map((message, index) => renderMessage(message, config?.__scene, index, titleBand))));
  // notes / dividers / invariants / destroys on top
  body.push(group({ class: "sx-seq-notes" }, layout.notes.map(renderNote)));
  body.push(group({ class: "sx-seq-divs" }, layout.dividers.map(renderDivider)));
  body.push(group({ class: "sx-seq-invs" }, layout.invariants.map(renderInvariant)));
  body.push(group({ class: "sx-seq-destroys" }, layout.destroys.map(renderDestroy)));

  children.push(
    titleBand ? group({ transform: `translate(0, ${titleBand})` }, body) : group({}, body),
  );
  if (titleNode && config?.__scene) children.push(titleNode);

  const height = layout.height + titleBand;
  return svgRoot(
    {
      class: "sx-seq",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "UML sequence diagram"),
      width: layout.width,
      height,
      viewBox: `0 0 ${layout.width} ${height}`,
      "data-diagram-type": "sequence",
    },
    children,
  );
}

export function renderSequence(textOrAst: string | SeqAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parseSequence(textOrAst) : textOrAst;
  const layout = layoutSequence(ast, config?.__pins);
  return renderSequenceLayout(layout, config);
}
