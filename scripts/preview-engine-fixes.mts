// Dev-only preview: renders the B-栏 engine fixes (B-1 genogram vital records,
// B-2 SLD standard switching, B-3 P&ID loop lint) to a static HTML gallery for
// visual review. Imports the plugins directly from source (not dist) so it is
// unaffected by any in-progress diagram that breaks the full bundle.
//
//   npx vite-node scripts/preview-engine-fixes.mts
//
// Output: /tmp/schematex-engine-fixes/index.html

import { writeFileSync, mkdirSync } from "node:fs";
import { genogram } from "../src/diagrams/genogram/index.ts";
import { sld } from "../src/diagrams/sld/index.ts";
import { pid } from "../src/diagrams/pid/index.ts";
import { flowchart } from "../src/diagrams/flowchart/index.ts";
import { lintPid } from "../src/diagrams/pid/lint.ts";
import { lintSLD } from "../src/diagrams/sld/lint.ts";
import type { SchematexDiagnostic } from "../src/core/diagnostics.ts";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function diagHtml(diags: SchematexDiagnostic[]): string {
  if (diags.length === 0) {
    return `<div class="diag diag-ok">✓ valid — no warnings</div>`;
  }
  return diags
    .map(
      (d) =>
        `<div class="diag diag-warn"><b>⚠ ${esc(d.code)}</b> ${esc(d.message)}</div>`
    )
    .join("");
}

interface Card {
  title: string;
  note: string;
  dsl: string;
  svg: string;
  diags?: SchematexDiagnostic[];
}

const cards: Card[] = [];

// ─── B-1 · genogram vital records ──────────────────────────────
const witt = `genogram "Erbfolge Witt"
  hans [male, dob: "1940-03-12", dod: "2018-11-04", note: "Erblasser"]
  greta [female, dob: "1943-07-22"]
  hans -- greta "m. 1965"
    klaus [male, dob: "1968-05-01", birth: out-of-wedlock]
    petra [female, dob: "1972-09-15", birth: adopted]`;
cards.push({
  title: "B-1 · Genealogy vital records (the Witt estate tree)",
  note: "dob/dod ISO dates render as a * … † … caption · note line · German birth symbols: (*) out-of-wedlock, [*] adopted",
  dsl: witt,
  svg: genogram.render(witt),
});

const clinical = `genogram "Clinical (year-only, unchanged)"
  john [male, 1950, 1990, deceased]
  mary [female, 1952]
  john -- mary
    sam [male, 1978]`;
cards.push({
  title: "B-1 · Backward compatibility — year-only clinical genogram",
  note: "Bare 4-digit years keep the inline (1950–1990) suffix; no genealogy caption. Existing genograms render unchanged.",
  dsl: clinical,
  svg: genogram.render(clinical),
});

// ─── B-2 · SLD standard switching ──────────────────────────────
const topo = (std?: string) =>
  `sld "Feeder${std ? " · " + std.toUpperCase() : " · default"}"${std ? ` [standard: ${std}]` : ""}
UTIL = utility
ATS = ats
BUS = bus [voltage: "400V"]
CB = breaker [rating: "100A"]
TX = transformer_dy [rating: "500kVA"]
F1 = fuse
LOAD = load
UTIL -> ATS
ATS -> BUS
BUS -> CB
CB -> TX
TX -> F1
F1 -> LOAD`;
for (const std of ["ansi", "iec", "abnt"]) {
  cards.push({
    title: `B-2 · Same topology, [standard: ${std}]`,
    note:
      std === "ansi"
        ? "ANSI/IEEE 315: breaker = contact + arc, transformer = coil humps, fuse = plain box."
        : std === "iec"
        ? "IEC 60617: breaker = contact + × mark, transformer = two interlinked circles, fuse = box + conductor line. Badge top-right."
        : "ABNT NBR 5410 (IEC 60364 family): IEC glyphs + Portuguese jurisdiction badge.",
    dsl: topo(std),
    svg: sld.render(topo(std)),
  });
}

// SLD lint: ANSI-only device under IEC
const recloserIec = `sld "ANSI device under IEC" [standard: iec]
R = recloser
B = bus
R -> B`;
cards.push({
  title: "B-2 · Symbol-availability lint",
  note: "A North-American utility device (recloser) has no IEC 60617 glyph → warning, but still renders.",
  dsl: recloserIec,
  svg: sld.render(recloserIec),
  diags: lintSLD(recloserIec),
});

// ─── B-3 · P&ID loop lint ──────────────────────────────────────
const incomplete = `pid "Incomplete loop"
equip T-1 : tank_atm
inst FT-1 : field_discrete
  measures L1`;
cards.push({
  title: "B-3 · Incomplete instrument loop",
  note: "FT-1 measures a variable but no signal line reaches a controller → loop-completeness warning (engine flags, never invents the missing link).",
  dsl: incomplete,
  svg: pid.render(incomplete),
  diags: lintPid(incomplete),
});

const complete = `pid "Complete loop"
equip V-1 : valve_control
inst FT-1 : field_discrete
  measures L1
inst FIC-1 : cr_shared
  controls V-1
line s0 from FT-1 to FIC-1 [type: electric]
line s1 from FIC-1 to V-1 [type: pneumatic]`;
cards.push({
  title: "B-3 · Complete, correctly-typed loop",
  note: "Transmitter→controller is electric, controller→control-valve is pneumatic. No warnings.",
  dsl: complete,
  svg: pid.render(complete),
  diags: lintPid(complete),
});

const wrongType = `pid "Wrong signal types"
equip V-1 : valve_control
inst FT-1 : field_discrete
  measures L1
inst FIC-1 : cr_shared
  controls V-1
line s0 from FT-1 to FIC-1 [type: pneumatic]
line s1 from FIC-1 to V-1 [type: electric]`;
cards.push({
  title: "B-3 · Signal-type vs device-type mismatch",
  note: "ISA-5.1 §5.2: transmitter→controller should be electric, controller→valve should be pneumatic. Both lines are wrong here.",
  dsl: wrongType,
  svg: pid.render(wrongType),
  diags: lintPid(wrongType),
});

// ─── B-5 · flowchart built-in node icons ───────────────────────
const iconFlow = `flowchart LR
  U[User]
  API[API Gateway]
  SVC[Order Service]
  DB[(Postgres)]
  Q[Queue]
  U --> API --> SVC
  SVC --> DB
  SVC --> Q
  icon U: user
  icon API: globe
  icon SVC: gear
  icon DB: database
  icon Q: queue`;
cards.push({
  title: "B-5 · Flowchart built-in node icons (tech)",
  note: "New `icon <node>: <name>` statement (parallel to class/style — no grammar collision). Built-in catalog with AI-friendly aliases (db→database, api→server…). image: URLs deferred.",
  dsl: iconFlow,
  svg: flowchart.render(iconFlow),
});

const domainFlow = `flowchart LR
  C[Client Intake]
  R[Contract Review]
  S[E-Signature]
  P[Payment]
  A[Archive]
  C --> R --> S --> P --> A
  icon C: user
  icon R: scale
  icon S: contract
  icon P: money
  icon A: bank`;
cards.push({
  title: "B-5 · Domain icons (legal / finance workflow)",
  note: "79-icon catalog spans general flow, tech/architecture, people/business, plus domain sets for medical / legal / engineering / finance — Schematex's professional audience.",
  dsl: domainFlow,
  svg: flowchart.render(domainFlow),
});

// ─── HTML ──────────────────────────────────────────────────────
const sections = cards
  .map(
    (c) => `
<section class="card">
  <header>
    <h2>${esc(c.title)}</h2>
    <p>${esc(c.note)}</p>
  </header>
  <div class="body">
    <pre class="dsl">${esc(c.dsl)}</pre>
    <div class="render">
      <div class="svg">${c.svg}</div>
      ${c.diags ? `<div class="diags">${diagHtml(c.diags)}</div>` : ""}
    </div>
  </div>
</section>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Schematex — B-栏 engine fixes preview</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1f2937; background: #f5f7fa; }
  .top { padding: 28px 32px 8px; }
  .top h1 { margin: 0 0 4px; font-size: 22px; }
  .top p { margin: 0; color: #6b7280; max-width: 900px; }
  .grid { padding: 16px 24px 64px; display: grid; gap: 20px; grid-template-columns: 1fr; max-width: 1320px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .card header { padding: 14px 18px; border-bottom: 1px solid #f0f1f3; }
  .card header h2 { margin: 0; font-size: 16px; }
  .card header p { margin: 4px 0 0; color: #6b7280; font-size: 12.5px; }
  .body { display: grid; grid-template-columns: 380px 1fr; gap: 0; align-items: stretch; }
  @media (max-width: 900px){ .body { grid-template-columns: 1fr; } }
  .dsl { margin: 0; padding: 16px 18px; background: #0f172a; color: #e2e8f0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; white-space: pre; border-right: 1px solid #f0f1f3; }
  .render { padding: 18px; display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center; overflow: auto; }
  .svg svg { max-width: 100%; height: auto; }
  .diags { width: 100%; display: flex; flex-direction: column; gap: 6px; }
  .diag { font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; padding: 8px 10px; border-radius: 6px; }
  .diag-ok { background: #ecfdf5; color: #065f46; }
  .diag-warn { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
  footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 0 0 40px; }
</style>
</head>
<body>
  <div class="top">
    <h1>Schematex — B-栏 engine fixes preview</h1>
    <p>B-1 genogram vital records · B-2 SLD ANSI/IEC/ABNT standard switching · B-3 P&amp;ID instrument-loop lint. ${cards.length} examples, rendered from source.</p>
  </div>
  <div class="grid">
${sections}
  </div>
  <footer>Generated by scripts/preview-engine-fixes.mts — not committed.</footer>
</body>
</html>`;

mkdirSync("/tmp/schematex-engine-fixes", { recursive: true });
const out = "/tmp/schematex-engine-fixes/index.html";
writeFileSync(out, html);
console.log("wrote", out);
