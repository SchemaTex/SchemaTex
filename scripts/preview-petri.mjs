// Dev-only: render a gallery of Petri net examples to a static HTML page for
// visual review. Not part of the build. Output: /tmp/schematex-petri-preview.
import { render } from "../dist/index.js";
import { writeFileSync, mkdirSync } from "node:fs";

const examples = [
  {
    title: "The classic net (concurrency + feedback)",
    note: "Wikipedia fig. 1 — fork into P2/P3, join at T2, feedback P4→T1 routed as a back-edge. T1 is enabled (green ring), T2 is not (P2 empty).",
    dsl: `petri "Classic"
  place P1 *1
  place P2
  place P3 *2
  place P4 *1
  transition T1
  transition T2
  P1 -> T1
  T1 -> P2
  T1 -> P3
  P2 -> T2
  P3 -> T2
  T2 -> P4
  P4 -> T1`,
  },
  {
    title: "Producer / consumer (capacity + timed + inhibitor)",
    note: "Bounded buffer: free/used slot places, used capped at K=3 (dashed border), a timed withdraw transition (hollow box, λ), and an inhibitor arc (hollow-circle head) that halts deposits while Jam is marked.",
    dsl: `petri "Producer / Consumer (bounded buffer)"
  place pReady *1 "producer ready"
  place free *3 "free slots"
  place used capacity: 3 "used slots"
  place cReady *1 "consumer ready"
  place Jam
  transition produce "deposit"
  transition consume timed rate: 0.8 "withdraw"
  pReady -> produce
  free -> produce
  produce -> used
  produce -> pReady
  used -> consume
  cReady -> consume
  consume -> free
  consume -> cReady
  Jam -o produce`,
  },
  {
    title: "Mutual exclusion (shared resource)",
    note: "Two processes competing for one Mutex token — the canonical concurrency pattern. Both entry transitions enabled; firing one consumes the shared token.",
    dsl: `petri "Mutual exclusion"
  place idleA *1
  place idleB *1
  place Mutex *1
  place critA
  place critB
  transition enterA
  transition exitA
  transition enterB
  transition exitB
  idleA -> enterA
  Mutex -> enterA
  enterA -> critA
  critA -> exitA
  exitA -> idleA
  exitA -> Mutex
  idleB -> enterB
  Mutex -> enterB
  enterB -> critB
  critB -> exitB
  exitB -> idleB
  exitB -> Mutex`,
  },
  {
    title: "Weighted arcs + large marking",
    note: "Arc weights > 1 are labelled (in accent blue); a place with > 4 tokens renders as a numeral instead of dots.",
    dsl: `petri "Weights"
  place Raw *8
  place Batch
  transition assemble
  transition ship
  place Out
  Raw -> assemble weight: 3
  assemble -> Batch
  Batch -> ship weight: 2
  ship -> Out`,
  },
  {
    title: "Workflow net (source → sink)",
    note: "van der Aalst WF-net: one source place (no input), one sink (no output). Detected and noted in the SVG <desc>. Branch + merge through an AND-split/join.",
    dsl: `petri "Order workflow"
  place in *1 "received"
  transition split
  place pick
  place invoice
  transition pack
  transition bill
  place packed
  place billed
  transition ship
  place out "shipped"
  in -> split
  split -> pick
  split -> invoice
  pick -> pack
  invoice -> bill
  pack -> packed
  bill -> billed
  packed -> ship
  billed -> ship
  ship -> out`,
  },
  {
    title: "Fire sequence (rendered marking = after firing)",
    note: "Same net, but `fire: T1` advances the marking — the token has moved from P1 to P2, and now T2 is the enabled transition. The engine computes the dynamics.",
    dsl: `petri "After fire: T1"
  place P1 *1
  transition T1
  place P2
  transition T2
  place P3
  P1 -> T1
  T1 -> P2
  P2 -> T2
  T2 -> P3
  fire: T1`,
  },
  {
    title: "Top-down layout (layout: tb)",
    note: "The same vocabulary flowing top→bottom — the transition bars rotate to stay perpendicular to the flow.",
    dsl: `petri "Top-down"
  layout: tb
  place start *1
  transition begin
  place mid
  transition step
  place fin
  start -> begin
  begin -> mid
  mid -> step
  step -> fin`,
  },
  {
    title: "Monochrome theme (Murata textbook)",
    note: "theme: monochrome — faithful black/white. Enabled shows as a doubled ring (not green); the inhibitor reads from its hollow-circle head (not red).",
    theme: "monochrome",
    dsl: `petri "Textbook"
  place P1 *1
  place Lock
  transition T1
  place P2
  P1 -> T1
  Lock -o T1
  T1 -> P2`,
  },
  {
    title: "Dark theme + CJK labels",
    note: "theme: dark (Catppuccin). Chinese labels and 「…」 quotes parse cleanly — the Made-for-AI pillar.",
    theme: "dark",
    dsl: `petri "生产流程"
  place 原料 *2 「原材料」
  transition 加工
  place 半成品
  transition 包装
  place 成品
  原料 -> 加工 weight: 2
  加工 -> 半成品
  半成品 -> 包装
  包装 -> 成品`,
  },
];

// Each SVG carries its own <style> block with shared class names; stacking
// several themed SVGs in one document lets the last <style> win for all of them
// (CSS cascade). Isolating each in an iframe reproduces real standalone embedding
// and keeps every example on its own theme.
const cards = examples
  .map((ex) => {
    let svg;
    try {
      svg = render(ex.dsl, ex.theme ? { theme: ex.theme } : undefined);
    } catch (e) {
      svg = `<pre class="err">${String(e && e.message ? e.message : e)}</pre>`;
    }
    const escDsl = ex.dsl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const dark = ex.theme === "dark";
    const bg = dark ? "#1e1e2e" : "#ffffff";
    const hMatch = /height="(\d+(?:\.\d+)?)"/.exec(svg);
    const frameH = (hMatch ? Math.ceil(parseFloat(hMatch[1])) : 320) + 26;
    const srcdoc = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:12px;background:${bg};display:flex;align-items:center;justify-content:center}svg{max-width:100%;height:auto}</style>${svg}`
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    return `<section class="card">
  <header><h2>${ex.title}</h2><p>${ex.note}</p></header>
  <div class="body">
    <pre class="dsl">${escDsl}</pre>
    <div class="svg${dark ? " svg-dark" : ""}"><iframe class="frame" style="height:${frameH}px" srcdoc="${srcdoc}"></iframe></div>
  </div>
</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Schematex — Petri net preview</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1f2937; background: #f5f7fa; }
  .top { padding: 28px 32px 8px; }
  .top h1 { margin: 0 0 4px; font-size: 22px; }
  .top p { margin: 0; color: #6b7280; }
  .grid { padding: 16px 24px 64px; display: grid; gap: 20px; grid-template-columns: 1fr; max-width: 1280px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .card header { padding: 14px 18px; border-bottom: 1px solid #f0f1f3; }
  .card header h2 { margin: 0; font-size: 16px; }
  .card header p { margin: 4px 0 0; color: #6b7280; font-size: 12.5px; }
  .body { display: grid; grid-template-columns: 360px 1fr; gap: 0; align-items: stretch; }
  @media (max-width: 880px){ .body { grid-template-columns: 1fr; } }
  .dsl { margin: 0; padding: 16px 18px; background: #0f172a; color: #e2e8f0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; white-space: pre; border-right: 1px solid #f0f1f3; }
  .svg { padding: 0; display: flex; align-items: stretch; justify-content: stretch; overflow: hidden; }
  .frame { width: 100%; border: 0; display: block; }
  .err { color: #b91c1c; }
  footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 0 0 40px; }
</style>
</head>
<body>
  <div class="top">
    <h1>Schematex — Petri net preview</h1>
    <p>Murata 1989 / ISO-IEC 15909. ${examples.length} examples · places · transitions (immediate + timed) · weighted / inhibitor / reset / read arcs · computed enabled-transition highlight + fire dynamics · zero runtime deps.</p>
  </div>
  <div class="grid">
${cards}
  </div>
  <footer>Generated by scripts/preview-petri.mjs — not committed.</footer>
</body>
</html>`;

const outDir = "/tmp/schematex-petri-preview";
mkdirSync(outDir, { recursive: true });
const out = `${outDir}/index.html`;
writeFileSync(out, html);
console.log("wrote", out);
