// Style-audit fixes preview — before/after comparison for the 2026-06-09 style audit.
//
// Two-step usage (the "before" snapshots must be rendered from the pre-fix build):
//   git stash / pre-fix checkout → npm run build
//   node scripts/preview-style-audit.mjs --before      # snapshots SVGs to preview/style-audit-before/
//   …apply fixes… → npm run build
//   node scripts/preview-style-audit.mjs               # writes preview/style-audit-fixes.html
//
// The HTML inlines both panels statically so it can be committed and viewed without a server.

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BEFORE_DIR = join(ROOT, "preview/style-audit-before");
const OUT = join(ROOT, "preview/style-audit-fixes.html");

const cases = [
  {
    key: "sociogram-groups",
    tier: "P0",
    title: "Sociogram — group colors were overridden by the base CSS rule",
    meta: "<strong>Before:</strong> the <code>.schematex-sociogram-node</code> class rule set <code>fill</code>, which beats per-node <code>fill=\"…\"</code> presentation attributes by CSS specificity — every node rendered accent-blue and contradicted the legend. <strong>After:</strong> per-node colors win; girls are red as declared.",
    type: "sociogram",
    dsl: `sociogram "Playground Dynamics"
  config: layout = force-directed
  config: coloring = group

  group boys [label: "Boys", color: "#42A5F5"]
    tom
    jack
    mike
    leo

  group girls [label: "Girls", color: "#EF5350"]
    anna
    beth
    chloe
    diana

  tom <-> jack
  tom -> mike
  jack -> leo
  mike -x> leo [label: "conflict"]
  anna <-> beth
  anna <-> chloe
  beth <-> chloe
  anna -> diana
  diana -.- tom
  leo -.- anna`,
  },
  {
    key: "timing-title",
    tier: "P0",
    title: "Timing — title collided with the first waveform row",
    meta: "<strong>Before:</strong> the title rendered inside the same y-band as the CLK trace. <strong>After:</strong> a title band is reserved above the waveforms.",
    type: "timing",
    dsl: `timing "SPI Transaction" [hscale: 2]

CLK:  ppppppppp
CS:   10000001
MOSI: x=======x  data: ["0xAB", "0xCD", "0xEF", "0x01", "0x02", "0x03", "0x04", "0x05"]
MISO: xzzzz===x  data: ["", "", "", "", "0xFF", "0x12", "0x34", "0x56"]`,
  },
  {
    key: "network-labels",
    tier: "P0",
    title: "Network — labels struck through by links, invisible PoE badge",
    meta: "<strong>Before:</strong> link lines crossed straight through device labels (\"Core SW\", \"PoE Switch A\"), link labels sat on top of devices, and the PoE badge used a near-white tint. <strong>After:</strong> all labels carry a paint-order halo, link labels are offset off the line, and the badge uses a readable color.",
    type: "network",
    dsl: `network "Acme HQ — CCTV"
  layout: tiered
  internet net "Internet"
  firewall fw1 "Perimeter FW" tier: edge
  l3switch core1 "Core SW" tier: core
  poeswitch poe1 "PoE Switch A" tier: access
  poeswitch poe2 "PoE Switch B" tier: access
  nvr nvr1 "Video Recorder"
  monitor wall1 "Guard Station"
  subnet cams "192.168.20.0/24" {
    camera cam1 "Lobby Dome" type: dome ip: 192.168.20.11
    camera cam2 "Gate PTZ" type: ptz ip: 192.168.20.12
    camera cam3 "Dock Bullet" type: bullet ip: 192.168.20.13
    poe1
    poe2
  }
  net -- fw1 : wan "ISP 1Gbps"
  fw1 -- core1 : fiber 10G
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- poe2 : trunk vlan: 20 1G
  core1 -- nvr1 : 1G
  core1 -- wall1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
  poe2 -- cam3 : poe`,
  },
  {
    key: "matrix-qfd-roof",
    tier: "P0 + P2",
    title: "Matrix / QFD — detached correlation roof + theme migration",
    meta: "<strong>Before:</strong> the correlation roof floated far above the rotated column headers with a dead vertical band between, and all colors were hardcoded. <strong>After:</strong> the roof sits directly on the header zone and the palette is theme-driven.",
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
    key: "ecomap-overflow",
    tier: "P0",
    title: "Ecomap — center label overflow, edge labels on nodes, legend mismatch",
    meta: "<strong>Before:</strong> \"Nguyen Family\" overflowed the center circle, \"twice weekly\" sat on the IRC Office node, and legend chips were saturated while nodes are pale tints. <strong>After:</strong> the center circle sizes to its label, edge labels get halos and keep off nodes, legend chips match node rendering.",
    type: "ecomap",
    dsl: `ecomap "Nguyen Family Resettlement"
  center: family [label: "Nguyen Family"]
  resettlement [label: "IRC Office", category: government]
  school [label: "Lincoln Elementary", category: education]
  esl [label: "Adult ESL Class", category: education]
  clinic [label: "Community Clinic", category: health]
  caseworker [label: "Ms. Patel", category: mental-health]
  temple [label: "Vietnamese Temple", category: cultural]
  neighbors [label: "Sponsor Family", category: community]
  employer [label: "Warehouse Job", category: work]
  cousins [label: "Cousins (CA)", category: family]
  family === resettlement [label: "active case"]
  family === school
  family --- esl [label: "twice weekly"]
  clinic --> family [label: "vaccinations"]
  caseworker <-> family [label: "weekly"]
  family === temple [label: "anchor"]
  neighbors === family [label: "housing host"]
  family --- employer [label: "new, part-time"]
  cousins == family [label: "phone support"]`,
  },
  {
    key: "title-faulttree",
    tier: "P1",
    title: "Title unification — fault tree (was 24px left-aligned)",
    meta: "<strong>Before:</strong> faulttree titled at ~24px left; flowchart at 14px center; bowtie/erd/epc at ~13px left. <strong>After:</strong> one house style — 16px / 700 / centered — via the shared TITLE token.",
    type: "faulttree",
    dsl: `faulttree "Vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  top TOP "Pressure vessel ruptures" = AND(OVP, RELIEF)
  gate OVP    "Sustained over-pressure" = INHIBIT(PUMP) if HEATER
  gate RELIEF "Both reliefs fail"        = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  "Pump runaway"   p: 0.004
  basic PRV_A "Relief A stuck" p: 0.02
  basic PRV_B "Relief B stuck" p: 0.02
  house HEATER "Heater energised" state: 1`,
  },
  {
    key: "title-epc",
    tier: "P1",
    title: "Title unification — EPC (was ~17px left-aligned)",
    meta: "Same DSL, title moves to the shared 16px / 700 / centered house style.",
    type: "epc",
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
  {
    key: "title-bowtie",
    tier: "P1",
    title: "Title unification — bowtie (was ~13px left-aligned)",
    meta: "Same DSL, title moves to the shared 16px / 700 / centered house style.",
    type: "bowtie",
    dsl: `bowtie "Hot work — fire bowtie"
hazard "Hot work near flammable materials"
topevent "Ignition of flammable atmosphere"
threat "Sparks / hot slag"
  prevent "Hot-work permit"
  prevent "Fire watch"
threat "Static discharge"
  prevent "Bonding + grounding"
  prevent "Antistatic PPE"
consequence "Flash fire"
  mitigate "Fixed fire suppression"
consequence "Asset loss"
  mitigate "Fire-rated separation"
  mitigate "Business-continuity plan"`,
  },
  {
    key: "bpmn-theme",
    tier: "P2",
    title: "BPMN — from hardcoded all-grey to a designed, themed palette",
    meta: "<strong>Before:</strong> all-grey hardcoded colors, no theme support, flat next to flowchart/prisma. <strong>After:</strong> BpmnTokens in core theme — events / gateways / tasks / pools get a designed colour treatment in <code>default</code>, with monochrome + dark presets.",
    type: "bpmn",
    dsl: `bpmn
direction: LR
title: "Simple service flow"

pool "API" {
  lane "Worker" {
    A: start "Request"
    B: task service "Validate"
    C: task service "Persist"
    G: gateway and "Fan-out"
    D: task service "Notify"
    E: task service "Audit log"
    H: gateway and "Join"
    F: end "Done"
  }
}

flows
A --> B
B --> C
C --> G
G --> D
G --> E
D --> H
E --> H
H --> F`,
  },
  {
    key: "state-theme",
    tier: "P2",
    title: "State — themed (was hardcoded #1a1a1a / #2a2a2a / sticky-note yellow)",
    meta: "<strong>Before:</strong> two different hardcoded body blacks, no theme support. <strong>After:</strong> StateTokens with default / monochrome / dark presets.",
    type: "state",
    dsl: `state "Traffic Light" [direction: LR]

initial i
final f

i -> Red
Red -> Green : timer
Green -> Yellow : timer
Yellow -> Red : timer
Red -> f : power_off`,
  },
  {
    key: "blockdiagram-theme",
    tier: "P2",
    title: "Block diagram — themed (was hardcoded Material-Design role fills)",
    meta: "<strong>Before:</strong> Material 100-tint role fills hardcoded in the renderer, no theme support. <strong>After:</strong> BlockTokens aligned to the house palette with monochrome + dark presets.",
    type: "blockdiagram",
    dsl: `blockdiagram "PID Closed-Loop Control System"

C = block("C(s)") [role: controller]
G = block("G(s)") [role: plant]
H = block("H(s)") [role: sensor]

r = signal("r(t)")
e = signal("e(t)")
u = signal("u(t)")
y = signal("y(t)")

sum1 = sum(["+", "-"])

r -> sum1
sum1 -> C [label: "e(t)"]
C -> G [label: "u(t)"]
G -> y
G -> H [tap: true]
H -> sum1`,
  },
];

function safeRender(dsl, type) {
  try {
    return render(dsl, { type });
  } catch (err) {
    return `<pre style="color:#b91c1c">RENDER ERROR: ${String((err && err.message) || err)}</pre>`;
  }
}

if (process.argv.includes("--before")) {
  mkdirSync(BEFORE_DIR, { recursive: true });
  for (const c of cases) {
    writeFileSync(join(BEFORE_DIR, `${c.key}.svg`), safeRender(c.dsl, c.type));
  }
  console.log(`[style-audit] wrote ${cases.length} BEFORE snapshots to ${BEFORE_DIR}`);
  process.exit(0);
}

const sections = cases
  .map((c) => {
    const beforePath = join(BEFORE_DIR, `${c.key}.svg`);
    const before = existsSync(beforePath)
      ? readFileSync(beforePath, "utf-8")
      : `<pre>missing snapshot — run --before on the pre-fix build</pre>`;
    const after = safeRender(c.dsl, c.type);
    return `
<h2><span class="case">${c.tier}</span>${c.title}</h2>
<div class="case-meta">${c.meta}</div>
<div class="grid">
  <div class="card"><div class="card-title">BEFORE</div><div class="svg-wrap">${before}</div></div>
  <div class="card"><div class="card-title">AFTER</div><div class="svg-wrap">${after}</div></div>
</div>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Schematex · Style-Audit Fixes — Before / After</title>
<style>
  body { font-family: system-ui; background: #f5f5f5; margin: 0; padding: 20px; }
  nav { font-size: 13px; color: #888; margin-bottom: 16px; }
  nav a { color: #555; text-decoration: none; }
  h1 { font-size: 20px; color: #333; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #888; margin-bottom: 24px; }
  h2 { font-size: 15px; color: #333; margin-top: 36px; padding: 8px 12px; background: #fff; border-left: 4px solid #2563eb; border-radius: 4px; }
  h2 .case { font-family: ui-monospace, "SF Mono", Menlo, monospace; color: #2563eb; font-size: 13px; margin-right: 8px; }
  .case-meta { font-size: 12px; color: #888; margin: 4px 0 12px 16px; line-height: 1.5; }
  .case-meta strong { color: #555; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
  .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
  .card-title { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 10px; }
  .card .svg-wrap { background: #fafafa; border: 1px solid #eee; border-radius: 4px; padding: 12px; overflow-x: auto; }
  .card .svg-wrap svg { display: block; max-width: 100%; height: auto; }
</style>
</head>
<body>
<nav><a href="index.html">← All Diagrams</a></nav>
<h1>Style-Audit Fixes — Before / After</h1>
<div class="subtitle">2026-06-09 style audit (P0 render bugs · P1 title/text-metrics unification · P2 theme migrations). BEFORE panels are static snapshots from the pre-fix build; AFTER panels are rendered by the current build.</div>
${sections}
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`[style-audit] wrote ${OUT}`);
