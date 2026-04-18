import type { LogicGateAST, LogicGateStyle } from "../../core/types";
import { layoutLogic } from "./layout";
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

const PORT_SIZE = 40;
const PORT_H = 30;

function renderGateBody(
  n: ReturnType<typeof layoutLogic>["nodes"][number],
  style: LogicGateStyle
): string[] {
  const out: string[] = [];
  if (!n.geometry) return out;
  const g = n.geometry;

  if (style === "iec") {
    // Rectangle
    out.push(
      el("rect", {
        x: 0,
        y: 0,
        width: g.width,
        height: g.height,
        class: "schematex-logic-gate-body",
      })
    );
    if (g.iecLabel) {
      out.push(
        text(
          {
            x: g.width / 2,
            y: g.height / 2 + 4,
            class: "schematex-logic-gate-iec-label",
            "text-anchor": "middle",
          },
          g.iecLabel
        )
      );
    }
  } else {
    out.push(
      el("path", { d: g.ansiPath, class: "schematex-logic-gate-body" })
    );
  }

  // Output bubble
  if (g.outputBubble) {
    const op = g.outputPins[0];
    out.push(
      circle({
        cx: op.x - 4,
        cy: op.y,
        r: 4,
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
        n.gateType ?? ""
      )
    );
  }

  return out;
}

export function renderLogic(ast: LogicGateAST): string {
  const style: LogicGateStyle = ast.style ?? "ansi";
  const layout = layoutLogic(ast);
  const { width, height } = layout;

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
            x1: PORT_SIZE - 12,
            y1: cy,
            x2: n.isActiveLow ? PORT_SIZE - 8 : PORT_SIZE,
            y2: cy,
            class: "schematex-logic-wire",
          }),
          n.isActiveLow
            ? circle({
                cx: PORT_SIZE - 4,
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

  const wireSvgs = layout.wires.map((w) => {
    const extras: string[] = [];
    if (w.isActiveLow) {
      extras.push(
        circle({
          cx: w.toX - 4,
          cy: w.toY,
          r: 4,
          class: "schematex-logic-bubble",
        })
      );
    }
    return [
      pathEl({
        d: w.path,
        class: "schematex-logic-wire",
        "data-from": w.fromNode,
        "data-to": w.toNode,
      }),
      ...extras,
    ].join("");
  });

  const css = `
.schematex-logic { background: #fff; font-family: system-ui, -apple-system, sans-serif; }
.schematex-logic-gate-body { fill: none; stroke: #111; stroke-width: 1.75; stroke-linejoin: round; }
.schematex-logic-bubble { fill: #fff; stroke: #111; stroke-width: 1.5; }
.schematex-logic-clock-tri { fill: none; stroke: #111; stroke-width: 1.5; stroke-linejoin: round; }
.schematex-logic-wire { stroke: #111; stroke-width: 1.5; fill: none; stroke-linecap: square; }
.schematex-logic-port-label { font: 13px system-ui, sans-serif; fill: #111; }
.schematex-logic-pin-label { font: 9px sans-serif; fill: #333; }
.schematex-logic-gate-type { font: 10px sans-serif; fill: #666; }
.schematex-logic-gate-iec-label { font: bold 13px sans-serif; fill: #111; }
.schematex-logic-title { font: bold 14px sans-serif; fill: #111; }
.schematex-logic-module { fill: none; stroke: #555; stroke-width: 1.25; stroke-dasharray: 6 4; }
.schematex-logic-module-label { font: 11px sans-serif; fill: #555; font-style: italic; }
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
          group({ class: "schematex-logic-gates" }, gateSvgs),
          group({ class: "schematex-logic-ports" }, portSvgs),
        ]
      ),
      titleSvg,
    ]
  );
}
