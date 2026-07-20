import type { RenderConfig, TimingAST, TimingSignal, TimingGroup } from "../../core/types";
import { svgRoot, defs, group, el, text, title as titleEl, desc } from "../../core/svg";
import { resolveSceneTitle } from "../../core/title-scene";
import { resolveBaseTheme } from "../../core/theme";

const NAME_W = 120;
const SIG_H = 36;
const PAD_TOP = 12;
const PAD_BOT = 12;
/** Height of the reserved title band when `ast.title` is set. */
const TITLE_H = 28;
const PAD_V = 6; // vertical padding inside band for rail spacing
const DEFAULT_PW = 40;
const GROUP_LABEL_H = 22;

type FlatRow =
  | { kind: "signal"; signal: TimingSignal; indent: number }
  | { kind: "group"; label: string; indent: number };

function flatten(items: Array<TimingSignal | TimingGroup>, indent = 0): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if ("wave" in item) {
      out.push({ kind: "signal", signal: item, indent });
    } else {
      out.push({ kind: "group", label: item.label, indent });
      out.push(...flatten(item.signals, indent + 1));
    }
  }
  return out;
}

interface WaveCtx {
  pw: number;
  yHi: number;
  yLo: number;
  yMid: number;
  h: number;
}

type PrevState = "hi" | "lo" | "bus" | "z" | "x" | "none";

function renderWave(signal: TimingSignal, ctx: WaveCtx): { svg: string; labels: string } {
  const { pw, yHi, yLo, yMid } = ctx;
  const wave = signal.wave;
  const paths: string[] = [];
  const busRects: string[] = [];
  const busTexts: string[] = [];
  const xPatchRects: string[] = [];
  const zLines: string[] = [];

  let prev: PrevState = "none";
  let prevChar = "";
  let busStartX = 0;
  let busIndex = 0;
  let dataIdx = 0;
  let linePath = "";

  const startLine = (x: number, y: number) => {
    if (linePath) paths.push(linePath);
    linePath = `M ${x},${y}`;
  };
  const extendLineTo = (x: number, y: number) => {
    linePath += ` L ${x},${y}`;
  };
  const flushLine = () => {
    if (linePath) {
      paths.push(linePath);
      linePath = "";
    }
  };

  const closeBus = (x: number) => {
    const start = busStartX;
    const end = x;
    const inset = Math.min(5, (end - start) / 2);
    // Trapezoid outline
    const d = `M ${start + inset},${yHi} L ${end - inset},${yHi} L ${end},${yMid} L ${end - inset},${yLo} L ${start + inset},${yLo} L ${start},${yMid} Z`;
    busRects.push(
      el("path", { class: "schematex-timing-bus", d, "data-bus-index": String(busIndex) })
    );
    // Data label
    const label = signal.data?.[dataIdx] ?? "";
    if (label) {
      busTexts.push(
        text(
          {
            x: (start + end) / 2,
            y: yMid + 4,
            class: "schematex-timing-bus-label",
            "text-anchor": "middle",
          },
          label
        )
      );
    }
    dataIdx++;
    busIndex++;
  };

  for (let i = 0; i < wave.length; i++) {
    const ch = wave[i];
    const x = i * pw;
    const xNext = x + pw;

    // Handle continuation '.'
    const effective = ch === "." ? prevChar : ch;

    switch (effective) {
      case "0":
      case "l":
      case "L": {
        if (prev === "bus") closeBus(x);
        if (prev === "x" || prev === "z" || prev === "none" || prev === "bus") {
          flushLine();
          startLine(x, yLo);
        } else if (prev === "hi") {
          extendLineTo(x, yLo);
        }
        extendLineTo(xNext, yLo);
        prev = "lo";
        break;
      }
      case "1":
      case "h":
      case "H": {
        if (prev === "bus") closeBus(x);
        if (prev === "x" || prev === "z" || prev === "none" || prev === "bus") {
          flushLine();
          startLine(x, yHi);
        } else if (prev === "lo") {
          extendLineTo(x, yHi);
        }
        extendLineTo(xNext, yHi);
        prev = "hi";
        break;
      }
      case "p":
      case "P": {
        if (prev === "bus") closeBus(x);
        flushLine();
        // One-period positive clock: lo→hi at x, hi until midpoint, lo at mid, lo until xNext
        startLine(x, yLo);
        extendLineTo(x, yHi);
        extendLineTo(x + pw / 2, yHi);
        extendLineTo(x + pw / 2, yLo);
        extendLineTo(xNext, yLo);
        flushLine();
        prev = "lo";
        break;
      }
      case "n":
      case "N": {
        if (prev === "bus") closeBus(x);
        flushLine();
        startLine(x, yHi);
        extendLineTo(x, yLo);
        extendLineTo(x + pw / 2, yLo);
        extendLineTo(x + pw / 2, yHi);
        extendLineTo(xNext, yHi);
        flushLine();
        prev = "hi";
        break;
      }
      case "u": {
        if (prev === "bus") closeBus(x);
        flushLine();
        startLine(x, yLo);
        extendLineTo(xNext, yHi);
        prev = "hi";
        break;
      }
      case "d": {
        if (prev === "bus") closeBus(x);
        flushLine();
        startLine(x, yHi);
        extendLineTo(xNext, yLo);
        prev = "lo";
        break;
      }
      case "z": {
        if (prev === "bus") closeBus(x);
        flushLine();
        zLines.push(
          el("line", {
            x1: x,
            y1: yMid,
            x2: xNext,
            y2: yMid,
            class: "schematex-timing-hiz",
          })
        );
        prev = "z";
        break;
      }
      case "x": {
        if (prev === "bus") closeBus(x);
        flushLine();
        xPatchRects.push(
          el("rect", {
            x,
            y: yHi,
            width: pw,
            height: yLo - yHi,
            class: "schematex-timing-unknown",
            fill: "url(#schematex-timing-xhatch)",
          })
        );
        prev = "x";
        break;
      }
      case "=":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9": {
        // Each fresh bus char (not '.') begins a new segment.
        const isContinuation = ch === ".";
        if (!isContinuation && prev === "bus") closeBus(x);
        if (prev !== "bus" || !isContinuation) {
          flushLine();
          busStartX = x;
        }
        prev = "bus";
        break;
      }
      default: {
        // unknown char -> treat as x
        flushLine();
        xPatchRects.push(
          el("rect", {
            x,
            y: yHi,
            width: pw,
            height: yLo - yHi,
            class: "schematex-timing-unknown",
            fill: "url(#schematex-timing-xhatch)",
          })
        );
        prev = "x";
      }
    }

    prevChar = effective;
  }

  // Close trailing bus
  if (prev === "bus") closeBus(wave.length * pw);
  flushLine();

  const waveSvg = paths
    .map((d) => el("path", { class: "schematex-timing-wave", d }))
    .concat(xPatchRects, zLines, busRects)
    .join("");

  return { svg: waveSvg, labels: busTexts.join("") };
}

export function renderTiming(ast: TimingAST, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  const pw = DEFAULT_PW * (ast.hscale ?? 1);
  const rows = flatten(ast.signals);
  const maxWaveLen = Math.max(
    1,
    ...rows.flatMap((r) => (r.kind === "signal" ? [r.signal.wave.length] : []))
  );
  const waveAreaW = maxWaveLen * pw;
  const width = NAME_W + waveAreaW + 20;

  // Reserve a band above the waveforms when a title is present, so the
  // centered title never collides with the first signal row.
  const gridTop = PAD_TOP + (ast.title ? TITLE_H : 0);
  let y = gridTop;
  const rowYs: number[] = [];
  for (const r of rows) {
    rowYs.push(y);
    y += r.kind === "group" ? GROUP_LABEL_H : SIG_H;
  }
  const height = y + PAD_BOT + 10;

  // Render rows
  const waveSvgs: string[] = [];
  const labelSvgs: string[] = [];
  const nameSvgs: string[] = [];
  const gridLines: string[] = [];
  const nativeHandles: string[] = [];

  // Grid: vertical period ticks across signal area
  for (let i = 0; i <= maxWaveLen; i++) {
    const xg = NAME_W + i * pw;
    gridLines.push(
      el("line", {
        x1: xg,
        y1: gridTop,
        x2: xg,
        y2: height - PAD_BOT,
        class: "schematex-timing-grid",
      })
    );
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ry = rowYs[i];

    if (row.kind === "group") {
      nameSvgs.push(
        text(
          {
            x: 6 + row.indent * 10,
            y: ry + GROUP_LABEL_H - 6,
            class: "schematex-timing-group-label",
          },
          row.label
        )
      );
      continue;
    }

    const signal = row.signal;
    const yHi = ry + PAD_V;
    const yLo = ry + SIG_H - PAD_V;
    const yMid = ry + SIG_H / 2;

    // Signal name (right-aligned in name column). `~NAME` or `/NAME` → overlined active-low.
    const activeLow = signal.name.startsWith("~") || signal.name.startsWith("/");
    const displayName = activeLow ? signal.name.slice(1) : signal.name;
    nameSvgs.push(
      text(
        {
          x: NAME_W - 8,
          y: yMid + 4,
          class: activeLow
            ? "schematex-timing-name schematex-timing-name-activelow"
            : "schematex-timing-name",
          "text-anchor": "end",
        },
        displayName
      )
    );

    const { svg, labels } = renderWave(signal, {
      pw,
      yHi,
      yLo,
      yMid,
      h: SIG_H - 2 * PAD_V,
    });

    waveSvgs.push(
      group(
        {
          transform: `translate(${NAME_W}, 0)`,
          "data-signal": signal.name,
        },
        [svg]
      )
    );
    labelSvgs.push(
      group({ transform: `translate(${NAME_W}, 0)` }, [labels])
    );

    if (config?.__scene && signal.waveSourceRange) {
      const effective: string[] = [];
      let previous = "x";
      for (const char of signal.wave) {
        const state = char === "." ? previous : char;
        effective.push(state);
        previous = state;
      }
      const boundaries: number[] = [];
      for (let boundary = 1; boundary < effective.length; boundary++) {
        if (effective[boundary] !== effective[boundary - 1]) boundaries.push(boundary);
      }
      for (const boundary of boundaries) {
        let runStart = boundary - 1;
        while (runStart > 0 && effective[runStart - 1] === effective[boundary - 1]) runStart--;
        let runEnd = boundary + 1;
        while (runEnd < effective.length && effective[runEnd] === effective[boundary]) runEnd++;
        const key = `handle:timing:${signal.name}:${boundary}`;
        const hx = NAME_W + boundary * pw;
        config.__scene.push({
          key,
          kind: "node",
          label: `${signal.name} transition ${boundary}`,
          bbox: { x: hx - 5, y: yMid - 5, width: 10, height: 10 },
          positionSource: {
            kind: "wave-boundary",
            range: signal.waveSourceRange,
            wave: signal.wave,
            boundary,
            runStart,
            runEnd,
            periodWidth: pw,
          },
          editable: { label: false, position: "move-x" },
        });
        nativeHandles.push(el("rect", {
          x: hx - 4,
          y: yMid - 4,
          width: 8,
          height: 8,
          rx: 1.5,
          class: "sx-native-handle",
          transform: `rotate(45 ${hx} ${yMid})`,
          "data-sx-key": key,
          "data-sx-owner": key,
        }));
      }
    }
  }

  const xhatch = el(
    "pattern",
    {
      id: "schematex-timing-xhatch",
      patternUnits: "userSpaceOnUse",
      width: 6,
      height: 6,
    },
    [
      el("rect", { x: 0, y: 0, width: 6, height: 6, fill: t.fillMuted }),
      el("path", {
        d: "M 0,6 L 6,0 M -1,1 L 1,-1 M 5,7 L 7,5",
        stroke: t.textMuted,
        "stroke-width": 0.8,
      }),
    ]
  );

  const css = `
.schematex-timing { font-family: system-ui, -apple-system, sans-serif; }
.schematex-timing-name { font: 12px monospace; fill: ${t.text}; }
.schematex-timing-name-activelow { text-decoration: overline; }
.schematex-timing-group-label { font: bold 12px sans-serif; fill: ${t.text}; }
.schematex-timing-wave { stroke: ${t.stroke}; stroke-width: 1.75; fill: none; stroke-linejoin: miter; stroke-linecap: square; }
.schematex-timing-bus { fill: none; stroke: ${t.stroke}; stroke-width: 1.5; }
.schematex-timing-bus-label { font: 11px monospace; fill: ${t.text}; }
.schematex-timing-unknown { stroke: ${t.textMuted}; stroke-width: 0.5; }
.schematex-timing-hiz { stroke: ${t.textMuted}; stroke-width: 1.5; stroke-dasharray: 4 3; }
.schematex-timing-grid { stroke: ${t.fillMuted}; stroke-width: 0.5; }
.schematex-timing-title { font: 700 16px system-ui, -apple-system, sans-serif; fill: ${t.text}; }
.sx-native-handle { fill: ${t.fill}; stroke: ${t.accent}; stroke-width: 1.4; cursor: ew-resize; vector-effect: non-scaling-stroke; }
.sx-native-handle:hover { fill: ${t.fillMuted}; stroke-width: 2; }
`.trim();

  return svgRoot(
    {
      class: "schematex-timing",
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: "img",
      "data-diagram-type": "timing",
    },
    [
      titleEl(ast.title ?? "Timing Diagram"),
      desc(`Digital timing diagram with ${rows.filter((r) => r.kind === "signal").length} signals`),
      defs([xhatch, el("style", {}, css)]),
      group({ class: "schematex-timing-grid-g" }, gridLines),
      group({ class: "schematex-timing-waves" }, waveSvgs),
      group({ class: "schematex-timing-labels" }, labelSvgs),
      group({ class: "schematex-timing-names" }, nameSvgs),
      group({ class: "sx-native-handles" }, nativeHandles),
      ast.title
        ? (() => {
            const title = resolveSceneTitle(ast.title!, ast.titleSourceRange, width / 2, PAD_TOP + 12, config);
            return text(
              {
                x: title.x,
                y: title.y,
                "text-anchor": "middle",
                class: "schematex-timing-title",
                ...title.attrs,
              },
              ast.title!
            );
          })()
        : "",
    ]
  );
}
