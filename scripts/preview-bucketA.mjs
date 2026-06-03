// Bucket A preview — extensions to existing engines (no new diagram type).
// Renders before/after (or new-capability) panels for the four shipped features:
//   phylo → dendrogram · decisiontree → influence · matrix → sipoc/qfd · mindmap → futureswheel
//
//   node scripts/preview-bucketA.mjs && open examples/bucketA-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "examples/bucketA-preview.html");

function safeRender(dsl, type) {
  try {
    return render(dsl, { type });
  } catch (err) {
    return `<pre style="color:#b91c1c">RENDER ERROR: ${String(err && err.message || err)}</pre>`;
  }
}

// Each panel: { feature, engine, blurb, cells: [{label, dsl, type}] }
const panels = [
  {
    feature: "phylo → <code>dendrogram</code> mode",
    engine: "phylo",
    blurb:
      "Hierarchical-clustering tree: internal nodes positioned at their merge height (cophenetic distance), leaves aligned at baseline, rectangular elbow connectors, a height axis, and an optional <code>cut</code> threshold that colors the resulting flat clusters. Reuses the existing height-scaled layout — same Newick input.",
    cells: [
      {
        label: "BEFORE — cladogram (existing mode, same tree)",
        type: "phylo",
        dsl: `phylo "Sample clustering" [mode: cladogram]
  newick: "(((A:1,B:1):2,C:3):2,(D:2,E:2):3);"`,
      },
      {
        label: "AFTER — dendrogram (new)",
        type: "phylo",
        dsl: `phylo "Sample clustering" [mode: dendrogram]
  newick: "(((A:1,B:1):2,C:3):2,(D:2,E:2):3);"
  scale "cluster distance"`,
      },
      {
        label: "AFTER — dendrogram + cut 4 → 2 colored clusters {A,B,C} {D,E}",
        type: "phylo",
        dsl: `phylo "Gene expression clusters" [mode: dendrogram]
  newick: "(((A:1,B:1):2,C:3):2,(D:2,E:2):3);"
  cut 4
  scale "cluster distance"`,
      },
    ],
  },
  {
    feature: "decisiontree → <code>influence</code> mode",
    engine: "decisiontree",
    blurb:
      "Influence diagram (Howard &amp; Matheson) — the compact DAG form of a decision problem. Reuses the decision/chance/value node taxonomy: decision = rectangle, chance = oval, value = hexagon; arcs derive their semantics from their destination (informational arcs into decisions are dashed). Validates acyclicity + presence of a value node.",
    cells: [
      {
        label: "NEW — Oil Wildcatter (header form)",
        type: "decisiontree",
        dsl: `decisiontree:influence "Oil Wildcatter"
  decision Drill "Drill?"
  chance Oil "Oil present"
  chance Seismic "Seismic test"
  value Profit "Net profit" utility=42
  Seismic -> Oil
  Seismic -> Drill
  Oil -> Profit
  Drill -> Profit`,
      },
      {
        label: "NEW — Market Entry (directive form)",
        type: "decisiontree",
        dsl: `decisiontree "Market Entry"
  mode: influence
  decision Enter "Enter market?"
  chance Demand "Market demand"
  chance Competition "Competitor response"
  value V "Profit" utility=120
  Demand -> Enter
  Demand -> V
  Competition -> V
  Enter -> V`,
      },
    ],
  },
  {
    feature: "matrix → <code>sipoc</code> + <code>qfd</code> modes",
    engine: "matrix",
    blurb:
      "Two Six Sigma / quality tools on the matrix grid. SIPOC = the 5-column scoping table. QFD (House of Quality) = WHATs×HOWs relationship grid with a correlation roof and — the differentiator — a computed technical-importance footer where each column = Σ(weight × relationship strength).",
    cells: [
      {
        label: "NEW — SIPOC scoping table",
        type: "matrix",
        dsl: `matrix sipoc "Order fulfilment"
suppliers: "Vendor", "Warehouse"
inputs: "PO", "Stock levels"
process: "Receive order", "Pick", "Pack", "Ship"
outputs: "Shipped package", "Invoice"
customers: "End customer", "Finance"`,
      },
      {
        label: "NEW — QFD House of Quality (computed row = 45 / 39 / 51, verified Σ weight×strength)",
        type: "matrix",
        dsl: `matrix qfd "Coffee maker"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
what: "Energy efficient" weight: 4
how: "Fan RPM" dir: down
how: "Heater watts" dir: up
how: "Insulation" dir: up
rel (0,0): 9
rel (0,2): 3
rel (1,1): 9
rel (2,1): 3
rel (2,2): 9
roof (0,1): --
roof (1,2): +`,
      },
      {
        label: "NEW — QFD normalized (bottom row → 33% / 29% / 38%)",
        type: "matrix",
        dsl: `matrix qfd "Coffee maker (normalized)"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
what: "Energy efficient" weight: 4
how: "Fan RPM" dir: down
how: "Heater watts" dir: up
how: "Insulation" dir: up
rel (0,0): 9
rel (0,2): 3
rel (1,1): 9
rel (2,1): 3
rel (2,2): 9
roof (0,1): --
roof (1,2): +
normalize: true`,
      },
    ],
  },
  {
    feature: "mindmap → <code>futureswheel</code> + <code>driver</code> modes",
    engine: "mindmap",
    blurb:
      "Futures Wheel (Jerome Glenn): a depth-banded radial layout — central event at the origin, 1st-order consequences on the inner ring, 2nd-order on the outer ring, each child kept within its parent's angular sector, color-coded by order. Driver diagram = an alias of the existing left→right tidy tree.",
    cells: [
      {
        label: "BEFORE — same content as a normal radial mindmap",
        type: "mindmap",
        dsl: `%% style: map
# Remote work becomes default
## Less commuting
- Lower carbon emissions
- Cheaper city living
## Distributed teams
- Async communication norms
- Global hiring pools
## Empty offices
- Commercial real estate slump
- Repurposed to housing`,
      },
      {
        label: "AFTER — futures wheel (concentric rings by order)",
        type: "mindmap",
        dsl: `%% style: futureswheel
# Remote work becomes default
## Less commuting
- Lower carbon emissions
- Cheaper city living
## Distributed teams
- Async communication norms
- Global hiring pools
## Empty offices
- Commercial real estate slump
- Repurposed to housing`,
      },
      {
        label: "NEW — driver diagram (aim → drivers → change ideas)",
        type: "mindmap",
        dsl: `%% style: driver
# Reduce 30-day readmissions
## Reliable discharge process
- Teach-back at bedside
- Med reconciliation
## Timely follow-up
- Appointment within 7 days
- Post-discharge phone call`,
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
        <div class="svgwrap">${safeRender(c.dsl, c.type)}</div>
        <details><summary>DSL</summary><pre>${c.dsl.replace(/</g, "&lt;")}</pre></details>
      </figure>`
      )
      .join("");
    return `
    <section>
      <h2>${p.feature}</h2>
      <p class="blurb">${p.blurb}</p>
      <div class="grid">${cells}</div>
    </section>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Schematex — Bucket A preview (engine extensions)</title>
<style>
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { padding: 24px 32px; background: #0f172a; color: #f8fafc; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header p { margin: 0; color: #94a3b8; font-size: 13px; }
  section { padding: 24px 32px; border-bottom: 1px solid #e2e8f0; }
  section h2 { font-size: 17px; margin: 0 0 6px; }
  section h2 code, .blurb code { background: #e0e7ff; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  .blurb { margin: 0 0 18px; color: #475569; max-width: 80ch; font-size: 13.5px; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .cell { margin: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; flex: 1 1 320px; min-width: 300px; }
  figcaption { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 10px; }
  .svgwrap { overflow: auto; }
  .svgwrap svg { max-width: 100%; height: auto; }
  details { margin-top: 10px; }
  summary { font-size: 11px; color: #64748b; cursor: pointer; }
  pre { background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 11px; overflow: auto; }
</style></head>
<body>
  <header>
    <h1>Schematex — Bucket A: extensions to existing engines</h1>
    <p>Four features added as new modes on existing diagram types (no new <code>DiagramType</code>). Generated by scripts/preview-bucketA.mjs</p>
  </header>
  ${sections}
</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log("wrote", OUT);
