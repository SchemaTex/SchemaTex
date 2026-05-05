/**
 * SFC renderer — Sequential Function Chart SVG output.
 * IEC 61131-3 §6.5 visual conventions; see 24-SFC-STANDARD.md.
 */

import type { SfcAst, SfcLayoutResult } from "../../core/types";
import { defs, el, group, line, path, rect, svgRoot, text, title, desc, escapeXml } from "../../core/svg";
import { parseSfc } from "./parser";
import { layoutSfc, SFC_CONST } from "./layout";

const STYLES = `
.lt-sfc-bg { fill: #ffffff; }
.lt-sfc-step-body { fill: #ffffff; stroke: #333; stroke-width: 1.5; }
.lt-sfc-step-inner { fill: none; stroke: #333; stroke-width: 1.2; }
.lt-sfc-step-name { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; fill: #111; }
.lt-sfc-transition-bar { fill: #000; }
.lt-sfc-transition-condition { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 11px; fill: #333; }
.lt-sfc-transition-id { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; fill: #888; }
.lt-sfc-branch-bar { stroke: #000; stroke-width: 1.5; fill: none; }
.lt-sfc-wire { stroke: #000; stroke-width: 1.5; fill: none; }
.lt-sfc-action-block { fill: #fafafa; stroke: #333; stroke-width: 1; }
.lt-sfc-action-qualifier { fill: #f0f0f0; stroke: #333; stroke-width: 1; }
.lt-sfc-action-qualifier-text { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-weight: 700; font-size: 11px; fill: #111; }
.lt-sfc-action-body { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 11px; fill: #222; }
.lt-sfc-action-time { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; fill: #555; }
.lt-sfc-jump { stroke: #000; stroke-width: 1.5; fill: none; marker-end: url(#sfc-arrow); }
.lt-sfc-jump-label { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; fill: #555; }
.lt-sfc-title { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 14px; font-weight: 700; fill: #111; }
`;

export function renderSfcLayout(layout: SfcLayoutResult): string {
  const parts: string[] = [];

  const styleEl = el("style", {}, escapeXml(STYLES).replace(/&quot;/g, '"'));
  const arrowMarker = el(
    "marker",
    {
      id: "sfc-arrow",
      viewBox: "0 0 10 10",
      refX: 9, refY: 5,
      markerWidth: 8, markerHeight: 8,
      orient: "auto-start-reverse",
    },
    [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#000" })]
  );
  parts.push(defs([styleEl, arrowMarker]));
  parts.push(title(`SFC: ${layout.ast.title ?? "Sequential Function Chart"}`));
  parts.push(desc(`SFC with ${layout.steps.length} step(s), ${layout.transitions.length} transition(s).`));
  parts.push(rect({ class: "lt-sfc-bg", x: 0, y: 0, width: layout.width, height: layout.height }));

  // Title
  if (layout.ast.title) {
    parts.push(text(
      { class: "lt-sfc-title", x: layout.width / 2, y: 22, "text-anchor": "middle" },
      layout.ast.title
    ));
  }

  // Wires (under steps so they don't overlap step rects)
  for (const w of layout.wires) {
    parts.push(path({ class: "lt-sfc-wire", d: w.path }));
  }

  // Branch bars
  for (const b of layout.bars) {
    if (b.kind === "alt-div" || b.kind === "alt-conv") {
      parts.push(line({ class: "lt-sfc-branch-bar", x1: b.x1, y1: b.y, x2: b.x2, y2: b.y }));
    } else {
      // Simultaneous = single line; second line is its own bar entry from the layout
      parts.push(line({ class: "lt-sfc-branch-bar", x1: b.x1, y1: b.y, x2: b.x2, y2: b.y }));
    }
  }

  // Transitions
  for (const t of layout.transitions) {
    const x = t.cx - t.w;
    const y = t.cy - SFC_CONST.transition_bar_h / 2;
    parts.push(rect({
      class: "lt-sfc-transition-bar",
      x, y, width: t.w * 2, height: SFC_CONST.transition_bar_h,
    }));
    if (t.id) {
      parts.push(text(
        { class: "lt-sfc-transition-id", x: x - 4, y: y + 4, "text-anchor": "end" },
        t.id
      ));
    }
    parts.push(text(
      { class: "lt-sfc-transition-condition", x: x + t.w * 2 + 6, y: y + 4 },
      t.transition.condition
    ));
  }

  // Steps
  for (const ls of layout.steps) {
    const stepGroup: string[] = [];
    stepGroup.push(rect({
      class: "lt-sfc-step-body",
      x: ls.x, y: ls.y,
      width: ls.width, height: ls.height,
    }));
    if (ls.step.kind === "initial" || ls.step.kind === "final") {
      const off = SFC_CONST.step_initial_offset;
      stepGroup.push(rect({
        class: "lt-sfc-step-inner",
        x: ls.x + off, y: ls.y + off,
        width: ls.width - off * 2, height: ls.height - off * 2,
      }));
    }
    if (ls.step.kind === "final") {
      const off = SFC_CONST.step_initial_offset + 3;
      stepGroup.push(rect({
        class: "lt-sfc-step-inner",
        x: ls.x + off, y: ls.y + off,
        width: ls.width - off * 2, height: ls.height - off * 2,
      }));
    }
    stepGroup.push(text(
      { class: "lt-sfc-step-name", x: ls.x + ls.width / 2, y: ls.y + ls.height / 2 + 4, "text-anchor": "middle" },
      ls.step.label ?? ls.step.id
    ));
    parts.push(group(
      { class: "lt-sfc-step", "data-step-id": ls.step.id, "data-step-kind": ls.step.kind },
      stepGroup
    ));

    // Connect step to action blocks (small horizontal stub)
    const myActions = layout.actions.filter((a) => a.stepId === ls.step.id);
    if (myActions.length > 0) {
      parts.push(line({
        class: "lt-sfc-wire",
        x1: ls.x + ls.width,
        y1: ls.y + ls.height / 2,
        x2: myActions[0].x,
        y2: ls.y + ls.height / 2,
      }));
    }
  }

  // Action blocks
  for (const a of layout.actions) {
    const ag: string[] = [];
    ag.push(rect({
      class: "lt-sfc-action-qualifier",
      x: a.x, y: a.y,
      width: a.qualifierWidth, height: SFC_CONST.action_block_h,
    }));
    ag.push(rect({
      class: "lt-sfc-action-block",
      x: a.x + a.qualifierWidth, y: a.y,
      width: a.width - a.qualifierWidth, height: SFC_CONST.action_block_h,
    }));
    ag.push(text(
      { class: "lt-sfc-action-qualifier-text", x: a.x + a.qualifierWidth / 2, y: a.y + SFC_CONST.action_block_h / 2 + 4, "text-anchor": "middle" },
      a.action.qualifier
    ));
    ag.push(text(
      { class: "lt-sfc-action-body", x: a.x + a.qualifierWidth + 6, y: a.y + SFC_CONST.action_block_h / 2 + 4 },
      a.action.body
    ));
    if (a.action.time) {
      const ty = a.y + SFC_CONST.action_block_h;
      ag.push(rect({
        class: "lt-sfc-action-block",
        x: a.x, y: ty,
        width: a.width, height: SFC_CONST.action_time_h,
      }));
      ag.push(text(
        { class: "lt-sfc-action-time", x: a.x + 6, y: ty + SFC_CONST.action_time_h / 2 + 4 },
        a.action.time
      ));
    }
    parts.push(group(
      { class: "lt-sfc-action-block-g", "data-step-id": a.stepId, "data-action-index": a.index, "data-qualifier": a.action.qualifier },
      ag
    ));
  }

  // Jumps
  for (const j of layout.jumps) {
    parts.push(path({ class: "lt-sfc-jump", d: j.path }));
    const labelParts: string[] = [];
    if (j.condition) labelParts.push(j.condition);
    labelParts.push(`→ ${j.labelText}`);
    parts.push(text(
      { class: "lt-sfc-jump-label", x: j.labelX, y: j.labelY, "text-anchor": "middle" },
      labelParts.join("  ")
    ));
  }

  return svgRoot(
    {
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lt-sfc",
      "data-diagram-type": "sfc",
    },
    parts
  );
}

export function renderSfc(text: string): string {
  const ast: SfcAst = parseSfc(text);
  const layout = layoutSfc(ast);
  return renderSfcLayout(layout);
}
