/**
 * BPMN renderer — BpmnLayoutResult → SVG.
 *
 * Z-order: pools → lanes → flows → objects → labels.
 * Defs include arrowhead markers (filled-triangle for sequence,
 * open-triangle for message) and the small source-end glyphs
 * (conditional diamond, default slash, message-start circle).
 */
import {
  defs,
  desc,
  el,
  group,
  multilineText,
  path,
  rect,
  svgRoot,
  text,
  title,
} from "../../core/svg";
import type {
  BpmnActivity,
  BpmnEvent,
  BpmnGateway,
  BpmnLayoutFlow,
  BpmnLayoutObject,
  BpmnLayoutPool,
  BpmnLayoutResult,
  RenderConfig,
} from "../../core/types";
import { resolveBpmnTheme, type BpmnTokens, type ResolvedTheme } from "../../core/theme";
import { parseBpmn } from "./parser";
import { layoutBpmn, BPMN_CONST } from "./layout";

const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', sans-serif";

type BpmnTheme = ResolvedTheme<BpmnTokens>;

export function renderBpmn(textInput: string, config?: RenderConfig): string {
  const ast = parseBpmn(textInput);
  const layout = layoutBpmn(ast);
  return renderBpmnLayout(layout, config);
}

export function renderBpmnLayout(
  layout: BpmnLayoutResult,
  config?: RenderConfig
): string {
  const { width, height, ast } = layout;
  const t = resolveBpmnTheme(config?.theme ?? "default");

  const out: string[] = [];
  out.push(title(ast.title ?? "BPMN diagram"));
  out.push(desc(`BPMN ${ast.direction} — ${ast.pools.length} pool(s), ${layout.objects.length} flow object(s).`));

  out.push(buildDefs(t));

  // Pools
  for (const pl of layout.pools) out.push(renderPool(pl, t));

  // Lanes
  for (const lan of layout.lanes) {
    out.push(
      group({ class: "schematex-bpmn-lane" }, [
        rect({
          x: lan.x + lan.labelHeight,
          y: lan.y,
          width: lan.width - lan.labelHeight,
          height: lan.height,
          fill: t.laneFill,
          stroke: t.bpmnStroke,
          "stroke-width": 1,
        }),
        rect({
          x: lan.x,
          y: lan.y,
          width: lan.labelHeight,
          height: lan.height,
          fill: t.labelBandFill,
          stroke: t.bpmnStroke,
          "stroke-width": 1,
        }),
        text(
          {
            x: lan.x + lan.labelHeight / 2,
            y: lan.y + lan.height / 2,
            transform: `rotate(-90 ${lan.x + lan.labelHeight / 2} ${lan.y + lan.height / 2})`,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "font-family": FONT_FAMILY,
            "font-size": 12,
            fill: t.bpmnText,
          },
          lan.lane.label
        ),
      ])
    );
  }

  // Sequence/message flows beneath objects so arrowheads sit clean.
  for (const fl of layout.flows) out.push(renderFlow(fl, t));

  // Objects
  for (const ol of layout.objects) out.push(renderObject(ol, t));

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      class: "schematex-bpmn",
    },
    out
  );
}

// ─── Defs (arrow markers) ──────────────────────────────────────

function buildDefs(t: BpmnTheme): string {
  return defs([
    // Sequence flow — filled triangle.
    el(
      "marker",
      {
        id: "bpmn-arrow-seq",
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: "auto-start-reverse",
      },
      [
        el("path", {
          d: "M 0 0 L 10 5 L 0 10 z",
          fill: t.flowStroke,
        }),
      ]
    ),
    // Message flow — open triangle.
    el(
      "marker",
      {
        id: "bpmn-arrow-msg",
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 9,
        markerHeight: 9,
        orient: "auto-start-reverse",
      },
      [
        el("path", {
          d: "M 0 0 L 10 5 L 0 10 z",
          fill: t.poolFill,
          stroke: t.msgFlowStroke,
          "stroke-width": 1,
        }),
      ]
    ),
    // Message source dot.
    el(
      "marker",
      {
        id: "bpmn-msg-start",
        viewBox: "0 0 10 10",
        refX: 5,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: "auto",
      },
      [
        el("circle", { cx: 5, cy: 5, r: 3, fill: t.poolFill, stroke: t.msgFlowStroke }),
      ]
    ),
  ]);
}

// ─── Pool ──────────────────────────────────────────────────────

function renderPool(pl: BpmnLayoutPool, t: BpmnTheme): string {
  const labelCx = pl.labelX + pl.labelWidth / 2;
  const labelCy = pl.labelY + pl.height / 2;
  if (pl.pool.blackbox) {
    return group({ class: "schematex-bpmn-pool blackbox" }, [
      rect({
        x: pl.x,
        y: pl.y,
        width: pl.width,
        height: pl.height,
        fill: t.poolFill,
        stroke: t.bpmnStroke,
        "stroke-width": 1.5,
      }),
      rect({
        x: pl.x,
        y: pl.y,
        width: pl.labelWidth,
        height: pl.height,
        fill: t.labelBandFill,
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
      text(
        {
          x: labelCx,
          y: labelCy,
          transform: `rotate(-90 ${labelCx} ${labelCy})`,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-family": FONT_FAMILY,
          "font-size": 13,
          "font-weight": "bold",
          fill: t.bpmnText,
        },
        pl.pool.label
      ),
    ]);
  }
  return group({ class: "schematex-bpmn-pool" }, [
    rect({
      x: pl.x,
      y: pl.y,
      width: pl.width,
      height: pl.height,
      fill: t.poolFill,
      stroke: t.bpmnStroke,
      "stroke-width": 1.5,
    }),
    rect({
      x: pl.x,
      y: pl.y,
      width: pl.labelWidth,
      height: pl.height,
      fill: t.labelBandFill,
      stroke: t.bpmnStroke,
      "stroke-width": 1,
    }),
    text(
      {
        x: labelCx,
        y: labelCy,
        transform: `rotate(-90 ${labelCx} ${labelCy})`,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": FONT_FAMILY,
        "font-size": 13,
        "font-weight": "bold",
        fill: t.bpmnText,
      },
      pl.pool.label
    ),
  ]);
}

// ─── Flow object ──────────────────────────────────────────────

function renderObject(ol: BpmnLayoutObject, t: BpmnTheme): string {
  const o = ol.obj;
  if ("gatewayKind" in o) return renderGateway(ol, t);
  if ("marker" in o) return renderActivity(ol, t);
  return renderEvent(ol, t);
}

function renderActivity(ol: BpmnLayoutObject, t: BpmnTheme): string {
  const a = ol.obj as BpmnActivity;
  const isSubproc = a.kind === "subprocess-collapsed";
  const cx = ol.x + ol.width / 2;
  const cy = ol.y + ol.height / 2;
  const children: string[] = [
    rect({
      x: ol.x,
      y: ol.y,
      width: ol.width,
      height: ol.height,
      rx: 10,
      ry: 10,
      fill: t.taskFill,
      stroke: t.taskStroke,
      "stroke-width": 1.5,
    }),
    multilineText(
      {
        x: cx,
        y: cy,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": FONT_FAMILY,
        "font-size": 12,
        fill: t.bpmnText,
      },
      a.label,
      14
    ),
  ];
  // Task marker — small icon top-left (8px from edge).
  if (a.kind === "task" && a.marker !== "abstract") {
    children.push(taskMarker(ol.x + 6, ol.y + 6, a.marker, t));
  }
  // Collapsed subprocess [+] marker, bottom-center.
  if (isSubproc) {
    const mx = cx;
    const my = ol.y + ol.height - 10;
    children.push(
      rect({
        x: mx - 6,
        y: my - 6,
        width: 12,
        height: 12,
        fill: "none",
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
      el("path", {
        d: `M ${mx - 4} ${my} L ${mx + 4} ${my} M ${mx} ${my - 4} L ${mx} ${my + 4}`,
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      })
    );
  }
  return group({ class: `schematex-bpmn-task marker-${a.marker}` }, children);
}

function taskMarker(x: number, y: number, marker: string, t: BpmnTheme): string {
  const cx = x + 7;
  const cy = y + 7;
  if (marker === "user") {
    return el("g", { class: "marker-user" }, [
      el("circle", { cx, cy: cy - 1, r: 2.5, fill: "none", stroke: t.bpmnStroke, "stroke-width": 1 }),
      el("path", {
        d: `M ${cx - 5} ${cy + 6} Q ${cx} ${cy + 1} ${cx + 5} ${cy + 6}`,
        fill: "none",
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
    ]);
  }
  if (marker === "service") {
    // Two overlapping gears (simplified).
    return el("g", { class: "marker-service" }, [
      el("circle", { cx, cy, r: 4, fill: "none", stroke: t.bpmnStroke, "stroke-width": 1 }),
      el("circle", { cx, cy, r: 1.5, fill: t.bpmnStroke }),
      el("path", {
        d: `M ${cx} ${cy - 6} L ${cx} ${cy - 4} M ${cx} ${cy + 4} L ${cx} ${cy + 6} M ${cx - 6} ${cy} L ${cx - 4} ${cy} M ${cx + 4} ${cy} L ${cx + 6} ${cy}`,
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
    ]);
  }
  if (marker === "send") {
    return el("g", { class: "marker-send" }, [
      el("rect", { x: cx - 5, y: cy - 3, width: 10, height: 7, fill: t.bpmnStroke }),
      el("path", { d: `M ${cx - 5} ${cy - 3} L ${cx} ${cy + 1} L ${cx + 5} ${cy - 3}`, stroke: t.poolFill, "stroke-width": 1, fill: "none" }),
    ]);
  }
  if (marker === "receive") {
    return el("g", { class: "marker-receive" }, [
      el("rect", { x: cx - 5, y: cy - 3, width: 10, height: 7, fill: "none", stroke: t.bpmnStroke, "stroke-width": 1 }),
      el("path", { d: `M ${cx - 5} ${cy - 3} L ${cx} ${cy + 1} L ${cx + 5} ${cy - 3}`, stroke: t.bpmnStroke, "stroke-width": 1, fill: "none" }),
    ]);
  }
  if (marker === "manual") {
    // Hand silhouette (simplified up-pointing finger).
    return el("g", { class: "marker-manual" }, [
      el("path", {
        d: `M ${cx - 3} ${cy + 4} L ${cx - 3} ${cy} L ${cx - 1.5} ${cy} L ${cx - 1.5} ${cy - 4} L ${cx} ${cy - 4} L ${cx} ${cy} L ${cx + 1.5} ${cy} L ${cx + 1.5} ${cy + 1} L ${cx + 3} ${cy + 1} L ${cx + 3} ${cy + 4} z`,
        fill: "none",
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
    ]);
  }
  if (marker === "script") {
    return el("g", { class: "marker-script" }, [
      el("path", {
        d: `M ${cx - 4} ${cy - 5} Q ${cx - 6} ${cy} ${cx - 4} ${cy + 5} L ${cx + 4} ${cy + 5} Q ${cx + 2} ${cy} ${cx + 4} ${cy - 5} z`,
        fill: "none",
        stroke: t.bpmnStroke,
        "stroke-width": 1,
      }),
      el("path", {
        d: `M ${cx - 2} ${cy - 2} L ${cx + 2} ${cy - 2} M ${cx - 2} ${cy} L ${cx + 2} ${cy} M ${cx - 2} ${cy + 2} L ${cx + 2} ${cy + 2}`,
        stroke: t.bpmnStroke,
        "stroke-width": 0.8,
      }),
    ]);
  }
  return "";
}

function renderGateway(ol: BpmnLayoutObject, t: BpmnTheme): string {
  const g = ol.obj as BpmnGateway;
  const cx = ol.x + ol.width / 2;
  const cy = ol.y + ol.height / 2;
  const r = ol.width / 2;
  const points = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
  const inner: string[] = [];
  if (g.gatewayKind === "xor") {
    // X glyph (Silver default).
    const a = r * 0.42;
    inner.push(
      el("path", {
        d: `M ${cx - a} ${cy - a} L ${cx + a} ${cy + a} M ${cx + a} ${cy - a} L ${cx - a} ${cy + a}`,
        stroke: t.gatewayGlyph,
        "stroke-width": 2.5,
        "stroke-linecap": "round",
      })
    );
  } else if (g.gatewayKind === "and") {
    const a = r * 0.5;
    inner.push(
      el("path", {
        d: `M ${cx - a} ${cy} L ${cx + a} ${cy} M ${cx} ${cy - a} L ${cx} ${cy + a}`,
        stroke: t.gatewayGlyph,
        "stroke-width": 2.5,
        "stroke-linecap": "round",
      })
    );
  } else if (g.gatewayKind === "or") {
    inner.push(
      el("circle", {
        cx,
        cy,
        r: r * 0.45,
        fill: "none",
        stroke: t.gatewayGlyph,
        "stroke-width": 2,
      })
    );
  } else if (g.gatewayKind === "event") {
    // Pentagon inscribed in circle.
    inner.push(
      el("circle", {
        cx,
        cy,
        r: r * 0.55,
        fill: "none",
        stroke: t.gatewayGlyph,
        "stroke-width": 1,
      })
    );
    const pr = r * 0.32;
    const pts: string[] = [];
    for (let k = 0; k < 5; k++) {
      const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      pts.push(`${cx + pr * Math.cos(ang)},${cy + pr * Math.sin(ang)}`);
    }
    inner.push(
      el("polygon", {
        points: pts.join(" "),
        fill: "none",
        stroke: t.gatewayGlyph,
        "stroke-width": 1.2,
      })
    );
  }
  const labelStr = g.label ?? "";
  const labelEl = labelStr
    ? text(
        {
          x: cx,
          y: ol.y - 6,
          "text-anchor": "middle",
          "font-family": FONT_FAMILY,
          "font-size": 11,
          fill: t.bpmnText,
        },
        labelStr
      )
    : "";
  return group({ class: `schematex-bpmn-gateway kind-${g.gatewayKind}` }, [
    el("polygon", {
      points,
      fill: t.gatewayFill,
      stroke: t.gatewayStroke,
      "stroke-width": 1.5,
    }),
    ...inner,
    labelEl,
  ]);
}

function renderEvent(ol: BpmnLayoutObject, t: BpmnTheme): string {
  const e = ol.obj as BpmnEvent;
  const cx = ol.x + ol.width / 2;
  const cy = ol.y + ol.height / 2;
  const r = ol.width / 2;
  const isEnd = e.kind === "end";
  const isIntermediate = e.kind === "intermediate";
  const strokeW = isEnd ? 3 : 1.2;
  const fill = isEnd ? t.endFill : isIntermediate ? t.intermediateFill : t.startFill;
  const ring = isEnd ? t.endStroke : isIntermediate ? t.intermediateStroke : t.startStroke;
  const children: string[] = [];
  children.push(
    el("circle", {
      cx,
      cy,
      r,
      fill,
      stroke: ring,
      "stroke-width": strokeW,
    })
  );
  if (isIntermediate) {
    children.push(
      el("circle", {
        cx,
        cy,
        r: r - 3,
        fill: "none",
        stroke: ring,
        "stroke-width": 1.2,
      })
    );
  }
  // Trigger glyph
  const filled = e.throwCatch === "throw" && (isIntermediate || isEnd);
  if (e.trigger === "message") {
    children.push(messageGlyph(cx, cy, r * 0.55, filled, t));
  } else if (e.trigger === "timer") {
    children.push(timerGlyph(cx, cy, r * 0.55, t));
  }
  // End-event terminator (none trigger): a thick filled disk indicates terminate
  // — we render plain none-end as just the thick ring (no inner glyph).
  // Label below.
  if (e.label) {
    children.push(
      text(
        {
          x: cx,
          y: ol.y + ol.height + 14,
          "text-anchor": "middle",
          "font-family": FONT_FAMILY,
          "font-size": 11,
          fill: t.bpmnText,
        },
        e.label
      )
    );
  }
  return group({ class: `schematex-bpmn-event kind-${e.kind} trigger-${e.trigger}` }, children);
}

function messageGlyph(cx: number, cy: number, size: number, filled: boolean, t: BpmnTheme): string {
  const w = size;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return el("g", { class: "trigger-message" }, [
    el("rect", {
      x,
      y,
      width: w,
      height: h,
      fill: filled ? t.bpmnStroke : t.poolFill,
      stroke: t.bpmnStroke,
      "stroke-width": 1,
    }),
    el("path", {
      d: `M ${x} ${y} L ${cx} ${y + h * 0.55} L ${x + w} ${y}`,
      stroke: filled ? t.poolFill : t.bpmnStroke,
      "stroke-width": 1,
      fill: "none",
    }),
  ]);
}

function timerGlyph(cx: number, cy: number, size: number, t: BpmnTheme): string {
  const r = size / 2;
  // Clock outline + 12 / 3 / 6 / 9 ticks + hands.
  const ticks: string[] = [];
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 6 - Math.PI / 2;
    const t1x = cx + (r - 1.5) * Math.cos(ang);
    const t1y = cy + (r - 1.5) * Math.sin(ang);
    const t2x = cx + r * Math.cos(ang);
    const t2y = cy + r * Math.sin(ang);
    ticks.push(`M ${t1x} ${t1y} L ${t2x} ${t2y}`);
  }
  return el("g", { class: "trigger-timer" }, [
    el("circle", { cx, cy, r, fill: "none", stroke: t.bpmnStroke, "stroke-width": 1 }),
    el("path", { d: ticks.join(" "), stroke: t.bpmnStroke, "stroke-width": 0.8 }),
    // Hands
    el("path", {
      d: `M ${cx} ${cy} L ${cx} ${cy - r * 0.7} M ${cx} ${cy} L ${cx + r * 0.5} ${cy}`,
      stroke: t.bpmnStroke,
      "stroke-width": 1.2,
      "stroke-linecap": "round",
    }),
  ]);
}

// ─── Flow rendering ───────────────────────────────────────────

function renderFlow(fl: BpmnLayoutFlow, t: BpmnTheme): string {
  const f = fl.flow;
  const isMessage = f.kind === "message";
  const dasharray = isMessage ? "6 4" : undefined;
  const markerStart = isMessage ? "url(#bpmn-msg-start)" : undefined;
  const markerEnd = isMessage ? "url(#bpmn-arrow-msg)" : "url(#bpmn-arrow-seq)";
  const children: string[] = [
    path({
      d: fl.path,
      fill: "none",
      stroke: isMessage ? t.msgFlowStroke : t.flowStroke,
      "stroke-width": 1.4,
      "stroke-dasharray": dasharray,
      "marker-start": markerStart,
      "marker-end": markerEnd,
    }),
  ];
  // Conditional flow: small diamond at source.
  if (f.kind === "conditional") {
    const head = parseStart(fl.path);
    if (head) {
      children.push(
        el("polygon", {
          points: diamondPoints(head.x, head.y, 5),
          fill: t.poolFill,
          stroke: t.flowStroke,
          "stroke-width": 1,
        })
      );
    }
  }
  // Default flow: small slash at source.
  if (f.kind === "default") {
    const head = parseStart(fl.path);
    if (head) {
      children.push(
        el("path", {
          d: `M ${head.x - 4} ${head.y + 4} L ${head.x + 4} ${head.y - 4}`,
          stroke: t.flowStroke,
          "stroke-width": 1.5,
        })
      );
    }
  }
  // Edge label.
  if (f.label && fl.labelAnchor) {
    children.push(
      text(
        {
          x: fl.labelAnchor.x,
          y: fl.labelAnchor.y,
          "text-anchor": "middle",
          "font-family": FONT_FAMILY,
          "font-size": 10,
          fill: t.bpmnText,
        },
        f.label
      )
    );
  }
  return group({ class: `schematex-bpmn-flow kind-${f.kind}` }, children);
}

function parseStart(d: string): { x: number; y: number } | null {
  const m = d.match(/^M\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { x: parseFloat(m[1]!), y: parseFloat(m[2]!) };
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx - r},${cy} ${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r}`;
}

// Re-export const for tests.
export { BPMN_CONST };
