// Dev-only: contact sheet of every built-in flowchart icon, for visual QA.
//   npx vite-node scripts/preview-icons.mts
import { writeFileSync, mkdirSync } from "node:fs";
import { iconNames, renderIcon } from "../src/diagrams/flowchart/icons.ts";

const names = iconNames();
const cell = (name: string) => {
  // icons are centred at origin in a ~22px box; show in a 48px tile at 1.4× scale
  const svg = `<svg width="56" height="56" viewBox="-28 -28 56 56"><g transform="scale(1.4)" stroke="#1f2937">${renderIcon(name)}</g></svg>`;
  return `<div class="tile">${svg}<code>${name}</code></div>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Schematex icons</title>
<style>
 body{margin:0;font:13px system-ui,sans-serif;background:#f5f7fa;color:#1f2937}
 h1{padding:24px 24px 0;margin:0;font-size:20px}
 p{padding:4px 24px 0;margin:0;color:#6b7280}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;padding:20px 24px 60px}
 .tile{background:#fff;border:1px solid #e5e7eb;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px 8px}
 .tile svg{display:block}
 code{font:11px ui-monospace,Menlo,monospace;color:#374151;word-break:break-all;text-align:center}
 .sx-fc-icon-fill{fill:#1f2937;stroke:none}
 .sx-fc-icon{stroke:#1f2937;fill:none}
</style></head><body>
<h1>Schematex flowchart icons — contact sheet</h1>
<p>${names.length} built-in icons (1.4× scale). Visual QA before shipping B-5 expansion.</p>
<div class="grid">${names.map(cell).join("")}</div>
</body></html>`;

mkdirSync("/tmp/schematex-icons", { recursive: true });
writeFileSync("/tmp/schematex-icons/index.html", html);
console.log("wrote /tmp/schematex-icons/index.html —", names.length, "icons");
