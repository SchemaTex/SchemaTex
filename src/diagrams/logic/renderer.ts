import type { LogicGateAST, LogicGateStyle, RenderConfig } from "../../core/types";
import { layoutLogic } from "./layout";
import { curvedBackX, getGatePaths, OUTPUT_BUBBLE_R } from "./symbols";
import {
  svgRoot,
  defs,
  group,
  el,
  circle,
  path as pathEl,
  text,
  title as titleEl,
  desc,
  polygon,
} from "../../core/svg";
import { resolveIndustrialTheme } from "../../core/theme";

const PORT_SIZE = 40;
const PORT_H = 30;

function renderGateBody(
  n: ReturnType<typeof layoutLogic>["nodes"][number],
  style: LogicGateStyle
): string[] {
  const out: string[] = [];
  if (!n.geometry) return out;
  const g = n.geometry;
  const bodyWidth = g.width - (g.outputBubble ? 8 : 0);

  if (style === "iec") {
    // Rectangle
    out.push(
      el("rect", {
        x: 0,
        y: 0,
        width: bodyWidth,
        height: g.height,
        class: "schematex-logic-gate-body",
      })
    );
    if (g.iecLabel) {
      out.push(
        text(
          {
            x: bodyWidth / 2,
            y: g.height / 2 + 4,
            class: "schematex-logic-gate-iec-label",
            "text-anchor": "middle",
          },
          g.iecLabel
        )
      );
    }
  } else {
    const artwork = getGatePaths(n.gateType ?? "unknown", g.width, g.height, g.bodyScaleY);
    if (artwork.xorGap) {
      out.push(pathEl({ d: artwork.xorGap, class: "schematex-logic-xor-gap" }));
    }
    out.push(
      pathEl({ d: artwork.body, class: "schematex-logic-gate-body" })
    );
    if (artwork.xorArc) {
      out.push(pathEl({ d: artwork.xorArc, class: "schematex-logic-xor-arc" }));
    }

    for (const pin of g.inputPins) {
      const backX = curvedBackX(n.gateType ?? "unknown", pin.y, g.height, Boolean(artwork.xorArc));
      // The frozen anchor may stop short of the curved back. Extend only
      // the visible shortfall; the body/gap masks any excess routed wire.
      if (backX !== null && pin.x < backX) {
        out.push(el("line", { x1: pin.x, y1: pin.y, x2: backX, y2: pin.y, class: "schematex-logic-wire" }));
      }
    }

    if (n.gateType === "TRISTATE_BUF" || n.gateType === "TRISTATE_INV") {
      const enable = g.inputPins.find(pin => pin.id === "en");
      if (enable) {
        out.push(el("line", {
          x1: enable.x, y1: enable.y,
          x2: enable.x, y2: (55 - 25 * (enable.x - 10) / (bodyWidth - 10)) * (g.bodyScaleY ?? 1),
          class: "schematex-logic-enable-pin",
        }));
      }
    }
  }

  // Unrecognised gate: stamp a centred "?" so the ANSI box reads as a flagged
  // placeholder (IEC already centres the "?" via iecLabel above).
  if (n.gateType === "unknown" && style !== "iec") {
    out.push(
      text(
        {
          x: g.width / 2,
          y: g.height / 2 + 6,
          class: "schematex-logic-gate-iec-label",
          "text-anchor": "middle",
        },
        "?"
      )
    );
  }

  // Output bubble
  if (g.outputBubble) {
    const op = g.outputPins[0];
    out.push(
      circle({
        cx: op.x - OUTPUT_BUBBLE_R,
        cy: op.y,
        r: OUTPUT_BUBBLE_R,
        class: "schematex-logic-bubble",
      })
    );
  }

  // Clock triangle
  if (g.clockPin) {
    const cp = g.inputPins.find((p) => p.id === g.clockPin);
    if (cp) {
      out.push(
        polygon({
          points: `${cp.x},${cp.y - 5} ${cp.x + 8},${cp.y} ${cp.x},${cp.y + 5}`,
          class: "schematex-logic-clock-tri",
        })
      );
    }
  }

  // Qn bubble (sequential)
  for (const op of g.outputPins) {
    if (op.bubble && op.id !== "out") {
      out.push(
        circle({
          cx: op.x + 4,
          cy: op.y,
          r: 4,
          class: "schematex-logic-bubble",
        })
      );
    }
  }

  // Pin labels
  for (const pin of g.inputPins) {
    if (pin.label && pin.id !== g.clockPin) {
      out.push(
        text(
          {
            x: pin.x + 5,
            y: pin.y + 3,
            class: "schematex-logic-pin-label",
          },
          pin.label
        )
      );
    }
  }
  for (const pin of g.outputPins) {
    if (pin.label) {
      out.push(
        text(
          {
            x: pin.x - 6,
            y: pin.y + 3,
            class: "schematex-logic-pin-label",
            "text-anchor": "end",
          },
          pin.label
        )
      );
    }
  }

  // Gate type label (center top, small)
  if (style === "ansi" && g.iecLabel && g.height >= 60) {
    const labelX = g.width / 2;
    const labelY = g.height + 14;
    out.push(
      text(
        {
          x: labelX,
          y: labelY,
          class: "schematex-logic-gate-type",
          "text-anchor": "middle",
        },
        n.gateType === "unknown" ? n.rawType ?? "?" : n.gateType ?? ""
      )
    );
  }

  return out;
}

export function renderLogic(ast: LogicGateAST, config?: RenderConfig): string {
  const style: LogicGateStyle = ast.style ?? "ansi";
  const layout = layoutLogic(ast);
  const { width, height } = layout;
  const t = resolveIndustrialTheme(config?.theme ?? "default");

  const gateSvgs: string[] = [];
  const portSvgs: string[] = [];
  const moduleSvgs: string[] = [];

  for (const m of layout.modules) {
    moduleSvgs.push(
      group({ "data-module-id": m.id }, [
        el("rect", {
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
          rx: 6,
          class: "schematex-logic-module",
        }),
        text(
          {
            x: m.x + 10,
            y: m.y + 14,
            class: "schematex-logic-module-label",
          },
          m.label
        ),
      ])
    );
  }

  for (const n of layout.nodes) {
    if (n.kind === "gate") {
      gateSvgs.push(
        group(
          {
            transform: `translate(${n.x}, ${n.y})`,
            "data-gate-id": n.id,
            "data-gate-type": n.gateType ?? "",
          },
          renderGateBody(n, style)
        )
      );
    } else if (n.kind === "input") {
      // Label + short stub line; no rectangle.
      const cy = PORT_H / 2;
      const portWidth = n.portWidth ?? PORT_SIZE;
      portSvgs.push(
        group({ transform: `translate(${n.x}, ${n.y})`, "data-port": "input" }, [
          text(
            {
              x: 0,
              y: cy + 4,
              "text-anchor": "start",
              class: "schematex-logic-port-label",
            },
            n.label
          ),
          el("line", {
            x1: portWidth - 12,
            y1: cy,
            x2: n.isActiveLow ? portWidth - 8 : portWidth,
            y2: cy,
            class: "schematex-logic-wire",
          }),
          n.isActiveLow
            ? circle({
                cx: portWidth - 4,
                cy,
                r: 4,
                class: "schematex-logic-bubble",
              })
            : "",
        ])
      );
    } else if (n.kind === "output") {
      const cy = PORT_H / 2;
      portSvgs.push(
        group({ transform: `translate(${n.x}, ${n.y})`, "data-port": "output" }, [
          el("line", {
            x1: 0,
            y1: cy,
            x2: 12,
            y2: cy,
            class: "schematex-logic-wire",
          }),
          text(
            {
              x: 16,
              y: cy + 4,
              "text-anchor": "start",
              class: "schematex-logic-port-label",
            },
            n.label
          ),
        ])
      );
    }
  }

  const inputBubbles: string[] = [];
  const wireSvgs = layout.wires.map((w) => {
    if (w.isActiveLow) {
      inputBubbles.push(
        circle({
          cx: w.toX - 4,
          cy: w.toY,
          r: 4,
          class: "schematex-logic-bubble",
        })
      );
    }
    return [
      pathEl({ d: w.path, class: "schematex-logic-wire-clearance" }),
      pathEl({
        d: w.path,
        class: "schematex-logic-wire",
        "data-from": w.fromNode,
        "data-to": w.toNode,
      }),
    ].join("");
  });

  // A junction requires three distinct rays belonging to the SAME source net.
  // A geometric crossing between different sources never receives a dot.
  const junctions: string[] = [];
  for (const net of new Set(layout.wires.map(w => w.fromNode))) {
    const routes = layout.wires.filter(w => w.fromNode === net).map(w =>
      [...w.path.matchAll(/[ML] ([\d.-]+),([\d.-]+)/g)].map(m => ({ x: +m[1]!, y: +m[2]! })));
    const vertices = new Map(routes.flat().map(p => [`${p.x},${p.y}`, p]));
    for (const p of vertices.values()) {
      const rays = new Set<string>();
      for (const points of routes) for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!, b = points[i]!;
        if (a.x === p.x && b.x === p.x && p.y >= Math.min(a.y,b.y) && p.y <= Math.max(a.y,b.y)) {
          if (Math.min(a.y,b.y) < p.y) rays.add("up");
          if (Math.max(a.y,b.y) > p.y) rays.add("down");
        }
        if (a.y === p.y && b.y === p.y && p.x >= Math.min(a.x,b.x) && p.x <= Math.max(a.x,b.x)) {
          if (Math.min(a.x,b.x) < p.x) rays.add("left");
          if (Math.max(a.x,b.x) > p.x) rays.add("right");
        }
      }
      if (rays.size >= 3) junctions.push(circle({ cx: p.x, cy: p.y, r: 2.5, class: "schematex-logic-junction", "data-net": net }));
    }
  }

  const css = `
.schematex-logic { font-family: system-ui, -apple-system, sans-serif; }
.schematex-logic-gate-body { fill: ${t.bg}; stroke: ${t.strokeHeavy}; stroke-width: 1.75; stroke-linejoin: round; }
.schematex-logic-xor-arc { fill: none; stroke: ${t.strokeHeavy}; stroke-width: 1.75; stroke-linejoin: round; }
.schematex-logic-xor-gap { fill: ${t.bg}; stroke: none; }
.schematex-logic-enable-pin { fill: none; stroke: ${t.strokeHeavy}; stroke-width: 1.5; stroke-linecap: square; }
.schematex-logic-bubble { fill: ${t.bg}; stroke: ${t.strokeHeavy}; stroke-width: 1.5; }
.schematex-logic-clock-tri { fill: none; stroke: ${t.strokeHeavy}; stroke-width: 1.5; stroke-linejoin: round; }
.schematex-logic-wire { stroke: ${t.strokeHeavy}; stroke-width: 1.5; fill: none; stroke-linecap: square; }
.schematex-logic-wire-clearance { stroke: ${t.bg}; stroke-width: 5; fill: none; }
.schematex-logic-junction { fill: ${t.strokeHeavy}; }
.schematex-logic-port-label { font: 13px system-ui, sans-serif; fill: ${t.text}; }
.schematex-logic-pin-label { font: 9px sans-serif; fill: ${t.stroke}; }
.schematex-logic-gate-type { font: 10px sans-serif; fill: ${t.textMuted}; }
.schematex-logic-gate-iec-label { font: bold 13px sans-serif; fill: ${t.text}; }
.schematex-logic-title { font: 700 16px sans-serif; fill: ${t.text}; }
.schematex-logic-module { fill: none; stroke: ${t.textMuted}; stroke-width: 1.25; stroke-dasharray: 6 4; }
.schematex-logic-module-label { font: 11px sans-serif; fill: ${t.textMuted}; font-style: italic; }
[data-gate-type="unknown"] .schematex-logic-gate-body { stroke: ${t.accent}; stroke-dasharray: 5 3; }
[data-gate-type="unknown"] .schematex-logic-gate-iec-label { fill: ${t.accent}; }
`.trim();

  const titleSvg = ast.title
    ? text(
        {
          x: width / 2,
          y: 18,
          "text-anchor": "middle",
          class: "schematex-logic-title",
        },
        ast.title
      )
    : "";

  return svgRoot(
    {
      class: "schematex-logic",
      viewBox: `0 0 ${width} ${height + (ast.title ? 20 : 0)}`,
      width,
      height: height + (ast.title ? 20 : 0),
      role: "img",
      "data-diagram-type": "logic",
    },
    [
      titleEl(ast.title ?? "Logic Gate Diagram"),
      desc(
        `Logic gate diagram with ${ast.gates.length} gates, ${ast.inputs.length} inputs, ${ast.outputs.length} outputs`
      ),
      defs([el("style", {}, css)]),
      group(
        { transform: `translate(0, ${ast.title ? 20 : 0})` },
        [
          group({ class: "schematex-logic-modules" }, moduleSvgs),
          group({ class: "schematex-logic-wires" }, wireSvgs),
          group({ class: "schematex-logic-junctions" }, junctions),
          group({ class: "schematex-logic-gates" }, gateSvgs),
          group({ class: "schematex-logic-input-bubbles" }, inputBubbles),
          group({ class: "schematex-logic-ports" }, portSvgs),
        ]
      ),
      titleSvg,
    ]
  );
}
