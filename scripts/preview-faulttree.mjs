// Build a single static HTML page showing the faulttree engine across a curated
// set of representative trees. Open in a browser; no dev server needed.
//
//   node scripts/preview-faulttree.mjs
//   open examples/faulttree-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "examples/faulttree-preview.html");

const examples = [
  {
    id: "and",
    title: "1 — AND gate (one cut set, no SPOF)",
    note: "The minimal AND tree: both redundant pumps must fail. One order-2 minimal cut set {PA, PB} boxed in red; no single point of failure; P(top)=P(PA)·P(PB) (rare-event).",
    dsl: `faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`,
  },
  {
    id: "or-spof",
    title: "2 — OR gate (three single points of failure)",
    note: "Each input alone stops the engine → three order-1 minimal cut sets, each a single point of failure (boxed in the strongest red, tagged data-spof). P(top) ≈ Σ p (rare-event).",
    dsl: `faulttree "Engine stops"
  analysis: cutsets, probability
  top T "Engine stops" = OR(FUEL, IGN, SEIZE)
  basic FUEL  "Fuel starvation"    p: 0.002
  basic IGN   "Ignition failure"   p: 0.003
  basic SEIZE "Mechanical seizure" p: 0.0005`,
  },
  {
    id: "shared",
    title: "3 — Repeated / shared event (absorption)",
    note: "MSF feeds BOTH G1 and G2 — drawn twice with the shared-event mark. MOCUS applies absorption: {MSF,ESF} and {MSF,RCF} are dropped as supersets of {MSF}. Minimal cut sets: {MSF}, {CDM} — both SPOFs. This is where naive shape stencils get the math wrong.",
    dsl: `faulttree "Product not removed"
  analysis: cutsets, probability
  top T  "Failure to remove product" = OR(G1, G2)
  gate G1 "Arm jams or collides"      = AND(MSF, G3)
  gate G2 "Wrong slot commanded"      = OR(CDM, MSF)
  gate G3 "Loss of position feedback" = OR(ESF, RCF)
  basic MSF "Manipulator system failure" p: 0.0035
  basic CDM "Controller command error"   p: 0.0009
  basic ESF "Encoder sensor failure"     p: 0.0021
  basic RCF "Resolver cable fault"       p: 0.0012`,
  },
  {
    id: "full",
    title: "4 — Full vocabulary (voting · inhibit · house · undeveloped)",
    note: "INHIBIT renders as a hexagon with the HEATER conditioning ellipse to its side; HEATER house=1 is absorbed, so OVP reduces to {PUMP}. VOTING 2/2 = PRV_A ∧ PRV_B. Minimal cut set {PUMP, PRV_A, PRV_B} (order 3). EXT (undeveloped diamond) is declared but unconnected — noted in <desc>.",
    dsl: `faulttree "Vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  top TOP "Pressure vessel ruptures" = AND(OVP, RELIEF)
  gate OVP    "Sustained over-pressure" = INHIBIT(PUMP) if HEATER
  gate RELIEF "Both reliefs fail"        = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  "Pump runaway"   p: 0.004
  basic PRV_A "Relief A stuck" p: 0.02
  basic PRV_B "Relief B stuck" p: 0.02
  house HEATER "Heater energised" state: 1
  undeveloped EXT "External fire (not modelled)"`,
  },
  {
    id: "exact",
    title: "5 — Exact probability with a shared event",
    note: "L1 (shared logic solver) is in both channels → cut sets {S1,L1} and {S2,L1}. prob: exact uses inclusion-exclusion: 0.005 − P(S1)P(S2)P(L1) = 0.004875 (rare-event would over-count L1 and report 0.005).",
    dsl: `faulttree "Safety function fails on demand"
  analysis: cutsets, probability
  prob: exact
  top T "Safety function fails" = OR(C1, C2)
  gate C1 "Channel 1 path" = AND(S1, L1)
  gate C2 "Channel 2 path" = AND(S2, L1)
  basic S1 "Sensor 1 fails" p: 0.05
  basic S2 "Sensor 2 fails" p: 0.05
  basic L1 "Shared logic solver fails" p: 0.05`,
  },
  {
    id: "voting-3",
    title: "6 — k-out-of-n voting (2-of-3 redundancy)",
    note: "A 2-out-of-3 voted sensor group: the gate expands to OR of all C(3,2)=3 AND-pairs → cut sets {SA,SB}, {SA,SC}, {SB,SC} (each order 2). The classic redundancy-voting pattern.",
    dsl: `faulttree "Trip signal lost"
  analysis: cutsets, probability
  top T "2oo3 sensor group fails" = VOTING(2/3; SA, SB, SC)
  basic SA "Sensor A fails" p: 0.01
  basic SB "Sensor B fails" p: 0.01
  basic SC "Sensor C fails" p: 0.01`,
  },
  {
    id: "depth",
    title: "7 — Deeper mixed tree (AND/OR over three levels)",
    note: "A realistic multi-level tree mixing AND and OR gates, exercising the tidy top-down layout and edge routing. Cut sets and P(top) computed across the whole tree.",
    dsl: `faulttree "Loss of cooling"
  analysis: cutsets, probability
  top T "Loss of reactor cooling" = OR(PUMPS, POWER)
  gate PUMPS "Both pump trains fail" = AND(TRAIN_A, TRAIN_B)
  gate TRAIN_A "Train A fails" = OR(PA, VA)
  gate TRAIN_B "Train B fails" = OR(PB, VB)
  gate POWER "Loss of all power" = AND(GRID, DG)
  basic PA "Pump A fails"   p: 0.02
  basic VA "Valve A stuck"  p: 0.01
  basic PB "Pump B fails"   p: 0.02
  basic VB "Valve B stuck"  p: 0.01
  basic GRID "Grid power lost"    p: 0.05
  basic DG   "Diesel gen fails"   p: 0.03`,
  },
  {
    id: "ref-overheat",
    title: "8 — Reference repro: \"Water overheating\" (Wikipedia FTA)",
    note: "Reproduces the classic textbook tree (your 2nd reference image): an OR top over an AND sub-fault (F) + a direct booster failure (E) + an OR no-voltage branch (G), with probabilities on every basic event. Confirms AND/OR mix + per-event p + computed cut sets.",
    dsl: `faulttree "Water overheating"
  analysis: cutsets, probability
  top T "Water overheating" = OR(F, E, G)
  gate F "Circuit failure and no warning lamp" = AND(A, B)
  gate G "No voltage at input" = OR(C, D)
  basic E "Booster failure"      p: 0.02
  basic A "Chip failure"         p: 0.05
  basic B "Warning lamp burned"  p: 0.03
  basic C "No burn in network"   p: 0.12
  basic D "Fuse blown"           p: 0.23`,
  },
  {
    id: "ref-accident",
    title: "9 — Reference repro: \"Accident / Incident\" (events + undeveloped)",
    note: "Reproduces your 4th reference image: an AND top over two «Primary Cause» branches — one OR (with a basic event + an undeveloped diamond), one AND (two basic events). No probabilities → P(top) reported as symbolic (n/a). Confirms basic + undeveloped + nested AND/OR.",
    dsl: `faulttree "Accident / Incident"
  analysis: cutsets
  top T "Accident / Incident" = AND(PC1, PC2)
  gate PC1 "Primary Cause 1" = OR(E1, E2)
  gate PC2 "Primary Cause 2" = AND(E3, E4)
  basic E1 "Event A"
  undeveloped E2 "Event B (undeveloped)"
  basic E3 "Event C"
  basic E4 "Event D"`,
  },
  {
    id: "ref-address",
    title: "10 — Reference repro: \"Bad customer address\" (multi-input, undeveloped)",
    note: "Reproduces your 3rd reference image: a 3-input AND top, each branch an OR/AND over data-source / validation / entry causes, mixing basic events and undeveloped diamonds. Confirms n-ary gates + undeveloped leaves + a wider tree's spacing.",
    dsl: `faulttree "Bad customer address"
  analysis: cutsets, probability
  top T "Bad address for our customer" = AND(SRC, STD, ENTRY)
  gate SRC   "Unreliable data source" = OR(SM, MH)
  gate STD   "No address standard"    = AND(NOVAL, MULTI)
  gate ENTRY "Data entry error"       = OR(NOFIELD, UNKNOWN)
  undeveloped SM "Social media"          p: 0.10
  undeveloped MH "Mail house"            p: 0.05
  basic NOVAL    "No validation rule"    p: 0.08
  basic MULTI    "Multiple source records" p: 0.04
  undeveloped NOFIELD "No field validation" p: 0.06
  basic UNKNOWN  "Unknown cause"         p: 0.03`,
  },
  {
    id: "mono",
    title: "11 — Monochrome (NUREG-0492 textbook look)",
    note: "The same tree as #1 under theme: monochrome — pure black/white, faithful to the NUREG-0492 figures. Cut sets fall back from red to shape/weight; the dome (AND) vs shield (OR) shapes carry the gate semantics.",
    theme: "monochrome",
    dsl: `faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`,
  },
];

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const renderedCards = examples.map((ex, idx) => {
  let svg = "";
  let error = "";
  try {
    svg = render(ex.dsl, ex.theme ? { theme: ex.theme } : undefined);
    // Inline SVG <style> is document-global — namespace each card's classes so
    // a monochrome card can't override a coloured one on the same page.
    svg = svg.replace(/sx-ft-/g, `sx-ft-c${idx}-`);
  } catch (e) {
    error = String(e?.message ?? e);
  }
  return { ex, svg, error };
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>faulttree — visual review</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f5f5f7; color: #0f172a; font-family: -apple-system, system-ui, "Segoe UI", sans-serif; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 32px 24px 64px; }
  header { margin-bottom: 32px; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
  header p { color: #64748b; margin: 0; font-size: 14px; }
  header a { color: #2563eb; text-decoration: none; }
  .toc { margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; }
  .toc a { color: #64748b; text-decoration: none; padding: 4px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
  .toc a:hover { color: #2563eb; border-color: #93c5fd; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
  .card h2 { font-size: 18px; margin: 0 0 6px; letter-spacing: -0.005em; }
  .card .note { color: #64748b; font-size: 13px; line-height: 1.55; margin: 0 0 18px; max-width: 940px; }
  details { margin-top: 14px; }
  details summary { cursor: pointer; color: #64748b; font-size: 12px; font-family: ui-monospace, "SF Mono", Menlo, monospace; user-select: none; padding: 4px 0; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 12px; line-height: 1.5; font-family: ui-monospace, "SF Mono", Menlo, monospace; overflow-x: auto; margin: 8px 0 0; color: #0f172a; }
  .svg-wrap { background: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; padding: 24px; overflow: auto; }
  .svg-wrap svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .err { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; font-family: ui-monospace, monospace; font-size: 12px; }
  footer { color: #94a3b8; font-size: 12px; text-align: center; padding-top: 24px; }
  footer code { background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>faulttree — visual review</h1>
  <p>Schematex Fault Tree Analysis engine (NUREG-0492 / IEC 61025). The engine <strong>computes the minimal cut sets and P(top)</strong> — the red boxes are computed, not drawn by hand.</p>
  <ul class="toc">
${examples.map((e) => `    <li><a href="#${e.id}">${escapeHtml(e.title.split("—")[0].trim())}</a></li>`).join("\n")}
  </ul>
</header>

${renderedCards.map(({ ex, svg, error }) => `<section class="card" id="${ex.id}">
  <h2>${escapeHtml(ex.title)}</h2>
  <p class="note">${escapeHtml(ex.note)}</p>
  <div class="svg-wrap">${error ? `<div class="err">parse error: ${escapeHtml(error)}</div>` : svg}</div>
  <details>
    <summary>DSL source</summary>
    <pre>${escapeHtml(ex.dsl)}</pre>
  </details>
</section>`).join("\n\n")}

<footer>
  generated by <code>scripts/preview-faulttree.mjs</code> · ${new Date().toISOString().slice(0, 19).replace("T", " ")} · ${examples.length} examples
</footer>
</div>
</body>
</html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT} (${examples.length} examples, ${Math.round(html.length / 1024)}KB)`);
