// Dev-only: evacuation safety-sign contact sheets for visual QA.
//   npx vite-node scripts/preview-safety-symbols.mts 1
//   npx vite-node scripts/preview-safety-symbols.mts 2
//   npx vite-node scripts/preview-safety-symbols.mts 3

import { mkdirSync, writeFileSync } from "node:fs";
import { SAFETY_PREVIEW_SYMBOLS } from "../src/diagrams/floorplan/safety-symbols.ts";

const batches: readonly (readonly string[])[] = [
  [
    "exit",
    "exit-final",
    "assembly",
    "here",
    "extinguisher",
    "call-point",
    "first-aid",
    "no-elevator",
  ],
  [
    "aed",
    "hose-reel",
    "fire-ladder",
    "fire-equipment",
    "fire-phone",
    "emergency-phone",
    "refuge",
    "shelter",
    "not-an-exit",
    "alarm-sounder",
    "fire-door",
    "smoke-door",
    "escape-ladder",
    "rescue-window",
  ],
  [
    "stretcher",
    "doctor",
    "eyewash",
    "safety-shower",
    "break-glass",
    "emergency-door-push",
    "emergency-door-slide",
    "riser",
    "exit:iso:left",
    "exit:iso:right",
    "exit:nfpa:left",
    "exit:nfpa:right",
    "exit-final:iso:left",
    "exit-final:iso:right",
    "exit-final:nfpa:left",
    "exit-final:nfpa:right",
    "here:nfpa",
    "here:uae",
  ],
];

const batch = Number.parseInt(process.argv[2] ?? "3", 10);
if (batch < 1 || batch > batches.length) {
  throw new Error("batch must be 1, 2, or 3");
}
const names = batches[batch - 1] ?? [];

function cell(name: string): string {
  const def = SAFETY_PREVIEW_SYMBOLS[name];
  if (!def) throw new Error(`missing preview symbol: ${name}`);
  const hand = name.includes(":left") ? "left" : "right";
  const profile = name.includes(":nfpa")
    ? "nfpa"
    : name.includes(":uae")
      ? "uae"
      : "iso";
  const drawing = def.draw({ hand, profile });
  return `<article class="tile">
    <svg width="112" height="112" viewBox="0 0 24 24" role="img" aria-label="${name}">${drawing}</svg>
    <div><strong>${name}</strong><small>${def.code || "profile / structural"} · ${def.sheetMm} mm</small></div>
  </article>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Schematex safety symbols — batch ${batch}</title>
<style>
:root {
  --safe: #00843d;
  --fire: #c8102e;
  --mandatory: #005387;
  --warning: #ffcc00;
  --ink: #172033;
  --muted: #64748b;
  --paper: #ffffff;
  --canvas: #edf2ef;
  --line: #d4ded8;
  --radius: 12px;
  --shadow: 0 8px 24px rgba(20, 54, 38, .08);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--ink);
  background: var(--canvas);
  font-family: "Noto Sans", "Noto Sans Arabic", sans-serif;
}
header { padding: 36px 40px 12px; }
h1 {
  margin: 0;
  font: 600 28px/1.15 "IBM Plex Sans", "Noto Sans", sans-serif;
  letter-spacing: -.02em;
}
p { max-width: 760px; margin: 10px 0 0; color: var(--muted); font-size: 14px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  padding: 20px 40px 48px;
}
.tile {
  min-height: 154px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.tile svg { flex: 0 0 auto; border-radius: 9px; }
.tile div { min-width: 0; }
strong {
  display: block;
  font: 600 14px/1.25 "IBM Plex Sans", "Noto Sans", sans-serif;
  overflow-wrap: anywhere;
}
small { display: block; margin-top: 6px; color: var(--muted); font-size: 11px; line-height: 1.35; }
.sx-fp-safety-plate-safe { fill: var(--safe); }
.sx-fp-safety-plate-fire { fill: var(--fire); }
.sx-fp-safety-plate-mand { fill: var(--mandatory); }
.sx-fp-safety-plate-warn { fill: var(--warning); }
.sx-fp-safety-plate-neutral { fill: var(--paper); stroke: var(--ink); stroke-width: 1.1; }
.sx-fp-safety-knockout { fill: #fff; stroke: none; }
.sx-fp-safety-knockout-stroke { fill: none; stroke: #fff; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.sx-fp-safety-dark { fill: var(--ink); stroke: none; }
.sx-fp-safety-dark-stroke { fill: none; stroke: var(--ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
@media (max-width: 620px) {
  header { padding: 24px 20px 8px; }
  .grid { grid-template-columns: 1fr; padding: 16px 20px 36px; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
</head>
<body>
<header>
  <h1>Evacuation safety symbols · batch ${batch}</h1>
  <p>${names.length} original 24×24 glyphs. Solid semantic plates, white knockout pictograms, fixed printed sizes independent of plan scale.</p>
</header>
<main class="grid">${names.map(cell).join("")}</main>
</body>
</html>`;

const outputDir = `/tmp/schematex-safety-symbols/batch-${batch}`;
mkdirSync(outputDir, { recursive: true });
writeFileSync(`${outputDir}/index.html`, html);
console.log(`wrote ${outputDir}/index.html — ${names.length} symbols`);
