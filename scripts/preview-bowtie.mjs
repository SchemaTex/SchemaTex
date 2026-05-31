// Build a single static HTML page showing the bowtie engine across a curated
// set of representative diagrams. Open in a browser; no dev server needed.
//
//   node scripts/preview-bowtie.mjs
//   open examples/bowtie-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "examples/bowtie-preview.html");

const examples = [
  {
    id: "fan",
    title: "1 — Process-safety bowtie (the canonical shape)",
    note: "Three threats fan in through preventative barrier chains, three consequences fan out through mitigative chains, each wing centred about the knot. The hazard header sits above with a tie-line. Multi-barrier chains give the wings depth — this is what a real LPG loss-of-containment bowtie looks like.",
    dsl: `bowtie "LPG storage — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment"
threat "Corrosion of vessel wall"
  prevent "Corrosion-resistant coating"
  prevent "UT thickness inspection"
threat "Overpressure during filling"
  prevent "High-pressure trip (SIL 2)"
  prevent "Pressure relief valve"
threat "Mechanical impact (vehicle)"
  prevent "Bollards / vehicle barriers"
  prevent "Site speed limit + banksman"
consequence "Jet fire"
  mitigate "Gas detection + ESD"
  mitigate "Deluge / water spray"
consequence "Vapour cloud explosion"
  mitigate "Ignition-source control (ATEX)"
  mitigate "Blast-resistant control room"
consequence "Toxic / asphyxiation exposure"
  mitigate "Personal gas monitors"
  mitigate "Emergency evacuation plan"`,
  },
  {
    id: "depth",
    title: "2 — Defence in depth (barrier chains ≥ 2)",
    note: "A threat with three preventative barriers in series and a consequence with two mitigative barriers. Barriers x-step outward from the knot; declaration order = outermost → innermost (Permit-to-work outermost, Spotter nearest the knot).",
    dsl: `bowtie "Working at height"
hazard "Working at height"
topevent "Person falls from height"
threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
  prevent "Spotter / banksman"
consequence "Fatality"
  mitigate "Fall-arrest harness + lanyard"
  mitigate "Rescue plan + first aid"`,
  },
  {
    id: "escalation",
    title: "3 — Escalation factor with its own barrier",
    note: "The 'UT thickness inspection' barrier is degraded by an escalation factor ('Inspection interval too long', amber, dropping below it via a muted connector), itself controlled by an escalation-factor barrier ('Risk-based inspection scheme'). The escalation hangs into the whitespace below without breaking the symmetry of the two threat lines.",
    dsl: `bowtie "Vessel corrosion bowtie"
hazard "Pressurised vessel — corrosive service"
topevent "Loss of containment"
threat "Corrosion of vessel wall"
  prevent "Corrosion-resistant coating"
  prevent "UT thickness inspection"
    escalation "Inspection interval too long"
      barrier "Risk-based inspection scheme"
  prevent "Cathodic protection"
threat "Erosion at elbows"
  prevent "Flow-rate limit"
  prevent "Erosion-monitoring probes"
consequence "Toxic release"
  mitigate "Gas detection + ESD"
  mitigate "Emergency evacuation plan"
consequence "Environmental harm"
  mitigate "Secondary containment bund"
  mitigate "Spill response team"`,
  },
  {
    id: "aviation",
    title: "4 — Aviation SMS (ICAO Doc 9859 style)",
    note: "A non-process-industry bowtie: runway excursion. Shows the vocabulary travels across domains — same threats/barriers/consequences grammar, an aviation hazard.",
    dsl: `bowtie "Runway excursion"
hazard "Aircraft landing in adverse conditions"
topevent "Runway excursion on landing"
threat "Unstable approach"
  prevent "Stabilised-approach gate (go-around policy)"
  prevent "Approach monitoring + callouts"
threat "Contaminated runway"
  prevent "Runway condition reporting (RCR)"
  prevent "Landing performance assessment"
threat "Excessive landing speed"
  prevent "Speed/energy management SOP"
consequence "Hull damage"
  mitigate "Runway end safety area (RESA)"
  mitigate "Arrestor bed (EMAS)"
consequence "Injuries / fatalities"
  mitigate "Emergency response + evacuation"`,
  },
  {
    id: "full",
    title: "5 — Full vocabulary, both wings degraded",
    note: "Escalation factors on both a preventative and a mitigative barrier (mitigative barriers can also be degraded). Exercises asymmetric wings — the taller left wing sets the height, the right wing is centred within it.",
    dsl: `bowtie "Hot work — fire bowtie"
hazard "Hot work near flammable materials"
topevent "Ignition of flammable atmosphere"
threat "Sparks / hot slag"
  prevent "Hot-work permit"
  prevent "Fire watch"
    escalation "Fire watch leaves post early"
      barrier "Post-work monitoring period (60 min)"
threat "Static discharge"
  prevent "Bonding + grounding"
consequence "Flash fire"
  mitigate "Fixed fire suppression"
    escalation "Suppression isolated for maintenance"
      barrier "Management-of-change + impairment register"
consequence "Asset loss"
  mitigate "Fire-rated separation"
  mitigate "Insurance + business-continuity plan"`,
  },
  {
    id: "cjk",
    title: "6 — CJK labels (corner quotes)",
    note: "Made-for-AI: CJK corner quotes 「…」 are accepted everywhere straight quotes are, since LLMs frequently emit them for Chinese labels. Multi-barrier chains keep the bowtie shape; the layout is identical to the Latin form.",
    dsl: `bowtie 「高处坠落风险」
hazard 「高处作业」
topevent 「人员从高处坠落」
threat 「护栏被移除」
  prevent 「作业许可制度」
  prevent 「临时边缘防护」
threat 「屋面易碎」
  prevent 「爬板与警示标识」
  prevent 「生命线与安全带」
consequence 「死亡」
  mitigate 「防坠落安全带」
  mitigate 「救援与急救计划」
consequence 「重伤」
  mitigate 「下方安全网」
  mitigate 「现场急救与送医」`,
  },
  {
    id: "mono",
    title: "7 — Monochrome (regulator-print look)",
    note: "The same diagram as #3 under theme: monochrome — colour can't carry meaning in a black-and-white regulator submission, so element distinction rides on shape/border + position: the knot gets a doubled ring, escalation factors a dashed border, and the threat=left / consequence=right positions disambiguate the rest.",
    theme: "monochrome",
    dsl: `bowtie "Working at height"
hazard "Working at height"
topevent "Person falls from height"
threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
  prevent "Spotter / banksman"
consequence "Fatality"
  mitigate "Fall-arrest harness + lanyard"
  mitigate "Rescue plan + first aid"`,
  },
  {
    id: "validation",
    title: "8 — Correct by construction (rejected: bare threat)",
    note: "The barrier rule set in action: a threat with no preventative barrier is REJECTED with a plain-English error, not silently drawn. This is what separates a real bowtie from a Swiss-cheese doodle.",
    dsl: `bowtie
topevent "Loss of containment"
threat "Corrosion"
consequence "Release"
  mitigate "Gas detection"`,
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
    svg = svg.replace(/sx-bowtie-/g, `sx-bowtie-c${idx}-`);
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
<title>bowtie — visual review</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f5f5f7; color: #0f172a; font-family: -apple-system, system-ui, "Segoe UI", sans-serif; }
  .wrap { max-width: 1320px; margin: 0 auto; padding: 32px 24px 64px; }
  header { margin-bottom: 32px; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
  header p { color: #64748b; margin: 0; font-size: 14px; }
  .toc { margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; }
  .toc a { color: #64748b; text-decoration: none; padding: 4px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
  .toc a:hover { color: #2563eb; border-color: #93c5fd; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
  .card h2 { font-size: 18px; margin: 0 0 6px; letter-spacing: -0.005em; }
  .card .note { color: #64748b; font-size: 13px; line-height: 1.55; margin: 0 0 18px; max-width: 980px; }
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
  <h1>bowtie — visual review</h1>
  <p>Schematex Bowtie risk diagram engine (CCPS / Energy Institute 2018 · IEC 31010 §B.4.6). Threats → preventative barriers → top-event knot → mitigative barriers → consequences, with escalation factors degrading specific barriers. <strong>Correct by construction</strong> — the barrier rule set is validated before render.</p>
  <ul class="toc">
${examples.map((e) => `    <li><a href="#${e.id}">${escapeHtml(e.title.split("—")[0].trim())}</a></li>`).join("\n")}
  </ul>
</header>

${renderedCards.map(({ ex, svg, error }) => `<section class="card" id="${ex.id}">
  <h2>${escapeHtml(ex.title)}</h2>
  <p class="note">${escapeHtml(ex.note)}</p>
  <div class="svg-wrap">${error ? `<div class="err">parse error (expected for #9): ${escapeHtml(error)}</div>` : svg}</div>
  <details>
    <summary>DSL source</summary>
    <pre>${escapeHtml(ex.dsl)}</pre>
  </details>
</section>`).join("\n\n")}

<footer>
  generated by <code>scripts/preview-bowtie.mjs</code> · ${new Date().toISOString().slice(0, 19).replace("T", " ")} · ${examples.length} examples
</footer>
</div>
</body>
</html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT} (${examples.length} examples, ${Math.round(html.length / 1024)}KB)`);
