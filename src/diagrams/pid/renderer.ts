import { defs, el, escapeXml, group, line as lineEl, path as pathEl, polygon, rect, svgRoot, text as textEl } from "../../core/svg";
import type { RenderConfig, SceneItem } from "../../core/types";
import { layoutPid } from "./layout";
import { parsePid } from "./parser";
import { renderEquip, renderInstrument } from "./symbols";
import type { PidAST, PidLayoutLine, PidLayoutResult } from "./types";
import { resolveSceneTitle } from "../../core/title-scene";

const STYLE = `
.lt-pid-equip { fill: #ffffff; stroke: #1d1d1d; stroke-width: 1.6; }
.lt-pid-equip-tag { font: 600 11px system-ui, sans-serif; fill: #1d1d1d; }
.lt-pid-equip-tag-bg { fill: #ffffff; stroke: none; }
.lt-pid-tray-line { stroke: #555; stroke-width: 1; fill: none; }
.lt-pid-actuator-letter { font: 700 11px ui-monospace, monospace; fill: #1d1d1d; }
.lt-pid-fail-position { font: 700 8px ui-monospace, monospace; fill: #1d1d1d; }

.lt-pid-process { stroke: #1d1d1d; stroke-width: 2.6; fill: none; }
.lt-pid-process-min { stroke: #1d1d1d; stroke-width: 1.5; fill: none; }
.lt-pid-pneumatic { stroke: #1d1d1d; stroke-width: 1.4; fill: none; }
.lt-pid-electric { stroke: #1d1d1d; stroke-width: 1.4; fill: none; stroke-dasharray: 6 4; }
.lt-pid-hydraulic { stroke: #1d1d1d; stroke-width: 1.4; fill: none; stroke-dasharray: 10 4; }
.lt-pid-capillary { stroke: #1d1d1d; stroke-width: 1.4; fill: none; stroke-dasharray: 1 5; stroke-linecap: round; }
.lt-pid-software { stroke: #6a6a6a; stroke-width: 1.3; fill: none; stroke-dasharray: 2 4; }
.lt-pid-mechanical { stroke: #1d1d1d; stroke-width: 1.4; fill: none; stroke-dasharray: 3 2 1 2; }

.lt-pid-pneumatic-tick { stroke: #1d1d1d; stroke-width: 1.2; }

.lt-inst-body { fill: #ffffff; stroke: #1d1d1d; stroke-width: 1.4; }
.lt-inst-tag { font: 600 9.5px system-ui, sans-serif; fill: #1d1d1d; }
.lt-inst-cr-line { stroke: #1d1d1d; stroke-width: 1; }
.lt-inst-local-line { stroke: #1d1d1d; stroke-width: 1; stroke-dasharray: 2 2; }
.lt-pid-valve-body { fill: #ffffff; stroke: #1d1d1d; stroke-width: 1.4; }

.lt-pid-line-path { fill: none; }
.lt-pid-junction { fill: #1d1d1d; stroke: #ffffff; stroke-width: 0.8; }
.lt-pid-line-tag-bg { fill: #ffffff; stroke: #1d1d1d; stroke-width: 0.6; }
.lt-pid-line-tag-text { font: 9px ui-monospace, monospace; fill: #1d1d1d; }

.lt-pid-title { font: 700 16px system-ui, sans-serif; fill: #1d1d1d; }

.lt-pid-unknown-box { fill: none; stroke: #c0392b; stroke-width: 1.6; stroke-dasharray: 5 3; }
.lt-pid-unknown-mark { font: 700 18px system-ui, sans-serif; fill: #c0392b; }
.lt-pid-unknown-type { font: 9px ui-monospace, monospace; fill: #6a6a6a; }
`;

const ARROW_ID = "lt-pid-arrow";

/** Line-type → CSS class. `process_minor` → `lt-pid-process-min` (matches STYLE). */
const LINE_CLASS: Record<string, string> = {
  process: "lt-pid-process",
  process_minor: "lt-pid-process-min",
  pneumatic: "lt-pid-pneumatic",
  electric: "lt-pid-electric",
  hydraulic: "lt-pid-hydraulic",
  capillary: "lt-pid-capillary",
  software: "lt-pid-software",
  mechanical: "lt-pid-mechanical",
};

/** Signal (instrument) line types — rendered above equipment in z-order. */
const SIGNAL_LINE_TYPES = new Set([
  "pneumatic", "electric", "hydraulic", "capillary", "software", "mechanical",
]);

function lineClass(t: PidLayoutLine["line"]["lineType"]): string {
  return LINE_CLASS[t] ?? `lt-pid-${String(t).replace(/_/g, "-")}`;
}

function isSignalLine(l: PidLayoutLine): boolean {
  return SIGNAL_LINE_TYPES.has(l.line.lineType);
}

function processJunctions(lines: PidLayoutLine[]): string[] {
  const endpoints = new Map<string, { x: number; y: number; count: number }>();
  for (const line of lines) {
    if (isSignalLine(line)) continue;
    const points = [...line.path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map(
      (match) => ({ x: Number(match[1]), y: Number(match[2]) })
    );
    for (const point of [points[0], points[points.length - 1]]) {
      if (!point) continue;
      const key = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      const existing = endpoints.get(key);
      if (existing) existing.count++;
      else endpoints.set(key, { ...point, count: 1 });
    }
  }
  return [...endpoints.values()]
    .filter((point) => point.count > 1)
    .map((point) =>
      el("circle", {
        cx: point.x,
        cy: point.y,
        r: 3.6,
        class: "lt-pid-junction",
      })
    );
}

function renderLine(l: PidLayoutLine, scene?: SceneItem[], index = 0): string {
  const cls = lineClass(l.line.lineType);
  const parts: string[] = [
    pathEl({
      d: l.path,
      // Type class + a shared no-fill guard class on every line path.
      class: `${cls} lt-pid-line-path`,
      "data-line-id": l.line.id,
      "data-service": l.line.service ?? "",
      "data-sx-live-edge": scene ? "true" : undefined,
    }),
  ];

  // Pneumatic: overlay tick marks every ~30 px along the path.
  if (l.line.lineType === "pneumatic") {
    parts.push(...pneumaticTicks(l.path));
  }

  // Render the line tag in the middle of the segment, if provided.
  if (l.line.tag) {
    const w = Math.max(28, l.line.tag.length * 6);
    parts.push(
      rect({
        x: l.midX - w / 2,
        y: l.midY - 8,
        width: w,
        height: 14,
        rx: 2,
        ry: 2,
        class: "lt-pid-line-tag-bg",
      })
    );
    parts.push(
      textEl(
        {
          x: l.midX,
          y: l.midY + 3,
          "text-anchor": "middle",
          class: "lt-pid-line-tag-text",
        },
        l.line.tag
      )
    );
  }

  scene?.push({
    key: `edge:${index}`, kind: "edge", path: l.path,
    editable: { label: false, position: "none" },
  });
  return group({
    class: "lt-pid-line", "data-id": l.line.id,
    ...(scene ? {
      "data-sx-live-explicit": "true",
      "data-sx-live-start": l.line.from.id,
      "data-sx-live-end": l.line.to.id,
      "data-sx-live-mode": "orthogonal",
    } : {}),
  }, parts);
}

function pneumaticTicks(d: string): string[] {
  // Simple approach: parse "M x y L x y L ..." and emit ticks along straight segments.
  const tokens = d.match(/([MLC])\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  for (const t of tokens) {
    const m = t.match(/[MLC]\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if (!m) continue;
    points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }
  const ticks: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 12) continue;
    const ux = dx / len;
    const uy = dy / len;
    // perpendicular unit
    const px = -uy;
    const py = ux;
    for (let s = 18; s < len; s += 26) {
      const cx = a.x + ux * s;
      const cy = a.y + uy * s;
      ticks.push(
        lineEl({
          x1: cx + px * 4 - ux * 4,
          y1: cy + py * 4 - uy * 4,
          x2: cx - px * 4 + ux * 4,
          y2: cy - py * 4 + uy * 4,
          class: "lt-pid-pneumatic-tick",
        })
      );
    }
  }
  return ticks;
}

export function renderPidAST(ast: PidAST, config?: RenderConfig): string {
  const layout = layoutPid(ast, config?.__pins);
  return renderLayout(layout, config);
}

export function renderPid(text: string, config?: RenderConfig): string {
  const ast = parsePid(text);
  return renderPidAST(ast, config);
}

function renderLayout(layout: PidLayoutResult, config?: RenderConfig): string {
  const equipNodes = layout.equipment.map((eq) => {
    const symbol = renderEquip(
      eq.equip.equipType,
      eq.equip.tag ?? eq.equip.id,
      eq.equip.rawType,
      eq.equip.attrs
    );
    const wrapAttrs: Record<string, string> = {
      class: "lt-pid-equip-wrap",
      "data-id": eq.equip.id,
      "data-type": eq.equip.equipType,
      transform: `translate(${eq.cx} ${eq.cy})`,
      ...(config?.__scene ? {
        "data-sx-key": `node:${eq.equip.id}`,
        "data-sx-owner": `node:${eq.equip.id}`,
      } : {}),
    };
    if (eq.equip.equipType === "unknown" && eq.equip.rawType) {
      wrapAttrs["data-raw-type"] = eq.equip.rawType;
    }
    config?.__scene?.push({
      key: `node:${eq.equip.id}`,
      kind: "node",
      semanticId: eq.equip.id,
      label: eq.equip.tag ?? eq.equip.id,
      bbox: { x: eq.x, y: eq.y, width: eq.width, height: eq.height },
      editable: { label: false, position: "free" },
    });
    return group(wrapAttrs, [symbol]);
  });

  const instNodes = layout.instruments.map((i) => {
    const { letter, number } = parseTag(i.inst.tag);
    return group(
      {
        class: "lt-inst",
        "data-tag": i.inst.tag,
        "data-category": i.inst.category,
        transform: `translate(${i.cx} ${i.cy})`,
        ...(config?.__scene ? {
          "data-sx-key": `node:${i.inst.tag}`,
          "data-sx-owner": `node:${i.inst.tag}`,
        } : {}),
      },
      [renderInstrument(i.inst.category, letter, number)]
    );
  });
  for (const item of layout.instruments) {
    config?.__scene?.push({
      key: `node:${item.inst.tag}`,
      kind: "node",
      semanticId: item.inst.tag,
      label: item.inst.tag,
      bbox: { x: item.cx - item.r, y: item.cy - item.r, width: item.r * 2, height: item.r * 2 },
      editable: { label: false, position: "free" },
    });
  }

  // Auto-generate signal connections from instrument relations:
  //  - measures: dashed signal line from instrument to the measured equipment center
  //  - controls: pneumatic signal line from instrument to the controlled valve actuator (or center)
  const autoSignals: string[] = [];
  for (const i of layout.instruments) {
    if (i.inst.measures) {
      const eq = layout.equipment.find((e) => e.equip.id === i.inst.measures);
      if (eq) {
        const ax = i.cx;
        const ay = i.cy;
        const bx = eq.cx;
        const by = eq.cy + eq.height / 2;
        const path = `M ${ax} ${ay} L ${ax} ${by + 8} L ${bx} ${by + 8} L ${bx} ${by}`;
        autoSignals.push(
          group({
            ...(config?.__scene ? {
              "data-sx-live-explicit": "true",
              "data-sx-live-start": i.inst.tag,
              "data-sx-live-end": i.inst.measures,
              "data-sx-live-mode": "orthogonal",
            } : {}),
          }, [pathEl({
            d: path,
            class: "lt-pid-electric",
            "data-sx-live-edge": config?.__scene ? "true" : undefined,
          })])
        );
      }
    }
    if (i.inst.controls) {
      const eq = layout.equipment.find((e) => e.equip.id === i.inst.controls);
      if (eq) {
        const ax = i.cx;
        const ay = i.cy + i.r;
        const bx = eq.cx;
        const by = eq.y;
        const path = `M ${ax} ${ay} L ${bx} ${ay} L ${bx} ${by}`;
        autoSignals.push(
          group({
            ...(config?.__scene ? {
              "data-sx-live-explicit": "true",
              "data-sx-live-start": i.inst.tag,
              "data-sx-live-end": i.inst.controls,
              "data-sx-live-mode": "orthogonal",
            } : {}),
          }, [pathEl({
            d: path,
            class: "lt-pid-pneumatic",
            "data-sx-live-edge": config?.__scene ? "true" : undefined,
          })])
        );
      }
    }
  }

  const title = layout.title
    ? resolveSceneTitle(layout.title, layout.titleSourceRange, layout.width / 2, 22, config)
    : undefined;
  const titleNode = title
    ? textEl({ x: title.x, y: title.y, class: "lt-pid-title", "text-anchor": "middle", ...title.attrs }, layout.title!)
    : "";

  return svgRoot(
    {
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lt-pid",
      "data-diagram-type": "pid",
    },
    [
      el("title", {}, escapeXml(`P&ID${layout.title ? " — " + layout.title : ""}`)),
      el("desc", {}, escapeXml("ISA-5.1 / ISO 10628 P&ID rendered by Schematex")),
      defs([
        el(
          "marker",
          {
            id: ARROW_ID,
            markerWidth: 10,
            markerHeight: 10,
            refX: 9,
            refY: 3,
            orient: "auto",
            markerUnits: "strokeWidth",
          },
          [polygon({ points: "0,0 10,3 0,6", fill: "#1d1d1d" })]
        ),
        el("style", {}, STYLE),
      ]),
      titleNode,
      // Z-order: process pipes behind equipment; signal lines + instruments above.
      group(
        { class: "lt-pid-lines lt-pid-process-lines" },
        layout.lines.filter((l) => !isSignalLine(l)).map((line) => renderLine(line, config?.__scene, layout.lines.indexOf(line)))
      ),
      group({ class: "lt-pid-junctions" }, processJunctions(layout.lines)),
      group({ class: "lt-pid-equipment" }, equipNodes),
      group(
        { class: "lt-pid-lines lt-pid-signal-lines" },
        [...layout.lines.filter(isSignalLine).map((line) => renderLine(line, config?.__scene, layout.lines.indexOf(line))), ...autoSignals]
      ),
      group({ class: "lt-pid-instruments" }, instNodes),
    ]
  );
}

function parseTag(tag: string): { letter: string; number: string } {
  const idx = tag.indexOf("-");
  if (idx < 0) return { letter: tag, number: "" };
  return { letter: tag.slice(0, idx), number: tag.slice(idx + 1) };
}
