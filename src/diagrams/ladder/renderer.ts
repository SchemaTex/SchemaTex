import type {
  LadderAST,
  LadderContact,
  LadderCoil,
  LadderFunctionBlock,
} from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text,
  title as titleEl,
  desc,
} from "../../core/svg";
import { layoutLadder, type LadderLayoutNode, wrapName } from "./layout";

const CSS = `
.lt-ladder { background: #fff; font-family: system-ui, -apple-system, sans-serif; }
.lt-ladder-rail { stroke: #333; stroke-width: 4; stroke-linecap: square; }
.lt-ladder-wire { stroke: #333; stroke-width: 1.5; fill: none; }
.lt-ladder-element { stroke: #333; stroke-width: 2; fill: none; }
.lt-ladder-coil { stroke: #333; stroke-width: 2; fill: none; }
.lt-ladder-fb { fill: #fff; stroke: #333; stroke-width: 2; }
.lt-ladder-fb-name { font: bold 11px sans-serif; fill: #111; text-anchor: middle; }
.lt-ladder-pin { font: 8px sans-serif; fill: #333; }
.lt-ladder-name { font: 9px sans-serif; fill: #222; text-anchor: middle; }
.lt-ladder-tag { font: 600 9px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #1d6fb8; text-anchor: middle; }
.lt-ladder-addr { font: 600 8.5px ui-monospace, monospace; fill: #c02626; text-anchor: middle; }
.lt-ladder-rung-num { font: 10px sans-serif; fill: #666; text-anchor: end; }
.lt-ladder-comment { font: italic 10px sans-serif; fill: #888; }
.lt-ladder-title { font: bold 15px sans-serif; fill: #111; }
.lt-ladder-symbol-label { font: bold 10px sans-serif; fill: #333; text-anchor: middle; }
`.trim();

const LINE_H = 11;

function labelsAbove(
  name: string | undefined,
  tag: string,
  cx: number,
  bodyTopY: number
): string[] {
  const pieces: string[] = [];
  const nameLines = name ? wrapName(name) : [];
  const totalLines = nameLines.length + 1; // +1 for tag
  const firstY = bodyTopY - 4 - (totalLines - 1) * LINE_H;
  nameLines.forEach((line, i) => {
    pieces.push(
      text({ x: cx, y: firstY + i * LINE_H, class: "lt-ladder-name" }, line)
    );
  });
  pieces.push(
    text(
      { x: cx, y: firstY + nameLines.length * LINE_H, class: "lt-ladder-tag" },
      tag
    )
  );
  return pieces;
}

function renderContact(node: LadderLayoutNode): string {
  const c = node.element as LadderContact;
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const leftBarX = x + 4;
  const rightBarX = x + w - 4;
  const cx = x + w / 2;
  const pieces: string[] = [];
  pieces.push(el("line", { x1: x, y1: cy, x2: leftBarX, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(el("line", { x1: rightBarX, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(el("line", { x1: leftBarX, y1: y, x2: leftBarX, y2: y + h, class: "lt-ladder-element" }));
  pieces.push(el("line", { x1: rightBarX, y1: y, x2: rightBarX, y2: y + h, class: "lt-ladder-element" }));

  if (c.contactType === "XIO") {
    pieces.push(
      el("line", {
        x1: leftBarX + 2,
        y1: y + h - 2,
        x2: rightBarX - 2,
        y2: y + 2,
        class: "lt-ladder-element",
      })
    );
  } else if (c.contactType === "ONS") {
    pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, "↑"));
  } else if (c.contactType === "OSF") {
    pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, "↓"));
  }

  pieces.push(...labelsAbove(c.name, c.tag, cx, y));
  if (c.address) {
    pieces.push(
      text({ x: cx, y: y + h + 10, class: "lt-ladder-addr" }, c.address)
    );
  }
  return group({ "data-element": "contact", "data-tag": c.tag }, pieces);
}

function renderCoil(node: LadderLayoutNode): string {
  const c = node.element as LadderCoil;
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];
  const leftArc = `M ${x + 6} ${y} A 10 ${h / 2} 0 0 0 ${x + 6} ${y + h}`;
  const rightArc = `M ${x + w - 6} ${y} A 10 ${h / 2} 0 0 1 ${x + w - 6} ${y + h}`;
  pieces.push(pathEl({ d: leftArc, class: "lt-ladder-coil" }));
  pieces.push(pathEl({ d: rightArc, class: "lt-ladder-coil" }));
  pieces.push(el("line", { x1: x, y1: cy, x2: x + 6, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(el("line", { x1: x + w - 6, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }));

  let inner = "";
  if (c.coilType === "OTL") inner = "S";
  else if (c.coilType === "OTU") inner = "R";
  else if (c.coilType === "OTN") inner = "/";
  if (inner) {
    pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, inner));
  }

  pieces.push(...labelsAbove(c.name, c.tag, cx, y));
  if (c.address) {
    pieces.push(
      text({ x: cx, y: y + h + 10, class: "lt-ladder-addr" }, c.address)
    );
  }
  return group({ "data-element": "coil", "data-tag": c.tag }, pieces);
}

function renderCompare(node: LadderLayoutNode): string {
  const fb = node.element as LadderFunctionBlock;
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];
  pieces.push(el("rect", { x, y, width: w, height: h, class: "lt-ladder-fb" }));
  pieces.push(text({ x: cx, y: y + 12, class: "lt-ladder-fb-name" }, fb.fbType));
  const entries = Object.entries(fb.params);
  entries.slice(0, 2).forEach(([k, v], i) => {
    pieces.push(
      text({ x: x + 4, y: y + 22 + i * 9, class: "lt-ladder-pin" }, `${k}:${v}`)
    );
  });
  pieces.push(el("line", { x1: x - 2, y1: cy, x2: x, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(el("line", { x1: x + w, y1: cy, x2: x + w + 2, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(text({ x: cx, y: y - 4, class: "lt-ladder-tag" }, fb.tag));
  return group({ "data-element": "compare", "data-tag": fb.tag }, pieces);
}

function renderFunctionBlock(node: LadderLayoutNode): string {
  const fb = node.element as LadderFunctionBlock;
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];

  pieces.push(el("rect", { x, y, width: w, height: h, class: "lt-ladder-fb" }));
  pieces.push(text({ x: cx, y: y + 14, class: "lt-ladder-fb-name" }, fb.fbType));

  pieces.push(
    el("line", { x1: x - 6, y1: cy, x2: x, y2: cy, class: "lt-ladder-wire" })
  );
  pieces.push(
    el("line", { x1: x + w, y1: cy, x2: x + w + 6, y2: cy, class: "lt-ladder-wire" })
  );

  const entries = Object.entries(fb.params);
  entries.slice(0, 3).forEach(([k, v], i) => {
    pieces.push(
      text({ x: x + 4, y: y + 28 + i * 9, class: "lt-ladder-pin" }, `${k}=${v}`)
    );
  });

  pieces.push(text({ x: cx, y: y - 4, class: "lt-ladder-tag" }, fb.tag));
  return group({ "data-element": "function_block", "data-tag": fb.tag }, pieces);
}

function renderNode(node: LadderLayoutNode): string {
  switch (node.kind) {
    case "contact":
      return renderContact(node);
    case "coil":
      return renderCoil(node);
    case "compare":
      return renderCompare(node);
    case "function_block":
      return renderFunctionBlock(node);
  }
}

export function renderLadder(ast: LadderAST): string {
  const layout = layoutLadder(ast);
  const titleOffset = ast.title ? 30 : 0;
  const width = layout.width;
  const height = layout.height + titleOffset;

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Ladder Logic"));
  children.push(
    desc(`PLC ladder logic diagram with ${ast.rungs.length} rung${ast.rungs.length === 1 ? "" : "s"}`)
  );
  children.push(el("style", {}, CSS));

  if (ast.title) {
    children.push(
      text({ x: layout.leftRailX, y: 20, class: "lt-ladder-title" }, ast.title)
    );
  }

  const inner: string[] = [];

  inner.push(
    el("line", {
      x1: layout.leftRailX,
      y1: 0,
      x2: layout.leftRailX,
      y2: layout.height,
      class: "lt-ladder-rail",
    })
  );
  inner.push(
    el("line", {
      x1: layout.rightRailX,
      y1: 0,
      x2: layout.rightRailX,
      y2: layout.height,
      class: "lt-ladder-rail",
    })
  );

  for (const r of layout.rungs) {
    inner.push(
      text(
        { x: layout.leftRailX - 6, y: r.y + 3, class: "lt-ladder-rung-num" },
        `Rung ${String(r.rung.number).padStart(3, "0")}`
      )
    );
    if (r.rung.comment) {
      // Place comment above the tallest element label on this rung (and above the parallel bus if any).
      const commentY = Math.max(14, r.y - (r.headerHeight + 6));
      inner.push(
        text(
          {
            x: layout.leftRailX + 10,
            y: commentY,
            class: "lt-ladder-comment",
          },
          `— ${r.rung.comment} —`
        )
      );
    }
  }

  for (const w of layout.wires) {
    inner.push(pathEl({ d: w.path, class: "lt-ladder-wire" }));
  }

  for (const n of layout.nodes) {
    inner.push(renderNode(n));
  }

  const wrap = group({ transform: `translate(0, ${titleOffset})` }, inner);
  children.push(wrap);

  return svgRoot(
    {
      class: "lt-ladder",
      role: "img",
      "aria-labelledby": "lt-ladder-title lt-ladder-desc",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    children
  );
}
