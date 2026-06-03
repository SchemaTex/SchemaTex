// Bucket B — COMPLEX stress-test cases for the 8 new engines. Harder inputs
// (more branches, loops, states, connectors) to confirm robustness.
//
//   node scripts/preview-bucketB-complex.mjs && open examples/bucketB-complex-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "examples/bucketB-complex-preview.html");

function safeRender(dsl) {
  try {
    return render(dsl);
  } catch (err) {
    return `<pre style="color:#b91c1c;white-space:pre-wrap">RENDER ERROR: ${String((err && err.message) || err)}</pre>`;
  }
}

const panels = [
  {
    title: "Event tree — 5 functions, multiple pruned outcomes",
    dsl: `eventtree "Offshore platform — gas release"
  initiating REL "Gas release" freq: 2.5e-2
  function DET "Gas detection" p: 0.01
  function ESD "Emergency shutdown" p: 0.02
  function IGN "Ignition prevented" p: 0.3
  function BLW "Blowdown / depressurise" p: 0.05
  function FIRE "Firewater deluge" p: 0.1
  outcome s s s * * -> "Safe — dispersed"
  outcome s s f s s -> "Controlled flare"
  outcome s s f s f -> "Escalating jet fire"
  outcome s s f f * -> "Jet fire — no blowdown"
  outcome s f * * * -> "ESD failure — large release"
  outcome f * * * * -> "Undetected release"`,
  },
  {
    title: "FMEA — multi-item DFMEA with after-action RPN drop",
    dsl: `fmea "EV Battery Pack DFMEA"
  rank: ap
  flag: ap >= High
  item "Cell module" fn "Store energy safely"
    mode "Thermal runaway"
      effect "Pack fire" sev: 10
      cause "Internal short" occ: 3
        controls detection: "Cell IR screening" det: 6
      cause "Overcharge" occ: 2
        controls prevention: "BMS voltage clamp", detection: "Voltage telemetry" det: 3
    mode "Capacity fade"
      effect "Reduced range" sev: 5
      cause "Calendar ageing" occ: 6
        controls detection: "SOH estimator" det: 4
  item "Busbar" fn "Carry current"
    mode "Loose joint"
      effect "Local overheating" sev: 7
      cause "Vibration loosening" occ: 4
        controls detection: "Torque audit" det: 5
  action "Thermal runaway" / "Internal short"
    do: "Add ceramic separator + fuse" owner: "Batt. eng" target: 2026-Q4
    revised sev: 10 occ: 1 det: 4`,
  },
  {
    title: "Causal loop — engagement system with R + B loops and delays",
    dsl: `causalloop "Product engagement dynamics"
"New users" -> "Active users" : +
"Active users" -> "Content created" : +
"Content created" -> "New users" : +
"Active users" -> "Server load" : +
"Server load" -> "Latency" : +
"Latency" -> "Active users" : -
"Active users" -> "Support tickets" : +
"Support tickets" -> "Team capacity" : -
"Team capacity" -> "Feature velocity" : +
"Feature velocity" -> "Active users" : +
loop R1 "Viral content"
loop B1 "Scaling pain"
loop R2 "Build-grow flywheel"`,
  },
  {
    title: "Markov — 4-state ergodic chain, stationary π computed",
    dsl: `markov "Customer lifecycle"
  New -> Active : 0.6
  New -> Churned : 0.1
  New -> New : 0.3
  Active -> Active : 0.7
  Active -> Dormant : 0.2
  Active -> Churned : 0.1
  Dormant -> Active : 0.3
  Dormant -> Dormant : 0.5
  Dormant -> Churned : 0.2
  Churned -> Churned : 0.8
  Churned -> New : 0.2`,
  },
  {
    title: "Git graph — 4 branches, multiple merges, cherry-pick, tags",
    dsl: `gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "d1"
  branch feature-a
  checkout feature-a
  commit id: "a1"
  commit id: "a2"
  checkout develop
  merge feature-a tag: "a-done"
  branch feature-b
  checkout feature-b
  commit id: "b1" type: HIGHLIGHT
  checkout develop
  commit id: "d2"
  merge feature-b
  checkout main
  merge develop tag: "v1.0"
  commit id: "hotfix"
  cherry-pick id: "b1"`,
  },
  {
    title: "EPC — AND-split parallel work then XOR join",
    dsl: `epc "Claim handling"
  event E1 "Claim submitted"
  function F1 "Validate claim"
  and A1
  function F2 "Assess damage"
  function F3 "Check policy"
  and A2
  function F4 "Decide payout"
  xor X1
  event E2 "Claim approved"
  event E3 "Claim rejected"
  E1 -> F1 -> A1
  A1 -> F2
  A1 -> F3
  F2 -> A2
  F3 -> A2
  A2 -> F4 -> X1
  X1 -> E2
  X1 -> E3`,
  },
  {
    title: "IDEF0 — 5-box decomposition with two feedback loops",
    dsl: `idef0 "Operate manufacturing line"
node A0
function A1 "Receive materials"
function A2 "Produce parts"
function A3 "Inspect quality"
function A4 "Package output"
function A5 "Handle rework"
input     A1 "Raw materials"
control   A1 "Production plan"
mechanism A1 "Receiving crew"
A1 -> A2 "Staged stock"
control   A2 "Work instructions"
mechanism A2 "CNC cells"
A2 -> A3 "Made parts"
control   A3 "Quality spec"
A3 -> A4 "Passed parts"
A3 -> A5.input "Failed parts"
A5 -> A2.input "Reworked parts"
mechanism A5 "Rework bench"
A4 -> A1.input "Empty totes"
output    A4 "Finished goods"`,
  },
  {
    title: "Threat model — nested zones, many flows, audit store",
    dsl: `threatmodel "Payments platform — STRIDE"
external: Customer
external: Bank API
process 1.0: API Gateway
process 2.0: Payment Service
process 3.0: Ledger Service
datastore D1: Card Vault
datastore D2: Transaction Audit Log
Customer -> 1.0 : Checkout request
1.0 -> 2.0 : Charge intent
2.0 -> D1 : Tokenise card
2.0 -> 3.0 : Post entry
3.0 -> D2 : Audit write
2.0 -> Bank API : Authorise
Bank API -> 2.0 : Auth result
boundary "Public" { Customer }
boundary "DMZ" { 1.0 }
boundary "Core" { 2.0, 3.0, D1, D2 }
boundary "External" { Bank API }`,
  },
];

const sections = panels
  .map(
    (p) => `
    <section>
      <h2>${p.title}</h2>
      <div class="svgwrap">${safeRender(p.dsl)}</div>
      <details><summary>DSL</summary><pre>${p.dsl.replace(/</g, "&lt;")}</pre></details>
    </section>`
  )
  .join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Schematex — Bucket B COMPLEX cases</title>
<style>
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { padding: 22px 32px; background: #0f172a; color: #f8fafc; }
  header h1 { margin: 0; font-size: 19px; }
  section { padding: 22px 32px; border-bottom: 1px solid #e2e8f0; }
  section h2 { font-size: 16px; margin: 0 0 14px; }
  .svgwrap { overflow: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .svgwrap svg { max-width: 100%; height: auto; }
  details { margin-top: 10px; }
  summary { font-size: 11px; color: #64748b; cursor: pointer; }
  pre { background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 11px; overflow: auto; }
</style></head>
<body>
  <header><h1>Schematex — Bucket B: complex / stress-test cases</h1></header>
  ${sections}
</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log("wrote", OUT);
