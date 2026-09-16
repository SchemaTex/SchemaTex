import type {
  LadderAST,
  RenderConfig,
  SourceRange,
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
import { resolveIndustrialTheme, type IndustrialTokens, type ResolvedTheme } from "../../core/theme";
import { layoutLadder, type LadderLayoutNode, wrapName } from "./layout";
import { createSourceLocator } from "../../core/source-range";

type IT = ResolvedTheme<IndustrialTokens>;

function buildCss(t: IT): string {
  return `
.lt-ladder { font-family: system-ui, -apple-system, sans-serif; }
.lt-ladder-rail { stroke: ${t.strokeHeavy}; stroke-width: 4; stroke-linecap: square; }
.lt-ladder-wire { stroke: ${t.stroke}; stroke-width: 1.5; fill: none; }
.lt-ladder-element { stroke: ${t.stroke}; stroke-width: 2; fill: none; }
.lt-ladder-coil { stroke: ${t.stroke}; stroke-width: 2; fill: none; }
.lt-ladder-fb { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 2; }
.lt-ladder-fb-name { font: bold 11px sans-serif; fill: ${t.text}; text-anchor: middle; }
.lt-ladder-pin { font: 8px sans-serif; fill: ${t.stroke}; }
.lt-ladder-fb-rule { stroke: ${t.textMuted}; stroke-width: 1; }
.lt-ladder-fb-heading { text-anchor: start; }
.lt-ladder-param-name { font: 8px sans-serif; fill: ${t.textMuted}; }
.lt-ladder-param-value { font: 600 8px sans-serif; fill: ${t.text}; text-anchor: end; }
.lt-ladder-operand { text-anchor: middle; }
.lt-ladder-name { font: 9px sans-serif; fill: ${t.text}; text-anchor: middle; }
.lt-ladder-tag { font: 600 9px ui-monospace, SFMono-Regular, Menlo, monospace; fill: ${t.accent}; text-anchor: middle; }
.lt-ladder-addr { font: 600 8.5px ui-monospace, monospace; fill: ${t.error}; text-anchor: middle; }
.lt-ladder-rung-num { font: 10px sans-serif; fill: ${t.textMuted}; text-anchor: end; }
.lt-ladder-comment { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.lt-ladder-title { font: 700 16px sans-serif; fill: ${t.text}; }
.lt-ladder-symbol-label { font: bold 10px sans-serif; fill: ${t.stroke}; text-anchor: middle; }
.lt-ladder-rung-handle { fill: ${t.bg}; stroke: ${t.accent}; stroke-width: 1.5; rx: 3; }
.lt-ladder-rung-grip { fill: ${t.accent}; }
`.trim();
}

function rungSourceBlocks(source: string | undefined): SourceRange[] {
  if (!source) return [];
  const locator = createSourceLocator(source);
  const starts: number[] = [];
  let offset = 0;
  for (const rawLine of source.split(/\n/)) {
    if (/^\s*rung\s+\S+/i.test(rawLine.replace(/\r$/, ""))) starts.push(offset);
    offset += rawLine.length + 1;
  }
  return starts.map((start, index) => locator.range(start, starts[index + 1] ?? source.length));
}

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

/** The instruction shares contact/coil anchors; only the strokes inside change. */
function inlineInstruction(node: LadderLayoutNode, mnemonic: string): string[] {
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  return [
    el("line", { x1: x, y1: cy, x2: x + 1, y2: cy, class: "lt-ladder-wire" }),
    el("line", { x1: x + w - 1, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }),
    pathEl({ d: `M ${x + 5} ${y} H ${x + 1} V ${y + h} H ${x + 5}`, class: "lt-ladder-element lt-ladder-inline-bracket" }),
    pathEl({ d: `M ${x + w - 5} ${y} H ${x + w - 1} V ${y + h} H ${x + w - 5}`, class: "lt-ladder-element lt-ladder-inline-bracket" }),
    text({ x: x + w / 2, y: cy + 3, class: "lt-ladder-symbol-label" }, mnemonic),
  ];
}

function renderContact(node: LadderLayoutNode): string {
  const c = node.element;
  if (c.elementType !== "contact") return "";
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const leftBarX = cx - h / 4;
  const rightBarX = cx + h / 4;
  const pieces: string[] = [];
  if (c.contactType === "ONS") {
    pieces.push(...inlineInstruction(node, "ONS"));
  } else {
    pieces.push(el("line", { x1: x, y1: cy, x2: leftBarX, y2: cy, class: "lt-ladder-wire" }));
    pieces.push(el("line", { x1: rightBarX, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }));
    pieces.push(el("line", { x1: leftBarX, y1: y, x2: leftBarX, y2: y + h, class: "lt-ladder-element lt-ladder-contact-blade" }));
    pieces.push(el("line", { x1: rightBarX, y1: y, x2: rightBarX, y2: y + h, class: "lt-ladder-element lt-ladder-contact-blade" }));

    if (c.contactType === "XIO") {
      pieces.push(
        el("line", {
          x1: leftBarX,
          y1: y + h - 2,
          x2: rightBarX,
          y2: y + 2,
          class: "lt-ladder-element lt-ladder-negation",
        })
      );
    } else if (c.contactType === "OSF") {
      pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, "N"));
    }
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
  const c = node.element;
  if (c.elementType !== "coil") return "";
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];
  if (c.coilType === "RES") {
    pieces.push(...inlineInstruction(node, "RES"));
  } else {
    // Half-ellipse crowns sit two units inside the unchanged connection box.
    // Bake the 1:2 arc aspect ratio into coordinates; never scale strokes/text.
    const rx = h / 4;
    const leftCrown = x + 2;
    const rightCrown = x + w - 2;
    const leftArc = `M ${leftCrown + rx} ${y} A ${rx} ${h / 2} 0 0 0 ${leftCrown + rx} ${y + h}`;
    const rightArc = `M ${rightCrown - rx} ${y} A ${rx} ${h / 2} 0 0 1 ${rightCrown - rx} ${y + h}`;
    pieces.push(pathEl({ d: leftArc, class: "lt-ladder-coil" }));
    pieces.push(pathEl({ d: rightArc, class: "lt-ladder-coil" }));
    pieces.push(el("line", { x1: x, y1: cy, x2: leftCrown, y2: cy, class: "lt-ladder-wire" }));
    pieces.push(el("line", { x1: rightCrown, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }));

    let inner = "";
    if (c.coilType === "OTL") inner = "L";
    else if (c.coilType === "OTU") inner = "U";
    else if (c.coilType === "OTN") {
      pieces.push(el("line", {
        x1: cx - h / 4, y1: y + h - 2, x2: cx + h / 4, y2: y + 2,
        class: "lt-ladder-element lt-ladder-negation",
      }));
    }
    if (inner) {
      pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, inner));
    }
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
  const fb = node.element;
  if (fb.elementType !== "function_block") return "";
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];
  const operators: Partial<Record<typeof fb.fbType, string>> = {
    EQU: "=", NEQ: "≠", GRT: ">", LES: "<", GEQ: "≥", LEQ: "≤",
  };
  const leftBarX = cx - w / 4;
  const rightBarX = cx + w / 4;
  for (const bx of [leftBarX, rightBarX]) {
    pieces.push(el("line", { x1: bx, y1: cy - 8, x2: bx, y2: cy + 8, class: "lt-ladder-element lt-ladder-contact-blade" }));
  }
  pieces.push(text({ x: cx, y: cy + 3, class: "lt-ladder-symbol-label" }, operators[fb.fbType] ?? ""));
  // IN1 is the upper operand even when the DSL lists IN2 first.
  const operandOrder = (key: string): number => key === "IN1" ? 0 : key === "IN2" ? 1 : 2;
  const entries = Object.entries(fb.params).sort(([a], [b]) => operandOrder(a) - operandOrder(b));
  entries.slice(0, 2).forEach(([, v], i) => {
    pieces.push(
      text({ x: cx, y: i === 0 ? y + 6 : y + h - 1, class: "lt-ladder-pin lt-ladder-operand" }, String(v))
    );
  });
  pieces.push(el("line", { x1: x, y1: cy, x2: leftBarX, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(el("line", { x1: rightBarX, y1: cy, x2: x + w, y2: cy, class: "lt-ladder-wire" }));
  pieces.push(text({ x: cx, y: y - 4, class: "lt-ladder-tag" }, fb.tag));
  return group({ "data-element": "compare", "data-tag": fb.tag }, pieces);
}

function renderFunctionBlock(node: LadderLayoutNode): string {
  const fb = node.element;
  if (fb.elementType !== "function_block") return "";
  const { x, y, width: w, height: h } = node;
  const cy = y + h / 2;
  const cx = x + w / 2;
  const pieces: string[] = [];

  pieces.push(el("rect", { x, y, width: w, height: h, class: "lt-ladder-fb" }));
  pieces.push(text({ x: x + 4, y: y + 14, class: "lt-ladder-fb-name lt-ladder-fb-heading" }, fb.fbType));
  pieces.push(el("line", { x1: x, y1: y + 20, x2: x + w, y2: y + 20, class: "lt-ladder-fb-rule" }));

  pieces.push(
    el("line", { x1: x - 6, y1: cy, x2: x, y2: cy, class: "lt-ladder-wire" })
  );
  pieces.push(
    el("line", { x1: x + w, y1: cy, x2: x + w + 6, y2: cy, class: "lt-ladder-wire" })
  );

  const entries = Object.entries(fb.params);
  entries.slice(0, 3).forEach(([k, v], i) => {
    pieces.push(
      text({ x: x + 4, y: y + 31 + i * 10, class: "lt-ladder-param-name" }, k),
      text({ x: x + w - 4, y: y + 31 + i * 10, class: "lt-ladder-param-value" }, String(v))
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

export function renderLadder(ast: LadderAST, config?: RenderConfig): string {
  const layout = layoutLadder(ast);
  const t = resolveIndustrialTheme(config?.theme ?? "default");
  const titleOffset = ast.title ? 30 : 0;
  const width = layout.width;
  const height = layout.height + titleOffset;

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Ladder Logic"));
  children.push(
    desc(`PLC ladder logic diagram with ${ast.rungs.length} rung${ast.rungs.length === 1 ? "" : "s"}`)
  );
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(
      text({ x: width / 2, y: 20, class: "lt-ladder-title", "text-anchor": "middle" }, ast.title)
    );
  }

  const inner: string[] = [];
  const rungBlocks = rungSourceBlocks(config?.__source);

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

  for (const [index, r] of layout.rungs.entries()) {
    const block = rungBlocks[index];
    if (config?.__scene && block) {
      const key = `ladder:rung:${r.rung.number}:order`;
      const handleX = layout.leftRailX - 31;
      const handleY = r.y - 9;
      config.__scene.push({
        key,
        kind: "handle",
        semanticId: `rung:${r.rung.number}`,
        label: r.rung.comment ?? `Rung ${r.rung.number}`,
        bbox: { x: handleX, y: handleY + titleOffset, width: 18, height: 18 },
        positionSource: {
          kind: "source-block",
          range: block,
          blocks: rungBlocks,
          index,
          step: r.height,
        },
        editable: { label: false, position: "move-y" },
      });
      inner.push(group({ "data-sx-key": key, "aria-label": `Reorder rung ${r.rung.number}` }, [
        el("rect", { x: handleX, y: handleY, width: 18, height: 18, class: "lt-ladder-rung-handle" }),
        ...[0, 1, 2].flatMap((row) => [0, 1].map((col) => el("circle", {
          cx: handleX + 6 + col * 6,
          cy: handleY + 5 + row * 4,
          r: 1.25,
          class: "lt-ladder-rung-grip",
        }))),
      ]));
    }
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
