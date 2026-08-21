/**
 * Layout quality metrics for the circuit engine.
 *
 * Reports the numbers the schematic rework was aimed at: canvas aspect ratio,
 * how much of the drawing is wire, and how many labels collide. Run against
 * two builds to compare.
 *
 *   node scripts/layout-metrics.mjs
 */
import { render } from "../dist/index.js";

const CASES = {
  "series-4": chain(4),
  "series-10": chain(10),
  "series-20": chain(20),
  divider: `circuit "Divider" netlist
V1 vcc 0 5V
R1 vcc mid 10k
R2 mid 0 10k
C1 mid 0 100n`,
  "555-counter": `circuit "Frequency Counter" netlist
V1 vcc 0 5V
U1 vcc 0 trig out type=IC555
U2 out q0 q1 q2 q3 type=74LS90
R1 vcc trig 10k`,
  "esp32-gauge": `circuit "ESP32 Fuel Gauge" netlist
B1 bat gnd type=battery
U2 sda scl vcc gnd bat type=MAX17048
U1 sda scl vcc gnd type=ESP32
R1 vcc sda 4.7k
R2 vcc scl 4.7k`,
  "at89s52-relay": `circuit "AT89S52 4-Relay Board" netlist
V_AC AC_live AC_neutral 220Vac type=acsource
Vcc_supply VCC 0 5V
C3 VCC 0 100n
R1 p10 led1 220
R2 p11 led2 220
R3 p12 led3 220
R4 p13 led4 220
C1 XTAL1 0 22p
C2 XTAL2 0 22p
Y1 XTAL1 XTAL2 type=crystal label="11.0592MHz"
R5 VCC RESET 10k
C4 RESET 0 10u
U1 VCC 0 XTAL1 XTAL2 RESET p10 p11 p12 p13 type=ic label="AT89S52"
U2 led1 0 AC_live load1 label="SSR1"
U3 led2 0 AC_live load2 label="SSR2"
Rload1 load1 AC_neutral 1k label="Load 1"
Rload2 load2 AC_neutral 1k label="Load 2"`,
  "astable": `circuit "Astable Multivibrator" netlist
V1 vcc 0 5V
R1 vcc q1c 1k
R2 vcc q2c 1k
R3 vcc q1b 22k
R4 vcc q2b 22k
C1 q1b q2c 10u
C2 q2b q1c 10u
Q1 q1c q1b 0 type=npn
Q2 q2c q2b 0 type=npn`,
};

function chain(n) {
  let s = 'circuit "Chain" netlist\nV1 n0 0 5V\n';
  for (let i = 1; i <= n; i++) s += `R${i} n${i - 1} n${i} 1k\n`;
  return s;
}

function metrics(svg) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = Number(vb?.[1] ?? 0);
  const h = Number(vb?.[2] ?? 1);

  // Total wire length across every polyline/line segment.
  let wire = 0;
  for (const m of svg.matchAll(/points="([^"]+)"/g)) {
    const pts = m[1]
      .trim()
      .split(/\s+/)
      .map((p) => p.split(",").map(Number));
    for (let i = 0; i + 1 < pts.length; i++) {
      wire += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    }
  }

  // Label collisions: same test the regression suite uses.
  const labels = [
    ...svg.matchAll(
      /<text[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*class="schematex-circuit-label"/g
    ),
  ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  let collisions = 0;
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (
        Math.abs(labels[i].x - labels[j].x) < 26 &&
        Math.abs(labels[i].y - labels[j].y) < 11
      ) {
        collisions++;
      }
    }
  }

  // Component bodies that overlap each other — the defect a reader sees as
  // "these two chips are sitting on top of each other".
  //
  // Symbol geometry is authored in local coordinates inside a <g transform>,
  // so the rect attributes alone are meaningless: every IC body is drawn at
  // the same local origin and would trivially "overlap" every other. The
  // enclosing translate has to be applied before any of this means anything.
  const boxes = [];
  for (const g of svg.matchAll(
    /<g transform="translate\(([-\d.]+),\s*([-\d.]+)\)(?:\s*rotate\((\d+)\))?"[^>]*>([\s\S]*?)<\/g>/g
  )) {
    const gx = +g[1], gy = +g[2], rot = +(g[3] ?? 0);
    const inner = g[4];
    const rect = inner.match(
      /<rect[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/
    );
    if (!rect) continue;
    const rx = +rect[1], ry = +rect[2], rw = +rect[3], rh = +rect[4];
    if (rw < 20 || rh < 20) continue;
    // Only 0/180 keep the axis-aligned footprint; 90/270 swap the extents.
    const swap = rot === 90 || rot === 270;
    boxes.push({
      x: gx + (swap ? ry : rx),
      y: gy + (swap ? rx : ry),
      w: swap ? rh : rw,
      h: swap ? rw : rh,
    });
  }
  let bodyOverlaps = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 2 && oy > 2) bodyOverlaps++;
    }
  }

  return {
    w: Math.round(w),
    h: Math.round(h),
    aspect: +(w / h).toFixed(1),
    wire: Math.round(wire),
    labels: labels.length,
    collisions,
    bodyOverlaps,
  };
}

const rows = [];
for (const [name, dsl] of Object.entries(CASES)) {
  try {
    const r = render(dsl);
    const svg = typeof r === "string" ? r : (r.svg ?? "");
    rows.push({ case: name, ...metrics(svg) });
  } catch (e) {
    rows.push({ case: name, error: String(e.message).slice(0, 60) });
  }
}
console.table(rows);
