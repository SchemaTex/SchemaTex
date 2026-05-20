import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const examples = [
  {
    name: "Q3 Product Launch — network (default)",
    description:
      "The canonical seven-task launch. Two parallel chains off market research re-converge at the frontend build; the engine computes every ES/EF/LS/LF and highlights the critical path A → C → D → E → G in red. Validates the six-field box, forward/backward pass, and barycenter ordering.",
    dsl: `pert
title: "Q3 Product Launch"
unit: days

task A "Market research"      duration: 5
task B "Design mockups"       duration: 8  after: A
task C "Backend API"          duration: 15 after: A
task D "Frontend build"       duration: 10 after: B, C
task E "QA / testing"         duration: 5  after: D
task F "Marketing collateral" duration: 7  after: B
task G "Launch event"         duration: 2  after: E, F`,
  },
  {
    name: "Swimlanes — grouped by responsible team",
    description:
      "Add `lane: \"…\"` to any task and the network re-groups into horizontal swimlanes (by team, phase, or owner). Still pure AON — the schedule is computed exactly as before — but tasks are banded by responsibility, the way Visual Paradigm / PMO templates present a plan.",
    dsl: `pert
title: "Online Shop Project"
unit: days

task T1 "Support Account Deletion"            duration: 3  lane: "Customer Account"
task T2 "Design a New Theme"                   duration: 8  lane: "Shopping Site"
task T3 "Apply New Theme to the Site"          duration: 15 after: T2 lane: "Shopping Site"
task T4 "Improve Searching"                    duration: 7  after: T3 lane: "Shopping Site"
task T5 "Enhance Shopping Cart Functionality"  duration: 8  after: T2 lane: "Shopping Cart"
task T6 "Enhance Shopping Cart Checkout"       duration: 6  after: T5 lane: "Shopping Cart"
task T7 "Ready Testing Environment"            duration: 2  after: T1, T4, T6 lane: "Testing"
task T8 "Test Online Shop"                     duration: 8  after: T7 lane: "Testing"`,
  },
  {
    name: "Diamond — slack & critical path",
    description:
      "The smallest non-trivial network: two parallel paths of different length. The upper path (B, 6) is critical; the lower path (C, 3) carries 3 days of slack. Project duration 12. Matches the worked example in §12 of the standard.",
    dsl: `pert
title: "Diamond"
unit: days

task A "Start"  duration: 2
task B "Upper"  duration: 6 after: A
task C "Lower"  duration: 3 after: A
task D "Finish" duration: 4 after: B, C`,
  },
  {
    name: "Kerzner nine-task textbook network",
    description:
      "A nine-task network from Kerzner's Project Management. Project duration 17 weeks; critical path A → B → D → F → H → I. C, E, and G each carry 3 weeks of slack. The kind of problem PMP candidates solve by hand — here the schedule is computed.",
    dsl: `pert
title: "Kerzner ch.13 network"
unit: weeks

task A "Requirements"  duration: 2
task B "Design"        duration: 3 after: A
task C "Prototype"     duration: 4 after: A
task D "Development"   duration: 6 after: B
task E "Integration"   duration: 2 after: B, C
task F "System test"   duration: 3 after: D, E
task G "Documentation" duration: 5 after: C
task H "UAT"           duration: 1 after: F, G
task I "Release"       duration: 2 after: H`,
  },
  {
    name: "Three-point estimation (PERT) + variance",
    description:
      "Durations written as optimistic/most-likely/pessimistic (O/M/P). The engine computes te = (O+4M+P)/6 for each box, the per-activity σ shown under the name, and the project-level σ in the footer. critical-tolerance: 0.01 keeps the fractional te values from displacing the critical path.",
    dsl: `pert
title: "Three-point project"
unit: days
critical-tolerance: 0.01

task A "Spec"   duration: 2/3/5
task B "Build"  duration: 5/8/14 after: A
task C "Test"   duration: 3/4/6  after: B
task D "Deploy" duration: 1/2/3  after: C`,
  },
  {
    name: "Migration plan — timescaled, FS/SS/FF + lag, milestone",
    description:
      "A realistic mid-size project in the time-scaled layout: x-position ∝ Early Start, width ∝ duration, with a unit time axis along the bottom. Exercises start-to-start and finish-to-finish dependencies, lag/lead, a milestone diamond (Cutover), and lane packing.",
    dsl: `pert
title: "Data-centre migration"
unit: days
layout: timescaled

task A "Inventory systems"  duration: 5
task B "Stakeholder review" duration: 6  after: A SS+1
task C "Vendor selection"   duration: 8  after: A, B
task D "Architecture"       duration: 10 after: C
task E "Procurement"        duration: 12 after: C+2
task F "Code refactor"      duration: 15 after: D
task G "Pilot env"          duration: 5  after: E, F FF
task H "Pilot run"          duration: 7  after: G
task I "Cutover"            milestone    after: H
task J "Hypercare"          duration: 5  after: I`,
  },
  {
    name: "AOA — activity-on-arrow (legacy notation)",
    description:
      "`layout: aoa` renders the classic textbook form: numbered event circles, activities as labelled arrows, and dotted dummy activities auto-inserted wherever an activity has multiple predecessors (here F←C,E and J←H,I). Same computed critical path, drawn in red. AOA expresses finish-to-start only — SS/FF/SF and lag are flattened with a warning.",
    dsl: `pert
title: "Software project (AOA)"
layout: aoa
unit: days

task A "create schedule" duration: 10
task B "buy hardware"    duration: 5
task C "programming"     duration: 20 after: A
task D "installation"    duration: 5  after: B
task E "conversion"      duration: 15 after: D
task F "test code"       duration: 20 after: C, E
task G "write manual"    duration: 15 after: E
task H "test system"     duration: 10 after: F
task I "training"        duration: 5  after: G
task J "user test"       duration: 10 after: H, I`,
  },
  {
    name: "Release plan — milestones + visible sentinels",
    description:
      "show-sentinels: true draws the synthetic Start and Finish nodes that the scheduler uses as a single source and sink. Two milestone diamonds (Code Freeze, Go-Live) punctuate the chain. Useful for teaching how the forward/backward pass anchors the network.",
    dsl: `pert
title: "Software release"
unit: days
show-sentinels: true

task A "Feature dev"   duration: 12
task B "Code freeze"   milestone after: A
task C "Regression QA" duration: 5 after: B
task D "Bug fixes"     duration: 4 after: C
task E "Release notes" duration: 2 after: B
task F "Go-Live"       milestone after: D, E
task G "Monitoring"    duration: 3 after: F`,
  },
];

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const sections = examples
  .map((ex, i) => {
    let svg;
    let err = null;
    try {
      svg = render(ex.dsl);
    } catch (e) {
      err = e.message;
    }
    return `
<section class="card" id="ex-${i}">
  <header>
    <span class="num">${String(i + 1).padStart(2, "0")}</span>
    <h2>${escapeHtml(ex.name)}</h2>
  </header>
  <p class="desc">${escapeHtml(ex.description)}</p>
  <div class="svg-wrap">
    ${err ? `<div class="err">RENDER ERROR: ${escapeHtml(err)}</div>` : svg}
  </div>
  <details>
    <summary>DSL source</summary>
    <pre><code>${escapeHtml(ex.dsl)}</code></pre>
  </details>
</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Schematex PERT v0.1 — Preview</title>
  <style>
    :root {
      --bg: #fafafa;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --accent: #2563eb;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
      font: 14px/1.55 system-ui, -apple-system, sans-serif; }
    .container { max-width: 1320px; margin: 0 auto; padding: 32px 24px 80px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .lede { color: var(--muted); margin: 0 0 28px; max-width: 860px; }
    .meta { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 40px; padding: 14px 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; }
    .meta b { color: var(--accent); }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 22px 24px; margin: 0 0 24px; }
    .card header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 6px; }
    .card .num { font: 600 12px monospace; color: var(--muted); padding: 2px 8px; background: #f1f5f9; border-radius: 4px; }
    .card h2 { margin: 0; font-size: 18px; }
    .desc { color: var(--muted); margin: 0 0 16px; max-width: 920px; }
    .svg-wrap { background: #fcfcfd; border: 1px solid var(--border); border-radius: 6px; padding: 14px; overflow-x: auto; }
    .svg-wrap svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
    .err { color: #dc2626; font-family: monospace; padding: 12px; }
    details { margin-top: 14px; }
    details summary { cursor: pointer; color: var(--muted); user-select: none; font-size: 12px; }
    details pre { background: #0f172a; color: #e2e8f0; padding: 14px 16px; border-radius: 6px; overflow-x: auto; font-size: 12px; line-height: 1.5; }
    footer { margin-top: 60px; padding-top: 22px; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Schematex PERT / CPM v0.1 — Preview</h1>
    <p class="lede">Activity-on-Node project-scheduling networks (PMI PMBOK 7 + Moder 1983). Unlike every other text-DSL diagram tool, the engine <b>computes the schedule</b> — forward pass, backward pass, total slack, project duration, and the critical path — from your durations and dependencies. The six-field box, the red critical path, the FS/SS/FF/SF dependency types with lag/lead, three-point estimation, milestones, and the time-scaled layout are all driven by that computation. Spec lives in <code>docs/reference/32-PERT-STANDARD.md</code>.</p>
    <div class="meta">
      <span><b>${examples.length}</b> examples</span>
      <span><b>computed</b> ES / EF / LS / LF / slack / critical path</span>
      <span><b>4 dependency types</b> (FS &middot; SS &middot; FF &middot; SF + lag/lead)</span>
      <span><b>2 layouts</b> (network &middot; timescaled)</span>
      <span><b>0</b> runtime deps</span>
    </div>
    ${sections}
    <footer>Generated ${new Date().toISOString()} &middot; Schematex PERT engine v0.1</footer>
  </div>
</body>
</html>`;

const outPath = resolve(__dirname, "index.html");
writeFileSync(outPath, html, "utf-8");
console.log("wrote " + outPath);

for (let i = 0; i < examples.length; i++) {
  const ex = examples[i];
  try {
    const svg = render(ex.dsl);
    const slug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    writeFileSync(resolve(__dirname, slug + ".svg"), svg, "utf-8");
  } catch (e) {
    console.error("ex " + i + ": " + e.message);
  }
}
