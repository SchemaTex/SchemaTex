// Bucket B preview — 8 NEW diagram engines (event tree, FMEA, causal loop,
// Markov, git graph, EPC, IDEF0, threat model). Renders each via the public
// render() (auto-detect) into one static HTML page.
//
//   node scripts/preview-bucketB.mjs && open examples/bucketB-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "examples/bucketB-preview.html");

function safeRender(dsl) {
  try {
    return render(dsl);
  } catch (err) {
    return `<pre style="color:#b91c1c">RENDER ERROR: ${String((err && err.message) || err)}</pre>`;
  }
}

const panels = [
  {
    title: "Event Tree Analysis",
    std: "IEC 62502 / NUREG",
    blurb:
      "Initiating event → success(up)/failure(down) branches at each safety function → outcomes. The engine computes each path frequency = initiating freq × Π branch probabilities; pruned paths run flat to their leaf (not a balanced 2ⁿ tree).",
    cells: [
      {
        label: "Reactor LOCA — computed path frequencies",
        dsl: `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects" p: 0.001
  function B "Containment spray" p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`,
      },
    ],
  },
  {
    title: "FMEA",
    std: "AIAG-VDA / IEC 60812",
    blurb:
      "Failure-mode worksheet. The engine computes RPN = S×O×D and the AIAG-VDA Action Priority, ranks the sheet, and colour-fills the RPN/AP cells by risk. Schematex's first table-shaped diagram.",
    cells: [
      {
        label: "Injection-molding PFMEA (RPN-ranked, >100 flagged red)",
        dsl: `fmea "Injection-Molding PFMEA"
  type: process
  rank: rpn
  flag: rpn > 100
  item "Mold fill" fn "Fill cavity completely"
    mode "Short shot"
      effect "Incomplete part" sev: 7
      cause "Low injection pressure" occ: 6
        controls detection: "Visual check" det: 5
    mode "Flash"
      effect "Dimensional defect" sev: 5
      cause "Excess clamp wear" occ: 4
        controls detection: "Gauge inspection" det: 4`,
      },
    ],
  },
  {
    title: "Causal Loop Diagram",
    std: "Sterman system dynamics",
    blurb:
      "Signed causal links; the engine detects feedback loops and labels each R (reinforcing) / B (balancing) by counting negative links. +/− sit at the arrowheads; R/B glyph at each loop centre.",
    cells: [
      {
        label: "Adoption model — R (word of mouth) + B (saturation)",
        dsl: `causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +
"Adoption rate" -> "Potential adopters" : -
"Potential adopters" -> "Adoption rate" : +
loop R1 "Word of mouth"
loop B1 "Market saturation"`,
      },
    ],
  },
  {
    title: "Markov chain",
    std: "Norris / Kemeny-Snell",
    blurb:
      "Probability-labelled state transitions. The engine computes the stationary distribution and classifies states (recurrent/transient/absorbing); absorbing states get a double ring; bidirectional arcs bow apart.",
    cells: [
      {
        label: "Weather (ergodic) — stationary π computed",
        dsl: `markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`,
      },
      {
        label: "Gambler's ruin (absorbing) — double-ring absorbing states",
        dsl: `markov "Gambler's ruin"
  analysis: classify, absorbing
  state Broke absorbing
  state One
  state Two
  state Rich absorbing
  Broke -> Broke : 1
  One -> Broke : 0.5
  One -> Two   : 0.5
  Two -> One   : 0.5
  Two -> Rich  : 0.5
  Rich -> Rich : 1`,
      },
    ],
  },
  {
    title: "Git commit graph",
    std: "Mermaid gitGraph parity",
    blurb:
      "Per-branch swimlanes, chronological commits, branch/merge routing. Solid commit dots, hollow merge commits, open-square HIGHLIGHT, branch pills + tags. Mermaid gitGraph-compatible syntax.",
    cells: [
      {
        label: "main / develop / feature with merge, tag, HIGHLIGHT, cherry-pick",
        dsl: `gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "d1"
  commit tag: "v0.1"
  checkout main
  merge develop tag: "v1.0"
  branch feature
  commit id: "f1" type: HIGHLIGHT
  checkout main
  cherry-pick id: "f1"
  merge feature`,
      },
    ],
  },
  {
    title: "Event-driven Process Chain (EPC)",
    std: "ARIS",
    blurb:
      "Alternating events (red/salmon hexagons) and functions (green rounded rects) joined by AND/OR/XOR connector circles. The engine validates the alternation rule (an event cannot be an XOR-split source).",
    cells: [
      {
        label: "Order fulfilment — XOR split into two paths",
        dsl: `epc "Order fulfilment"
  event E1 "Order received"
  function F1 "Check credit"
  xor X1
  event E2 "Credit OK"
  event E3 "Credit rejected"
  function F2 "Ship goods"
  function F3 "Notify customer"
  event E4 "Order shipped"
  event E5 "Order cancelled"
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3
  E2 -> F2 -> E4
  E3 -> F3 -> E5`,
      },
    ],
  },
  {
    title: "IDEF0 function model",
    std: "FIPS PUB 183",
    blurb:
      "Function boxes with positional ICOM arrows: Input enters left, Control enters top, Output exits right, Mechanism enters bottom. Diagonal box staircase, node numbers in lower-right; the engine enforces ICOM placement.",
    cells: [
      {
        label: "Maintain reparable spares — all four ICOM types + feedback",
        dsl: `idef0 "Maintain Reparable Spares"
node A0
purpose "Model the reparable-spares maintenance cycle"
viewpoint "Maintenance manager"
function A1 "Remove and replace"
function A2 "Schedule into shop"
function A3 "Inspect or repair"
function A4 "Monitor and route"
input     A1 "Failed asset"
control   A1 "Maintenance policy"
mechanism A1 "Field crew"
A1 -> A2 "Removed unit"
A2 -> A3 "Work order"
control   A3 "Repair standard"
mechanism A3 "Shop technicians"
A3 -> A4 "Repaired unit"
A4 -> A1.input "Spare"
output    A4 "Serviceable spare"`,
      },
    ],
  },
  {
    title: "Threat model (DFD + STRIDE)",
    std: "Shostack STRIDE",
    blurb:
      "Data-flow diagram (external/process/store) with trust boundaries. The engine annotates each element with its applicable STRIDE threats and flags every data flow that crosses a trust boundary (red).",
    cells: [
      {
        label: "Web app — STRIDE badges + boundary-crossing flows",
        dsl: `threatmodel "Web App — STRIDE"
external: User
process 1.1: Web Server
process 1.2: Auth Service
datastore D1: User DB
datastore D2: Audit Log
User -> 1.1 : HTTPS Request
1.1 -> 1.2 : Credentials
1.2 -> D1 : Lookup
1.2 -> D2 : Auth Event
boundary "Internet" { User }
boundary "DMZ" { 1.1, 1.2 }
boundary "Internal" { D1, D2 }`,
      },
    ],
  },
];

const sections = panels
  .map((p) => {
    const cells = p.cells
      .map(
        (c) => `
      <figure class="cell">
        <figcaption>${c.label}</figcaption>
        <div class="svgwrap">${safeRender(c.dsl)}</div>
        <details><summary>DSL</summary><pre>${c.dsl.replace(/</g, "&lt;")}</pre></details>
      </figure>`
      )
      .join("");
    return `
    <section>
      <h2>${p.title} <span class="std">${p.std}</span></h2>
      <p class="blurb">${p.blurb}</p>
      <div class="grid">${cells}</div>
    </section>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Schematex — Bucket B preview (8 new diagram engines)</title>
<style>
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { padding: 24px 32px; background: #0f172a; color: #f8fafc; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header p { margin: 0; color: #94a3b8; font-size: 13px; }
  section { padding: 24px 32px; border-bottom: 1px solid #e2e8f0; }
  section h2 { font-size: 17px; margin: 0 0 6px; }
  .std { font-size: 11px; font-weight: 500; color: #64748b; background: #eef2ff; padding: 2px 8px; border-radius: 999px; vertical-align: middle; margin-left: 6px; }
  .blurb { margin: 0 0 18px; color: #475569; max-width: 90ch; font-size: 13.5px; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .cell { margin: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; flex: 1 1 420px; min-width: 360px; }
  figcaption { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 10px; }
  .svgwrap { overflow: auto; }
  .svgwrap svg { max-width: 100%; height: auto; }
  details { margin-top: 10px; }
  summary { font-size: 11px; color: #64748b; cursor: pointer; }
  pre { background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 11px; overflow: auto; }
</style></head>
<body>
  <header>
    <h1>Schematex — Bucket B: 8 new diagram engines</h1>
    <p>Event tree · FMEA · causal loop · Markov · git graph · EPC · IDEF0 · threat model. Generated by scripts/preview-bucketB.mjs</p>
  </header>
  ${sections}
</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log("wrote", OUT);
