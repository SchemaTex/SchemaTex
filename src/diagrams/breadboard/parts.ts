/**
 * Breadboard part catalog. Each entry describes a kind's footprint, pin
 * positions (relative to the part's local origin), and an SVG fragment
 * builder. The catalog is the single source of truth for both layout
 * (which uses footprint + pin positions) and renderer (which calls
 * `svg(part, theme)`).
 *
 * Coordinate convention for part-local space:
 *   x → grows to the right
 *   y → grows downward
 *   For span parts, origin is the *first* pin (the @start coordinate);
 *   for point parts, origin is the part center.
 */

import type {
  BreadboardPart,
  BreadboardPartKind,
} from "../../core/types";
import { el, escapeXml } from "../../core/svg";

export interface PartPin {
  /** Pin label, e.g. "5V", "GND", "D2", "1", "VCC", "ANODE". */
  name: string;
  /** Pin center, relative to part-local origin. */
  x: number;
  y: number;
}

export interface PartSpec {
  kind: BreadboardPartKind;
  /** "grid" parts snap to breadboard holes (resistor, led, dip).
   *  "side" parts sit beside the substrate (Arduino Uno).
   *  "module" parts have their own PCB footprint placed at a hole anchor. */
  category: "grid" | "side" | "module";
  /** Bounding box width / height in canvas px. */
  width: number;
  height: number;
  pins: PartPin[];
  /** Whether the part spans the trough (DIPs, MCUs that straddle). */
  straddlesTrough?: boolean;
  /** SVG body. Receives part, args, and the resolved width/height. */
  body: (part: BreadboardPart, w: number, h: number) => string;
}

const PITCH = 14;

// ─── helpers ─────────────────────────────────────────────────

function rectShape(x: number, y: number, w: number, h: number, attrs: Record<string, string | number>): string {
  return el("rect", { x, y, width: w, height: h, ...attrs });
}

function circShape(cx: number, cy: number, r: number, attrs: Record<string, string | number>): string {
  return el("circle", { cx, cy, r, ...attrs });
}

function lineShape(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, string | number>): string {
  return el("line", { x1, y1, x2, y2, ...attrs });
}

function pathShape(d: string, attrs: Record<string, string | number>): string {
  return el("path", { d, ...attrs });
}

function textShape(x: number, y: number, content: string, attrs: Record<string, string | number>): string {
  return el("text", { x, y, ...attrs }, escapeXml(content));
}

// ─── Resistor color bands (decorative) ────────────────────────

const BAND_COLORS: Record<string, string> = {
  "0": "#1f2937", "1": "#92400e", "2": "#dc2626", "3": "#f97316",
  "4": "#facc15", "5": "#16a34a", "6": "#2563eb", "7": "#7c3aed",
  "8": "#6b7280", "9": "#f3f4f6",
};

function resistorBands(value: string | number | undefined): string[] {
  if (value === undefined) return ["#92400e", "#92400e", "#1f2937", "#facc15"];
  const s = String(value).replace(/[^\d.kKmMrRΩ]/g, "");
  // Crude: parse leading number, treat 'k' = ×1000, 'M' = ×1e6.
  const m = s.match(/^([\d.]+)\s*([kKmM]?)/);
  if (!m) return ["#92400e", "#92400e", "#1f2937", "#facc15"];
  const num = parseFloat(m[1]!);
  const mult = m[2] === "k" || m[2] === "K" ? 1000 : m[2] === "m" || m[2] === "M" ? 1e6 : 1;
  const ohms = Math.round(num * mult);
  if (!Number.isFinite(ohms) || ohms <= 0) return ["#92400e", "#92400e", "#1f2937", "#facc15"];
  const str = String(ohms);
  if (str.length <= 1) return [BAND_COLORS["0"]!, BAND_COLORS[str[0]!]!, BAND_COLORS["0"]!, "#facc15"];
  const d1 = str[0]!;
  const d2 = str[1]!;
  const exp = String(str.length - 2);
  return [
    BAND_COLORS[d1] ?? "#1f2937",
    BAND_COLORS[d2] ?? "#1f2937",
    BAND_COLORS[exp] ?? "#1f2937",
    "#facc15", // gold tolerance band
  ];
}

// ─── Catalog entries ─────────────────────────────────────────

const RESISTOR: PartSpec = {
  kind: "resistor",
  category: "grid",
  width: 4 * PITCH,
  height: PITCH,
  pins: [
    { name: "1", x: 0, y: 0 },
    { name: "2", x: 4 * PITCH, y: 0 },
  ],
  body: (part, w, h) => {
    const bands = resistorBands(part.args.value);
    const cy = h / 2;
    // A 1/4 W package keeps its physical size; only the leads follow the hole span.
    const bw = Math.min(2.55 * PITCH, w * 0.8), x = (w - bw) / 2;
    const parts = [lineShape(0, cy, w, cy, { class: "lt-bb-lead" }),
      rectShape(x, cy - 5, bw, 10, { class: "lt-bb-resistor", rx: 5 })];
    for (const cx of [x + 5, x + bw - 5]) parts.push(el("ellipse", { cx, cy, rx: 5.5, ry: 6, class: "lt-bb-resistor" }));
    parts.push(rectShape(x + 4, cy - 4.5, bw - 8, 9, { fill: "#DCC39A" }));
    for (const [i, at] of [0.21, 0.37, 0.53, 0.80].entries()) {
      parts.push(rectShape(x + bw * at - 1.5, cy - 5, 3, 10, { fill: bands[i]! }));
    }
    parts.push(rectShape(x + 4, cy - 3.5, bw - 8, 1.5, { fill: "white", opacity: 0.28, rx: 0.75 }));
    return parts.join("");
  },
};

const LED: PartSpec = {
  kind: "led",
  category: "grid",
  width: PITCH,
  height: 2.3 * PITCH,
  pins: [
    { name: "anode", x: 0, y: 0 },
    { name: "cathode", x: PITCH, y: 0 },
  ],
  body: (part, w, h) => {
    const color = String(part.args.color ?? "red").toLowerCase();
    const fill = ({
      red: "#dc2626", green: "#16a34a", blue: "#2563eb",
      yellow: "#facc15", white: "#f3f4f6", orange: "#f97316",
    } as Record<string, string>)[color] ?? "#dc2626";
    const cx = w / 2, cy = h / 2;
    const r = 5 / 2.54 * PITCH / 2, flange = 5.8 / 2.54 * PITCH / 2;
    const flat = r + 0.5, half = Math.sqrt(flange * flange - flat * flat);
    return [
      lineShape(0, cy, w, cy, { class: "lt-bb-lead" }),
      pathShape(`M ${cx + flat} ${cy - half} L ${cx + flat} ${cy + half} A ${flange} ${flange} 0 1 1 ${cx + flat} ${cy - half} Z`, { fill, stroke: "#1F2328", "stroke-width": 0.8 }),
      circShape(cx, cy, r, { fill }),
      el("ellipse", { cx: cx - r * 0.35, cy: cy - r * 0.35, rx: r * 0.35, ry: r * 0.2, fill: "white", opacity: 0.5, transform: `rotate(-35 ${cx} ${cy})` }),
    ].join("");
  },
};

const CAP_ELEC: PartSpec = {
  kind: "cap-elec",
  category: "grid",
  width: PITCH,
  height: PITCH,
  pins: [
    { name: "+", x: 0, y: 0 },
    { name: "-", x: PITCH, y: 0 },
  ],
  body: (_part, w, h) => {
    const cx = w / 2;
    const cy = h / 2 - 4;
    return [
      pathShape(`M 0 ${h / 2} L ${cx - 4} ${cy + 4}`, { class: "lt-bb-lead" }),
      pathShape(`M ${w} ${h / 2} L ${cx + 4} ${cy + 4}`, { class: "lt-bb-lead" }),
      circShape(cx, cy, 7, { class: "lt-bb-cap-can" }),
      // negative stripe
      pathShape(`M ${cx + 2} ${cy - 7} A 7 7 0 0 1 ${cx + 2} ${cy + 7}`, { fill: "#94a3b8", opacity: 0.7 }),
      textShape(cx + 4, cy + 1, "−", { fill: "#fff", "font-size": 7, "font-weight": 700, "text-anchor": "middle", "dominant-baseline": "middle" }),
    ].join("");
  },
};

const CAP_CERAMIC: PartSpec = {
  kind: "cap-ceramic",
  category: "grid",
  width: PITCH,
  height: PITCH,
  pins: [
    { name: "1", x: 0, y: 0 },
    { name: "2", x: PITCH, y: 0 },
  ],
  body: (_part, w, h) => {
    const cx = w / 2;
    const cy = h / 2 - 4;
    return [
      pathShape(`M 0 ${h / 2} L ${cx - 3} ${cy + 4}`, { class: "lt-bb-lead" }),
      pathShape(`M ${w} ${h / 2} L ${cx + 3} ${cy + 4}`, { class: "lt-bb-lead" }),
      circShape(cx, cy, 6, { fill: "#facc15", stroke: "#a16207", "stroke-width": 0.8 }),
    ].join("");
  },
};

const DIODE: PartSpec = {
  kind: "diode",
  category: "grid",
  width: 3 * PITCH,
  height: PITCH,
  pins: [
    { name: "anode", x: 0, y: 0 },
    { name: "cathode", x: 3 * PITCH, y: 0 },
  ],
  body: (_part, w, h) => {
    const cy = h / 2;
    const bodyW = w * 0.55;
    const bodyX = (w - bodyW) / 2;
    return [
      pathShape(`M 0 ${cy} L ${bodyX} ${cy}`, { class: "lt-bb-lead" }),
      pathShape(`M ${bodyX + bodyW} ${cy} L ${w} ${cy}`, { class: "lt-bb-lead" }),
      rectShape(bodyX, cy - 4, bodyW, 8, { fill: "#1f2937", rx: 2 }),
      rectShape(bodyX + bodyW * 0.78, cy - 4, 2, 8, { fill: "#e5e7eb" }),
    ].join("");
  },
};

const BUTTON: PartSpec = {
  kind: "button",
  category: "grid",
  width: 2 * PITCH,
  height: 3 * PITCH,
  pins: [
    { name: "1", x: 0, y: 0 },
    { name: "2", x: 2 * PITCH, y: 0 },
    { name: "3", x: 0, y: 3 * PITCH },
    { name: "4", x: 2 * PITCH, y: 3 * PITCH },
  ],
  straddlesTrough: true,
  body: (_part, w, h) => {
    const side = 6 / 2.54 * PITCH, cx = w / 2, cy = h / 2;
    const bx = cx - side / 2, by = cy - side / 2;
    return [
      ...[0, w].flatMap(x => [lineShape(x, 0, x, by, { class: "lt-bb-lead" }), lineShape(x, h, x, by + side, { class: "lt-bb-lead" })]),
      rectShape(bx, by, side, side, { class: "lt-bb-button", rx: 2 }),
      ...[-1, 1].flatMap(dx => [-1, 1].map(dy => circShape(cx + dx * (side / 2 - 4.8), cy + dy * (side / 2 - 4.8), 1.5, { fill: "#7D8288" }))),
      circShape(cx, cy, 3.5 / 2.54 * PITCH / 2, { fill: "#45494F", stroke: "#1A1B1E", "stroke-width": 0.8 }),
      circShape(cx - 1, cy - 1, 6.5, { fill: "#555A62" }),
    ].join("");
  },
};

const TRIMMER: PartSpec = {
  kind: "potentiometer", category: "module", width: 6.99 / 2.54 * PITCH, height: 6.6 / 2.54 * PITCH + 8,
  pins: [0, 1, 2].map(i => ({ name: String(i + 1), x: (6.99 / 2.54 * PITCH - 2 * PITCH) / 2 + i * PITCH, y: 6.6 / 2.54 * PITCH + 8 })),
  body: (_part, w, h) => [
    ...[0, 1, 2].map(i => lineShape((w - 2 * PITCH) / 2 + i * PITCH, h - 8, (w - 2 * PITCH) / 2 + i * PITCH, h, { class: "lt-bb-lead" })),
    rectShape(0, 0, w, h - 8, { fill: "#2E64AE", stroke: "#1D4379", "stroke-width": 0.8, rx: 3 }),
    circShape(w / 2, (h - 8) / 2, 12.4, { fill: "#F1ECDF", stroke: "#BDB39B", "stroke-width": 0.8 }),
    el("g", { transform: `rotate(30 ${w / 2} ${(h - 8) / 2})` }, [
      rectShape(w / 2 - 8, (h - 8) / 2 - 1.2, 16, 2.4, { fill: "#7A705C", rx: 0.8 }),
      rectShape(w / 2 - 1.2, (h - 8) / 2 - 8, 2.4, 16, { fill: "#7A705C", rx: 0.8 }),
    ]),
  ].join(""),
};

function dipSpec(): PartSpec {
  return {
    kind: "dip",
    category: "grid",
    // width depends on pin count (set by layout based on args.pins)
    width: 7 * PITCH,
    height: 3 * PITCH,
    pins: [],
    straddlesTrough: true,
    body: (part, w, h) => {
      const pins = Math.max(4, Number(part.args.pins ?? 8));
      const perSide = pins / 2;
      const bodyMargin = PITCH / 2;
      return [
        rectShape(bodyMargin, 4, w - 2 * bodyMargin, h - 8, { class: "lt-bb-dip-body", rx: 2 }),
        // notch
        circShape(bodyMargin + 6, h / 2, 3, { fill: "#0f172a", stroke: "#475569", "stroke-width": 0.5 }),
        // pin 1 dot
        circShape(bodyMargin + PITCH * 0.6, h / 2 + (h / 2 - 6), 1.2, { fill: "#fbbf24" }),
        textShape(w / 2, h / 2 + 1, `IC${perSide * 2}`, { class: "lt-bb-dip-silk", "text-anchor": "middle", "dominant-baseline": "middle" }),
      ].join("");
    },
  };
}

const HEADER: PartSpec = {
  kind: "header",
  category: "grid",
  width: 4 * PITCH,
  height: PITCH,
  pins: [],
  body: (part, _w, h) => {
    const pins = Math.max(2, Number(part.args.pins ?? 4));
    const dots: string[] = [];
    for (let i = 0; i < pins; i++) {
      dots.push(circShape(i * PITCH, h / 2, 2, { fill: "#facc15", stroke: "#a16207", "stroke-width": 0.6 }));
    }
    return rectShape(-3, h / 2 - 4, pins * PITCH - 8, 8, { fill: "#0f172a", rx: 1 }) + dots.join("");
  },
};

// ─── MCUs (off-board) ────────────────────────────────────────

interface McuPinSlot { name: string; side: "left" | "right" | "top" | "bottom"; idx: number; }

function mcuSpec(
  kind: BreadboardPartKind,
  pcbColor: string,
  label: string,
  slots: McuPinSlot[],
  geometry: { width: number; height: number; cornerR: number }
): PartSpec {
  const { width, height, cornerR } = geometry;
  const maxVerticalIndex = Math.max(
    0,
    ...slots
      .filter((slot) => slot.side === "left" || slot.side === "right")
      .map((slot) => slot.idx)
  );
  const verticalStride = Math.min(12, (height - 34) / Math.max(1, maxVerticalIndex));
  const pins: PartPin[] = slots.map((s) => {
    if (s.side === "left") return { name: s.name, x: 4, y: 14 + s.idx * verticalStride };
    if (s.side === "right") return { name: s.name, x: width - 4, y: 14 + s.idx * verticalStride };
    if (s.side === "top") return { name: s.name, x: 14 + s.idx * 12, y: 4 };
    return { name: s.name, x: 14 + s.idx * 12, y: height - 4 };
  });
  return {
    kind,
    category: "side",
    width,
    height,
    pins,
    body: () => {
      const board = rectShape(0, 0, width, height, { fill: pcbColor, stroke: "#1e293b", "stroke-width": 1, rx: cornerR });
      const dotEls = pins.map((p) =>
        circShape(p.x, p.y, 2.5, { fill: "#0f172a", stroke: "#facc15", "stroke-width": 0.8 })
      ).join("");
      // pin labels (small text just inside the PCB)
      const labelEls = slots.map((s, i) => {
        const p = pins[i]!;
        const dx = s.side === "left" ? 8 : s.side === "right" ? -8 : 0;
        const dy = s.side === "top" ? 8 : s.side === "bottom" ? -8 : 0;
        const anchor = s.side === "left" ? "start" : s.side === "right" ? "end" : "middle";
        return textShape(p.x + dx, p.y + dy + 3, s.name, {
          class: "lt-bb-pin-label",
          "text-anchor": anchor,
        });
      }).join("");
      const titleEl = textShape(width / 2, kind === "mcu-uno" ? height * 0.3 : height - 8, label, {
        class: "lt-bb-board-title",
        "text-anchor": "middle",
      });
      // Components occupy the space between header labels. Pins and the body
      // stay in this same coordinate system, including when layout rotates it.
      const chipW = kind === "mcu-uno" ? width * 0.40 : Math.min(32, width * 0.28);
      const chipH = kind === "mcu-uno" ? 24 : height * 0.30;
      const chipX = (width - chipW) / 2;
      const chipY = kind === "mcu-uno" ? height * 0.65 : height * 0.38;
      const chip = rectShape(chipX, chipY, chipW, chipH, { fill: "#1e293b", stroke: "#94a3b8", "stroke-width": 0.8, rx: 1 });
      const chipPins = Array.from({ length: 8 }, (_, i) => {
        const y = chipY + 5 + i * (chipH - 10) / 7;
        return rectShape(chipX - 3, y, 3, 2, { fill: "#cbd5e1" }) + rectShape(chipX + chipW, y, 3, 2, { fill: "#cbd5e1" });
      }).join("");
      const usbW = Math.min(28, width * 0.3);
      const usb = kind === "mcu-uno"
        ? rectShape(0, 29, 31, 36, { fill: "#cbd5e1", stroke: "#475569", "stroke-width": 1, rx: 2 }) + rectShape(1, 35, 12, 24, { fill: "#475569" }) + rectShape(0, height - 53, 30, 25, { fill: "#1e293b", rx: 2 }) + circShape(8, height - 40, 6, { fill: "#64748b" })
        : rectShape((width - usbW) / 2, 0, usbW, 22, { fill: "#cbd5e1", stroke: "#475569", "stroke-width": 1, rx: 2 })
        + rectShape((width - usbW) / 2 + 4, 2, usbW - 8, 8, { fill: "#334155", rx: 1 });
      const crystal = rectShape(width / 2 - 9, height * 0.76, 18, 7, { fill: "#cbd5e1", stroke: "#64748b", "stroke-width": 0.6, rx: 3 });
      const status = circShape(width / 2 + 9, 32, 2, { fill: "#facc15" });
      return board + usb + chip + chipPins + crystal + status + dotEls + labelEls + titleEl;
    },
  };
}

// Subset of Uno pinout: power + commonly-used digital + analog
const UNO_SLOTS: McuPinSlot[] = [
  // digital header along the upper long edge (USB connector at the left)
  { name: "D13", side: "top", idx: 4 },
  { name: "D12", side: "top", idx: 5 },
  { name: "D11", side: "top", idx: 6 },
  { name: "D10", side: "top", idx: 7 },
  { name: "D9", side: "top", idx: 8 },
  { name: "D8", side: "top", idx: 9 },
  { name: "D7", side: "top", idx: 10 },
  { name: "D6", side: "top", idx: 11 },
  { name: "D5", side: "top", idx: 12 },
  { name: "D4", side: "top", idx: 13 },
  { name: "D3", side: "top", idx: 14 },
  { name: "D2", side: "top", idx: 15 },
  { name: "TX", side: "top", idx: 16 },
  { name: "RX", side: "top", idx: 17 },
  // lower long edge: separate power and analog header banks
  { name: "RST", side: "bottom", idx: 0 },
  { name: "3V3", side: "bottom", idx: 1 },
  { name: "5V", side: "bottom", idx: 2 },
  { name: "GND", side: "bottom", idx: 3 },
  { name: "VIN", side: "bottom", idx: 4 },
  { name: "A0", side: "bottom", idx: 9 },
  { name: "A1", side: "bottom", idx: 10 },
  { name: "A2", side: "bottom", idx: 11 },
  { name: "A3", side: "bottom", idx: 12 },
  { name: "A4", side: "bottom", idx: 13 },
  { name: "A5", side: "bottom", idx: 14 },
];

// Arduino Nano classic (A000005) — the full two-row header, not an Uno slice.
const NANO_SLOTS: McuPinSlot[] = [
  { name: "D1", side: "left", idx: 0 },
  { name: "D0", side: "left", idx: 1 },
  { name: "RST", side: "left", idx: 2 },
  { name: "GND", side: "left", idx: 3 },
  { name: "D2", side: "left", idx: 4 },
  { name: "D3", side: "left", idx: 5 },
  { name: "D4", side: "left", idx: 6 },
  { name: "D5", side: "left", idx: 7 },
  { name: "D6", side: "left", idx: 8 },
  { name: "D7", side: "left", idx: 9 },
  { name: "D8", side: "left", idx: 10 },
  { name: "D9", side: "left", idx: 11 },
  { name: "D10", side: "left", idx: 12 },
  { name: "D11", side: "left", idx: 13 },
  { name: "D12", side: "left", idx: 14 },
  { name: "D13", side: "right", idx: 0 },
  { name: "3V3", side: "right", idx: 1 },
  { name: "AREF", side: "right", idx: 2 },
  { name: "A0", side: "right", idx: 3 },
  { name: "A1", side: "right", idx: 4 },
  { name: "A2", side: "right", idx: 5 },
  { name: "A3", side: "right", idx: 6 },
  { name: "A4", side: "right", idx: 7 },
  { name: "A5", side: "right", idx: 8 },
  { name: "A6", side: "right", idx: 9 },
  { name: "A7", side: "right", idx: 10 },
  { name: "5V", side: "right", idx: 11 },
  { name: "RST", side: "right", idx: 12 },
  { name: "GND", side: "right", idx: 13 },
  { name: "VIN", side: "right", idx: 14 },
];

const ESP32_SLOTS: McuPinSlot[] = [
  { name: "3V3", side: "left", idx: 0 },
  { name: "EN", side: "left", idx: 1 },
  { name: "GPIO36", side: "left", idx: 2 },
  { name: "GPIO39", side: "left", idx: 3 },
  { name: "GPIO34", side: "left", idx: 4 },
  { name: "GPIO35", side: "left", idx: 5 },
  { name: "GPIO32", side: "left", idx: 6 },
  { name: "GPIO33", side: "left", idx: 7 },
  { name: "GPIO25", side: "left", idx: 8 },
  { name: "GPIO26", side: "left", idx: 9 },
  { name: "GPIO27", side: "left", idx: 10 },
  { name: "GPIO14", side: "left", idx: 11 },
  { name: "GPIO12", side: "left", idx: 12 },
  { name: "GND", side: "left", idx: 13 },
  { name: "GPIO13", side: "left", idx: 14 },
  { name: "VIN", side: "right", idx: 0 },
  { name: "GPIO23", side: "right", idx: 1 },
  { name: "GPIO22", side: "right", idx: 2 },
  { name: "GPIO1", side: "right", idx: 3 },
  { name: "GPIO3", side: "right", idx: 4 },
  { name: "GPIO21", side: "right", idx: 5 },
  { name: "GND", side: "right", idx: 6 },
  { name: "GPIO19", side: "right", idx: 7 },
  { name: "GPIO18", side: "right", idx: 8 },
  { name: "GPIO5", side: "right", idx: 9 },
  { name: "GPIO17", side: "right", idx: 10 },
  { name: "GPIO16", side: "right", idx: 11 },
  { name: "GPIO4", side: "right", idx: 12 },
  { name: "GPIO0", side: "right", idx: 13 },
  { name: "GPIO2", side: "right", idx: 14 },
  { name: "GPIO15", side: "right", idx: 15 },
];

const PICO_SLOTS: McuPinSlot[] = [
  { name: "GP0", side: "left", idx: 0 },
  { name: "GP1", side: "left", idx: 1 },
  { name: "GND", side: "left", idx: 2 },
  { name: "GP2", side: "left", idx: 3 },
  { name: "GP3", side: "left", idx: 4 },
  { name: "GP4", side: "left", idx: 5 },
  { name: "GP5", side: "left", idx: 6 },
  { name: "GP6", side: "left", idx: 7 },
  { name: "GP7", side: "left", idx: 8 },
  { name: "GP8", side: "left", idx: 9 },
  { name: "GP9", side: "left", idx: 10 },
  { name: "GP10", side: "left", idx: 11 },
  { name: "GP11", side: "left", idx: 12 },
  { name: "GP12", side: "left", idx: 13 },
  { name: "GP13", side: "left", idx: 14 },
  { name: "GP14", side: "left", idx: 15 },
  { name: "GP15", side: "left", idx: 16 },
  { name: "VBUS", side: "right", idx: 0 },
  { name: "VSYS", side: "right", idx: 1 },
  { name: "3V3_EN", side: "right", idx: 2 },
  { name: "3V3", side: "right", idx: 3 },
  { name: "ADC_VREF", side: "right", idx: 4 },
  { name: "GP28", side: "right", idx: 5 },
  { name: "AGND", side: "right", idx: 6 },
  { name: "GP27", side: "right", idx: 7 },
  { name: "GP26", side: "right", idx: 8 },
  { name: "RUN", side: "right", idx: 9 },
  { name: "GP22", side: "right", idx: 10 },
  { name: "GP21", side: "right", idx: 11 },
  { name: "GP20", side: "right", idx: 12 },
  { name: "GP19", side: "right", idx: 13 },
  { name: "GP18", side: "right", idx: 14 },
  { name: "GP17", side: "right", idx: 15 },
  { name: "GP16", side: "right", idx: 16 },
];

// ─── Sensor / display modules ────────────────────────────────

function moduleSpec(
  kind: BreadboardPartKind,
  width: number,
  height: number,
  pcbColor: string,
  pinNames: string[],
  label: string
): PartSpec {
  const stride = (width - 16) / Math.max(1, pinNames.length - 1);
  const pins: PartPin[] = pinNames.map((name, i) => ({
    name,
    x: 8 + i * stride,
    y: height - 4,
  }));
  return {
    kind,
    category: "module",
    width,
    height,
    pins,
    body: () => {
      const board = rectShape(0, 0, width, height, { fill: pcbColor, stroke: "#0f172a", "stroke-width": 1, rx: 4 });
      const headerStrip = rectShape(4, height - 8, width - 8, 5, { fill: "#0f172a", rx: 1 });
      const pinDots = pins.map((p) =>
        circShape(p.x, p.y, 2, { fill: "#facc15", stroke: "#a16207", "stroke-width": 0.5 })
      ).join("");
      const pinLabels = pinNames.map((name, i) => {
        const p = pins[i]!;
        return textShape(p.x, height - 12, name, {
          class: "lt-bb-pin-label-sensor",
          "text-anchor": "middle",
        });
      }).join("");
      const titleEl = textShape(width / 2, 18, label, {
        class: "lt-bb-board-title-sensor",
        "text-anchor": "middle",
      });
      let face = "";
      let title = titleEl;
      if (kind === "sensor-hcsr04") {
        // The paired acoustic transducers distinguish an ultrasonic module.
        face = [width * 0.25, width * 0.75].map(cx =>
          circShape(cx, 23, 17, { fill: "#cbd5e1", stroke: "#64748b", "stroke-width": 1 }) +
          circShape(cx, 23, 13, { fill: "#334155", stroke: "#94a3b8", "stroke-width": 0.8 }) +
          Array.from({ length: 5 }, (_, i) => rectShape(cx - 9, 15 + i * 4, 18, 0.7, { fill: "#64748b" })).join("")
        ).join("");
        title = "";
      } else if (kind === "actuator-servo-sg90") {
        face = rectShape(11, 7, width - 22, 29, { fill: "#2563eb", stroke: "#1e3a8a", "stroke-width": 1, rx: 2 })
          + rectShape(4, 15, width - 8, 7, { fill: "#e2e8f0", stroke: "#64748b", "stroke-width": 0.7, rx: 3 })
          + circShape(width / 2, 18.5, 6, { fill: "#f8fafc", stroke: "#64748b", "stroke-width": 0.7 })
          + circShape(width / 2, 18.5, 1.6, { fill: "#475569" });
        title = "";
      } else if (kind.startsWith("display-")) {
        face = rectShape(7, 5, width - 14, height - 28, { fill: "#020617", stroke: "#64748b", "stroke-width": 1, rx: 1 });
        title = textShape(width / 2, (height - 28) / 2 + 8, label, { class: "lt-bb-board-title-sensor", "text-anchor": "middle" });
      } else if (kind === "sensor-dht11" || kind === "sensor-dht22") {
        const cx = width / 2;
        face = rectShape(cx - 18, 4, 36, 30, { fill: kind === "sensor-dht22" ? "#e2e8f0" : "#60a5fa", stroke: "#334155", "stroke-width": 0.8, rx: 2 })
          + Array.from({ length: 5 }, (_, i) => rectShape(cx - 12, 8 + i * 5, 24, 2, { fill: "#475569", rx: 0.5 })).join("");
        title = "";
      }
      return board + face + headerStrip + pinDots + pinLabels + title;
    },
  };
}

function relayModuleSpec(): PartSpec {
  const base = moduleSpec(
    "module-relay-1ch",
    126,
    76,
    "#1d4ed8",
    ["VCC", "GND", "IN", "COM", "NO", "NC"],
    "1-CH RELAY"
  );
  return {
    ...base,
    body: (part, w, h) =>
      base.body(part, w, h) +
      rectShape(12, 27, 54, 29, {
        fill: "#2563eb",
        stroke: "#dbeafe",
        "stroke-width": 1,
        rx: 3,
      }) +
      textShape(39, 45, "SRD RELAY", {
        fill: "#eff6ff",
        "font-size": 8,
        "font-weight": 700,
        "text-anchor": "middle",
      }) +
      rectShape(78, 29, 34, 23, {
        fill: "#166534",
        stroke: "#dcfce7",
        "stroke-width": 1,
        rx: 2,
      }) +
      lineShape(85, 43, 94, 35, {
        stroke: "#dcfce7",
        "stroke-width": 1.4,
      }) +
      lineShape(94, 35, 106, 35, {
        stroke: "#dcfce7",
        "stroke-width": 1.4,
      }) +
      lineShape(94, 43, 106, 48, {
        stroke: "#dcfce7",
        "stroke-width": 1.4,
      }),
  };
}

function rtcModuleSpec(): PartSpec {
  const base = moduleSpec(
    "module-rtc-ds3231",
    112,
    68,
    "#075985",
    ["VCC", "GND", "SDA", "SCL", "SQW", "32K"],
    "RTC · DS3231"
  );
  return {
    ...base,
    body: (part, w, h) =>
      base.body(part, w, h) +
      rectShape(13, 27, 34, 23, {
        fill: "#0f172a",
        stroke: "#cbd5e1",
        "stroke-width": 1,
        rx: 2,
      }) +
      textShape(30, 41, "DS3231", {
        fill: "#f8fafc",
        "font-size": 7.5,
        "font-weight": 700,
        "text-anchor": "middle",
      }) +
      circShape(78, 39, 15, {
        fill: "#cbd5e1",
        stroke: "#475569",
        "stroke-width": 1.2,
      }) +
      circShape(78, 39, 10, {
        fill: "#e2e8f0",
        stroke: "#94a3b8",
        "stroke-width": 0.8,
      }),
  };
}

// ─── Catalog map ─────────────────────────────────────────────

export const PART_CATALOG: Record<BreadboardPartKind, PartSpec> = {
  resistor: RESISTOR,
  led: LED,
  "cap-elec": CAP_ELEC,
  "cap-ceramic": CAP_CERAMIC,
  diode: DIODE,
  button: BUTTON,
  dip: dipSpec(),
  header: HEADER,
  "mcu-uno": mcuSpec("mcu-uno", "#0d9488", "Arduino Uno", UNO_SLOTS, { width: 250, height: 190, cornerR: 6 }),
  "mcu-nano": mcuSpec("mcu-nano", "#0d9488", "Arduino Nano", NANO_SLOTS, { width: 90, height: 180, cornerR: 4 }),
  "mcu-esp32": mcuSpec("mcu-esp32", "#1e293b", "ESP32 DevKit", ESP32_SLOTS, { width: 110, height: 180, cornerR: 4 }),
  "mcu-pico": mcuSpec("mcu-pico", "#1e3a8a", "Raspberry Pi Pico", PICO_SLOTS, { width: 100, height: 180, cornerR: 4 }),
  potentiometer: TRIMMER,
  "sensor-hcsr04": moduleSpec("sensor-hcsr04", 100, 60, "#1e3a8a", ["VCC", "TRIG", "ECHO", "GND"], "HC-SR04"),
  "sensor-dht11": moduleSpec("sensor-dht11", 70, 60, "#1e40af", ["VCC", "DATA", "GND"], "DHT11"),
  "sensor-dht22": moduleSpec("sensor-dht22", 70, 60, "#1e40af", ["VCC", "DATA", "GND"], "DHT22"),
  "sensor-vl53l0x": moduleSpec("sensor-vl53l0x", 80, 56, "#1e3a8a", ["VIN", "GND", "SCL", "SDA"], "VL53L0X"),
  "display-oled-ssd1306": moduleSpec("display-oled-ssd1306", 90, 60, "#0f172a", ["GND", "VCC", "SCL", "SDA"], "OLED 128×64"),
  "display-lcd-1602-i2c": moduleSpec("display-lcd-1602-i2c", 130, 60, "#166534", ["GND", "VCC", "SDA", "SCL"], "LCD 1602 I²C"),
  "display-tm1637": moduleSpec("display-tm1637", 84, 52, "#7c2d12", ["CLK", "DIO", "VCC", "GND"], "TM1637"),
  "module-rotary-ky040": moduleSpec("module-rotary-ky040", 80, 60, "#7c2d12", ["CLK", "DT", "SW", "VCC", "GND"], "KY-040"),
  "module-l298n": moduleSpec("module-l298n", 150, 72, "#991b1b", ["ENA", "IN1", "IN2", "IN3", "IN4", "ENB", "5V", "GND", "12V"], "L298N"),
  "module-relay-1ch": relayModuleSpec(),
  "module-rtc-ds3231": rtcModuleSpec(),
  "actuator-servo-sg90": moduleSpec("actuator-servo-sg90", 60, 60, "#475569", ["GND", "VCC", "SIG"], "Servo SG90"),
};

export function partSpec(kind: BreadboardPartKind, args: Record<string, string | number> = {}): PartSpec {
  const base = PART_CATALOG[kind];
  if (!base) throw new Error(`Unknown breadboard part kind: ${kind}`);

  // Resistor: width grows with span (cols arg, default 4)
  if (kind === "resistor") {
    const cols = Math.max(2, Number(args.cols ?? 4));
    return {
      ...base,
      width: cols * PITCH,
      pins: [
        { name: "1", x: 0, y: 0 },
        { name: "2", x: cols * PITCH, y: 0 },
      ],
    };
  }
  // Diode: same pattern
  if (kind === "diode") {
    const cols = Math.max(2, Number(args.cols ?? 3));
    return {
      ...base,
      width: cols * PITCH,
      pins: [
        { name: "anode", x: 0, y: 0 },
        { name: "cathode", x: cols * PITCH, y: 0 },
      ],
    };
  }
  // DIP: width = (pins/2) cols; pins along long edges
  if (kind === "dip") {
    const pinCount = Math.max(4, Number(args.pins ?? 8));
    const perSide = pinCount / 2;
    const w = perSide * PITCH;
    const h = 3 * PITCH; // straddles trough: 3 rows tall (top half row e + trough + bottom half row f)
    const pins: PartPin[] = [];
    for (let i = 0; i < perSide; i++) {
      pins.push({ name: String(i + 1), x: i * PITCH, y: 0 });
      pins.push({ name: String(pinCount - i), x: i * PITCH, y: h });
    }
    return { ...base, width: w, height: h, pins };
  }
  // Header: width grows with pins
  if (kind === "header") {
    const pinCount = Math.max(2, Number(args.pins ?? 4));
    const pins: PartPin[] = [];
    for (let i = 0; i < pinCount; i++) pins.push({ name: String(i + 1), x: i * PITCH, y: 0 });
    return { ...base, width: pinCount * PITCH, pins };
  }
  // LED color is rendered via body() — same footprint regardless of color.
  return base;
}

// ─── Public utilities ────────────────────────────────────────

/** The default hole pitch in canvas pixels. Exported so layout / renderer agree. */
export const HOLE_PITCH = PITCH;
