import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "preview/pid-symbol-parts.html");
const revision = execFileSync("git", ["log", "-1", "--format=%h", "--", "src/diagrams/pid/symbols.ts"], {
  cwd: root,
  encoding: "utf8",
}).trim();

const distIndex = await readFile(resolve(root, "dist/index.js"), "utf8");
const symbolChunk = [...distIndex.matchAll(/import \{([^}]*)\} from '([^']+)'/g)]
  .find((match) => match[1].includes("GEOMETRY") && match[1].includes("renderEquip"));
if (!symbolChunk) throw new Error("Built P&ID symbol module is unavailable; run npm run build first");
const { GEOMETRY, renderEquip } = await import(
  pathToFileURL(resolve(root, "dist", symbolChunk[2])).href
);

const symbolStyles = `
  .lt-pid-equip, .lt-pid-valve-body { fill: #fff; stroke: #1d1d1d; stroke-width: 1.6; }
  .lt-pid-tray-line { fill: none; stroke: #555; stroke-width: 1; }
  .lt-pid-equip-tag { fill: #1d1d1d; font: 600 10px Manrope, sans-serif; }
  .lt-pid-equip-tag-bg { fill: #fff; stroke: none; }
  .lt-pid-actuator-letter { fill: #1d1d1d; font: 700 11px "IBM Plex Mono", monospace; }
  .lt-pid-fail-position { fill: #1d1d1d; font: 700 8px "IBM Plex Mono", monospace; }
`;

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function symbolSvg(type, attrs = {}) {
  return `<svg viewBox="-80 -62 160 138" role="img" aria-label="${type} renderer symbol">
    <style>${symbolStyles}</style>
    ${renderEquip(type, attrs.tag ?? "", undefined, attrs)}
  </svg>`;
}

function symbolCard({ type, name, description, source, attrs = {}, isNew = false }) {
  return `<article class="symbol-card">
    <header><span class="type-name">${type}</span>${isNew ? '<span class="new-badge">New</span>' : '<span class="reference-badge">Reference</span>'}</header>
    <div class="symbol-stage">${symbolSvg(type, attrs)}</div>
    <div class="symbol-copy"><h3>${name}</h3><p>${description}</p></div>
    <code>${escapeHtml(source)}</code>
  </article>`;
}

const pumpCards = [
  {
    type: "pump_general",
    name: "General liquid pump",
    description: "A neutral liquid-pump glyph for cases where the operating principle is unspecified.",
    source: "equip P-101 : pump_general",
    isNew: true,
  },
  {
    type: "pump_centrifugal",
    name: "Centrifugal pump",
    description: "The existing volute-style pump remains distinct and keeps its raised discharge anchor.",
    source: "equip P-102 : pump_centrifugal",
  },
  {
    type: "pump_diaphragm",
    name: "Diaphragm pump",
    description: "The membrane profile makes dosing and metering duty recognizable without reading the tag.",
    source: "equip P-201 : pump_diaphragm",
    isNew: true,
  },
];

const actuatorCards = [
  {
    type: "valve_control",
    name: "Diaphragm · FC",
    description: "Pneumatic spring-diaphragm operator with fail-closed behavior.",
    source: 'equip FV-101 : valve_control [actuator: "diaphragm", fail: "FC"]',
    attrs: { actuator: "diaphragm", fail: "FC", tag: "FV-101" },
    isNew: true,
  },
  {
    type: "valve_control",
    name: "Piston · FO",
    description: "Linear piston operator with fail-open behavior.",
    source: 'equip PV-201 : valve_control [actuator: "piston", fail: "FO"]',
    attrs: { actuator: "piston", fail: "FO", tag: "PV-201" },
    isNew: true,
  },
  {
    type: "valve_control",
    name: "Motor · FL",
    description: "Circular M operator for an electrically driven valve that fails in last position.",
    source: 'equip XV-301 : valve_control [actuator: "motor", fail: "FL"]',
    attrs: { actuator: "motor", fail: "FL", tag: "XV-301" },
    isNew: true,
  },
  {
    type: "valve_control",
    name: "Solenoid",
    description: "Boxed S operator for discrete electric actuation.",
    source: 'equip SV-401 : valve_control [actuator: "solenoid"]',
    attrs: { actuator: "solenoid", tag: "SV-401" },
    isNew: true,
  },
];

function filterPortSvg() {
  const points = [
    ["in", -58, -9, "end"],
    ["out", 58, -9, "start"],
    ["top", 0, -53, "middle"],
    ["backwash", -58, 38, "end"],
    ["drain", 0, 61, "middle"],
  ];
  const ports = points.map(([name, labelX, labelY, anchor]) => {
    const port = GEOMETRY.filter.ports[name];
    return `<g class="port-callout">
      <line x1="${port.x}" y1="${port.y}" x2="${labelX}" y2="${labelY}" />
      <circle cx="${port.x}" cy="${port.y}" r="3.2" />
      <text x="${labelX}" y="${labelY - 4}" text-anchor="${anchor}">.${name}</text>
    </g>`;
  }).join("");

  return `<svg viewBox="-105 -76 210 165" role="img" aria-label="Filter symbol with distinct named ports">
    <style>${symbolStyles}</style>
    ${renderEquip("filter", "")}
    ${ports}
  </svg>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SchemaTex · P&amp;ID Symbol Parts</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Manrope:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <style>
    :root {
      --blueprint: #14253d;
      --process: #2f718f;
      --amber: #d18b33;
      --fault: #ba4e58;
      --paper: #f4f7f6;
      --rule: #cbd6d9;
      --white: #ffffff;
      --display: "Barlow Condensed", "Avenir Next Condensed", sans-serif;
      --body: "Manrope", "Avenir Next", sans-serif;
      --mono: "IBM Plex Mono", "SFMono-Regular", monospace;
      --radius-s: 4px;
      --radius-m: 10px;
      --radius-l: 18px;
      --space-1: .5rem;
      --space-2: .85rem;
      --space-3: 1.25rem;
      --space-4: 2rem;
      --space-5: 3.5rem;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--blueprint);
      background-color: var(--paper);
      background-image: linear-gradient(rgba(47,113,143,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(47,113,143,.045) 1px, transparent 1px);
      background-size: 28px 28px;
      font: 400 16px/1.55 var(--body);
    }
    a { color: inherit; }
    a:focus-visible { outline: 3px solid var(--amber); outline-offset: 3px; }
    .shell { width: min(1420px, calc(100% - 32px)); margin: 0 auto; }
    .topline { display: flex; justify-content: space-between; gap: 20px; padding: 18px 0; border-bottom: 1px solid var(--rule); font: 500 .7rem/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
    .topline a { text-decoration: none; }
    .status::before { content: ""; display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: var(--amber); }
    .hero { display: grid; grid-template-columns: 1.3fr .7fr; gap: var(--space-5); align-items: end; padding: 70px 0 44px; }
    .eyebrow { margin: 0 0 12px; color: var(--process); font: 500 .72rem/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 850px; font: 600 clamp(3.5rem, 7vw, 7rem)/.88 var(--display); letter-spacing: -.03em; text-transform: uppercase; }
    .hero-note { padding: 12px 0 4px 20px; border-left: 3px solid var(--amber); color: #52616f; }
    .hero-note strong { display: block; margin-bottom: 7px; color: var(--blueprint); }
    .section { margin-bottom: var(--space-5); }
    .section-head { display: flex; justify-content: space-between; align-items: end; gap: var(--space-3); margin-bottom: 14px; }
    .section-head h2 { margin: 0; font: 600 2.2rem/1 var(--display); text-transform: uppercase; }
    .section-head p { max-width: 670px; margin: 0; color: #5c6b78; font-size: .9rem; }
    .catalog { display: grid; gap: 14px; }
    .catalog.pumps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .catalog.actuators { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .symbol-card, .port-card, .context-card { overflow: hidden; border: 1px solid var(--rule); border-radius: var(--radius-m); background: var(--white); box-shadow: 0 16px 38px rgba(20,37,61,.08); }
    .symbol-card header { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 11px 14px; border-bottom: 1px solid var(--rule); }
    .type-name { color: var(--process); font: 500 .72rem/1 var(--mono); }
    .new-badge, .reference-badge { padding: 4px 6px; border: 1px solid currentColor; border-radius: var(--radius-s); font: 500 .58rem/1 var(--mono); letter-spacing: .07em; text-transform: uppercase; }
    .new-badge { color: #96611e; background: #fff8ec; }
    .reference-badge { color: #687784; background: #f6f8f8; }
    .symbol-stage { display: grid; place-items: center; min-height: 220px; padding: 18px; background: radial-gradient(circle at 50% 48%, #fff 0 44%, #f5f8f8 100%); }
    .symbol-stage svg { width: 100%; height: 190px; }
    .symbol-copy { min-height: 116px; padding: 16px 18px; border-top: 1px solid var(--rule); }
    .symbol-copy h3 { margin: 0 0 6px; font: 600 1.45rem/1 var(--display); text-transform: uppercase; }
    .symbol-copy p { margin: 0; color: #586875; font-size: .82rem; }
    code { display: block; min-height: 56px; padding: 12px 14px; overflow-wrap: anywhere; color: #d9e8ee; background: var(--blueprint); font: 400 .66rem/1.5 var(--mono); }
    .port-card { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(330px, .85fr); }
    .port-stage { min-height: 390px; padding: 24px; border-right: 1px solid var(--rule); background: var(--white); }
    .port-stage svg { width: 100%; height: 340px; }
    .port-callout line { stroke: var(--process); stroke-width: 1.2; stroke-dasharray: 4 3; }
    .port-callout circle { fill: var(--amber); stroke: var(--blueprint); stroke-width: 1; }
    .port-callout text { fill: var(--process); font: 600 8px var(--mono); }
    .port-copy { display: flex; flex-direction: column; justify-content: center; padding: 28px; }
    .port-copy h3 { margin: 0 0 10px; font: 600 2rem/1 var(--display); text-transform: uppercase; }
    .port-copy p { margin: 0 0 18px; color: #586875; }
    .port-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .port-list li { display: grid; grid-template-columns: 92px 1fr; gap: 12px; padding-top: 8px; border-top: 1px solid var(--rule); font-size: .8rem; }
    .port-list code { display: inline; min-height: 0; padding: 0; color: var(--process); background: transparent; font-size: .7rem; }
    .context-card { padding: 22px; }
    .context-card img { display: block; width: 100%; max-height: 620px; object-fit: contain; background: #fff; }
    .context-caption { display: flex; justify-content: space-between; gap: 20px; padding-top: 14px; border-top: 1px solid var(--rule); color: #5b6976; font-size: .78rem; }
    .context-caption strong { color: var(--blueprint); }
    footer { display: flex; justify-content: space-between; gap: 20px; padding: 20px 0 36px; border-top: 1px solid var(--rule); color: #687784; font: 400 .68rem/1.4 var(--mono); }
    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; }
      .catalog.actuators { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .port-card { grid-template-columns: 1fr; }
      .port-stage { border-right: 0; border-bottom: 1px solid var(--rule); }
    }
    @media (max-width: 700px) {
      .shell { width: min(100% - 20px, 1420px); }
      .catalog.pumps, .catalog.actuators { grid-template-columns: 1fr; }
      .section-head, .context-caption, footer { align-items: start; flex-direction: column; }
      .hero { padding-top: 46px; }
      .symbol-stage { min-height: 200px; }
    }
    @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topline"><a href="professional-visual-contract.html#case-pid-symbols">← Full visual contract</a><span class="status">Production symbol functions · ${revision}</span></header>
    <main>
      <section class="hero">
        <div><p class="eyebrow">SchemaTex 1.0.14 · P&amp;ID parts bench</p><h1>See every new part before it ships.</h1></div>
        <div class="hero-note"><strong>This is renderer output.</strong>Each glyph below comes from the production <code style="display:inline;min-height:0;padding:0;color:inherit;background:transparent">renderEquip()</code> function. Port dots and callout labels are the only preview overlay.</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Pump family</h2><p>The additions fill two catalog gaps without changing the established centrifugal-pump meaning.</p></div>
        <div class="catalog pumps">${pumpCards.map(symbolCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Composable valve actuators</h2><p>One stable valve-body envelope composes four actuator glyphs. The first three cards also expose all supported fail-position labels.</p></div>
        <div class="catalog actuators">${actuatorCards.map(symbolCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Filter port map</h2><p>Named anchors are now visible engineering structure. Invalid explicit ports produce lint instead of borrowing a plausible main connection.</p></div>
        <article class="port-card">
          <div class="port-stage">${filterPortSvg()}</div>
          <div class="port-copy"><h3>Five distinct anchors</h3><p>The filter owns one geometry record; both routing and lint read the same map.</p><ul class="port-list"><li><code>.in / .out</code><span>Two main-process anchors</span></li><li><code>.top</code><span>Chemical injection or top service</span></li><li><code>.backwash</code><span>Dedicated side service anchor</span></li><li><code>.drain</code><span>Dedicated bottom outlet</span></li></ul></div>
        </article>
      </section>

      <section class="section">
        <div class="section-head"><h2>In system context</h2><p>The isolated parts still have to survive routing, labels, instruments, and mixed process services. This is the current branch rendering of the water-treatment fixture.</p></div>
        <article class="context-card"><img src="professional-visual-contract/candidate-pid-water-treatment-symbols.png" alt="Current SchemaTex water-treatment P and ID using the new pump, filter port, and motor actuator symbols"><div class="context-caption"><span><strong>Renderer output</strong> · same DSL used for the frozen before image</span><span>Ideal reference remains separate in the full comparison page</span></div></article>
      </section>
    </main>
    <footer><span>Branch: codex/pid-electrical-reliability</span><span>Preview overlay: port dots + callout labels only</span></footer>
  </div>
</body>
</html>`;

await writeFile(output, html, "utf8");
console.log(`Generated ${output}`);
